package com.kokansey.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
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
import com.kokansey.app.data.Client
import com.kokansey.app.data.ClientRequest
import com.kokansey.app.ui.components.*
import com.kokansey.app.ui.theme.KokanseyGold
import com.kokansey.app.vm.ClientsViewModel

@Composable
fun ClientsScreen(vm: ClientsViewModel) {
    val state by vm.state.collectAsState()
    var showNewClient by remember { mutableStateOf(false) }
    var paymentTarget by remember { mutableStateOf<Client?>(null) }
    var query by remember { mutableStateOf("") }

    LaunchedEffect(Unit) { vm.refresh() }
    LaunchedEffect(state.saveSuccess) {
        if (state.saveSuccess) { showNewClient = false; paymentTarget = null; vm.consumeSaveSuccess() }
    }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(onClick = { showNewClient = true },
                containerColor = MaterialTheme.colorScheme.primary) {
                Icon(Icons.Filled.Add, "Nouveau client")
            }
        }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            ScreenHeader("Comptes Clients", "${state.items.size} client(s)") {
                IconButton(onClick = { vm.refresh() }) {
                    Icon(Icons.Filled.Refresh, "Actualiser")
                }
            }
            SearchField(query, { query = it })

            val filtered = state.items.filter {
                query.isBlank() || listOfNotNull(it.nom, it.telephone)
                    .any { s -> s.contains(query, ignoreCase = true) }
            }
            when {
                state.loading -> LoadingBox()
                state.error != null && state.items.isEmpty() ->
                    ErrorBox(state.error ?: "Erreur") { vm.refresh() }
                filtered.isEmpty() -> EmptyBox("Aucun client.\nAppuyez sur + pour en créer un.")
                else -> LazyColumn(
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 88.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(filtered, key = { it.id }) { client ->
                        ClientCard(client, onPay = { paymentTarget = client })
                    }
                }
            }
        }
    }

    if (showNewClient) {
        NewClientDialog(state.saving, state.error, onDismiss = { showNewClient = false }) {
            vm.create(it)
        }
    }
    paymentTarget?.let { client ->
        PaymentDialog(client, state.saving, state.error, onDismiss = { paymentTarget = null }) { type, montant, mode ->
            vm.addOperation(client.id, type, montant, mode, null)
        }
    }
}

@Composable
private fun ClientCard(client: Client, onPay: () -> Unit) {
    val soldeColor = when {
        client.solde > 0 -> MaterialTheme.colorScheme.error
        client.solde < 0 -> MaterialTheme.colorScheme.primary
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }
    Card(shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier.size(44.dp)
                    .background(MaterialTheme.colorScheme.primaryContainer, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(client.nom.take(2).uppercase(), fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer)
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(client.nom, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                Text(
                    client.typeClient + (client.telephone?.let { " • $it" } ?: ""),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(formatMoney(client.solde), style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold, color = soldeColor)
                if (client.solde > 0) {
                    TextButton(onClick = onPay, contentPadding = PaddingValues(0.dp)) {
                        Text("Encaisser", style = MaterialTheme.typography.labelMedium, color = KokanseyGold)
                    }
                }
            }
        }
    }
}

@Composable
private fun NewClientDialog(
    saving: Boolean, error: String?,
    onDismiss: () -> Unit, onSubmit: (ClientRequest) -> Unit
) {
    var nom by remember { mutableStateOf("") }
    var telephone by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("particulier") }
    var formError by remember { mutableStateOf<String?>(null) }
    val types = listOf("particulier", "entreprise", "cooperative")

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Nouveau client", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(nom, { nom = it }, label = { Text("Nom *") },
                    singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(telephone, { telephone = it.filter { c -> c.isDigit() || c == '+' || c == ' ' } },
                    label = { Text("Téléphone") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    types.forEach { t ->
                        FilterChip(selected = type == t, onClick = { type = t },
                            label = { Text(t.replaceFirstChar { it.uppercase() }) })
                    }
                }
                (formError ?: error)?.let {
                    Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
            }
        },
        confirmButton = {
            Button(enabled = !saving, onClick = {
                if (nom.isBlank()) formError = "Nom requis"
                else onSubmit(ClientRequest(nom.trim(), telephone.ifBlank { null }, typeClient = type))
            }) { Text(if (saving) "…" else "Créer") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Annuler") } }
    )
}

@Composable
private fun PaymentDialog(
    client: Client, saving: Boolean, error: String?,
    onDismiss: () -> Unit, onSubmit: (String, Double, String?) -> Unit
) {
    var montant by remember { mutableStateOf(client.solde.takeIf { it > 0 }?.toLong()?.toString() ?: "") }
    var mode by remember { mutableStateOf("espece") }
    var formError by remember { mutableStateOf<String?>(null) }
    val modes = listOf("espece", "cheque", "virement", "mobile_money")

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Paiement — ${client.nom}", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Solde dû : ${formatMoney(client.solde)}",
                    color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold)
                OutlinedTextField(montant, { montant = it.filter { c -> c.isDigit() } },
                    label = { Text("Montant (FCFA) *") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    modes.take(2).forEach { m ->
                        FilterChip(selected = mode == m, onClick = { mode = m },
                            label = { Text(if (m == "espece") "Espèce" else "Chèque") })
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    modes.drop(2).forEach { m ->
                        FilterChip(selected = mode == m, onClick = { mode = m },
                            label = { Text(if (m == "virement") "Virement" else "Mobile Money") })
                    }
                }
                (formError ?: error)?.let {
                    Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
            }
        },
        confirmButton = {
            Button(enabled = !saving, onClick = {
                val m = montant.toDoubleOrNull()
                when {
                    m == null || m <= 0 -> formError = "Montant invalide"
                    else -> onSubmit("paiement", m, mode)
                }
            }) { Text(if (saving) "…" else "Enregistrer") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Annuler") } }
    )
}
