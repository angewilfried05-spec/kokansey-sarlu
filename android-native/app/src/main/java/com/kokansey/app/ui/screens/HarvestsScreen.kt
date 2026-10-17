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
import com.kokansey.app.data.Harvest
import com.kokansey.app.data.HarvestRequest
import com.kokansey.app.data.Speculation
import com.kokansey.app.ui.components.*
import com.kokansey.app.ui.theme.KokanseyGold
import com.kokansey.app.vm.HarvestsViewModel
import com.kokansey.app.vm.SpeculationViewModel
import com.kokansey.app.vm.todayIso

@Composable
fun HarvestsScreen(vm: HarvestsViewModel, specVm: SpeculationViewModel) {
    val state by vm.state.collectAsState()
    val speculations by specVm.speculations.collectAsState()
    var showForm by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { vm.refresh(); specVm.load() }
    LaunchedEffect(state.saveSuccess) {
        if (state.saveSuccess) { showForm = false; vm.consumeSaveSuccess() }
    }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(onClick = { showForm = true },
                containerColor = MaterialTheme.colorScheme.primary) {
                Icon(Icons.Filled.Add, "Nouvelle récolte")
            }
        }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            ScreenHeader("Récoltes", "${state.items.size} enregistrement(s)") {
                IconButton(onClick = { vm.refresh() }) {
                    Icon(Icons.Filled.Refresh, "Actualiser")
                }
            }
            when {
                state.loading -> LoadingBox()
                state.error != null && state.items.isEmpty() ->
                    ErrorBox(state.error ?: "Erreur") { vm.refresh() }
                state.items.isEmpty() -> EmptyBox("Aucune récolte enregistrée.\nAppuyez sur + pour commencer.")
                else -> LazyColumn(
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 88.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(state.items, key = { it.id }) { h -> HarvestCard(h) }
                }
            }
        }
    }

    if (showForm) {
        HarvestFormDialog(speculations, state.saving, state.error,
            onDismiss = { showForm = false }) { vm.create(it) }
    }
}

@Composable
private fun HarvestCard(h: Harvest) {
    Card(shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(h.speculation?.name ?: "—", style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold)
                Text(
                    formatDate(h.date) + (h.quality?.let { " • Qualité : $it" } ?: ""),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Text("${formatQuantity(h.quantity)} ${h.unit}",
                style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold,
                color = KokanseyGold)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun HarvestFormDialog(
    speculations: List<Speculation>,
    saving: Boolean, error: String?,
    onDismiss: () -> Unit, onSubmit: (HarvestRequest) -> Unit
) {
    var quantity by remember { mutableStateOf("") }
    var unit by remember { mutableStateOf("kg") }
    var quality by remember { mutableStateOf("") }
    var selectedSpec by remember { mutableStateOf<Speculation?>(null) }
    var specExpanded by remember { mutableStateOf(false) }
    var formError by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Nouvelle récolte", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                ExposedDropdownMenuBox(expanded = specExpanded, onExpandedChange = { specExpanded = it }) {
                    OutlinedTextField(
                        value = selectedSpec?.name ?: "",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Spéculation *") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(specExpanded) },
                        modifier = Modifier.fillMaxWidth().menuAnchor()
                    )
                    ExposedDropdownMenu(expanded = specExpanded, onDismissRequest = { specExpanded = false }) {
                        speculations.forEach { spec ->
                            DropdownMenuItem(text = { Text(spec.name) },
                                onClick = { selectedSpec = spec; specExpanded = false })
                        }
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(quantity, { quantity = it.filter { c -> c.isDigit() || c == '.' || c == ',' } },
                        label = { Text("Quantité *") }, singleLine = true, modifier = Modifier.weight(1f))
                    OutlinedTextField(unit, { unit = it }, label = { Text("Unité") },
                        singleLine = true, modifier = Modifier.weight(1f))
                }
                OutlinedTextField(quality, { quality = it }, label = { Text("Qualité") },
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
                    selectedSpec == null -> formError = "Sélectionnez une spéculation"
                    qty == null || qty <= 0 -> formError = "Quantité invalide"
                    else -> onSubmit(HarvestRequest(
                        speculationId = selectedSpec!!.id,
                        quantity = qty,
                        unit = unit.ifBlank { "kg" },
                        date = todayIso(),
                        quality = quality.ifBlank { null }
                    ))
                }
            }) { Text(if (saving) "…" else "Enregistrer") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Annuler") } }
    )
}
