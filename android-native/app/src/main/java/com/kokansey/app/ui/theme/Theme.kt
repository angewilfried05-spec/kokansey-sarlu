package com.kokansey.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Palette KOKANSEY — vert forêt + accent or
val KokanseyGreen = Color(0xFF1A4D2E)
val KokanseyGreenDark = Color(0xFF123820)
val KokanseyGold = Color(0xFFE8B23D)
val KokanseyGoldSoft = Color(0xFFFFF3D6)
val KokanseyCream = Color(0xFFF7F5F0)
val KokanseyRed = Color(0xFFDC2626)
val SurfaceDark = Color(0xFF121826)
val CardDark = Color(0xFF1E293B)

private val LightColors = lightColorScheme(
    primary = KokanseyGreen,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFDCEBE2),
    onPrimaryContainer = KokanseyGreenDark,
    secondary = KokanseyGold,
    onSecondary = Color(0xFF3A2A00),
    secondaryContainer = KokanseyGoldSoft,
    onSecondaryContainer = Color(0xFF5A4400),
    tertiary = Color(0xFF3B82F6),
    background = KokanseyCream,
    surface = Color.White,
    surfaceVariant = Color(0xFFF1EFEA),
    error = KokanseyRed,
    onSurface = Color(0xFF1F2937),
    onSurfaceVariant = Color(0xFF6B7280),
    outline = Color(0xFFE5E7EB)
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF6FBF8A),
    onPrimary = Color(0xFF0B2E1B),
    primaryContainer = Color(0xFF1A4D2E),
    onPrimaryContainer = Color(0xFFB9E4C8),
    secondary = KokanseyGold,
    onSecondary = Color(0xFF3A2A00),
    secondaryContainer = Color(0xFF4A3A0A),
    onSecondaryContainer = Color(0xFFFFE9A8),
    background = SurfaceDark,
    surface = CardDark,
    surfaceVariant = Color(0xFF273349),
    error = Color(0xFFF87171),
    onSurface = Color(0xFFE5E7EB),
    onSurfaceVariant = Color(0xFF9CA3AF),
    outline = Color(0xFF374151)
)

@Composable
fun KokanseyTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        content = content
    )
}
