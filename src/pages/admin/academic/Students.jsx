import React, { useState, useEffect } from 'react';
import DataTable from '../../../components/admin/DataTable';
import SimpleModal from '../../../components/admin/academic/SimpleModal';
import {
    getDepartments, getCourses, getSemesters,
    addStudent, getStudentsBySemester, deleteStudent, updateStudent, getAllStudents
} from '../../../services/academicService';
import Toast from '../../../components/common/Toast';
import { Users, GraduationCap, BookOpen, UserPlus, AlertCircle, Edit, Upload } from 'lucide-react';

const Students = () => {
    // 1. Filter State
    const [departments, setDepartments] = useState([]);
    const [courses, setCourses] = useState([]);
    const [semesters, setSemesters] = useState([]);

    const [selectedDept, setSelectedDept] = useState('');
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('');

    // 2. Data State
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentCapacity, setCurrentCapacity] = useState({ enrolled: 0, total: 0 });

    // 3. UI State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [toast, setToast] = useState(null);
    const [formData, setFormData] = useState({ name: '', regNo: '', email: '' });
    const [errors, setErrors] = useState({});
    const [bulkData, setBulkData] = useState('');
    const [bulkLogs, setBulkLogs] = useState([]);
    const [editingId, setEditingId] = useState(null);

    const validateField = (name, value) => {
        let error = "";
        if (!value || value.toString().trim() === '') {
            error = "Field required";
        }
        if (name === 'email' && value) {
            if (!/\S+@\S+\.\S+/.test(value)) {
                error = "Invalid email format";
            }
        }
        return error;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        const error = validateField(name, value);
        setErrors(prev => ({ ...prev, [name]: error }));
    };

    const validateForm = () => {
        const newErrors = {};
        let isValid = true;
        const fields = ['name', 'regNo', 'email'];

        fields.forEach(field => {
            const error = validateField(field, formData[field]);
            if (error) {
                newErrors[field] = error;
                isValid = false;
            }
        });
        setErrors(newErrors);
        return isValid;
    };

    // --- Data Fetching ---

    useEffect(() => {
        loadFilters();
        // Initial fetch of all students
        fetchStudents();
    }, []);

    const loadFilters = async () => {
        try {
            const [d, c, s] = await Promise.all([getDepartments(), getCourses(), getSemesters()]);
            setDepartments(d);
            setCourses(c);
            setSemesters(s);
        } catch (error) {
            console.error(error);
        }
    };

    // Auto-fetch when semester selection changes (specific) or filters cleared
    useEffect(() => {
        if (selectedSemester) {
            fetchStudents(selectedSemester);
        } else if (!selectedDept && !selectedCourse) {
            // If filters cleared completely, fetch all
            fetchStudents(null);
        } else {
            // Intermediate state (e.g. only Dept selected) -> maybe clear or keep previous? 
            // Better to just clear list or wait for Sem selection?
            // User asked for "when no department... show whole".
            if (!selectedDept && !selectedCourse && !selectedSemester) {
                fetchStudents(null);
            }
        }
    }, [selectedDept, selectedCourse, selectedSemester]);

    // --- Auto-Select Logic ---
    useEffect(() => {
        if (departments.length === 1 && !selectedDept) {
            setSelectedDept(departments[0].id);
        }
    }, [departments, selectedDept]);

    useEffect(() => {
        if (selectedDept && courses.length > 0) {
            const relevantCourses = courses.filter(c => c.departmentId === selectedDept);
            if (relevantCourses.length === 1 && !selectedCourse) {
                setSelectedCourse(relevantCourses[0].id);
            }
        }
    }, [selectedDept, courses, selectedCourse]);

    useEffect(() => {
        if (selectedCourse && semesters.length > 0) {
            const relevantSems = semesters.filter(s => s.courseId === selectedCourse);
            if (relevantSems.length === 1 && !selectedSemester) {
                setSelectedSemester(relevantSems[0].id);
            }
        }
    }, [selectedCourse, semesters, selectedSemester]);

    const fetchStudents = async (semesterId = null) => {
        setLoading(true);
        try {
            let list = [];
            if (semesterId) {
                // Filtered View
                list = await getStudentsBySemester(semesterId);

                // Calculate capacity
                const sem = semesters.find(s => s.id === semesterId);
                // If semesters not loaded yet, try finding later or ignore
                if (sem) {
                    setCurrentCapacity({ enrolled: list.length, total: sem.studentCount || 0 });
                }
            } else {
                // All Students View
                list = await getAllStudents();
                setCurrentCapacity({ enrolled: 0, total: 0 }); // No specific capacity in global view
            }

            // Sort automatically by name (Alphabetical Order)
            list.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

            setStudents(list);
        } catch (error) {
            console.error(error);
            setToast({ message: "Failed to load students", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // --- Handlers ---

    const handleCreateOrUpdate = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                // Update Logic
                await updateStudent(editingId, formData);
                setToast({ message: "Student details updated.", type: 'success' });
            } else {
                // Create Logic
                if (!selectedSemester) {
                    setToast({ message: "Please select a Semester first to enroll a student.", type: 'error' });
                    return;
                }

                // Pre-validation for Capacity
                if (currentCapacity.enrolled >= currentCapacity.total) {
                    setToast({ message: `Cannot add student. Class is full (${currentCapacity.total} max).`, type: 'error' });
                    return;
                }

                await addStudent({
                    ...formData,
                    semesterId: selectedSemester,
                    courseId: selectedCourse,
                    departmentId: selectedDept
                });
                setToast({ message: "Student enrolled successfully!", type: 'success' });
            }

            setIsModalOpen(false);
            setEditingId(null);
            setFormData({ name: '', regNo: '', email: '' });
            // Refresh with current view logic
            fetchStudents(selectedSemester);
        } catch (error) {
            setToast({ message: error.message, type: 'error' });
        }
    };

    const startEdit = (student) => {
        setFormData({ name: student.name, regNo: student.regNo, email: student.email });
        setEditingId(student.id);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to remove this student?")) {
            try {
                await deleteStudent(id);
                setToast({ message: "Student removed.", type: 'success' });
                fetchStudents(selectedSemester);
            } catch (error) {
                setToast({ message: "Failed to delete.", type: 'error' });
            }
        }
    };

    const handleBulkProcess = async () => {
        if (!selectedSemester) {
            setToast({ message: "No Semester Selected!", type: "error" });
            return;
        }

        const lines = bulkData.split('\n').filter(l => l.trim());
        const logs = [];
        let successCount = 0;

        setLoading(true);
        for (let line of lines) {
            // Format: Name, RegNo, Email (comma or tab separated)
            // Handle both comma and tab for Excel copy-paste
            const parts = line.split(/[,\t]+/).map(p => p.trim());

            if (parts.length < 3) {
                logs.push({ status: 'error', msg: `Invalid Format: ${line} (Need Name, RegNo, Email)` });
                continue;
            }

            const [name, regNo, email] = parts;
            try {
                // Check local capacity first to fail fast? 
                // Service checks capacity properly but we are in a loop.
                // We'll let service handle individual errors.

                await addStudent({
                    name, regNo, email,
                    semesterId: selectedSemester,
                    courseId: selectedCourse,
                    departmentId: selectedDept
                });
                logs.push({ status: 'success', msg: `Added: ${name}` });
                successCount++;
            } catch (err) {
                logs.push({ status: 'error', msg: `Failed (${name}): ${err.message}` });
            }
        }
        setLoading(false);
        setBulkLogs(logs);

        if (successCount > 0) {
            setToast({ message: `Successfully enrolled ${successCount} students.`, type: 'success' });
            fetchStudents(selectedSemester);
            // Don't close immediately so user can see logs
        }
    };



    // Check Lock Status
    const selectedSemesterObj = semesters.find(s => s.id === selectedSemester);
    const isLocked = selectedSemesterObj?.isLocked; // Boolean flag from Firestore

    // --- Render Helpers ---

    const filteredCourses = courses.filter(c => c.departmentId === selectedDept);
    const filteredSemesters = semesters.filter(s => s.courseId === selectedCourse);

    const getCapacityColor = () => {
        const ratio = currentCapacity.enrolled / (currentCapacity.total || 1);
        if (ratio >= 1) return '#ef4444'; // Red (Full)
        if (ratio >= 0.8) return '#f59e0b'; // Orange (Warning)
        return '#10b981'; // Green (Good)
    };

    const columns = [
        { key: 'regNo', label: 'Register No', render: (val) => <span style={{ fontFamily: 'monospace', color: '#e2e8f0' }}>{val}</span> },
        { key: 'name', label: 'Student Name', render: (val) => <span style={{ fontWeight: 600, color: 'white' }}>{val}</span> },
        { key: 'email', label: 'Email', render: (val) => <span style={{ color: '#94a3b8' }}>{val}</span> },
        { key: 'createdAt', label: 'Joined', render: (val) => <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{val?.toDate ? new Date(val.toDate()).toLocaleDateString() : 'Just now'}</span> },
    ];

    const renderActions = (row) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
                onClick={() => startEdit(row)}
                style={{ color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
                <Edit size={14} /> Edit
            </button>
            <button
                onClick={() => handleDelete(row.id)}
                style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
            >
                Remove
            </button>
        </div>
    );

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: 'white' }}>Student Management</h1>
                <p style={{ color: '#9ca3af', margin: 0 }}>Enroll students into semesters and manage class lists.</p>
            </div>

            {/* Filters */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px', background: 'rgba(30, 41, 59, 0.5)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '8px' }}>Department</label>
                    <select
                        value={selectedDept} onChange={(e) => { setSelectedDept(e.target.value); setSelectedCourse(''); setSelectedSemester(''); }}
                        style={filterSelectStyle}
                    >
                        <option value="">All Departments</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '8px' }}>Course</label>
                    <select
                        value={selectedCourse} onChange={(e) => { setSelectedCourse(e.target.value); setSelectedSemester(''); }}
                        style={filterSelectStyle}
                        disabled={!selectedDept}
                    >
                        <option value="">All Courses</option>
                        {filteredCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '8px' }}>Semester</label>
                    <select
                        value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)}
                        style={filterSelectStyle}
                        disabled={!selectedCourse}
                    >
                        <option value="">All Semesters</option>
                        {filteredSemesters.map(s => <option key={s.id} value={s.id}>Semester {s.semesterNo}</option>)}
                    </select>
                </div>
            </div>

            {/* Capacity Meter - Only show when a semester IS selected */}
            {selectedSemester && (
                <div style={{ marginBottom: '24px', padding: '16px', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '10px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }}>
                            <Users size={20} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#e2e8f0' }}>Class Capacity</h3>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>{currentCapacity.total - currentCapacity.enrolled} slots remaining</p>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: getCapacityColor() }}>{currentCapacity.enrolled}</span>
                        <span style={{ color: '#64748b', fontSize: '1rem' }}> / {currentCapacity.total}</span>
                    </div>
                </div>
            )}

            {/* List */}
            <DataTable
                itemsPerPage={100}
                title={selectedSemester ? "Enrolled Students" : "All Students"}
                columns={columns}
                data={students}
                loading={loading}
                renderActions={renderActions}
                onAdd={!isLocked ? () => {
                    if (selectedSemester) {
                        if (currentCapacity.enrolled >= currentCapacity.total) {
                            setToast({ message: "Class is full! Increase limit in Semester settings if needed.", type: "error" });
                        } else {
                            setEditingId(null);
                            setFormData({ name: '', regNo: '', email: '' });
                            setIsModalOpen(true);
                        }
                    } else {
                        setToast({ message: "Please select a specific Semester to enroll new students.", type: "info" });
                    }
                } : null}

            />

            {/* Bulk Button - Placed manually or integrated? DataTable API usually needs clean render. 
                For now, let's put it floating or near the top if DataTable 'onAdd' isn't flexible enough for 2 buttons.
                Actually DataTable onAdd is single. We can add a custom 'controls' prop later or just place a button above.
                Wait, replacing DataTable onAdd with custom component or just inject?
                Let's hijack the render logic or just place it above DataTable.
             */}

            {selectedSemester && !isLocked && (
                <div style={{ textAlign: 'right', marginTop: '-10px', marginBottom: '10px' }}>
                    <button
                        onClick={() => {
                            setBulkData('');
                            setBulkLogs([]);
                            setIsBulkModalOpen(true);
                        }}
                        style={{
                            background: '#3b82f6', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px',
                            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.875rem'
                        }}
                    >
                        <Upload size={16} /> Bulk Enroll
                    </button>
                </div>
            )}

            {selectedSemester && isLocked && (
                <div style={{
                    textAlign: 'center', marginTop: '10px', marginBottom: '10px',
                    padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '8px', color: '#ef4444', fontWeight: 600
                }}>
                    <AlertCircle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                    Enrollment for this semester is LOCKED. You can only edit existing students.
                </div>
            )}

            {/* Add/Edit Modal */}
            <SimpleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Student Details" : "Enroll New Student"}>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    if (validateForm()) handleCreateOrUpdate(e);
                }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '6px', display: 'block' }}>Full Name</label>
                        <input
                            name="name"
                            required value={formData.name} onChange={handleInputChange}
                            style={{ ...inputStyle, border: errors.name ? '1px solid #ef4444' : inputStyle.border }}
                        />
                        {errors.name && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>{errors.name}</p>}
                    </div>
                    <div>
                        <label style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '6px', display: 'block' }}>Register Number</label>
                        <input
                            name="regNo"
                            required value={formData.regNo} onChange={handleInputChange}
                            style={{ ...inputStyle, border: errors.regNo ? '1px solid #ef4444' : inputStyle.border }}
                        />
                        {errors.regNo && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>{errors.regNo}</p>}
                    </div>
                    <div>
                        <label style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '6px', display: 'block' }}>Email Address</label>
                        <input
                            name="email"
                            required type="email" value={formData.email} onChange={handleInputChange}
                            style={{ ...inputStyle, border: errors.email ? '1px solid #ef4444' : inputStyle.border }}
                        />
                        {errors.email && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>{errors.email}</p>}
                    </div>

                    <button type="submit" style={{ marginTop: '10px', padding: '12px', borderRadius: '8px', background: '#14b8a6', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                        {editingId ? "Update Student" : "Enroll Student"}
                    </button>
                    {!editingId && <p style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', margin: 0 }}>This will consume 1 slot from the semester capacity.</p>}
                </form>
            </SimpleModal>

            {/* Bulk Logic Modal */}
            <SimpleModal isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} title="Bulk Student Enrollment">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                        <p style={{ margin: '0 0 8px 0' }}>Paste student details below. One student per line.</p>
                        <code style={{ background: '#0f172a', padding: '4px 8px', borderRadius: '4px', display: 'block', marginBottom: '8px' }}>Name, RegisterNo, Email</code>
                        <p style={{ margin: 0, fontSize: '0.8rem' }}>Works with Excel/Sheets copy-paste.</p>
                    </div>

                    <textarea
                        value={bulkData}
                        onChange={(e) => setBulkData(e.target.value)}
                        placeholder={`John Doe, REG001, john@test.com\nJane Smith, REG002, jane@test.com`}
                        rows={10}
                        style={{
                            width: '100%', padding: '12px', borderRadius: '8px',
                            background: '#1e293b', border: '1px solid #475569', color: 'white', outline: 'none', fontFamily: 'monospace',
                            resize: 'vertical'
                        }}
                    />

                    {bulkLogs.length > 0 && (
                        <div style={{ maxHeight: '150px', overflowY: 'auto', background: '#0f172a', padding: '8px', borderRadius: '8px', border: '1px solid #334155' }}>
                            {bulkLogs.map((log, i) => (
                                <div key={i} style={{ fontSize: '0.85rem', color: log.status === 'success' ? '#10b981' : '#ef4444', marginBottom: '4px' }}>
                                    {log.status === 'success' ? '✓' : '✕'} {log.msg}
                                </div>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={handleBulkProcess} disabled={loading || !bulkData.trim()}
                        style={{ padding: '12px', borderRadius: '8px', background: '#3b82f6', color: 'white', border: 'none', fontWeight: 600, cursor: (loading || !bulkData.trim()) ? 'not-allowed' : 'pointer', opacity: (loading || !bulkData.trim()) ? 0.7 : 1 }}
                    >
                        {loading ? 'Processing...' : 'Process Import'}
                    </button>
                </div>
            </SimpleModal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

const filterSelectStyle = {
    width: '100%', padding: '10px', borderRadius: '8px',
    background: '#0f172a', border: '1px solid #334155', color: 'white', outline: 'none'
};

const inputStyle = {
    width: '100%', padding: '10px', borderRadius: '8px',
    background: '#1e293b', border: '1px solid #475569', color: 'white', outline: 'none'
};

export default Students;
