import { db } from './firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';

/**
 * Creates a notification for a specific user.
 * @param {string} userId - ID of the user to notify
 * @param {string} type - Type of notification (e.g., 'Leave', 'Substitution', 'Academic', 'Calendar')
 * @param {string} message - Notification content
 * @param {string} link - Optional internal path to navigate to
 * @param {string} referenceId - Optional ID of the related object (e.g., leaveRequestId)
 */
export const createNotification = async (userId, type, message, link = '', referenceId = '') => {
    try {
        if (!userId) {
            console.warn("createNotification: No userId provided.");
            return { success: false };
        }

        await addDoc(collection(db, "notifications"), {
            userId,
            type,
            message,
            link,
            referenceId,
            read: false,
            createdAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error creating notification:", error);
        return { success: false, error };
    }
};

/**
 * Notifies all users with the 'admin' role.
 */
export const notifyAdmins = async (type, message, link = '', referenceId = '') => {
    try {
        const q = query(collection(db, "users"), where("role", "==", "admin"));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            console.warn("notifyAdmins: No admin users found.");
            return { success: true };
        }

        const notifyPromises = snapshot.docs.map(doc => 
            createNotification(doc.id, type, message, link, referenceId)
        );

        await Promise.all(notifyPromises);
        return { success: true };
    } catch (error) {
        console.error("Error notifying admins:", error);
        return { success: false, error };
    }
};

/**
 * Notifies all users with 'faculty' or 'class_teacher' roles.
 */
export const notifyAllFaculty = async (type, message, link = '', referenceId = '') => {
    try {
        const q = query(collection(db, "users"), where("role", "in", ["faculty", "class_teacher"]));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.warn("notifyAllFaculty: No faculty users found.");
            return { success: true };
        }

        const notifyPromises = snapshot.docs.map(doc => 
            createNotification(doc.id, type, message, link, referenceId)
        );

        await Promise.all(notifyPromises);
        return { success: true };
    } catch (error) {
        console.error("Error notifying all faculty:", error);
        return { success: false, error };
    }
};
