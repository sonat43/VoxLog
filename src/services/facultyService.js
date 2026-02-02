import { db } from './firebase';
import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    addDoc,
    updateDoc,
    query,
    where,
    serverTimestamp,
    orderBy
} from 'firebase/firestore';

// ===========================
// SYLLABUS MANAGEMENT
// ===========================

export const getSyllabus = async (subjectId) => {
    const q = query(collection(db, "course_syllabus"), where("subjectId", "==", subjectId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        // Return default structure if no syllabus exists yet
        return { topics: [] };
    }

    // Assuming one syllabus doc per subject for now
    return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
};

export const updateTopicStatus = async (syllabusId, topics) => {
    const syllabusRef = doc(db, "course_syllabus", syllabusId);
    await updateDoc(syllabusRef, {
        topics,
        lastUpdated: serverTimestamp()
    });
};

export const initializeSyllabus = async (subjectId, defaultTopics) => {
    await addDoc(collection(db, "course_syllabus"), {
        subjectId,
        topics: defaultTopics,
        createdAt: serverTimestamp()
    });
};

// ===========================
// GRADEBOOK & ASSESSMENTS
// ===========================

export const createAssessment = async (assessmentData) => {
    // assessmentData: { subjectId, facultyId, title, type, maxMarks, weightage }
    const docRef = await addDoc(collection(db, "assessments"), {
        ...assessmentData,
        createdAt: serverTimestamp(),
        status: 'published' // or 'draft'
    });
    return docRef.id;
};

export const getAssessments = async (subjectId) => {
    const q = query(
        collection(db, "assessments"),
        where("subjectId", "==", subjectId),
        orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const saveStudentGrade = async (assessmentId, studentId, marksObtained, facultyId) => {
    // Create a composite ID to ensure one grade per student per assessment
    const gradeId = `${assessmentId}_${studentId}`;
    const gradeRef = doc(db, "student_grades", gradeId);

    await setDoc(gradeRef, {
        assessmentId,
        studentId,
        marksObtained: Number(marksObtained),
        gradedBy: facultyId,
        gradedAt: serverTimestamp()
    }, { merge: true });
};

export const getGradesForAssessment = async (assessmentId) => {
    const q = query(collection(db, "student_grades"), where("assessmentId", "==", assessmentId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ===========================
// ANALYTICS & EARLY WARNING
// ===========================

export const getAtRiskStudents = async (subjectId) => {
    // 1. Get all assessments for this subject
    const assessments = await getAssessments(subjectId);
    if (assessments.length === 0) return [];

    const assessmentIds = assessments.map(a => a.id);

    // 2. Get all grades for these assessments
    // Note: In a large app, we'd need a more efficient query or aggregation function
    // For this prototype, client-side aggregation is acceptable for class sizes < 100

    const allGrades = [];
    for (const aid of assessmentIds) {
        const grades = await getGradesForAssessment(aid);
        allGrades.push(...grades);
    }

    // 3. Group by student and calculate average %
    const studentPerformance = {};

    allGrades.forEach(grade => {
        if (!studentPerformance[grade.studentId]) {
            studentPerformance[grade.studentId] = {
                totalObtained: 0,
                totalMax: 0,
                assessmentsCount: 0
            };
        }

        const assessment = assessments.find(a => a.id === grade.assessmentId);
        if (assessment) {
            studentPerformance[grade.studentId].totalObtained += grade.marksObtained;
            studentPerformance[grade.studentId].totalMax += assessment.maxMarks;
            studentPerformance[grade.studentId].assessmentsCount++;
        }
    });

    // 4. Filter for < 50% performance
    const atRiskList = [];
    for (const [studentId, stats] of Object.entries(studentPerformance)) {
        const percentage = (stats.totalObtained / stats.totalMax) * 100;
        if (percentage < 50) {
            // Fetch student details (optional, or caller handles it)
            // For now returning ID and stats
            atRiskList.push({
                studentId,
                percentage: percentage.toFixed(1),
                assessmentsMissed: assessments.length - stats.assessmentsCount
            });
        }
    }

    return atRiskList;
};

export const getMySubjects = async (facultyId) => {
    const q = query(collection(db, "faculty_subjects"), where("facultyId", "==", facultyId));
    const snapshot = await getDocs(q);

    const subjects = [];
    for (const d of snapshot.docs) {
        const data = d.data();
        // Fetch actual subject details
        const subDoc = await getDoc(doc(db, "subjects", data.subjectId));
        if (subDoc.exists()) {
            const subjectData = subDoc.data();
            let semesterData = {};

            // Fetch Semester Details if linked
            if (subjectData.semesterId) {
                try {
                    const semDoc = await getDoc(doc(db, "semesters", subjectData.semesterId));
                    if (semDoc.exists()) {
                        semesterData = {
                            semesterName: semDoc.data().name,
                            semesterNo: semDoc.data().semesterNo
                        };
                    }
                } catch (err) {
                    console.error("Error fetching semester for subject", subjectData.name, err);
                }
            }

            subjects.push({
                id: subDoc.id,
                ...subjectData,
                ...semesterData,
                assignmentId: d.id,
                academicYear: data.academicYear
            });
        }
    }
    return subjects;
};

export const getDashboardStats = async (facultyId) => {
    try {
        // 1. Get Subjects
        const subjects = await getMySubjects(facultyId);

        // Initialize Aggregates
        let totalAtRisk = 0;
        let totalPendingGrading = 0;
        let totalSyllabusTopics = 0;
        let completedSyllabusTopics = 0;
        let recentActivity = [];

        // Cache for semester student counts to avoid repeated fetching
        const semesterStudentCounts = {};

        // 2. Iterate Subjects
        for (const subject of subjects) {
            // --- Syllabus Progress ---
            const syllabus = await getSyllabus(subject.id);
            if (syllabus && syllabus.topics) {
                totalSyllabusTopics += syllabus.topics.length;
                completedSyllabusTopics += syllabus.topics.filter(t => t.completed).length;
            }

            // --- Assessments & Grading ---
            const assessments = await getAssessments(subject.id);

            // Filter only published assessments? Assuming all fetched are relevant.

            // Get Student Count for this Semester
            if (subject.semesterId) {
                if (semesterStudentCounts[subject.semesterId] === undefined) {
                    const qStudents = query(collection(db, "students"), where("semesterId", "==", subject.semesterId));
                    const snap = await getDocs(qStudents);
                    semesterStudentCounts[subject.semesterId] = snap.size;
                }
                const studentCount = semesterStudentCounts[subject.semesterId];

                // Calculate Pending Grading
                for (const assessment of assessments) {
                    const grades = await getGradesForAssessment(assessment.id);
                    const gradedCount = grades.length;

                    // Pending = Total Students - Graded Count
                    // Ensure non-negative (incase student count changed)
                    const pending = Math.max(0, studentCount - gradedCount);
                    totalPendingGrading += pending;

                    // Add to recent activity (simple logic: created recently)
                    const diffDays = (new Date() - assessment.createdAt.toDate()) / (1000 * 3600 * 24);
                    if (diffDays < 7) {
                        recentActivity.push({
                            type: 'assessment',
                            title: assessment.title,
                            subject: subject.name,
                            date: assessment.createdAt.toDate()
                        });
                    }
                }
            }

            // --- At Risk (Reuse existing logic per subject) ---
            const atRiskInSubject = await getAtRiskStudents(subject.id);
            totalAtRisk += atRiskInSubject.length;
        }

        // Fetch Recent Attendance
        const recentAttendance = await getAttendanceHistory(facultyId); // We just added this function
        recentAttendance.forEach(att => {
            const diffDays = (new Date() - att.timestamp.toDate()) / (1000 * 3600 * 24);
            if (diffDays < 7) {
                recentActivity.push({
                    type: 'attendance',
                    title: `Attendance: ${att.mode === 'voice' ? 'Voice' : 'Camera'}`,
                    subject: att.subjectName,
                    date: att.timestamp.toDate()
                });
            }
        });

        // 3. Calculate Syllabus %
        const syllabusProgress = totalSyllabusTopics > 0
            ? Math.round((completedSyllabusTopics / totalSyllabusTopics) * 100)
            : 0;

        return {
            subjectsCount: subjects.length,
            atRiskCount: totalAtRisk,
            pendingGrading: totalPendingGrading,
            syllabusProgress: syllabusProgress,
            recentActivity: recentActivity.sort((a, b) => b.date - a.date).slice(0, 5) // Top 5 recent
        };

    } catch (error) {
        console.error("Error aggregating dashboard stats:", error);
        throw error;
    }
};

// ===========================
// ATTENDANCE MANAGEMENT
// ===========================

export const saveAttendanceSession = async (sessionData) => {
    try {
        await addDoc(collection(db, "attendance_history"), {
            ...sessionData,
            timestamp: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error saving attendance session:", error);
        throw error;
    }
};

export const getAttendanceHistory = async (facultyId) => {
    try {
        const q = query(
            collection(db, "attendance_history"),
            where("facultyId", "==", facultyId),
            orderBy("timestamp", "desc")
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching attendance history:", error);
        return [];
    }
};
