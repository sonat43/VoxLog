import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import FacultyDashboard from './pages/FacultyDashboard';
import LoadingScreen from './components/LoadingScreen';
import FeaturePlaceholder from './components/FeaturePlaceholder';
import UserProfile from './pages/UserProfile';
import './App.css';

// Admin Components
import AdminLayout from './layouts/AdminLayout';
import DashboardOverview from './pages/admin/DashboardOverview';
import UserManagement from './pages/admin/UserManagement';
import Reports from './pages/admin/Reports';
import Departments from './pages/admin/academic/Departments';
import Courses from './pages/admin/academic/Courses';
import Semesters from './pages/admin/academic/Semesters';
import Subjects from './pages/admin/academic/Subjects';
import FacultyAssignments from './pages/admin/academic/FacultyAssignments';
import Seeder from './pages/admin/academic/Seeder';

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/" />;
  }

  if (requiredRole && role !== requiredRole) {
    return <div className="error-message">Access Denied: Isufficient Privileges.</div>;
  }

  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LoginPage />} />

          {/* Admin Dashboard Routes */}
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<DashboardOverview />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="reports" element={<Reports />} />
            {/* Academic Management Routes */}
            <Route path="departments" element={<Departments />} />
            <Route path="academic-courses" element={<Courses />} />
            <Route path="semesters" element={<Semesters />} />
            <Route path="subjects" element={<Subjects />} />
            <Route path="assignments" element={<FacultyAssignments />} />
            <Route path="seed" element={<Seeder />} />
            <Route path="*" element={<div style={{ padding: '2rem', color: 'white' }}>Page Under Construction</div>} />
          </Route>

          {/* Faculty Dashboard Routes */}
          {/* Faculty Dashboard Routes */}
          <Route path="/faculty/dashboard" element={
            <ProtectedRoute requiredRole="faculty">
              <FacultyDashboard />
            </ProtectedRoute>
          }
          />
          <Route path="/faculty-dashboard" element={<Navigate to="/faculty/dashboard" replace />} /> {/* Legacy redirect */}

          {/* Faculty Placeholder Routes */}
          <Route path="/faculty/courses" element={<ProtectedRoute requiredRole="faculty"><FeaturePlaceholder title="My Courses" /></ProtectedRoute>} />
          <Route path="/faculty/attendance" element={<ProtectedRoute requiredRole="faculty"><FeaturePlaceholder title="Start Attendance" /></ProtectedRoute>} />
          <Route path="/faculty/history" element={<ProtectedRoute requiredRole="faculty"><FeaturePlaceholder title="Attendance History" /></ProtectedRoute>} />
          <Route path="/faculty/reports" element={<ProtectedRoute requiredRole="faculty"><FeaturePlaceholder title="Reports" /></ProtectedRoute>} />
          <Route path="/faculty/profile" element={<ProtectedRoute requiredRole="faculty"><UserProfile /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
