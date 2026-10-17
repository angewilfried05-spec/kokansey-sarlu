package com.kokansey.app.vm

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kokansey.app.data.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

fun todayIso(): String =
    SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())

data class ListState<T>(
    val loading: Boolean = true,
    val items: List<T> = emptyList(),
    val error: String? = null,
    val saving: Boolean = false,
    val saveSuccess: Boolean = false
)

open class BaseListViewModel<T>(private val repo: Repository) : ViewModel() {
    protected val _state = MutableStateFlow(ListState<T>())
    val state: StateFlow<ListState<T>> = _state

    protected fun runSave(block: suspend () -> Result<*>) {
        viewModelScope.launch {
            _state.value = _state.value.copy(saving = true, error = null, saveSuccess = false)
            block()
                .onSuccess { _state.value = _state.value.copy(saving = false, saveSuccess = true) }
                .onFailure { e -> _state.value = _state.value.copy(saving = false, error = e.message) }
        }
    }

    fun consumeSaveSuccess() {
        _state.value = _state.value.copy(saveSuccess = false)
    }

    fun clearError() {
        _state.value = _state.value.copy(error = null)
    }

    protected fun setLoaded(items: List<T>) {
        _state.value = _state.value.copy(loading = false, items = items)
    }

    protected fun setError(e: Throwable) {
        _state.value = _state.value.copy(loading = false, error = e.message)
    }
}

class DashboardViewModel(private val repo: Repository) : ViewModel() {
    private val _summary = MutableStateFlow<DashboardSummary?>(null)
    val summary: StateFlow<DashboardSummary?> = _summary
    private val _loading = MutableStateFlow(true)
    val loading: StateFlow<Boolean> = _loading
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    fun refresh() {
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            repo.getSummary()
                .onSuccess { _summary.value = it }
                .onFailure { _error.value = it.message }
            _loading.value = false
        }
    }
}

class SpeculationViewModel(private val repo: Repository) : ViewModel() {
    private val _speculations = MutableStateFlow<List<Speculation>>(emptyList())
    val speculations: StateFlow<List<Speculation>> = _speculations
    private var loaded = false

    fun load() {
        if (loaded) return
        loaded = true
        viewModelScope.launch {
            repo.getSpeculations().onSuccess { _speculations.value = it }
        }
    }
}

class SalesViewModel(private val repo: Repository) : BaseListViewModel<Sale>(repo) {
    fun refresh() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true)
            repo.getSales().onSuccess(::setLoaded).onFailure(::setError)
        }
    }

    fun create(req: SaleRequest) = runSave { repo.createSale(req).also { it.onSuccess { refresh() } } }

    fun delete(id: String) = runSave { repo.deleteSale(id).also { it.onSuccess { refresh() } } }
}

class StockViewModel(private val repo: Repository) : BaseListViewModel<Stock>(repo) {
    fun refresh() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true)
            repo.getStocks().onSuccess(::setLoaded).onFailure(::setError)
        }
    }

    fun create(req: StockRequest) = runSave { repo.createStock(req).also { it.onSuccess { refresh() } } }

    fun addMovement(stockId: String, type: String, quantity: Double, reason: String?) =
        runSave {
            repo.createStockMovement(stockId, StockMovementRequest(type, quantity, todayIso(), reason))
                .also { it.onSuccess { refresh() } }
        }
}

class ClientsViewModel(private val repo: Repository) : BaseListViewModel<Client>(repo) {
    fun refresh() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true)
            repo.getClients().onSuccess(::setLoaded).onFailure(::setError)
        }
    }

    fun create(req: ClientRequest) = runSave { repo.createClient(req).also { it.onSuccess { refresh() } } }

    fun addOperation(clientId: String, type: String, montant: Double, mode: String?, description: String?) =
        runSave {
            repo.createClientOperation(
                clientId,
                ClientOperationRequest(type, montant, description, null, mode, todayIso())
            ).also { it.onSuccess { refresh() } }
        }
}

class HarvestsViewModel(private val repo: Repository) : BaseListViewModel<Harvest>(repo) {
    fun refresh() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true)
            repo.getHarvests().onSuccess(::setLoaded).onFailure(::setError)
        }
    }

    fun create(req: HarvestRequest) = runSave { repo.createHarvest(req).also { it.onSuccess { refresh() } } }

    fun delete(id: String) = runSave { repo.deleteHarvest(id).also { it.onSuccess { refresh() } } }
}
