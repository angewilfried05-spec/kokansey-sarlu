package com.kokansey.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kokansey.app.ui.components.*
import com.kokansey.app.vm.OpsViewModel

@Composable
fun NotificationsScreen(vm: OpsViewModel) {
    val state by vm.state.collectAsState()

    LaunchedEffect(Unit) { vm.load() }

    Scaffold { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            ScreenHeader("Notifications", "${state.notifications.size} alerte(s)") {
                IconButton(onClick = { vm.load() }) {
                    Icon(Icons.Outlined.Refresh, contentDescription = "Actualiser")
                }
            }

            when {
                state.loading -> LoadingBox()
                state.notifications.isEmpty() -> EmptyBox("Aucune alerte pour le moment")
                else -> LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(state.notifications) { n ->
                        val high = n.type == "danger"
                        Card(shape = RoundedCornerShape(14.dp),
                            elevation = CardDefaults.cardElevation(1.dp)) {
                            Row(Modifier.fillMaxWidth().padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Outlined.Notifications, contentDescription = null,
                                    tint = if (high) MaterialTheme.colorScheme.error
                                           else MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(22.dp))
                                Spacer(Modifier.width(12.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(n.title,
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.SemiBold)
                                    Text(n.message, style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
