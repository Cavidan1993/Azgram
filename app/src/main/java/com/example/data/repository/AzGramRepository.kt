package com.example.data.repository

import android.content.Context
import android.content.SharedPreferences
import com.example.data.local.AzGramDatabase
import com.example.data.local.PostEntity
import com.example.data.model.AuthUser
import com.example.data.model.Comment
import com.example.data.model.NotificationItem
import com.example.data.model.Post
import com.example.data.model.Profile
import com.example.data.model.ReportItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID
import java.util.concurrent.TimeUnit

class AzGramRepository(private val context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences("azgram_prefs", Context.MODE_PRIVATE)
    private val database = AzGramDatabase.getDatabase(context)
    private val postDao = database.postDao()

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    // Supabase Configuration
    var supabaseUrl: String
        get() = prefs.getString("supabase_url", "https://zsrkijbvsfczaspxppkj.supabase.co") ?: "https://zsrkijbvsfczaspxppkj.supabase.co"
        set(value) = prefs.edit().putString("supabase_url", value.trim()).apply()

    var supabaseAnonKey: String
        get() = prefs.getString("supabase_anon_key", "") ?: ""
        set(value) = prefs.edit().putString("supabase_anon_key", value.trim()).apply()

    fun isConfigured(): Boolean {
        return supabaseUrl.startsWith("https://") &&
                !supabaseUrl.contains("your-project-id") &&
                supabaseAnonKey.length > 20
    }

    // In-memory / cached auth user
    var currentUser: AuthUser? = null
        private set

    init {
        val savedUserId = prefs.getString("user_id", null)
        val savedEmail = prefs.getString("user_email", null)
        val savedUsername = prefs.getString("user_username", null)
        val savedRole = prefs.getString("user_role", "user") ?: "user"
        val savedToken = prefs.getString("user_token", "") ?: ""

        if (savedUserId != null && savedEmail != null && savedUsername != null) {
            currentUser = AuthUser(
                id = savedUserId,
                email = savedEmail,
                username = savedUsername,
                displayName = savedUsername,
                role = savedRole,
                token = savedToken
            )
        }
    }

    fun saveAuthUser(user: AuthUser?) {
        currentUser = user
        if (user != null) {
            prefs.edit()
                .putString("user_id", user.id)
                .putString("user_email", user.email)
                .putString("user_username", user.username)
                .putString("user_role", user.role)
                .putString("user_token", user.token)
                .apply()
        } else {
            prefs.edit()
                .remove("user_id")
                .remove("user_email")
                .remove("user_username")
                .remove("user_role")
                .remove("user_token")
                .apply()
        }
    }

    // Cached posts flow
    fun observeCachedPosts(): Flow<List<Post>> {
        return postDao.getAllPosts().map { list -> list.map { it.toDomain() } }
    }

    // Fetch posts from Supabase or generate realistic interactive feed
    suspend fun fetchPosts(): List<Post> = withContext(Dispatchers.IO) {
        if (isConfigured()) {
            try {
                val url = "${supabaseUrl.removeSuffix("/")}/rest/v1/posts?select=id,user_id,image_url,caption,likes_count,comments_count,is_hidden,created_at,profiles(id,username,display_name,avatar_url)&is_hidden=eq.false&order=created_at.desc&limit=20"
                val request = Request.Builder()
                    .url(url)
                    .addHeader("apikey", supabaseAnonKey)
                    .addHeader("Authorization", "Bearer ${currentUser?.token?.ifEmpty { supabaseAnonKey } ?: supabaseAnonKey}")
                    .get()
                    .build()

                val response = httpClient.newCall(request).execute()
                if (response.isSuccessful) {
                    val body = response.body?.string() ?: "[]"
                    val jsonArray = JSONArray(body)
                    val result = mutableListOf<Post>()

                    for (i in 0 until jsonArray.length()) {
                        val obj = jsonArray.getJSONObject(i)
                        val prof = obj.optJSONObject("profiles")
                        result.add(
                            Post(
                                id = obj.getString("id"),
                                userId = obj.getString("user_id"),
                                imageUrl = obj.getString("image_url"),
                                caption = obj.optString("caption", ""),
                                likesCount = obj.optInt("likes_count", 0),
                                commentsCount = obj.optInt("comments_count", 0),
                                isHidden = obj.optBoolean("is_hidden", false),
                                createdAt = obj.optString("created_at", ""),
                                authorUsername = prof?.optString("username", "azgram") ?: "azgram",
                                authorDisplayName = prof?.optString("display_name", "İstifadəçi") ?: "İstifadəçi",
                                authorAvatarUrl = prof?.optString("avatar_url", "") ?: ""
                            )
                        )
                    }

                    if (result.isNotEmpty()) {
                        postDao.insertPosts(result.map { PostEntity.fromDomain(it) })
                        return@withContext result
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        // Default initial feed seed if offline or unconfigured
        val existing = getInitialSeedPosts()
        postDao.insertPosts(existing.map { PostEntity.fromDomain(it) })
        return@withContext existing
    }

    suspend fun toggleLike(post: Post): Post = withContext(Dispatchers.IO) {
        val user = currentUser ?: throw IllegalStateException("Bəyənmək üçün daxil olun")
        val newLiked = !post.userHasLiked
        val newCount = if (newLiked) post.likesCount + 1 else maxOf(0, post.likesCount - 1)

        postDao.updateLike(post.id, newCount, newLiked)

        if (isConfigured()) {
            try {
                if (newLiked) {
                    val json = JSONObject().apply {
                        put("post_id", post.id)
                        put("user_id", user.id)
                    }.toString()
                    val req = Request.Builder()
                        .url("${supabaseUrl.removeSuffix("/")}/rest/v1/likes")
                        .addHeader("apikey", supabaseAnonKey)
                        .addHeader("Authorization", "Bearer ${user.token.ifEmpty { supabaseAnonKey }}")
                        .post(json.toRequestBody("application/json".toMediaType()))
                        .build()
                    httpClient.newCall(req).execute()
                } else {
                    val req = Request.Builder()
                        .url("${supabaseUrl.removeSuffix("/")}/rest/v1/likes?post_id=eq.${post.id}&user_id=eq.${user.id}")
                        .addHeader("apikey", supabaseAnonKey)
                        .addHeader("Authorization", "Bearer ${user.token.ifEmpty { supabaseAnonKey }}")
                        .delete()
                        .build()
                    httpClient.newCall(req).execute()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        return@withContext post.copy(userHasLiked = newLiked, likesCount = newCount)
    }

    suspend fun createPost(imageUrl: String, caption: String): Post = withContext(Dispatchers.IO) {
        val user = currentUser ?: throw IllegalStateException("Paylaşım etmək üçün daxil olun")
        val newPost = Post(
            id = UUID.randomUUID().toString(),
            userId = user.id,
            imageUrl = imageUrl,
            caption = caption,
            likesCount = 0,
            commentsCount = 0,
            isHidden = false,
            createdAt = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US).format(java.util.Date()),
            authorUsername = user.username,
            authorDisplayName = user.displayName,
            authorAvatarUrl = ""
        )

        postDao.insertPosts(listOf(PostEntity.fromDomain(newPost)))

        if (isConfigured()) {
            try {
                val json = JSONObject().apply {
                    put("id", newPost.id)
                    put("user_id", user.id)
                    put("image_url", imageUrl)
                    put("caption", caption)
                }.toString()

                val req = Request.Builder()
                    .url("${supabaseUrl.removeSuffix("/")}/rest/v1/posts")
                    .addHeader("apikey", supabaseAnonKey)
                    .addHeader("Authorization", "Bearer ${user.token.ifEmpty { supabaseAnonKey }}")
                    .post(json.toRequestBody("application/json".toMediaType()))
                    .build()
                httpClient.newCall(req).execute()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        return@withContext newPost
    }

    suspend fun submitReport(postId: String, reportedUserId: String, reason: String): Boolean = withContext(Dispatchers.IO) {
        val user = currentUser ?: return@withContext false
        if (isConfigured()) {
            try {
                val json = JSONObject().apply {
                    put("reporter_id", user.id)
                    put("reported_post_id", postId)
                    put("reported_user_id", reportedUserId)
                    put("reason", reason)
                }.toString()

                val req = Request.Builder()
                    .url("${supabaseUrl.removeSuffix("/")}/rest/v1/reports")
                    .addHeader("apikey", supabaseAnonKey)
                    .addHeader("Authorization", "Bearer ${user.token.ifEmpty { supabaseAnonKey }}")
                    .post(json.toRequestBody("application/json".toMediaType()))
                    .build()
                val resp = httpClient.newCall(req).execute()
                return@withContext resp.isSuccessful
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        return@withContext true
    }

    suspend fun fetchReports(): List<ReportItem> = withContext(Dispatchers.IO) {
        if (isConfigured()) {
            try {
                val req = Request.Builder()
                    .url("${supabaseUrl.removeSuffix("/")}/rest/v1/reports?select=id,reporter_id,reported_post_id,reported_user_id,reason,status,created_at,posts(id,image_url,caption,is_hidden)&order=created_at.desc")
                    .addHeader("apikey", supabaseAnonKey)
                    .addHeader("Authorization", "Bearer ${currentUser?.token?.ifEmpty { supabaseAnonKey } ?: supabaseAnonKey}")
                    .get()
                    .build()
                val resp = httpClient.newCall(req).execute()
                if (resp.isSuccessful) {
                    val arr = JSONArray(resp.body?.string() ?: "[]")
                    val list = mutableListOf<ReportItem>()
                    for (i in 0 until arr.length()) {
                        val obj = arr.getJSONObject(i)
                        val postObj = obj.optJSONObject("posts")
                        list.add(
                            ReportItem(
                                id = obj.getString("id"),
                                reporterId = obj.getString("reporter_id"),
                                reportedPostId = if (obj.has("reported_post_id") && !obj.isNull("reported_post_id")) obj.getString("reported_post_id") else null,
                                reportedUserId = if (obj.has("reported_user_id") && !obj.isNull("reported_user_id")) obj.getString("reported_user_id") else null,
                                reason = obj.getString("reason"),
                                status = obj.optString("status", "pending"),
                                createdAt = obj.optString("created_at", ""),
                                postCaption = postObj?.optString("caption", ""),
                                postImageUrl = postObj?.optString("image_url", ""),
                                isPostHidden = postObj?.optBoolean("is_hidden", false) ?: false
                            )
                        )
                    }
                    if (list.isNotEmpty()) return@withContext list
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        // Sample pending report for demo moderation
        return@withContext listOf(
            ReportItem(
                id = "rep-1",
                reporterId = "u-99",
                reportedPostId = "p-1",
                reportedUserId = "u-1",
                reason = "Arzuolunmaz reklam və ya spam tərkibli mesaj",
                status = "pending",
                createdAt = "2026-10-18T10:00:00Z",
                reporterUsername = "nicat_baku",
                postCaption = "Bakı bulvarında gözəl axşam gəzintisi...",
                postImageUrl = "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600"
            )
        )
    }

    suspend fun hidePost(postId: String, hide: Boolean): Boolean = withContext(Dispatchers.IO) {
        if (hide) {
            postDao.deletePost(postId)
        }
        if (isConfigured()) {
            try {
                val json = JSONObject().apply { put("is_hidden", hide) }.toString()
                val req = Request.Builder()
                    .url("${supabaseUrl.removeSuffix("/")}/rest/v1/posts?id=eq.$postId")
                    .addHeader("apikey", supabaseAnonKey)
                    .addHeader("Authorization", "Bearer ${currentUser?.token?.ifEmpty { supabaseAnonKey } ?: supabaseAnonKey}")
                    .patch(json.toRequestBody("application/json".toMediaType()))
                    .build()
                return@withContext httpClient.newCall(req).execute().isSuccessful
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        return@withContext true
    }

    suspend fun banUser(userId: String, ban: Boolean): Boolean = withContext(Dispatchers.IO) {
        if (isConfigured()) {
            try {
                val json = JSONObject().apply { put("is_banned", ban) }.toString()
                val req = Request.Builder()
                    .url("${supabaseUrl.removeSuffix("/")}/rest/v1/profiles?id=eq.$userId")
                    .addHeader("apikey", supabaseAnonKey)
                    .addHeader("Authorization", "Bearer ${currentUser?.token?.ifEmpty { supabaseAnonKey } ?: supabaseAnonKey}")
                    .patch(json.toRequestBody("application/json".toMediaType()))
                    .build()
                return@withContext httpClient.newCall(req).execute().isSuccessful
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        return@withContext true
    }

    suspend fun testConnection(): Pair<Boolean, String> = withContext(Dispatchers.IO) {
        if (!isConfigured()) {
            return@withContext Pair(false, "Supabase URL və ya Anon Key tam doldurulmayıb.")
        }
        try {
            val req = Request.Builder()
                .url("${supabaseUrl.removeSuffix("/")}/rest/v1/profiles?select=id&limit=1")
                .addHeader("apikey", supabaseAnonKey)
                .addHeader("Authorization", "Bearer $supabaseAnonKey")
                .get()
                .build()
            val resp = httpClient.newCall(req).execute()
            if (resp.isSuccessful) {
                return@withContext Pair(true, "PostgreSQL və Supabase RLS ilə uğurlu bağlantı quruldu!")
            } else {
                return@withContext Pair(false, "Server xətası: ${resp.code} ${resp.message}")
            }
        } catch (e: Exception) {
            return@withContext Pair(false, "Bağlantı xətası: ${e.localizedMessage}")
        }
    }

    private fun getInitialSeedPosts(): List<Post> {
        return listOf(
            Post(
                id = "p-1",
                userId = "u-1",
                imageUrl = "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800",
                caption = "Bakı bulvarında gözəl axşam gəzintisi. Xəzər dənizinin mehini hiss edin! 🌊✨ #Baku #AzGram",
                likesCount = 42,
                commentsCount = 5,
                createdAt = "2026-10-18T10:30:00Z",
                authorUsername = "elnur_aliyev",
                authorDisplayName = "Elnur Əliyev",
                authorAvatarUrl = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200",
                userHasLiked = false
            ),
            Post(
                id = "p-2",
                userId = "u-2",
                imageUrl = "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
                caption = "Şahdağ dağlarında qış mənzərəsi. Təmiz hava və heyrətamiz mənzərələr! 🏔️❄️",
                likesCount = 89,
                commentsCount = 12,
                createdAt = "2026-10-18T08:15:00Z",
                authorUsername = "nigar_m",
                authorDisplayName = "Nigar Məmmədova",
                authorAvatarUrl = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
                userHasLiked = true
            ),
            Post(
                id = "p-3",
                userId = "u-3",
                imageUrl = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
                caption = "İçərişəhərdə qədim küçələr və təbii çay süfrəsi. AzGram icması ilə paylaşıram! ☕🏛️",
                likesCount = 64,
                commentsCount = 8,
                createdAt = "2026-10-17T18:00:00Z",
                authorUsername = "rashad_baku",
                authorDisplayName = "Rəşad Quliyev",
                authorAvatarUrl = "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200",
                userHasLiked = false
            )
        )
    }
}
