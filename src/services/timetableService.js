import { doc, setDoc, getDoc, getDocs, collection, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { getFacultyAssignmentsByFaculty, getFacultyAssignments, getSemesters, getPrograms, getDepartments } from './academicService';


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
 * Generates a timetable automatically based on provided courses.
 * Uses shuffling and auxiliary courses to create a mixed, realistic schedule.
 * @param {Array} courses - List of course objects
 * @returns {Object} Generated schedule
 */
export const generateTimetable = (courses) => {
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

    // Filter useful courses
    const validCourses = courses.filter(s => s && s.name);
    if (validCourses.length === 0) return {};

    // Auxiliary courses to add variety
    const auxCourses = [
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

        // Create a daily pool of courses
        // Start with the core courses
        let dailyPool = [...validCourses];

        // If we have fewer courses than periods, add some duplicates or aux courses to fill the day
        while (dailyPool.length < periods.length) {
            // Add a random core course
            dailyPool.push(validCourses[Math.floor(Math.random() * validCourses.length)]);
            // Occasionally add an aux course (30% chance)
            if (Math.random() > 0.7) {
                dailyPool.push(auxCourses[Math.floor(Math.random() * auxCourses.length)]);
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
            const course = dailyPool[pIndex % dailyPool.length];

            schedule[day].push({
                periodIndex: pIndex,
                timeRange: `${period.start} - ${period.end}`,
                courseId: course.id,
                coursename: course.name,
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
        // 1. Get Faculty's Courses
        const assignments = await getFacultyAssignmentsByFaculty(facultyId);
        console.log(`[DEBUG] Assignments found for ${facultyId}:`, assignments);
        if (assignments.length === 0) return [];

        const courseIds = assignments.map(a => a.courseId);

        // 2. PRE-FETCH Academic Data (Cached)
        const [semesters, programs, departments] = await Promise.all([
            getSemesters(),
            getPrograms(),
            getDepartments()
        ]);

        // 3. Scan all Timetables
        const timetablesSnap = await getDocs(collection(db, "timetables"));

        // Robust Date Parsing
        const [year, month, day] = dateString.split('-').map(Number);
        const targetDate = new Date(year, month - 1, day);
        const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' });

        const mySlots = [];

        for (const timetableDoc of timetablesSnap.docs) {
            const semesterId = timetableDoc.id;
            const schedule = timetableDoc.data().schedule;

            if (schedule && schedule[dayName]) {
                const semData = semesters.find(s => s.id === semesterId);
                if (!semData) continue;

                const programData = programs.find(p => p.id === semData.courseId);
                const deptData = programData ? departments.find(d => d.id === programData.departmentId) : null;

                const metadata = {
                    semesterNo: semData.semesterNo,
                    programName: programData?.name || 'Unknown Program',
                    deptName: deptData?.name || 'Class'
                };

                schedule[dayName].forEach(slot => {
                    if (courseIds.includes(slot.courseId)) {
                        mySlots.push({
                            ...slot,
                            semesterId,
                            date: dateString,
                            semesterNo: metadata.semesterNo,
                            programName: metadata.programName,
                            deptName: metadata.deptName
                        });
                    }
                });
            }
        }
        
        // 4. Fetch Substitutions where THIS faculty is the SUBSTITUTE
        const subsInQuery = query(
            collection(db, "substitutions"), 
            where("substituteFacultyId", "==", facultyId),
            where("date", "==", dateString),
            where("status", "==", "confirmed")
        );
        const subsInSnap = await getDocs(subsInQuery);
        subsInSnap.docs.forEach(doc => {
            const sub = doc.data();
            mySlots.push({
                periodIndex: sub.periodIndex,
                timeRange: sub.timeRange,
                courseId: sub.courseId || sub.subjectId,
                coursename: sub.courseName,
                facultyId: sub.originalFacultyId,
                semesterId: sub.classId,
                date: dateString,
                semesterNo: sub.semesterNo,
                programName: sub.programName,
                deptName: sub.deptName,
                isSubstitution: true
            });
        });

        // 5. Remove Slots where THIS faculty is the ORIGINAL FACULTY and was Substituted OUT
        const subsOutQuery = query(
            collection(db, "substitutions"), 
            where("originalFacultyId", "==", facultyId),
            where("date", "==", dateString),
            where("status", "==", "confirmed")
        );
        const subsOutSnap = await getDocs(subsOutQuery);
        const subbedOutPeriods = subsOutSnap.docs.map(doc => doc.data().periodIndex);

        const finalSlots = mySlots.filter(s => {
            if (s.isSubstitution) return true; // Keep substitutions they are taking over
            return !subbedOutPeriods.includes(s.periodIndex); // Remove normal classes that were given away
        });

        // Sort chronologically by period
        finalSlots.sort((a, b) => a.periodIndex - b.periodIndex);

        console.log(`[DEBUG] Found ${finalSlots.length} slots for faculty.`);
        return finalSlots;

    } catch (error) {
        console.error("Error fetching faculty schedule:", error);
        return [];
    }
};

/**
 * Get specific slot details for manual substitution auto-fill.
 */
export const getTimetableSlot = async (semesterId, dateString, periodIndex) => {
    try {
        const docSnap = await getDoc(doc(db, 'timetables', semesterId));
        if (!docSnap.exists()) return null;

        const schedule = docSnap.data().schedule;
        const [year, month, day] = dateString.split('-').map(Number);
        const dayName = new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'long' });

        if (schedule && schedule[dayName]) {
            const slot = schedule[dayName][periodIndex];
            if (slot && slot.courseId) {
                // Determine the original faculty assigned to this course
                const assignments = await getFacultyAssignments();
                const assignment = assignments.find(a => a.courseId === slot.courseId);
                
                return {
                    courseId: slot.courseId,
                    coursename: slot.coursename,
                    originalFacultyId: assignment ? assignment.facultyId : null
                };
            }
        }
        return null;
    } catch (error) {
        console.error("Error fetching timetable slot:", error);
        return null;
    }
};
