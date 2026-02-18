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
    getDoc
} from 'firebase/firestore';
import { getFacultyAssignments, getSemesters } from './academicService';
import { getTimetable, getFacultyScheduleForDate } from './timetableService';
import { getFacultyIdsOnLeave, getApprovedLeavesForDate, getAllLeavesForDate } from './leaveService';
import { fetchAllUsers } from './adminService';
import { sendEmailNotification } from './emailService';

// ===========================
// DATA FETCHING HELPERS
// ===========================

const getAllFaculty = async () => {
    // Reusing fetchAllUsers from adminService which gets everyone
    // Ideally we filter for role='faculty' but the UI might not set roles strictly yet
    // For safety, we'll filter client side if needed, or assume assignment check dictates faculty hood
    const users = await fetchAllUsers();
    return users.filter(u => u.role === 'faculty' || u.role === 'admin'); // Admins can substitute too
};

// ===========================
// SUBSTITUTION LOGIC
// ===========================

/**
 * Get Available Faculty for a specific substitution slot.
 * RULES:
 * 1. Not in weekly_timetable for that slot.
 * 2. Not already a substitute for that slot.
 * 3. Not on Approved Leave for that date.
 */
/**
 * Get All Faculty with Availability Status for a specific slot.
 * Returns: Array of { ...faculty, availabilityStatus: 'Free' | 'Busy' | 'On Leave', busyReason: string }
 */
export const getAvailableFaculty = async (dateString, periodIndex, timeRange, semesterIdToAvoid) => {
    try {
        console.log(`Checking availability for ${dateString}, Period ${periodIndex}`);

        // 1. Get All Faculty
        const allFaculty = await getAllFaculty();

        // Map to store status: uid -> { status, reason }
        const facultyStatusMap = {};

        // Initialize everyone as Free
        allFaculty.forEach(f => {
            facultyStatusMap[f.uid || f.id] = { status: 'Free', reason: '' };
        });

        // 2. Identify Faculty on LEAVE
        const facultyOnLeave = await getFacultyIdsOnLeave(dateString);
        facultyOnLeave.forEach(id => {
            if (facultyStatusMap[id]) {
                facultyStatusMap[id] = { status: 'On Leave', reason: 'Approved Leave' };
            }
        });

        // 3. Identify Faculty Busy in TIMETABLE
        const dateObj = new Date(dateString);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = days[dateObj.getDay()];

        // Optimization: Fetch all assignments once to map Subject -> Faculty
        const allAssignments = await getFacultyAssignments();
        const subjectFacultyMap = {};
        allAssignments.forEach(a => subjectFacultyMap[a.subjectId] = a.facultyId);

        // Fetch all semesters to check timetables
        const semesters = await getSemesters();

        await Promise.all(semesters.map(async (sem) => {
            const schedule = await getTimetable(sem.id);
            if (!schedule || !schedule[dayName]) return;

            const slot = schedule[dayName].find(s => s.periodIndex === periodIndex);

            // Check if this slot has a subject AND a faculty assigned
            if (slot && slot.subjectId) {
                const facultyId = subjectFacultyMap[slot.subjectId];

                // If a faculty is found, MARK THEM AS BUSY
                // But only if they aren't already marked as 'On Leave' (Leave takes precedence logic? Or maybe Leave explains why they need a sub?)
                // Actually, if they are on leave, they are 'On Leave'. If they are in class, they are 'Busy'.

                if (facultyId && facultyStatusMap[facultyId]) {
                    if (facultyStatusMap[facultyId].status !== 'On Leave') {
                        facultyStatusMap[facultyId] = {
                            status: 'Busy',
                            reason: `Class: ${slot.subjectname} (${sem.semesterNo === 1 ? '1st' : sem.semesterNo + 'th'} Sem)`
                        };
                    }
                }
            }
        }));

        // 4. Identify Faculty already SUBSTITUTING
        const subQuery = query(
            collection(db, "substitutions"),
            where("date", "==", dateString),
            where("periodIndex", "==", periodIndex)
        );
        const subSnap = await getDocs(subQuery);
        subSnap.docs.forEach(doc => {
            const data = doc.data();
            if (data.substituteFacultyId && facultyStatusMap[data.substituteFacultyId]) {
                // Convert to Busy
                if (facultyStatusMap[data.substituteFacultyId].status !== 'On Leave') {
                    facultyStatusMap[data.substituteFacultyId] = {
                        status: 'Busy',
                        reason: `Substituting for ${data.subjectName || 'another class'}`
                    };
                }
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

        // Sort: Free first, then Busy, then Leave
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
    // data: { date, periodIndex, timeRange, classId, subjectId, originalFacultyId, substituteFacultyId, requestedBy }
    try {
        await addDoc(collection(db, "substitutions"), {
            ...data,
            status: 'confirmed', // Auto-confirm for now
            createdAt: serverTimestamp()
        });

        // Create Notification for the Substitute Faculty
        await addDoc(collection(db, "notifications"), {
            userId: data.substituteFacultyId,
            title: "New Substitution Assigned",
            message: `You have been assigned a substitution for ${data.subjectName} on ${data.date} (${data.timeRange}).`,
            type: "substitution",
            read: false,
            createdAt: serverTimestamp(),
            link: "/faculty/dashboard" // or wherever relevant
        });

        console.log(`[Notification] Sent to ${data.substituteFacultyId}`);

        // 3. Send Email Notification
        try {
            const userDoc = await getDoc(doc(db, "users", data.substituteFacultyId));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.email) {
                    const htmlEmail = `
                        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
                            <!-- Header -->
                            <div style="background-color: #0f172a; padding: 20px; text-align: center;">
                                <h2 style="color: #ffffff; margin: 0; font-size: 24px;">New Substitution Assignment</h2>
                                <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 14px;">Academic Management System</p>
                            </div>
                            
                            <!-- Body -->
                            <div style="padding: 30px; color: #334155;">
                                <p style="font-size: 16px; margin-top: 0;">Dear <strong>${userData.displayName || 'Faculty Member'}</strong>,</p>
                                
                                <p style="font-size: 16px; line-height: 1.6;">
                                    You have been assigned as a substitute teacher for the following class due to a faculty leave. 
                                    Please ensure you are present at the scheduled time.
                                </p>
                                
                                <!-- Details Box -->
                                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin: 25px 0;">
                                    <table style="width: 100%; border-collapse: collapse;">
                                        <tr>
                                            <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 80px;">Subject</td>
                                            <td style="padding: 8px 0; color: #0f172a; font-weight: 600; font-size: 16px;">${data.subjectName}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Date</td>
                                            <td style="padding: 8px 0; color: #0f172a; font-weight: 600; font-size: 16px;">${new Date(data.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Time</td>
                                            <td style="padding: 8px 0; color: #f59e0b; font-weight: 700; font-size: 16px;">${data.timeRange}</td>
                                        </tr>
                                    </table>
                                </div>

                                <p style="font-size: 14px; color: #64748b; margin-top: 30px; text-align: center;">
                                    You can view your full updated schedule on the Faculty Dashboard.
                                </p>
                                
                                <div style="text-align: center; margin-top: 20px;">
                                    <a href="#" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">View Dashboard</a>
                                </div>
                            </div>
                            
                            <!-- Footer -->
                            <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                                <p style="margin: 0;">This is an automated notification. Please do not reply.</p>
                            </div>
                        </div>
                    `;

                    await sendEmailNotification(
                        userData.email,
                        `✅ Action Required: Substitution for ${data.subjectName}`,
                        htmlEmail
                    );
                }
            }
        } catch (mailError) {
            console.error("Failed to send email notification:", mailError);
        }

        return { success: true };
    } catch (error) {
        console.error("Error creating substitution:", error);
        throw error;
    }
};

export const getSubstitutionsForFaculty = async (facultyId, dateString = null) => {
    try {
        if (dateString) {
            q = query(
                collection(db, "substitutions"),
                where("substituteFacultyId", "==", facultyId),
                where("date", "==", dateString)
            );
        } else {
            q = query(
                collection(db, "substitutions"),
                where("substituteFacultyId", "==", facultyId),
                orderBy("date", "desc")
            );
        }

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    } catch (error) {
        console.error("Error fetching substitutions:", error);
        // Fallback for indexing errors
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

export const checkSubstitutionForAttendance = async (dateString, periodIndex, section, subjectId) => {
    // Helper to find if there is a substitution for a specific class slot
    // 'section' is tricky because substitutions stores 'classId' (semesterId).
    // The AttendanceModal usually knows the semesterId (course.semesterId).
    // We'll trust the caller to pass enough info or we query loosely.

    // For specific authentication check:
    // We need to find if there is a substitution doc for: date, periodIndex, subjectId (or classId)
    // AND return the substituteFacultyId.

    try {
        // We'll search by date + subjectId + periodIndex to be precise
        const q = query(
            collection(db, "substitutions"),
            where("date", "==", dateString),
            where("subjectId", "==", subjectId),
            where("periodIndex", "==", periodIndex)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
            return snap.docs[0].data();
        }
        return null;
    } catch (error) {
        console.error("Error checking substitution:", error);
        return null;
    }
};

/**
 * Orchestrator: Get all classes that need substitution for a specific date
 * because the original faculty is on APPROVED leave.
 */
export const getClassesNeedingSubstitution = async (dateString) => {
    try {
        // 1. Get Approved AND Pending Leaves (to allow pre-arrangement)
        console.log(`[DEBUG] Fetching leaves (Approved & Pending) for ${dateString}`);
        // Import getAllLeavesForDate (need to update imports first if not auto-handled, but we'll assume same file structure)
        // Wait, I need to make sure I import it in the file.
        // Assuming I'll update imports in a separate step or just rely on 'getApprovedLeavesForDate' being replaced if I wanted to swap it out entirely.
        // But I kept both. So I need to call the new one.

        // Let's assume the import is updated or I can use dynamic import? No.
        // I will use getAllLeavesForDate here. 
        // NOTE: I must update the import in substitutionService.js next.
        const leaves = await getAllLeavesForDate(dateString);
        console.log(`[DEBUG] Leaves found: ${leaves.length}`, leaves);
        if (leaves.length === 0) return [];

        const needsSubstitution = [];

        // 2. For each faculty on leave, get their schedule
        await Promise.all(leaves.map(async (leave) => {
            const schedule = await getFacultyScheduleForDate(leave.facultyId, dateString);

            // 3. Annotate and check existing substitutions
            await Promise.all(schedule.map(async (slot) => {
                // Check if already substituted
                const existingSub = await checkSubstitutionForAttendance(
                    dateString,
                    slot.periodIndex,
                    null,
                    slot.subjectId
                );

                needsSubstitution.push({
                    ...slot,
                    originalFacultyId: leave.facultyId,
                    originalFacultyName: leave.facultyName,
                    leaveReason: leave.reason,
                    leaveType: leave.type,
                    leaveStatus: leave.status, // Pass status (Pending/Approved)
                    status: existingSub ? 'Covered' : 'Pending',
                    substituteName: existingSub ? existingSub.substituteName : null
                });
            }));
        }));

        return needsSubstitution;

    } catch (error) {
        console.error("Error fetching classes needing substitution:", error);
        return [];
    }
};
