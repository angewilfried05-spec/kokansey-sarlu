import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
          <Route path="users" element={<UserManagementPage />} />
          <Route path="audit" element={<AuditLogsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="monthly" element={<MonthlyReportPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
