import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import Layout from './components/layout/Layout';
import Login from './components/auth/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import FirstLogin from './pages/FirstLogin';
import Forbidden from './pages/Forbidden';

import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';

import Employees from './pages/Employees';
import EmployeeNew from './pages/EmployeeNew';
import EmployeeProfile from './pages/EmployeeProfile';
import EmployeeEdit from './pages/EmployeeEdit';
import EmployeeDocuments from './pages/EmployeeDocuments';
import FaceEnrolment from './pages/FaceEnrolment';

import AttendancePage from './pages/AttendancePage';
import AttendanceHistory from './pages/AttendanceHistory';
import AttendanceAdmin from './pages/AttendanceAdmin';
import AttendanceOverride from './pages/AttendanceOverride';

import Leaves from './pages/Leaves';
import LeaveApply from './pages/LeaveApply';
import LeaveTeam from './pages/LeaveTeam';

import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import AssignProject from './pages/AssignProject';
import MyProjects from './pages/MyProjects';
import Tasks from './pages/Tasks';
import Timelog from './pages/Timelog';
import Quotes from './pages/Quotes';
import QuoteBuilder from './pages/QuoteBuilder';
import QuoteDetail from './pages/QuoteDetail';
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import InvoiceBuilder from './pages/InvoiceBuilder';
import Contracts from './pages/Contracts';
import Tickets from './pages/Tickets';
import TicketDetail from './pages/TicketDetail';
import Chat from './pages/Chat';
import Reports from './pages/Reports';
import Documents from './pages/Documents';
import Settings from './pages/Settings';

import ActivityLogs from './pages/ActivityLogs';
import Payments from './pages/Payments';
import Procurement from './pages/Procurement';
import AMC from './pages/AMC';
import Accounting from './pages/Accounting';
import UserManagement from './pages/UserManagement';

import './index.css';

// Role constants — single source of truth
const ADMIN = ['admin', 'super_admin'];
const SALES = ['admin', 'super_admin', 'sales'];

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-3" />
      <p className="text-slate-500 text-sm">Loading...</p>
    </div>
  </div>
);

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) {
    const isEmployee = user.role === 'employee' || user.role === 'sales';
    return <Navigate to={isEmployee ? '/attendance' : '/dashboard'} />;
  }
  return children;
};

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/login" />;
};

const RoleRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/403" />;
  return children;
};

const RoleBasedHome = () => {
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee' || user?.role === 'sales';
  return <Navigate to={isEmployee ? '/attendance' : '/dashboard'} />;
};

// Attendance route: admins see all-employee view, employees see check-in page
const AttendanceRoute = () => {
  const { user } = useAuth();
  const isAdmin = ADMIN.includes(user?.role);
  return isAdmin ? <AttendanceAdmin /> : <AttendancePage />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" toastOptions={{
          duration: 4000,
          style: { background: '#1e293b', color: '#fff', borderRadius: '12px', fontSize: '14px' },
          success: { style: { background: '#4f46e5' } },
          error: { style: { background: '#dc2626' } },
        }} />

        <Routes>
          {/* Public */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
          <Route path="/403" element={<Forbidden />} />
          <Route path="/first-login" element={<PrivateRoute><FirstLogin /></PrivateRoute>} />

          {/* Private with layout */}
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<RoleBasedHome />} />

            {/* All authenticated users */}
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />
            <Route path="profile/documents" element={<EmployeeDocuments />} />

            {/* Attendance — employees see check-in page, admins see all-employee view */}
            <Route path="attendance" element={<AttendanceRoute />} />
            <Route path="attendance/history" element={<AttendanceHistory />} />
            <Route path="attendance/admin" element={<RoleRoute roles={ADMIN}><AttendanceAdmin /></RoleRoute>} />
            <Route path="attendance/admin/override/:id" element={<RoleRoute roles={ADMIN}><AttendanceOverride /></RoleRoute>} />

            {/* Leaves — all staff */}
            <Route path="leaves" element={<Leaves />} />
            <Route path="leaves/apply" element={<LeaveApply />} />
            <Route path="leaves/team" element={<RoleRoute roles={[...ADMIN, 'manager']}><LeaveTeam /></RoleRoute>} />

            {/* Projects — all staff (employees see assigned projects) */}
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="my-projects" element={<MyProjects />} />
            <Route path="assign-project" element={<RoleRoute roles={ADMIN}><AssignProject /></RoleRoute>} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="timelog" element={<Timelog />} />

            {/* Employees — admin full CRUD, sales view-only (handled in component) */}
            <Route path="employees" element={<RoleRoute roles={[...ADMIN, 'sales']}><Employees /></RoleRoute>} />
            <Route path="employees/new" element={<RoleRoute roles={ADMIN}><EmployeeNew /></RoleRoute>} />
            <Route path="employees/:id" element={<RoleRoute roles={[...ADMIN, 'sales']}><EmployeeProfile /></RoleRoute>} />
            <Route path="employees/:id/edit" element={<RoleRoute roles={ADMIN}><EmployeeEdit /></RoleRoute>} />
            <Route path="employees/:id/documents" element={<RoleRoute roles={ADMIN}><EmployeeDocuments /></RoleRoute>} />
            <Route path="employees/:id/enrol-face" element={<RoleRoute roles={ADMIN}><FaceEnrolment /></RoleRoute>} />

            {/* CRM — sales + admin */}
            <Route path="leads" element={<RoleRoute roles={SALES}><Leads /></RoleRoute>} />
            <Route path="leads/:id" element={<RoleRoute roles={SALES}><LeadDetail /></RoleRoute>} />
            <Route path="clients" element={<RoleRoute roles={SALES}><Clients /></RoleRoute>} />
            <Route path="clients/:id" element={<RoleRoute roles={SALES}><ClientDetail /></RoleRoute>} />
            <Route path="quotes" element={<RoleRoute roles={SALES}><Quotes /></RoleRoute>} />
            <Route path="quotes/new" element={<RoleRoute roles={SALES}><QuoteBuilder /></RoleRoute>} />
            <Route path="quotes/:id" element={<RoleRoute roles={SALES}><QuoteDetail /></RoleRoute>} />
            <Route path="invoices" element={<RoleRoute roles={SALES}><Invoices /></RoleRoute>} />
            <Route path="invoices/new" element={<RoleRoute roles={SALES}><InvoiceBuilder /></RoleRoute>} />
            <Route path="invoices/:id" element={<RoleRoute roles={SALES}><InvoiceDetail /></RoleRoute>} />
            <Route path="contracts" element={<RoleRoute roles={SALES}><Contracts /></RoleRoute>} />

            {/* Admin only */}
            <Route path="reports" element={<RoleRoute roles={ADMIN}><Reports /></RoleRoute>} />
            <Route path="payments" element={<RoleRoute roles={ADMIN}><Payments /></RoleRoute>} />
            <Route path="procurement" element={<RoleRoute roles={ADMIN}><Procurement /></RoleRoute>} />
            <Route path="amc" element={<RoleRoute roles={ADMIN}><AMC /></RoleRoute>} />
            <Route path="accounting" element={<RoleRoute roles={ADMIN}><Accounting /></RoleRoute>} />
            <Route path="user-management" element={<RoleRoute roles={ADMIN}><UserManagement /></RoleRoute>} />
            <Route path="activity-logs" element={<RoleRoute roles={['super_admin']}><ActivityLogs /></RoleRoute>} />
            <Route path="settings" element={<RoleRoute roles={ADMIN}><Settings /></RoleRoute>} />

            {/* Support — all staff */}
            <Route path="tickets" element={<Tickets />} />
            <Route path="tickets/:id" element={<TicketDetail />} />
            <Route path="chat" element={<Chat />} />
            <Route path="documents" element={<Documents />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
