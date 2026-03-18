import { db } from './firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

/**
 * Checks if a given date string (YYYY-MM-DD) is a holiday.
 * A date is considered a holiday if:
 * 1. It is a Saturday or Sunday.
 * 2. It exists in the 'academic_events' collection with type 'Holiday'.
 */
export const checkIfHoliday = async (dateString) => {
    try {
        // 1. Check if weekend
        // Parse date string securely in local time to avoid UTC backward-shift bugs
        const [year, month, day] = dateString.split('-');
        const dateObj = new Date(year, month - 1, day);
        const dayOfWeek = dateObj.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return { isHoliday: true, reason: 'Weekend' };
        }

        // 2. Check Firestore for specific 'Holiday' events
        const q = query(
            collection(db, "academic_events"),
            where("date", "==", dateString),
            where("type", "==", "Holiday")
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const eventData = snapshot.docs[0].data();
            return { isHoliday: true, reason: eventData.title || 'Designated Holiday' };
        }

        return { isHoliday: false, reason: null };
    } catch (error) {
        console.error("Error checking holiday status:", error);
        // Default to not a holiday if fetch fails, so we don't accidentally block the app
        return { isHoliday: false, reason: null };
    }
};

/**
 * Fetches all academic events. Add date range filtering if the collection gets too large.
 */
export const getAcademicEvents = async () => {
    try {
        const snap = await getDocs(collection(db, "academic_events"));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
        console.error("Error fetching academic events:", error);
        return [];
    }
};
