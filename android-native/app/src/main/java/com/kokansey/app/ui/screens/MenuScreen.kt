package com.kokansey.app.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp

enum class AppModule(val label: String, val subtitle: String, val icon: ImageVector) {
    CLIENTS("Clients", "Comptes & encaissements", Icons.Outlined.Person),
    HARVESTS("Récoltes", "Saisie & suivi", Icons.Outlined.Star),
    EXPENSES("Dépenses", "Par catégorie & spéculation", Icons.AutoMirrored.Filled.ReceiptLong),
    HR("Employés & Tâches", "RH et suivi d'activité", Icons.Outlined.Groups),
    FLEET("Camions & Missions", "Flotte et trajets", Icons.Outlined.LocalShipping),
    INVOICES("Factures", "Statuts & encaissements", Icons.Outlined.Description),
    NOTIFICATIONS("Notifications", "Alertes métier", Icons.Outlined.Notifications)
}

@Composable
fun MenuScreen(
    notificationCount: Int,
    onSelect: (AppModule) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            Text("Tous les modules", style = MaterialTheme.typography.headlineSmall,
                fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
                modifier = Modifier.padding(bottom = 6.dp))
        }
        items(AppModule.values()) { module ->
            Card(
                modifier = Modifier.fillMaxWidth().clickable { onSelect(module) },
                shape = RoundedCornerShape(16.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Row(
                    Modifier.fillMaxWidth().padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(module.icon, contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.padding(10.dp).size(22.dp))
                    }
                    Spacer(Modifier.width(14.dp))
                    Column(Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(module.label, style = MaterialTheme.typography.titleSmall,
                                fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold)
                            if (module == AppModule.NOTIFICATIONS && notificationCount > 0) {
                                Spacer(Modifier.width(8.dp))
                                Badge { Text("$notificationCount") }
                            }
                        }
                        Text(module.subtitle, style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(18.dp))
                }
            }
        }
    }
}
