import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTimetable } from '../services/timetableService';
import AttendanceModal from '../components/dashboard/AttendanceModal';
import { BookOpen, Award, Folder, AlertTriangle, ArrowRight, Book, Layers, Users, Clock, Calendar, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getMySubjects, getDashboardStats, getTodayAttendanceSessions } from '../services/facultyService';
import { getSubstitutionsForFaculty } from '../services/substitutionService';
import { useAuth } from '../context/AuthContext';
import { Bell } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';


const FacultyDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [subjects, setSubjects] = useState([]);
    const [dashboardStats, setDashboardStats] = useState({
        atRiskCount: 0,
        pendingGrading: 0,
        syllabusProgress: 0,
        recentActivity: []
    });
    const [loading, setLoading] = useState(true);
    const [selectedClassForAttendance, setSelectedClassForAttendance] = useState(null);
    const [todaysClasses, setTodaysClasses] = useState([]);
    const [todaySessions, setTodaySessions] = useState([]);
    const [timetables, setTimetables] = useState({});
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);

    // Initialize with current day index mapped to name
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const [selectedDay, setSelectedDay] = useState(days[new Date().getDay()] === 'Sunday' ? 'Monday' : days[new Date().getDay()]);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (user?.uid) {
                // 1. Fetch Subjects and Timetables (Critical for Weekly Schedule)
                try {
                    const mySubjects = await getMySubjects(user.uid);
                    setSubjects(mySubjects);

                    const uniqueSemesterIds = [...new Set(mySubjects.map(s => s.semesterId).filter(Boolean))];
                    const timetableMap = {};
                    await Promise.all(uniqueSemesterIds.map(async (semId) => {
                        const schedule = await getTimetable(semId);
                        if (schedule) {
                            timetableMap[semId] = schedule;
                        }
                    }));
                    setTimetables(timetableMap);
                } catch (error) {
                    console.error("Error fetching subjects or timetables:", error);
                }

                // 2. Fetch Aggregated Stats (Optional - might fail if indexes missing)
                try {
                    const stats = await getDashboardStats(user.uid);
                    setDashboardStats(stats);
                } catch (error) {
                    console.error("Dashboard data error (Stats):", error);
                    // Don't break the whole dashboard if stats fail
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchDashboardData();
    }, [user]);

    const [substitutions, setSubstitutions] = useState([]);

    // Calculate Today's Classes AND Fetch All Substitutions for Weekly View
    useEffect(() => {
        const fetchData = async () => {
            if (!user?.uid) return;

            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const todayDate = new Date();
            const currentDayName = days[todayDate.getDay()];

            // Format as YYYY-MM-DD in Local Time
            const year = todayDate.getFullYear();
            const month = String(todayDate.getMonth() + 1).padStart(2, '0');
            const day = String(todayDate.getDate()).padStart(2, '0');
            const dateString = `${year}-${month}-${day}`;

            // 1. Fetch ALL Substitutions (for Weekly View + Today)
            let allSubs = [];
            try {
                allSubs = await getSubstitutionsForFaculty(user.uid); // Fetch all
                setSubstitutions(Array.isArray(allSubs) ? allSubs : []);
            } catch (err) {
                console.error("Error fetching substitutions:", err);
            }

            // 2. Fetch today's attendance sessions to check status
            let attended = [];
            try {
                attended = await getTodayAttendanceSessions(user.uid);
                setTodaySessions(Array.isArray(attended) ? attended : []);
            } catch (err) {
                console.error("Error fetching today's sessions:", err);
            }

            // 3. Calculate Today's Classes
            const classes = [];

            // A. Regular
            if (Array.isArray(subjects)) {
                subjects.forEach(subject => {
                    if (subject.semesterId && timetables[subject.semesterId] && timetables[subject.semesterId][currentDayName]) {
                        timetables[subject.semesterId][currentDayName].forEach(slot => {
                            if (slot.subjectId === subject.id) {
                                const isTaken = attended.some(s =>
                                    s.subjectId === subject.id &&
                                    s.periodIndex === slot.periodIndex
                                );
                                classes.push({ ...subject, ...slot, isSubstitution: false, isAttendanceTaken: isTaken });
                            }
                        });
                    }
                });
            }

            // B. Substitutions (Today Only)
            const todaysSubs = allSubs.filter(s => s.date === dateString);
            todaysSubs.forEach(sub => {
                const isTaken = attended.some(s =>
                    s.subjectId === sub.subjectId &&
                    s.periodIndex === sub.periodIndex &&
                    s.isSubstitution
                );
                classes.push({
                    id: sub.id,
                    name: sub.subjectName || 'Substituted Class',
                    code: sub.subjectCode || 'SUB',
                    semesterNo: sub.semesterNo || '?',
                    timeRange: sub.timeRange,
                    periodIndex: sub.periodIndex,
                    isSubstitution: true,
                    isAttendanceTaken: isTaken,
                    originalFacultyName: sub.originalFacultyName,
                    semesterId: sub.semesterId || sub.classId,
                    subjectId: sub.subjectId,
                    date: sub.date,
                    status: 'active'
                });
            });

            // Sort
            classes.sort((a, b) => {
                if (!a.timeRange || !b.timeRange) return 0;
                const timeA = (a.timeRange.split(' - ')[0] || "").trim();
                const timeB = (b.timeRange.split(' - ')[0] || "").trim();
                return timeA.localeCompare(timeB);
            });

            setTodaysClasses(classes);
        };

        const fetchNotifications = async () => {
            if (!user?.uid) return;
            try {
                const q = query(
                    collection(db, "notifications"),
                    where("userId", "==", user.uid),
                    where("read", "==", false),
                    limit(10)
                );
                const snap = await getDocs(q);
                const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                notifs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                setNotifications(notifs);
            } catch (e) {
                console.error("Error fetching notifications", e);
            }
        };

        fetchData();
        fetchNotifications();
    }, [subjects, timetables, user, showAttendanceModal]);

    const stats = [
        { title: 'My Courses', value: (subjects?.length || 0).toString(), icon: Book, color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.1)' },
        { title: 'Syllabus', value: `${dashboardStats?.syllabusProgress || 0}%`, icon: BookOpen, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', trend: 'Completed' },
        { title: 'At-Risk', value: (dashboardStats?.atRiskCount || 0).toString(), icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', subtitle: 'Students' },
    ];

    const quickActions = [
        { title: 'Course Tracker', desc: 'Update syllabus & topics', icon: BookOpen, path: '/faculty/academic-progress', color: '#14b8a6' },
        { title: 'Class Timetables', desc: 'View schedules & subs', icon: Calendar, path: '/faculty/timetables', color: '#3b82f6' },
    ];

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

    const formatTimeRange = (timeRange) => {
        if (!timeRange || typeof timeRange !== 'string') return '';
        const parts = timeRange.split(' - ');
        if (parts.length < 2) return timeRange;

        const [start, end] = parts;

        const to12Hour = (time) => {
            if (!time || typeof time !== 'string' || !time.includes(':')) return time || '';
            const [hours, minutes] = time.split(':');
            const h = parseInt(hours, 10);
            if (isNaN(h)) return time;
            const m = minutes || '00';
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            return `${h12}:${m} ${ampm}`;
        };

        return `${to12Hour(start)} - ${to12Hour(end)}`;
    };

    return (
        <>
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}
            >
                {/* Welcome Banner */}
                <motion.div
                    variants={itemVariants}
                    style={{
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1))',
                        borderRadius: '1.5rem',
                        padding: '3rem',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        position: 'relative',
                        overflow: 'hidden',
                        backdropFilter: 'blur(10px)'
                    }}
                >
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <h1 style={{
                            margin: '0 0 1rem 0', fontSize: '2.5rem', fontWeight: 800,
                            background: 'linear-gradient(to right, #fff, #94a3b8)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                        }}>
                            Welcome, {user?.displayName || user?.email?.split('@')[0]}
                        </h1>
                        <p style={{ margin: 0, color: '#9ca3af', maxWidth: '600px', fontSize: '1.1rem', lineHeight: '1.6' }}>
                            Manage your academic responsibilities from your centralized command center.
                        </p>
                    </div>
                    {/* Decorative Pattern */}
                    <div style={{
                        position: 'absolute', right: '-10%', top: '-50%',
                        width: '600px', height: '600px',
                        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
                        borderRadius: '50%',
                        filter: 'blur(60px)',
                        pointerEvents: 'none'
                    }} />
                </motion.div>

                {/* Today's Classes - Action Center */}
                {todaysClasses.length > 0 ? (
                    <motion.div
                        variants={itemVariants}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            display: 'flex', flexDirection: 'column', gap: '1rem'
                        }}
                    >
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Calendar size={24} className="text-gray-400" /> Today's Schedule
                        </h2>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                            {todaysClasses.map((session, idx) => (
                                <motion.div
                                    key={idx}
                                    style={{
                                        background: 'linear-gradient(to right, rgba(16, 185, 129, 0.1), rgba(6, 182, 212, 0.05))',
                                        border: '1px solid rgba(16, 185, 129, 0.2)',
                                        borderRadius: '1.5rem',
                                        padding: '1.5rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        backdropFilter: 'blur(10px)',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                        <div style={{
                                            width: '56px', height: '56px',
                                            background: 'rgba(16, 185, 129, 0.2)',
                                            borderRadius: '50%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            <Clock size={28} color="#34d399" />
                                        </div>
                                        <div>
                                            <div style={{ color: '#34d399', fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ background: 'rgba(52, 211, 153, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                                                    Period {session.periodIndex !== undefined ? session.periodIndex + 1 : '?'}
                                                </span>
                                                <span>•</span>
                                                <span>{formatTimeRange(session.timeRange)}</span>
                                            </div>
                                            <h2 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {session.name}
                                                {session.isSubstitution && (
                                                    <span style={{
                                                        fontSize: '0.7rem',
                                                        background: '#f59e0b',
                                                        color: 'white',
                                                        padding: '0.2rem 0.5rem',
                                                        borderRadius: '0.5rem',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.05em'
                                                    }}>
                                                        Sub
                                                    </span>
                                                )}
                                            </h2>
                                            <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{session.code}</span> •
                                                <span>Sem {session.semesterNo || 'N/A'}</span>
                                                {session.isSubstitution && (
                                                    <span style={{ color: '#f59e0b', fontSize: '0.8rem' }}>
                                                        (For {session.originalFacultyName})
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <motion.button
                                        whileHover={!session.isAttendanceTaken ? { scale: 1.05 } : {}}
                                        whileTap={!session.isAttendanceTaken ? { scale: 0.95 } : {}}
                                        onClick={() => {
                                            if (!session.isAttendanceTaken) {
                                                setSelectedClassForAttendance(session);
                                                setShowAttendanceModal(true);
                                            }
                                        }}
                                        disabled={session.isAttendanceTaken}
                                        style={{
                                            background: session.isAttendanceTaken
                                                ? 'rgba(16, 185, 129, 0.1)'
                                                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            border: session.isAttendanceTaken ? '1px solid rgba(16, 185, 129, 0.3)' : 'none',
                                            borderRadius: '1rem',
                                            padding: '0.75rem 1.5rem',
                                            color: session.isAttendanceTaken ? '#34d399' : 'white',
                                            fontWeight: 600,
                                            fontSize: '1rem',
                                            cursor: session.isAttendanceTaken ? 'default' : 'pointer',
                                            boxShadow: session.isAttendanceTaken ? 'none' : '0 4px 15px rgba(16, 185, 129, 0.3)',
                                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {session.isAttendanceTaken ? (
                                            <>
                                                <CheckCircle size={18} />
                                                Completed
                                            </>
                                        ) : (
                                            <>
                                                <Users size={18} />
                                                Attendance
                                            </>
                                        )}
                                    </motion.button>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div >
                ) : (
                    <motion.div
                        variants={itemVariants}
                        style={{
                            background: 'rgba(30, 41, 59, 0.4)',
                            borderRadius: '1.5rem', padding: '2rem',
                            textAlign: 'center', color: '#94a3b8',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}
                    >
                        <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0', color: '#f1f5f9' }}>Relax, No Classes Today!</h2>
                        <p style={{ margin: 0 }}>You don't have any periods scheduled for today.</p>
                    </motion.div>
                )}

                {/* KPI Grid */}
                <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                    {stats.map((stat, idx) => (
                        <motion.div
                            key={idx}
                            whileHover={{ y: -5 }}
                            style={{
                                background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.8))',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                borderRadius: '1.25rem',
                                padding: '1.5rem',
                                display: 'flex', flexDirection: 'column', gap: '1rem',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <div style={{ padding: '0.75rem', borderRadius: '1rem', background: stat.bg, color: stat.color }}>
                                    <stat.icon size={24} />
                                </div>
                                {stat.trend && (
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.75rem', borderRadius: '999px' }}>
                                        {stat.trend}
                                    </span>
                                )}
                            </div>
                            <div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', lineHeight: 1 }}>
                                    {stat.value}
                                </div>
                                <div style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 500, marginTop: '0.5rem' }}>
                                    {stat.title} {stat.subtitle && <span style={{ opacity: 0.7 }}>• {stat.subtitle}</span>}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Main Content Grid */}
                <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '3rem' }}>

                    {/* Weekly Schedule Section */}
                    <section>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Calendar size={24} className="text-gray-400" /> My Weekly Schedule
                        </h2>

                        {/* Day Tabs */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                                <button
                                    key={day}
                                    onClick={() => setSelectedDay(day)}
                                    style={{
                                        background: selectedDay === day ? '#3b82f6' : 'rgba(30, 41, 59, 0.4)',
                                        color: selectedDay === day ? 'white' : '#94a3b8',
                                        border: `1px solid ${selectedDay === day ? '#3b82f6' : 'rgba(255,255,255,0.05)'}`,
                                        padding: '0.5rem 1.25rem',
                                        borderRadius: '0.75rem',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        transition: 'all 0.2s',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>

                        {/* Schedule List */}
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {(() => {
                                // Calculate schedule for selected day
                                const dayClasses = [];

                                // A. Regular Classes
                                subjects.forEach(subject => {
                                    // DEBUG LOGS (Active)
                                    // console.log("WeeklySchedule: Processing Subject:", subject.name, subject.id, "Sem:", subject.semesterId);
                                    if (subject.semesterId && timetables[subject.semesterId]) {
                                        const daySlots = timetables[subject.semesterId][selectedDay];
                                        // console.log(`WeeklySchedule: Slots for ${selectedDay} (Sem ${subject.semesterId}):`, daySlots ? daySlots.length : 'None');

                                        if (daySlots) {
                                            daySlots.forEach(slot => {
                                                // console.log(`  - Slot: ${slot.timeRange} | Subject: ${slot.subjectname} (${slot.subjectId}) vs My Subject: (${subject.id})`);
                                                if (slot.subjectId === subject.id) {
                                                    dayClasses.push({ ...subject, ...slot, isSubstitution: false });
                                                }
                                            });
                                        }
                                    }
                                });

                                // B. Substitutions (For Selected Day THIS WEEK)
                                // We need to determine the date of "This Week's [SelectedDay]"
                                const today = new Date();
                                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                const currentDayIndex = today.getDay(); // 0-6
                                const selectedDayIndex = days.indexOf(selectedDay);

                                // Calculate date for the selected day in current week
                                // Note: "Current Week" logic can vary. Let's assume broad "Next 7 days" or "This ISO Week".
                                // Simple match: If selectedDay is today, match today.
                                // If selectedDay is future, match future date. 
                                // If selectedDay is past, match past date (or next week? usually past in current week).
                                // Let's stick to "Current Week" starts Sunday or Monday.

                                // Let's simplified approach: Match any substitution that has the same Weekday Name
                                // AND is within a reasonable range (e.g., +/- 7 days from now).
                                // A better approach is strictly "This Week (Sun-Sat)".

                                const diff = selectedDayIndex - currentDayIndex;
                                const targetDate = new Date(today);
                                targetDate.setDate(today.getDate() + diff);

                                const tYear = targetDate.getFullYear();
                                const tMonth = String(targetDate.getMonth() + 1).padStart(2, '0');
                                const tDay = String(targetDate.getDate()).padStart(2, '0');
                                const targetDateString = `${tYear}-${tMonth}-${tDay}`;

                                const relevantSubs = substitutions.filter(s => s.date === targetDateString);
                                relevantSubs.forEach(sub => {
                                    dayClasses.push({
                                        id: sub.id,
                                        name: sub.subjectName || 'Substituted Class',
                                        code: sub.subjectCode || 'SUB',
                                        semesterNo: sub.semesterNo || '?',
                                        timeRange: sub.timeRange,
                                        periodIndex: sub.periodIndex,
                                        isSubstitution: true,
                                        originalFacultyName: sub.originalFacultyName,
                                        semesterId: sub.semesterId || sub.classId,
                                        subjectId: sub.subjectId,
                                        date: sub.date,
                                        status: 'active' // Ensure it appears in Attendance Modal
                                    });
                                });
                                // Sort by time
                                dayClasses.sort((a, b) => {
                                    const timeA = a.timeRange.split(' - ')[0]; // "09:00"
                                    return timeA.localeCompare(b.timeRange.split(' - ')[0]);
                                });

                                if (dayClasses.length === 0) {
                                    return (
                                        <div style={{
                                            background: 'rgba(30, 41, 59, 0.4)',
                                            borderRadius: '1rem', padding: '2rem',
                                            textAlign: 'center', color: '#94a3b8', boxSizing: 'border-box', // Ensure box-sizing
                                            border: '1px solid rgba(255,255,255,0.05)'
                                        }}>
                                            No classes scheduled for {selectedDay}.
                                        </div>
                                    );
                                }

                                return dayClasses.map((cls, idx) => (
                                    <motion.div
                                        key={`${cls.id}-${idx}`}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        style={{
                                            background: 'rgba(30, 41, 59, 0.4)',
                                            backdropFilter: 'blur(10px)',
                                            border: '1px solid rgba(255, 255, 255, 0.05)',
                                            borderRadius: '1rem',
                                            padding: '1.25rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            boxSizing: 'border-box' // Ensure box-sizing
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                            <div style={{
                                                padding: '0.75rem', borderRadius: '0.75rem',
                                                background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa',
                                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                                minWidth: '80px'
                                            }}>
                                                <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>P{cls.periodIndex !== undefined ? cls.periodIndex + 1 : '?'}</span>
                                                <span style={{ fontSize: '0.7rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Period</span>
                                            </div>
                                            <div>
                                                <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {cls.name}
                                                    {cls.isSubstitution && (
                                                        <span style={{
                                                            fontSize: '0.7rem',
                                                            background: '#f59e0b',
                                                            color: 'white',
                                                            padding: '0.2rem 0.5rem',
                                                            borderRadius: '0.5rem',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.05em'
                                                        }}>
                                                            Sub
                                                        </span>
                                                    )}
                                                </h3>
                                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.9rem', color: '#94a3b8' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        <Book size={14} /> {cls.code}
                                                    </span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        <Layers size={14} /> Sem {cls.semesterNo || 'N/A'}
                                                    </span>
                                                    {cls.isSubstitution && (
                                                        <span style={{ color: '#f59e0b', fontSize: '0.8rem' }}>
                                                            (For {cls.originalFacultyName})
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{
                                            padding: '0.5rem 1rem', borderRadius: '999px',
                                            background: 'rgba(255,255,255,0.05)', color: '#94a3b8',
                                            fontSize: '0.85rem'
                                        }}>
                                            {formatTimeRange(cls.timeRange)}
                                        </div>
                                    </motion.div>
                                ));
                            })()}
                        </div>
                    </section>

                    {/* Quick Actions */}
                    <section>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Layers size={24} className="text-gray-400" /> Quick Actions
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                            {quickActions.map((action) => (
                                <motion.div
                                    key={action.title}
                                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(30, 41, 59, 0.6)' }}
                                    whileTap={{ scale: 0.98 }}
                                    style={{
                                        background: 'rgba(30, 41, 59, 0.4)',
                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                        borderRadius: '1.25rem',
                                        padding: '1.5rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        transition: 'all 0.2s',
                                        backdropFilter: 'blur(10px)'
                                    }}
                                    onClick={() => navigate(action.path)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                        <div style={{
                                            padding: '1rem',
                                            borderRadius: '1rem',
                                            background: `${action.color}15`,
                                            color: action.color,
                                            boxShadow: `0 0 20px ${action.color}10`
                                        }}>
                                            <action.icon size={28} />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.1rem', fontWeight: 600 }}>{action.title}</h3>
                                            <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>{action.desc}</p>
                                        </div>
                                    </div>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '50%',
                                        background: 'rgba(255,255,255,0.03)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <ArrowRight size={20} color="#94a3b8" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </section>

                    {/* Recent Activity Feed */}
                    <motion.div
                        variants={itemVariants}
                        style={{
                            background: 'rgba(30, 41, 59, 0.4)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '1.5rem',
                            padding: '2rem'
                        }}
                    >
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Bell size={20} className="text-gray-400" /> Recent Updates
                        </h2>

                        {dashboardStats.recentActivity && dashboardStats.recentActivity.length > 0 ? (
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {dashboardStats.recentActivity.map((activity, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: '1rem', padding: '1rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '1rem' }}>
                                        <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.75rem', height: 'fit-content' }}>
                                            <Layers size={18} color="#60a5fa" />
                                        </div>
                                        <div>
                                            <p style={{ margin: '0 0 0.25rem 0', color: '#e2e8f0', fontWeight: 500 }}>{activity.title}</p>
                                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                                                New Assessment in <span style={{ color: '#94a3b8' }}>{activity.subject}</span> • {new Date(activity.date).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                <div style={{ marginBottom: '1rem', opacity: 0.5 }}><BookOpen size={48} /></div>
                                <p>No recent activity found.</p>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            </motion.div >

            {/* Attendance Modal */}
            < AnimatePresence >
                {showAttendanceModal && selectedClassForAttendance && (
                    <AttendanceModal
                        isOpen={showAttendanceModal}
                        onClose={() => setShowAttendanceModal(false)}
                        courses={[{ ...selectedClassForAttendance, status: 'active' }]}
                    />
                )}
            </AnimatePresence >
        </>
    );
};

export default FacultyDashboard;
