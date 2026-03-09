import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import AttendanceModal from '../../components/dashboard/AttendanceModal';
import SubstitutionManagement from './SubstitutionManagement';

import ProgramCard from '../../components/dashboard/ProgramCard';
import LoadingScreen from '../../components/LoadingScreen';
import { useAuth } from '../../context/AuthContext';
import {
    getFacultyAssignmentsByFaculty,
    getCourses,
    getSemesters,
    getPrograms,
    getSemestersByClassTeacher
} from '../../services/academicService';
import { getTimetable } from '../../services/timetableService';
import { BookOpen, Users } from 'lucide-react';

const FacultyPrograms = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [myPrograms, setMyPrograms] = useState([]);
    const [myManagedClasses, setMyManagedClasses] = useState([]);
    const [timetables, setTimetables] = useState({});
    const [activeCourseIds, setActiveCourseIds] = useState([]);
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [showSubstitutionModal, setShowSubstitutionModal] = useState(false);
    const [selectedProgramForAttendance, setSelectedProgramForAttendance] = useState(null);
    const [programStatusMap, setProgramStatusMap] = useState({});

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            setLoading(true);
            try {
                // Fetch all raw data we might need
                const [
                    assignments,
                    allCourses,
                    allSemesters,
                    allPrograms,
                    managedSemesters
                ] = await Promise.all([
                    getFacultyAssignmentsByFaculty(user.uid),
                    getCourses(),
                    getSemesters(),
                    getPrograms(),
                    getSemestersByClassTeacher(user.uid)
                ]);

                // Process "My Courses" (Programs I teach)
                const processedPrograms = assignments.map(assignment => {
                    const course = allCourses.find(s => s.id === assignment.courseId);
                    if (!course) return null;

                    const semester = allSemesters.find(s => s.id === course.semesterId);
                    // Use course.programId if available, fallback to semester.programId
                    const programId = course.programId || (semester ? semester.programId : null);
                    const program = allPrograms.find(c => c.id === programId);

                    return {
                        id: assignment.id, // Assignment ID
                        courseId: course.id,
                        programCode: course.code,
                        degreeName: program ? program.name : 'Unknown Program',
                        courseName: course.name,
                        // If we have semester info, show it
                        section: semester ? `Sem ${semester.semesterNo}` : 'N/A',
                        semesterId: semester ? semester.id : null,
                        studentCount: semester ? semester.studentCount : 0,
                        status: 'inactive', // Defaulting to inactive, will verify with timetable
                        code: course.code, // For modal
                        name: course.name, // For modal
                        sectionCode: semester ? `Sem ${semester.semesterNo}` : 'N/A' // For modal
                    };
                }).filter(item => item !== null);

                setMyPrograms(processedPrograms);

                // Fetch Timetables for relevant semesters
                const uniqueSemesterIds = [...new Set(processedPrograms.map(c => c.semesterId).filter(Boolean))];
                const timetableMap = {};
                await Promise.all(uniqueSemesterIds.map(async (semId) => {
                    const schedule = await getTimetable(semId);
                    if (schedule) {
                        timetableMap[semId] = schedule;
                    }
                }));
                setTimetables(timetableMap);

                // Process "My Class" (Classes I am a Class Teacher for)
                const processedManagedClasses = managedSemesters.map(semester => {
                    const program = allPrograms.find(c => c.id === semester.programId);
                    return {
                        id: semester.id,
                        semesterNo: semester.semesterNo,
                        studentCount: semester.studentCount,
                        programName: program ? program.name : 'Unknown Program',
                        programId: program ? program.id : null
                    };
                });

                setMyManagedClasses(processedManagedClasses);

            } catch (error) {
                console.error("Error fetching faculty programs:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    // Check for active sessions based on timetable
    useEffect(() => {
        const checkActiveSessions = () => {
            const now = new Date();
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const currentDay = days[now.getDay()];

            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const currentTimeVal = currentHour * 60 + currentMinute;

            const activeIds = [];
            const statusMap = {}; // courseId -> statusMessage

            myPrograms.forEach(program => {
                if (!program.semesterId || !timetables[program.semesterId]) {
                    statusMap[program.courseId] = "No Timetable Found";
                    return;
                }

                // Case-insensitive day match
                const schedule = timetables[program.semesterId];
                const dayKey = Object.keys(schedule).find(k => k.toLowerCase() === currentDay.toLowerCase());

                if (!dayKey || !schedule[dayKey]) {
                    statusMap[program.courseId] = `No classes on ${currentDay}`;
                    return;
                }

                const daySchedule = schedule[dayKey];
                let isNow = false;
                let nextSlot = null;
                let minDiff = Infinity;

                // Check each slot
                daySchedule.forEach(slot => {
                    if (slot.courseId !== program.courseId) return;

                    // slot.timeRange format: "09:00 - 10:00"
                    const parts = slot.timeRange.split('-').map(s => s.trim());
                    if (parts.length !== 2) return;

                    const [startStr, endStr] = parts;
                    const [startH, startM] = startStr.split(':').map(Number);
                    const [endH, endM] = endStr.split(':').map(Number);

                    const startTimeVal = startH * 60 + startM;
                    const endTimeVal = endH * 60 + endM;

                    if (currentTimeVal >= startTimeVal && currentTimeVal < endTimeVal) {
                        isNow = true;
                    } else if (currentTimeVal < startTimeVal) {
                        // Future slot today
                        const diff = startTimeVal - currentTimeVal;
                        if (diff < minDiff) {
                            minDiff = diff;
                            nextSlot = startStr;
                        }
                    }
                });

                if (isNow) {
                    activeIds.push(program.courseId);
                    statusMap[program.courseId] = "Class in Progress";
                } else if (nextSlot) {
                    statusMap[program.courseId] = `Next: ${nextSlot}`;
                } else {
                    statusMap[program.courseId] = "No more classes today";
                }
            });

            setActiveCourseIds(activeIds);
            setProgramStatusMap(statusMap);
        };

        // Run immediately and then every minute
        checkActiveSessions();
        const interval = setInterval(checkActiveSessions, 60000); // 1 minute

        return () => clearInterval(interval);
    }, [myPrograms, timetables]);

    const handleTakeAttendance = (program) => {
        // Ensure the program object passed to modal has active status so it appears
        setSelectedProgramForAttendance({ ...program, status: 'active' });
        setShowAttendanceModal(true);
    };

    return (
        <>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ color: 'white', marginBottom: '0.5rem', fontSize: '2rem' }}>Academic Overview</h1>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '0' }}>
                            Manage your assigned courses and view class details.
                        </p>
                    </div>
                    {myManagedClasses.length > 0 && (
                        <button
                            onClick={() => setShowSubstitutionModal(true)}
                            style={{
                                padding: '10px 20px',
                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.4)'
                            }}
                        >
                            <Users size={18} /> Manage Substitutions
                        </button>
                    )}
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#14b8a6', borderRadius: '50%' }}></div>
                    </div>
                ) : (
                    <>

                        {/* My Class Teacher Status Section */}
                        {myManagedClasses.length > 0 && (
                            <section style={{ marginBottom: '3rem' }}>
                                <h2 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Users size={24} color="var(--color-accent)" />
                                    My Class (Class Teacher)
                                </h2>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                    {myManagedClasses.map((cls) => (
                                        <div key={cls.id} style={{
                                            background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.6), rgba(30, 41, 59, 0.3))',
                                            border: '1px solid var(--color-accent)',
                                            borderRadius: '1rem',
                                            padding: '1.5rem',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                position: 'absolute', top: 0, right: 0, padding: '0.5rem 1rem',
                                                background: 'var(--color-accent)', color: 'white',
                                                borderBottomLeftRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600
                                            }}>
                                                Class Teacher
                                            </div>
                                            <h3 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '0.5rem', marginTop: '1rem' }}>
                                                {cls.programName}
                                            </h3>
                                            <div style={{ color: 'var(--color-text-muted)', fontSize: '1rem', marginBottom: '1rem' }}>
                                                Semester {cls.semesterNo}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-main)' }}>
                                                <Users size={18} />
                                                <span style={{ fontWeight: 600 }}>{cls.studentCount}</span> Students Enrolled
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* My Assigned Courses Section */}
                        <section>
                            <h2 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <BookOpen size={24} color="var(--color-primary)" />
                                My Assigned Courses
                            </h2>

                            {myPrograms.length === 0 ? (
                                <div style={{
                                    padding: '3rem',
                                    textAlign: 'center',
                                    background: 'rgba(255,255,255,0.02)',
                                    borderRadius: '1rem',
                                    border: '1px dashed var(--color-border)',
                                    color: 'var(--color-text-muted)'
                                }}>
                                    No courses assigned yet.
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                    {myPrograms.map((program) => (
                                        <ProgramCard
                                            key={program.id}
                                            programCode={program.programCode}
                                            programName={program.courseName}
                                            section={`${program.degreeName} | ${program.section}`}
                                            studentCount={program.studentCount}
                                            status={activeCourseIds.includes(program.courseId) ? 'active' : 'inactive'}
                                            statusMessage={programStatusMap[program.courseId]}
                                            onAction={() => handleTakeAttendance(program)}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>
                    </>
                )}
            </div>

            {/* Attendance Modal */}
            <AnimatePresence>
                {showAttendanceModal && selectedProgramForAttendance && (
                    <AttendanceModal
                        isOpen={showAttendanceModal}
                        onClose={() => setShowAttendanceModal(false)}
                        programs={[selectedProgramForAttendance]}
                    />
                )}
            </AnimatePresence>

            {/* Substitution Modal */}
            <AnimatePresence>
                {showSubstitutionModal && (
                    <SubstitutionManagement
                        isOpen={showSubstitutionModal}
                        onClose={() => setShowSubstitutionModal(false)}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default FacultyPrograms;
