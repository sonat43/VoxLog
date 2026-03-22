import { db } from './firebase';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    doc,
    query,
    where,
    serverTimestamp,
    getDoc,
    orderBy,
    limit
} from 'firebase/firestore';
import { createNotification } from './notificationService';

// ===========================
// CACHING LAYER (Simple Singleton Cache)
// ===========================
const cache = {
    departments: null,
    programs: null,
    semesters: null,
    subjects: null,
    lastUpdate: {}
};

export const clearAcademicCache = (key = null) => {
    if (key) {
        cache[key] = null;
        console.log(`[Cache] Cleared: ${key}`);
    } else {
        Object.keys(cache).forEach(k => cache[k] = null);
        console.log(`[Cache] Cleared All`);
    }
};

// ===========================
// DEPARTMENTS
// ===========================

export const addDepartment = async (name) => {
    // Check for duplicate name
    const q = query(collection(db, "departments"), where("name", "==", name));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error("Department with this name already exists.");
    }

    await addDoc(collection(db, "departments"), {
        name,
        status: 'active',
        createdAt: serverTimestamp()
    });
    clearAcademicCache('departments');
};

export const getDepartments = async (forceRefresh = false) => {
    if (!forceRefresh && cache.departments) {
        console.log("[Cache] Returning cached departments");
        return cache.departments;
    }
    const querySnapshot = await getDocs(collection(db, "departments"));
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    cache.departments = data;
    return data;
};

export const updateDepartmentStatus = async (departmentId, newStatus) => {
    const departmentRef = doc(db, "departments", departmentId);
    await updateDoc(departmentRef, { status: newStatus });
};

export const updateDepartment = async (departmentId, data) => {
    const departmentRef = doc(db, "departments", departmentId);
    await updateDoc(departmentRef, data);
    clearAcademicCache('departments');
};

export const deleteDepartment = async (departmentId) => {
    // Check if linked to any programs
    const q = query(collection(db, "programs"), where("departmentId", "==", departmentId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error("Cannot delete department. It is linked to existing programs.");
    }

    await deleteDoc(doc(db, "departments", departmentId));
    clearAcademicCache('departments');
};

// ===========================
// PROGRAMS (DB: courses)
// ===========================

export const addProgram = async (name, departmentId, duration) => {
    await addDoc(collection(db, "courses"), {
        name,
        departmentId,
        duration: Number(duration)
    });
    clearAcademicCache('programs');
};

export const updateProgram = async (programId, data) => {
    if (data.duration) data.duration = Number(data.duration);
    const programRef = doc(db, "courses", programId);
    await updateDoc(programRef, data);
    clearAcademicCache('programs');
};

export const getPrograms = async (forceRefresh = false) => {
    if (!forceRefresh && cache.programs) {
        console.log("[Cache] Returning cached programs");
        return cache.programs;
    }
    const querySnapshot = await getDocs(collection(db, "courses"));
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    cache.programs = data;
    return data;
};

export const deleteProgram = async (programId) => {
    // Check if linked to any semesters
    const q = query(collection(db, "semesters"), where("courseId", "==", programId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error("Cannot delete program. It is linked to existing semesters.");
    }

    await deleteDoc(doc(db, "courses", programId));
    clearAcademicCache('programs');
};

// ===========================
// SEMESTERS
// ===========================

export const addSemester = async (programId, semesterNo, studentCount, classTeacherId) => {
    const semNo = Number(semesterNo);
    // Check for duplicate semesterNo for the same program (DB field: courseId)
    const q = query(
        collection(db, "semesters"),
        where("courseId", "==", programId),
        where("semesterNo", "==", semNo)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error("Semester " + semNo + " already exists for this program.");
    }

    const docRef = await addDoc(collection(db, "semesters"), {
        courseId: programId, // DB expects courseId for the parent degree
        semesterNo: semNo,
        studentCount: Number(studentCount) || 0,
        classTeacherId: classTeacherId || null,
        programId: programId // For UI compatibility if specifically reading programId
    });
    clearAcademicCache('semesters');

    if (classTeacherId) {
        try {
            await createNotification(
                classTeacherId,
                "Academic",
                `You have been designated as a Class Teacher for Semester ${semNo}.`,
                "/faculty/my-class",
                docRef.id
            );
        } catch (err) { console.error('Failed to notify class teacher', err); }
    }
};

export const updateSemester = async (semesterId, data) => {
    if (data.semesterNo) data.semesterNo = Number(data.semesterNo);
    if (data.studentCount) data.studentCount = Number(data.studentCount);

    if (data.programId) {
        data.courseId = data.programId; // DB expects courseId
    }

    const semRef = doc(db, "semesters", semesterId);
    await updateDoc(semRef, data);
    clearAcademicCache('semesters');

    if (data.classTeacherId) {
        try {
            await createNotification(
                data.classTeacherId,
                "Academic",
                `You have been designated as a Class Teacher.`,
                "/faculty/my-class",
                semesterId
            );
        } catch (err) { console.error('Failed to notify class teacher on update', err); }
    }
};

export const getSemesters = async (forceRefresh = false) => {
    if (!forceRefresh && cache.semesters) {
        console.log("[Cache] Returning cached semesters");
        return cache.semesters;
    }
    const querySnapshot = await getDocs(collection(db, "semesters"));
    const data = querySnapshot.docs.map(doc => {
        const d = doc.data();
        return {
            id: doc.id,
            ...d,
            programId: d.programId || d.courseId // Map DB courseId to UI programId 
        };
    });
    cache.semesters = data;
    return data;
};

export const deleteSemester = async (semesterId) => {
    // Check if linked to any courses (DB subjects)
    const q = query(collection(db, "subjects"), where("semesterId", "==", semesterId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error("Cannot delete semester. It is linked to existing courses.");
    }

    await deleteDoc(doc(db, "semesters", semesterId));
    clearAcademicCache('semesters');
};

// ===========================
// COURSES (DB: subjects)
// ===========================

export const addCourse = async (code, name, credits, semesterId, programId) => {
    // Check for unique code
    const q = query(collection(db, "subjects"), where("code", "==", code));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error("Course code '" + code + "' must be unique.");
    }

    await addDoc(collection(db, "subjects"), {
        code,
        name,
        credits: Number(credits),
        semesterId,
        courseId: programId, // DB subjects use courseId to point to the parent Degree (Program)
        programId // For UI compatibility backward support
    });
    clearAcademicCache('subjects');
};

export const updateCourse = async (courseId, data) => { // "courseId" parameter here is actually a Subject ID for the DB
    if (data.credits) data.credits = Number(data.credits);

    if (data.programId) {
        data.courseId = data.programId; // DB Subject uses courseId for the parent Program mapping
    }

    const subRef = doc(db, "subjects", courseId);
    await updateDoc(subRef, data);
    clearAcademicCache('subjects');
};

export const getCourses = async (forceRefresh = false) => {
    if (!forceRefresh && cache.subjects) {
        console.log("[Cache] Returning cached subjects");
        return cache.subjects;
    }
    const querySnapshot = await getDocs(collection(db, "subjects"));
    const data = querySnapshot.docs.map(doc => {
        const d = doc.data();
        return {
            id: doc.id,
            ...d,
            programId: d.programId || d.courseId // Fallback to courseId for legacy records
        };
    });
    cache.subjects = data;
    return data;
};

export const deleteCourse = async (courseId) => { // "courseId" parameter is a DB Subject ID
    // Check if any faculty are assigned to this subject
    const q = query(collection(db, "faculty_subjects"), where("subjectId", "==", courseId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error("Cannot delete course. It has faculty assigned.");
    }

    await deleteDoc(doc(db, "subjects", courseId));
    clearAcademicCache('subjects');
};

// ===========================
// FACULTY ASSIGNMENTS (DB: faculty_subjects)
// ===========================

export const assignFacultyToCourse = async (facultyId, courseId, academicYear) => {
    // Check if subject is already assigned for this academic year (to anyone)
    const q = query(
        collection(db, "faculty_subjects"),
        where("subjectId", "==", courseId), // DB uses subjectId
        where("academicYear", "==", academicYear)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error("This course is already assigned to a faculty member for the academic year " + academicYear);
    }

    const docRef = await addDoc(collection(db, "faculty_subjects"), {
        facultyId,
        subjectId: courseId, // DB expects subjectId
        courseId, // UI compatibility
        academicYear
    });

    try {
        const courseDoc = await getDoc(doc(db, "subjects", courseId));
        let courseName = "a new course";
        if (courseDoc.exists()) courseName = courseDoc.data().name;

        await createNotification(
            facultyId,
            "Academic",
            `You have been assigned to teach ${courseName} for the academic year ${academicYear}.`,
            "/faculty/courses",
            docRef.id
        );
    } catch (err) { console.error('Failed to notify faculty of course assignment', err); }
};

export const getFacultyAssignments = async () => {
    const querySnapshot = await getDocs(collection(db, "faculty_subjects"));
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            courseId: data.courseId || data.subjectId // Map db subjectId to ui courseId
        };
    });
};

export const getFacultyAssignmentsByFaculty = async (facultyId) => {
    const q = query(collection(db, "faculty_subjects"), where("facultyId", "==", facultyId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            courseId: data.courseId || data.subjectId // Map db subjectId to ui courseId
        };
    });
};

export const updateFacultyAssignment = async (assignmentId, data) => {
    // Check uniqueness if courseId or academicYear is changing

    // Map data variables correctly to db columns
    const updateData = { ...data };
    if (updateData.courseId) {
        updateData.subjectId = updateData.courseId;
    }

    if (updateData.courseId || updateData.academicYear) {
        const q = query(
            collection(db, "faculty_subjects"),
            where("subjectId", "==", updateData.subjectId || updateData.courseId),
            where("academicYear", "==", updateData.academicYear)
        );
        const querySnapshot = await getDocs(q);

        // Check if any doc found is NOT the one we are updating
        const duplicate = querySnapshot.docs.find(doc => doc.id !== assignmentId);
        if (duplicate) {
            throw new Error("This course is already assigned to a faculty member for the academic year " + updateData.academicYear);
        }
    }

    const assignRef = doc(db, "faculty_subjects", assignmentId);
    await updateDoc(assignRef, updateData);
};

export const deleteFacultyAssignment = async (assignmentId) => {
    await deleteDoc(doc(db, "faculty_subjects", assignmentId));
};

export const getSemestersByClassTeacher = async (facultyId) => {
    const q = query(collection(db, "semesters"), where("classTeacherId", "==", facultyId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ===========================
// STUDENTS
// ===========================

export const addStudent = async (data) => {
    // 1. Check Capacity
    const semRef = doc(db, "semesters", data.semesterId);
    const semSnap = await getDoc(semRef);

    if (!semSnap.exists()) {
        throw new Error("Semester not found.");
    }

    const semesterData = semSnap.data();
    const capacity = semesterData.studentCount || 0; // Total allowed

    // Count current students
    const qCount = query(collection(db, "students"), where("semesterId", "==", data.semesterId));
    const countSnap = await getDocs(qCount);
    const currentEnrollment = countSnap.size;

    if (currentEnrollment >= capacity) {
        throw new Error(`Class Full! Capacity is ${capacity} students. Cannot add more.`);
    }

    // 2. Check for duplicate Reg No
    const qReg = query(collection(db, "students"), where("regNo", "==", data.regNo));
    const regSnap = await getDocs(qReg);
    if (!regSnap.empty) {
        throw new Error(`Student with Register No '${data.regNo}' already exists.`);
    }

    // 3. Check for duplicate Email
    const qEmail = query(collection(db, "students"), where("email", "==", data.email));
    const emailSnap = await getDocs(qEmail);
    if (!emailSnap.empty) {
        throw new Error(`Student with Email '${data.email}' already exists.`);
    }

    // 4. Add Student
    await addDoc(collection(db, "students"), {
        ...data,
        createdAt: serverTimestamp()
    });
};

export const getStudentsBySemester = async (semesterId) => {
    const q = query(collection(db, "students"), where("semesterId", "==", semesterId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const deleteStudent = async (studentId) => {
    await deleteDoc(doc(db, "students", studentId));
};

export const updateStudent = async (studentId, data) => {
    const studentRef = doc(db, "students", studentId);
    await updateDoc(studentRef, data);
};

export const getAllStudents = async () => {
    const querySnapshot = await getDocs(collection(db, "students"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getFilteredStudents = async (departmentId, programId, semesterId) => {
    let q = collection(db, "students");

    // Primary filter (Firestore only requires single index for this)
    if (semesterId) {
        q = query(q, where("semesterId", "==", semesterId));
    }

    const querySnapshot = await getDocs(q);
    let students = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Apply remaining filters locally to avoid composite index errors
    if (departmentId) {
        students = students.filter(s => s.departmentId === departmentId);
    }
    if (programId) {
        students = students.filter(s => s.programId === programId);
    }

    return students;
};

// ===========================
// ATTENDANCE
// ===========================

export const recordAttendance = async (data) => {
    // data: { studentId, courseId, semesterId, date (Timestamp/Date), status, dateString }

    // UI's "courseId" is DB "subjectId"
    const subjectId = data.courseId || data.subjectId;

    // Check for existing record to prevent duplicates/allow updates
    const q = query(
        collection(db, "attendance_records"),
        where("studentId", "==", data.studentId),
        where("subjectId", "==", subjectId),
        where("dateString", "==", data.dateString)
    );

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        // Update existing
        const docId = querySnapshot.docs[0].id;
        await updateDoc(doc(db, "attendance_records", docId), {
            status: data.status,
            updatedAt: serverTimestamp() // Track updates
        });
    } else {
        // Create new
        await addDoc(collection(db, "attendance_records"), {
            ...data,
            subjectId, // Explicitly map for DB
            createdAt: serverTimestamp()
        });
    }
};

export const getAttendanceRecords = async (filters = {}) => {
    // filters: { semesterId, courseId, dateString, studentId, startDate, endDate }
    let constraints = [];

    if (filters.semesterId) constraints.push(where("semesterId", "==", filters.semesterId));

    // DB expects subjectId
    if (filters.courseId) constraints.push(where("subjectId", "==", filters.courseId));
    if (filters.subjectId) constraints.push(where("subjectId", "==", filters.subjectId));

    // Exact date
    if (filters.dateString) constraints.push(where("dateString", "==", filters.dateString));

    // Date Range (YYYY-MM-DD comparison works lexicographically)
    if (filters.startDate) constraints.push(where("dateString", ">=", filters.startDate));
    if (filters.endDate) constraints.push(where("dateString", "<=", filters.endDate));

    if (filters.studentId) constraints.push(where("studentId", "==", filters.studentId));

    const q = query(collection(db, "attendance_records"), ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            courseId: data.courseId || data.subjectId // Map subjectId -> courseId for UI
        };
    });
};

export const getRecentAttendanceActivity = async (limitCount = 5) => {
    // Requires an index on 'createdAt' or 'updatedAt' descending usually.
    // For now, we'll try sorting by dateString descending (which is string YYYY-MM-DD)
    // If we want real "latest actions", we need a timestamp. recordAttendance sets 'updatedAt' or 'createdAt'.

    // We will use 'createdAt' for simplicity or 'updatedAt' if available. 
    // Note: If using multiple orderBy or where+orderBy, Firestore requires an index.
    // We will simple fetch a bit more and sort client side if index is missing to avoid "index required" error blocking us,
    // OR we just query properly using 'orderBy'.
    // Let's rely on 'createdAt' desc.

    try {
        const q = query(
            collection(db, "attendance_records"),
            orderBy("createdAt", "desc"),
            limit(limitCount)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.warn("Index might be missing for sort. Returning empty or unordered.", e);
        // Fallback: fetch some and sort simple
        const q = query(collection(db, "attendance_records"), limit(20));
        const s = await getDocs(q);
        let docs = s.docs.map(d => ({ id: d.id, ...d.data() }));
        // Sort client side by createdAt if possible
        docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        return docs.slice(0, limitCount);
    }
};
// ===========================
// SYLLABUS MANAGEMENT
// ===========================

export const getSyllabus = async (courseId) => {
    // UI "courseId" is DB "subjectId"
    const q = query(collection(db, "subject_syllabus"), where("subjectId", "==", courseId));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return { topics: [] };
    return {
        id: querySnapshot.docs[0].id,
        ...querySnapshot.docs[0].data(),
        courseId: querySnapshot.docs[0].data().subjectId || querySnapshot.docs[0].data().courseId // For UI backwards compat
    };
};

export const saveSyllabus = async (courseId, topics) => {
    if (!courseId) {
        console.error("saveSyllabus Error: courseId (Subject ID) is missing!");
        throw new Error("Invalid Course ID");
    }

    // Check if exists
    const q = query(collection(db, "subject_syllabus"), where("subjectId", "==", courseId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        // Update existing
        const docId = querySnapshot.docs[0].id;
        const existingData = querySnapshot.docs[0].data();

        const newTopics = topics.map(t => {
            const oldTopic = existingData.topics?.find(ot => ot.name === t.name);
            return {
                name: t.name,
                completed: oldTopic ? oldTopic.completed : false
            };
        });

        const syllabusRef = doc(db, "subject_syllabus", docId);
        await updateDoc(syllabusRef, {
            topics: newTopics,
            lastUpdated: serverTimestamp()
        });
        console.log("Syllabus updated for course (subject):", courseId);
    } else {
        // Create new
        const newTopics = topics.map(t => ({ name: t.name, completed: false }));
        await addDoc(collection(db, "subject_syllabus"), {
            subjectId: courseId, // DB relies on subjectId
            courseId, // Included for backward compatibility in UI calls
            topics: newTopics,
            createdAt: serverTimestamp()
        });
        console.log("Syllabus created for course (subject):", courseId);
    }
};
