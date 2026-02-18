import { db } from './firebase';
import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    serverTimestamp
} from 'firebase/firestore';
import { getFacultyAssignmentsByFaculty } from './academicService';

/**
 * Saves a timetable for a specific semester.
 * @param {string} semesterId 
 * @param {Object} scheduleData - Map of Day -> Array of Slots
 */
export const saveTimetable = async (semesterId, scheduleData) => {
    try {
        await setDoc(doc(db, "timetables", semesterId), {
            semesterId,
            schedule: scheduleData,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error saving timetable:", error);
        throw error;
    }
};

/**
 * Retrieves the timetable for a specific semester.
 * @param {string} semesterId 
 * @returns {Object|null} The schedule data or null if not found
 */
export const getTimetable = async (semesterId) => {
    try {
        const docRef = doc(db, "timetables", semesterId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data().schedule;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching timetable:", error);
        throw error;
    }
};

/**
 * Generates a timetable automatically based on provided subjects.
 * Uses shuffling and auxiliary subjects to create a mixed, realistic schedule.
 * @param {Array} subjects - List of subject objects
 * @returns {Object} Generated schedule
 */
export const generateTimetable = (subjects) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const periods = [
        { start: '08:00', end: '09:00' },
        { start: '09:00', end: '10:00' },
        { start: '10:20', end: '11:10' },
        { start: '11:10', end: '12:00' },
        { start: '13:00', end: '14:00' },
        { start: '14:00', end: '15:00' },
        { start: '15:15', end: '16:00' }
    ];

    const schedule = {};

    // Filter useful subjects
    const validSubjects = subjects.filter(s => s && s.name);
    if (validSubjects.length === 0) return {};

    // Auxiliary subjects to add variety
    const auxSubjects = [
        { id: 'lib', name: 'Library' },
        { id: 'sports', name: 'Sports' },
        { id: 'seminar', name: 'Seminar' },
        { id: 'mentoring', name: 'Mentoring' }
    ];

    // Helper to shuffle array
    const shuffle = (array) => {
        let currentIndex = array.length, randomIndex;
        while (currentIndex != 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    };

    days.forEach(day => {
        schedule[day] = [];

        // Create a daily pool of subjects
        // Start with the core subjects
        let dailyPool = [...validSubjects];

        // If we have fewer subjects than periods, add some duplicates or aux subjects to fill the day
        while (dailyPool.length < periods.length) {
            // Add a random core subject
            dailyPool.push(validSubjects[Math.floor(Math.random() * validSubjects.length)]);
            // Occasionally add an aux subject (30% chance)
            if (Math.random() > 0.7) {
                dailyPool.push(auxSubjects[Math.floor(Math.random() * auxSubjects.length)]);
            }
        }

        // Shuffle the pool for this day
        dailyPool = shuffle(dailyPool);

        // Ensure no adjacent duplicates if possible (simple swap check)
        for (let i = 1; i < dailyPool.length; i++) {
            if (dailyPool[i].id === dailyPool[i - 1].id && dailyPool.length > 2) {
                // Swap with next if available, or random
                const swapIdx = (i + 1) % dailyPool.length;
                [dailyPool[i], dailyPool[swapIdx]] = [dailyPool[swapIdx], dailyPool[i]];
            }
        }

        // Assign to periods (take the first N needed)
        periods.forEach((period, pIndex) => {
            const subject = dailyPool[pIndex % dailyPool.length];

            schedule[day].push({
                periodIndex: pIndex,
                timeRange: `${period.start} - ${period.end}`,
                subjectId: subject.id,
                subjectname: subject.name,
                facultyId: null
            });
        });
    });

    return schedule;
};

// Start of Added Function


/**
 * Get specific schedule for a faculty on a specific date.
 * Allows identifying exactly which classes are impacted by leave.
 */
export const getFacultyScheduleForDate = async (facultyId, dateString) => {
    try {
        console.log(`[DEBUG] getFacultyScheduleForDate: ${facultyId} on ${dateString}`);
        // 1. Get Faculty's Subjects
        const assignments = await getFacultyAssignmentsByFaculty(facultyId);
        console.log(`[DEBUG] Assignments found for ${facultyId}:`, assignments);
        if (assignments.length === 0) return [];

        const subjectIds = assignments.map(a => a.subjectId);

        // 2. Scan all Timetables
        // Optimization: In production, we should filter by semesterIds linked to subjects.
        const timetablesSnap = await getDocs(collection(db, "timetables"));

        // Robust Date Parsing (Fix for timezone issues)
        // dateString is "YYYY-MM-DD"
        const [year, month, day] = dateString.split('-').map(Number);
        const targetDate = new Date(year, month - 1, day);
        const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' });

        console.log(`[DEBUG] Checking timetables for day: ${dayName} (${dateString})`);

        const mySlots = [];

        timetablesSnap.docs.forEach(doc => {
            const semesterId = doc.id;
            const schedule = doc.data().schedule;

            if (schedule && schedule[dayName]) {
                schedule[dayName].forEach(slot => {
                    if (subjectIds.includes(slot.subjectId)) {
                        mySlots.push({
                            ...slot,
                            semesterId,
                            date: dateString
                        });
                    }
                });
            }
        });

        console.log(`[DEBUG] Found ${mySlots.length} slots for faculty.`);
        return mySlots;

    } catch (error) {
        console.error("Error fetching faculty schedule:", error);
        return [];
    }
};
