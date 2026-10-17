package com.kokansey.app.data

import retrofit2.Response

class Repository(val session: SessionManager, baseUrl: String) {

    private val api = ApiClient.create(baseUrl) { session.token }

    /** Convertit un échec HTTP en message lisible. Renvoie null si succès. */
    private fun <T> Response<T>.errorMessage(): String? {
        if (isSuccessful) return null
        return when (code()) {
            401 -> "Session expirée, reconnectez-vous"
            403 -> "Action non autorisée pour votre rôle"
            404 -> "Ressource introuvable"
            429 -> "Trop de tentatives, patientez"
            else -> "Erreur serveur (${code()})"
        }
    }

    suspend fun login(username: String, password: String): Result<UserDto> = runCatching {
        val res = api.login(LoginRequest(username, password))
        if (!res.isSuccessful) throw ApiException(res.errorMessage() ?: "Échec de connexion")
        val body = res.body() ?: throw ApiException("Réponse vide")
        val token = body.token ?: throw ApiException(body.message ?: "Identifiants invalides")
        val user = body.user ?: UserDto("", username)
        session.saveSession(token, user)
        user
    }

    suspend fun getSummary() = runCatching {
        val res = api.getSummary()
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
        res.body()!!
    }

    suspend fun getSpeculations() = runCatching {
        val res = api.getSpeculations()
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
        res.body()!!
    }

    suspend fun getSales() = runCatching {
        val res = api.getSales()
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
        res.body()!!
    }

    suspend fun createSale(req: SaleRequest) = runCatching {
        val res = api.createSale(req)
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
    }

    suspend fun getStocks() = runCatching {
        val res = api.getStocks()
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
        res.body()!!
    }

    suspend fun createStock(req: StockRequest) = runCatching {
        val res = api.createStock(req)
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
        res.body()!!
    }

    suspend fun getStockMovements() = runCatching {
        val res = api.getStockMovements()
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
        res.body()!!
    }

    suspend fun createStockMovement(stockId: String, req: StockMovementRequest) = runCatching {
        val res = api.createStockMovement(stockId, req)
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
    }

    suspend fun getClients() = runCatching {
        val res = api.getClients()
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
        res.body()!!
    }

    suspend fun createClient(req: ClientRequest) = runCatching {
        val res = api.createClient(req)
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
        res.body()!!
    }

    suspend fun createClientOperation(clientId: String, req: ClientOperationRequest) = runCatching {
        val res = api.createClientOperation(clientId, req)
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
    }

    suspend fun getHarvests() = runCatching {
        val res = api.getHarvests()
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
        res.body()!!
    }

    suspend fun createHarvest(req: HarvestRequest) = runCatching {
        val res = api.createHarvest(req)
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
    }

    // ---------- Modifications ----------
    suspend fun updateSale(id: String, req: SaleRequest) = runCatching {
        val res = api.updateSale(id, req)
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
    }

    suspend fun updateHarvest(id: String, req: HarvestRequest) = runCatching {
        val res = api.updateHarvest(id, req)
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
    }

    suspend fun updateExpense(id: String, req: ExpenseRequest) = runCatching {
        val res = api.updateExpense(id, req)
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
    }

    // ---------- Suppressions ----------
    suspend fun deleteSale(id: String) = runCatching {
        val res = api.deleteSale(id)
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
    }

    suspend fun deleteHarvest(id: String) = runCatching {
        val res = api.deleteHarvest(id)
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
    }

    suspend fun deleteExpense(id: String) = runCatching {
        val res = api.deleteExpense(id)
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
    }

    suspend fun deleteTask(id: String) = runCatching {
        val res = api.deleteTask(id)
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
    }

    // ---------- Dépenses ----------
    suspend fun getExpenses() = runCatching {
        val res = api.getExpenses()
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
        res.body()!!
    }

    suspend fun createExpense(req: ExpenseRequest) = runCatching {
        val res = api.createExpense(req)
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
    }

    // ---------- Employés & Tâches ----------
    suspend fun getEmployees() = runCatching {
        val res = api.getEmployees()
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
        res.body()!!
    }

    suspend fun createEmployee(req: EmployeeRequest) = runCatching {
        val res = api.createEmployee(req)
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
        res.body()!!
    }

    suspend fun getTasks() = runCatching {
        val res = api.getTasks()
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
        res.body()!!
    }

    suspend fun createTask(req: TaskRequest) = runCatching {
        val res = api.createTask(req)
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
        res.body()!!
    }

    suspend fun updateTask(id: String, req: TaskRequest) = runCatching {
        val res = api.updateTask(id, req)
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
        res.body()!!
    }

    // ---------- Camions & Missions ----------
    suspend fun getTrucks() = runCatching {
        val res = api.getTrucks()
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
        res.body()!!
    }

    suspend fun getTrips() = runCatching {
        val res = api.getTrips()
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
        res.body()!!
    }

    suspend fun createTrip(req: TripRequest) = runCatching {
        val res = api.createTrip(req)
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
        res.body()!!
    }

    suspend fun completeTrip(id: String) = runCatching {
        val res = api.completeTrip(id)
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
        res.body()!!
    }

    // ---------- Factures ----------
    suspend fun getInvoices() = runCatching {
        val res = api.getInvoices()
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
        res.body()!!
    }

    suspend fun payInvoice(id: String, montant: Double, mode: String?) = runCatching {
        val res = api.payInvoice(id, InvoicePaymentRequest(montant, mode))
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
    }

    // ---------- Notifications ----------
    suspend fun getNotifications() = runCatching {
        val res = api.getNotifications()
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
        res.body()!!
    }

    // ---------- Rapport mensuel ----------
    suspend fun getMonthlyCounter() = runCatching {
        val res = api.getMonthlyCounter()
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
        res.body()!!
    }

    suspend fun getMonthlyCounters() = runCatching {
        val res = api.getMonthlyCounters()
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
        res.body()!!
    }

    suspend fun getMonthlyJournal() = runCatching {
        val res = api.getMonthlyJournal()
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
        res.body()!!
    }

    suspend fun sendInvoicePdf(id: String) = runCatching {
        val res = api.sendInvoicePdf(id)
        if (!res.isSuccessful) throw ApiException(res.errorMessage()!!)
    }
}

class ApiException(message: String) : Exception(message)
