package com.kokansey.app.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kokansey.app.data.ChartPoint
import com.kokansey.app.data.DashboardSummary
import com.kokansey.app.ui.components.*
import com.kokansey.app.ui.theme.KokanseyGold
import com.kokansey.app.vm.DashboardViewModel

@Composable
fun DashboardScreen(viewModel: DashboardViewModel, userName: String?) {
    val summary by viewModel.summary.collectAsState()
    val loading by viewModel.loading.collectAsState()
    val error by viewModel.error.collectAsState()

    LaunchedEffect(Unit) { viewModel.refresh() }

    when {
        loading && summary == null -> LoadingBox()
        error != null && summary == null -> ErrorBox(error ?: "Erreur") { viewModel.refresh() }
        else -> LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Text("Bonjour, ${userName ?: ""} 👋",
                    style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Text("Vue d'ensemble du mois en cours",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }

            summary?.let { s ->
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        StatCard("Ventes", formatMoney(s.totalSales), Modifier.weight(1f))
                        StatCard("Dépenses", formatMoney(s.totalExpenses), Modifier.weight(1f),
                            valueColor = MaterialTheme.colorScheme.error)
                    }
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        StatCard(
                            "Bénéfice net", formatMoney(s.netProfit), Modifier.weight(1f),
                            valueColor = if (s.netProfit >= 0) MaterialTheme.colorScheme.primary
                                        else MaterialTheme.colorScheme.error
                        )
                        StatCard("Créances clients", formatMoney(s.totalCreances), Modifier.weight(1f),
                            valueColor = KokanseyGold)
                    }
                }

                if (s.chartData.isNotEmpty()) {
                    item { ChartCard(s.chartData) }
                }

                if (s.notifications.isNotEmpty()) {
                    item {
                        Text("Alertes", style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold)
                    }
                    items(s.notifications.take(5).size) { i ->
                        NotificationCard(s.notifications[i])
                    }
                }

                if (s.topDebiteurs.isNotEmpty()) {
                    item {
                        Text("Top débiteurs", style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold)
                    }
                    item {
                        Card(shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                s.topDebiteurs.forEach { d ->
                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text(d.nom, style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.Medium)
                                        Text(formatMoney(d.solde), style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.Bold, color = KokanseyGold)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ChartCard(data: List<ChartPoint>) {
    Card(shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.padding(16.dp)) {
            Text("Ventes vs Dépenses (6 mois)", style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(16.dp))
            BarChart(data, Modifier.fillMaxWidth().height(160.dp))
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                LegendDot(MaterialTheme.colorScheme.primary, "Ventes")
                LegendDot(MaterialTheme.colorScheme.error, "Dépenses")
            }
        }
    }
}

@Composable
private fun LegendDot(color: androidx.compose.ui.graphics.Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Canvas(Modifier.size(10.dp)) { drawCircle(color) }
        Spacer(Modifier.width(6.dp))
        Text(label, style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun BarChart(data: List<ChartPoint>, modifier: Modifier) {
    val primary = MaterialTheme.colorScheme.primary
    val error = MaterialTheme.colorScheme.error
    val maxValue = (data.maxOfOrNull { maxOf(it.sales, it.expenses) } ?: 1.0).coerceAtLeast(1.0)

    Column(modifier) {
        Canvas(Modifier.fillMaxWidth().weight(1f)) {
            val groupWidth = size.width / data.size
            val barWidth = groupWidth * 0.28f
            val spacing = groupWidth * 0.06f

            data.forEachIndexed { i, point ->
                val x = i * groupWidth + groupWidth * 0.15f
                val salesH = (point.sales / maxValue).toFloat() * size.height
                val expH = (point.expenses / maxValue).toFloat() * size.height
                drawRect(primary, Offset(x, size.height - salesH), Size(barWidth, salesH))
                drawRect(error, Offset(x + barWidth + spacing, size.height - expH), Size(barWidth, expH))
            }
        }
        Spacer(Modifier.height(6.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceAround) {
            data.forEach {
                Text(it.name, style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun NotificationCard(notif: com.kokansey.app.data.AppNotification) {
    val container = when (notif.type) {
        "danger" -> MaterialTheme.colorScheme.errorContainer
        "warning" -> MaterialTheme.colorScheme.secondaryContainer
        else -> MaterialTheme.colorScheme.surfaceVariant
    }
    Card(shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = container)) {
        Column(Modifier.padding(12.dp)) {
            Text(notif.title, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
            Text(notif.message, style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
