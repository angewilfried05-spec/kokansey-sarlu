package com.kokansey.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.kokansey.app.data.*
import com.kokansey.app.ui.components.*
import com.kokansey.app.vm.HrFleetViewModel
import com.kokansey.app.vm.todayIso

@Composable
fun HrScreen(vm: HrFleetViewModel, isAdmin: Boolean) {
    val state by vm.state.collectAsState()
    var tab by remember { mutableIntStateOf(0) }
    var query by remember { mutableStateOf("") }
    var showEmployeeForm by remember { mutableStateOf(false) }
    var showTaskForm by remember { mutableStateOf(false) }
    var deleteTarget by remember { mutableStateOf<TaskDto?>(null) }
    var feedback by remember { mutableStateOf<String?>(null) }
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(Unit) { vm.load() }
    LaunchedEffect(feedback) {
        feedback?.let { snackbar.showSnackbar(it); feedback = null }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        floatingActionButton = {
            FloatingActionButton(onClick = {
                if (tab == 0) showEmployeeForm = true else showTaskForm = true
            }) { Icon(Icons.Filled.Add, contentDescription = "Ajouter") }
        }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            ScreenHeader("Employés & Tâches",
                "${state.employees.size} employé(s) · ${state.tasks.count { it.status != "COMPLETED" }} tâche(s) active(s)") {
                IconButton(onClick = { vm.load() }) {
                    Icon(Icons.Outlined.Refresh, contentDescription = "Actualiser")
                }
            }
            TabRow(selectedTabIndex = tab) {
                Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text("Employés") })
                Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text("Tâches") })
            }
            SearchField(query, { query = it })

            if (state.loading) LoadingBox() else if (tab == 0) {
                val filtered = state.employees.filter {
                    query.isBlank() || "${it.firstName} ${it.lastName} ${it.position}"
                        .contains(query, ignoreCase = true)
                }
                if (filtered.isEmpty()) EmptyBox("Aucun employé") else
                    LazyColumn(contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(filtered, key = { it.id }) { emp ->
                            Card(shape = RoundedCornerShape(14.dp),
                                elevation = CardDefaults.cardElevation(1.dp)) {
                                Row(Modifier.fillMaxWidth().padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically) {
                                    Column(Modifier.weight(1f)) {
                                        Text("${emp.firstName} ${emp.lastName}",
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.SemiBold)
                                        Text(listOfNotNull(emp.position.ifBlank { null },
                                            emp.contact.ifBlank { null }).joinToString(" · "),
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    Text(formatMoney(emp.salary),
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.SemiBold,
                                        color = MaterialTheme.colorScheme.primary)
                                }
                            }
                        }
                    }
            } else {
                val filtered = state.tasks.filter {
                    query.isBlank() || listOfNotNull(
                        it.title,
                        it.assignedTo?.let { e -> "${e.firstName} ${e.lastName}" },
                        it.truck?.internalCode
                    ).any { s -> s.contains(query, ignoreCase = true) }
                }
                if (filtered.isEmpty()) EmptyBox("Aucune tâche") else
                    LazyColumn(contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(filtered, key = { it.id }) { task ->
                            Card(shape = RoundedCornerShape(14.dp),
                                elevation = CardDefaults.cardElevation(1.dp)) {
                                Row(Modifier.fillMaxWidth().padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically) {
                                    Column(Modifier.weight(1f)) {
                                        Text(task.title,
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.SemiBold)
                                        Text(listOfNotNull(
                                            task.assignedTo?.let { "${it.firstName} ${it.lastName}" },
                                            task.dueDate?.let { "échéance ${formatDate(it)}" },
                                            if (task.priority == "HIGH") "Priorité haute" else null
                                        ).joinToString(" · "),
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        Spacer(Modifier.height(6.dp))
                                        StatusChip(task.status)
                                    }
                                    if (task.status != "COMPLETED") {
                                        IconButton(onClick = {
                                            vm.completeTask(task) { ok, err ->
                                                feedback = if (ok) "Tâche terminée" else err ?: "Échec"
                                            }
                                        }) {
                                            Icon(Icons.Filled.CheckCircle, "Terminer",
                                                tint = MaterialTheme.colorScheme.primary)
                                        }
                                    }
                                    if (isAdmin) {
                                        IconButton(onClick = { deleteTarget = task }) {
                                            Icon(Icons.Outlined.Delete, "Supprimer",
                                                tint = MaterialTheme.colorScheme.error,
                                                modifier = Modifier.size(20.dp))
                                        }
                                    }
                                }
                            }
                        }
                    }
            }
        }
    }

    deleteTarget?.let { task ->
        ConfirmDeleteDialog(
            title = "Supprimer la tâche",
            message = task.title,
            onConfirm = {
                deleteTarget = null
                vm.deleteTask(task.id) { ok, err ->
                    feedback = if (ok) "Tâche supprimée" else err ?: "Échec"
                }
            },
            onDismiss = { deleteTarget = null }
        )
    }

    if (showEmployeeForm) {
        EmployeeFormDialog(state.saving, { showEmployeeForm = false }) { req ->
            vm.createEmployee(req) { ok, err ->
                if (ok) showEmployeeForm = false
                feedback = if (ok) "Employé créé" else err ?: "Échec"
            }
        }
    }
    if (showTaskForm) {
        TaskFormDialog(state.employees, state.saving,
            { showTaskForm = false }) { req ->
            vm.createTask(req) { ok, err ->
                if (ok) showTaskForm = false
                feedback = if (ok) "Tâche créée" else err ?: "Échec"
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EmployeeFormDialog(
    saving: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (EmployeeRequest) -> Unit
) {
    var firstName by remember { mutableStateOf("") }
    var lastName by remember { mutableStateOf("") }
    var contact by remember { mutableStateOf("") }
    var position by remember { mutableStateOf("") }
    var residence by remember { mutableStateOf("") }
    var cni by remember { mutableStateOf("") }
    var salary by remember { mutableStateOf("") }
    var formError by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Nouvel employé") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(firstName, { firstName = it }, label = { Text("Prénom *") },
                    modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(lastName, { lastName = it }, label = { Text("Nom *") },
                    modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(position, { position = it }, label = { Text("Poste *") },
                    modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(contact, { contact = it }, label = { Text("Contact *") },
                    modifier = Modifier.fillMaxWidth(), singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone))
                OutlinedTextField(residence, { residence = it }, label = { Text("Résidence *") },
                    modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(cni, { cni = it }, label = { Text("N° CNI *") },
                    modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(salary, { salary = it }, label = { Text("Salaire (FCFA) *") },
                    modifier = Modifier.fillMaxWidth(), singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
                formError?.let { Text(it, color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall) }
            }
        },
        confirmButton = {
            Button(enabled = !saving, onClick = {
                val s = salary.toDoubleOrNull()
                when {
                    firstName.isBlank() -> formError = "Prénom requis"
                    lastName.isBlank() -> formError = "Nom requis"
                    position.isBlank() -> formError = "Poste requis"
                    contact.isBlank() -> formError = "Contact requis"
                    residence.isBlank() -> formError = "Résidence requise"
                    cni.isBlank() -> formError = "N° CNI requis"
                    s == null || s <= 0 -> formError = "Salaire invalide"
                    else -> onSubmit(EmployeeRequest(
                        firstName = firstName.trim(), lastName = lastName.trim(),
                        hireDate = todayIso(), salary = s,
                        contact = contact.trim(), position = position.trim(),
                        residence = residence.trim(), cniNumber = cni.trim()
                    ))
                }
            }) { Text(if (saving) "Enregistrement…" else "Enregistrer") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Annuler") } }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TaskFormDialog(
    employees: List<Employee>,
    saving: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (TaskRequest) -> Unit
) {
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var dueDate by remember { mutableStateOf("") }
    var priority by remember { mutableStateOf("NORMAL") }
    var assigneeId by remember { mutableStateOf<String?>(null) }
    var empOpen by remember { mutableStateOf(false) }
    var formError by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Nouvelle tâche") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(title, { title = it }, label = { Text("Titre *") },
                    modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(description, { description = it },
                    label = { Text("Description") }, modifier = Modifier.fillMaxWidth())
                ExposedDropdownMenuBox(empOpen, { empOpen = it }) {
                    OutlinedTextField(
                        value = employees.find { it.id == assigneeId }
                            ?.let { "${it.firstName} ${it.lastName}" } ?: "Choisir…",
                        onValueChange = {}, readOnly = true,
                        label = { Text("Assigné à *") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(empOpen) },
                        modifier = Modifier.fillMaxWidth().menuAnchor()
                    )
                    ExposedDropdownMenu(empOpen, { empOpen = false }) {
                        employees.forEach { e ->
                            DropdownMenuItem(
                                text = { Text("${e.firstName} ${e.lastName} — ${e.position}") },
                                onClick = { assigneeId = e.id; empOpen = false })
                        }
                    }
                }
                OutlinedTextField(dueDate, { dueDate = it },
                    label = { Text("Échéance (AAAA-MM-JJ)") },
                    modifier = Modifier.fillMaxWidth(), singleLine = true)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("LOW" to "Basse", "NORMAL" to "Normale", "HIGH" to "Haute")
                        .forEach { (v, l) ->
                            FilterChip(selected = priority == v,
                                onClick = { priority = v }, label = { Text(l) })
                        }
                }
                formError?.let { Text(it, color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall) }
            }
        },
        confirmButton = {
            Button(enabled = !saving, onClick = {
                when {
                    title.isBlank() -> formError = "Titre requis"
                    assigneeId == null -> formError = "Assigné requis"
                    else -> onSubmit(TaskRequest(
                        title = title.trim(),
                        description = description.ifBlank { null },
                        priority = priority,
                        dueDate = dueDate.ifBlank { null }?.let { "${it}T00:00:00.000Z" },
                        assignedToId = assigneeId!!
                    ))
                }
            }) { Text(if (saving) "Enregistrement…" else "Créer") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Annuler") } }
    )
}
