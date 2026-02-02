import React, { useState, useEffect } from 'react';
import { getDepartments, getSemesters, getStudentsBySemester, getAttendanceRecords, recordAttendance } from '../../../services/academicService';
import { getTimetable } from '../../../services/timetableService';
import { Calendar, Filter, Users, Check, X, Minus, Save } from 'lucide-react';

const AttendanceRecords = () => {
    const [departments, setDepartments] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const [loading, setLoading] = useState(false);
    const [students, setStudents] = useState([]);
    const [timetable, setTimetable] = useState(null);
    const [attendanceMap, setAttendanceMap] = useState({}); // { studentId_slotIndex: status }
    const [displaySlots, setDisplaySlots] = useState([]); // Slots to render (historical or current)
    const [unsavedChanges, setUnsavedChanges] = useState({}); // { studentId_slotTime: newStatus }
    const [saving, setSaving] = useState(false);

    // Check if editable (within 7 days)
    const isEditable = () => {
        if (!selectedDate) return false;
        const selected = new Date(selectedDate);
        const today = new Date();
        const diffTime = Math.abs(today - selected);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
    };

    const canEdit = isEditable();

    const toggleStatus = (studentId, slotTime, currentStatus) => {
        if (!canEdit) {
            alert("Attendance older than 7 days cannot be edited.");
            return;
        }

        const key = `${studentId}_${slotTime}`;
        const effectiveStatus = unsavedChanges[key] !== undefined ? unsavedChanges[key] : currentStatus;

        let newStatus = 'Present';
        if (effectiveStatus === 'Present') newStatus = 'Absent';

        setUnsavedChanges(prev => ({
            ...prev,
            [key]: newStatus
        }));
    };

    const saveChanges = async () => {
        if (Object.keys(unsavedChanges).length === 0) return;
        setSaving(true);
        try {
            const promises = Object.entries(unsavedChanges).map(([key, status]) => {
                const [studentId, slotTime] = key.split('_');

                // Look up in displaySlots (which is now the source of truth for the view)
                const slot = displaySlots.find(s => s.timeRange === slotTime);

                if (!slot) return null;

                const student = students.find(s => s.id === studentId);

                return recordAttendance({
                    studentId,
                    studentName: student?.name || 'Unknown',
                    subjectId: slot.subjectId,
                    subjectName: slot.subjectname,
                    semesterId: selectedSemester,
                    date: new Date(selectedDate),
                    dateString: selectedDate,
                    status: status,
                    slotTime: slotTime
                });
            }).filter(p => p !== null);

            await Promise.all(promises);

            setAttendanceMap(prev => ({ ...prev, ...unsavedChanges }));
            setUnsavedChanges({});
            alert("Changes saved!");

        } catch (error) {
            console.error(error);
            alert("Failed to save changes.");
        } finally {
            setSaving(false);
        }
    };

    // Initial Load
    useEffect(() => {
        const loadFilters = async () => {
            const [d, s] = await Promise.all([getDepartments(), getSemesters()]);
            setDepartments(d);
            setSemesters(s);
        };
        loadFilters();
    }, []);

    // Fetch Data
    useEffect(() => {
        if (!selectedSemester || !selectedDate) return;

        const fetchData = async () => {
            setLoading(true);
            setUnsavedChanges({});
            try {
                const [studs, tt, records] = await Promise.all([
                    getStudentsBySemester(selectedSemester),
                    getTimetable(selectedSemester),
                    getAttendanceRecords({ semesterId: selectedSemester, dateString: selectedDate })
                ]);

                setStudents(studs);
                setTimetable(tt);

                // Build fast lookup map
                const map = {};
                if (records) {
                    records.forEach(r => {
                        if (r.studentId && r.slotTime) {
                            map[`${r.studentId}_${r.slotTime}`] = r.status;
                        }
                    });
                }
                setAttendanceMap(map);

                // --- DETERMINE SLOTS TO DISPLAY ---
                if (records && records.length > 0) {
                    // Scenario A: Historical Data Exists
                    const uniqueSlots = [];
                    const seen = new Set();

                    records.forEach(r => {
                        const time = r.slotTime || 'Unknown Time';
                        const uniqueKey = time;

                        if (!seen.has(uniqueKey)) {
                            seen.add(uniqueKey);
                            uniqueSlots.push({
                                timeRange: time,
                                subjectname: r.subjectName || r.subjectname || 'Unknown Subject',
                                subjectId: r.subjectId || 'unknown'
                            });
                        }
                    });

                    // Safe sort
                    uniqueSlots.sort((a, b) => {
                        const t1 = a.timeRange || '';
                        const t2 = b.timeRange || '';
                        return t1.localeCompare(t2);
                    });

                    setDisplaySlots(uniqueSlots);
                } else {
                    // Scenario B: No Data -> Use Current Timetable
                    const dateObj = new Date(selectedDate);
                    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const dayName = days[dateObj.getDay()];
                    const currentSlots = tt ? (tt[dayName] || []) : [];
                    setDisplaySlots(currentSlots);
                }

            } catch (error) {
                console.error(error);
                setDisplaySlots([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedSemester, selectedDate]);

    // Derived Data for View
    const slots = displaySlots;

    // Calculate Daily Stats
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalSlots = 0;

    Object.keys(attendanceMap).forEach(key => {
        const studentId = key.split('_')[0];
        // Ensure this student is in the current semester list to avoid counting stale data
        if (students.find(s => s.id === studentId)) {
            if (attendanceMap[key] === 'Present') totalPresent++;
            if (attendanceMap[key] === 'Absent') totalAbsent++;
            totalSlots++;
        }
    });

    // Also count unsaved changes in calculation for immediate feedback? 
    // For simplicity, we stick to saved data 'attendanceMap' or mix? 
    // Let's stick to 'attendanceMap' + 'unsavedChanges' merge for live view.
    // Re-calculating with merge:
    let livePresent = 0;
    let liveAbsent = 0;
    let liveTotal = 0;

    // Iterate over all cells (students * displaySlots)
    students.forEach(student => {
        slots.forEach(slot => {
            const key = `${student.id}_${slot.timeRange}`;
            const status = unsavedChanges[key] !== undefined ? unsavedChanges[key] : attendanceMap[key];
            if (status === 'Present') livePresent++;
            if (status === 'Absent') liveAbsent++;
            if (status) liveTotal++;
        });
    });

    const dailyRate = liveTotal > 0 ? ((livePresent / liveTotal) * 100).toFixed(1) : 0;

    const filterStyle = {
        padding: '0.75rem', borderRadius: '0.75rem',
        background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255,255,255,0.1)',
        color: 'white', outline: 'none', backdropFilter: 'blur(10px)',
        transition: 'all 0.2s',
        fontSize: '0.9rem'
    };

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{
                        fontSize: '2.5rem', fontWeight: '800', margin: '0 0 0.5rem 0',
                        background: 'linear-gradient(to right, #fff, #94a3b8)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                    }}>
                        Attendance Records
                    </h1>
                    <p style={{ color: '#94a3b8', margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        Daily Attendance Sheet
                        {selectedDate && (canEdit ?
                            <span style={{
                                background: 'rgba(16, 185, 129, 0.1)', color: '#34d399',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                padding: '0.2rem 0.8rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600
                            }}>
                                ● Live Editing
                            </span>
                            :
                            <span style={{
                                background: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8',
                                border: '1px solid rgba(148, 163, 184, 0.2)',
                                padding: '0.2rem 0.8rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600
                            }}>
                                🔒 Read Only
                            </span>
                        )}
                    </p>
                </div>
                {Object.keys(unsavedChanges).length > 0 && (
                    <button
                        onClick={saveChanges}
                        disabled={saving}
                        style={{
                            padding: '0.75rem 2rem',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            color: 'white',
                            border: 'none', borderRadius: '1rem', fontWeight: 'bold', cursor: 'pointer',
                            boxShadow: '0 4px 20px rgba(37, 99, 235, 0.4), 0 0 0 1px rgba(255,255,255,0.1) inset',
                            display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'transform 0.2s',
                            transform: saving ? 'scale(0.98)' : 'scale(1)'
                        }}
                    >
                        {saving ? <div className="spinner-small" /> : <Save size={18} />}
                        {saving ? 'Syncing...' : `Save ${Object.keys(unsavedChanges).length} Changes`}
                    </button>
                )}
            </div>

            {/* Premium Stats Bar */}
            {selectedSemester && !loading && (
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem',
                    marginBottom: '2rem'
                }}>
                    <div style={{
                        background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.8))',
                        backdropFilter: 'blur(12px)',
                        padding: '1.5rem', borderRadius: '1.25rem',
                        border: '1px solid rgba(255,255,255,0.05)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                    }}>
                        <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Daily Attendance Rate</div>
                        <div style={{ fontSize: '2rem', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.02em' }}>
                            {dailyRate}%
                        </div>
                        <div style={{ height: '4px', width: '100%', background: 'rgba(255,255,255,0.05)', marginTop: '1rem', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${dailyRate}%`, background: dailyRate > 75 ? '#34d399' : '#f87171', borderRadius: '2px' }} />
                        </div>
                    </div>

                    <div style={{
                        background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.8))',
                        backdropFilter: 'blur(12px)',
                        padding: '1.5rem', borderRadius: '1.25rem',
                        border: '1px solid rgba(255,255,255,0.05)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                    }}>
                        <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Avg. Class Attendance</div>
                        <div style={{ fontSize: '2rem', fontWeight: '800', color: '#34d399', letterSpacing: '-0.02em' }}>
                            {slots.length > 0 ? Math.round(livePresent / slots.length) : 0}
                            <span style={{ fontSize: '1rem', color: '#475569', fontWeight: '500', marginLeft: '0.5rem' }}>/ {students.length} Students</span>
                        </div>
                    </div>

                    <div style={{
                        background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.8))',
                        backdropFilter: 'blur(12px)',
                        padding: '1.5rem', borderRadius: '1.25rem',
                        border: '1px solid rgba(255,255,255,0.05)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                    }}>
                        <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Classes</div>
                        <div style={{ fontSize: '2rem', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.02em' }}>
                            {slots.length}
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem',
                background: 'rgba(30, 41, 59, 0.4)', padding: '1.5rem', borderRadius: '1.25rem',
                border: '1px solid rgba(255,255,255,0.05)', marginBottom: '2.5rem',
                backdropFilter: 'blur(10px)'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.01em' }}>Department</label>
                    <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} style={filterStyle}>
                        <option value="">Select Department...</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.01em' }}>Semester</label>
                    <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)} style={filterStyle}>
                        <option value="">Select Semester...</option>
                        {semesters.map(s => <option key={s.id} value={s.id}>Semester {s.semesterNo}</option>)}
                    </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.01em' }}>Date</label>
                    <input
                        type="date"
                        min="2026-01-01"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        style={filterStyle}
                    />
                </div>
            </div>

            {/* MATRIX VIEW */}
            {!selectedSemester ? (
                <div style={{ textAlign: 'center', padding: '6rem 2rem', color: '#64748b', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <Filter size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                    <div style={{ fontSize: '1.1rem' }}>Please select Department and Semester to view records.</div>
                </div>
            ) : loading ? (
                <div style={{ textAlign: 'center', padding: '6rem 2rem', color: '#38bdf8' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    Loading Live Data...
                </div>
            ) : (
                <div style={{
                    background: '#0f172a',
                    borderRadius: '1.25rem', overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                }}>
                    {slots.length === 0 ? (
                        <div style={{ padding: '5rem 2rem', textAlign: 'center', color: '#94a3b8' }}>
                            <Calendar size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                            <div style={{ fontSize: '1.1rem' }}>No classes scheduled or recorded for <strong>{selectedDate}</strong>.</div>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto', maxHeight: '70vh' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, color: 'white' }}>
                                <thead>
                                    <tr style={{ background: '#0f172a' }}>
                                        <th style={{
                                            padding: '0.75rem 0.5rem', textAlign: 'left', minWidth: '180px',
                                            position: 'sticky', left: 0, top: 0,
                                            background: '#0f172a', zIndex: 30,
                                            borderBottom: '1px solid #334155', borderRight: '1px solid #334155'
                                        }}>
                                            Student Name
                                        </th>
                                        {slots.map((slot, idx) => (
                                            <th key={idx} style={{
                                                padding: '0.5rem', textAlign: 'center', minWidth: '80px',
                                                position: 'sticky', top: 0,
                                                background: '#0f172a', zIndex: 20,
                                                borderBottom: '1px solid #334155', borderLeft: '1px solid #334155'
                                            }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{slot.subjectname}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 'normal' }}>{slot.timeRange}</div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.length === 0 ? (
                                        <tr><td colSpan={slots.length + 1} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No Students found.</td></tr>
                                    ) : (
                                        students.map(student => (
                                            <tr key={student.id} style={{ background: 'transparent' }}>
                                                <td style={{
                                                    padding: '0.5rem',
                                                    position: 'sticky', left: 0,
                                                    background: '#1e293b', zIndex: 10,
                                                    borderRight: '1px solid #334155',
                                                    borderBottom: '1px solid #334155'
                                                }}>
                                                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{student.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{student.regNo}</div>
                                                </td>
                                                {slots.map((slot, idx) => {
                                                    const key = `${student.id}_${slot.timeRange}`;
                                                    const status = unsavedChanges[key] !== undefined ? unsavedChanges[key] : attendanceMap[key];

                                                    return (
                                                        <td
                                                            key={idx}
                                                            onClick={() => toggleStatus(student.id, slot.timeRange, status)}
                                                            style={{
                                                                textAlign: 'center', padding: '0.25rem',
                                                                borderLeft: '1px solid #334155',
                                                                borderBottom: '1px solid #334155',
                                                                cursor: canEdit ? 'pointer' : 'default',
                                                                background: unsavedChanges[key] !== undefined ? 'rgba(255, 255, 255, 0.05)' : 'transparent'
                                                            }}
                                                            title={canEdit ? "Click to toggle" : "View only"}
                                                        >
                                                            {status === 'Present' ? (
                                                                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                                                                    <Check size={16} />
                                                                </div>
                                                            ) : status === 'Absent' ? (
                                                                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
                                                                    <X size={16} />
                                                                </div>
                                                            ) : (
                                                                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: '#334155', color: '#94a3b8' }}>
                                                                    <Minus size={16} />
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AttendanceRecords;
