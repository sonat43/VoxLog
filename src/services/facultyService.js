import { db, storage } from './firebase';
import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    serverTimestamp,
    orderBy,
    writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const getBackendUrl = () => {
    // If we're on localhost, assume backend is too. 
    // Otherwise use the current hostname (useful for mobile testing on same network)
    const hostname = window.location.hostname;
    return `http://${hostname}:5000`;
};

const BACKEND_URL = getBackendUrl();

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
            try {
                const syllabus = await getSyllabus(subject.id);
                if (syllabus && syllabus.topics) {
                    totalSyllabusTopics += syllabus.topics.length;
                    completedSyllabusTopics += syllabus.topics.filter(t => t.completed).length;
                }
            } catch (err) {
                console.warn("Syllabus fetch failed for", subject.name, err);
            }

            // --- Assessments & Grading ---
            try {
                const assessments = await getAssessments(subject.id);

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
                        const pending = Math.max(0, studentCount - gradedCount);
                        totalPendingGrading += pending;

                        // Add to recent activity
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

                // --- At Risk (Assessments dependent) ---
                const atRiskInSubject = await getAtRiskStudents(subject.id);
                totalAtRisk += atRiskInSubject.length;

            } catch (err) {
                // console.warn("Assessment/Stats fetch failed (likely missing index):", err.message);
                // Swallow error so other stats (like syllabus) still show
            }
        }

        // Fetch Recent Attendance
        try {
            const recentAttendance = await getAttendanceHistory(facultyId);
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
        } catch (err) {
            console.warn("Attendance history fetch failed (likely missing index):", err.message);
        }

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
        const batch = writeBatch(db);

        // 1. Create Session Record
        const sessionRef = doc(collection(db, "attendance_history"));
        batch.set(sessionRef, {
            ...sessionData,
            role: sessionData.role || 'Regular',
            timestamp: serverTimestamp()
        });

        // 2. Fetch Students for this Semester
        if (sessionData.semesterId) {
            const qStudents = query(
                collection(db, "students"),
                where("semesterId", "==", sessionData.semesterId)
            );
            const studentSnap = await getDocs(qStudents);

            const todayStr = sessionData.dateString || new Date().toISOString().split('T')[0];

            // Format time for slot
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

            const presentIds = sessionData.presentStudentIds || [];

            studentSnap.docs.forEach(studentDoc => {
                const student = studentDoc.data();
                const recordRef = doc(collection(db, "attendance_records"));

                // If presentIds is provided, use it to determine status. 
                // Otherwise fall back to 'Present' (for legacy or simple modes)
                let status = 'Absent';
                if (sessionData.presentStudentIds) {
                    status = presentIds.includes(studentDoc.id) ? 'Present' : 'Absent';
                } else {
                    status = 'Present';
                }

                batch.set(recordRef, {
                    studentId: studentDoc.id,
                    studentName: student.name,
                    regNo: student.regNo,
                    subjectId: sessionData.subjectId,
                    subjectName: sessionData.subjectName,
                    semesterId: sessionData.semesterId,
                    dateString: todayStr,
                    slotTime: timeString,
                    status: status,
                    markedBy: sessionData.facultyId,
                    mode: sessionData.mode,
                    sessionId: sessionRef.id,
                    createdAt: serverTimestamp()
                });
            });
        }

        await batch.commit();
        return { success: true, sessionId: sessionRef.id };

    } catch (error) {
        console.error("Error saving attendance session:", error);
        throw error;
    }
};

// --- Smart Attendance API Calls ---

export const getHeadcount = async (imageBlob) => {
    const formData = new FormData();
    formData.append('image', imageBlob, 'capture.jpg');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
        const response = await fetch(`${BACKEND_URL}/count-students`, {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        if (!response.ok) throw new Error('Failed to get headcount');
        return await response.json();
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') throw new Error('Headcount request timed out. Check connection.');
        throw err;
    }
};

export const processRollCall = async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s for audio processing

    try {
        const response = await fetch(`${BACKEND_URL}/process-rollcall`, {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        if (!response.ok) throw new Error('Failed to process roll call');
        return await response.json();
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') throw new Error('Roll call processing timed out.');
        throw err;
    }
};

export const getTodayAttendanceSessions = async (facultyId) => {
    try {
        const todayStr = new Date().toISOString().split('T')[0];
        const q = query(
            collection(db, "attendance_history"),
            where("facultyId", "==", facultyId),
            where("dateString", "==", todayStr)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching today's attendance sessions:", error);
        return [];
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

// ===========================
// RESOURCE CENTER
// ===========================

export const uploadResource = async (subjectId, resourceData, file) => {
    try {
        let downloadUrl = resourceData.url;
        let storageRefPath = null;

        // 1. Upload File if present
        if (file) {
            // Create a unique path: resources/{subjectId}/{timestamp}_{filename}
            const uniqueName = `${Date.now()}_${file.name}`;
            storageRefPath = `resources/${subjectId}/${uniqueName}`;
            const storageRef = ref(storage, storageRefPath);

            await uploadBytes(storageRef, file);
            downloadUrl = await getDownloadURL(storageRef);
        }

        // 2. Save Metadata to Firestore
        const docRef = await addDoc(collection(db, "course_resources"), {
            subjectId,
            title: resourceData.title,
            type: resourceData.type,
            url: downloadUrl,
            storageRefPath: storageRefPath || null, // Create if file upload
            fileName: file ? file.name : null,
            createdAt: serverTimestamp()
        });

        return { id: docRef.id, url: downloadUrl };

    } catch (error) {
        console.error("Error uploading resource:", error);
        throw error;
    }
};

export const getSubjectResources = async (subjectId) => {
    try {
        const q = query(
            collection(db, "course_resources"),
            where("subjectId", "==", subjectId),
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                date: data.createdAt ? data.createdAt.toDate().toISOString().split('T')[0] : 'Just now'
            };
        });
    } catch (error) {
        console.error(`Error fetching resources for subject ${subjectId}:`, error);
        // Fallback or empty on error (e.g. missing index)
        if (error.code === 'failed-precondition') {
            console.warn("Missing index for resources. Returning empty for now.");
        }
        return [];
    }
};

export const deleteResource = async (resourceId, storageRefPath) => {
    try {
        // 1. Delete from Firestore
        await deleteDoc(doc(db, "course_resources", resourceId));

        // 2. Delete from Storage if applicable
        if (storageRefPath) {
            const storageRef = ref(storage, storageRefPath);
            await deleteObject(storageRef);
        }
        return true;
    } catch (error) {
        console.error("Error deleting resource:", error);
        throw error;
    }
};


