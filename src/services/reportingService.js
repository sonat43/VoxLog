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

        const [facultyAttendanceSnap, leaveSnap, subSnap] = await Promise.all([
            getDocs(query(collection(db, "faculty_attendance"))),
            getDocs(query(collection(db, "leave_requests"), where("status", "==", "Approved"))),
            getDocs(query(collection(db, "substitutions")))
        ]);

        const facultyAttRecords = facultyAttendanceSnap.docs.map(d => ({ ...d.data(), id: d.id }));
        const leaveRecords = leaveSnap.docs.map(d => ({ ...d.data(), id: d.id }));
        const subRecords = subSnap.docs.map(d => ({ ...d.data(), id: d.id }));

        // 3. Build Daily Status Grid
        // Map: FacultyID -> Date -> Status
        const report = {};

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

                // Check Leave First
                const leave = leaveRecords.find(l => {
                    return l.facultyId === fid &&
                        dateStr >= l.fromDate &&
                        dateStr <= l.toDate;
                });

                if (leave) {
                    status = 'On-Leave';
                    color = 'Yellow';
                    details.push(`Leave: ${leave.type}`);

                    const actingAsSub = subRecords.find(s => s.substituteFacultyId === fid && s.date === dateStr);
                    if (actingAsSub) {
                        status = 'Present (Sub)';
                        color = 'Green';
                        details.push(`Subbing for Class ${actingAsSub.classId}`);
                    }
                } else {
                    // Check Faculty Attendance explicitly
                    const dailyLog = facultyAttRecords.find(a => a.facultyId === fid && a.dateString === dateStr);

                    if (dailyLog) {
                        if (dailyLog.status === 'Present') {
                            status = 'Present';
                            color = 'Green';
                            details.push(`Classes: ${dailyLog.completedClasses} / ${dailyLog.targetClasses}`);
                        } else if (dailyLog.status === 'Absent') {
                            status = 'Absent';
                            color = 'Red';
                            details.push(`Classes: ${dailyLog.completedClasses} / ${dailyLog.targetClasses}`);
                        }
                    } else {
                        // If no log exists for the day, check if it's a weekend
                        const dayOfWeek = d.getDay();
                        if (dayOfWeek === 0 || dayOfWeek === 6) {
                            status = 'Weekend';
                            color = 'Gray';
                            details.push('Weekend');
                        } else {
                            status = 'No Data';
                            color = 'Gray';
                            details.push('Pending Evaluation');
                        }
                    }
                }

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
