import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Login from '../pages/Login';
import Home from '../pages/Home';
import Profile from '../pages/Profile';
import Dashboard from '../pages/Dashboard';
import NewInspection from '../pages/NewInspection';
import InspectionHistory from '../pages/InspectionHistory';
import InspectionDetails from '../pages/InspectionDetails';
import LegalGuide from '../pages/LegalGuide';
import Layout from '../components/Layout';
import AdminLayout from '../components/AdminLayout';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminOfficers from '../pages/admin/AdminOfficers';
import AdminOfficerDetail from '../pages/admin/AdminOfficerDetail';
import AdminScans from '../pages/admin/AdminScans';
import AdminApprovals from '../pages/admin/AdminApprovals';
import AdminApprovalReview from '../pages/admin/AdminApprovalReview';

/** Redirect to /login if not authenticated */
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

/** Redirect to /login if not authenticated, or to /dashboard if not admin */
function AdminRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

export default function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/profile" element={<Profile />} />
      {/* Login — redirect already-authenticated users to the right place */}
      <Route path="/login" element={
        isAuthenticated
          ? <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />
          : <Login />
      } />

      {/* Officer routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="inspections/new" element={<NewInspection />} />
        <Route path="inspections" element={<InspectionHistory />} />
        <Route path="inspections/:id" element={<InspectionDetails />} />
        <Route path="guide" element={<LegalGuide />} />
      </Route>

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="officers" element={<AdminOfficers />} />
        <Route path="officers/:id" element={<AdminOfficerDetail />} />
        <Route path="scans" element={<AdminScans />} />
        <Route path="approvals" element={<AdminApprovals />} />
        <Route path="approvals/:id" element={<AdminApprovalReview />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to={
        isAuthenticated && user?.role === 'admin' ? '/admin' : '/'
      } replace />} />
    </Routes>
  );
}
