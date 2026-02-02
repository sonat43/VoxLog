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
};

export const getDepartments = async () => {
    const querySnapshot = await getDocs(collection(db, "departments"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateDepartmentStatus = async (departmentId, newStatus) => {
    const departmentRef = doc(db, "departments", departmentId);
    await updateDoc(departmentRef, { status: newStatus });
};

export const updateDepartment = async (departmentId, data) => {
    const departmentRef = doc(db, "departments", departmentId);
    await updateDoc(departmentRef, data);
};

export const deleteDepartment = async (departmentId) => {
    // Check if linked to any courses
    const q = query(collection(db, "courses"), where("departmentId", "==", departmentId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error("Cannot delete department. It is linked to existing courses.");
    }

    await deleteDoc(doc(db, "departments", departmentId));
};

// ===========================
// COURSES
// ===========================

export const addCourse = async (name, departmentId, duration) => {
    await addDoc(collection(db, "courses"), {
        name,
        departmentId,
        duration: Number(duration)
    });
};

export const updateCourse = async (courseId, data) => {
    if (data.duration) data.duration = Number(data.duration);
    const courseRef = doc(db, "courses", courseId);
    await updateDoc(courseRef, data);
};

export const getCourses = async () => {
    const querySnapshot = await getDocs(collection(db, "courses"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const deleteCourse = async (courseId) => {
    // Check if linked to any semesters
    const q = query(collection(db, "semesters"), where("courseId", "==", courseId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error("Cannot delete course. It is linked to existing semesters.");
    }

    await deleteDoc(doc(db, "courses", courseId));
};

// ===========================
// SEMESTERS
// ===========================

export const addSemester = async (courseId, semesterNo, studentCount, classTeacherId) => {
    const semNo = Number(semesterNo);
    // Check for duplicate semesterNo for the same course
    const q = query(
        collection(db, "semesters"),
        where("courseId", "==", courseId),
        where("semesterNo", "==", semNo)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error("Semester " + semNo + " already exists for this course.");
    }

    await addDoc(collection(db, "semesters"), {
        courseId,
        semesterNo: semNo,
        studentCount: Number(studentCount) || 0,
        classTeacherId: classTeacherId || null
    });
};

export const updateSemester = async (semesterId, data) => {
    if (data.semesterNo) data.semesterNo = Number(data.semesterNo);
    if (data.studentCount) data.studentCount = Number(data.studentCount);

    const semRef = doc(db, "semesters", semesterId);
    await updateDoc(semRef, data);
};

export const getSemesters = async () => {
    const querySnapshot = await getDocs(collection(db, "semesters"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const deleteSemester = async (semesterId) => {
    // Check if linked to any subjects
    const q = query(collection(db, "subjects"), where("semesterId", "==", semesterId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error("Cannot delete semester. It is linked to existing subjects.");
    }

    await deleteDoc(doc(db, "semesters", semesterId));
};

// ===========================
// SUBJECTS
// ===========================

export const addSubject = async (code, name, credits, semesterId, courseId) => {
    // Check for unique code
    const q = query(collection(db, "subjects"), where("code", "==", code));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error("Subject code '" + code + "' must be unique.");
    }

    await addDoc(collection(db, "subjects"), {
        code,
        name,
        credits: Number(credits),
        semesterId,
        courseId // Storing courseId for easier querying/filtering if needed, though relational to semester
    });
};

export const updateSubject = async (subjectId, data) => {
    if (data.credits) data.credits = Number(data.credits);
    const subRef = doc(db, "subjects", subjectId);
    await updateDoc(subRef, data);
};

export const getSubjects = async () => {
    const querySnapshot = await getDocs(collection(db, "subjects"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const deleteSubject = async (subjectId) => {
    // Check if any faculty are assigned to this subject
    const q = query(collection(db, "faculty_subjects"), where("subjectId", "==", subjectId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error("Cannot delete subject. It has faculty assigned.");
    }

    await deleteDoc(doc(db, "subjects", subjectId));
};

// ===========================
// FACULTY ASSIGNMENTS
// ===========================

export const assignFacultyToSubject = async (facultyId, subjectId, academicYear) => {
    // Check if subject is already assigned for this academic year (to anyone)
    const q = query(
        collection(db, "faculty_subjects"),
        where("subjectId", "==", subjectId),
        where("academicYear", "==", academicYear)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error("This subject is already assigned to a faculty member for the academic year " + academicYear);
    }

    await addDoc(collection(db, "faculty_subjects"), {
        facultyId,
        subjectId,
        academicYear
    });
};

export const getFacultyAssignments = async () => {
    const querySnapshot = await getDocs(collection(db, "faculty_subjects"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getFacultyAssignmentsByFaculty = async (facultyId) => {
    const q = query(collection(db, "faculty_subjects"), where("facultyId", "==", facultyId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateFacultyAssignment = async (assignmentId, data) => {
    // Check uniqueness if subjectId or academicYear is changing
    if (data.subjectId || data.academicYear) {
        // We need existing data if only one is updated to form a complete check, 
        // but typically the UI sends the full object. We'll assume full object or fetch if critical.
        // For efficiency, let's assume the UI sends the full set of constraints (subjectId, academicYear) if either changes, 
        // OR we just query based on what's provided + existing. 
        // Simplest robust way: query for conflicting assignment.

        // Note: Ideally we should fetch the current doc to merge with `data` if `data` is partial,
        // but our UI sends full `facultyId`, `subjectId`, `academicYear` in handleEdit.
        // IF `data` is missing keys, this might be risky, but our current usage covers it.

        const q = query(
            collection(db, "faculty_subjects"),
            where("subjectId", "==", data.subjectId),
            where("academicYear", "==", data.academicYear)
        );
        const querySnapshot = await getDocs(q);

        // Check if any doc found is NOT the one we are updating
        const duplicate = querySnapshot.docs.find(doc => doc.id !== assignmentId);
        if (duplicate) {
            throw new Error("This subject is already assigned to a faculty member for the academic year " + data.academicYear);
        }
    }

    const assignRef = doc(db, "faculty_subjects", assignmentId);
    await updateDoc(assignRef, data);
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

// ===========================
// ATTENDANCE
// ===========================

export const recordAttendance = async (data) => {
    // data: { studentId, subjectId, semesterId, date (Timestamp/Date), status, dateString }

    // Check for existing record to prevent duplicates/allow updates
    const q = query(
        collection(db, "attendance_records"),
        where("studentId", "==", data.studentId),
        where("subjectId", "==", data.subjectId),
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
            createdAt: serverTimestamp()
        });
    }
};

export const getAttendanceRecords = async (filters = {}) => {
    // filters: { semesterId, subjectId, dateString, studentId, startDate, endDate }
    let constraints = [];

    if (filters.semesterId) constraints.push(where("semesterId", "==", filters.semesterId));
    if (filters.subjectId) constraints.push(where("subjectId", "==", filters.subjectId));

    // Exact date
    if (filters.dateString) constraints.push(where("dateString", "==", filters.dateString));

    // Date Range (YYYY-MM-DD comparison works lexicographically)
    if (filters.startDate) constraints.push(where("dateString", ">=", filters.startDate));
    if (filters.endDate) constraints.push(where("dateString", "<=", filters.endDate));

    if (filters.studentId) constraints.push(where("studentId", "==", filters.studentId));

    const q = query(collection(db, "attendance_records"), ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

export const getSyllabus = async (subjectId) => {
    const q = query(collection(db, "course_syllabus"), where("subjectId", "==", subjectId));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return { topics: [] };
    return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
};

export const saveSyllabus = async (subjectId, topics) => {
    if (!subjectId) {
        console.error("saveSyllabus Error: subjectId is missing!");
        throw new Error("Invalid Subject ID");
    }

    // Check if exists
    const q = query(collection(db, "course_syllabus"), where("subjectId", "==", subjectId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        // Update existing
        const docId = querySnapshot.docs[0].id;
        const existingData = querySnapshot.docs[0].data();

        // Merge strategy: Keep existing 'completed' status if topic name matches
        // Simple strategy for now: Overwrite list but try to preserve if exact match? 
        // Plan says: Overwrite. New topics start uncompleted.
        // But if I edit a topic name, I lose completion. That's acceptable for v1.

        // However, if we just want to ADD/REMOVE topics without resetting ALL completion:
        // We'd need to be careful.
        // Let's just Map the new topics to the old structure if it exists.

        const newTopics = topics.map(t => {
            const oldTopic = existingData.topics?.find(ot => ot.name === t.name);
            return {
                name: t.name,
                completed: oldTopic ? oldTopic.completed : false
            };
        });

        const syllabusRef = doc(db, "course_syllabus", docId);
        await updateDoc(syllabusRef, {
            topics: newTopics,
            lastUpdated: serverTimestamp()
        });
        console.log("Syllabus updated for subject:", subjectId);
    } else {
        // Create new
        const newTopics = topics.map(t => ({ name: t.name, completed: false }));
        await addDoc(collection(db, "course_syllabus"), {
            subjectId,
            topics: newTopics,
            createdAt: serverTimestamp()
        });
        console.log("Syllabus created for subject:", subjectId);
    }
};
