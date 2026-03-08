import React, { useState, useEffect } from 'react';
import { fetchAllUsers, getTodayFacultyAttendance, updateFacultyDailyAttendance } from '../../services/adminService';
import { Calendar, Search, CheckCircle, XCircle, UserX, Save, Loader2 } from 'lucide-react';

const AdminFacultyAttendance = () => {
    const [facultyList, setFacultyList] = useState([]);
    const [attendanceDict, setAttendanceDict] = useState({}); // mapping: facultyId -> record details
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [updatingState, setUpdatingState] = useState({});

    useEffect(() => {
        loadData();
    }, [selectedDate]); // Reload when date changes

    const loadData = async () => {
        setLoading(true);
        try {
            const allUsers = await fetchAllUsers();
            const filteredFaculty = allUsers.filter(u => u.role === 'faculty' || u.role === 'class_teacher');
            setFacultyList(filteredFaculty);

            // Fetch attendance logs for the specific `selectedDate`
            // Note: `getTodayFacultyAttendance` only fetches "today". 
            // We need a helper or a custom query. Let's do it directly here for speed, or modify the service.
            // Since we don't have a `getAttendanceByDate` exported yet, we'll fetch all faculty_attendance where dateString == selectedDate
            // Re-using the logic from adminService
            const { db } = await import('../../services/firebase');
            const { collection, query, where, getDocs } = await import('firebase/firestore');

            const q = query(collection(db, "faculty_attendance"), where("dateString", "==", selectedDate));
            const snap = await getDocs(q);
            const records = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const dict = {};
            records.forEach(r => dict[r.facultyId] = r);
            setAttendanceDict(dict);

        } catch (error) {
            console.error("Error loading faculty attendance data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOverride = async (facultyId, newStatus) => {
        setUpdatingState(prev => ({ ...prev, [facultyId]: true }));
        try {
            await updateFacultyDailyAttendance(facultyId, selectedDate, newStatus);
            // Update local state instantly
            setAttendanceDict(prev => ({
                ...prev,
                [facultyId]: {
                    ...prev[facultyId],
                    status: newStatus,
                    isManualOverride: true
                }
            }));
        } catch (error) {
            console.error("Failed to override attendance", error);
            alert("Failed to override attendance.");
        } finally {
            setUpdatingState(prev => ({ ...prev, [facultyId]: false }));
        }
    };

    const displayFaculty = facultyList.filter(f =>
        (f.displayName || f.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.department || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>Faculty Attendance Manager</h1>
                    <p style={{ color: '#94a3b8' }}>Manually correct or override daily attendance logs for faculty members.</p>
                </div>
            </div>

            <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155', marginBottom: '2rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '250px' }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Select Date</label>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '0.5rem 1rem' }}>
                        <Calendar size={18} color="#94a3b8" style={{ marginRight: '0.5rem' }} />
                        <input
                            type="date"
                            value={selectedDate}
                            max={new Date().toISOString().split('T')[0]} // Block future dates
                            onChange={(e) => setSelectedDate(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', flex: 1 }}
                        />
                    </div>
                </div>

                <div style={{ flex: 2, minWidth: '300px' }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Search Faculty</label>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '0.5rem 1rem' }}>
                        <Search size={18} color="#94a3b8" style={{ marginRight: '0.5rem' }} />
                        <input
                            type="text"
                            placeholder="Search by name or department..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%' }}
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                    <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto', marginBottom: '1rem', color: '#3b82f6' }} />
                    Loading attendance data...
                </div>
            ) : (
                <div style={{ background: '#0f172a', borderRadius: '16px', border: '1px solid #334155', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>
                                <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontWeight: 600 }}>Faculty Name</th>
                                <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontWeight: 600 }}>Department</th>
                                <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontWeight: 600 }}>Current Status</th>
                                <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontWeight: 600 }}>Completed Classes</th>
                                <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontWeight: 600, textAlign: 'right' }}>Manual Override</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayFaculty.map(faculty => {
                                const record = attendanceDict[faculty.id || faculty.uid];
                                const currentStatus = record?.status || 'Pending';

                                let statusColor = '#94a3b8';
                                let statusBg = '#334155';
                                if (currentStatus === 'Present') { statusColor = '#22c55e'; statusBg = 'rgba(34, 197, 94, 0.1)'; }
                                else if (currentStatus === 'Absent') { statusColor = '#ef4444'; statusBg = 'rgba(239, 68, 68, 0.1)'; }
                                else if (currentStatus === 'On-Leave') { statusColor = '#eab308'; statusBg = 'rgba(234, 179, 8, 0.1)'; }

                                const isUpdating = updatingState[faculty.id || faculty.uid];

                                return (
                                    <tr key={faculty.id || faculty.uid} style={{ borderBottom: '1px solid #1e293b', transition: 'background 0.2s' }}>
                                        <td style={{ padding: '1rem 1.5rem', color: 'white', fontWeight: 500 }}>
                                            {faculty.displayName || faculty.name || faculty.email}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', color: '#cbd5e1' }}>
                                            {faculty.department || 'N/A'}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                                padding: '4px 12px', borderRadius: '2rem', fontSize: '0.875rem', fontWeight: 600,
                                                color: statusColor, background: statusBg, border: `1px solid ${statusColor}40`
                                            }}>
                                                {currentStatus}
                                                {record?.isManualOverride && (
                                                    <span title="Manually Overridden" style={{ color: '#3b82f6', marginLeft: '4px' }}>
                                                        <Save size={14} />
                                                    </span>
                                                )}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', color: '#94a3b8' }}>
                                            {record ? (
                                                record.isManualOverride ? 'N/A (Override)' : `${record.completedClasses || 0} / ${record.targetClasses || 0}`
                                            ) : '-'}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', opacity: isUpdating ? 0.5 : 1, pointerEvents: isUpdating ? 'none' : 'auto' }}>
                                                <button
                                                    onClick={() => handleOverride(faculty.id || faculty.uid, 'Present')}
                                                    title="Mark Present"
                                                    style={{ background: '#1e293b', border: '1px solid #334155', padding: '8px', borderRadius: '8px', color: '#22c55e', cursor: 'pointer' }}
                                                >
                                                    <CheckCircle size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleOverride(faculty.id || faculty.uid, 'On-Leave')}
                                                    title="Mark On-Leave"
                                                    style={{ background: '#1e293b', border: '1px solid #334155', padding: '8px', borderRadius: '8px', color: '#eab308', cursor: 'pointer' }}
                                                >
                                                    <UserX size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleOverride(faculty.id || faculty.uid, 'Absent')}
                                                    title="Mark Absent"
                                                    style={{ background: '#1e293b', border: '1px solid #334155', padding: '8px', borderRadius: '8px', color: '#ef4444', cursor: 'pointer' }}
                                                >
                                                    <XCircle size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {displayFaculty.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                                        No faculty found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )
            }
        </div >
    );
};

export default AdminFacultyAttendance;
