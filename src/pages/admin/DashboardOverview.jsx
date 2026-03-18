import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, GraduationCap, Layers, Book, Clock, Send, RefreshCw, Mail } from 'lucide-react';
import { fetchAllUsers, getWeeklyAttendanceAnalytics } from '../../services/adminService';
import { getAllStudents, getDepartments, getPrograms, getCourses, getRecentAttendanceActivity } from '../../services/academicService';
import { processEndOfDayEmails } from '../../services/facultyService';
import { getAllTodaysSubstitutions } from '../../services/substitutionService';
import { getTodayFacultyAttendance } from '../../services/adminService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Toast from '../../components/common/Toast';
import ComposeEmailModal from '../../components/common/ComposeEmailModal';
import { motion } from 'framer-motion';
import { formatTime12Hour } from '../../utils/timeFormat';

const DashboardOverview = () => {
    const { user } = useAuth();
    const [faculty, setFaculty] = useState([]);
    const [stats, setStats] = useState({
        faculty: 0,
        students: 0,
        departments: 0,
        programs: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [attendanceData, setAttendanceData] = useState([]);
    const [todaysSubstitutions, setTodaysSubstitutions] = useState([]);
    const [todaysFacultyAttendance, setTodaysFacultyAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sendingEmails, setSendingEmails] = useState(false);
    const [toast, setToast] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Email Modal State
    const [emailModal, setEmailModal] = useState({
        isOpen: false,
        recipients: [],
        title: '',
        defaultSubject: ''
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [users, students, depts, programs, courses, recent, weeklyAnalytics, subs, todaysFacAtt] = await Promise.all([
                    fetchAllUsers(),
                    getAllStudents(),
                    getDepartments(),
                    getPrograms(),
                    getCourses(),
                    getRecentAttendanceActivity(5),
                    getWeeklyAttendanceAnalytics(),
                    getAllTodaysSubstitutions(new Date().toISOString().split('T')[0]),
                    getTodayFacultyAttendance()
                ]);

                const facultyUsers = users.filter(u => u.role === 'faculty' || u.role === 'Faculty');
                setFaculty(facultyUsers);

                setStats({
                    faculty: facultyUsers.length,
                    students: students.length,
                    departments: depts.length,
                    programs: programs.length
                });

                // Process recent activity
                const enrichedActivity = recent.map(r => {
                    const course = courses.find(s => s.id === r.courseId);
                    return {
                        ...r,
                        resolvedCourseName: r.courseName || course?.name || 'Unknown Course',
                        dateLabel: r.dateString
                    };
                });
                setRecentActivity(enrichedActivity);
                setAttendanceData(weeklyAnalytics);
                setTodaysSubstitutions(subs);

                // Map faculty names to their attendance
                const enrichedFacAtt = todaysFacAtt.map(att => {
                    const fac = facultyUsers.find(u => u.id === att.facultyId);
                    return {
                        ...att,
                        facultyName: fac?.displayName || fac?.email?.split('@')[0] || 'Unknown Faculty',
                        email: fac?.email
                    };
                });
                setTodaysFacultyAttendance(enrichedFacAtt);

            } catch (error) {
                console.error("Error loading dashboard stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const handleMessageAllFaculty = () => {
        const recipients = faculty.map(f => ({ email: f.email, name: f.displayName }));
        setEmailModal({
            isOpen: true,
            recipients,
            title: 'Message All Faculty Members',
            defaultSubject: '[VoxLog] Important Update for Faculty Members'
        });
    };

    const handleMessageIndividualFaculty = (facEntry) => {
        if (!facEntry.email) {
            setToast({ message: "No email address found for this faculty member.", type: 'error' });
            return;
        }
        setEmailModal({
            isOpen: true,
            recipients: [{ email: facEntry.email, name: facEntry.facultyName }],
            title: `Message ${facEntry.facultyName}`,
            defaultSubject: `[VoxLog] Message from Administration`
        });
    };


    const statCards = [
        { title: 'Total Faculty', count: stats.faculty, icon: Users, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
        { title: 'Active Students', count: stats.students, icon: GraduationCap, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
        { title: 'Departments', count: stats.departments, icon: Layers, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
        { title: 'Programs', count: stats.programs, icon: Book, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' }
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

    const handleSendEndOfDayReports = async () => {
        setShowConfirmModal(false);
        setSendingEmails(true);
        try {
            const result = await processEndOfDayEmails();
            setToast({ message: result.message, type: result.success ? 'success' : 'error' });
        } catch (error) {
            setToast({ message: "Error sending reports: " + error.message, type: 'error' });
        } finally {
            setSendingEmails(false);
        }
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
                className="mobile-p-4"
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
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                    <div>
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
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <button
                            onClick={handleMessageAllFaculty}
                            disabled={faculty.length === 0}
                            style={{
                                padding: '12px 24px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)',
                                fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: faculty.length === 0 ? 'not-allowed' : 'pointer', height: 'fit-content',
                                transition: 'all 0.2s', fontSize: '1rem'
                            }}
                            onMouseOver={(e) => { if (faculty.length > 0) e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)' }}
                            onMouseOut={(e) => { if (faculty.length > 0) e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)' }}
                        >
                            <Mail size={18} />
                            Message Faculty
                        </button>
                        <button
                            onClick={() => setShowConfirmModal(true)}
                            disabled={sendingEmails}
                            style={{
                                padding: '12px 24px', borderRadius: '12px', background: sendingEmails ? '#475569' : 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: '1px solid rgba(255,255,255,0.1)',
                                fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: sendingEmails ? 'not-allowed' : 'pointer', height: 'fit-content',
                                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)', transition: 'all 0.2s', fontSize: '1rem'
                            }}
                            onMouseOver={(e) => { if (!sendingEmails) e.currentTarget.style.transform = 'translateY(-2px)' }}
                            onMouseOut={(e) => { if (!sendingEmails) e.currentTarget.style.transform = 'translateY(0)' }}
                        >
                            <Send size={18} />
                            {sendingEmails ? 'Processing...' : 'Send Daily Reports To Parents'}
                        </button>
                    </div>
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

            {/* Charts & Substitutions Row */}
            <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '1.5rem' }}>
                {/* Attendance Chart */}
                <div style={{
                    background: 'rgba(30, 41, 59, 0.7)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '1.25rem',
                    padding: '1.5rem',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                    display: 'flex', flexDirection: 'column'
                }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: '#f8fafc', fontWeight: 600 }}>Weekly Attendance Trends</h3>
                    <div style={{ width: '100%', height: 250, minHeight: 250, flex: 1 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={attendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorPercent" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="displayDate" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f8fafc' }}
                                    itemStyle={{ color: '#3b82f6' }}
                                />
                                <Area type="monotone" dataKey="percentage" name="Attendance %" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPercent)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Substitutions */}
                <div style={{
                    background: 'rgba(30, 41, 59, 0.7)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '1.25rem',
                    padding: '1.5rem',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                    display: 'flex', flexDirection: 'column'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, color: '#f8fafc', fontWeight: 600 }}>Today's Substitutions</h3>
                        <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
                            {todaysSubstitutions.length} Active
                        </span>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.5rem', maxHeight: '250px' }}>
                        {todaysSubstitutions.length === 0 ? (
                            <div style={{ color: '#64748b', textAlign: 'center', margin: 'auto' }}>No substitutions scheduled for today.</div>
                        ) : (
                            todaysSubstitutions.map((sub, idx) => (
                                <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '0.75rem', padding: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <strong style={{ color: '#e2e8f0' }}>{sub.courseName}</strong>
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{formatTime12Hour(sub.timeRange)}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                        <span style={{ color: '#ef4444', textDecoration: 'line-through' }}>{sub.originalFacultyName}</span>
                                        <RefreshCw size={14} color="#94a3b8" />
                                        <span style={{ color: '#10b981' }}>{sub.substituteName}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Today's Faculty Attendance Widget */}
                <div style={{
                    background: 'rgba(30, 41, 59, 0.7)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '1.25rem',
                    padding: '1.5rem',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                    display: 'flex', flexDirection: 'column'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, color: '#f8fafc', fontWeight: 600 }}>Faculty Daily Logs</h3>
                        <span style={{
                            background: todaysFacultyAttendance.length > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            color: todaysFacultyAttendance.length > 0 ? '#10b981' : '#94a3b8',
                            padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600
                        }}>
                            {todaysFacultyAttendance.length} Evaluated
                        </span>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.5rem', maxHeight: '250px' }}>
                        {todaysFacultyAttendance.length === 0 ? (
                            <div style={{ color: '#64748b', textAlign: 'center', margin: 'auto' }}>No faculty logs evaluated today.</div>
                        ) : (
                            todaysFacultyAttendance.sort((a, b) => b.completedClasses - a.completedClasses).map((facLog, idx) => (
                                <div key={idx} style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    borderRadius: '0.75rem',
                                    padding: '1rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <strong style={{ color: '#e2e8f0' }}>{facLog.facultyName}</strong>
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{facLog.completedClasses} / {facLog.targetClasses} Classes Done</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <button
                                            onClick={() => handleMessageIndividualFaculty(facLog)}
                                            style={{
                                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px', padding: '6px', color: '#94a3b8', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.color = '#3b82f6'}
                                            onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
                                            title="Send Personal Mail"
                                        >
                                            <Mail size={16} />
                                        </button>
                                        <span style={{
                                            background: facLog.status === 'Present' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                            color: facLog.status === 'Present' ? '#10b981' : '#ef4444',
                                            padding: '4px 10px',
                                            borderRadius: '8px',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            letterSpacing: '0.05em',
                                            textTransform: 'uppercase'
                                        }}>
                                            {facLog.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

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
                                    alignItems: 'flex-start',
                                    gap: '1rem',
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
                                            For <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{activity.resolvedCourseName}</span>
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

            {/* Custom Confirmation Modal */}
            {showConfirmModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
                }}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{
                            background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '16px', padding: '32px', maxWidth: '400px', width: '90%',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                        }}
                    >
                        <h3 style={{ margin: '0 0 16px', color: 'white', fontSize: '1.25rem' }}>Send Daily Reports?</h3>
                        <p style={{ color: '#94a3b8', marginBottom: '24px', lineHeight: 1.5 }}>
                            Are you sure you want to process and send End of Day attendance reports to all parents? This action will email all parents of students whose attendance was marked today.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                style={{
                                    padding: '8px 16px', borderRadius: '8px', background: 'transparent',
                                    border: '1px solid rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendEndOfDayReports}
                                style={{
                                    padding: '8px 16px', borderRadius: '8px', background: '#3b82f6',
                                    border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer'
                                }}
                            >
                                Yes, Send Reports
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            <ComposeEmailModal
                isOpen={emailModal.isOpen}
                onClose={() => setEmailModal({ ...emailModal, isOpen: false })}
                recipients={emailModal.recipients}
                title={emailModal.title}
                defaultSubject={emailModal.defaultSubject}
            />

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </motion.div>
    );
};

export default DashboardOverview;
