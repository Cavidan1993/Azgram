package com.example.data.model

data class Profile(
    val id: String,
    val username: String,
    val displayName: String,
    val bio: String = "",
    val avatarUrl: String = "",
    val isBanned: Boolean = false,
    val createdAt: String = "",
    val followersCount: Int = 0,
    val followingCount: Int = 0,
    val isFollowing: Boolean = false
)

data class Post(
    val id: String,
    val userId: String,
    val imageUrl: String,
    val caption: String = "",
    val likesCount: Int = 0,
    val commentsCount: Int = 0,
    val isHidden: Boolean = false,
    val createdAt: String = "",
    val authorUsername: String = "azgram",
    val authorDisplayName: String = "İstifadəçi",
    val authorAvatarUrl: String = "",
    val userHasLiked: Boolean = false
)

data class Comment(
    val id: String,
    val postId: String,
    val userId: String,
    val content: String,
    val createdAt: String = "",
    val authorUsername: String = "istifadeci",
    val authorAvatarUrl: String = ""
)

data class NotificationItem(
    val id: String,
    val recipientId: String,
    val senderId: String,
    val type: String, // "like", "comment", "follow"
    val postId: String? = null,
    val isRead: Boolean = false,
    val createdAt: String = "",
    val senderUsername: String = "azgram_dost",
    val senderAvatarUrl: String = ""
)

data class ReportItem(
    val id: String,
    val reporterId: String,
    val reportedPostId: String? = null,
    val reportedUserId: String? = null,
    val reason: String,
    val status: String = "pending", // "pending", "resolved", "dismissed"
    val createdAt: String = "",
    val reporterUsername: String = "istifadeci",
    val postCaption: String? = null,
    val postImageUrl: String? = null,
    val isPostHidden: Boolean = false,
    val isUserBanned: Boolean = false
)

data class AuthUser(
    val id: String,
    val email: String,
    val username: String,
    val displayName: String,
    val role: String = "user", // "user", "moderator", "admin"
    val token: String = ""
)
