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
}

class ApiException(message: String) : Exception(message)
