import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

const SETTINGS_COLLECTION = "system_settings";
const SETTINGS_DOC_ID = "global";

const DEFAULT_SETTINGS = {
    institution: {
        name: "VoxLog Institute",
        shortName: "VOXLOG",
        academicYear: "2025-2026",
        timezone: "Asia/Kolkata",
        contactEmail: "admin@voxlog.edu",
        website: "https://voxlog.edu",
    },
    attendance: {
        minAttendanceThreshold: 75,
        latenessGracePeriodMinutes: 15,
        consecutiveAbsenceAlert: 3,
    },
    session: {
        maxActiveSessions: 1,
        sessionTimeoutMinutes: 30,
        forceLogoutIdle: true,
    },
    facultyPermissions: {
        canEditAttendance: true,
        editWindowHours: 24,
        canDeleteReports: false,
    },
    reports: {
        auditLogRetentionDays: 90,
        autoGenerateWeeklyReports: false,
    },
    notifications: {
        enableEmailAlerts: true,
        enableSystemNotifications: true,
        notifyOnLowAttendance: true,
    },
    ai: {
        facialRecognitionThreshold: 85,
        anomalyDetectionEnabled: true,
    },
    security: {
        requireTwoFactor: false,
        minPasswordStrength: "Strong",
    },
    ui: {
        theme: "dark",
        density: "comfortable",
    },
    system: {
        maintenanceMode: false,
    },
};

/**
 * Fetches the global system settings.
 * Returns default settings if they don't exist yet.
 */
export const fetchSettings = async () => {
    try {
        const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            // Merge defaults with saved data to ensure all keys exist if schema changes
            return { ...DEFAULT_SETTINGS, ...docSnap.data() };
        } else {
            // Initialize with defaults if not found
            await setDoc(docRef, DEFAULT_SETTINGS);
            return DEFAULT_SETTINGS;
        }
    } catch (error) {
        console.error("Error fetching settings:", error);
        // Return defaults gracefully on error to prevent UI crash
        return DEFAULT_SETTINGS;
    }
};

/**
 * Saves the global system settings.
 * @param {Object} settings - The complete settings object to save.
 */
export const saveSettings = async (settings) => {
    try {
        const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
        await setDoc(docRef, settings, { merge: true });
        return { success: true };
    } catch (error) {
        console.error("Error saving settings:", error);
        throw error;
    }
};
