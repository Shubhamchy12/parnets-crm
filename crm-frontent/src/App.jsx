import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/auth/Login';
import RoleProtectedRoute from './components/auth/RoleProtectedRoute';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Projects from './pages/Projects';
import ActivityLogs from './pages/ActivityLogs';
import Attendance from './pages/Attendance';
import Clients from './pages/Clients';
import Payments from './pages/Payments';
import Procurement from './pages/Procurement';
import Invoices from './pages/Invoices';
import AMC from './pages/AMC';
import SupportTickets from './pages/SupportTickets';
import Accounting from './pages/Accounting';
import './index.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-primary-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
};

// Public Route Component (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-primary-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }
  
  return user ? <Navigate to="/dashboard" /> : children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1f2937',
                color: '#fff',
              },
              success: {
                style: {
                  background: '#2563eb',
                  color: '#fff',
                },
              },
              error: {
                style: {
                  background: '#dc2626',
                  color: '#fff',
                },
              },
            }}
          />
          
          <Routes>
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" />} />
              <Route 
                path="dashboard" 
                element={
                  <RoleProtectedRoute requiredModule="dashboard">
                    <Dashboard />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="employees" 
                element={
                  <RoleProtectedRoute 
                    allowedRoles={['super_admin', 'admin']} 
                    requiredModule="employees"
                  >
                    <Employees />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="projects" 
                element={
                  <RoleProtectedRoute 
                    allowedRoles={['super_admin', 'admin', 'sub_admin', 'developer', 'sales', 'client']} 
                    requiredModule="projects"
                  >
                    <Projects />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="activity-logs" 
                element={
                  <RoleProtectedRoute 
                    allowedRoles={['super_admin']} 
                    requiredModule="activity_logs"
                  >
                    <ActivityLogs />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="attendance" 
                element={
                  <RoleProtectedRoute 
                    allowedRoles={['super_admin', 'admin', 'sub_admin', 'employee']} 
                    requiredModule="attendance"
                  >
                    <Attendance />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="clients" 
                element={
                  <RoleProtectedRoute 
                    allowedRoles={['super_admin', 'admin', 'sub_admin', 'sales']} 
                    requiredModule="clients"
                  >
                    <Clients />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="payments" 
                element={
                  <RoleProtectedRoute 
                    allowedRoles={['super_admin', 'admin', 'accounts_manager']} 
                    requiredModule="payments"
                  >
                    <Payments />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="procurement" 
                element={
                  <RoleProtectedRoute 
                    allowedRoles={['super_admin', 'admin']} 
                    requiredModule="procurement"
                  >
                    <Procurement />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="invoices" 
                element={
                  <RoleProtectedRoute 
                    allowedRoles={['super_admin', 'admin', 'accounts_manager', 'sales', 'client']} 
                    requiredModule="invoices"
                  >
                    <Invoices />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="amc" 
                element={
                  <RoleProtectedRoute 
                    allowedRoles={['super_admin', 'admin']} 
                    requiredModule="amc"
                  >
                    <AMC />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="support" 
                element={
                  <RoleProtectedRoute 
                    allowedRoles={['super_admin', 'admin', 'sub_admin', 'support_executive', 'client']} 
                    requiredModule="support"
                  >
                    <SupportTickets />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="accounting" 
                element={
                  <RoleProtectedRoute 
                    allowedRoles={['super_admin', 'admin', 'accounts_manager']} 
                    requiredModule="accounting"
                  >
                    <Accounting />
                  </RoleProtectedRoute>
                } 
              />
            </Route>
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
