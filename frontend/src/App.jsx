import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth, homeFor } from './context/AuthContext.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import AdminOverview from './pages/admin/AdminOverview.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import AdminAccounts from './pages/admin/AdminAccounts.jsx';
import AdminPermissions from './pages/admin/AdminPermissions.jsx';
import AdminActivity from './pages/admin/AdminActivity.jsx';
import ManagerOverview from './pages/manager/ManagerOverview.jsx';
import ManagerNew from './pages/manager/ManagerNew.jsx';
import ManagerEmployees from './pages/manager/ManagerEmployees.jsx';
import EmployeeProfile from './pages/manager/EmployeeProfile.jsx';
import ManagerTempAccess from './pages/manager/ManagerTempAccess.jsx';
import CustomersPage from './pages/shared/CustomersPage.jsx';
import GroupsPage from './pages/shared/GroupsPage.jsx';
import ChatsPage from './pages/shared/ChatsPage.jsx';
import NotificationsPage from './pages/shared/NotificationsPage.jsx';
import SettingsPage from './pages/shared/SettingsPage.jsx';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="boot-screen"><div className="spinner spinner-lg" /></div>;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={homeFor(user.role)} replace /> : <LoginPage />} />

      {/* ADMIN */}
      <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AppLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/admin/overview" replace />} />
        <Route path="overview" element={<AdminOverview />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="platforms" element={<AdminAccounts />} />
        <Route path="permissions" element={<AdminPermissions />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="groups" element={<GroupsPage />} />
        <Route path="chats" element={<ChatsPage />} />
        <Route path="activity" element={<AdminActivity />} />
        <Route path="employees/:id" element={<EmployeeProfile />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* MANAGER */}
      <Route path="/manager" element={<ProtectedRoute roles={['MANAGER']}><AppLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/manager/overview" replace />} />
        <Route path="overview" element={<ManagerOverview />} />
        <Route path="new" element={<ManagerNew />} />
        <Route path="employees" element={<ManagerEmployees />} />
        <Route path="employees/:id" element={<EmployeeProfile />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="groups" element={<GroupsPage />} />
        <Route path="chats" element={<ChatsPage />} />
        <Route path="temp-access" element={<ManagerTempAccess />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* EMPLOYEE */}
      <Route path="/employee" element={<ProtectedRoute roles={['EMPLOYEE']}><AppLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/employee/chats" replace />} />
        <Route path="chats" element={<ChatsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="/" element={<Navigate to={user ? homeFor(user.role) : '/login'} replace />} />
      <Route path="*" element={<Navigate to={user ? homeFor(user.role) : '/login'} replace />} />
    </Routes>
  );
}
