import React from 'react';
import { Users, GraduationCap, BookOpen, Clock, Activity, AlertCircle } from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import KPICard from '../../components/admin/KPICard';

const DashboardOverview = () => {
    // Mock Data
    const kpiData = [
        { title: "Total Faculty", value: "48", icon: Users, trend: 12.5, color: "#8b5cf6" },
        { title: "Enrolled Students", value: "3,250", icon: GraduationCap, trend: 5.2, color: "#14b8a6" },
        { title: "Active Classes", value: "156", icon: BookOpen, trend: -2.4, color: "#f59e0b" },
        { title: "Avg Attendance", value: "87%", icon: Clock, trend: 0.8, color: "#06b6d4" },
    ];

    const attendanceTrendData = [
        { name: 'Mon', rate: 82 },
        { name: 'Tue', rate: 88 },
        { name: 'Wed', rate: 85 },
        { name: 'Thu', rate: 91 },
        { name: 'Fri', rate: 86 },
        { name: 'Sat', rate: 75 },
    ];

    const enrollmentData = [
        { name: 'Computer Sci', value: 850 },
        { name: 'Electronics', value: 620 },
        { name: 'Mechanical', value: 540 },
        { name: 'Civil', value: 480 },
    ];
    const COLORS = ['#14b8a6', '#8b5cf6', '#06b6d4', '#f59e0b'];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Welcome Banner */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.1), rgba(139, 92, 246, 0.1))',
                borderRadius: '1rem',
                padding: '2rem',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem' }}>Welcome to VoxLog Admin Console</h1>
                    <p style={{ margin: 0, color: '#9ca3af', maxWidth: '600px' }}>
                        Your central command center for managing academic attendance verification.
                        System status is <strong>Healthy</strong>.
                    </p>
                </div>
                {/* Decorative Pattern */}
                <div style={{
                    position: 'absolute', right: '-50px', top: '-50px',
                    width: '300px', height: '300px',
                    background: 'radial-gradient(circle, rgba(20, 184, 166, 0.2) 0%, transparent 70%)',
                    borderRadius: '50%',
                    filter: 'blur(50px)'
                }} />
            </div>

            {/* KPI Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                {kpiData.map((item, idx) => (
                    <KPICard key={idx} {...item} />
                ))}
            </div>

            {/* Charts Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                {/* Attendance Trend Chart */}
                <div style={{
                    background: '#111827',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '1rem',
                    padding: '1.5rem',
                    height: '400px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Weekly Attendance Trend</h3>
                        <Activity size={18} color="#9ca3af" />
                    </div>
                    <ResponsiveContainer width="100%" height="85%">
                        <LineChart data={attendanceTrendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" stroke="#6b7280" tick={{ fill: '#9ca3af' }} />
                            <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af' }} domain={[0, 100]} />
                            <RechartsTooltip
                                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: 'white' }}
                                itemStyle={{ color: '#14b8a6' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="rate"
                                stroke="#14b8a6"
                                strokeWidth={3}
                                dot={{ fill: '#0a0f1e', stroke: '#14b8a6', strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Enrollment Distribution */}
                <div style={{
                    background: '#111827',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '1rem',
                    padding: '1.5rem',
                    height: '400px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Enrollment by Department</h3>
                        <BookOpen size={18} color="#9ca3af" />
                    </div>
                    <ResponsiveContainer width="100%" height="85%">
                        <PieChart>
                            <Pie
                                data={enrollmentData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {enrollmentData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <RechartsTooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: 'white' }} />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Alert Feed Mockup */}
            <div style={{
                background: 'rgba(239, 68, 68, 0.05)', // Red tint
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '1rem',
                padding: '1.5rem',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <AlertCircle color="#f87171" />
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f87171' }}>Pending System Alerts</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[1, 2].map((i) => (
                        <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '0.5rem'
                        }}>
                            <span style={{ fontSize: '0.9rem' }}>⚠️ <strong>Unassigned Class:</strong> CS-302 has no Faculty assigned.</span>
                            <button style={{
                                background: '#f87171', color: '#1f2937', border: 'none',
                                padding: '0.25rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'
                            }}>Resolve</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DashboardOverview;
