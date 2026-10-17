package com.kokansey.app.data

import kotlinx.serialization.Serializable

// ---------- Auth ----------
@Serializable
data class LoginRequest(val username: String, val password: String)

@Serializable
data class LoginResponse(
    val success: Boolean = false,
    val token: String? = null,
    val user: UserDto? = null,
    val message: String? = null
)

@Serializable
data class UserDto(
    val id: String,
    val username: String,
    val name: String? = null,
    val role: String = "GERANT"
)

// ---------- Références ----------
@Serializable
data class Speculation(
    val id: String,
    val name: String,
    val category: String = "",
    val status: String = "EN_COURS",
    val areaSize: Double? = null
)

@Serializable
data class Campagne(
    val id: String,
    val nom: String,
    val actif: Boolean = true
)

// ---------- Ventes ----------
@Serializable
data class Sale(
    val id: String,
    val date: String,
    val product: String,
    val quantity: Double,
    val unit: String,
    val unitPrice: Double,
    val totalPrice: Double,
    val client: String? = null,
    val observation: String? = null,
    val speculation: Speculation? = null
)

@Serializable
data class SaleRequest(
    val speculationId: String,
    val product: String,
    val quantity: Double,
    val unit: String,
    val unitPrice: Double,
    val date: String,
    val client: String? = null,
    val clientId: String? = null,
    val observation: String? = null
)

// ---------- Stock ----------
@Serializable
data class Stock(
    val id: String,
    val name: String,
    val category: String,
    val quantity: Double,
    val unit: String,
    val minThreshold: Double = 0.0,
    val speculationId: String? = null
)

@Serializable
data class StockRequest(
    val name: String,
    val category: String,
    val quantity: Double,
    val unit: String,
    val minThreshold: Double,
    val speculationId: String? = null
)

@Serializable
data class StockMovement(
    val id: String,
    val date: String,
    val type: String,
    val quantity: Double,
    val reason: String? = null,
    val stock: Stock? = null
)

@Serializable
data class StockMovementRequest(
    val type: String,
    val quantity: Double,
    val date: String,
    val reason: String? = null
)

// ---------- Clients ----------
@Serializable
data class Client(
    val id: String,
    val nom: String,
    val telephone: String? = null,
    val email: String? = null,
    val adresse: String? = null,
    val typeClient: String = "particulier",
    val actif: Boolean = true,
    val solde: Double = 0.0
)

@Serializable
data class ClientRequest(
    val nom: String,
    val telephone: String? = null,
    val email: String? = null,
    val adresse: String? = null,
    val typeClient: String = "particulier",
    val actif: Boolean = true
)

@Serializable
data class ClientOperationRequest(
    val typeOperation: String,
    val montant: Double,
    val description: String? = null,
    val reference: String? = null,
    val modePaiement: String? = null,
    val dateOperation: String
)

// ---------- Récoltes ----------
@Serializable
data class Harvest(
    val id: String,
    val date: String,
    val quantity: Double,
    val unit: String,
    val quality: String? = null,
    val observation: String? = null,
    val speculation: Speculation? = null
)

@Serializable
data class HarvestRequest(
    val speculationId: String,
    val quantity: Double,
    val unit: String,
    val date: String,
    val quality: String? = null,
    val observation: String? = null
)

// ---------- Dashboard ----------
@Serializable
data class DashboardSummary(
    val totalSales: Double = 0.0,
    val totalExpenses: Double = 0.0,
    val netProfit: Double = 0.0,
    val employeesCount: Int = 0,
    val totalCreances: Double = 0.0,
    val topDebiteurs: List<Debiteur> = emptyList(),
    val notifications: List<AppNotification> = emptyList(),
    val chartData: List<ChartPoint> = emptyList()
)

@Serializable
data class Debiteur(val nom: String, val solde: Double)

@Serializable
data class AppNotification(
    val id: String,
    val type: String = "info",
    val title: String,
    val message: String,
    val date: String? = null
)

@Serializable
data class ChartPoint(val name: String, val sales: Double, val expenses: Double)

@Serializable
data class ApiError(val message: String? = null, val error: String? = null)
