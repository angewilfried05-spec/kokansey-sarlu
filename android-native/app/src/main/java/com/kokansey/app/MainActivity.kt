package com.kokansey.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import com.kokansey.app.data.Repository
import com.kokansey.app.data.SessionManager
import com.kokansey.app.ui.screens.*
import com.kokansey.app.ui.theme.KokanseyGreen
import com.kokansey.app.ui.theme.KokanseyTheme
import com.kokansey.app.vm.*

class MainActivity : ComponentActivity() {

    private lateinit var session: SessionManager
    private lateinit var repo: Repository
    private lateinit var authVm: AuthViewModel
    private lateinit var dashboardVm: DashboardViewModel
    private lateinit var specVm: SpeculationViewModel
    private lateinit var salesVm: SalesViewModel
    private lateinit var stockVm: StockViewModel
    private lateinit var clientsVm: ClientsViewModel
    private lateinit var harvestsVm: HarvestsViewModel
    private lateinit var opsVm: OpsViewModel
    private lateinit var hrFleetVm: HrFleetViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        session = SessionManager(applicationContext)
        repo = Repository(session, BuildConfig.BASE_URL)
        authVm = AuthViewModel(repo)
        dashboardVm = DashboardViewModel(repo)
        specVm = SpeculationViewModel(repo)
        salesVm = SalesViewModel(repo)
        stockVm = StockViewModel(repo)
        clientsVm = ClientsViewModel(repo)
        harvestsVm = HarvestsViewModel(repo)
        opsVm = OpsViewModel(repo)
        hrFleetVm = HrFleetViewModel(repo)

        setContent {
            KokanseyTheme {
                Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    App(
                        authVm, dashboardVm, specVm, salesVm, stockVm,
                        clientsVm, harvestsVm, opsVm, hrFleetVm
                    )
                }
            }
        }
    }
}

private enum class Tab(val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector) {
    HOME("Accueil", Icons.Filled.Home),
    SALES("Ventes", Icons.Filled.ShoppingCart),
    STOCK("Stock", Icons.Filled.List),
    MENU("Menu", Icons.Filled.Menu)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun App(
    authVm: AuthViewModel,
    dashboardVm: DashboardViewModel,
    specVm: SpeculationViewModel,
    salesVm: SalesViewModel,
    stockVm: StockViewModel,
    clientsVm: ClientsViewModel,
    harvestsVm: HarvestsViewModel,
    opsVm: OpsViewModel,
    hrFleetVm: HrFleetViewModel
) {
    val auth by authVm.state.collectAsState()
    val opsState by opsVm.state.collectAsState()
    var currentTab by remember { mutableStateOf(Tab.HOME) }
    var module by remember { mutableStateOf<AppModule?>(null) }

    if (auth.user == null) {
        LoginScreen(authVm)
        return
    }

    val isAdmin = auth.user?.role == "ADMIN"
    val notifCount = opsState.notifications.size

    LaunchedEffect(auth.user) {
        opsVm.load()
    }

    BackHandler(enabled = module != null) {
        module = null
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                navigationIcon = {
                    if (module != null) {
                        IconButton(onClick = { module = null }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "Retour",
                                tint = Color.White)
                        }
                    }
                },
                title = {
                    Text(
                        module?.label ?: "KOKANSEY SARLU",
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.titleMedium
                    )
                },
                actions = {
                    IconButton(onClick = { module = AppModule.NOTIFICATIONS }) {
                        BadgedBox(badge = {
                            if (notifCount > 0) Badge { Text("$notifCount") }
                        }) {
                            Icon(Icons.Outlined.Notifications, "Notifications",
                                tint = Color.White)
                        }
                    }
                    IconButton(onClick = { authVm.logout() }) {
                        Icon(Icons.AutoMirrored.Filled.ExitToApp, "Déconnexion")
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = KokanseyGreen,
                    titleContentColor = Color.White,
                    actionIconContentColor = Color.White
                )
            )
        },
        bottomBar = {
            NavigationBar {
                Tab.values().forEach { tab ->
                    NavigationBarItem(
                        selected = module == null && currentTab == tab,
                        onClick = {
                            module = null
                            currentTab = tab
                        },
                        icon = { Icon(tab.icon, contentDescription = tab.label) },
                        label = { Text(tab.label, style = MaterialTheme.typography.labelSmall) }
                    )
                }
            }
        }
    ) { padding ->
        Box(Modifier.padding(padding)) {
            if (module != null) {
                when (module!!) {
                    AppModule.CLIENTS -> ClientsScreen(clientsVm)
                    AppModule.HARVESTS -> HarvestsScreen(harvestsVm, specVm, isAdmin)
                    AppModule.EXPENSES -> ExpensesScreen(opsVm, isAdmin)
                    AppModule.HR -> HrScreen(hrFleetVm, isAdmin)
                    AppModule.FLEET -> FleetScreen(hrFleetVm)
                    AppModule.INVOICES -> InvoicesScreen(opsVm)
                    AppModule.REPORT -> ReportScreen(opsVm)
                    AppModule.NOTIFICATIONS -> NotificationsScreen(opsVm)
                }
            } else {
                when (currentTab) {
                    Tab.HOME -> DashboardScreen(dashboardVm, auth.user?.name ?: auth.user?.username)
                    Tab.SALES -> SalesScreen(salesVm, specVm, isAdmin)
                    Tab.STOCK -> StockScreen(stockVm)
                    Tab.MENU -> MenuScreen(notifCount) { module = it }
                }
            }
        }
    }
}
