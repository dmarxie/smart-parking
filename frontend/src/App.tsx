import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { HomePage, LoginPage, Register } from './pages';
import {
  AdminDashboard,
  AdminLocationsPage,
  AdminLoginPage,
  AdminReservationsPage,
  AdminUserManagementPage,
} from './pages/admin';
import { Dashboard } from './pages/basic-user';
import { AdminRoute, PrivateRoute } from './components';
import './styles/custom.scss';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/dashboard"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/locations"
                element={
                  <AdminRoute>
                    <AdminLocationsPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/reservations"
                element={
                  <AdminRoute>
                    <AdminReservationsPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <AdminRoute>
                    <AdminUserManagementPage />
                  </AdminRoute>
                }
              />
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
