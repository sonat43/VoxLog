import { db } from './firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { fetchAllUsers } from './adminService';
import { getLeaveRequests } from './leaveService';
import { getSubstitutionsForFaculty } from './substitutionService';

// ===========================
// REPORTING & ANALYTICS
// ===========================

/**
 * Generates the Master Attendance Report for a specific date range.
 * This aggregates Faculty, Attendance, Leaves, and Substitutions.
 * @param {Date} startDate 
 * @param {Date} endDate 
 */
export const getMasterAttendanceReport = async (startDate, endDate) => {
    try {
        console.log("Generating Master Report...");

        // 1. Fetch All Faculty
        // Ideally filter by role='faculty'
        const allUsers = await fetchAllUsers();
        // naive filter if role not strictly enforced in 'users' collection yet, 
        // but 'fetchAllUsers' in adminService currently gets everyone.
        // Let's assume valid faculty have 'facultyId' or are in 'users' with role.
        const facultyList = allUsers.filter(u => u.role === 'faculty' || u.role === 'class_teacher' || u.assignedClasses > 0);

        // 2. Fetch Data in Range (Parallel)
        // Convert dates to timestamps or string comparisons depending on DB storage
        // Our DB uses 'createdAt' (Timestamp) or 'date' (String YYYY-MM-DD)
        // For 'attendance_history', it uses 'timestamp'.
        // For 'leave_requests', 'fromDate'/'toDate' strings.
        // For 'substitutions', 'date' string.

        // We'll fetch ALL for the prototype to avoid complex compound queries, 
        // then filter in memory. (Not production ready for 10k records, fine for 100)

        const [attendanceSnap, leaveSnap, subSnap] = await Promise.all([
            getDocs(query(collection(db, "attendance_history"))),
            getDocs(query(collection(db, "leave_requests"), where("status", "==", "Approved"))),
            getDocs(query(collection(db, "substitutions")))
        ]);

        const attendanceRecords = attendanceSnap.docs.map(d => ({ ...d.data(), id: d.id }));
        const leaveRecords = leaveSnap.docs.map(d => ({ ...d.data(), id: d.id }));
        const subRecords = subSnap.docs.map(d => ({ ...d.data(), id: d.id }));

        // 3. Build Daily Status Grid
        // Map: FacultyID -> Date -> Status
        const report = {}; // { facultyId: { '2023-10-27': { status: 'Present', details: [...] } } }

        // Initialize
        facultyList.forEach(f => {
            report[f.uid || f.id] = {
                facultyName: f.displayName || f.name || f.email,
                department: f.department || 'General',
                days: {}
            };
        });

        // Loop through dates
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];

            facultyList.forEach(f => {
                const fid = f.uid || f.id;
                let status = 'Absent'; // Default
                let color = 'Red';
                let details = [];

                // Check Leave
                const leave = leaveRecords.find(l => {
                    return l.facultyId === fid &&
                        dateStr >= l.fromDate &&
                        dateStr <= l.toDate;
                });

                if (leave) {
                    status = 'On-Leave';
                    color = 'Yellow';
                    details.push(`Leave: ${leave.type}`);

                    // Check Substitution (If on leave, was it covered?)
                    // Substitutions are by Date + OriginalFaculty
                    // Note: 'substitutions' collection stores 'originalFacultyId' (if we added it?)
                    // In 'createSubstitution' we passed 'originalFacultyId: null' earlier! 
                    // FIX: We need to fix substitution creation to store originalFacultyId correctly if possible.
                    // But 'substitutions' definitely has 'date' and 'substituteFacultyId'. 
                    // It assumes we know the class's original teacher.
                    // For now, check if this faculty is the *Substitute*? No, we want to know if *their* class was subbed.
                    // If we can't link substitution to original faculty easily (without looking up timetable), 
                    // we'll stick to "On-Leave".
                    // However, if *this faculty* is ACTING as a substitute today:
                    const actingAsSub = subRecords.find(s => s.substituteFacultyId === fid && s.date === dateStr);
                    if (actingAsSub) {
                        status = 'Present (Sub)';
                        color = 'Green'; // They are technically present teaching someone else's class
                        details.push(`Subbing for Class ${actingAsSub.classId}`);
                    }
                }

                // Check Attendance
                // Filter records for this faculty on this date
                const todaysAttendance = attendanceRecords.filter(a => {
                    if (a.facultyId !== fid) return false;
                    // Timestamp check
                    const aDate = a.timestamp?.toDate ? a.timestamp.toDate().toISOString().split('T')[0] : '';
                    return aDate === dateStr;
                });

                if (todaysAttendance.length > 0) {
                    status = 'Present';
                    color = 'Green';
                    details.push(`Classes: ${todaysAttendance.length}`);

                    // Check if they were a substitute in any record
                    if (todaysAttendance.some(a => a.role === 'Substitute')) {
                        details.push('(Has Substitute Duties)');
                    }
                } else if (status === 'Absent') {
                    // Check if it's a weekend or no-class day?
                    // For now, leave as Absent or 'No Class' if we had timetable data here.
                    // Hard to distinguish Absent vs Free Period without full timetable processing.
                    const dayOfWeek = d.getDay();
                    if (dayOfWeek === 0 || dayOfWeek === 6) {
                        status = 'Weekend';
                        color = 'Gray';
                    }
                }

                // If Leave + Substituted (Someone else took their class)
                // We need to know if coverage was arranged.
                // Assuming 'Blue' means "On Leave but Substituted".
                // We'll mark as 'Substituted' if Leave exists AND we find a sub record for their usual subject?
                // Too complex for this iteration without 'originalFacultyId' in substitutions.

                report[fid].days[dateStr] = {
                    status,
                    color,
                    details: details.join(', ')
                };
            });
        }

        return report;

    } catch (error) {
        console.error("Error generating report:", error);
        return {};
    }
};
