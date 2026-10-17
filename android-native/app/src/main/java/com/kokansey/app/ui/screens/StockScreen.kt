package com.kokansey.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kokansey.app.data.Stock
import com.kokansey.app.data.StockRequest
import com.kokansey.app.ui.components.*
import com.kokansey.app.ui.theme.KokanseyGold
import com.kokansey.app.vm.StockViewModel

@Composable
fun StockScreen(vm: StockViewModel) {
    val state by vm.state.collectAsState()
    var showNewItem by remember { mutableStateOf(false) }
    var movementTarget by remember { mutableStateOf<Stock?>(null) }
    var movementType by remember { mutableStateOf("IN") }
    var query by remember { mutableStateOf("") }

    LaunchedEffect(Unit) { vm.refresh() }
    LaunchedEffect(state.saveSuccess) {
        if (state.saveSuccess) { showNewItem = false; movementTarget = null; vm.consumeSaveSuccess() }
    }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(onClick = { showNewItem = true },
                containerColor = MaterialTheme.colorScheme.primary) {
                Icon(Icons.Filled.Add, "Nouvel article")
            }
        }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            ScreenHeader("Stock", "${state.items.size} article(s)") {
                IconButton(onClick = { vm.refresh() }) {
                    Icon(Icons.Filled.Refresh, "Actualiser")
                }
            }
            SearchField(query, { query = it })

            val filtered = state.items.filter {
                query.isBlank() || it.name.contains(query, ignoreCase = true)
            }
            when {
                state.loading -> LoadingBox()
                state.error != null && state.items.isEmpty() ->
                    ErrorBox(state.error ?: "Erreur") { vm.refresh() }
                filtered.isEmpty() -> EmptyBox("Aucun article en stock.\nAppuyez sur + pour en créer un.")
                else -> LazyColumn(
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 88.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(filtered, key = { it.id }) { stock ->
                        StockCard(
                            stock,
                            onIn = { movementTarget = stock; movementType = "IN" },
                            onOut = { movementTarget = stock; movementType = "OUT" }
                        )
                    }
                }
            }
        }
    }

    if (showNewItem) {
        NewStockDialog(state.saving, state.error, onDismiss = { showNewItem = false }) {
            vm.create(it)
        }
    }
    movementTarget?.let { stock ->
        MovementDialog(stock, movementType, state.saving, state.error,
            onDismiss = { movementTarget = null }) { type, qty, reason ->
            vm.addMovement(stock.id, type, qty, reason)
        }
    }
}

@Composable
private fun StockCard(stock: Stock, onIn: () -> Unit, onOut: () -> Unit) {
    val low = stock.quantity <= stock.minThreshold && stock.minThreshold > 0
    Card(shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (low) MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.3f)
                            else MaterialTheme.colorScheme.surface)) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(stock.name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    Text(stock.category + if (low) " • Seuil atteint" else "",
                        style = MaterialTheme.typography.bodySmall,
                        color = if (low) MaterialTheme.colorScheme.error
                               else MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Text("${formatQuantity(stock.quantity)} ${stock.unit}",
                    style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold,
                    color = if (low) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary)
            }
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onIn, modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(10.dp)) {
                    Text("+ Entrée", color = MaterialTheme.colorScheme.primary)
                }
                OutlinedButton(onClick = onOut, modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(10.dp)) {
                    Text("− Sortie", color = MaterialTheme.colorScheme.error)
                }
            }
        }
    }
}

@Composable
private fun MovementDialog(
    stock: Stock, initialType: String, saving: Boolean, error: String?,
    onDismiss: () -> Unit, onSubmit: (String, Double, String?) -> Unit
) {
    var type by remember { mutableStateOf(initialType) }
    var quantity by remember { mutableStateOf("") }
    var reason by remember { mutableStateOf("") }
    var formError by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stock.name, fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(selected = type == "IN", onClick = { type = "IN" },
                        label = { Text("Entrée") })
                    FilterChip(selected = type == "OUT", onClick = { type = "OUT" },
                        label = { Text("Sortie") })
                }
                OutlinedTextField(quantity, { quantity = it.filter { c -> c.isDigit() || c == '.' || c == ',' } },
                    label = { Text("Quantité (${stock.unit}) *") }, singleLine = true,
                    modifier = Modifier.fillMaxWidth())
                OutlinedTextField(reason, { reason = it }, label = { Text("Motif") },
                    singleLine = true, modifier = Modifier.fillMaxWidth())
                (formError ?: error)?.let {
                    Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
            }
        },
        confirmButton = {
            Button(enabled = !saving, onClick = {
                val qty = quantity.replace(',', '.').toDoubleOrNull()
                when {
                    qty == null || qty <= 0 -> formError = "Quantité invalide"
                    type == "OUT" && qty > stock.quantity -> formError = "Stock insuffisant (${formatQuantity(stock.quantity)} ${stock.unit})"
                    else -> onSubmit(type, qty, reason.ifBlank { null })
                }
            }) { Text(if (saving) "…" else "Valider") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Annuler") } }
    )
}

@Composable
private fun NewStockDialog(
    saving: Boolean, error: String?,
    onDismiss: () -> Unit, onSubmit: (StockRequest) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("") }
    var quantity by remember { mutableStateOf("0") }
    var unit by remember { mutableStateOf("kg") }
    var threshold by remember { mutableStateOf("0") }
    var formError by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Nouvel article", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(name, { name = it }, label = { Text("Nom *") },
                    singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(category, { category = it }, label = { Text("Catégorie *") },
                    singleLine = true, modifier = Modifier.fillMaxWidth())
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(quantity, { quantity = it.filter { c -> c.isDigit() || c == '.' || c == ',' } },
                        label = { Text("Qté initiale") }, singleLine = true, modifier = Modifier.weight(1f))
                    OutlinedTextField(unit, { unit = it }, label = { Text("Unité") },
                        singleLine = true, modifier = Modifier.weight(1f))
                }
                OutlinedTextField(threshold, { threshold = it.filter { c -> c.isDigit() || c == '.' || c == ',' } },
                    label = { Text("Seuil d'alerte") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                (formError ?: error)?.let {
                    Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
            }
        },
        confirmButton = {
            Button(enabled = !saving, onClick = {
                when {
                    name.isBlank() -> formError = "Nom requis"
                    category.isBlank() -> formError = "Catégorie requise"
                    else -> onSubmit(StockRequest(
                        name.trim(), category.trim(),
                        quantity.replace(',', '.').toDoubleOrNull() ?: 0.0,
                        unit.ifBlank { "kg" },
                        threshold.replace(',', '.').toDoubleOrNull() ?: 0.0
                    ))
                }
            }) { Text(if (saving) "…" else "Créer") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Annuler") } }
    )
}
