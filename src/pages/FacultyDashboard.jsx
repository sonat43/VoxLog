import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTimetable } from '../services/timetableService';
import AttendanceModal from '../components/dashboard/AttendanceModal';
import { BookOpen, Award, Folder, AlertTriangle, ArrowRight, Book, Layers, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getMySubjects, getAtRiskStudents } from '../services/facultyService';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../layouts/DashboardLayout';
import KPICard from '../components/dashboard/KPICard';

const FacultyDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [subjects, setSubjects] = useState([]);
    const [atRiskCount, setAtRiskCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [currentSession, setCurrentSession] = useState(null);
    const [timetables, setTimetables] = useState({});
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (user?.uid) {
                try {
                    // 1. Get Assigned Subjects
                    const mySubjects = await getMySubjects(user.uid);
                    setSubjects(mySubjects);

                    // 2. Mock KPI calculations or fetch for demo
                    setAtRiskCount(3); // Mock for Early Warning Demo

                    // 3. Fetch Timetables for "Live" check
                    const uniqueSemesterIds = [...new Set(mySubjects.map(s => s.semesterId).filter(Boolean))];
                    const timetableMap = {};
                    await Promise.all(uniqueSemesterIds.map(async (semId) => {
                        const schedule = await getTimetable(semId);
                        if (schedule) {
                            timetableMap[semId] = schedule;
                        }
                    }));
                    setTimetables(timetableMap);

                } catch (error) {
                    console.error("Dashboard data error", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchDashboardData();
    }, [user]);

    // Live Session Check
    useEffect(() => {
        const checkLiveSession = () => {
            const now = new Date();
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const currentDay = days[now.getDay()];
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const currentTimeVal = currentHour * 60 + currentMinute;

            let foundSession = null;

            subjects.forEach(subject => {
                if (!subject.semesterId || !timetables[subject.semesterId]) return;
                const daySchedule = timetables[subject.semesterId][currentDay];
                if (!daySchedule) return;

                daySchedule.forEach(slot => {
                    const [startStr, endStr] = slot.timeRange.split(' - ');
                    const [startH, startM] = startStr.split(':').map(Number);
                    const [endH, endM] = endStr.split(':').map(Number);
                    const startTimeVal = startH * 60 + startM;
                    const endTimeVal = endH * 60 + endM;

                    if (currentTimeVal >= startTimeVal && currentTimeVal < endTimeVal) {
                        if (slot.subjectId === subject.id) {
                            foundSession = { ...subject, timeRange: slot.timeRange };
                        }
                    }
                });
            });
            setCurrentSession(foundSession);
        };

        checkLiveSession();
        const interval = setInterval(checkLiveSession, 60000);
        return () => clearInterval(interval);
    }, [subjects, timetables]);

    const stats = [
        { title: 'My Courses', value: subjects.length.toString(), icon: Book, color: '#14b8a6' },
        { title: 'Pending Grading', value: '12', icon: Layers, color: '#f59e0b', trend: '4 New Submissions', trendUp: true },
        { title: 'Syllabus Progress', value: '45%', icon: BookOpen, color: '#8b5cf6', trend: 'On Track', trendUp: true },
        { title: 'Students At-Risk', value: atRiskCount.toString(), icon: AlertTriangle, color: '#ef4444', subtitle: 'Need Intervention' },
    ];

    const quickActions = [
        { title: 'Course Tracker', desc: 'Update syllabus & topics', icon: BookOpen, path: '/faculty/academic-progress', color: '#14b8a6' },
        { title: 'Gradebook', desc: 'Enter marks & review', icon: Award, path: '/faculty/gradebook', color: '#8b5cf6' },
        { title: 'Resource Center', desc: 'Upload study materials', icon: Folder, path: '/faculty/resources', color: '#3b82f6' },
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
                            Academic Overview
                        </h1>
                        <p style={{ margin: 0, color: '#9ca3af', maxWidth: '600px', fontSize: '1rem' }}>
                            Manage your curriculum, assessments, and student performance from one central hub.
                        </p>
                    </div>

                    {/* Decorative Pattern */}
                    <div style={{
                        position: 'absolute', right: '-50px', top: '-50px',
                        width: '300px', height: '300px',
                        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)',
                        borderRadius: '50%',
                        filter: 'blur(50px)'
                    }} />
                </div>

                {/* Live Session Alert */}
                {currentSession && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            background: 'linear-gradient(to right, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1))',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '1rem',
                            padding: '1.5rem',
                            marginBottom: '2rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: '50px', height: '50px',
                                background: 'rgba(16, 185, 129, 0.2)',
                                borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                animation: 'pulse 2s infinite'
                            }}>
                                <Users size={24} color="#34d399" />
                            </div>
                            <div>
                                <div style={{ color: '#34d399', fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Happening Now
                                </div>
                                <h2 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 600, margin: '0.25rem 0' }}>
                                    {currentSession.name} ({currentSession.code})
                                </h2>
                                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                    {currentSession.timeRange} • Semester {currentSession.semesterNo || 'N/A'}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowAttendanceModal(true)}
                            style={{
                                background: '#10b981',
                                border: 'none',
                                borderRadius: '0.75rem',
                                padding: '0.75rem 1.5rem',
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '1rem',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                            }}
                        >
                            Take Attendance
                        </button>
                    </motion.div>
                )}

                {/* KPI Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                    {stats.map((stat) => (
                        <KPICard key={stat.title} {...stat} />
                    ))}
                </div>

                {/* Main Content Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>

                    {/* Quick Actions */}
                    <section>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: 'white' }}>Quick Actions</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            {quickActions.map((action) => (
                                <motion.div
                                    key={action.title}
                                    whileHover={{ scale: 1.02 }}
                                    style={{
                                        background: 'rgba(30, 41, 59, 0.4)',
                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                        borderRadius: '1rem',
                                        padding: '1.5rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}
                                    onClick={() => navigate(action.path)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{
                                            padding: '0.75rem',
                                            borderRadius: '0.75rem',
                                            background: `${action.color}20`,
                                            color: action.color
                                        }}>
                                            <action.icon size={24} />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem', fontWeight: 600 }}>{action.title}</h3>
                                            <p style={{ margin: '0.25rem 0 0 0', color: '#9ca3af', fontSize: '0.9rem' }}>{action.desc}</p>
                                        </div>
                                    </div>
                                    <ArrowRight size={20} color="#6b7280" />
                                </motion.div>
                            ))}
                        </div>
                    </section>

                    {/* Early Warning Widget */}
                    <section style={{
                        background: 'rgba(239, 68, 68, 0.05)',
                        border: '1px solid rgba(239, 68, 68, 0.1)',
                        borderRadius: '1rem',
                        padding: '1.5rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <AlertTriangle size={20} /> At-Risk Students
                            </h2>
                            <button style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontWeight: 600 }}>View All</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                            {/* Mock Data for At-Risk Students */}
                            {[1, 2, 3].map(i => (
                                <div key={i} style={{
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: '0.75rem',
                                    padding: '1rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Users size={18} color="#9ca3af" />
                                        </div>
                                        <div>
                                            <div style={{ color: 'white', fontWeight: 600 }}>Student Name {i}</div>
                                            <div style={{ color: '#9ca3af', fontSize: '0.8rem' }}>CS-30{i} • Sem 5</div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '1.1rem' }}>4{i}%</div>
                                        <div style={{ color: '#f87171', fontSize: '0.75rem' }}>Avg. Score</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                </div>
            </motion.div>

            {/* Attendance Modal */}
            <AnimatePresence>
                {showAttendanceModal && currentSession && (
                    <AttendanceModal
                        isOpen={showAttendanceModal}
                        onClose={() => setShowAttendanceModal(false)}
                        courses={[{ ...currentSession, status: 'active' }]}
                    />
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
};

export default FacultyDashboard;
