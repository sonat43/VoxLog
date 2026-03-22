import { db } from './firebase';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    serverTimestamp,
    orderBy,
    doc,
    updateDoc,
    getDoc
} from 'firebase/firestore';
import { getFacultyAssignments, getSemesters, getPrograms, getDepartments } from './academicService';
import { getFacultyScheduleForDate } from './timetableService';
import { getFacultyIdsOnLeave, getApprovedLeavesForDate, getAllLeavesForDate } from './leaveService';
import { fetchAllUsers } from './adminService';
import { sendEmailNotification } from './emailService';
import { createNotification } from './notificationService';

// ===========================
// DATA FETCHING HELPERS
// ===========================

const getAllFaculty = async () => {
    const users = await fetchAllUsers();
    return users.filter(u => u.role === 'faculty' || u.role === 'class_teacher');
};

// ===========================
// SUBSTITUTION LOGIC
// ===========================

/**
 * Get All Faculty with Availability Status for a specific slot.
 * Returns: Array of { ...faculty, availabilityStatus: 'Free' | 'Busy' | 'On Leave', busyReason: string }
 */
export const getAvailableFaculty = async (dateString, periodIndex, timeRange, semesterIdToAvoid = null) => {
    try {
        console.log(`Checking availability for ${dateString}, Period ${periodIndex}`);

        // 1. BATCH FETCH All Required Data
        const [allFaculty, leavesOnDate, allTimetablesSnap, subsSnap, semesters, programs, departments, assignments] = await Promise.all([
            getAllFaculty(),
            getAllLeavesForDate(dateString),
            getDocs(collection(db, "timetables")),
            getDocs(query(collection(db, "substitutions"), where("date", "==", dateString), where("periodIndex", "==", periodIndex))),
            getSemesters(),
            getPrograms(),
            getDepartments(),
            getFacultyAssignments()
        ]);

        const facultyStatusMap = {};
        allFaculty.forEach(f => {
            facultyStatusMap[f.uid || f.id] = { status: 'Free', reason: '' };
        });

        const courseFacultyMap = {};
        if (assignments) {
            assignments.forEach(a => courseFacultyMap[a.courseId] = a.facultyId);
        }

        // 2. Identify Faculty on LEAVE (Approved or Pending)
        leavesOnDate.forEach(l => {
            if (facultyStatusMap[l.facultyId]) {
                facultyStatusMap[l.facultyId] = { status: 'On Leave', reason: `${l.type} (${l.status})` };
            }
        });

        // 3. Identify Faculty Busy in TIMETABLE
        const dayName = new Date(dateString).toLocaleDateString('en-US', { weekday: 'long' });
        
        allTimetablesSnap.forEach(tDoc => {
            const semId = tDoc.id;
            const schedule = tDoc.data().schedule;
            if (schedule && schedule[dayName]) {
                const slot = schedule[dayName][periodIndex];
                if (slot && slot.courseId) {
                    const facultyId = courseFacultyMap[slot.courseId];
                    if (facultyId && facultyStatusMap[facultyId] && facultyStatusMap[facultyId].status === 'Free') {
                        const semData = semesters.find(s => s.id === semId);
                        const progData = semData ? programs.find(p => p.id === semData.courseId) : null;
                        const deptData = progData ? departments.find(d => d.id === progData.departmentId) : null;
                        
                        const loc = `${deptData?.name || ''} ${progData?.name || ''} S${semData?.semesterNo || ''}`.trim();
                        facultyStatusMap[facultyId] = { 
                            status: 'Busy', 
                            reason: `Teaching ${slot.coursename} in ${loc || 'another class'}` 
                        };
                    }
                }
            }
        });

        // 4. Identify Faculty already SUBSTITUTING
        subsSnap.docs.forEach(doc => {
            const data = doc.data();
            const subId = data.substituteFacultyId;
            if (subId && facultyStatusMap[subId] && facultyStatusMap[subId].status === 'Free') {
                facultyStatusMap[subId] = {
                    status: 'Busy',
                    reason: `Already substituting for ${data.courseName || 'another class'}`
                };
            }
        });

        // 5. Merge and Return
        const result = allFaculty.map(f => {
            const info = facultyStatusMap[f.uid || f.id];
            return {
                ...f,
                availabilityStatus: info.status,
                busyReason: info.reason
            };
        });

        return result.sort((a, b) => {
            const score = { 'Free': 0, 'Busy': 1, 'On Leave': 2 };
            return score[a.availabilityStatus] - score[b.availabilityStatus];
        });

    } catch (error) {
        console.error("Error getting available faculty:", error);
        return [];
    }
};

export const createSubstitution = async (data) => {
    try {
        const docRef = await addDoc(collection(db, "substitutions"), {
            ...data,
            subjectId: data.courseId,
            status: 'confirmed',
            createdAt: serverTimestamp()
        });

        // In-App Notification
        await createNotification(
            data.substituteFacultyId,
            "Substitution",
            `Urgent: Assigned substitution for ${data.courseName} on ${data.date} (${data.timeRange}).`,
            "/faculty/dashboard",
            docRef.id
        );

        // Email Notification
        try {
            const userDoc = await getDoc(doc(db, "users", data.substituteFacultyId));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.email) {
                    const htmlEmail = `
                        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
                            <div style="background-color: #0f172a; padding: 20px; text-align: center; color: white;">
                                <h2 style="margin:0;">Substitution Assignment</h2>
                            </div>
                            <div style="padding: 30px; color: #334155;">
                                <p>Dear <strong>${userData.displayName}</strong>,</p>
                                <p>You have been assigned as a substitute for the following class:</p>
                                <div style="background: #f8fafc; padding: 20px; border-radius: 6px; margin: 20px 0;">
                                    <strong>Course:</strong> ${data.courseName}<br/>
                                    <strong>Class:</strong> ${data.deptName} ${data.programName} S${data.semesterNo}<br/>
                                    <strong>Time:</strong> ${data.timeRange}<br/>
                                    <strong>Date:</strong> ${data.date}
                                </div>
                                <p>Please check your dashboard for details.</p>
                            </div>
                        </div>
                    `;
                    await sendEmailNotification(userData.email, `[VoxLog] Substitution Assignment: ${data.courseName}`, htmlEmail);
                }
            }
        } catch (e) { console.error("Mail err:", e); }

        return { success: true };
    } catch (error) {
        console.error("Error creating substitution:", error);
        throw error;
    }
};

export const getSubstitutionsForFaculty = async (facultyId, dateString = null) => {
    try {
        let q;
        if (dateString) {
            q = query(collection(db, "substitutions"), where("substituteFacultyId", "==", facultyId), where("date", "==", dateString));
        } else {
            q = query(collection(db, "substitutions"), where("substituteFacultyId", "==", facultyId), orderBy("date", "desc"));
        }
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Fetch subs err:", error);
        return [];
    }
};

export const getSubstitutionsForClass = async (classId, dateString) => {
    try {
        const q = query(
            collection(db, "substitutions"),
            where("classId", "==", classId),
            where("date", "==", dateString)
        );
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching class substitutions:", error);
        return [];
    }
};

export const getAllTodaysSubstitutions = async (dateString) => {
    try {
        const q = query(collection(db, "substitutions"), where("date", "==", dateString));
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        return [];
    }
};

export const checkSubstitutionForAttendance = async (dateString, periodIndex, courseId) => {
    try {
        const q = query(
            collection(db, "substitutions"),
            where("date", "==", dateString),
            where("subjectId", "==", courseId),
            where("periodIndex", "==", periodIndex)
        );
        const snap = await getDocs(q);
        return !snap.empty ? { id: snap.docs[0].id, ...snap.docs[0].data() } : null;
    } catch (e) { return null; }
};

export const getClassesNeedingSubstitution = async (dateString) => {
    try {
        const [approvedLeaves, existingSubs] = await Promise.all([
            getApprovedLeavesForDate(dateString),
            getAllTodaysSubstitutions(dateString)
        ]);

        if (approvedLeaves.length === 0) return [];

        const schedulesArray = await Promise.all(
            approvedLeaves.map(leave => getFacultyScheduleForDate(leave.facultyId, dateString))
        );
        
        const impactedClasses = schedulesArray.flat();
        
        return impactedClasses.map(slot => {
            const leave = approvedLeaves.find(l => l.facultyId === slot.facultyId);
            const sub = existingSubs.find(s => s.periodIndex === slot.periodIndex && s.classId === slot.semesterId);
            
            return {
                ...slot,
                originalFacultyId: slot.facultyId,
                originalFacultyName: leave?.facultyName || 'Faculty',
                leaveReason: leave?.reason,
                leaveStatus: leave?.status,
                status: sub ? 'Covered' : 'Pending',
                substituteName: sub ? sub.substituteName : null
            };
        });
    } catch (error) {
        console.error("Needing sub err:", error);
        return [];
    }
};
