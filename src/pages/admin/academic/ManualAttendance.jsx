import React, { useState, useEffect } from 'react';

import { getDepartments, getSemesters, getStudentsBySemester, recordAttendance, getAttendanceRecords } from '../../../services/academicService';
import { getTimetable } from '../../../services/timetableService';
import { Calendar, Users, Save, CheckCircle, Clock, Database, AlertCircle } from 'lucide-react';

const ManualAttendance = () => {
    const [departments, setDepartments] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const [timetable, setTimetable] = useState(null);
    const [students, setStudents] = useState([]);
    const [existingAttendance, setExistingAttendance] = useState([]);
    const [activeSlot, setActiveSlot] = useState(null); // The slot currently being marked
    const [attendanceState, setAttendanceState] = useState({}); // { studentId: 'Present' | 'Absent' }
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [initError, setInitError] = useState(null);

    // Initial Data Fetch
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Check if services are working
                console.log("Fetching Initial Data...");
                const [d, s] = await Promise.all([getDepartments(), getSemesters()]);
                console.log("Departments:", d);
                console.log("Semesters:", s);
                setDepartments(d);
                setSemesters(s);
            } catch (e) {
                console.error("Failed to load init data", e);
                setInitError(e.message);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Fetch Timetable & Students when Semester Changes
    useEffect(() => {
        if (!selectedSemester) return;

        const fetchSemData = async () => {
            setLoading(true);
            try {
                const [tt, studs] = await Promise.all([
                    getTimetable(selectedSemester),
                    getStudentsBySemester(selectedSemester)
                ]);
                setTimetable(tt);
                setStudents(studs);
                setActiveSlot(null); // Reset active slot
            } catch (error) {
                console.error("Error fetching semester data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSemData();
    }, [selectedSemester]);

    // Get sessions for selected date
    const getDailySessions = () => {
        if (!timetable || !selectedDate) return [];
        const dateObj = new Date(selectedDate);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = days[dateObj.getDay()];
        return timetable[dayName] || [];
    };

    const sessions = getDailySessions();

    const handleSelectSlot = async (slot) => {
        setActiveSlot(slot);
        setLoading(true);
        // Fetch existing attendance for this specific slot/date
        try {
            const records = await getAttendanceRecords({
                semesterId: selectedSemester,
                subjectId: slot.subjectId,
                dateString: selectedDate
            });

            // Initialize state based on existing records or default to Absent (or empty?)
            // Let's default to Absent for safety, or leave unset?
            // "Mark All Present" button helps user.
            const newState = {};
            students.forEach(s => {
                const record = records.find(r => r.studentId === s.id);
                newState[s.id] = record ? record.status : 'Absent';
            });
            setAttendanceState(newState);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = (studentId) => {
        setAttendanceState(prev => ({
            ...prev,
            [studentId]: prev[studentId] === 'Present' ? 'Absent' : 'Present'
        }));
    };

    const markAll = (status) => {
        const newState = {};
        students.forEach(s => newState[s.id] = status);
        setAttendanceState(newState);
    };

    const randomize = () => {
        const newState = {};
        students.forEach(s => newState[s.id] = Math.random() < 0.85 ? 'Present' : 'Absent');
        setAttendanceState(newState);
    };

    const saveAttendance = async () => {
        if (!activeSlot) return;
        setSaving(true);
        try {
            const promises = students.map(student => {
                return recordAttendance({
                    studentId: student.id,
                    studentName: student.name,
                    subjectId: activeSlot.subjectId,
                    subjectName: activeSlot.subjectname,
                    semesterId: selectedSemester,
                    date: new Date(selectedDate),
                    dateString: selectedDate,
                    status: attendanceState[student.id],
                    slotTime: activeSlot.timeRange
                });
            });
            await Promise.all(promises);
            alert("Attendance Saved Successfully!");
            setActiveSlot(null); // Return to list
        } catch (error) {
            console.error("Error saving attendance:", error);
            alert("Failed to save attendance.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', marginBottom: '1rem' }}>Manual Attendance Entry</h1>

                {/* Debug Info / Loading */}
                {initError && (
                    <div style={{ padding: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={20} />
                        Error loading initial data: {initError}
                    </div>
                )}

                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Database size={14} />
                    System Status: {loading ? 'Fetching...' : 'Ready'} |
                    Semesters: {semesters.length} |
                    Departments: {departments.length}
                </div>

                {/* Filters */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem',
                    background: '#1e293b', padding: '1.5rem', borderRadius: '1rem', marginBottom: '2rem'
                }}>
                    <div>
                        <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem' }}>Select Date</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: 'white' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem' }}>Select Semester</label>
                        <select
                            value={selectedSemester}
                            onChange={(e) => setSelectedSemester(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: 'white' }}
                        >
                            <option value="">Choose Semester...</option>
                            {semesters.map(s => <option key={s.id} value={s.id}>Semester {s.semesterNo}</option>)}
                        </select>
                    </div>
                </div>

                {/* Bulk Auto-Fill Section (Temporary) */}
                <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)', padding: '1.5rem', borderRadius: '1rem', marginBottom: '2rem' }}>
                    <h3 style={{ color: '#fbbf24', marginTop: 0 }}>⚡ Bulk Auto-Fill (Temporary Tool)</h3>
                    <p style={{ color: '#d1d5db', fontSize: '0.9rem' }}>Automatically generate random attendance for the selected Semester for a date range.</p>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'end', marginTop: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Start Date</label>
                            <input
                                type="date"
                                id="bulkStartDate"
                                defaultValue="2026-01-01"
                                style={{ padding: '0.5rem', borderRadius: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: 'white' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.25rem' }}>End Date</label>
                            <input
                                type="date"
                                id="bulkEndDate"
                                defaultValue={new Date().toISOString().split('T')[0]}
                                style={{ padding: '0.5rem', borderRadius: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: 'white' }}
                            />
                        </div>
                        <button
                            onClick={async () => {
                                if (!selectedSemester || !timetable || students.length === 0) {
                                    alert("Please select a valid Semester first (with students and timetable loaded).");
                                    return;
                                }

                                const startStr = document.getElementById('bulkStartDate').value;
                                const endStr = document.getElementById('bulkEndDate').value;
                                if (!startStr || !endStr) return;

                                const startDate = new Date(startStr);
                                const endDate = new Date(endStr);
                                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                let count = 0;
                                setSaving(true);

                                try {
                                    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                                        const dayName = days[d.getDay()];
                                        // Skip Sunday/Saturday
                                        if (dayName === 'Sunday' || dayName === 'Saturday') continue;

                                        const daySlots = timetable[dayName] || [];
                                        if (daySlots.length === 0) continue;

                                        const dateString = d.toISOString().split('T')[0];
                                        const promises = [];

                                        for (const slot of daySlots) {
                                            for (const student of students) {
                                                const status = Math.random() < 0.85 ? 'Present' : 'Absent';
                                                promises.push(recordAttendance({
                                                    studentId: student.id,
                                                    studentName: student.name,
                                                    subjectId: slot.subjectId,
                                                    subjectName: slot.subjectname,
                                                    semesterId: selectedSemester,
                                                    date: new Date(d),
                                                    dateString: dateString,
                                                    status: status,
                                                    slotTime: slot.timeRange
                                                }));
                                                count++;
                                            }
                                        }
                                        await Promise.all(promises); // Batch per day
                                    }
                                    alert(`Success! Generated ${count} records.`);
                                } catch (e) {
                                    console.error(e);
                                    alert("Error during bulk generation: " + e.message);
                                } finally {
                                    setSaving(false);
                                }
                            }}
                            disabled={saving}
                            style={{
                                padding: '0.6rem 1.5rem', background: '#fbbf24', color: 'black', fontWeight: 'bold',
                                border: 'none', borderRadius: '0.5rem', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1
                            }}
                        >
                            {saving ? 'Processing...' : 'Generate Dummy Data'}
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                {!selectedSemester ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
                        Please select a Semester and Date to begin.
                    </div>
                ) : activeSlot ? (
                    /* Attendance Taking View */
                    <div style={{ background: '#1e293b', borderRadius: '1rem', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div>
                                <button onClick={() => setActiveSlot(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', marginBottom: '0.5rem' }}>← Back to Sessions</button>
                                <h2 style={{ color: 'white', margin: 0 }}>{activeSlot.subjectname}</h2>
                                <span style={{ color: '#94a3b8' }}>{activeSlot.timeRange}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button onClick={() => markAll('Present')} style={{ padding: '0.5rem 1rem', background: '#0f766e', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>Mark All Present</button>
                                <button onClick={randomize} style={{ padding: '0.5rem 1rem', background: '#334155', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>Randomize</button>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', maxHeight: '500px', overflowY: 'auto', marginBottom: '2rem' }}>
                            {students.map(student => (
                                <div key={student.id}
                                    onClick={() => toggleStatus(student.id)}
                                    style={{
                                        padding: '1rem', borderRadius: '0.5rem', border: '1px solid', cursor: 'pointer',
                                        background: attendanceState[student.id] === 'Present' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        borderColor: attendanceState[student.id] === 'Present' ? '#10b981' : '#ef4444',
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                    }}
                                >
                                    <div>
                                        <div style={{ color: 'white', fontWeight: 500 }}>{student.name}</div>
                                        <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{student.regNo}</div>
                                    </div>
                                    <div style={{
                                        fontWeight: 'bold',
                                        color: attendanceState[student.id] === 'Present' ? '#34d399' : '#f87171'
                                    }}>
                                        {attendanceState[student.id]}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ textAlign: 'right' }}>
                            <button
                                onClick={saveAttendance}
                                disabled={saving}
                                style={{
                                    padding: '1rem 3rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem',
                                    fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', opacity: saving ? 0.7 : 1
                                }}
                            >
                                {saving ? 'Saving...' : 'Save Attendance'}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Sessions List */
                    <div>
                        <h3 style={{ color: 'white', marginBottom: '1rem' }}>Scheduled Classes for {selectedDate}</h3>
                        {sessions.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', background: '#1e293b', borderRadius: '1rem', color: '#94a3b8' }}>
                                No classes scheduled for this day (or timetable not found).
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {sessions.map((slot, idx) => (
                                    <div key={idx} style={{
                                        background: '#1e293b', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #334155',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                            <div style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '0.5rem', textAlign: 'center', minWidth: '100px' }}>
                                                <Clock size={20} color="#38bdf8" style={{ marginBottom: '0.25rem' }} />
                                                <div style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>{slot.timeRange}</div>
                                            </div>
                                            <div>
                                                <h3 style={{ color: 'white', margin: '0 0 0.25rem 0' }}>{slot.subjectname}</h3>
                                                <span style={{ color: '#94a3b8' }}>Period {slot.periodIndex + 1}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleSelectSlot(slot)}
                                            style={{
                                                padding: '0.75rem 1.5rem', background: 'transparent', border: '1px solid #38bdf8', color: '#38bdf8',
                                                borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
                                            }}
                                        >
                                            Take Attendance <Users size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

export default ManualAttendance;
