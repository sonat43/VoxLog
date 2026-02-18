import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Layers, Clock, ArrowLeft, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSemesters } from '../../services/academicService';
import { getTimetable } from '../../services/timetableService';
import { getSubstitutionsForClass } from '../../services/substitutionService';
import { useAuth } from '../../context/AuthContext';

const FacultyTimetables = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [semesters, setSemesters] = useState([]);
    const [selectedSemester, setSelectedSemester] = useState('');

    // Initialize with local date
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const [selectedDate, setSelectedDate] = useState(`${year}-${month}-${day}`);

    const [timetable, setTimetable] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch Semesters on Mount
    useEffect(() => {
        const fetchSemesters = async () => {
            try {
                const sems = await getSemesters();
                setSemesters(sems);
                if (sems.length > 0) setSelectedSemester(sems[0].id);
            } catch (error) {
                console.error("Error fetching semesters:", error);
            }
        };
        fetchSemesters();
    }, []);

    // Fetch Timetable & Substitutions when selection changes
    useEffect(() => {
        const fetchData = async () => {
            if (!selectedSemester || !selectedDate) return;
            setLoading(true);

            try {
                // 1. Get Recurring Timetable
                const scheduleData = await getTimetable(selectedSemester);

                // Determine Day Name
                const dateObj = new Date(selectedDate);
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const dayName = days[dateObj.getDay()];

                let slots = [];
                if (scheduleData && scheduleData[dayName]) {
                    slots = scheduleData[dayName].map(slot => ({
                        ...slot,
                        type: 'Regular',
                        displayStatus: 'Scheduled'
                    }));
                }

                // 2. Get Substitutions
                const subs = await getSubstitutionsForClass(selectedSemester, selectedDate);

                // 3. Merge
                // Create a map of substitutions by periodIndex
                const subMap = {};
                subs.forEach(s => {
                    subMap[s.periodIndex] = s;
                });

                // Apply substitutions to slots
                const mergedSlots = slots.map(slot => {
                    if (subMap[slot.periodIndex]) {
                        const sub = subMap[slot.periodIndex];
                        return {
                            ...slot,
                            type: 'Substitution',
                            substituteName: sub.substituteName || 'Assigned Faculty',
                            originalFacultyName: sub.originalFacultyName,
                            displayStatus: 'Substituted',
                            subjectname: sub.subjectName || slot.subjectname // In case subject changed? Usually same subject, diff faculty.
                        };
                    }
                    return slot;
                });

                // Add any substitutions that might be for extra periods (unlikely but possible)
                subs.forEach(sub => {
                    const existing = mergedSlots.find(s => s.periodIndex === sub.periodIndex);
                    if (!existing) {
                        mergedSlots.push({
                            periodIndex: sub.periodIndex,
                            timeRange: sub.timeRange,
                            subjectname: sub.subjectName,
                            type: 'Substitution',
                            displayStatus: 'Extra Session',
                            substituteName: sub.substituteName,
                            originalFacultyName: sub.originalFacultyName
                        });
                    }
                });

                mergedSlots.sort((a, b) => a.periodIndex - b.periodIndex);
                setTimetable(mergedSlots);

            } catch (error) {
                console.error("Error fetching timetable data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedSemester, selectedDate]);

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: '#f8fafc' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <button
                        onClick={() => navigate(-1)}
                        style={{
                            background: 'none', border: 'none', color: '#94a3b8',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                            marginBottom: '0.5rem'
                        }}
                    >
                        <ArrowLeft size={20} /> Back
                    </button>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>Class Timetables</h1>
                    <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>View schedule and substitutions for any class.</p>
                </div>
            </div>

            {/* Config Panel */}
            <div style={{
                background: 'rgba(30, 41, 59, 0.4)',
                padding: '1.5rem', borderRadius: '1rem',
                marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'end'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
                    <label style={{ fontSize: '0.9rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Layers size={16} /> Select Semester
                    </label>
                    <select
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(e.target.value)}
                        style={{
                            padding: '0.75rem', borderRadius: '0.5rem',
                            background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)',
                            color: 'white', outline: 'none'
                        }}
                    >
                        {semesters.map(sem => (
                            <option key={sem.id} value={sem.id}>
                                Semester {sem.semesterNo}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
                    <label style={{ fontSize: '0.9rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={16} /> Select Date
                    </label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        style={{
                            padding: '0.75rem', borderRadius: '0.5rem',
                            background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)',
                            color: 'white', outline: 'none'
                        }}
                    />
                </div>
            </div>

            {/* Timetable Grid */}
            <div style={{ display: 'grid', gap: '1rem' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Loading schedule...</div>
                ) : timetable.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: '3rem',
                        background: 'rgba(30, 41, 59, 0.2)', borderRadius: '1rem',
                        color: '#94a3b8'
                    }}>
                        No classes scheduled for this date.
                    </div>
                ) : (
                    timetable.map((slot, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            style={{
                                background: slot.type === 'Substitution'
                                    ? 'linear-gradient(to right, rgba(245, 158, 11, 0.1), rgba(30, 41, 59, 0.4))'
                                    : 'rgba(30, 41, 59, 0.4)',
                                border: slot.type === 'Substitution'
                                    ? '1px solid rgba(245, 158, 11, 0.3)'
                                    : '1px solid rgba(255,255,255,0.05)',
                                borderRadius: '1rem',
                                padding: '1.5rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                                {/* Time */}
                                <div style={{
                                    minWidth: '120px',
                                    borderRight: '1px solid rgba(255,255,255,0.1)',
                                    paddingRight: '2rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#3b82f6', fontWeight: 600 }}>
                                        <Clock size={16} />
                                        {slot.timeRange}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                        Period {slot.periodIndex}
                                    </div>
                                </div>

                                {/* Subject Info */}
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        {slot.subjectname}
                                        {slot.type === 'Substitution' && (
                                            <span style={{
                                                fontSize: '0.75rem', background: '#f59e0b', color: 'white',
                                                padding: '0.2rem 0.6rem', borderRadius: '0.5rem', fontWeight: 600
                                            }}>
                                                SUBSTITUTED
                                            </span>
                                        )}
                                    </h3>
                                    {slot.type === 'Substitution' ? (
                                        <div style={{ color: '#94a3b8', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                                            <span style={{ color: '#f59e0b' }}>{slot.substituteName}</span> is covering for <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{slot.originalFacultyName || 'Original Faculty'}</span>
                                        </div>
                                    ) : (
                                        <div style={{ color: '#94a3b8', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                                            Regular Session
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Status Indicator */}
                            <div style={{
                                padding: '0.5rem 1rem', borderRadius: '2rem',
                                background: slot.type === 'Substitution' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                color: slot.type === 'Substitution' ? '#f59e0b' : '#10b981',
                                fontSize: '0.85rem', fontWeight: 600
                            }}>
                                {slot.displayStatus}
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
};

export default FacultyTimetables;
