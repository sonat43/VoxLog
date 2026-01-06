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

export const addSemester = async (courseId, semesterNo) => {
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
        semesterNo: semNo
    });
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

export const getSubjects = async () => {
    const querySnapshot = await getDocs(collection(db, "subjects"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
