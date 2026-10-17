package com.kokansey.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kokansey.app.data.*
import com.kokansey.app.ui.components.*
import com.kokansey.app.vm.HrFleetViewModel
import com.kokansey.app.vm.todayIso

@Composable
fun FleetScreen(vm: HrFleetViewModel) {
    val state by vm.state.collectAsState()
    var tab by remember { mutableIntStateOf(0) }
    var query by remember { mutableStateOf("") }
    var showTripForm by remember { mutableStateOf(false) }
    var feedback by remember { mutableStateOf<String?>(null) }
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(Unit) { vm.load() }
    LaunchedEffect(feedback) {
        feedback?.let { snackbar.showSnackbar(it); feedback = null }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        floatingActionButton = {
            if (tab == 1) {
                FloatingActionButton(onClick = { showTripForm = true }) {
                    Icon(Icons.Filled.Add, contentDescription = "Nouvelle mission")
                }
            }
        }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            ScreenHeader("Camions & Missions",
                "${state.trucks.size} véhicule(s) · ${state.trips.count { it.status == "EN_COURS" }} mission(s) en cours") {
                IconButton(onClick = { vm.load() }) {
                    Icon(Icons.Outlined.Refresh, contentDescription = "Actualiser")
                }
            }
            TabRow(selectedTabIndex = tab) {
                Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text("Véhicules") })
                Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text("Missions") })
            }
            SearchField(query, { query = it })

            if (state.loading) LoadingBox() else if (tab == 0) {
                val filtered = state.trucks.filter {
                    query.isBlank() || listOfNotNull(
                        it.internalCode, it.registration, it.brand, it.model,
                        it.driver?.let { d -> "${d.firstName} ${d.lastName}" }
                    ).any { s -> s.contains(query, ignoreCase = true) }
                }
                if (filtered.isEmpty()) EmptyBox("Aucun véhicule") else
                    LazyColumn(contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(filtered, key = { it.id }) { truck ->
                            Card(shape = RoundedCornerShape(14.dp),
                                elevation = CardDefaults.cardElevation(1.dp)) {
                                Row(Modifier.fillMaxWidth().padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically) {
                                    Column(Modifier.weight(1f)) {
                                        Text("${truck.internalCode} — ${truck.brand} ${truck.model}".trim(),
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.SemiBold)
                                        Text(listOfNotNull(
                                            truck.registration.ifBlank { null },
                                            truck.category.ifBlank { null },
                                            truck.driver?.let { "Chauffeur: ${it.firstName} ${it.lastName}" },
                                            truck.nextMaintenance?.let { "Maintenance: ${formatDate(it)}" }
                                        ).joinToString(" · "),
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        Spacer(Modifier.height(6.dp))
                                        StatusChip(truck.status)
                                    }
                                }
                            }
                        }
                    }
            } else {
                val filtered = state.trips.filter {
                    query.isBlank() || listOfNotNull(
                        it.destination, it.cargo, it.truck?.internalCode
                    ).any { s -> s.contains(query, ignoreCase = true) }
                }
                if (filtered.isEmpty()) EmptyBox("Aucune mission") else
                    LazyColumn(contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(filtered, key = { it.id }) { trip ->
                            Card(shape = RoundedCornerShape(14.dp),
                                elevation = CardDefaults.cardElevation(1.dp)) {
                                Row(Modifier.fillMaxWidth().padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically) {
                                    Column(Modifier.weight(1f)) {
                                        Text(trip.destination,
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.SemiBold)
                                        Text(listOfNotNull(
                                            trip.truck?.internalCode,
                                            trip.cargo.ifBlank { null },
                                            formatDate(trip.date)
                                        ).joinToString(" · "),
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        Spacer(Modifier.height(6.dp))
                                        StatusChip(trip.status)
                                    }
                                    if (trip.status == "EN_COURS") {
                                        IconButton(onClick = {
                                            vm.completeTrip(trip.id) { ok, err ->
                                                feedback = if (ok) "Mission terminée" else err ?: "Échec"
                                            }
                                        }) {
                                            Icon(Icons.Filled.CheckCircle, "Terminer",
                                                tint = MaterialTheme.colorScheme.primary)
                                        }
                                    }
                                }
                            }
                        }
                    }
            }
        }
    }

    if (showTripForm) {
        TripFormDialog(state.trucks.filter { it.status != "En maintenance" },
            state.saving, { showTripForm = false }) { req ->
            vm.createTrip(req) { ok, err ->
                if (ok) showTripForm = false
                feedback = if (ok) "Mission créée" else err ?: "Échec"
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TripFormDialog(
    trucks: List<Truck>,
    saving: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (TripRequest) -> Unit
) {
    var truckId by remember { mutableStateOf<String?>(null) }
    var destination by remember { mutableStateOf("") }
    var cargo by remember { mutableStateOf("") }
    var observation by remember { mutableStateOf("") }
    var truckOpen by remember { mutableStateOf(false) }
    var formError by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Nouvelle mission") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                ExposedDropdownMenuBox(truckOpen, { truckOpen = it }) {
                    OutlinedTextField(
                        value = trucks.find { it.id == truckId }
                            ?.let { "${it.internalCode} — ${it.brand}" } ?: "Choisir…",
                        onValueChange = {}, readOnly = true,
                        label = { Text("Camion *") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(truckOpen) },
                        modifier = Modifier.fillMaxWidth().menuAnchor()
                    )
                    ExposedDropdownMenu(truckOpen, { truckOpen = false }) {
                        trucks.forEach { t ->
                            DropdownMenuItem(
                                text = { Text("${t.internalCode} — ${t.brand} ${t.model}") },
                                onClick = { truckId = t.id; truckOpen = false })
                        }
                    }
                }
                OutlinedTextField(destination, { destination = it },
                    label = { Text("Destination *") },
                    modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(cargo, { cargo = it }, label = { Text("Cargaison *") },
                    modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(observation, { observation = it },
                    label = { Text("Observation") }, modifier = Modifier.fillMaxWidth())
                formError?.let { Text(it, color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall) }
            }
        },
        confirmButton = {
            Button(enabled = !saving, onClick = {
                when {
                    truckId == null -> formError = "Camion requis"
                    destination.isBlank() -> formError = "Destination requise"
                    cargo.isBlank() -> formError = "Cargaison requise"
                    else -> onSubmit(TripRequest(
                        truckId = truckId!!, date = todayIso(),
                        destination = destination.trim(), cargo = cargo.trim(),
                        observation = observation.ifBlank { null }
                    ))
                }
            }) { Text(if (saving) "Enregistrement…" else "Créer") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Annuler") } }
    )
}
