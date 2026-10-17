package com.kokansey.app.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.outlined.Clear
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.text.NumberFormat
import java.util.Locale

fun formatMoney(amount: Double): String {
    val nf = NumberFormat.getIntegerInstance(Locale.FRANCE)
    return "${nf.format(amount.toLong())} FCFA"
}

fun formatQuantity(qty: Double): String =
    if (qty == qty.toLong().toDouble()) qty.toLong().toString()
    else String.format(Locale.FRANCE, "%.2f", qty).trimEnd('0').trimEnd(',')

fun formatDate(iso: String?): String {
    if (iso.isNullOrBlank() || iso.length < 10) return "—"
    return try {
        "${iso.substring(8, 10)}/${iso.substring(5, 7)}/${iso.substring(0, 4)}"
    } catch (e: Exception) { iso.take(10) }
}

@Composable
fun LoadingBox(message: String = "Chargement…") {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            Spacer(Modifier.height(12.dp))
            Text(message, style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
fun ErrorBox(message: String, onRetry: () -> Unit) {
    Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Outlined.Info, contentDescription = null,
                tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(48.dp))
            Spacer(Modifier.height(12.dp))
            Text(message, textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(16.dp))
            OutlinedButton(onClick = onRetry) {
                Icon(Icons.Filled.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Réessayer")
            }
        }
    }
}

@Composable
fun EmptyBox(message: String) {
    Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
        Text(message, textAlign = TextAlign.Center,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
fun StatCard(
    title: String,
    value: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    valueColor: androidx.compose.ui.graphics.Color = MaterialTheme.colorScheme.primary
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(title.uppercase(), style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant, letterSpacing = 0.8.sp)
            Spacer(Modifier.height(6.dp))
            Text(value, style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold, color = valueColor)
            subtitle?.let {
                Spacer(Modifier.height(2.dp))
                Text(it, style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
fun ScreenHeader(title: String, subtitle: String? = null, actions: @Composable RowScope.() -> Unit = {}) {
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            subtitle?.let {
                Text(it, style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        actions()
    }
}

@Composable
fun SearchField(
    query: String,
    onQueryChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "Rechercher…"
) {
    OutlinedTextField(
        value = query,
        onValueChange = onQueryChange,
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
        placeholder = { Text(placeholder) },
        leadingIcon = {
            Icon(Icons.Outlined.Search, contentDescription = null,
                modifier = Modifier.size(20.dp))
        },
        trailingIcon = {
            if (query.isNotEmpty()) {
                IconButton(onClick = { onQueryChange("") }) {
                    Icon(Icons.Outlined.Clear, contentDescription = "Effacer",
                        modifier = Modifier.size(18.dp))
                }
            }
        },
        singleLine = true,
        shape = RoundedCornerShape(14.dp)
    )
}

@Composable
fun StatusChip(status: String) {
    val (bg, fg, label) = when (status.uppercase()) {
        "PAYEE", "PAYÉE", "COMPLETED", "TERMINEE", "TERMINÉE", "ACTIF", "Disponible".uppercase() ->
            Triple(
                MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                MaterialTheme.colorScheme.primary,
                statusLabel(status)
            )
        "PARTIELLEMENT_PAYEE", "IN_PROGRESS", "EN_COURS" ->
            Triple(
                MaterialTheme.colorScheme.tertiary.copy(alpha = 0.12f),
                MaterialTheme.colorScheme.tertiary,
                statusLabel(status)
            )
        "EN_ATTENTE", "PENDING" ->
            Triple(
                MaterialTheme.colorScheme.secondary.copy(alpha = 0.15f),
                MaterialTheme.colorScheme.onSurface,
                statusLabel(status)
            )
        else ->
            Triple(
                MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.5f),
                MaterialTheme.colorScheme.error,
                statusLabel(status)
            )
    }
    Surface(color = bg, shape = RoundedCornerShape(50)) {
        Text(label, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall, color = fg,
            fontWeight = FontWeight.SemiBold)
    }
}

fun statusLabel(status: String): String = when (status.uppercase()) {
    "PENDING" -> "En attente"
    "IN_PROGRESS" -> "En cours"
    "COMPLETED" -> "Terminée"
    "CANCELLED" -> "Annulée"
    "EN_COURS" -> "En cours"
    "TERMINEE" -> "Terminée"
    "PAYEE" -> "Payée"
    "PARTIELLEMENT_PAYEE" -> "Partielle"
    "EN_ATTENTE" -> "En attente"
    "ANNULEE" -> "Annulée"
    else -> status
}

@Composable
fun ConfirmDeleteDialog(
    title: String,
    message: String,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = { Icon(Icons.Outlined.Delete, contentDescription = null,
            tint = MaterialTheme.colorScheme.error) },
        title = { Text(title) },
        text = { Text(message) },
        confirmButton = {
            Button(onClick = onConfirm,
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.error)) {
                Text("Supprimer")
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Annuler") } }
    )
}
