package com.example.data.local

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import com.example.data.model.Post
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "cached_posts")
data class PostEntity(
    @PrimaryKey val id: String,
    val userId: String,
    val imageUrl: String,
    val caption: String,
    val likesCount: Int,
    val commentsCount: Int,
    val isHidden: Boolean,
    val createdAt: String,
    val authorUsername: String,
    val authorDisplayName: String,
    val authorAvatarUrl: String,
    val userHasLiked: Boolean
) {
    fun toDomain(): Post = Post(
        id = id,
        userId = userId,
        imageUrl = imageUrl,
        caption = caption,
        likesCount = likesCount,
        commentsCount = commentsCount,
        isHidden = isHidden,
        createdAt = createdAt,
        authorUsername = authorUsername,
        authorDisplayName = authorDisplayName,
        authorAvatarUrl = authorAvatarUrl,
        userHasLiked = userHasLiked
    )

    companion object {
        fun fromDomain(post: Post): PostEntity = PostEntity(
            id = post.id,
            userId = post.userId,
            imageUrl = post.imageUrl,
            caption = post.caption,
            likesCount = post.likesCount,
            commentsCount = post.commentsCount,
            isHidden = post.isHidden,
            createdAt = post.createdAt,
            authorUsername = post.authorUsername,
            authorDisplayName = post.authorDisplayName,
            authorAvatarUrl = post.authorAvatarUrl,
            userHasLiked = post.userHasLiked
        )
    }
}

@Dao
interface PostDao {
    @Query("SELECT * FROM cached_posts WHERE isHidden = 0 ORDER BY createdAt DESC")
    fun getAllPosts(): Flow<List<PostEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPosts(posts: List<PostEntity>)

    @Query("UPDATE cached_posts SET likesCount = :newCount, userHasLiked = :liked WHERE id = :postId")
    suspend fun updateLike(postId: String, newCount: Int, liked: Boolean)

    @Query("DELETE FROM cached_posts WHERE id = :postId")
    suspend fun deletePost(postId: String)

    @Query("DELETE FROM cached_posts")
    suspend fun clearAll()
}

@Database(entities = [PostEntity::class], version = 1, exportSchema = false)
abstract class AzGramDatabase : RoomDatabase() {
    abstract fun postDao(): PostDao

    companion object {
        @Volatile
        private var INSTANCE: AzGramDatabase? = null

        fun getDatabase(context: Context): AzGramDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AzGramDatabase::class.java,
                    "azgram_offline.db"
                ).fallbackToDestructiveMigration(dropAllTables = true).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
