import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import RestaurantPage from './pages/restaurant/RestaurantPage';
import SupermarchePage from './pages/supermarche/SupermarchePage';
import CuisinePage from './pages/cuisine/CuisinePage';
import AdminDashboard from './pages/admin/AdminDashboard';
import ProduitsPage from './pages/admin/ProduitsPage';
import SortiePage from './pages/admin/SortiePage';
import { Spinner } from './components/ui';

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner size={36} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={user.role === 'cuisine' ? '/cuisine' : user.role === 'admin' ? '/admin' : '/restaurant'} replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/restaurant" element={<PrivateRoute roles={['client', 'admin']}><RestaurantPage /></PrivateRoute>} />
      <Route path="/supermarche" element={<PrivateRoute roles={['client', 'admin']}><SupermarchePage /></PrivateRoute>} />
      <Route path="/cuisine" element={<PrivateRoute roles={['cuisine', 'admin']}><CuisinePage /></PrivateRoute>} />
      <Route path="/admin" element={<PrivateRoute roles={['admin']}><AdminDashboard /></PrivateRoute>} />
      <Route path="/admin/produits" element={<PrivateRoute roles={['admin']}><ProduitsPage /></PrivateRoute>} />
      <Route path="/admin/sortie" element={<PrivateRoute roles={['admin']}><SortiePage /></PrivateRoute>} />
      <Route path="/" element={<Navigate to="/restaurant" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
