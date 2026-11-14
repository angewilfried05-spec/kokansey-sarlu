import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import SpeculationsPage from './pages/SpeculationsPage';
import EmployeesPage from './pages/EmployeesPage';
import TrucksPage from './pages/TrucksPage';
import AccountsPage from './pages/AccountsPage';
import ReportsPage from './pages/ReportsPage';
import OperationsPage from './pages/OperationsPage';
import StockPage from './pages/StockPage';
import UserManagementPage from './pages/UserManagementPage';
import AuditLogsPage from './pages/AuditLogsPage';
import NotificationsPage from './pages/NotificationsPage';
import TasksPage from './pages/TasksPage';
import ClientAccountsPage from './pages/ClientAccountsPage';
import InvoicesPage from './pages/InvoicesPage';
import MonthlyReportPage from './pages/MonthlyReportPage';

function isAdmin(): boolean {
  try {
    const raw = localStorage.getItem("user");
    return Boolean(raw && JSON.parse(raw).role === "ADMIN");
  } catch { return false; }
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  return isAdmin() ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-8 text-center">
      <p className="text-7xl font-black text-green-700 mb-4">404</p>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Page introuvable</h1>
      <p className="text-gray-500 mb-6">Cette page n'existe pas ou vous n'y avez pas accès.</p>
      <Link to="/dashboard" className="px-6 py-3 bg-green-700 text-white rounded-2xl font-bold hover:bg-green-800 transition">
        Retour au tableau de bord
      </Link>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="operations" element={<OperationsPage />} />
          <Route path="speculations" element={<SpeculationsPage />} />
          <Route path="stock" element={<StockPage />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="trucks" element={<TrucksPage />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="client-accounts" element={<ClientAccountsPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="users" element={<AdminRoute><UserManagementPage /></AdminRoute>} />
          <Route path="audit" element={<AdminRoute><AuditLogsPage /></AdminRoute>} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="monthly" element={<MonthlyReportPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;
