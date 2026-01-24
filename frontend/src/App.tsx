import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { LoginPage } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { AppLayout } from './components/layout/AppLayout';
import { ProductsPage } from './pages/Products';
import { ProductDetail } from './pages/ProductDetail';
import { BOMPage } from './pages/BOMs';
import { BOMDetail } from './pages/BOMDetail';
import { ECOPage } from './pages/ECOs';
import { ECODetail } from './pages/ECODetail';
import { SettingsPage } from './pages/Settings';
import { Signup } from './pages/Signup';
import { UsersPage } from './pages/Users';
import { ReportsPage } from './pages/Reports';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center bg-background text-zinc-500">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Routes with Layout */}
            <Route element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/boms" element={<BOMPage />} />
              <Route path="/boms/:id" element={<BOMDetail />} />
              <Route path="/ecos" element={<ECOPage />} />
              <Route path="/ecos/:id" element={<ECODetail />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/users" element={<UsersPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
