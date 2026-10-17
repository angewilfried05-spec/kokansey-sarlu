package com.kokansey.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kokansey.app.ui.components.*
import com.kokansey.app.vm.OpsViewModel

private val monthNames = listOf(
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
)

private fun monthLabel(monthNumber: Int, year: Int) =
    "${monthNames.getOrElse(monthNumber - 1) { "Mois $monthNumber" }} $year"

@Composable
fun ReportScreen(vm: OpsViewModel) {
    val state by vm.state.collectAsState()
    var tab by remember { mutableIntStateOf(0) }

    LaunchedEffect(Unit) { vm.load() }

    Scaffold { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            ScreenHeader("Rapport mensuel", "Compteurs & journal") {
                IconButton(onClick = { vm.load() }) {
                    Icon(Icons.Outlined.Refresh, contentDescription = "Actualiser")
                }
            }
            TabRow(selectedTabIndex = tab) {
                Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text("Synthèse") })
                Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text("Journal") })
            }

            if (state.loading) LoadingBox() else if (tab == 0) {
                val c = state.counter
                LazyColumn(contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    item {
                        if (c != null) {
                            Text(monthLabel(c.monthNumber, c.year),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(bottom = 4.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                StatCard("Ventes", formatMoney(c.totalSalesAmount),
                                    modifier = Modifier.weight(1f),
                                    subtitle = "${c.salesCount} opération(s)")
                                StatCard("Dépenses", formatMoney(c.totalExpensesAmount),
                                    modifier = Modifier.weight(1f),
                                    subtitle = "${c.expensesCount} opération(s)",
                                    valueColor = MaterialTheme.colorScheme.error)
                            }
                            Spacer(Modifier.height(10.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                StatCard("Bénéfice",
                                    formatMoney(c.totalSalesAmount - c.totalExpensesAmount),
                                    modifier = Modifier.weight(1f),
                                    valueColor = if (c.totalSalesAmount - c.totalExpensesAmount >= 0)
                                        MaterialTheme.colorScheme.primary
                                    else MaterialTheme.colorScheme.error)
                                StatCard("Récoltes", "${c.harvestsCount}",
                                    modifier = Modifier.weight(1f),
                                    subtitle = "${c.stockMovementsCount} mouv. stock")
                            }
                        } else {
                            EmptyBox("Aucun compteur ce mois-ci")
                        }
                    }

                    if (state.counters.isNotEmpty()) {
                        item {
                            Text("Historique", style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(top = 14.dp, bottom = 4.dp))
                        }
                        items(state.counters, key = { it.id }) { m ->
                            val profit = m.totalSalesAmount - m.totalExpensesAmount
                            Card(shape = RoundedCornerShape(14.dp),
                                elevation = CardDefaults.cardElevation(1.dp)) {
                                Row(Modifier.fillMaxWidth().padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically) {
                                    Column(Modifier.weight(1f)) {
                                        Text(monthLabel(m.monthNumber, m.year),
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.SemiBold)
                                        Text("${m.salesCount} vente(s) · ${m.expensesCount} dépense(s)",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    Column(horizontalAlignment = Alignment.End) {
                                        Text(formatMoney(m.totalSalesAmount),
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.SemiBold)
                                        Text("net ${formatMoney(profit)}",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = if (profit >= 0) MaterialTheme.colorScheme.primary
                                                    else MaterialTheme.colorScheme.error)
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                if (state.journal.isEmpty()) EmptyBox("Journal vide pour ce mois") else
                    LazyColumn(contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(state.journal, key = { it.id }) { j ->
                            Card(shape = RoundedCornerShape(14.dp),
                                elevation = CardDefaults.cardElevation(1.dp)) {
                                Column(Modifier.fillMaxWidth().padding(14.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(j.action, style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.SemiBold,
                                            modifier = Modifier.weight(1f))
                                        Text(formatDate(j.date),
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    listOfNotNull(j.entity, j.details, j.userName)
                                        .joinToString(" · ")
                                        .let {
                                            if (it.isNotBlank()) {
                                                Text(it,
                                                    style = MaterialTheme.typography.bodySmall,
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
}
