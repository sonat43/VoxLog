import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import CourseCard from '../../components/dashboard/CourseCard';
import LoadingScreen from '../../components/LoadingScreen';
import { useAuth } from '../../context/AuthContext';
import {
    getFacultyAssignmentsByFaculty,
    getSubjects,
    getSemesters,
    getCourses,
    getSemestersByClassTeacher
} from '../../services/academicService';
import { BookOpen, Users } from 'lucide-react';

const FacultyCourses = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [myCourses, setMyCourses] = useState([]);
    const [myManagedClasses, setMyManagedClasses] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            setLoading(true);
            try {
                // Fetch all raw data we might need
                // Ideally this should be more targeted, but for now we fetch lists to map
                const [
                    assignments,
                    allSubjects,
                    allSemesters,
                    allCourses,
                    managedSemesters
                ] = await Promise.all([
                    getFacultyAssignmentsByFaculty(user.uid),
                    getSubjects(),
                    getSemesters(),
                    getCourses(),
                    getSemestersByClassTeacher(user.uid)
                ]);

                // Process "My Subjects" (Courses I teach)
                const processedCourses = assignments.map(assignment => {
                    const subject = allSubjects.find(s => s.id === assignment.subjectId);
                    if (!subject) return null;

                    const semester = allSemesters.find(s => s.id === subject.semesterId);
                    // Use subject.courseId if available, fallback to semester.courseId
                    const courseId = subject.courseId || (semester ? semester.courseId : null);
                    const course = allCourses.find(c => c.id === courseId);

                    return {
                        id: assignment.id, // Assignment ID
                        subjectId: subject.id,
                        courseCode: subject.code,
                        courseName: subject.name,
                        // If we have semester info, show it
                        section: semester ? `Sem ${semester.semesterNo}` : 'N/A',
                        studentCount: semester ? semester.studentCount : 0,
                        status: 'active', // Defaulting to active for now
                        programName: course ? course.name : 'Unknown Program'
                    };
                }).filter(item => item !== null);

                setMyCourses(processedCourses);

                // Process "My Class" (Classes I am a Class Teacher for)
                const processedManagedClasses = managedSemesters.map(semester => {
                    const course = allCourses.find(c => c.id === semester.courseId);
                    return {
                        id: semester.id,
                        semesterNo: semester.semesterNo,
                        studentCount: semester.studentCount,
                        programName: course ? course.name : 'Unknown Program',
                        courseId: course ? course.id : null
                    };
                });

                setMyManagedClasses(processedManagedClasses);

            } catch (error) {
                console.error("Error fetching faculty courses:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <DashboardLayout>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <h1 style={{ color: 'white', marginBottom: '0.5rem', fontSize: '2rem' }}>Academic Overview</h1>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                    Manage your assigned subjects and view class details.
                </p>

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

                {/* My Assigned Subjects Section */}
                <section>
                    <h2 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <BookOpen size={24} color="var(--color-primary)" />
                        My Assigned Subjects
                    </h2>

                    {myCourses.length === 0 ? (
                        <div style={{
                            padding: '3rem',
                            textAlign: 'center',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: '1rem',
                            border: '1px dashed var(--color-border)',
                            color: 'var(--color-text-muted)'
                        }}>
                            No subjects assigned yet.
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            {myCourses.map((course) => (
                                <CourseCard
                                    key={course.id}
                                    courseCode={course.courseCode}
                                    courseName={course.courseName}
                                    section={course.section}
                                    studentCount={course.studentCount}
                                    status={course.status}
                                    onAction={() => {
                                        // Placeholder for future action (e.g. go to attendance)
                                        console.log("Action on course", course);
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </DashboardLayout>
    );
};

export default FacultyCourses;
