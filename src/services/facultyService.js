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
import { sendDailyParentReport } from './emailService';
import { getFacultyScheduleForDate } from './timetableService';

const getBackendUrl = () => {
    // If we're on localhost, assume backend is too. 
    // Otherwise use the current hostname (useful for mobile testing on same network)
    return 'https://voxlog-backend1.onrender.com';
};

const BACKEND_URL = getBackendUrl();

// ===========================
// SYLLABUS MANAGEMENT
// ===========================

export const getSyllabus = async (courseId) => { // courseId in UI is DB subjectId
    const q = query(collection(db, "subject_syllabus"), where("subjectId", "==", courseId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        // Return default structure if no syllabus exists yet
        return { topics: [] };
    }

    // Assuming one syllabus doc per course for now
    const data = querySnapshot.docs[0].data();
    return {
        id: querySnapshot.docs[0].id,
        ...data,
        courseId: data.courseId || data.subjectId // Backward UI compatibility
    };
};

export const updateTopicStatus = async (syllabusId, topics) => {
    const syllabusRef = doc(db, "subject_syllabus", syllabusId);
    await updateDoc(syllabusRef, {
        topics,
        lastUpdated: serverTimestamp()
    });
};

export const initializeSyllabus = async (courseId, defaultTopics) => {
    await addDoc(collection(db, "subject_syllabus"), {
        subjectId: courseId,
        courseId, // Backward SDK comp
        topics: defaultTopics,
        createdAt: serverTimestamp()
    });
};

// ===========================
// GRADEBOOK & ASSESSMENTS
// ===========================

export const createAssessment = async (assessmentData) => {
    // assessmentData: { courseId, facultyId, title, type, maxMarks, weightage }
    const docRef = await addDoc(collection(db, "assessments"), {
        ...assessmentData,
        subjectId: assessmentData.courseId, // Ensure mapped to DB structure
        createdAt: serverTimestamp(),
        status: 'published' // or 'draft'
    });
    return docRef.id;
};

export const getAssessments = async (courseId) => {
    const q = query(
        collection(db, "assessments"),
        where("subjectId", "==", courseId), // DB uses subjectId
        orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            courseId: data.courseId || data.subjectId
        };
    });
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

export const getAtRiskStudents = async (courseId) => {
    // 1. Get all assessments for this course
    const assessments = await getAssessments(courseId);
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

export const getMyCourses = async (facultyId) => {
    const q = query(collection(db, "faculty_subjects"), where("facultyId", "==", facultyId)); // DB is faculty_subjects
    const snapshot = await getDocs(q);

    const courses = [];
    for (const d of snapshot.docs) {
        const data = d.data();
        const subjectId = data.subjectId || data.courseId;
        // Fetch actual course details (DB courses are now subjects)
        const subDoc = await getDoc(doc(db, "subjects", subjectId));
        if (subDoc.exists()) {
            const courseData = subDoc.data();
            let semesterData = {};

            // Fetch Semester Details if linked
            if (courseData.semesterId) {
                try {
                    const semDoc = await getDoc(doc(db, "semesters", courseData.semesterId));
                    if (semDoc.exists()) {
                        semesterData = {
                            semesterName: semDoc.data().name,
                            semesterNo: semDoc.data().semesterNo
                        };
                    }
                } catch (err) {
                    console.error("Error fetching semester for course", courseData.name, err);
                }
            }

            courses.push({
                id: subDoc.id,
                ...courseData,
                ...semesterData,
                assignmentId: d.id,
                academicYear: data.academicYear
            });
        }
    }
    return courses;
};

export const getDashboardStats = async (facultyId) => {
    try {
        // 1. Get Courses
        const courses = await getMyCourses(facultyId);

        // Initialize Aggregates
        let totalAtRisk = 0;
        let totalPendingGrading = 0;
        let totalSyllabusTopics = 0;
        let completedSyllabusTopics = 0;
        let recentActivity = [];

        // Cache for semester student counts to avoid repeated fetching
        const semesterStudentCounts = {};

        // 2. Iterate Courses
        for (const course of courses) {
            // --- Syllabus Progress ---
            try {
                const syllabus = await getSyllabus(course.id);
                if (syllabus && syllabus.topics) {
                    totalSyllabusTopics += syllabus.topics.length;
                    completedSyllabusTopics += syllabus.topics.filter(t => t.completed).length;
                }
            } catch (err) {
                console.warn("Syllabus fetch failed for", course.name, err);
            }

            // --- Assessments & Grading ---
            try {
                const assessments = await getAssessments(course.id);

                // Get Student Count for this Semester
                if (course.semesterId) {
                    if (semesterStudentCounts[course.semesterId] === undefined) {
                        const qStudents = query(collection(db, "students"), where("semesterId", "==", course.semesterId));
                        const snap = await getDocs(qStudents);
                        semesterStudentCounts[course.semesterId] = snap.size;
                    }
                    const studentCount = semesterStudentCounts[course.semesterId];

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
                                course: course.name,
                                date: assessment.createdAt.toDate()
                            });
                        }
                    }
                }

                // --- At Risk (Assessments dependent) ---
                const atRiskInCourse = await getAtRiskStudents(course.id);
                totalAtRisk += atRiskInCourse.length;

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
                        course: att.courseName,
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
            coursesCount: courses.length,
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
            evidence: sessionData.evidence || null, // Capture evidence (filenames)
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
                    courseId: sessionData.courseId,
                    courseName: sessionData.courseName,
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

        // Check Daily Attendance Status
        if (sessionData.facultyId) {
            try {
                const todayStr = sessionData.dateString || new Date().toISOString().split('T')[0];
                await evaluateFacultyDailyAttendance(sessionData.facultyId, todayStr);
            } catch (evalErr) {
                console.warn("[WARN] Failed to evaluate daily faculty attendance:", evalErr);
            }
        }

        return { success: true, sessionId: sessionRef.id };

    } catch (error) {
        console.error("Error saving attendance session:", error);
        throw error;
    }
};

/**
 * Automatically evaluates whether a faculty member has completed all their assigned 
 * classes for the day. If so, marks them as 'Present', else 'Absent'.
 */
export const evaluateFacultyDailyAttendance = async (facultyId, dateString) => {
    try {
        console.log(`[DEBUG] Evaluating Daily Attendance for Faculty ${facultyId} on ${dateString}`);

        // 1. Get Scheduled Classes for Today
        const schedule = await getFacultyScheduleForDate(facultyId, dateString);
        if (schedule.length === 0) {
            console.log(`[DEBUG] Faculty ${facultyId} has no scheduled classes today. Skipping.`);
            return;
        }

        // 2. Fetch Sessions recorded by this faculty today
        const qSessions = query(
            collection(db, "attendance_history"),
            where("facultyId", "==", facultyId),
            where("dateString", "==", dateString),
            where("status", "==", "completed")
        );
        const sessionsSnap = await getDocs(qSessions);

        // Count unique courses handled today
        const handledCourseIds = new Set();
        sessionsSnap.docs.forEach(doc => {
            handledCourseIds.add(doc.data().courseId);
        });

        // 3. Compare Required vs Handled
        let targetClasses = 0;
        let completedClasses = 0;

        schedule.forEach(slot => {
            targetClasses++;
            if (handledCourseIds.has(slot.courseId)) {
                completedClasses++;
            }
        });

        const status = completedClasses >= targetClasses ? 'Present' : 'Absent';
        console.log(`[DEBUG] Faculty ${facultyId} completed ${completedClasses}/${targetClasses} classes. Status: ${status}`);

        // 4. Save/Update to 'faculty_attendance' table
        // We use a specific ID to ensure one record per faculty per day
        const recordId = `${facultyId}_${dateString}`;
        const recordRef = doc(db, "faculty_attendance", recordId);

        await setDoc(recordRef, {
            facultyId: facultyId,
            dateString: dateString,
            status: status,
            targetClasses: targetClasses,
            completedClasses: completedClasses,
            lastUpdatedAt: serverTimestamp()
        }, { merge: true });

        return { status, completedClasses, targetClasses };

    } catch (error) {
        console.error("Error evaluating faculty daily attendance:", error);
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

export const processRollCall = async (audioBlob, validRolls = null) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    if (validRolls) {
        formData.append('valid_rolls', JSON.stringify(validRolls));
    }

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
            where("facultyId", "==", facultyId)
        );
        const querySnapshot = await getDocs(q);
        const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return records.sort((a, b) => {
            const timeA = a.timestamp?.toMillis() || 0;
            const timeB = b.timestamp?.toMillis() || 0;
            return timeB - timeA;
        });
    } catch (error) {
        console.error("Error fetching attendance history:", error);
        return [];
    }
};

export const processEndOfDayEmails = async () => {
    try {
        const todayStr = new Date().toISOString().split('T')[0];
        console.log(`[EOD] Processing end-of-day emails for ${todayStr}...`);

        // 1. Fetch all attendance records for today
        const qRecords = query(
            collection(db, "attendance_records"),
            where("dateString", "==", todayStr)
        );
        const recordSnap = await getDocs(qRecords);

        if (recordSnap.empty) {
            console.log("[EOD] No attendance records found for today.");
            return { success: true, count: 0, message: "No records to process today." };
        }

        // 2. Group records by Student ID
        const recordsByStudent = {};
        recordSnap.docs.forEach(doc => {
            const data = doc.data();
            if (!recordsByStudent[data.studentId]) {
                recordsByStudent[data.studentId] = [];
            }
            recordsByStudent[data.studentId].push(data);
        });

        // 3. Process each student
        let emailsSent = 0;
        let emailsFailed = 0;
        let studentsWithNoEmail = 0;
        let lastError = null;
        const studentIds = Object.keys(recordsByStudent);

        for (const studentId of studentIds) {
            // Fetch student info
            const studentRef = doc(db, "students", studentId);
            const studentSnap = await getDoc(studentRef);

            if (studentSnap.exists()) {
                const studentData = studentSnap.data();

                // Only send if parentEmail exists
                if (studentData.parentEmail && studentData.parentEmail.trim() !== '') {
                    const records = recordsByStudent[studentId];
                    // Sort records by slotTime or course name to ensure consistent order
                    records.sort((a, b) => (a.slotTime || '').localeCompare(b.slotTime || ''));

                    const result = await sendDailyParentReport(
                        studentData.parentEmail,
                        { name: studentData.name, regNo: studentData.regNo },
                        records,
                        todayStr
                    );

                    if (result.success) {
                        emailsSent++;
                    } else {
                        emailsFailed++;
                        lastError = result.error;
                    }
                } else {
                    studentsWithNoEmail++;
                }
            }
        }

        console.log(`[EOD] Processed. Sent: ${emailsSent}, Failed: ${emailsFailed}, Skipped: ${studentsWithNoEmail}`);

        let msg = `Sent: ${emailsSent}.`;
        if (studentsWithNoEmail > 0) msg += ` Skipped ${studentsWithNoEmail} (missing parent email).`;
        if (emailsFailed > 0) msg += ` Failed ${emailsFailed} (Error: ${lastError}).`;
        if (emailsSent === 0 && emailsFailed === 0 && studentsWithNoEmail === 0) msg = "No attendance records found to process today.";

        return {
            success: emailsFailed === 0,
            count: emailsSent,
            message: msg
        };

    } catch (error) {
        console.error("[EOD] Error processing end-of-day emails:", error);
        throw error;
    }
};

// ===========================
// RESOURCE CENTER
// ===========================

export const uploadResource = async (courseId, resourceData, file) => {
    try {
        let downloadUrl = resourceData.url;
        let storageRefPath = null;

        // 1. Upload File if present
        if (file) {
            // Create a unique path: resources/{courseId}/{timestamp}_{filename}
            const uniqueName = `${Date.now()}_${file.name}`;
            storageRefPath = `resources/${courseId}/${uniqueName}`;
            const storageRef = ref(storage, storageRefPath);

            await uploadBytes(storageRef, file);
            downloadUrl = await getDownloadURL(storageRef);
        }

        // 2. Save Metadata to Firestore
        const docRef = await addDoc(collection(db, "subject_resources"), {
            subjectId: courseId, // DB expects subjectId
            courseId,            // UI compat
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

export const getCourseResources = async (courseId) => {
    try {
        const q = query(
            collection(db, "subject_resources"),
            where("subjectId", "==", courseId),
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                courseId: data.courseId || data.subjectId,
                date: data.createdAt ? data.createdAt.toDate().toISOString().split('T')[0] : 'Just now'
            };
        });
    } catch (error) {
        console.error(`Error fetching resources for course ${courseId}:`, error);
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
        await deleteDoc(doc(db, "subject_resources", resourceId));

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

// ===========================
// NEW WIDGET FETCHERS
// ===========================

export const getFacultyClassAttendanceAverages = async (facultyId) => {
    try {
        const courses = await getMyCourses(facultyId);

        let averages = [];
        for (const course of courses) {
            console.log(`[DEBUG] Fetching avg for course: ${course.name} (${course.id})`);
            const q = query(collection(db, "attendance_records"), where("courseId", "==", course.id));
            const snap = await getDocs(q);

            let present = 0;
            const total = snap.size;

            snap.forEach(doc => {
                const data = doc.data();
                if (data.status === 'Present' || data.status === 'present') {
                    present++;
                }
            });

            console.log(`[DEBUG] Course ${course.name}: ${total} records, ${present} present`);

            if (total > 0) {
                averages.push({
                    courseId: course.id,
                    courseName: course.name,
                    code: course.code,
                    percentage: Math.round((present / total) * 100),
                    totalClassesEvaluated: total
                });
            } else {
                averages.push({
                    courseId: course.id,
                    courseName: course.name,
                    code: course.code,
                    percentage: 0,
                    totalClassesEvaluated: 0
                });
            }
        }

        return averages;
    } catch (error) {
        console.error("Error fetching class attendance averages:", error);
        return [];
    }
};

export const getStudentBirthdaysToday = async (facultyId) => {
    try {
        const courses = await getMyCourses(facultyId);
        const semesterIds = [...new Set(courses.map(s => s.semesterId).filter(Boolean))];

        const today = new Date();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const birthdayPattern = `-${mm}-${dd}`; // Matches YYYY-MM-DD

        const birthdays = [];

        for (const semId of semesterIds) {
            const q = query(collection(db, "students"), where("semesterId", "==", semId));
            const snap = await getDocs(q);

            snap.forEach(doc => {
                const data = doc.data();
                const dob = data.dob || data.dateOfBirth;
                if (dob && dob.includes(birthdayPattern)) {
                    if (!birthdays.some(b => b.id === doc.id)) { // Avoid duplicates
                        birthdays.push({
                            id: doc.id,
                            name: data.name,
                            semesterName: courses.find(s => s.semesterId === semId)?.semesterName || 'Class'
                        });
                    }
                }
            });
        }
        return birthdays;
    } catch (error) {
        console.error("Error fetching birthdays:", error);
        return [];
    }
};

export const getFacultyPersonalAttendanceHistory = async (facultyId) => {
    try {
        const q = query(
            collection(db, "faculty_attendance"),
            where("facultyId", "==", facultyId)
        );
        const snap = await getDocs(q);
        const records = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort client-side to avoid requiring Firebase Composite Index
        return records.sort((a, b) => new Date(b.dateString) - new Date(a.dateString));
    } catch (error) {
        console.error("Error fetching personal attendance history:", error);
        return [];
    }
};


