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

// ---------- Dépenses ----------
@Serializable
data class Expense(
    val id: String,
    val date: String,
    val type: String,
    val category: String,
    val amount: Double,
    val supplier: String? = null,
    val observation: String? = null,
    val speculation: Speculation? = null
)

@Serializable
data class ExpenseRequest(
    val speculationId: String? = null,
    val type: String,
    val category: String,
    val amount: Double,
    val date: String,
    val supplier: String? = null,
    val observation: String? = null
)

// ---------- Employés & Tâches ----------
@Serializable
data class Employee(
    val id: String,
    val firstName: String,
    val lastName: String,
    val position: String = "",
    val contact: String = "",
    val salary: Double = 0.0,
    val contractType: String? = null,
    val service: String? = null
)

@Serializable
data class EmployeeRequest(
    val firstName: String,
    val lastName: String,
    val hireDate: String,
    val salary: Double,
    val contact: String,
    val position: String,
    val residence: String,
    val cniNumber: String,
    val contractType: String? = null,
    val service: String? = null
)

@Serializable
data class TaskDto(
    val id: String,
    val title: String,
    val description: String? = null,
    val status: String = "PENDING",
    val priority: String = "NORMAL",
    val dueDate: String? = null,
    val assignedTo: Employee? = null,
    val truck: Truck? = null
)

@Serializable
data class TaskRequest(
    val title: String,
    val description: String? = null,
    val status: String = "PENDING",
    val priority: String = "NORMAL",
    val dueDate: String? = null,
    val assignedToId: String,
    val truckId: String? = null
)

// ---------- Camions & Missions ----------
@Serializable
data class Truck(
    val id: String,
    val internalCode: String = "",
    val registration: String = "",
    val brand: String = "",
    val model: String = "",
    val category: String = "",
    val status: String = "Disponible",
    val mileage: Double = 0.0,
    val nextMaintenance: String? = null,
    val driver: Employee? = null,
    val conveyor: Employee? = null
)

@Serializable
data class Trip(
    val id: String,
    val date: String,
    val destination: String,
    val cargo: String,
    val status: String = "EN_COURS",
    val observation: String? = null,
    val truck: Truck? = null
)

@Serializable
data class TripRequest(
    val truckId: String,
    val date: String,
    val destination: String,
    val cargo: String,
    val observation: String? = null
)

// ---------- Factures ----------
@Serializable
data class Invoice(
    val id: String,
    val numero: String,
    val dateEmission: String,
    val dateEcheance: String? = null,
    val montantTotal: Double,
    val montantPaye: Double = 0.0,
    val statut: String = "EN_ATTENTE",
    val client: Client? = null
)

@Serializable
data class InvoicePaymentRequest(
    val montant: Double,
    val modePaiement: String? = null
)

// ---------- Rapport mensuel ----------
@Serializable
data class MonthlyCounter(
    val id: String,
    val month: String,
    val year: Int,
    val monthNumber: Int,
    val salesCount: Int = 0,
    val expensesCount: Int = 0,
    val stockMovementsCount: Int = 0,
    val harvestsCount: Int = 0,
    val totalSalesAmount: Double = 0.0,
    val totalExpensesAmount: Double = 0.0
)

@Serializable
data class JournalEntry(
    val id: String,
    val month: String,
    val date: String,
    val action: String,
    val entity: String? = null,
    val details: String? = null,
    val userName: String? = null
)
