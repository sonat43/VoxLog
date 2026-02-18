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
import MyClass from './pages/faculty/MyClass';
import History from './pages/faculty/History';
import FacultyTimetables from './pages/faculty/FacultyTimetables';

import './App.css';

// Admin Components
import DashboardLayout from './layouts/DashboardLayout';
import AdminLayout from './layouts/AdminLayout';
import DashboardOverview from './pages/admin/DashboardOverview';
import UserManagement from './pages/admin/UserManagement';
import Departments from './pages/admin/academic/Departments';
import Courses from './pages/admin/academic/Courses';
import Semesters from './pages/admin/academic/Semesters';
import Subjects from './pages/admin/academic/Subjects';
import FacultyAssignments from './pages/admin/academic/FacultyAssignments';
import SettingsConfig from './pages/admin/SettingsConfig';
import Seeder from './pages/admin/academic/Seeder';
import Students from './pages/admin/academic/Students';
import Timetable from './pages/admin/academic/Timetable';
import AttendanceRecords from './pages/admin/academic/AttendanceRecords';

import ManualAttendance from './pages/admin/academic/ManualAttendance';
import LeaveApproval from './pages/admin/LeaveApproval';
import MasterAttendanceCalendar from './pages/admin/MasterAttendanceCalendar';
import LeaveManagement from './pages/faculty/LeaveManagement';
import SubstitutionPage from './pages/faculty/SubstitutionPage';


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
            {/* Academic Management Routes */}
            <Route path="departments" element={<Departments />} />
            <Route path="academic-courses" element={<Courses />} />
            <Route path="semesters" element={<Semesters />} />
            <Route path="subjects" element={<Subjects />} />
            <Route path="assignments" element={<FacultyAssignments />} />
            <Route path="students" element={<Students />} />
            <Route path="academic-timetable" element={<Timetable />} />
            <Route path="attendance-records" element={<AttendanceRecords />} />
            <Route path="manual-attendance" element={<ManualAttendance />} />

            {/* New Workflows */}
            <Route path="leaves" element={<LeaveApproval />} />
            <Route path="substitutions" element={<SubstitutionPage />} />
            <Route path="master-calendar" element={<MasterAttendanceCalendar />} />

            <Route path="settings" element={<SettingsConfig />} />
            <Route path="seed" element={<Seeder />} />
            <Route path="*" element={<div style={{ padding: '2rem', color: 'white' }}>Page Under Construction</div>} />
          </Route>

          {/* Faculty Dashboard Routes */}
          <Route path="/faculty" element={
            <ProtectedRoute requiredRole="faculty">
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route path="dashboard" element={<FacultyDashboard />} />
            <Route path="courses" element={<FacultyCourses />} />
            <Route path="my-class" element={<MyClass />} />
            <Route path="academic-progress" element={<AcademicProgress />} />
            <Route path="history" element={<History />} />
            <Route path="leave-management" element={<LeaveManagement />} />
            <Route path="substitutions" element={<SubstitutionPage />} />
            <Route path="timetables" element={<FacultyTimetables />} />

            <Route path="profile" element={<UserProfile />} />
          </Route>

          <Route path="/faculty-dashboard" element={<Navigate to="/faculty/dashboard" replace />} /> {/* Legacy redirect */}
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
