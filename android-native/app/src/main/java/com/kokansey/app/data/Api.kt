package com.kokansey.app.data

import retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import java.util.concurrent.TimeUnit

interface KokanseyApi {

    @POST("api/auth/login")
    suspend fun login(@Body body: LoginRequest): Response<LoginResponse>

    @GET("api/reports/summary")
    suspend fun getSummary(): Response<DashboardSummary>

    @GET("api/speculations")
    suspend fun getSpeculations(): Response<List<Speculation>>

    @GET("api/sales")
    suspend fun getSales(): Response<List<Sale>>

    @POST("api/sales")
    suspend fun createSale(@Body body: SaleRequest): Response<Unit>

    @GET("api/stocks")
    suspend fun getStocks(): Response<List<Stock>>

    @POST("api/stocks")
    suspend fun createStock(@Body body: StockRequest): Response<Stock>

    @GET("api/stocks/movements")
    suspend fun getStockMovements(): Response<List<StockMovement>>

    @POST("api/stocks/{id}/movements")
    suspend fun createStockMovement(@Path("id") stockId: String, @Body body: StockMovementRequest): Response<Unit>

    @GET("api/clients")
    suspend fun getClients(): Response<List<Client>>

    @POST("api/clients")
    suspend fun createClient(@Body body: ClientRequest): Response<Client>

    @POST("api/clients/{id}/operations")
    suspend fun createClientOperation(@Path("id") clientId: String, @Body body: ClientOperationRequest): Response<Unit>

    @GET("api/harvests")
    suspend fun getHarvests(): Response<List<Harvest>>

    @POST("api/harvests")
    suspend fun createHarvest(@Body body: HarvestRequest): Response<Unit>
}

object ApiClient {
    private val json = Json { ignoreUnknownKeys = true; coerceInputValues = true }

    fun create(baseUrl: String, tokenProvider: () -> String?): KokanseyApi {
        val client = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .addInterceptor { chain ->
                val token = tokenProvider()
                val request = if (token != null) {
                    chain.request().newBuilder()
                        .addHeader("Authorization", "Bearer $token")
                        .build()
                } else chain.request()
                chain.proceed(request)
            }
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.NONE
            })
            .build()

        return Retrofit.Builder()
            .baseUrl(if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/")
            .client(client)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(KokanseyApi::class.java)
    }
}
