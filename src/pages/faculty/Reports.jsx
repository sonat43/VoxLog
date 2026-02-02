import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { Activity, Users, Clock, Calendar, Download, Filter, ChevronDown } from 'lucide-react';


const Reports = () => {
    // Mock Data
    const attendanceTrend = [
        { date: 'Mar 1', 'CS301-A': 85, 'CS304-B': 78, 'CS402-A': 92 },
        { date: 'Mar 3', 'CS301-A': 88, 'CS304-B': 82, 'CS402-A': 89 },
        { date: 'Mar 5', 'CS301-A': 82, 'CS304-B': 85, 'CS402-A': 94 },
        { date: 'Mar 8', 'CS301-A': 90, 'CS304-B': 80, 'CS402-A': 91 },
        { date: 'Mar 10', 'CS301-A': 95, 'CS304-B': 88, 'CS402-A': 88 },
        { date: 'Mar 12', 'CS301-A': 92, 'CS304-B': 90, 'CS402-A': 95 },
    ];

    const studentPerformance = [
        { id: 1, name: 'Alice Johnson', id_num: 'S101', attendance: 98, grade: 'A', risk: 'Low' },
        { id: 2, name: 'Bob Smith', id_num: 'S102', attendance: 72, grade: 'C', risk: 'Medium' },
        { id: 3, name: 'Charlie Brown', id_num: 'S103', attendance: 45, grade: 'F', risk: 'High' },
        { id: 4, name: 'Diana Ross', id_num: 'S104', attendance: 92, grade: 'A', risk: 'Low' },
        { id: 5, name: 'Evan Wright', id_num: 'S105', attendance: 85, grade: 'B', risk: 'Low' },
    ];

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '2.5rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>
                            Class Analytics
                        </h1>
                        <p style={{ color: '#9ca3af' }}>Deep insights into student attendance and performance.</p>
                    </div>
                    <button style={{
                        padding: '0.75rem 1.5rem',
                        background: 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
                    }}>
                        <Download size={18} /> Export Report
                    </button>
                </div>

                {/* Main Graph Card */}
                <div style={{
                    background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.6))',
                    borderRadius: '1.5rem',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '2rem',
                    marginBottom: '2rem',
                    backdropFilter: 'blur(20px)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Activity color="#10b981" /> Multiple Class Comparison
                        </h3>
                        <div style={{
                            display: 'flex',
                            gap: '0.75rem',
                            background: 'rgba(0,0,0,0.2)',
                            padding: '0.25rem',
                            borderRadius: '0.5rem'
                        }}>
                            {['Week', 'Month', 'Semester'].map(period => (
                                <button key={period} style={{
                                    padding: '0.5rem 1rem',
                                    background: period === 'Month' ? 'rgba(255,255,255,0.1)' : 'transparent',
                                    color: period === 'Month' ? 'white' : '#94a3b8',
                                    border: 'none',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    cursor: 'pointer'
                                }}>
                                    {period}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ height: '350px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={attendanceTrend}>
                                <defs>
                                    <linearGradient id="colorCs301" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorCs304" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="date" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '0.5rem' }}
                                    itemStyle={{ color: 'white' }}
                                />
                                <Area type="monotone" dataKey="CS301-A" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorCs301)" />
                                <Area type="monotone" dataKey="CS304-B" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorCs304)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Secondary Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                    {/* Metrics Card */}
                    <div style={{
                        background: 'rgba(30, 41, 59, 0.4)',
                        borderRadius: '1.5rem',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        padding: '1.5rem'
                    }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={18} color="#f59e0b" /> Peak Attendance Times
                        </h3>
                        {/* Placeholder for Peak Time Donut/Bar */}
                        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'end', height: '150px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ height: '80px', width: '40px', background: 'rgba(245, 158, 11, 0.2)', borderRadius: '4px', margin: '0 auto' }}></div>
                                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>09:00 AM</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ height: '120px', width: '40px', background: 'rgba(245, 158, 11, 0.8)', borderRadius: '4px', margin: '0 auto', boxShadow: '0 0 15px rgba(245, 158, 11, 0.3)' }}></div>
                                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700 }}>11:00 AM</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ height: '60px', width: '40px', background: 'rgba(245, 158, 11, 0.2)', borderRadius: '4px', margin: '0 auto' }}></div>
                                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>02:00 PM</div>
                            </div>
                        </div>
                    </div>

                    {/* At Risk Students */}
                    <div style={{
                        background: 'rgba(30, 41, 59, 0.4)',
                        borderRadius: '1.5rem',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        padding: '1.5rem'
                    }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Users size={18} color="#ef4444" /> Students at Risk
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {studentPerformance.filter(s => s.risk !== 'Low').map(student => (
                                <div key={student.id} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: 'rgba(239, 68, 68, 0.05)',
                                    border: '1px solid rgba(239, 68, 68, 0.1)',
                                    padding: '0.75rem',
                                    borderRadius: '0.75rem'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'white' }}>{student.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>ID: {student.id_num}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 700, color: '#ef4444' }}>{student.attendance}%</div>
                                        <div style={{ fontSize: '0.7rem', color: '#fca5a5' }}>Attendance</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Data Table */}
                <div style={{
                    background: 'rgba(30, 41, 59, 0.4)',
                    borderRadius: '1.5rem',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    overflow: 'hidden'
                }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', margin: 0 }}>Student Performance Log</h3>
                        <button style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            Filter <Filter size={14} />
                        </button>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', color: '#cbd5e1', fontSize: '0.9rem' }}>
                        <thead style={{ background: 'rgba(0,0,0,0.2)' }}>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Name</th>
                                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>ID Number</th>
                                <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600 }}>Attendance</th>
                                <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600 }}>Grade/Performance</th>
                                <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600 }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {studentPerformance.map((student, idx) => (
                                <tr key={student.id} style={{ borderBottom: idx !== studentPerformance.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                    <td style={{ padding: '1rem', color: 'white', fontWeight: 500 }}>{student.name}</td>
                                    <td style={{ padding: '1rem' }}>{student.id_num}</td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '0.25rem',
                                            background: student.attendance > 90 ? 'rgba(16, 185, 129, 0.1)' : student.attendance > 75 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            color: student.attendance > 90 ? '#34d399' : student.attendance > 75 ? '#fbbf24' : '#f87171',
                                            fontWeight: 600
                                        }}>
                                            {student.attendance}%
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>{student.grade}</td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <span style={{
                                            color: student.risk === 'Low' ? '#34d399' : student.risk === 'Medium' ? '#fbbf24' : '#f87171',
                                            fontWeight: 500
                                        }}>
                                            {student.risk} Risk
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </motion.div>
        </>
    );
};

export default Reports;
