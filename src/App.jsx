import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import FacultyDashboard from './pages/FacultyDashboard';
import LoadingScreen from './components/LoadingScreen';
import FeaturePlaceholder from './components/FeaturePlaceholder';
import UserProfile from './pages/UserProfile';
import FacultyCourses from './pages/faculty/FacultyCourses';
import FacultyReports from './pages/faculty/Reports';
import AcademicProgress from './pages/faculty/AcademicProgress';
import Gradebook from './pages/faculty/Gradebook';
import ResourceCenter from './pages/faculty/ResourceCenter';

import './App.css';

// Admin Components
import AdminLayout from './layouts/AdminLayout';
import DashboardOverview from './pages/admin/DashboardOverview';
import UserManagement from './pages/admin/UserManagement';
import AdminReports from './pages/admin/Reports';
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
            <Route path="reports" element={<AdminReports />} />
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
          <Route path="/faculty/dashboard" element={
            <ProtectedRoute requiredRole="faculty">
              <FacultyDashboard />
            </ProtectedRoute>
          }
          />
          <Route path="/faculty-dashboard" element={<Navigate to="/faculty/dashboard" replace />} /> {/* Legacy redirect */}

          {/* Faculty Routes */}
          <Route path="/faculty/courses" element={<ProtectedRoute requiredRole="faculty"><FacultyCourses /></ProtectedRoute>} />

          <Route path="/faculty/academic-progress" element={<ProtectedRoute requiredRole="faculty"><AcademicProgress /></ProtectedRoute>} />
          <Route path="/faculty/gradebook" element={<ProtectedRoute requiredRole="faculty"><Gradebook /></ProtectedRoute>} />
          <Route path="/faculty/resources" element={<ProtectedRoute requiredRole="faculty"><ResourceCenter /></ProtectedRoute>} />
          <Route path="/faculty/reports" element={<ProtectedRoute requiredRole="faculty"><FacultyReports /></ProtectedRoute>} />
          <Route path="/faculty/profile" element={<ProtectedRoute requiredRole="faculty"><UserProfile /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
