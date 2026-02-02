import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, updateProfile } from "firebase/auth";
import { doc, setDoc, getDocs, collection, updateDoc, deleteDoc } from "firebase/firestore";
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
            getDocs(collection(db, "faculty_subjects"))
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
