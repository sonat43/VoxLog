import { db } from './firebase';
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    getDocs,
    query,
    where,
    serverTimestamp,
    orderBy,
    deleteDoc
} from 'firebase/firestore';

// ===========================
// LEAVE MANAGEMENT
// ===========================

export const applyLeave = async (data) => {
    // data: { facultyId, facultyName, fromDate, toDate, reason, type }
    try {
        await addDoc(collection(db, "leave_requests"), {
            ...data,
            status: 'Pending',
            createdAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error applying for leave:", error);
        throw error;
    }
};

export const getLeaveRequests = async (status = null) => {
    try {
        let q;
        if (status) {
            q = query(
                collection(db, "leave_requests"),
                where("status", "==", status)
            );
        } else {
            q = query(
                collection(db, "leave_requests")
            );
        }

        const querySnapshot = await getDocs(q);
        const requests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Client-side sort
        return requests.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return timeB - timeA;
        });
    } catch (error) {
        console.error("Error fetching leave requests:", error);
        return [];
    }
};

export const getMyLeaveRequests = async (facultyId) => {
    try {
        const q = query(
            collection(db, "leave_requests"),
            where("facultyId", "==", facultyId)
        );
        const querySnapshot = await getDocs(q);
        const requests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Client-side sort to avoid composite index requirement
        return requests.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return timeB - timeA;
        });
    } catch (error) {
        console.error("Error fetching my leave requests:", error);
        return [];
    }
};

export const updateLeaveStatus = async (requestId, status, remarks = "") => {
    try {
        const leaveRef = doc(db, "leave_requests", requestId);
        await updateDoc(leaveRef, {
            status,
            remarks, // Optional admin remarks
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error updating leave status:", error);
        throw error;
    }
};

/**
 * Checks if a faculty is on APPROVED leave for a specific date.
 * @param {string} facultyId 
 * @param {string} dateString YYYY-MM-DD
 */
export const isFacultyOnLeave = async (facultyId, dateString) => {
    try {
        const q = query(
            collection(db, "leave_requests"),
            where("facultyId", "==", facultyId),
            where("status", "==", "Approved")
        );

        const querySnapshot = await getDocs(q);

        // Check date ranges
        // Note: Simple string comparison for YYYY-MM-DD works if strictly formatted
        // Ideally convert to objects for robust range check

        const targetDate = new Date(dateString);
        targetDate.setHours(0, 0, 0, 0);

        const isOnLeave = querySnapshot.docs.some(doc => {
            const data = doc.data();
            const start = new Date(data.fromDate);
            const end = new Date(data.toDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);

            return targetDate >= start && targetDate <= end;
        });

        return isOnLeave;

    } catch (error) {
        console.error("Error checking leave status:", error);
        return false;
    }
};

/**
 * Get all approved leaves for a specific date (Full objects)
 */
export const getApprovedLeavesForDate = async (dateString) => {
    try {
        const q = query(
            collection(db, "leave_requests"),
            where("status", "==", "Approved")
        );

        const querySnapshot = await getDocs(q);
        // Robust Date Parsing: Treat input YYYY-MM-DD as local start of day
        const [tYear, tMonth, tDay] = dateString.split('-').map(Number);
        const targetDate = new Date(tYear, tMonth - 1, tDay);

        const leaves = [];

        querySnapshot.docs.forEach(doc => {
            const data = doc.data();

            // Robust parsing for stored dates (assuming YYYY-MM-DD strings)
            const [sYear, sMonth, sDay] = data.fromDate.split('-').map(Number);
            const start = new Date(sYear, sMonth - 1, sDay);

            const [eYear, eMonth, eDay] = data.toDate.split('-').map(Number);
            const end = new Date(eYear, eMonth - 1, eDay);

            if (targetDate >= start && targetDate <= end) {
                // Return full object including faculty details
                leaves.push({ id: doc.id, ...data });
            }
        });

        return leaves;

    } catch (error) {
        console.error("Error fetching approved leaves:", error);
        return [];
    }
};

/**
 * Get ALL leaves (Approved & Pending) for a specific date (Full objects)
 */
export const getAllLeavesForDate = async (dateString) => {
    try {
        const q = query(
            collection(db, "leave_requests"),
            where("status", "in", ["Approved", "Pending"])
        );

        const querySnapshot = await getDocs(q);

        // Robust Date Parsing
        const [tYear, tMonth, tDay] = dateString.split('-').map(Number);
        const targetDate = new Date(tYear, tMonth - 1, tDay);

        const leaves = [];

        querySnapshot.docs.forEach(doc => {
            const data = doc.data();

            // Robust parsing
            const [sYear, sMonth, sDay] = data.fromDate.split('-').map(Number);
            const start = new Date(sYear, sMonth - 1, sDay);

            const [eYear, eMonth, eDay] = data.toDate.split('-').map(Number);
            const end = new Date(eYear, eMonth - 1, eDay);

            if (targetDate >= start && targetDate <= end) {
                leaves.push({ id: doc.id, ...data });
            }
        });

        return leaves;

    } catch (error) {
        console.error("Error fetching all leaves:", error);
        return [];
    }
};

/**
 * Get all faculty IDs who are on leave for a specific date
 */
export const getFacultyIdsOnLeave = async (dateString) => {
    try {
        // This is inefficient (fetching all approved leaves) but acceptable for prototype scale
        // In production, use a 'daily_leave_ledger' collection for O(1) lookups
        const q = query(
            collection(db, "leave_requests"),
            where("status", "==", "Approved")
        );

        const querySnapshot = await getDocs(q);

        // Robust Date Parsing
        const [tYear, tMonth, tDay] = dateString.split('-').map(Number);
        const targetDate = new Date(tYear, tMonth - 1, tDay);

        const facultyIds = new Set();

        querySnapshot.docs.forEach(doc => {
            const data = doc.data();
            const [sYear, sMonth, sDay] = data.fromDate.split('-').map(Number);
            const start = new Date(sYear, sMonth - 1, sDay);

            const [eYear, eMonth, eDay] = data.toDate.split('-').map(Number);
            const end = new Date(eYear, eMonth - 1, eDay);

            if (targetDate >= start && targetDate <= end) {
                facultyIds.add(data.facultyId);
            }
        });

        return Array.from(facultyIds);

    } catch (error) {
        console.error("Error fetching faculty on leave:", error);
        return [];
    }
};

/**
 * Check if a leave request overlaps with any existing Pending or Approved requests.
 */
export const checkDuplicateLeave = async (facultyId, fromDate, toDate) => {
    try {
        const q = query(
            collection(db, "leave_requests"),
            where("facultyId", "==", facultyId),
            where("status", "in", ["Pending", "Approved"])
        );

        const snapshot = await getDocs(q);

        let newStart = new Date(fromDate);
        let newEnd = new Date(toDate);
        newStart.setHours(0, 0, 0, 0);
        newEnd.setHours(0, 0, 0, 0);

        return snapshot.docs.some(doc => {
            const data = doc.data();
            const existingStart = new Date(data.fromDate);
            const existingEnd = new Date(data.toDate);
            existingStart.setHours(0, 0, 0, 0);
            existingEnd.setHours(0, 0, 0, 0);

            // Overlap logic: (StartA <= EndB) and (EndA >= StartB)
            return (newStart <= existingEnd && newEnd >= existingStart);
        });
    } catch (error) {
        console.error("Error checking for duplicate leave:", error);
        return false;
    }
};

/**
 * Delete ALL leave requests for a specific faculty.
 */
export const deleteAllLeavesForFaculty = async (facultyId) => {
    try {
        if (!facultyId) throw new Error("Faculty ID is required");

        const q = query(
            collection(db, "leave_requests"),
            where("facultyId", "==", facultyId)
        );

        const snapshot = await getDocs(q);

        // Sequential delete
        await Promise.all(snapshot.docs.map(doc => deleteDoc(doc.ref)));
        return true;
    } catch (error) {
        console.error("Error deleting leaves:", error);
        throw error;
    }
};
