import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, UserCheck, UserX, AlertCircle, RefreshCw, CheckCircle, Save } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { fetchAllUsers, overrideFacultyAttendance, backfillFacultyAttendance } from '../../../services/adminService';
import { db } from '../../../services/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import Toast from '../../../components/common/Toast';
import ConfirmModal from '../../../components/common/ConfirmModal';

const FacultyAttendanceAudit = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [facultyList, setFacultyList] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [stats, setStats] = useState({ present: 0, absent: 0, leave: 0 });
    const [toast, setToast] = useState(null);

    // Backfill State
    const [isBackfilling, setIsBackfilling] = useState(false);
    const [showBackfillConfirm, setShowBackfillConfirm] = useState(false);

    useEffect(() => {
        fetchDailyData();
    }, [selectedDate]);

    const fetchDailyData = async () => {
        setLoading(true);
        try {
            // 1. Get All Faculty
            const users = await fetchAllUsers();
            const faculty = users.filter(u => u.role && u.role.toLowerCase() === 'faculty');

            // 2. Get Logs for Selected Date
            // Querying by ID is faster since we know the ID format: facultyId_YYYY-MM-DD
            // But getting ALL docs in a loop is slow. 
            // Better: Get all logs for this date if we had an index on 'date'.
            // For now, let's try getting all logs for this date:
            const qLogs = query(collection(db, "faculty_daily_logs"), where("date", "==", selectedDate));
            const logsSnap = await getDocs(qLogs);
            const logsMap = {};
            logsSnap.forEach(doc => {
                logsMap[doc.data().facultyId] = doc.data();
            });

            // 3. Merge Data
            let p = 0, a = 0, l = 0;
            const merged = faculty.map(fac => {
                const log = logsMap[fac.id] || {};
                const status = log.status || 'Pending'; // Default if no log

                if (status === 'Present') p++;
                else if (status === 'Absent') a++;
                else if (status === 'On Leave') l++;

                return {
                    id: fac.id,
                    name: fac.displayName,
                    department: fac.department || 'N/A',
                    status: status,
                    isOverride: log.isOverride
                };
            });

            setFacultyList(merged);
            setStats({ present: p, absent: a, leave: l });

        } catch (error) {
            console.error(error);
            setToast({ message: "Failed to load attendance data", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (facultyId, newStatus) => {
        try {
            await overrideFacultyAttendance(facultyId, selectedDate, newStatus, user.uid);

            // Optimistic Update
            setFacultyList(prev => prev.map(f =>
                f.id === facultyId ? { ...f, status: newStatus, isOverride: true } : f
            ));

            // Recalc Stats
            const updatedList = facultyList.map(f => f.id === facultyId ? { ...f, status: newStatus } : f);
            const p = updatedList.filter(f => f.status === 'Present').length;
            const a = updatedList.filter(f => f.status === 'Absent').length;
            const l = updatedList.filter(f => f.status === 'On Leave').length;
            setStats({ present: p, absent: a, leave: l });

            setToast({ message: "Attendance updated", type: "success" });
        } catch (error) {
            setToast({ message: "Update failed", type: "error" });
        }
    };

    const runBackfill = async () => {
        setIsBackfilling(true);
        setShowBackfillConfirm(false);
        try {
            const result = await backfillFacultyAttendance(user.uid);
            setToast({ message: `Backfill Complete! Updated ${result.count} records.`, type: "success" });
            fetchDailyData(); // Refresh view
        } catch (error) {
            setToast({ message: "Backfill failed. Check console.", type: "error" });
        } finally {
            setIsBackfilling(false);
        }
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <UserCheck className="text-emerald-400" /> Faculty Attendance Audit
                    </h1>
                    <p style={{ color: '#9ca3af', marginTop: '0.5rem' }}>Monitor and manually override faculty daily attendance.</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={() => setShowBackfillConfirm(true)}
                        disabled={isBackfilling}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: '#374151', color: '#e5e7eb',
                            border: '1px solid #4b5563', borderRadius: '0.75rem',
                            fontWeight: 600, cursor: isBackfilling ? 'wait' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}
                    >
                        <RefreshCw size={18} className={isBackfilling ? "animate-spin" : ""} />
                        {isBackfilling ? "Backfilling..." : "Backfill Data"}
                    </button>
                    {/* Date Picker */}
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        style={{
                            padding: '0.75rem', borderRadius: '0.75rem',
                            background: '#1f2937', color: 'white',
                            border: '1px solid #374151', outline: 'none',
                            fontWeight: 600
                        }}
                    />
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                <StatsCard label="Present" value={stats.present} color="#34d399" icon={<CheckCircle size={20} />} />
                <StatsCard label="Absent" value={stats.absent} color="#f87171" icon={<UserX size={20} />} />
                <StatsCard label="On Leave" value={stats.leave} color="#fbbf24" icon={<AlertCircle size={20} />} />
            </div>

            {/* Table */}
            <div style={{ background: '#1f2937', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Loading attendance data...</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Faculty Name</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Department</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>Current Status</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {facultyList.map(fac => (
                                <tr key={fac.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '1rem', fontWeight: 500 }}>{fac.name}</td>
                                    <td style={{ padding: '1rem', color: '#9ca3af' }}>{fac.department}</td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 600,
                                            background: fac.status === 'Present' ? 'rgba(52, 211, 153, 0.1)' : fac.status === 'Absent' ? 'rgba(248, 113, 113, 0.1)' : fac.status === 'On Leave' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(156, 163, 175, 0.1)',
                                            color: fac.status === 'Present' ? '#34d399' : fac.status === 'Absent' ? '#f87171' : fac.status === 'On Leave' ? '#fbbf24' : '#9ca3af'
                                        }}>
                                            {fac.status}
                                        </span>
                                        {fac.isOverride && <span style={{ fontSize: '0.7rem', color: '#60a5fa', marginLeft: '0.5rem' }}>(Admin Set)</span>}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => handleStatusChange(fac.id, 'Present')}
                                                style={{
                                                    padding: '0.4rem 0.8rem', borderRadius: '0.5rem',
                                                    background: fac.status === 'Present' ? '#059669' : '#374151',
                                                    color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.8rem'
                                                }}
                                            >
                                                P
                                            </button>
                                            <button
                                                onClick={() => handleStatusChange(fac.id, 'Absent')}
                                                style={{
                                                    padding: '0.4rem 0.8rem', borderRadius: '0.5rem',
                                                    background: fac.status === 'Absent' ? '#dc2626' : '#374151',
                                                    color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.8rem'
                                                }}
                                            >
                                                A
                                            </button>
                                            <button
                                                onClick={() => handleStatusChange(fac.id, 'On Leave')}
                                                style={{
                                                    padding: '0.4rem 0.8rem', borderRadius: '0.5rem',
                                                    background: fac.status === 'On Leave' ? '#d97706' : '#374151',
                                                    color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.8rem'
                                                }}
                                            >
                                                L
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <ConfirmModal
                isOpen={showBackfillConfirm}
                onClose={() => setShowBackfillConfirm(false)}
                onConfirm={runBackfill}
                title="Backfill Attendance?"
                message="This will mark ALL faculty as 'Present' from Jan 1, 2026 to Today (excluding Sundays). This is a heavy operation. Continue?"
            />

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

const StatsCard = ({ label, value, color, icon }) => (
    <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
            <p style={{ color: '#9ca3af', margin: '0 0 0.25rem 0', fontSize: '0.9rem' }}>{label}</p>
            <h3 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{value}</h3>
        </div>
        <div style={{ color: color, background: `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, 0.1)`, padding: '0.75rem', borderRadius: '0.75rem' }}>
            {icon}
        </div>
    </div>
);

export default FacultyAttendanceAudit;
