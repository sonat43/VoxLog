import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getFacultyPersonalAttendanceHistory } from '../../services/facultyService';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const MyAttendance = () => {
    const { user } = useAuth();
    const [attendanceHistory, setAttendanceHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!user?.uid) return;
            setLoading(true);
            try {
                const history = await getFacultyPersonalAttendanceHistory(user.uid);
                setAttendanceHistory(history);
            } catch (error) {
                console.error("Error loading attendance history:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [user]);

    // Calculate Summary Stats
    const totalDays = attendanceHistory.length;
    const daysPresent = attendanceHistory.filter(r => r.status === 'Present').length;
    const daysAbsent = attendanceHistory.filter(r => r.status === 'Absent').length;
    const attendancePercentage = totalDays > 0 ? Math.round((daysPresent / totalDays) * 100) : 0;

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
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
            style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}
        >
            <motion.div variants={itemVariants}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-text-main)', margin: '0 0 0.5rem 0' }}>
                    My Attendance
                </h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem', margin: 0 }}>
                    Track your daily attendance history based on your completed classes.
                </p>
            </motion.div>

            {/* Stats Summary */}
            <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div style={{ background: 'var(--color-surface)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '1rem', borderRadius: '0.75rem' }}>
                        <Calendar size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Total Days Evaluated</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-main)' }}>{totalDays}</div>
                    </div>
                </div>

                <div style={{ background: 'var(--color-surface)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '1rem', borderRadius: '0.75rem' }}>
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Days Present</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{daysPresent}</div>
                    </div>
                </div>

                <div style={{ background: 'var(--color-surface)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '0.75rem' }}>
                        <XCircle size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Days Absent</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{daysAbsent}</div>
                    </div>
                </div>

                <div style={{ background: 'var(--color-surface)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '1rem', borderRadius: '0.75rem' }}>
                        <Clock size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Overall Accuracy</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{attendancePercentage}%</div>
                    </div>
                </div>
            </motion.div>

            {/* History Feed */}
            <motion.div variants={itemVariants} style={{ background: 'var(--color-surface)', borderRadius: '1rem', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-main)' }}>History Log</h2>
                </div>

                {loading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading history...</div>
                ) : attendanceHistory.length === 0 ? (
                    <div style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <AlertCircle size={48} color="var(--color-text-muted)" opacity={0.5} />
                        <h3 style={{ margin: 0, color: 'var(--color-text-main)' }}>No Attendance Logs Found</h3>
                        <p style={{ color: 'var(--color-text-muted)', maxWidth: '400px', margin: 0 }}>
                            Your daily attendance is evaluated automatically when you complete all scheduled classes for a specific day.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {attendanceHistory.map((record, idx) => (
                            <div key={idx} style={{
                                padding: '1.25rem 1.5rem',
                                borderBottom: idx !== attendanceHistory.length - 1 ? '1px solid var(--color-border)' : 'none',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'background 0.2s'
                            }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'var(--color-bg)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        width: '48px', height: '48px', borderRadius: '12px',
                                        background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'var(--color-text-main)', fontWeight: 700, border: '1px solid var(--color-border)'
                                    }}>
                                        {new Date(record.dateString).getDate()}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--color-text-main)', fontSize: '1.1rem' }}>
                                            {new Date(record.dateString).toLocaleDateString('en-US', { weekday: 'long', month: 'short' })}
                                        </div>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            Classes Completed: {record.completedClasses} / {record.targetClasses}
                                        </div>
                                    </div>
                                </div>

                                <span style={{
                                    padding: '6px 16px', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                                    background: record.status === 'Present' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    color: record.status === 'Present' ? '#10b981' : '#ef4444',
                                    border: `1px solid ${record.status === 'Present' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                }}>
                                    {record.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};

export default MyAttendance;
