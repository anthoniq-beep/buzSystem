import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CustomerList from './pages/CustomerList';
import CustomerDetail from './pages/CustomerDetail';
import CommissionPage from './pages/CommissionPage';
import ContractPage from './pages/ContractPage';
import TrainingPage from './pages/TrainingPage';
import AdminDashboard from './pages/AdminDashboard';
import OrganizationPage from './pages/admin/OrganizationPage';
import SalesTargetPage from './pages/admin/SalesTargetPage';
import SystemSettingsPage from './pages/admin/SystemSettingsPage';
import ChannelPage from './pages/admin/ChannelPage';
import PaymentApprovalPage from './pages/admin/PaymentApprovalPage';
import MainLayout from './components/MainLayout';
import { useAuth } from './context/AuthContext';
import { Role } from './types';
import { JSX } from 'react'; // Import JSX namespace if needed, or rely on React

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const RoleRoute = ({ children, roles }: { children: JSX.Element, roles: Role[] }) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!user || !roles.includes(user.role)) return <Navigate to="/dashboard" />;
  return children;
};

const TrainingDeptOrAdminRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!user) return <Navigate to="/dashboard" />;
  
  const isTrainingDept = user.department?.name === '教培部';
  const isAdmin = user.role === Role.ADMIN;
  
  if (!isTrainingDept && !isAdmin) return <Navigate to="/dashboard" />;
  
  return children;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="customers" element={<CustomerList />} />
        <Route path="customer/:id" element={<CustomerDetail />} />
        <Route path="commission" element={<CommissionPage />} />
        <Route path="contract" element={<ContractPage />} />
        <Route path="training" element={<TrainingPage />} />
        
        {/* Role Based Routes */}
        <Route path="admin/dashboard" element={<RoleRoute roles={[Role.ADMIN, Role.MANAGER, Role.SUPERVISOR]}><AdminDashboard /></RoleRoute>} />
        <Route path="admin/organization" element={<RoleRoute roles={[Role.ADMIN, Role.HR]}><OrganizationPage /></RoleRoute>} />
        <Route path="admin/targets" element={<RoleRoute roles={[Role.ADMIN]}><SalesTargetPage /></RoleRoute>} />
        <Route path="admin/settings" element={<TrainingDeptOrAdminRoute><SystemSettingsPage /></TrainingDeptOrAdminRoute>} />
        <Route path="admin/channel" element={<RoleRoute roles={[Role.ADMIN, Role.MANAGER]}><ChannelPage /></RoleRoute>} />
        <Route path="admin/payment" element={<RoleRoute roles={[Role.ADMIN, Role.FINANCE]}><PaymentApprovalPage /></RoleRoute>} />
      </Route>
    </Routes>
  );
}

export default App;
