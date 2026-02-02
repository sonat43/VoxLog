import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, GraduationCap, Layers, Book, Clock } from 'lucide-react';
import { fetchAllUsers } from '../../services/adminService';
import { getAllStudents, getDepartments, getCourses, getSubjects, getRecentAttendanceActivity } from '../../services/academicService';
import { motion } from 'framer-motion';

const DashboardOverview = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        faculty: 0,
        students: 0,
        departments: 0,
        courses: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [users, students, depts, courses, subjects, recent] = await Promise.all([
                    fetchAllUsers(),
                    getAllStudents(),
                    getDepartments(),
                    getCourses(),
                    getSubjects(),
                    getRecentAttendanceActivity(5)
                ]);

                setStats({
                    faculty: users.length,
                    students: students.length,
                    departments: depts.length,
                    courses: courses.length
                });

                // Process recent activity
                const enrichedActivity = recent.map(r => {
                    const subject = subjects.find(s => s.id === r.subjectId);
                    return {
                        ...r,
                        resolvedSubjectName: r.subjectName || subject?.name || 'Unknown Subject',
                        dateLabel: r.dateString
                    };
                });
                setRecentActivity(enrichedActivity);

            } catch (error) {
                console.error("Error loading dashboard stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const statCards = [
        { title: 'Total Faculty', count: stats.faculty, icon: Users, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
        { title: 'Active Students', count: stats.students, icon: GraduationCap, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
        { title: 'Departments', count: stats.departments, icon: Layers, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
        { title: 'Courses', count: stats.courses, icon: Book, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' }
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', maxWidth: '1400px', margin: '0 auto' }}
        >
            {/* Welcome Banner */}
            <motion.div
                variants={itemVariants}
                style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1))',
                    borderRadius: '1.5rem',
                    padding: '3rem',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    position: 'relative',
                    overflow: 'hidden',
                    backdropFilter: 'blur(10px)'
                }}
            >
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <h1 style={{
                        margin: '0 0 1rem 0', fontSize: '2.5rem', fontWeight: 800,
                        background: 'linear-gradient(to right, #fff, #94a3b8)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                    }}>
                        Welcome, {user?.displayName || user?.email?.split('@')[0] || 'Administrator'}
                    </h1>
                    <p style={{ margin: 0, color: '#9ca3af', maxWidth: '600px', fontSize: '1.1rem', lineHeight: '1.6' }}>
                        Your central command center for managing academic attendance verification.
                        System status is <strong style={{ color: '#34d399' }}>Healthy</strong>.
                    </p>
                </div>
                {/* Decorative Pattern */}
                <div style={{
                    position: 'absolute', right: '-10%', top: '-50%',
                    width: '600px', height: '600px',
                    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
                    borderRadius: '50%',
                    filter: 'blur(60px)',
                    pointerEvents: 'none'
                }} />
            </motion.div>

            {/* KPI Grid */}
            <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                {statCards.map((stat, idx) => (
                    <div key={idx} style={{
                        background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.4), rgba(15, 23, 42, 0.6))',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '1.25rem',
                        padding: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        transition: 'transform 0.2s',
                        cursor: 'default'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <div style={{
                                padding: '0.75rem', borderRadius: '1rem',
                                background: stat.bg, color: stat.color
                            }}>
                                <stat.icon size={24} />
                            </div>

                        </div>
                        <div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', lineHeight: 1 }}>
                                {loading ? '-' : stat.count}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 500, marginTop: '0.5rem' }}>{stat.title}</div>
                        </div>
                    </div>
                ))}
            </motion.div>

            {/* Recent Activity Feed */}
            <motion.div
                variants={itemVariants}
                style={{
                    background: 'rgba(30, 41, 59, 0.4)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '1.5rem',
                    padding: '2rem',
                    minHeight: '400px'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                    <div style={{ padding: '0.5rem', background: 'rgba(34, 211, 238, 0.1)', borderRadius: '0.5rem', color: '#22d3ee' }}>
                        <Clock size={20} />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', color: '#f8fafc', margin: 0, fontWeight: 700 }}>Recent Activity</h2>
                </div>

                {loading ? (
                    <div style={{ color: '#94a3b8', padding: '2rem', textAlign: 'center' }}>
                        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                        Loading live feed...
                    </div>
                ) : recentActivity.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontStyle: 'italic', padding: '2rem', textAlign: 'center' }}>No recent activity found.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {recentActivity.map((activity, i) => (
                            <motion.div
                                key={activity.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '1.25rem',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '1rem',
                                    border: '1px solid rgba(255,255,255,0.02)',
                                    transition: 'background 0.2s'
                                }}
                                whileHover={{ background: 'rgba(255,255,255,0.05)' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        width: '8px', height: '8px', borderRadius: '50%',
                                        background: '#34d399', boxShadow: '0 0 10px rgba(52, 211, 153, 0.5)'
                                    }} />
                                    <div>
                                        <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '1.1rem' }}>
                                            Attendance Filed
                                        </div>
                                        <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                            For <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{activity.resolvedSubjectName}</span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{
                                    fontSize: '0.85rem', color: '#94a3b8',
                                    background: 'rgba(15, 23, 42, 0.5)',
                                    padding: '0.4rem 1rem', borderRadius: '9999px',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    {activity.dateLabel}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};

export default DashboardOverview;
