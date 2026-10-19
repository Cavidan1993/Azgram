package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddBox
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.AdminPanelSettings
import androidx.compose.material.icons.automirrored.outlined.Login
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.components.AuthDialog
import com.example.ui.components.ReportDialog
import com.example.ui.screens.AdminScreen
import com.example.ui.screens.CreatePostScreen
import com.example.ui.screens.FeedScreen
import com.example.ui.screens.NotificationsScreen
import com.example.ui.screens.ProfileScreen
import com.example.ui.screens.SearchScreen
import com.example.ui.screens.SettingsScreen
import com.example.ui.theme.AzGramCyan
import com.example.ui.theme.AzGramPink
import com.example.ui.theme.AzGramPurple
import com.example.ui.theme.AzGramTheme
import com.example.ui.viewmodel.AzGramViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: AzGramViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            AzGramTheme {
                AzGramApp(viewModel = viewModel)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AzGramApp(viewModel: AzGramViewModel) {
    val currentTab by viewModel.currentTab.collectAsState()
    val currentUser by viewModel.currentUser.collectAsState()
    val statusMessage by viewModel.statusMessage.collectAsState()
    val notifications by viewModel.notifications.collectAsState()

    val snackbarHostState = remember { SnackbarHostState() }

    var showAuthDialog by remember { mutableStateOf(false) }
    var reportPostId by remember { mutableStateOf<String?>(null) }

    // Display status snackbars
    LaunchedEffect(statusMessage) {
        statusMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearStatusMessage()
        }
    }

    // Handle back button: if not on feed, go to feed
    BackHandler(enabled = currentTab != "feed") {
        viewModel.setTab("feed")
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "AzGram",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Black,
                            color = AzGramPurple,
                            letterSpacing = 1.sp
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Box(
                            modifier = Modifier
                                .background(
                                    brush = Brush.horizontalGradient(listOf(AzGramPurple, AzGramPink)),
                                    shape = RoundedCornerShape(6.dp)
                                )
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = "0 AZN",
                                color = Color.White,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                },
                actions = {
                    val isAdmin = currentUser?.role == "admin" || currentUser?.username == "admin" || currentUser?.email == "admin@azgram.az"
                    if (isAdmin) {
                        IconButton(
                            onClick = { viewModel.setTab("admin") },
                            modifier = Modifier.testTag("topbar_admin_btn")
                        ) {
                            Icon(
                                imageVector = Icons.Outlined.AdminPanelSettings,
                                contentDescription = "Admin Panel",
                                tint = Color(0xFFEF4444)
                            )
                        }
                    }

                    IconButton(
                        onClick = { viewModel.setTab("settings") },
                        modifier = Modifier.testTag("topbar_settings_btn")
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.Settings,
                            contentDescription = "Parametrlər",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    if (currentUser == null) {
                        IconButton(
                            onClick = { showAuthDialog = true },
                            modifier = Modifier.testTag("topbar_login_btn")
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Outlined.Login,
                                contentDescription = "Daxil ol",
                                tint = AzGramPurple
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface,
                tonalElevation = 8.dp
            ) {
                NavigationBarItem(
                    selected = currentTab == "feed",
                    onClick = { viewModel.setTab("feed") },
                    icon = { Icon(Icons.Default.Home, contentDescription = "Lenta") },
                    label = { Text("Lenta") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = AzGramPurple,
                        indicatorColor = AzGramPurple.copy(alpha = 0.15f)
                    ),
                    modifier = Modifier.testTag("nav_feed")
                )

                NavigationBarItem(
                    selected = currentTab == "search",
                    onClick = { viewModel.setTab("search") },
                    icon = { Icon(Icons.Default.Search, contentDescription = "Axtarış") },
                    label = { Text("Axtarış") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = AzGramPurple,
                        indicatorColor = AzGramPurple.copy(alpha = 0.15f)
                    ),
                    modifier = Modifier.testTag("nav_search")
                )

                NavigationBarItem(
                    selected = currentTab == "create",
                    onClick = {
                        if (currentUser == null) {
                            showAuthDialog = true
                        } else {
                            viewModel.setTab("create")
                        }
                    },
                    icon = { Icon(Icons.Default.AddBox, contentDescription = "Yarat") },
                    label = { Text("Yarat") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = AzGramPurple,
                        indicatorColor = AzGramPurple.copy(alpha = 0.15f)
                    ),
                    modifier = Modifier.testTag("nav_create")
                )

                NavigationBarItem(
                    selected = currentTab == "notifications",
                    onClick = {
                        if (currentUser == null) {
                            showAuthDialog = true
                        } else {
                            viewModel.setTab("notifications")
                        }
                    },
                    icon = {
                        BadgedBox(
                            badge = {
                                if (notifications.isNotEmpty()) {
                                    Badge(containerColor = AzGramPink) {
                                        Text("${notifications.size}")
                                    }
                                }
                            }
                        ) {
                            Icon(Icons.Default.Favorite, contentDescription = "Bildirişlər")
                        }
                    },
                    label = { Text("Bildiriş") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = AzGramPurple,
                        indicatorColor = AzGramPurple.copy(alpha = 0.15f)
                    ),
                    modifier = Modifier.testTag("nav_notifications")
                )

                NavigationBarItem(
                    selected = currentTab == "profile",
                    onClick = { viewModel.setTab("profile") },
                    icon = { Icon(Icons.Default.Person, contentDescription = "Profil") },
                    label = { Text("Profil") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = AzGramPurple,
                        indicatorColor = AzGramPurple.copy(alpha = 0.15f)
                    ),
                    modifier = Modifier.testTag("nav_profile")
                )
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when (currentTab) {
                "feed" -> FeedScreen(
                    viewModel = viewModel,
                    onOpenReport = { reportPostId = it },
                    onProfileClick = { viewModel.setTab("profile") }
                )
                "search" -> SearchScreen(
                    viewModel = viewModel,
                    onOpenReport = { reportPostId = it },
                    onProfileClick = { viewModel.setTab("profile") }
                )
                "create" -> CreatePostScreen(
                    viewModel = viewModel
                )
                "notifications" -> NotificationsScreen(
                    viewModel = viewModel
                )
                "profile" -> ProfileScreen(
                    viewModel = viewModel,
                    onOpenAuth = { showAuthDialog = true }
                )
                "admin" -> AdminScreen(
                    viewModel = viewModel
                )
                "settings" -> SettingsScreen(
                    viewModel = viewModel
                )
            }
        }
    }

    if (showAuthDialog) {
        AuthDialog(
            onDismiss = { showAuthDialog = false },
            onLogin = { email, username ->
                viewModel.login(email, username)
            }
        )
    }

    if (reportPostId != null) {
        ReportDialog(
            postId = reportPostId!!,
            onDismiss = { reportPostId = null },
            onSubmit = { postId, reason ->
                viewModel.submitReport(postId, reason)
            }
        )
    }
}
