import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, BookOpen, Clock, Activity, Play } from 'lucide-react';

import DashboardLayout from '../layouts/DashboardLayout';
import KPICard from '../components/dashboard/KPICard';
import CourseCard from '../components/dashboard/CourseCard';
import AttendanceModal from '../components/dashboard/AttendanceModal';
import AttendanceHistoryTable from '../components/dashboard/AttendanceHistoryTable';

const FacultyDashboard = () => {
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);

    // Mock Data
    const stats = [
        { title: 'Active Sections', value: '4', icon: BookOpen, color: '#0ea5e9' },
        { title: 'Total Students', value: '186', icon: Users, color: '#8b5cf6', trend: '12% Increase', trendUp: true },
        { title: 'Sessions This Month', value: '24', icon: Clock, color: '#f59e0b' },
        { title: 'Avg. Attendance', value: '88%', icon: Activity, color: '#10b981', trend: '2% Increase', trendUp: true, subtitle: 'AI Confidence: 96%' },
    ];

    const courses = [
        { id: 1, code: 'CS301', name: 'Data Structures & Algorithms', section: 'A', studentCount: 54, status: 'active' },
        { id: 2, code: 'CS304', name: 'Database Management Systems', section: 'B', studentCount: 48, status: 'active' },
        { id: 3, code: 'CS402', name: 'Artificial Intelligence', section: 'A', studentCount: 42, status: 'active' },
        { id: 4, code: 'CS201', name: 'Digital Logic Design', section: 'C', studentCount: 42, status: 'disabled' },
    ];

    const history = [
        { id: 1, date: 'Mar 10, 2026', course: 'Data Structures', section: 'A', mode: 'camera', percentage: 92 },
        { id: 2, date: 'Mar 08, 2026', course: 'DBMS', section: 'B', mode: 'voice', percentage: 85 },
        { id: 3, date: 'Mar 06, 2026', course: 'Artificial Intelligence', section: 'A', mode: 'camera', percentage: 89 },
        { id: 4, date: 'Mar 05, 2026', course: 'Data Structures', section: 'A', mode: 'voice', percentage: 78 },
    ];

    return (
        <DashboardLayout>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Welcome Banner */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.1), rgba(139, 92, 246, 0.1))',
                    borderRadius: '1rem',
                    padding: '2rem',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    position: 'relative',
                    overflow: 'hidden',
                    marginBottom: '2rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'end'
                }}>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.875rem', fontWeight: 700, color: 'white' }}>
                            Faculty Dashboard
                        </h1>
                        <p style={{ margin: 0, color: '#9ca3af', maxWidth: '600px', fontSize: '1rem' }}>
                            Welcome back, Professor. Here's what's happening with your classes today.
                        </p>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsAttendanceModalOpen(true)}
                        style={{
                            background: 'var(--color-accent)',
                            color: 'white',
                            border: 'none',
                            padding: '0.875rem 1.5rem',
                            borderRadius: '0.75rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer',
                            boxShadow: '0 0 15px rgba(6, 182, 212, 0.3)',
                            zIndex: 2
                        }}
                    >
                        <Play size={20} fill="currentColor" /> Start Attendance
                    </motion.button>

                    {/* Decorative Pattern */}
                    <div style={{
                        position: 'absolute', right: '-50px', top: '-50px',
                        width: '300px', height: '300px',
                        background: 'radial-gradient(circle, rgba(20, 184, 166, 0.2) 0%, transparent 70%)',
                        borderRadius: '50%',
                        filter: 'blur(50px)'
                    }} />
                </div>

                {/* KPI Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                    {stats.map((stat) => (
                        <KPICard key={stat.title} {...stat} />
                    ))}
                </div>

                {/* Main Content Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>

                    {/* Active Courses Section */}
                    <section>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>My Courses</h2>
                            <button style={{ background: 'none', border: 'none', color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}>
                                View All
                            </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            {courses.map((course) => (
                                <CourseCard
                                    key={course.id}
                                    courseCode={course.code}
                                    courseName={course.name}
                                    section={course.section}
                                    studentCount={course.studentCount}
                                    status={course.status}
                                    onAction={() => setIsAttendanceModalOpen(true)}
                                />
                            ))}
                        </div>
                    </section>

                    {/* Recent History Section */}
                    <section>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Attendance History</h2>
                        </div>
                        <AttendanceHistoryTable history={history} />
                    </section>
                </div>
            </motion.div>

            {/* Attendance Modal */}
            <AttendanceModal
                isOpen={isAttendanceModalOpen}
                onClose={() => setIsAttendanceModalOpen(false)}
                courses={courses}
            />
        </DashboardLayout>
    );
};

export default FacultyDashboard;
