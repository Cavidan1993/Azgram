package com.example.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.CloudDone
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.ui.theme.AzGramPurple
import com.example.ui.viewmodel.AzGramViewModel
import kotlinx.coroutines.launch

@Composable
fun SettingsScreen(
    viewModel: AzGramViewModel,
    modifier: Modifier = Modifier
) {
    val repo = viewModel.repository
    val scope = rememberCoroutineScope()

    var supabaseUrlInput by remember { mutableStateOf(repo.supabaseUrl) }
    var supabaseAnonKeyInput by remember { mutableStateOf(repo.supabaseAnonKey) }
    var testResult by remember { mutableStateOf<Pair<Boolean, String>?>(null) }
    var isTesting by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
            .testTag("settings_screen")
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                imageVector = Icons.Outlined.Settings,
                contentDescription = null,
                tint = AzGramPurple,
                modifier = Modifier.size(28.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Column {
                Text(
                    text = "Sistem & Supabase Parametrləri",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "0 AZN Büdcə Zəmanəti & PostgreSQL Konfiqurasiyası",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // 0 AZN Budget Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = AzGramPurple.copy(alpha = 0.12f)
            )
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Text(
                    text = "Büdcə Zəmanəti: Dəqiq 0 AZN",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = AzGramPurple
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "• Supabase Free: 500 MB PostgreSQL, 1 GB Storage, 50,000 MAU Auth\n• Cloudflare Pages: Limitsiz trafik, 0 AZN hosting\n• GitHub: Pulsuz repozitoriya və SQL miqrasiyalar",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = supabaseUrlInput,
            onValueChange = { supabaseUrlInput = it },
            label = { Text("Supabase Layihə URL") },
            placeholder = { Text("https://your-project.supabase.co") },
            modifier = Modifier
                .fillMaxWidth()
                .testTag("input_supabase_url"),
            shape = RoundedCornerShape(12.dp)
        )

        Spacer(modifier = Modifier.height(10.dp))

        OutlinedTextField(
            value = supabaseAnonKeyInput,
            onValueChange = { supabaseAnonKeyInput = it },
            label = { Text("Supabase Anon Public Key") },
            placeholder = { Text("eyJhbGciOiJIUzI1NiIsIn...") },
            modifier = Modifier
                .fillMaxWidth()
                .testTag("input_supabase_anon_key"),
            shape = RoundedCornerShape(12.dp)
        )

        Spacer(modifier = Modifier.height(14.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Button(
                onClick = {
                    repo.supabaseUrl = supabaseUrlInput
                    repo.supabaseAnonKey = supabaseAnonKeyInput
                    viewModel.refreshFeed()
                },
                colors = ButtonDefaults.buttonColors(containerColor = AzGramPurple),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .weight(1f)
                    .testTag("btn_save_config")
            ) {
                Icon(imageVector = Icons.Outlined.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("Yadda saxla")
            }

            OutlinedButton(
                onClick = {
                    scope.launch {
                        isTesting = true
                        testResult = repo.testConnection()
                        isTesting = false
                    }
                },
                enabled = !isTesting,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .weight(1f)
                    .testTag("btn_test_connection")
            ) {
                Icon(imageVector = Icons.Outlined.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text(if (isTesting) "Yoxlanılır..." else "Əlaqəni Test Et")
            }
        }

        if (testResult != null) {
            Spacer(modifier = Modifier.height(12.dp))
            val (success, msg) = testResult!!
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (success) Color(0xFF065F46) else Color(0xFF7F1D1D)
                )
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Outlined.CloudDone,
                        contentDescription = null,
                        tint = Color.White
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = msg,
                        color = Color.White,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }
    }
}
