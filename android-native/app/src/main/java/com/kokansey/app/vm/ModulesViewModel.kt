package com.kokansey.app.vm

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kokansey.app.data.*
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class OpsUiState(
    val expenses: List<Expense> = emptyList(),
    val invoices: List<Invoice> = emptyList(),
    val notifications: List<AppNotification> = emptyList(),
    val speculations: List<Speculation> = emptyList(),
    val counter: MonthlyCounter? = null,
    val counters: List<MonthlyCounter> = emptyList(),
    val journal: List<JournalEntry> = emptyList(),
    val loading: Boolean = true,
    val saving: Boolean = false,
    val error: String? = null
)

data class HrFleetUiState(
    val employees: List<Employee> = emptyList(),
    val tasks: List<TaskDto> = emptyList(),
    val trucks: List<Truck> = emptyList(),
    val trips: List<Trip> = emptyList(),
    val loading: Boolean = true,
    val saving: Boolean = false,
    val error: String? = null
)

class OpsViewModel(private val repo: Repository) : ViewModel() {
    private val _state = MutableStateFlow(OpsUiState())
    val state: StateFlow<OpsUiState> = _state

    fun load() {
        viewModelScope.launch {
            val expenses = async { repo.getExpenses() }
            val invoices = async { repo.getInvoices() }
            val notifs = async { repo.getNotifications() }
            val specs = async { repo.getSpeculations() }
            val counter = async { repo.getMonthlyCounter() }
            val counters = async { repo.getMonthlyCounters() }
            val journal = async { repo.getMonthlyJournal() }
            _state.value = _state.value.copy(
                expenses = expenses.await().getOrDefault(emptyList()),
                invoices = invoices.await().getOrDefault(emptyList()),
                notifications = notifs.await().getOrDefault(emptyList()),
                speculations = specs.await().getOrDefault(emptyList()),
                counter = counter.await().getOrNull(),
                counters = counters.await().getOrDefault(emptyList()),
                journal = journal.await().getOrDefault(emptyList()),
                loading = false,
                error = null
            )
        }
    }

    fun createExpense(req: ExpenseRequest, onDone: (Boolean, String?) -> Unit) {
        runSaving(onDone) { repo.createExpense(req); load() }
    }

    fun deleteExpense(id: String, onDone: (Boolean, String?) -> Unit) {
        runSaving(onDone) { repo.deleteExpense(id); load() }
    }

    fun payInvoice(id: String, montant: Double, mode: String?, onDone: (Boolean, String?) -> Unit) {
        runSaving(onDone) { repo.payInvoice(id, montant, mode); load() }
    }

    fun updateExpense(id: String, req: ExpenseRequest, onDone: (Boolean, String?) -> Unit) {
        runSaving(onDone) { repo.updateExpense(id, req); load() }
    }

    fun sendInvoicePdf(id: String, onDone: (Boolean, String?) -> Unit) {
        runSaving(onDone) { repo.sendInvoicePdf(id); load() }
    }

    private fun runSaving(onDone: (Boolean, String?) -> Unit, block: suspend () -> Unit) {
        viewModelScope.launch {
            _state.value = _state.value.copy(saving = true)
            val r = runCatching { block() }
            _state.value = _state.value.copy(saving = false)
            r.fold({ onDone(true, null) }, { onDone(false, it.message) })
        }
    }
}

class HrFleetViewModel(private val repo: Repository) : ViewModel() {
    private val _state = MutableStateFlow(HrFleetUiState())
    val state: StateFlow<HrFleetUiState> = _state

    fun load() {
        viewModelScope.launch {
            val employees = async { repo.getEmployees() }
            val tasks = async { repo.getTasks() }
            val trucks = async { repo.getTrucks() }
            val trips = async { repo.getTrips() }
            _state.value = _state.value.copy(
                employees = employees.await().getOrDefault(emptyList()),
                tasks = tasks.await().getOrDefault(emptyList()),
                trucks = trucks.await().getOrDefault(emptyList()),
                trips = trips.await().getOrDefault(emptyList()),
                loading = false,
                error = null
            )
        }
    }

    fun createEmployee(req: EmployeeRequest, onDone: (Boolean, String?) -> Unit) {
        runSaving(onDone) { repo.createEmployee(req); load() }
    }

    fun createTask(req: TaskRequest, onDone: (Boolean, String?) -> Unit) {
        runSaving(onDone) { repo.createTask(req); load() }
    }

    fun completeTask(task: TaskDto, onDone: (Boolean, String?) -> Unit) {
        val req = TaskRequest(
            title = task.title,
            description = task.description,
            status = "COMPLETED",
            priority = task.priority,
            dueDate = task.dueDate,
            assignedToId = task.assignedTo?.id ?: "",
            truckId = task.truck?.id
        )
        runSaving(onDone) { repo.updateTask(task.id, req); load() }
    }

    fun deleteTask(id: String, onDone: (Boolean, String?) -> Unit) {
        runSaving(onDone) { repo.deleteTask(id); load() }
    }

    fun createTrip(req: TripRequest, onDone: (Boolean, String?) -> Unit) {
        runSaving(onDone) { repo.createTrip(req); load() }
    }

    fun completeTrip(id: String, onDone: (Boolean, String?) -> Unit) {
        runSaving(onDone) { repo.completeTrip(id); load() }
    }

    private fun runSaving(onDone: (Boolean, String?) -> Unit, block: suspend () -> Unit) {
        viewModelScope.launch {
            _state.value = _state.value.copy(saving = true)
            val r = runCatching { block() }
            _state.value = _state.value.copy(saving = false)
            r.fold({ onDone(true, null) }, { onDone(false, it.message) })
        }
    }
}

// ViewModels instanciés manuellement dans MainActivity (même convention que les autres VM)
