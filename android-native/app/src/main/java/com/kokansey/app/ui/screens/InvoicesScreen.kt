package com.kokansey.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.kokansey.app.data.Invoice
import com.kokansey.app.ui.components.*
import com.kokansey.app.vm.OpsViewModel

@Composable
fun InvoicesScreen(vm: OpsViewModel) {
    val state by vm.state.collectAsState()
    var query by remember { mutableStateOf("") }
    var payTarget by remember { mutableStateOf<Invoice?>(null) }
    var feedback by remember { mutableStateOf<String?>(null) }
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(Unit) { vm.load() }
    LaunchedEffect(feedback) {
        feedback?.let { snackbar.showSnackbar(it); feedback = null }
    }

    Scaffold(snackbarHost = { SnackbarHost(snackbar) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            ScreenHeader("Factures", "${state.invoices.size} facture(s)") {
                IconButton(onClick = { vm.load() }) {
                    Icon(Icons.Outlined.Refresh, contentDescription = "Actualiser")
                }
            }
            SearchField(query, { query = it })

            val filtered = state.invoices.filter {
                query.isBlank() || listOfNotNull(it.numero, it.client?.nom)
                    .any { s -> s.contains(query, ignoreCase = true) }
            }

            when {
                state.loading -> LoadingBox()
                filtered.isEmpty() -> EmptyBox("Aucune facture")
                else -> LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(filtered, key = { it.id }) { inv ->
                        Card(shape = RoundedCornerShape(14.dp),
                            elevation = CardDefaults.cardElevation(1.dp)) {
                            Row(Modifier.fillMaxWidth().padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically) {
                                Column(Modifier.weight(1f)) {
                                    Text("Facture ${inv.numero}",
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.SemiBold)
                                    Text(listOfNotNull(
                                        inv.client?.nom,
                                        formatDate(inv.dateEmission),
                                        "payé ${formatMoney(inv.montantPaye)}"
                                    ).joinToString(" · "),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Spacer(Modifier.height(6.dp))
                                    StatusChip(inv.statut)
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(formatMoney(inv.montantTotal),
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.Bold)
                                    if (inv.statut != "PAYEE" && inv.statut != "ANNULEE") {
                                        IconButton(onClick = { payTarget = inv }) {
                                            Icon(Icons.Outlined.Payments, "Encaisser",
                                                tint = MaterialTheme.colorScheme.primary)
                                        }
                                    }
                                    IconButton(onClick = {
                                        vm.sendInvoicePdf(inv.id) { ok, err ->
                                            feedback = if (ok) "Facture envoyée par WhatsApp"
                                                       else err ?: "Échec d'envoi"
                                        }
                                    }) {
                                        Icon(Icons.Outlined.Send, "Envoyer par WhatsApp",
                                            tint = MaterialTheme.colorScheme.primary,
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

    payTarget?.let { inv ->
        InvoicePaymentDialog(inv, state.saving, { payTarget = null }) { montant, mode ->
            vm.payInvoice(inv.id, montant, mode) { ok, err ->
                if (ok) payTarget = null
                feedback = if (ok) "Paiement enregistré" else err ?: "Échec"
            }
        }
    }
}

@Composable
private fun InvoicePaymentDialog(
    invoice: Invoice,
    saving: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (Double, String?) -> Unit
) {
    var amount by remember { mutableStateOf((invoice.montantTotal - invoice.montantPaye).let {
        if (it > 0) it.toLong().toString() else ""
    }) }
    var mode by remember { mutableStateOf("ESPECE") }
    var formError by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Encaisser — ${invoice.numero}") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Reste dû : ${formatMoney(invoice.montantTotal - invoice.montantPaye)}",
                    style = MaterialTheme.typography.bodyMedium)
                OutlinedTextField(amount, { amount = it },
                    label = { Text("Montant (FCFA) *") },
                    modifier = Modifier.fillMaxWidth(), singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf("ESPECE" to "Espèce", "MOBILE_MONEY" to "Mobile",
                        "VIREMENT" to "Virement", "CHEQUE" to "Chèque")
                        .forEach { (v, l) ->
                            FilterChip(selected = mode == v,
                                onClick = { mode = v }, label = { Text(l) })
                        }
                }
                formError?.let { Text(it, color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall) }
            }
        },
        confirmButton = {
            Button(enabled = !saving, onClick = {
                val m = amount.toDoubleOrNull()
                if (m == null || m <= 0) formError = "Montant invalide"
                else onSubmit(m, mode)
            }) { Text(if (saving) "Enregistrement…" else "Valider") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Annuler") } }
    )
}
