import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Users, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { getSemestersByClassTeacher, getStudentsBySemester, getAttendanceRecords } from '../../services/academicService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';


const MyClass = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [myClassData, setMyClassData] = useState(null);

    useEffect(() => {
        const fetchClassData = async () => {
            if (user?.uid) {
                try {
                    setLoading(true);
                    const mySemesters = await getSemestersByClassTeacher(user.uid);

                    if (mySemesters.length > 0) {
                        const mySem = mySemesters[0]; // Assuming 1 class assignment for now
                        const students = await getStudentsBySemester(mySem.id);

                        // Calculate Attendance for each student
                        const studentsWithStats = await Promise.all(students.map(async (student) => {
                            const records = await getAttendanceRecords({ studentId: student.id, semesterId: mySem.id });
                            // Total present
                            const present = records.filter(r => r.status === 'Present').length;
                            const total = records.length;
                            const percent = total > 0 ? Math.round((present / total) * 100) : 0;

                            return { ...student, attendancePercent: percent };
                        }));

                        // Sort by percent ascending (risk first)
                        studentsWithStats.sort((a, b) => a.attendancePercent - b.attendancePercent);

                        const courseRef = doc(db, "courses", mySem.courseId);
                        const courseSnap = await getDoc(courseRef);
                        const courseData = courseSnap.exists() ? courseSnap.data() : null;

                        let departmentName = "Class";
                        if (courseData && courseData.departmentId) {
                            const deptRef = doc(db, "departments", courseData.departmentId);
                            const deptSnap = await getDoc(deptRef);
                            if (deptSnap.exists()) {
                                departmentName = deptSnap.data().name;
                            }
                        }

                        // Analytics Calculations
                        const totalStudents = studentsWithStats.length;
                        const totalAttendancePercent = studentsWithStats.reduce((acc, curr) => acc + curr.attendancePercent, 0);
                        const averageAttendance = totalStudents > 0 ? Math.round(totalAttendancePercent / totalStudents) : 0;
                        const atRiskCount = studentsWithStats.filter(s => s.attendancePercent < 75).length;

                        // Distribution for Chart
                        const goodCount = studentsWithStats.filter(s => s.attendancePercent >= 75).length;
                        const cautionCount = studentsWithStats.filter(s => s.attendancePercent >= 65 && s.attendancePercent < 75).length;
                        const criticalCount = studentsWithStats.filter(s => s.attendancePercent < 65).length;

                        const distributionData = [
                            { name: 'Good (>75%)', value: goodCount, color: '#34d399' },
                            { name: 'Caution (65-75%)', value: cautionCount, color: '#fbbf24' },
                            { name: 'Critical (<65%)', value: criticalCount, color: '#f87171' }
                        ];

                        setMyClassData({
                            semesterName: `${departmentName} - S${mySem.semesterNo}`,
                            department: departmentName,
                            semester: mySem.semesterNo,
                            students: studentsWithStats,
                            stats: {
                                total: totalStudents,
                                average: averageAttendance,
                                atRisk: atRiskCount,
                                distribution: distributionData
                            }
                        });
                    }
                } catch (error) {
                    console.error("My Class data error", error);
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchClassData();
    }, [user]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <>
            <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                style={{ maxWidth: '1400px', margin: '0 auto' }}
            >
                <motion.header variants={itemVariants} style={{ marginBottom: '2.5rem' }}>
                    <h1 style={{
                        fontSize: '2.5rem', fontWeight: '800', margin: '0 0 0.5rem 0',
                        background: 'linear-gradient(to right, #fff, #94a3b8)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        display: 'flex', alignItems: 'center', gap: '1rem'
                    }}>
                        <GraduationCap size={40} className="text-blue-400" />
                        {myClassData ? `${myClassData.department} - S${myClassData.semester}` : 'My Class Overview'}
                    </h1>
                    <p style={{ fontSize: '1.1rem', color: '#94a3b8' }}>
                        Track performance and attendance for your assigned class
                    </p>
                </motion.header>

                <motion.div variants={itemVariants}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>Loading class data...</div>
                    ) : myClassData ? (
                        <>
                            {/* Analytics Section */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                                {/* Summary Cards */}
                                <div style={{ background: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '1rem', padding: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <div>
                                            <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>Total Students</p>
                                            <h3 style={{ color: 'white', fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>{myClassData.stats.total}</h3>
                                        </div>
                                        <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.75rem' }}>
                                            <Users size={24} color="#60a5fa" />
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Enrolled in {myClassData.semesterName}</div>
                                </div>

                                <div style={{ background: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '1rem', padding: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <div>
                                            <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>Average Attendance</p>
                                            <h3 style={{ color: myClassData.stats.average >= 75 ? '#34d399' : '#fbbf24', fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
                                                {myClassData.stats.average}%
                                            </h3>
                                        </div>
                                        <div style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '0.75rem' }}>
                                            <TrendingUp size={24} color="#34d399" />
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Class-wide average</div>
                                </div>

                                <div style={{ background: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '1rem', padding: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <div>
                                            <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>Students At Risk</p>
                                            <h3 style={{ color: '#f87171', fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>{myClassData.stats.atRisk}</h3>
                                        </div>
                                        <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.75rem' }}>
                                            <AlertTriangle size={24} color="#f87171" />
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Below 75% attendance</div>
                                </div>
                            </div>

                            {/* Chart Section */}
                            <div style={{
                                background: 'rgba(30, 41, 59, 0.4)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                borderRadius: '1rem',
                                padding: '2rem',
                                marginBottom: '2rem',
                                minHeight: '300px'
                            }}>
                                <h3 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '1.5rem' }}>Attendance Distribution</h3>
                                <div style={{ width: '100%', height: '300px' }}>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie
                                                data={myClassData.stats.distribution}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {myClassData.stats.distribution.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip
                                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                                itemStyle={{ color: '#f8fafc' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '20px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div style={{
                                background: 'rgba(30, 41, 59, 0.4)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                borderRadius: '1.5rem',
                                padding: '2rem',
                                overflowX: 'auto'
                            }}>
                                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f1f5f9' }}>
                                        {myClassData.semesterName}
                                    </h2>
                                    <span style={{
                                        padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)',
                                        borderRadius: '0.75rem', color: '#94a3b8', fontSize: '0.9rem',
                                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                                    }}>
                                        <Users size={16} /> {myClassData.students.length} Students
                                    </span>
                                </div>

                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}>
                                            <th style={{ padding: '1rem', color: '#94a3b8', fontWeight: 600, fontSize: '0.875rem' }}>Student</th>
                                            <th style={{ padding: '1rem', color: '#94a3b8', fontWeight: 600, fontSize: '0.875rem' }}>Reg No</th>
                                            <th style={{ padding: '1rem', color: '#94a3b8', fontWeight: 600, fontSize: '0.875rem' }}>Attendance Rate</th>
                                            <th style={{ padding: '1rem', color: '#94a3b8', fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {myClassData.students.map((student, idx) => (
                                            <tr key={student.id} style={{ borderBottom: idx !== myClassData.students.length - 1 ? '1px solid rgba(255,255,255,0.02)' : 'none' }}>
                                                <td style={{ padding: '1rem', color: '#f8fafc', fontWeight: 500 }}>{student.name}</td>
                                                <td style={{ padding: '1rem', color: '#94a3b8' }}>{student.regNo}</td>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', maxWidth: '100px' }}>
                                                            <div style={{
                                                                width: `${student.attendancePercent}%`,
                                                                height: '100%',
                                                                borderRadius: '3px',
                                                                background: student.attendancePercent >= 75 ? '#34d399' : student.attendancePercent >= 65 ? '#fbbf24' : '#f87171'
                                                            }} />
                                                        </div>
                                                        <span style={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.9rem', minWidth: '35px' }}>
                                                            {student.attendancePercent}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                    <span style={{
                                                        padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                                                        background: student.attendancePercent >= 75 ? 'rgba(16, 185, 129, 0.1)' : student.attendancePercent >= 65 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                        color: student.attendancePercent >= 75 ? '#34d399' : student.attendancePercent >= 65 ? '#fbbf24' : '#f87171',
                                                        border: `1px solid ${student.attendancePercent >= 75 ? 'rgba(16, 185, 129, 0.2)' : student.attendancePercent >= 65 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                                    }}>
                                                        {student.attendancePercent >= 75 ? 'Good' : student.attendancePercent >= 65 ? 'Low Caution' : 'Critical'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {myClassData.students.length === 0 && (
                                            <tr>
                                                <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No students found in this class.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div style={{
                            background: 'rgba(30, 41, 59, 0.4)', borderRadius: '1rem', padding: '3rem',
                            textAlign: 'center', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            You are not assigned as a Class Teacher for any semester.
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </>
    );
};

export default MyClass;
