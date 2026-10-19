package com.example.ui.screens

import android.content.Intent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.example.ui.components.PostCardItem
import com.example.ui.viewmodel.AzGramViewModel

@Composable
fun FeedScreen(
    viewModel: AzGramViewModel,
    onOpenReport: (postId: String) -> Unit,
    onProfileClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val posts by viewModel.posts.collectAsState()
    val isLoading by viewModel.isLoadingPosts.collectAsState()

    Box(
        modifier = modifier
            .fillMaxSize()
            .testTag("feed_screen")
    ) {
        if (isLoading && posts.isEmpty()) {
            CircularProgressIndicator(
                modifier = Modifier
                    .align(Alignment.Center)
                    .testTag("feed_loading_spinner"),
                color = MaterialTheme.colorScheme.primary
            )
        } else if (posts.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Lenta boşdur. İlk şəkli siz paylaşın!",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .testTag("feed_posts_list")
            ) {
                items(posts, key = { it.id }) { post ->
                    PostCardItem(
                        post = post,
                        onLikeClick = { viewModel.toggleLike(post) },
                        onCommentClick = {
                            // Show quick feedback
                            viewModel.toggleLike(post)
                        },
                        onShareClick = {
                            val shareIntent = Intent().apply {
                                action = Intent.ACTION_SEND
                                putExtra(Intent.EXTRA_TEXT, "AzGram: ${post.caption} - ${post.imageUrl}")
                                type = "text/plain"
                            }
                            context.startActivity(Intent.createChooser(shareIntent, "Paylaşımı göndər"))
                        },
                        onReportClick = { onOpenReport(post.id) },
                        onProfileClick = onProfileClick
                    )
                }
            }
        }
    }
}
