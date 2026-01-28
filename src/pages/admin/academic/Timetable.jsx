import React, { useState, useEffect } from 'react';
import { getDepartments, getCourses, getSemesters, getSubjects } from '../../../services/academicService';
import { saveTimetable, getTimetable } from '../../../services/timetableService';
import Toast from '../../../components/common/Toast';
import { Calendar, Save, Trash2, Clock, X, Plus } from 'lucide-react';

const Timetable = () => {
    // Filters
    const [departments, setDepartments] = useState([]);
    const [courses, setCourses] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('');

    // Data
    const [subjects, setSubjects] = useState([]);
    const [schedule, setSchedule] = useState({}); // { Monday: [slot1, slot2...], ... }
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    // Edit Modal State
    const [editingSlot, setEditingSlot] = useState(null); // { day, periodIndex }
    const [isOpen, setIsOpen] = useState(false);

    // Constants
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const periods = [
        { start: '09:00', end: '10:00' },
        { start: '10:00', end: '11:00' },
        { start: '11:15', end: '12:15' },
        { start: '12:15', end: '13:15' },
        { start: '14:00', end: '15:00' },
        { start: '15:00', end: '16:00' }
    ];

    // Auxiliary subjects for manual entry
    const auxSubjects = [
        { id: 'lib', name: 'Library' },
        { id: 'sports', name: 'Sports' },
        { id: 'seminar', name: 'Seminar' },
        { id: 'break', name: 'Break/Lunch' }
    ];

    // --- Init ---
    useEffect(() => {
        loadFilters();
    }, []);

    const loadFilters = async () => {
        try {
            const [d, c, s] = await Promise.all([getDepartments(), getCourses(), getSemesters()]);
            setDepartments(d);
            setCourses(c);
            setSemesters(s);
        } catch (error) {
            console.error(error);
        }
    };

    // --- Data Fetching ---
    useEffect(() => {
        if (selectedSemester) {
            fetchData();
        } else {
            setSchedule({});
            setSubjects([]);
        }
    }, [selectedSemester]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const allSubs = await getSubjects();
            const semSubs = allSubs.filter(sub => sub.semesterId === selectedSemester);
            setSubjects(semSubs);

            const existing = await getTimetable(selectedSemester);
            if (existing) {
                setSchedule(existing);
            } else {
                setSchedule({}); // Start empty
            }
        } catch (error) {
            console.error(error);
            setToast({ message: "Failed to load timetable.", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // --- Actions ---

    // Open Modal
    const handleSlotClick = (day, periodIndex) => {
        setEditingSlot({ day, periodIndex });
        setIsOpen(true);
    };

    // Assign Subject to Slot
    const handleAssignSubject = (subject) => {
        const { day, periodIndex } = editingSlot;

        const daySchedule = schedule[day] ? [...schedule[day]] : [];

        // Remove existing slot if any for this period
        const filtered = daySchedule.filter(s => s.periodIndex !== periodIndex);

        // Add new slot
        filtered.push({
            periodIndex,
            timeRange: `${periods[periodIndex].start} - ${periods[periodIndex].end}`,
            subjectId: subject.id,
            subjectname: subject.name,
            facultyId: null // Future: Allow selecting faculty
        });

        const newSchedule = { ...schedule, [day]: filtered };
        setSchedule(newSchedule);
        setIsOpen(false);
        setEditingSlot(null);
    };

    // Clear specific slot
    const handleClearSlot = () => {
        const { day, periodIndex } = editingSlot;
        const daySchedule = schedule[day] ? [...schedule[day]] : [];

        // Remove existing slot
        const filtered = daySchedule.filter(s => s.periodIndex !== periodIndex);

        setSchedule({ ...schedule, [day]: filtered });
        setIsOpen(false);
        setEditingSlot(null);
    };

    const handleSave = async () => {
        try {
            await saveTimetable(selectedSemester, schedule);
            setToast({ message: "Timetable saved successfully.", type: 'success' });
        } catch (error) {
            setToast({ message: "Failed to save.", type: 'error' });
        }
    };

    const handleClearAll = () => {
        if (window.confirm("Clear the entire table? unsaved changes will be loss.")) {
            setSchedule({});
        }
    };

    // --- Render Helpers ---

    const filteredCourses = courses.filter(c => c.departmentId === selectedDept);
    const filteredSemesters = semesters.filter(s => s.courseId === selectedCourse);

    return (
        <div style={{ padding: '2rem', position: 'relative' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: 'white' }}>Class Timetable</h1>
                    <p style={{ color: '#9ca3af', margin: 0 }}>Manually assign subjects to weekly slots.</p>
                </div>
                {selectedSemester && (
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={handleClearAll} style={btnStyleSecondary}>
                            <Trash2 size={18} /> Clear All
                        </button>
                        <button onClick={handleSave} style={btnStylePrimary}>
                            <Save size={18} /> Save Changes
                        </button>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px', background: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                    <label style={labelStyle}>Department</label>
                    <select value={selectedDept} onChange={(e) => { setSelectedDept(e.target.value); setSelectedCourse(''); setSelectedSemester(''); }} style={selectStyle}>
                        <option value="">Select Department...</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>
                <div>
                    <label style={labelStyle}>Course</label>
                    <select value={selectedCourse} onChange={(e) => { setSelectedCourse(e.target.value); setSelectedSemester(''); }} style={selectStyle} disabled={!selectedDept}>
                        <option value="">Select Course...</option>
                        {filteredCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label style={labelStyle}>Semester</label>
                    <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)} style={selectStyle} disabled={!selectedCourse}>
                        <option value="">Select Semester...</option>
                        {filteredSemesters.map(s => <option key={s.id} value={s.id}>Semester {s.semesterNo}</option>)}
                    </select>
                </div>
            </div>

            {/* Grid Content */}
            {loading ? (
                <div style={{ color: 'white', textAlign: 'center', padding: '3rem' }}>Loading schedule...</div>
            ) : !selectedSemester ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b', border: '2px dashed rgba(255,255,255,0.05)', borderRadius: '1rem' }}>
                    <Calendar size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                    <p>Select a Semester to manage timetable.</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto', background: '#111827', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead>
                            <tr>
                                <th style={thStyle}><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={16} /> Day / Time</div></th>
                                {periods.map((p, i) => (
                                    <th key={i} style={{ ...thStyle, textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.9rem', color: 'white' }}>Period {i + 1}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'normal' }}>{p.start} - {p.end}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {days.map(day => (
                                <tr key={day} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ ...tdStyle, fontWeight: 'bold', color: '#e2e8f0', background: 'rgba(255,255,255,0.02)' }}>{day}</td>
                                    {periods.map((period, pIndex) => {
                                        const slot = schedule[day]?.find(s => s.periodIndex === pIndex);
                                        return (
                                            <td key={pIndex}
                                                style={{ ...tdStyle, cursor: 'pointer', transition: 'background 0.2s', position: 'relative' }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                onClick={() => handleSlotClick(day, pIndex)}
                                            >
                                                {slot ? (
                                                    <div style={{ background: 'rgba(20, 184, 166, 0.1)', border: '1px solid rgba(20, 184, 166, 0.2)', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                                                        <div style={{ fontWeight: 600, color: '#2dd4bf', fontSize: '0.85rem' }}>{slot.subjectname}</div>
                                                    </div>
                                                ) : (
                                                    <div style={{
                                                        height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '6px'
                                                    }}>
                                                        <Plus size={14} color="#475569" />
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Selection Modal */}
            {isOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                    zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{
                        background: '#1f2937', width: '400px', borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                        overflow: 'hidden'
                    }}>
                        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>Assign Subject</h3>
                            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <div style={{ padding: '16px' }}>
                            <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '16px' }}>
                                Select a subject for <strong>{editingSlot?.day}</strong> at <strong>{periods[editingSlot?.periodIndex].start}</strong>
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                                {subjects.map(sub => (
                                    <button
                                        key={sub.id}
                                        onClick={() => handleAssignSubject(sub)}
                                        style={optionBtnStyle}
                                    >
                                        {sub.name}
                                    </button>
                                ))}
                                {auxSubjects.map(sub => (
                                    <button
                                        key={sub.id}
                                        onClick={() => handleAssignSubject(sub)}
                                        style={{ ...optionBtnStyle, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                                    >
                                        {sub.name}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleClearSlot}
                                style={{ width: '100%', padding: '10px', marginTop: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', cursor: 'pointer' }}
                            >
                                Clear This Slot
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

// Styles
const labelStyle = { display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '8px' };
const selectStyle = { width: '100%', padding: '10px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: 'white', outline: 'none' };
const btnStylePrimary = { background: '#14b8a6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' };
const btnStyleSecondary = { background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' };
const thStyle = { padding: '1rem', textAlign: 'left', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' };
const tdStyle = { padding: '0.5rem', borderRight: '1px solid rgba(255,255,255,0.05)', minWidth: '140px' };
const optionBtnStyle = {
    padding: '10px', borderRadius: '6px', background: 'rgba(20, 184, 166, 0.1)',
    border: '1px solid rgba(20, 184, 166, 0.2)', color: '#e2e8f0',
    cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem', fontWeight: 500,
    transition: 'all 0.2s'
};

export default Timetable;
