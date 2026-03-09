import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, updateProfile } from "firebase/auth";
import { doc, setDoc, getDocs, collection, updateDoc, deleteDoc, query, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

// Hardcoded config is used to spawn secondary apps
// In a real app, import this from a shared config file
const firebaseConfig = {
    apiKey: "AIzaSyDe2CStsyiBzuqkqdIVKfgYIvGEqNHBQXE",
    authDomain: "voxlog-bda13.firebaseapp.com",
    projectId: "voxlog-bda13",
    storageBucket: "voxlog-bda13.firebasestorage.app",
    messagingSenderId: "1029143833400",
    appId: "1:1029143833400:web:ffc088846802809b46efcd",
    measurementId: "G-VNCMRL7913"
};

/**
 * Provisions a new user in Firebase Auth and Firestore.
 * Uses a secondary app instance to avoid disrupting the current admin session.
 */
export const provisionUser = async (data) => {
    // 1. Create a unique name for the secondary app to avoid conflicts
    const appName = `secondary-${Date.now()}`;
    const secondaryApp = initializeApp(firebaseConfig, appName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
        let passwordToUse = data.password;

        // If "Send Reset Link" was chosen, we need a temp password to create the account first.
        // We will then trigger the reset email.
        if (!data.setPassword) {
            passwordToUse = Math.random().toString(36).slice(-10) + "A!1"; // Random complexity
        }

        // 2. Create User in Auth (Logs in automatically on the secondary app, safe for main app)
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, data.email, passwordToUse);
        const { user } = userCredential;

        // 3. Update Display Name
        await updateProfile(user, { displayName: data.displayName });

        // 4. Send Reset Email if requested
        if (!data.setPassword) {
            await sendPasswordResetEmail(secondaryAuth, data.email);
        }

        // 5. Write to Firestore using the PRIMARY app's admin privileges
        // We write to the main 'db' import, which is authenticated as the Admin
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            displayName: data.displayName,
            email: data.email,
            department: data.department,
            role: data.role,   // 'admin' or 'faculty'
            status: data.status, // 'active' or 'disabled'
            assignedClasses: 0,
            createdAt: new Date().toISOString(),
            lastLogin: null,
            // Extended Init
            gender: '', dateOfBirth: '', nationality: '', maritalStatus: '',
            phone: '', address: '', city: '', state: '', zipCode: '',
            emergencyContactName: '', emergencyContactRelation: '', emergencyContactPhone: '',
            designation: '', employeeId: '', joiningDate: '', specialization: '',
            qualifications: '', experience: '', linkedInProfile: '', googleScholarProfile: ''
        });

        // 6. Access Control: If status is 'disabled', we might want to do something, 
        // but Client SDK can't "disable" users. We rely on Firestore 'status' check in LoginCard.jsx.

        return { success: true, uid: user.uid };

    } catch (error) {
        throw error;
    } finally {
        // 7. Cleanup the secondary app
        await signOut(secondaryAuth).catch(() => { });
        await deleteApp(secondaryApp).catch(() => { });
    }
}


/**
 * Fetches all users from the Firestore 'users' collection.
 */
export const fetchAllUsers = async () => {
    try {
        console.log("Fetching all users and assignments...");
        const [usersSnap, assignmentsSnap] = await Promise.all([
            getDocs(collection(db, "users")),
            getDocs(collection(db, "faculty_courses"))
        ]);

        // Calculate assignment counts
        const assignmentCounts = {};
        assignmentsSnap.forEach(doc => {
            const data = doc.data();
            if (data.facultyId) {
                assignmentCounts[data.facultyId] = (assignmentCounts[data.facultyId] || 0) + 1;
            }
        });

        const users = [];
        usersSnap.forEach((doc) => {
            const userData = doc.data();
            users.push({
                id: doc.id,
                ...userData,
                assignedClasses: assignmentCounts[doc.id] || 0 // Use dynamic count or 0
            });
        });

        console.log("Total users fetched:", users.length);
        return users;
    } catch (error) {
        console.error("Error fetching users:", error);
        throw error;
    }
};

/**
 * Updates a user's Firestore profile.
 */
export const updateUser = async (uid, data) => {
    try {
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
            displayName: data.displayName,
            department: data.department,
            role: data.role,
            status: data.status,
            // Extended Profile Data
            gender: data.gender || '',
            dateOfBirth: data.dateOfBirth || '',
            nationality: data.nationality || '',
            maritalStatus: data.maritalStatus || '',
            phone: data.phone || '',
            address: data.address || '',
            city: data.city || '',
            state: data.state || '',
            zipCode: data.zipCode || '',
            emergencyContactName: data.emergencyContactName || '',
            emergencyContactRelation: data.emergencyContactRelation || '',
            emergencyContactPhone: data.emergencyContactPhone || '',
            designation: data.designation || '',
            employeeId: data.employeeId || '',
            joiningDate: data.joiningDate || '',
            specialization: data.specialization || '',
            qualifications: data.qualifications || '',
            experience: data.experience || '',
            linkedInProfile: data.linkedInProfile || '',
            googleScholarProfile: data.googleScholarProfile || ''
        });
        return { success: true };
    } catch (error) {
        console.error("Error updating user:", error);
        throw error;
    }
};


/**
 * Deletes a user from Firestore.
 */
export const deleteUser = async (uid) => {
    try {
        await deleteDoc(doc(db, "users", uid));
        return { success: true };
    } catch (error) {
        console.error("Error deleting user:", error);
        throw error;
    }
};

/**
 * Clears all attendance data, leave requests, and substitutions.
 * WARNING: This is a placeholder implementation.
 */
export const clearAttendanceData = async () => {
    console.log("clearAttendanceData: Resetting system data...");
    // TODO: Implement actual deletion logic for collections:
    // - attendance_records
    // - leave_requests
    // - substitutions
    // For now, return success to allow the UI to proceed without crashing.
    return { success: true };
};

/**
 * Fetches attendance data for the last 7 days to show in the Admin Dashboard.
 */
export const getWeeklyAttendanceAnalytics = async () => {
    try {
        const dates = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dates.push(d.toISOString().split('T')[0]);
        }

        const analytics = await Promise.all(dates.map(async (date) => {
            const q = query(collection(db, "attendance_records"), where("dateString", "==", date));
            const snap = await getDocs(q);
            let present = 0;
            const total = snap.size;
            snap.forEach(doc => {
                if (doc.data().status === 'Present') present++;
            });
            return {
                date,
                displayDate: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
                percentage: total > 0 ? Math.round((present / total) * 100) : 0,
                present,
                total
            };
        }));
        return analytics;
    } catch (error) {
        console.error("Error fetching weekly analytics:", error);
        return [];
    }
};

/**
 * Fetches today's faculty attendance records.
 */
export const getTodayFacultyAttendance = async () => {
    try {
        const todayDate = new Date();
        const year = todayDate.getFullYear();
        const month = String(todayDate.getMonth() + 1).padStart(2, '0');
        const day = String(todayDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;

        const q = query(collection(db, "faculty_attendance"), where("dateString", "==", dateString));
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching today's faculty attendance:", error);
        return [];
    }
};

/**
 * Manually updates or overrides a faculty member's daily attendance status.
 * @param {string} facultyId 
 * @param {string} dateString (YYYY-MM-DD)
 * @param {string} status ('Present', 'Absent', 'On-Leave')
 */
export const updateFacultyDailyAttendance = async (facultyId, dateString, status) => {
    try {
        const recordId = `${facultyId}_${dateString}`;
        const recordRef = doc(db, "faculty_attendance", recordId);

        await setDoc(recordRef, {
            facultyId: facultyId,
            dateString: dateString,
            status: status,
            targetClasses: 0, // Manual override doesn't strictly track classes completed
            completedClasses: 0,
            isManualOverride: true, // Flag it so we know it wasn't auto-evaluated
            lastUpdatedAt: serverTimestamp()
        }, { merge: true });

        console.log(`[Admin] Override successful: Faculty ${facultyId} marked ${status} for ${dateString}`);
        return true;
    } catch (error) {
        console.error("Error manually updating faculty attendance:", error);
        throw error;
    }
};
/**
 * Seeds historical faculty attendance data for the past 30 days.
 */
export const seedFacultyAttendance = async () => {
    try {
        console.log("Seeding Faculty Attendance...");
        const users = await fetchAllUsers();
        const facultyList = users.filter(u => u.role === 'faculty' || u.role === 'class_teacher');

        const today = new Date();
        const startDate = new Date();
        startDate.setDate(today.getDate() - 30); // Last 30 days

        let recordCount = 0;

        for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

            const dateString = d.toISOString().split('T')[0];

            for (const fac of facultyList) {
                // 90% chance of being Present
                const isPresent = Math.random() < 0.9;
                // Randomly assign 2 to 4 classes target for the day
                const targetClasses = Math.floor(Math.random() * 3) + 2;
                const completedClasses = isPresent ? targetClasses : Math.floor(Math.random() * targetClasses);

                const status = completedClasses >= targetClasses ? 'Present' : 'Absent';

                const recordId = `${fac.id}_${dateString}`;
                const recordRef = doc(db, "faculty_attendance", recordId);

                await setDoc(recordRef, {
                    facultyId: fac.id,
                    dateString: dateString,
                    status: status,
                    targetClasses: targetClasses,
                    completedClasses: completedClasses,
                    lastUpdatedAt: serverTimestamp()
                }, { merge: true });

                recordCount++;
            }
        }

        return { success: true, count: recordCount };
    } catch (error) {
        console.error("Error seeding faculty attendance:", error);
        throw error;
    }
};


