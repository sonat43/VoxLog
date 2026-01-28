import React, { useState, useEffect } from 'react';
import DataTable from '../../../components/admin/DataTable';
import SimpleModal from '../../../components/admin/academic/SimpleModal';
import { getSemesters, addSemester, getCourses, deleteSemester, updateSemester, getDepartments } from '../../../services/academicService';
import { fetchAllUsers } from '../../../services/adminService';
import Toast from '../../../components/common/Toast';
import ConfirmModal from '../../../components/common/ConfirmModal';
import { Trash, Edit, ArrowUp, Lock, Unlock } from 'lucide-react';

const Semesters = () => {
    const [semesters, setSemesters] = useState([]);
    const [courses, setCourses] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [faculty, setFaculty] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLockModalOpen, setIsLockModalOpen] = useState(false);
    const [lockTarget, setLockTarget] = useState(null);
    const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
    const [promoteTarget, setPromoteTarget] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedSemester, setSelectedSemester] = useState(null);
    const [selectedDept, setSelectedDept] = useState('');
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({ courseId: '', semesterNo: '', studentCount: '', classTeacherId: '' });
    const [toast, setToast] = useState(null);

    // Auto-set Semester Number to 1 for new entries (enforcing batch start)
    useEffect(() => {
        if (!editingId) {
            setFormData(prev => ({ ...prev, semesterNo: '1' }));
        }
    }, [editingId, isModalOpen]);

    const handleIncrement = (sem) => {
        setPromoteTarget(sem);
        setIsPromoteModalOpen(true);
    };

    const confirmPromote = async () => {
        if (!promoteTarget) return;
        const sem = promoteTarget;

        try {
            // Check if next semester already exists for this course (optional but good safety)
            const nextSemNo = Number(sem.semesterNo) + 1;
            const existing = semesters.find(s => s.courseId === sem.courseId && s.semesterNo === nextSemNo);

            if (existing) {
                setToast({ message: `Semester ${nextSemNo} already exists for this course! Cannot increment.`, type: "error" });
                return;
            }

            await updateSemester(sem.id, { semesterNo: nextSemNo });
            setToast({ message: `Promoted to Semester ${nextSemNo} successfully!`, type: "success" });
            fetchData();
        } catch (error) {
            setToast({ message: error.message, type: "error" });
        } finally {
            setIsPromoteModalOpen(false);
            setPromoteTarget(null);
        }
    };

    const handleToggleLock = (sem) => {
        setLockTarget(sem);
        setIsLockModalOpen(true);
    };

    const confirmToggleLock = async () => {
        if (!lockTarget) return;
        const newStatus = !lockTarget.isLocked;

        try {
            // Optimistic UI update
            setSemesters(prev => prev.map(s => s.id === lockTarget.id ? { ...s, isLocked: newStatus } : s));

            await updateSemester(lockTarget.id, { isLocked: newStatus });
            setToast({ message: `Enrollment ${newStatus ? 'Locked' : 'Unlocked'}`, type: 'success' });
            fetchData();
        } catch (error) {
            console.error("Lock Error:", error);
            setToast({ message: error.message, type: 'error' });
            fetchData(); // Revert
        } finally {
            setIsLockModalOpen(false);
            setLockTarget(null);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch core data first
            const [semestersData, coursesData, usersData] = await Promise.all([
                getSemesters(),
                getCourses(),
                fetchAllUsers()
            ]);

            setSemesters(semestersData);
            setCourses(coursesData);

            // Fetch optional data (Departments) separately to avoid crashing everything
            try {
                const depsData = await getDepartments();
                setDepartments(depsData);
            } catch (deptError) {
                console.error("Failed to fetch departments", deptError);
                // Continue without departments
            }

            // Filter only faculty members (case-insensitive) who have a department assigned.
            // Excluding 'Admin' or 'Administration' as requested.
            setFaculty(usersData.filter(u => {
                const role = (u.role || '').toLowerCase();
                // Ensure they are faculty AND have a department (to avoid admins/system users)
                return role === 'faculty' && u.department;
            }));
        } catch (error) {
            console.error("Fetch Error:", error);
            setToast({ message: "Failed to load data", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateOrUpdate = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateSemester(editingId, {
                    courseId: formData.courseId,
                    semesterNo: formData.semesterNo,
                    studentCount: formData.studentCount,
                    classTeacherId: formData.classTeacherId
                });
                setToast({ message: "Semester updated successfully", type: "success" });
            } else {
                await addSemester(formData.courseId, formData.semesterNo, formData.studentCount, formData.classTeacherId);
                setToast({ message: "Semester added successfully", type: "success" });
            }
            handleCloseModal();
            fetchData();
        } catch (error) {
            setToast({ message: error.message, type: "error" });
        }
    };

    const startEdit = (sem) => {
        setFormData({
            courseId: sem.courseId,
            semesterNo: sem.semesterNo,
            studentCount: sem.studentCount || '',
            classTeacherId: sem.classTeacherId || ''
        });
        setEditingId(sem.id);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData({ courseId: '', semesterNo: '', studentCount: '', classTeacherId: '' });
        setEditingId(null);
    };

    const confirmDelete = (semester) => {
        setSelectedSemester(semester);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedSemester) return;
        try {
            await deleteSemester(selectedSemester.id);
            setToast({ message: `Semester ${selectedSemester.semesterNo} deleted successfully`, type: "success" });
            setIsDeleteModalOpen(false);
            fetchData();
        } catch (error) {
            setToast({ message: error.message, type: "error" });
            setIsDeleteModalOpen(false);
        }
    };

    const getCourseName = (courseId) => {
        const c = courses.find(x => x.id === courseId);
        return c ? c.name : 'Unknown Course';
    };

    const getTeacherName = (teacherId) => {
        const t = faculty.find(x => x.id === teacherId);
        return t ? t.displayName : 'Not Assigned';
    };

    // Calculate assigned teachers to prevent duplicates
    // But allow the current semester's teacher to remain selected during edit
    const assignedTeacherIds = new Set(
        semesters
            .filter(s => s.id !== editingId) // Exclude current semester being edited
            .map(s => s.classTeacherId)
            .filter(Boolean)
    );

    const columns = [
        { key: 'semesterNo', label: 'Semester No', render: (val) => <span style={{ color: 'white', fontWeight: 600 }}>Semester {val}</span> },
        { key: 'courseId', label: 'Course', render: (val) => <span style={{ color: '#d1d5db' }}>{getCourseName(val)}</span> },
        { key: 'studentCount', label: 'Students', render: (val) => <span style={{ color: '#9ca3af' }}>{val || 0}</span> },
        { key: 'classTeacherId', label: 'Class Teacher', render: (val) => <span style={{ color: '#d1d5db' }}>{getTeacherName(val)}</span> },
        {
            key: 'isLocked',
            label: 'Status',
            render: (val) => val ?
                <span style={{ color: '#ef4444', fontSize: '0.75rem', border: '1px solid #ef4444', padding: '2px 6px', borderRadius: '4px' }}>LOCKED</span> :
                <span style={{ color: '#10b981', fontSize: '0.75rem', border: '1px solid #10b981', padding: '2px 6px', borderRadius: '4px' }}>OPEN</span>
        }
    ];

    const renderActions = (row) => (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
                onClick={() => handleIncrement(row)}
                style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: '0.375rem',
                    padding: '0.5rem 0.75rem',
                    cursor: 'pointer',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: '0.875rem'
                }}
                title="Promote Semester"
            >
                <ArrowUp size={16} /> Promote
            </button>
            <button
                onClick={() => handleToggleLock(row)}
                style={{
                    background: row.isLocked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${row.isLocked ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                    borderRadius: '0.375rem',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    color: row.isLocked ? '#10b981' : '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                title={row.isLocked ? "Unlock Enrollment" : "Lock Enrollment"}
            >
                {row.isLocked ? <Unlock size={16} /> : <Lock size={16} />}
            </button>
            <button
                onClick={() => startEdit(row)}
                style={{
                    background: 'rgba(96, 165, 250, 0.1)',
                    border: '1px solid rgba(96, 165, 250, 0.2)',
                    borderRadius: '0.375rem',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    color: '#60a5fa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                title="Edit Semester"
            >
                <Edit size={16} />
            </button>
            <button
                onClick={() => confirmDelete(row)}
                style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '0.375rem',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                title="Delete Semester"
            >
                <Trash size={16} />
            </button>
        </div>
    );

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: 'white' }}>Semesters</h1>
                <p style={{ color: '#9ca3af', margin: 0 }}>Manage semesters, assign class teachers, and track student counts.</p>
            </div>

            {/* Filter */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    style={{ padding: '0.5rem', borderRadius: '0.375rem', background: '#374151', border: '1px solid #4b5563', color: 'white' }}
                >
                    <option value="">All Departments</option>
                    {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
            </div>

            <DataTable
                title="Semester List"
                columns={columns}
                data={selectedDept
                    ? semesters.filter(s => {
                        const c = courses.find(course => course.id === s.courseId);
                        return c && c.departmentId === selectedDept;
                    })
                    : semesters
                }
                onAdd={() => {
                    setEditingId(null);
                    setFormData({ courseId: '', semesterNo: '', studentCount: '', classTeacherId: '' });
                    setIsModalOpen(true);
                }}
                renderActions={renderActions}
            />

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Delete Semester"
                message={`Are you sure you want to delete Semester ${selectedSemester?.semesterNo} for ${getCourseName(selectedSemester?.courseId)}? This action cannot be undone.`}
                isDangerous={true}
                confirmText="Delete"
            />

            <ConfirmModal
                isOpen={isLockModalOpen}
                onClose={() => setIsLockModalOpen(false)}
                onConfirm={confirmToggleLock}
                title={lockTarget?.isLocked ? "Unlock Enrollment" : "Lock Enrollment"}
                message={lockTarget?.isLocked
                    ? `Are you sure you want to UNLOCK enrollment for Semester ${lockTarget?.semesterNo}? Admissions will be open again.`
                    : `Are you sure you want to LOCK enrollment for Semester ${lockTarget?.semesterNo}? No new students can be added.`}
                isDangerous={!lockTarget?.isLocked} // Red warning when locking
                confirmText={lockTarget?.isLocked ? "Unlock" : "Lock"}
            />

            <ConfirmModal
                isOpen={isPromoteModalOpen}
                onClose={() => setIsPromoteModalOpen(false)}
                onConfirm={confirmPromote}
                title="Promote Semester"
                message={`Are you sure you want to promote Semester ${promoteTarget?.semesterNo} to Semester ${Number(promoteTarget?.semesterNo) + 1}?`}
                isDangerous={false}
                confirmText="Promote"
            />

            <SimpleModal isOpen={isModalOpen} onClose={handleCloseModal} title={editingId ? "Edit Semester" : "Add Semester"}>
                <form onSubmit={handleCreateOrUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>Course</label>
                        <select
                            value={formData.courseId}
                            onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                            required
                            style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#374151', border: '1px solid #4b5563', color: 'white', outline: 'none' }}
                        >
                            <option value="">Select Course...</option>
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>Semester Number</label>
                        <input
                            type="number"
                            value={formData.semesterNo}
                            readOnly={true} // Always read-only (Auto-set to 1 or fixed)
                            // Remove onChange or keep as no-op since it's read-only? 
                            // Keeping onChange to prevent React warning if value matches state but field is readOnly without handler (rare but safe)
                            onChange={(e) => { }}
                            style={{
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                background: '#374151', // Always dark/disabled look
                                border: '1px solid #4b5563',
                                color: '#9ca3af', // Dimmed text
                                outline: 'none',
                                cursor: 'not-allowed'
                            }}
                        />
                        {!editingId && <span style={{ fontSize: '0.75rem', color: '#10b981' }}>New batches always start at Semester 1.</span>}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>Number of Students</label>
                        <input
                            type="number"
                            min="0"
                            value={formData.studentCount}
                            onChange={(e) => setFormData({ ...formData, studentCount: e.target.value })}
                            placeholder="e.g. 60"
                            style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#374151', border: '1px solid #4b5563', color: 'white', outline: 'none' }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>Class Teacher</label>
                        <select
                            value={formData.classTeacherId}
                            onChange={(e) => setFormData({ ...formData, classTeacherId: e.target.value })}
                            style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#374151', border: '1px solid #4b5563', color: 'white', outline: 'none' }}
                        >
                            <option value="">Select Class Teacher...</option>
                            {faculty.map(f => {
                                const isAssigned = assignedTeacherIds.has(f.id);
                                return (
                                    <option
                                        key={f.id}
                                        value={f.id}
                                        disabled={isAssigned}
                                        style={{ color: isAssigned ? '#9ca3af' : 'inherit' }}
                                    >
                                        {f.displayName} ({f.department}) {isAssigned ? '(Already Assigned)' : ''}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <button type="submit" style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#14b8a6', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                        {editingId ? "Update Semester" : "Create Semester"}
                    </button>
                </form>
            </SimpleModal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default Semesters;
