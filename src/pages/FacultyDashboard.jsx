import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTimetable } from '../services/timetableService';
import AttendanceModal from '../components/dashboard/AttendanceModal';
import { BookOpen, Award, Folder, AlertTriangle, ArrowRight, Book, Layers, Users, Clock, Calendar, CheckCircle, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getMyCourses, getDashboardStats, getTodayAttendanceSessions, getFacultyClassAttendanceAverages, getStudentBirthdaysToday } from '../services/facultyService';
import { getSubstitutionsForFaculty } from '../services/substitutionService';
import { isFacultyOnLeave } from '../services/leaveService';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { checkIfHoliday } from '../services/calendarService';
import { getSemestersByClassTeacher, getStudentsBySemester } from '../services/academicService';
import ComposeEmailModal from '../components/common/ComposeEmailModal';
import { Mail } from 'lucide-react';
import { formatTime12Hour, isCurrentTimeInRange } from '../utils/timeFormat';
import { fetchSettings } from '../services/settingsService';

const FacultyDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
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
    const [classAverages, setClassAverages] = useState([]);
    const [birthdays, setBirthdays] = useState([]);
    const [gracePeriodHours, setGracePeriodHours] = useState(0);
    const [restrictToTime, setRestrictToTime] = useState(true);

    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000); // refresh every minute to update button status
        return () => clearInterval(timer);
    }, []);

    // Initialize with current day index mapped to name
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const [selectedDay, setSelectedDay] = useState(days[new Date().getDay()] === 'Sunday' ? 'Monday' : days[new Date().getDay()]);
    const [notifications, setNotifications] = useState([]);
    const [dailyAttendanceStatus, setDailyAttendanceStatus] = useState(null);
    const [holidayInfo, setHolidayInfo] = useState({ isHoliday: false, reason: null });

    // Email Modal State
    const [emailModal, setEmailModal] = useState({
        isOpen: false,
        recipients: [],
        title: '',
        defaultSubject: ''
    });
    const [isClassTeacher, setIsClassTeacher] = useState(false);
    const [classStudents, setClassStudents] = useState([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (user?.uid) {
                // Check if Class Teacher
                try {
                    const classTeacherSems = await getSemestersByClassTeacher(user.uid);
                    if (classTeacherSems && classTeacherSems.length > 0) {
                        setIsClassTeacher(true);
                        const students = await getStudentsBySemester(classTeacherSems[0].id);
                        setClassStudents(students);
                    }
                } catch (error) {
                    console.error("Error checking class teacher status:", error);
                }
                // 1. Fetch Courses and Timetables (Critical for Weekly Schedule)
                try {
                    const myCourses = await getMyCourses(user.uid);
                    setCourses(myCourses);

                    const uniqueSemesterIds = [...new Set(myCourses.map(s => s.semesterId).filter(Boolean))];
                    const timetableMap = {};
                    await Promise.all(uniqueSemesterIds.map(async (semId) => {
                        const schedule = await getTimetable(semId);
                        if (schedule) {
                            timetableMap[semId] = schedule;
                        }
                    }));
                    setTimetables(timetableMap);
                } catch (error) {
                    console.error("Error fetching courses or timetables:", error);
                }

                // 2. Fetch Aggregated Stats (Optional - might fail if indexes missing)
                try {
                    const stats = await getDashboardStats(user.uid);
                    setDashboardStats(stats);
                } catch (error) {
                    console.error("Dashboard data error (Stats):", error);
                    // Don't break the whole dashboard if stats fail
                }

                // 3. Fetch New Widgets Data
                try {
                    const [avgs, bdays] = await Promise.all([
                        getFacultyClassAttendanceAverages(user.uid),
                        getStudentBirthdaysToday(user.uid)
                    ]);
                    setClassAverages(avgs);
                    setBirthdays(bdays);
                } catch (error) {
                    console.error("Dashboard data error (New Widgets):", error);
                } 

                // 4. Fetch Global Settings for Grace Period and Enforcement
                try {
                    const settings = await fetchSettings();
                    if (settings?.attendance) {
                        setGracePeriodHours(settings.attendance.facultyGracePeriodHours || 0);
                        setRestrictToTime(settings.attendance.restrictAttendanceToTime !== false);
                    }
                } catch (error) {
                    console.error("Error fetching settings:", error);
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

            // Check if on leave today
            let onLeaveToday = false;
            try {
                onLeaveToday = await isFacultyOnLeave(user.uid, dateString);
            } catch (err) {
                console.error("Error checking leave status:", err);
            }

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

            // A. Regular (SKIP IF ON LEAVE)
            if (Array.isArray(courses) && !onLeaveToday) {
                courses.forEach(course => {
                    if (course.semesterId && timetables[course.semesterId] && timetables[course.semesterId][currentDayName]) {
                        timetables[course.semesterId][currentDayName].forEach(slot => {
                            if (slot.courseId === course.id) {
                                const isTaken = attended.some(s =>
                                    s.courseId === course.id &&
                                    s.periodIndex === slot.periodIndex
                                );
                                classes.push({ ...course, ...slot, isSubstitution: false, isAttendanceTaken: isTaken });
                            }
                        });
                    }
                });
            }

            // B. Substitutions (Today Only - SHOULD STILL SHOW even if on leave, though unlikely)
            const todaysSubs = allSubs.filter(s => s.date === dateString);
            todaysSubs.forEach(sub => {
                const isTaken = attended.some(s =>
                    s.courseId === sub.courseId &&
                    s.periodIndex === sub.periodIndex &&
                    s.isSubstitution
                );
                classes.push({
                    id: sub.id,
                    name: sub.courseName || 'Substituted Class',
                    code: sub.courseCode || 'SUB',
                    semesterNo: sub.semesterNo || '?',
                    timeRange: sub.timeRange,
                    periodIndex: sub.periodIndex,
                    isSubstitution: true,
                    isAttendanceTaken: isTaken,
                    originalFacultyName: sub.originalFacultyName,
                    semesterId: sub.semesterId || sub.classId,
                    courseId: sub.courseId,
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
                    limit(50)
                );
                const snap = await getDocs(q);
                let notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                
                // Filter and Sort in JS to avoid composite index requirement
                notifs = notifs
                    .filter(n => !n.read)
                    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                    .slice(0, 10);
                
                setNotifications(notifs);
            } catch (e) {
                console.error("Error fetching notifications", e);
            }
        };

        const fetchDailyAttendance = async () => {
            if (!user?.uid) return;
            try {
                const todayDate = new Date();
                const year = todayDate.getFullYear();
                const month = String(todayDate.getMonth() + 1).padStart(2, '0');
                const day = String(todayDate.getDate()).padStart(2, '0');
                const dateString = `${year}-${month}-${day}`;
                const recordId = `${user.uid}_${dateString}`;

                const recRef = doc(db, "faculty_attendance", recordId);
                const recSnap = await getDoc(recRef);
                if (recSnap.exists()) {
                    setDailyAttendanceStatus(recSnap.data());
                } else {
                    setDailyAttendanceStatus(null);
                }
            } catch (e) {
                console.error("Error fetching daily attendance status:", e);
            }
        };

        const fetchHolidayStatus = async () => {
            try {
                const todayDate = new Date();
                const year = todayDate.getFullYear();
                const month = String(todayDate.getMonth() + 1).padStart(2, '0');
                const day = String(todayDate.getDate()).padStart(2, '0');
                const dateString = `${year}-${month}-${day}`;
                
                const hInfo = await checkIfHoliday(dateString);
                setHolidayInfo(hInfo);
            } catch (e) {
                console.error("Error fetching holiday status:", e);
            }
        };

        fetchData();
        fetchNotifications();
        fetchDailyAttendance();
        fetchHolidayStatus();
    }, [courses, timetables, user, showAttendanceModal]);

    const stats = [
        { title: 'My Programs', value: (courses?.length || 0).toString(), icon: Book, color: 'var(--color-primary)', bg: 'rgba(59, 130, 246, 0.1)' },
        { title: 'At-Risk', value: (dashboardStats?.atRiskCount || 0).toString(), icon: AlertTriangle, color: 'var(--color-error)', bg: 'rgba(239, 68, 68, 0.1)', subtitle: 'Students' },
    ];

    const quickActions = [
        { title: 'Program Tracker', desc: 'Update syllabus & topics', icon: BookOpen, path: '/faculty/academic-progress', color: 'var(--color-primary)' },
        { title: 'Class Timetables', desc: 'View schedules & subs', icon: Calendar, path: '/faculty/timetables', color: 'var(--color-accent)' },
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

    const handleMessageAllStudents = () => {
        const recipients = classStudents
            .filter(s => s.email)
            .map(s => ({ email: s.email, name: s.name }));

        setEmailModal({
            isOpen: true,
            recipients,
            title: 'Message My Class Students',
            defaultSubject: `[VoxLog] Important Announcement for my Class`
        });
    };

    const handleMessageIndividualStudent = (student) => {
        if (!student.email) return;
        setEmailModal({
            isOpen: true,
            recipients: [{ email: student.email, name: student.name }],
            title: `Message ${student.name}`,
            defaultSubject: `[VoxLog] Happy Birthday, ${student.name}! 🎂`
        });
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
                        background: 'linear-gradient(to right, var(--color-surface), var(--color-bg))',
                        borderRadius: '1rem',
                        padding: '2.5rem',
                        border: '1px solid var(--color-border)',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: 'var(--shadow-md)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem'
                    }}
                >
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <h1 style={{
                            margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: 700,
                            color: 'var(--color-text-main)',
                            fontFamily: 'serif'
                        }}>
                            Welcome, {user?.displayName || user?.email?.split('@')[0]}
                        </h1>
                        <p style={{ margin: 0, color: 'var(--color-text-muted)', maxWidth: '600px', fontSize: '1rem', lineHeight: '1.6' }}>
                            Academic Dashboard & Control Center
                        </p>
                        {isClassTeacher && (
                            <button
                                onClick={handleMessageAllStudents}
                                style={{
                                    marginTop: '1.5rem',
                                    padding: '0.75rem 1.5rem',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    color: '#60a5fa',
                                    border: '1px solid rgba(59, 130, 246, 0.2)',
                                    borderRadius: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                            >
                                <Mail size={18} />
                                Message My Students
                            </button>
                        )}
                    </div>

                    {/* Daily Faculty Attendance Status Badge */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        padding: '1rem 1.5rem',
                        borderRadius: '1rem',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem',
                        minWidth: '200px'
                    }}>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Today's Status
                        </span>
                        {dailyAttendanceStatus ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {dailyAttendanceStatus.status === 'Present' ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '0.5rem 1rem', borderRadius: '2rem', fontWeight: 700 }}>
                                        <CheckCircle size={18} /> PRESENT
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)', padding: '0.5rem 1rem', borderRadius: '2rem', fontWeight: 700 }}>
                                        <AlertTriangle size={18} /> ABSENT
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.15)', padding: '0.5rem 1rem', borderRadius: '2rem', fontWeight: 700, fontSize: '0.9rem' }}>
                                PENDING
                            </div>
                        )}
                        {dailyAttendanceStatus && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                {dailyAttendanceStatus.completedClasses} / {dailyAttendanceStatus.targetClasses} Classes Completed
                            </span>
                        )}
                    </div>
                </motion.div>

                {/* Holiday Banner */}
                {holidayInfo.isHoliday && (
                    <motion.div
                        variants={itemVariants}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{
                            background: 'linear-gradient(to right, rgba(168, 85, 247, 0.15), rgba(168, 85, 247, 0.05))',
                            border: '1px solid rgba(168, 85, 247, 0.3)',
                            borderRadius: '1.5rem', padding: '1.5rem',
                            display: 'flex', alignItems: 'center', gap: '1.5rem',
                            color: '#d8b4fe',
                            boxShadow: '0 4px 20px rgba(168, 85, 247, 0.1)'
                        }}
                    >
                        <div style={{
                            width: '48px', height: '48px',
                            background: 'rgba(168, 85, 247, 0.2)',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <Calendar size={24} color="#c084fc" />
                        </div>
                        <div>
                            <h3 style={{ margin: '0 0 0.25rem 0', fontWeight: 800, fontSize: '1.25rem', color: '#e9d5ff' }}>
                                Designated Holiday: {holidayInfo.reason}
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.9 }}>
                                Academic operations are suspended. Attendance taking is disabled for today.
                            </p>
                        </div>
                    </motion.div>
                )}

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
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                                                <span>{formatTime12Hour(session.timeRange)}</span>
                                            </div>
                                            <h2 style={{ color: 'var(--color-text-main)', fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                                                <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>{session.code}</span> •
                                                <span>Sem {session.semesterNo || 'N/A'}</span>
                                                {session.isSubstitution && (
                                                    <span style={{ color: '#f59e0b', fontSize: '0.8rem' }}>
                                                        (For {session.originalFacultyName})
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {(() => {
                                        const timeStatus = isCurrentTimeInRange(session.timeRange, gracePeriodHours, restrictToTime);
                                        const isDisabled = session.isAttendanceTaken || holidayInfo.isHoliday || (!restrictToTime ? false : (timeStatus.isBefore || timeStatus.isAfter));
                                        let buttonText = "Attendance";
                                        let buttonIcon = <Users size={18} />;

                                        if (session.isAttendanceTaken) {
                                            buttonText = "Completed";
                                            buttonIcon = <CheckCircle size={18} />;
                                        } else if (holidayInfo.isHoliday) {
                                            buttonText = "Holiday";
                                            buttonIcon = <Calendar size={18} />;
                                        } else if (timeStatus.isBefore) {
                                            buttonText = "Upcoming";
                                            buttonIcon = <Clock size={18} />;
                                        } else if (timeStatus.isAfter) {
                                            buttonText = "Time Over";
                                            buttonIcon = <Clock size={18} />;
                                        } else {
                                            buttonText = "Take Attendance";
                                        }

                                        return (
                                            <motion.button
                                                whileHover={!isDisabled ? { scale: 1.05 } : {}}
                                                whileTap={!isDisabled ? { scale: 0.95 } : {}}
                                                onClick={() => {
                                                    if (!isDisabled) {
                                                        setSelectedClassForAttendance(session);
                                                        setShowAttendanceModal(true);
                                                    }
                                                }}
                                                disabled={isDisabled}
                                                style={{
                                                    background: session.isAttendanceTaken
                                                        ? 'rgba(16, 185, 129, 0.1)'
                                                        : holidayInfo.isHoliday
                                                            ? 'rgba(255, 255, 255, 0.05)'
                                                            : (timeStatus.isBefore || timeStatus.isAfter) 
                                                                ? 'rgba(100, 116, 139, 0.1)'
                                                                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                    border: session.isAttendanceTaken ? '1px solid rgba(16, 185, 129, 0.3)' : (holidayInfo.isHoliday || timeStatus.isBefore || timeStatus.isAfter ? '1px solid rgba(255,255,255,0.1)' : 'none'),
                                                    borderRadius: '1rem',
                                                    padding: '0.75rem 1.5rem',
                                                    color: session.isAttendanceTaken ? '#34d399' : (holidayInfo.isHoliday ? '#94a3b8' : (timeStatus.isBefore || timeStatus.isAfter ? '#cbd5e1' : 'white')),
                                                    fontWeight: 600,
                                                    fontSize: '1rem',
                                                    cursor: isDisabled ? 'default' : 'pointer',
                                                    boxShadow: isDisabled ? 'none' : '0 4px 15px rgba(16, 185, 129, 0.3)',
                                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                    whiteSpace: 'nowrap',
                                                    opacity: (holidayInfo.isHoliday || timeStatus.isBefore || timeStatus.isAfter) ? 0.6 : 1
                                                }}
                                            >
                                                {buttonIcon}
                                                {buttonText}
                                            </motion.button>
                                        );
                                    })()}
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
                        <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0', color: 'var(--color-text-main)' }}>Relax, No Classes Today!</h2>
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
                                background: 'var(--color-surface)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '0.75rem',
                                padding: '1.5rem',
                                display: 'flex', flexDirection: 'column', gap: '1rem',
                                boxShadow: 'var(--shadow-sm)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <div style={{ padding: '0.75rem', borderRadius: '1rem', background: stat.bg, color: stat.color }}>
                                    <stat.icon size={24} />
                                </div>
                                {stat.trend && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.75rem', borderRadius: '4px' }}>
                                        {stat.trend}
                                    </span>
                                )}
                            </div>
                            <div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-text-main)', letterSpacing: '-0.02em', lineHeight: 1 }}>
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
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Calendar size={24} className="text-gray-400" /> My Weekly Schedule
                        </h2>

                        {/* Day Tabs */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                                <button
                                    key={day}
                                    onClick={() => setSelectedDay(day)}
                                    style={{
                                        background: selectedDay === day ? 'var(--color-primary)' : 'transparent',
                                        color: selectedDay === day ? 'white' : 'var(--color-text-muted)',
                                        border: `1px solid ${selectedDay === day ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                        padding: '0.5rem 1.25rem',
                                        borderRadius: '0.5rem',
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
                                courses.forEach(course => {
                                    // DEBUG LOGS (Active)
                                    // console.log("WeeklySchedule: Processing Course:", course.name, course.id, "Sem:", course.semesterId);
                                    if (course.semesterId && timetables[course.semesterId]) {
                                        const daySlots = timetables[course.semesterId][selectedDay];
                                        // console.log(`WeeklySchedule: Slots for ${selectedDay} (Sem ${course.semesterId}):`, daySlots ? daySlots.length : 'None');

                                        if (daySlots) {
                                            daySlots.forEach(slot => {
                                                // console.log(`  - Slot: ${slot.timeRange} | Course: ${slot.coursename} (${slot.courseId}) vs My Course: (${course.id})`);
                                                if (slot.courseId === course.id) {
                                                    dayClasses.push({ ...course, ...slot, isSubstitution: false });
                                                }
                                            });
                                        }
                                    }
                                });

                                // B. Substitutions (For Selected Day THIS WEEK)
                                // We need to determine the date of "This Week's [SelectedDay]"
                                console.log(`[DEBUG] WeeklySchedule - Day: ${selectedDay}, Courses: ${courses.length}, Timetables loaded: ${Object.keys(timetables).length}`);
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
                                        name: sub.courseName || 'Substituted Class',
                                        code: sub.courseCode || 'SUB',
                                        semesterNo: sub.semesterNo || '?',
                                        timeRange: sub.timeRange,
                                        periodIndex: sub.periodIndex,
                                        isSubstitution: true,
                                        originalFacultyName: sub.originalFacultyName,
                                        semesterId: sub.semesterId || sub.classId,
                                        courseId: sub.courseId,
                                        date: sub.date,
                                        status: 'active' // Ensure it appears in Attendance Modal
                                    });
                                });
                                // Sort by time
                                dayClasses.sort((a, b) => {
                                    const timeA = (a.timeRange || "").split(' - ')[0] || "";
                                    const timeB = (b.timeRange || "").split(' - ')[0] || "";
                                    return timeA.localeCompare(timeB);
                                });

                                if (dayClasses.length === 0) {
                                    console.log(`[DEBUG] WeeklySchedule - No classes found for ${selectedDay}.`);
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
                                console.log(`[DEBUG] WeeklySchedule - Classes found for ${selectedDay}:`, dayClasses.map(c => c.name));

                                return dayClasses.map((cls, idx) => (
                                    <motion.div
                                        key={`${cls.id}-${idx}`}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        style={{
                                            background: 'var(--color-surface)',
                                            backdropFilter: 'none',
                                            border: '1px solid var(--color-border)',
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
                                                <h3 style={{ margin: 0, color: 'var(--color-text-main)', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                                            {formatTime12Hour(cls.timeRange)}
                                        </div>
                                    </motion.div>
                                ));
                            })()}
                        </div>
                    </section>

                    {/* Quick Actions */}
                    <section>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Layers size={24} className="text-gray-400" /> Quick Actions
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                            {quickActions.map((action) => (
                                <motion.div
                                    key={action.title}
                                    whileHover={{ scale: 1.02, backgroundColor: 'var(--color-bg)' }}
                                    whileTap={{ scale: 0.98 }}
                                    style={{
                                        background: 'var(--color-surface)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '0.75rem',
                                        padding: '1.5rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        transition: 'all 0.2s',
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
                                            <h3 style={{ margin: 0, color: 'var(--color-text-main)', fontSize: '1.1rem', fontWeight: 600 }}>{action.title}</h3>
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

                    {/* New Widgets Section */}
                    <section>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <BookOpen size={24} className="text-gray-400" /> Class Attendance & Birthdays
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                            {/* Class Averages Widget */}
                            <div style={{
                                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                                borderRadius: '1rem', padding: '1.5rem', boxShadow: 'var(--shadow-sm)'
                            }}>
                                <h3 style={{ margin: '0 0 1rem 0', color: 'var(--color-text-main)', fontSize: '1.2rem', fontWeight: 600 }}>Class Attendance Averages</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {classAverages.length === 0 ? (
                                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No classes found.</div>
                                    ) : (
                                        classAverages.map((avg, i) => (
                                            <div key={i}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                    <span style={{ color: 'var(--color-text-main)', fontSize: '0.9rem', fontWeight: 500 }}>{avg.courseName}</span>
                                                    <span style={{ color: avg.percentage < 75 ? '#ef4444' : '#10b981', fontSize: '0.9rem', fontWeight: 600 }}>{avg.percentage}%</span>
                                                </div>
                                                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${avg.percentage}%`, height: '100%', background: avg.percentage < 75 ? '#ef4444' : '#10b981', borderRadius: '4px', transition: 'width 1s ease-in-out' }} />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Birthdays Widget */}
                            <div style={{
                                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                                borderRadius: '1rem', padding: '1.5rem',
                                display: 'flex', flexDirection: 'column'
                            }}>
                                <h3 style={{ margin: '0 0 1rem 0', color: 'var(--color-text-main)', fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    🎂 Student Birthdays Today
                                </h3>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {birthdays.length === 0 ? (
                                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center', margin: 'auto' }}>
                                            No birthdays in your classes today.
                                        </div>
                                    ) : (
                                        birthdays.map((bday, i) => (
                                            <div key={i} style={{
                                                background: 'rgba(255, 255, 255, 0.05)', padding: '0.75rem', borderRadius: '0.5rem',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                            }}>
                                                <span style={{ color: 'var(--color-text-main)', fontWeight: 600 }}>{bday.name}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 500, background: 'rgba(255, 255, 255, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                                                        {bday.semesterName}
                                                    </span>
                                                    {bday.email && (
                                                        <button
                                                            onClick={() => handleMessageIndividualStudent(bday)}
                                                            style={{
                                                                background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa',
                                                                border: 'none', borderRadius: '50%', width: '30px', height: '30px',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                cursor: 'pointer'
                                                            }}
                                                            title="Send Birthday Wish"
                                                        >
                                                            <Mail size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Recent Activity Feed */}
                    <motion.div
                        variants={itemVariants}
                        style={{
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '1.5rem',
                            padding: '2rem'
                        }}
                    >
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Bell size={20} className="text-gray-400" /> Recent Updates
                        </h2>

                        {dashboardStats.recentActivity && dashboardStats.recentActivity.length > 0 ? (
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {dashboardStats.recentActivity.map((activity, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: '1rem', padding: '1rem', background: 'var(--color-bg)', borderRadius: '1rem' }}>
                                        <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.75rem', height: 'fit-content' }}>
                                            <Layers size={18} color="#60a5fa" />
                                        </div>
                                        <div>
                                            <p style={{ margin: '0 0 0.25rem 0', color: 'var(--color-text-main)', fontWeight: 500 }}>{activity.title}</p>
                                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                                                New Assessment in <span style={{ color: '#94a3b8' }}>{activity.course}</span> • {new Date(activity.date).toLocaleDateString()}
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
            <AnimatePresence>
                {showAttendanceModal && selectedClassForAttendance && (
                    <AttendanceModal
                        isOpen={showAttendanceModal}
                        onClose={() => setShowAttendanceModal(false)}
                        programs={[{ ...selectedClassForAttendance, status: 'active' }]}
                    />
                )}
            </AnimatePresence>

            <ComposeEmailModal
                isOpen={emailModal.isOpen}
                onClose={() => setEmailModal({ ...emailModal, isOpen: false })}
                recipients={emailModal.recipients}
                title={emailModal.title}
                defaultSubject={emailModal.defaultSubject}
            />
        </>
    );
};

export default FacultyDashboard;
