package com.example.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.model.AuthUser
import com.example.data.model.NotificationItem
import com.example.data.model.Post
import com.example.data.model.Profile
import com.example.data.model.ReportItem
import com.example.data.repository.AzGramRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.UUID

class AzGramViewModel(application: Application) : AndroidViewModel(application) {

    val repository = AzGramRepository(application)

    private val _currentUser = MutableStateFlow<AuthUser?>(repository.currentUser)
    val currentUser: StateFlow<AuthUser?> = _currentUser.asStateFlow()

    private val _posts = MutableStateFlow<List<Post>>(emptyList())
    val posts: StateFlow<List<Post>> = _posts.asStateFlow()

    private val _isLoadingPosts = MutableStateFlow(false)
    val isLoadingPosts: StateFlow<Boolean> = _isLoadingPosts.asStateFlow()

    private val _currentTab = MutableStateFlow("feed")
    val currentTab: StateFlow<String> = _currentTab.asStateFlow()

    private val _notifications = MutableStateFlow<List<NotificationItem>>(emptyList())
    val notifications: StateFlow<List<NotificationItem>> = _notifications.asStateFlow()

    private val _reports = MutableStateFlow<List<ReportItem>>(emptyList())
    val reports: StateFlow<List<ReportItem>> = _reports.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _searchResults = MutableStateFlow<List<Post>>(emptyList())
    val searchResults: StateFlow<List<Post>> = _searchResults.asStateFlow()

    private val _userProfile = MutableStateFlow(
        Profile(
            id = repository.currentUser?.id ?: "current-user",
            username = repository.currentUser?.username ?: "azgram_user",
            displayName = repository.currentUser?.displayName ?: "AzGram İstifadəçisi",
            bio = "AzGram foto & sosial şəbəkəsi • 0 AZN büdcə ilə yaradılıb! 🇦🇿",
            avatarUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
            followersCount = 142,
            followingCount = 98
        )
    )
    val userProfile: StateFlow<Profile> = _userProfile.asStateFlow()

    private val _statusMessage = MutableStateFlow<String?>(null)
    val statusMessage: StateFlow<String?> = _statusMessage.asStateFlow()

    init {
        // Collect cached posts
        viewModelScope.launch {
            repository.observeCachedPosts().collect { list ->
                if (list.isNotEmpty()) {
                    _posts.value = list
                }
            }
        }
        refreshFeed()
        loadNotifications()
    }

    fun setTab(tab: String) {
        _currentTab.value = tab
        if (tab == "admin") {
            loadReports()
        }
    }

    fun clearStatusMessage() {
        _statusMessage.value = null
    }

    fun refreshFeed() {
        viewModelScope.launch {
            _isLoadingPosts.value = true
            try {
                val fetched = repository.fetchPosts()
                _posts.value = fetched
            } catch (e: Exception) {
                _statusMessage.value = "Yenilənmə xətası: ${e.localizedMessage}"
            } finally {
                _isLoadingPosts.value = false
            }
        }
    }

    fun toggleLike(post: Post) {
        val user = _currentUser.value
        if (user == null) {
            _statusMessage.value = "Bəyənmək üçün daxil olun"
            return
        }

        viewModelScope.launch {
            try {
                val updated = repository.toggleLike(post)
                _posts.value = _posts.value.map { if (it.id == updated.id) updated else it }
            } catch (e: Exception) {
                _statusMessage.value = e.localizedMessage
            }
        }
    }

    fun createPost(imageUrl: String, caption: String, onSuccess: () -> Unit) {
        val user = _currentUser.value
        if (user == null) {
            _statusMessage.value = "Paylaşım etmək üçün daxil olun"
            return
        }

        viewModelScope.launch {
            try {
                val newPost = repository.createPost(imageUrl, caption)
                _posts.value = listOf(newPost) + _posts.value
                _statusMessage.value = "Paylaşım uğurla əlavə edildi!"
                onSuccess()
                _currentTab.value = "feed"
            } catch (e: Exception) {
                _statusMessage.value = "Xəta: ${e.localizedMessage}"
            }
        }
    }

    fun submitReport(postId: String, reason: String) {
        viewModelScope.launch {
            val user = _currentUser.value
            val success = repository.submitReport(
                postId = postId,
                reportedUserId = "author",
                reason = reason
            )
            if (success) {
                _statusMessage.value = "Şikayətiniz qəbul edildi. Təşəkkür edirik!"
            }
        }
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
        if (query.isBlank()) {
            _searchResults.value = emptyList()
        } else {
            _searchResults.value = _posts.value.filter {
                it.caption.contains(query, ignoreCase = true) ||
                it.authorUsername.contains(query, ignoreCase = true) ||
                it.authorDisplayName.contains(query, ignoreCase = true)
            }
        }
    }

    fun loadNotifications() {
        _notifications.value = listOf(
            NotificationItem(
                id = "notif-1",
                recipientId = "me",
                senderId = "u-2",
                type = "like",
                postId = "p-1",
                createdAt = "5 dəq əvvəl",
                senderUsername = "nigar_m",
                senderAvatarUrl = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200"
            ),
            NotificationItem(
                id = "notif-2",
                recipientId = "me",
                senderId = "u-3",
                type = "comment",
                postId = "p-1",
                createdAt = "1 saat əvvəl",
                senderUsername = "rashad_baku",
                senderAvatarUrl = "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200"
            ),
            NotificationItem(
                id = "notif-3",
                recipientId = "me",
                senderId = "u-1",
                type = "follow",
                createdAt = "Dünən",
                senderUsername = "elnur_aliyev",
                senderAvatarUrl = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200"
            )
        )
    }

    fun loadReports() {
        viewModelScope.launch {
            _reports.value = repository.fetchReports()
        }
    }

    fun hideReportedPost(postId: String, hide: Boolean) {
        viewModelScope.launch {
            val ok = repository.hidePost(postId, hide)
            if (ok) {
                _reports.value = _reports.value.map {
                    if (it.reportedPostId == postId) it.copy(isPostHidden = hide, status = "resolved") else it
                }
                _posts.value = _posts.value.filter { it.id != postId }
                _statusMessage.value = if (hide) "Post gizlədildi (spam təmizləndi)" else "Post bərpa edildi"
            }
        }
    }

    fun banReportedUser(userId: String, ban: Boolean) {
        viewModelScope.launch {
            val ok = repository.banUser(userId, ban)
            if (ok) {
                _reports.value = _reports.value.map {
                    if (it.reportedUserId == userId) it.copy(isUserBanned = ban, status = "resolved") else it
                }
                _statusMessage.value = if (ban) "İstifadəçi bloklandı!" else "İstifadəçi bloku açıldı"
            }
        }
    }

    fun login(email: String, username: String, role: String = "user") {
        val user = AuthUser(
            id = UUID.randomUUID().toString(),
            email = email,
            username = username,
            displayName = username,
            role = if (email == "admin@azgram.az" || username == "admin") "admin" else role
        )
        repository.saveAuthUser(user)
        _currentUser.value = user
        _userProfile.value = _userProfile.value.copy(
            id = user.id,
            username = user.username,
            displayName = user.displayName
        )
        _statusMessage.value = "Uğurla daxil oldunuz: @${user.username}"
    }

    fun signOut() {
        repository.saveAuthUser(null)
        _currentUser.value = null
        _statusMessage.value = "Çıxış edildi"
        _currentTab.value = "feed"
    }

    fun updateProfile(displayName: String, bio: String) {
        _userProfile.value = _userProfile.value.copy(
            displayName = displayName,
            bio = bio
        )
        _statusMessage.value = "Profil məlumatları yeniləndi!"
    }
}
