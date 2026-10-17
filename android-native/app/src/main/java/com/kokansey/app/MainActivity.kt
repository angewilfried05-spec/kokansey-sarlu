package com.kokansey.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
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

        setContent {
            KokanseyTheme {
                Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    App(authVm, dashboardVm, specVm, salesVm, stockVm, clientsVm, harvestsVm)
                }
            }
        }
    }
}

private enum class Tab(val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector) {
    HOME("Accueil", Icons.Filled.Home),
    SALES("Ventes", Icons.Filled.ShoppingCart),
    STOCK("Stock", Icons.Filled.List),
    CLIENTS("Clients", Icons.Filled.Person),
    HARVESTS("Récoltes", Icons.Filled.Star)
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
    harvestsVm: HarvestsViewModel
) {
    val auth by authVm.state.collectAsState()
    var currentTab by remember { mutableStateOf(Tab.HOME) }

    if (auth.user == null) {
        LoginScreen(authVm)
        return
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Text("KOKANSEY SARLU", fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.titleMedium)
                },
                actions = {
                    IconButton(onClick = { authVm.logout() }) {
                        Icon(Icons.AutoMirrored.Filled.ExitToApp, "Déconnexion")
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = KokanseyGreen,
                    titleContentColor = androidx.compose.ui.graphics.Color.White,
                    actionIconContentColor = androidx.compose.ui.graphics.Color.White
                )
            )
        },
        bottomBar = {
            NavigationBar {
                Tab.values().forEach { tab ->
                    NavigationBarItem(
                        selected = currentTab == tab,
                        onClick = { currentTab = tab },
                        icon = { Icon(tab.icon, contentDescription = tab.label) },
                        label = { Text(tab.label, style = MaterialTheme.typography.labelSmall) }
                    )
                }
            }
        }
    ) { padding ->
        androidx.compose.foundation.layout.Box(Modifier.padding(padding)) {
            when (currentTab) {
                Tab.HOME -> DashboardScreen(dashboardVm, auth.user?.name ?: auth.user?.username)
                Tab.SALES -> SalesScreen(salesVm, specVm)
                Tab.STOCK -> StockScreen(stockVm)
                Tab.CLIENTS -> ClientsScreen(clientsVm)
                Tab.HARVESTS -> HarvestsScreen(harvestsVm, specVm)
            }
        }
    }
}
