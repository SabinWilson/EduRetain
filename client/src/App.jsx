import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import StudentDetailPage from './pages/StudentDetailPage';
import AlertsPage from './pages/AlertsPage';
import InterventionsPage from './pages/InterventionsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminImportPage from './pages/AdminImportPage';
import AdminMetricsPage from './pages/AdminMetricsPage';
import StudentPortalPage from './pages/StudentPortalPage';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Validating credentials...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If student tries accessing mentor routes, redirect to student portal
    if (user.role === 'student') {
      return <Navigate to="/portal" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (user) {
    const destination = location.state?.from?.pathname || (user.role === 'student' ? '/portal' : '/dashboard');
    return <Navigate to={destination} replace />;
  }

  return children;
};

const Layout = ({ children }) => {
  return (
    <div className="rm-root">
      <Navbar />
      <Toast />
      <main className="rm-page-container">
        {children}
      </main>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicOnlyRoute>
                  <RegisterPage />
                </PublicOnlyRoute>
              }
            />


            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <RootRedirect />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin', 'mentor']}>
                  <Layout>
                    <DashboardPage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/students/:id"
              element={
                <ProtectedRoute allowedRoles={['admin', 'mentor', 'student']}>
                  <Layout>
                    <StudentDetailPage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/alerts"
              element={
                <ProtectedRoute allowedRoles={['admin', 'mentor']}>
                  <Layout>
                    <AlertsPage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/interventions"
              element={
                <ProtectedRoute allowedRoles={['admin', 'mentor']}>
                  <Layout>
                    <InterventionsPage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminUsersPage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/import"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminImportPage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/metrics"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminMetricsPage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/portal"
              element={
                <ProtectedRoute allowedRoles={['student', 'admin', 'mentor']}>
                  <Layout>
                    <StudentPortalPage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

const RootRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'student') {
    return <Navigate to="/portal" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

export default App;
