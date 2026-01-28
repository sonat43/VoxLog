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
    getDoc
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
    // Check for duplicate assignment
    const q = query(
        collection(db, "faculty_subjects"),
        where("facultyId", "==", facultyId),
        where("subjectId", "==", subjectId),
        where("academicYear", "==", academicYear)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error("This faculty is already assigned to this subject for the academic year " + academicYear);
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
