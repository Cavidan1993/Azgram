package com.example.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = AzGramPurple,
    onPrimary = Color.White,
    primaryContainer = AzGramPurpleDark,
    onPrimaryContainer = Color.White,
    secondary = AzGramPink,
    onSecondary = Color.White,
    tertiary = AzGramCyan,
    background = AzGramBgDark,
    onBackground = AzGramTextPrimaryDark,
    surface = AzGramSurfaceDark,
    onSurface = AzGramTextPrimaryDark,
    surfaceVariant = AzGramCardDark,
    onSurfaceVariant = AzGramTextSecondaryDark,
    outline = AzGramBorderDark
)

private val LightColorScheme = lightColorScheme(
    primary = AzGramPurpleDark,
    onPrimary = Color.White,
    secondary = AzGramPink,
    tertiary = AzGramCyan,
    background = AzGramBgLight,
    onBackground = AzGramTextPrimaryLight,
    surface = AzGramSurfaceLight,
    onSurface = AzGramTextPrimaryLight,
    surfaceVariant = Color(0xFFF3F0FA),
    onSurfaceVariant = AzGramTextSecondaryLight,
    outline = Color(0xFFE5E0F2)
)

@Composable
fun AzGramTheme(
    darkTheme: Boolean = true, // Default to sleek dark mode
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
