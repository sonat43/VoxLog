import React, { useState } from 'react';
import { provisionUser } from '../../../services/adminService';
import { addDepartment, addCourse, addSemester, addSubject, assignFacultyToSubject, getDepartments, getCourses } from '../../../services/academicService';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

const Seeder = () => {
    const [status, setStatus] = useState('idle'); // idle, running, success, error
    const [logs, setLogs] = useState([]);

    const addLog = (msg) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

    const runSeeder = async () => {
        setStatus('running');
        setLogs([]);
        addLog("Starting Data Seeding...");

        try {
            // 1. DEPARTMENTS
            const depts = ["Computer Science", "Mechanical", "Automobile"];
            const deptIds = {}; // Name -> ID

            for (const name of depts) {
                try {
                    addLog(`Creating Department: ${name}...`);
                    // Note: addDepartment returns void, doesn't return ID. We need to fetch it or modify service.
                    // Actually, addDepartment checks for duplicates.
                    await addDepartment(name);
                    addLog(`✅ Created ${name}`);
                } catch (e) {
                    addLog(`⚠️ ${name}: ${e.message}`);
                }
            }

            // Need to fetch IDs now
            const allDepts = await getDepartments();
            allDepts.forEach(d => deptIds[d.name] = d.id);

            // 2. COURSES
            const courses = [
                { name: "B.Tech CS", dept: "Computer Science", duration: 4 },
                { name: "B.Tech Mechanical", dept: "Mechanical", duration: 4 },
                { name: "B.Tech Automobile", dept: "Automobile", duration: 4 }
            ];
            const courseIds = {}; // Name -> ID for linking

            // Modified service logic: We need IDs. We'll have to rely on fetching them or just assume they work.
            // Since we can't easily modify service return types right now without reloading, I'll fetch courses after adding.

            for (const c of courses) {
                if (deptIds[c.dept]) {
                    try {
                        addLog(`Creating Course: ${c.name}...`);
                        await addCourse(c.name, deptIds[c.dept], c.duration);
                        addLog(`✅ Created ${c.name}`);
                    } catch (e) {
                        addLog(`⚠️ ${c.name}: ${e.message}`);
                    }
                } else {
                    addLog(`❌ Skipping ${c.name}: Missing Department ID for ${c.dept}`);
                }
            }

            // 3. SEMESTERS (Auto-generate 1-8 for each course)
            const allCourses = await getCourses(); // Fetch newly created courses
            for (const course of allCourses) {
                // Determine duration (default 4 years = 8 semesters if not specified)
                // Seeder courses have duration, but fetched object might just have data.
                const duration = course.duration || 4;
                const totalSemesters = duration * 2;

                for (let i = 1; i <= totalSemesters; i++) {
                    try {
                        // We won't assign student count or teacher here to keep it simple, or maybe random?
                        // Let's keep it basic: just structure.
                        await addSemester(course.id, i, 60, null); // Default 60 students
                        // addLog(`  - Added Semester ${i} for ${course.name}`); // Too verbose?
                    } catch (e) {
                        // Ignore "already exists" errors to avoid clutter
                        if (!e.message.includes('already exists')) {
                            addLog(`⚠️ Sem ${i} for ${course.name}: ${e.message}`);
                        }
                    }
                }
                addLog(`✅ Verified Semesters (1-${totalSemesters}) for ${course.name}`);
            } // End Semester Loop

            // 3. FACULTY
            const facultyMembers = [
                { displayName: "Prof. Alan Turing", email: "alan@voxlog.edu", dept: "Computer Science" },
                { displayName: "Prof. Isaac Newton", email: "isaac@voxlog.edu", dept: "Mechanical" }
            ];

            for (const f of facultyMembers) {
                try {
                    addLog(`Provisioning Faculty: ${f.displayName}...`);
                    await provisionUser({
                        displayName: f.displayName,
                        email: f.email,
                        department: f.dept,
                        role: 'faculty',
                        status: 'active',
                        setPassword: true,
                        password: 'password123'
                    });
                    addLog(`✅ Created Faculty: ${f.displayName}`);
                } catch (e) {
                    addLog(`⚠️ Faculty ${f.displayName}: ${e.message}`);
                }
            }

            setStatus('success');
            addLog("🎉 Seeding Completed!");

        } catch (globalError) {
            console.error(globalError);
            addLog(`❌ Critical Error: ${globalError.message}`);
            setStatus('error');
        }
    };

    return (
        <div style={{ padding: '2rem', color: 'white', maxWidth: '800px' }}>
            <h1>System Seeder</h1>
            <p className="text-gray-400 mb-8">Establish initial data structure (Departments, Courses, Faculty).</p>

            <button
                onClick={runSeeder}
                disabled={status === 'running'}
                style={{
                    padding: '1rem 2rem', background: '#14b8a6', color: 'white', border: 'none',
                    borderRadius: '0.5rem', fontSize: '1.2rem', fontWeight: 'bold', cursor: status === 'running' ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '1rem'
                }}
            >
                {status === 'running' && <Loader2 className="animate-spin" />}
                {status === 'running' ? 'Seeding...' : 'Run Seed Script'}
            </button>

            <div style={{ marginTop: '2rem', background: '#111827', padding: '1rem', borderRadius: '0.5rem', fontFamily: 'monospace', height: '400px', overflowY: 'auto', border: '1px solid #374151' }}>
                {logs.length === 0 && <span style={{ color: '#6b7280' }}>Logs will appear here...</span>}
                {logs.map((log, i) => (
                    <div key={i} style={{ marginBottom: '0.5rem', color: log.includes('❌') ? '#ef4444' : log.includes('✅') ? '#10b981' : '#d1d5db' }}>
                        {log}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Seeder;
