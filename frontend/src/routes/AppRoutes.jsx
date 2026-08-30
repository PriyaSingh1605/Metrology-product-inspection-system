import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import NewInspection from '../pages/NewInspection';
import InspectionHistory from '../pages/InspectionHistory';
import InspectionDetails from '../pages/InspectionDetails';
import LegalGuide from '../pages/LegalGuide';
import Layout from '../components/Layout';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
