package com.kokansey.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.kokansey.app.data.Expense
import com.kokansey.app.data.ExpenseRequest
import com.kokansey.app.ui.components.*
import com.kokansey.app.vm.OpsViewModel
import com.kokansey.app.vm.todayIso

@Composable
fun ExpensesScreen(vm: OpsViewModel, isAdmin: Boolean) {
    val state by vm.state.collectAsState()
    var query by remember { mutableStateOf("") }
    var showForm by remember { mutableStateOf(false) }
    var deleteTarget by remember { mutableStateOf<Expense?>(null) }
    var feedback by remember { mutableStateOf<String?>(null) }
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(Unit) { vm.load() }
    LaunchedEffect(feedback) {
        feedback?.let { snackbar.showSnackbar(it); feedback = null }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        floatingActionButton = {
            FloatingActionButton(onClick = { showForm = true }) {
                Icon(Icons.Filled.Add, contentDescription = "Nouvelle dépense")
            }
        }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            ScreenHeader("Dépenses", "${state.expenses.size} enregistrement(s)") {
                IconButton(onClick = { vm.load() }) {
                    Icon(Icons.Outlined.Refresh, contentDescription = "Actualiser")
                }
            }
            SearchField(query, { query = it })

            val filtered = state.expenses.filter {
                query.isBlank() || listOfNotNull(
                    it.type, it.category, it.supplier, it.speculation?.name, it.observation
                ).any { s -> s.contains(query, ignoreCase = true) }
            }

            when {
                state.loading -> LoadingBox()
                filtered.isEmpty() -> EmptyBox("Aucune dépense")
                else -> LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(filtered, key = { it.id }) { exp ->
                        Card(shape = RoundedCornerShape(14.dp),
                            elevation = CardDefaults.cardElevation(1.dp)) {
                            Row(Modifier.fillMaxWidth().padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically) {
                                Column(Modifier.weight(1f)) {
                                    Text("${exp.type} · ${exp.category}",
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.SemiBold)
                                    Text(
                                        listOfNotNull(
                                            exp.speculation?.name,
                                            exp.supplier,
                                            formatDate(exp.date)
                                        ).joinToString(" · "),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(formatMoney(exp.amount),
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.error)
                                    if (isAdmin) {
                                        IconButton(onClick = { deleteTarget = exp },
                                            modifier = Modifier.size(28.dp)) {
                                            Icon(Icons.Outlined.Delete, "Supprimer",
                                                tint = MaterialTheme.colorScheme.error,
                                                modifier = Modifier.size(18.dp))
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

    deleteTarget?.let { exp ->
        ConfirmDeleteDialog(
            title = "Supprimer la dépense",
            message = "${exp.type} — ${formatMoney(exp.amount)}",
            onConfirm = {
                deleteTarget = null
                vm.deleteExpense(exp.id) { ok, err ->
                    feedback = if (ok) "Dépense supprimée" else err ?: "Échec"
                }
            },
            onDismiss = { deleteTarget = null }
        )
    }

    if (showForm) {
        ExpenseFormDialog(
            speculations = state.speculations,
            saving = state.saving,
            onDismiss = { showForm = false },
            onSubmit = { req ->
                vm.createExpense(req) { ok, err ->
                    if (ok) showForm = false
                    feedback = if (ok) "Dépense enregistrée" else err ?: "Échec"
                }
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ExpenseFormDialog(
    speculations: List<com.kokansey.app.data.Speculation>,
    saving: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (ExpenseRequest) -> Unit
) {
    var type by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    var supplier by remember { mutableStateOf("") }
    var observation by remember { mutableStateOf("") }
    var specId by remember { mutableStateOf<String?>(null) }
    var specOpen by remember { mutableStateOf(false) }
    var formError by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Nouvelle dépense") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                ExposedDropdownMenuBox(specOpen, { specOpen = it }) {
                    OutlinedTextField(
                        value = speculations.find { it.id == specId }?.name ?: "Aucune",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Spéculation") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(specOpen) },
                        modifier = Modifier.fillMaxWidth().menuAnchor()
                    )
                    ExposedDropdownMenu(specOpen, { specOpen = false }) {
                        DropdownMenuItem(text = { Text("Aucune") },
                            onClick = { specId = null; specOpen = false })
                        speculations.forEach { s ->
                            DropdownMenuItem(text = { Text(s.name) },
                                onClick = { specId = s.id; specOpen = false })
                        }
                    }
                }
                OutlinedTextField(type, { type = it }, label = { Text("Type *") },
                    modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(category, { category = it }, label = { Text("Catégorie *") },
                    modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(amount, { amount = it }, label = { Text("Montant (FCFA) *") },
                    modifier = Modifier.fillMaxWidth(), singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
                OutlinedTextField(supplier, { supplier = it }, label = { Text("Fournisseur") },
                    modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(observation, { observation = it }, label = { Text("Observation") },
                    modifier = Modifier.fillMaxWidth())
                formError?.let { Text(it, color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall) }
            }
        },
        confirmButton = {
            Button(
                enabled = !saving,
                onClick = {
                    val a = amount.toDoubleOrNull()
                    when {
                        type.isBlank() -> formError = "Type requis"
                        category.isBlank() -> formError = "Catégorie requise"
                        a == null || a <= 0 -> formError = "Montant invalide"
                        else -> onSubmit(ExpenseRequest(
                            speculationId = specId,
                            type = type.trim(),
                            category = category.trim(),
                            amount = a,
                            date = todayIso(),
                            supplier = supplier.ifBlank { null },
                            observation = observation.ifBlank { null }
                        ))
                    }
                }
            ) { Text(if (saving) "Enregistrement…" else "Enregistrer") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Annuler") } }
    )
}
