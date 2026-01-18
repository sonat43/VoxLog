import React, { useState, useEffect } from 'react';
import DataTable from '../../../components/admin/DataTable';
import SimpleModal from '../../../components/admin/academic/SimpleModal';
import { getSemesters, addSemester, getCourses, deleteSemester, updateSemester } from '../../../services/academicService';
import { fetchAllUsers } from '../../../services/adminService';
import Toast from '../../../components/common/Toast';
import ConfirmModal from '../../../components/common/ConfirmModal';
import { Trash, Edit } from 'lucide-react';

const Semesters = () => {
    const [semesters, setSemesters] = useState([]);
    const [courses, setCourses] = useState([]);
    const [faculty, setFaculty] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedSemester, setSelectedSemester] = useState(null);
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({ courseId: '', semesterNo: '', studentCount: '', classTeacherId: '' });
    const [toast, setToast] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [semestersData, coursesData, usersData] = await Promise.all([
                getSemesters(),
                getCourses(),
                fetchAllUsers()
            ]);
            setSemesters(semestersData);
            setCourses(coursesData);
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

    const columns = [
        { key: 'semesterNo', label: 'Semester No', render: (val) => <span style={{ color: 'white', fontWeight: 600 }}>Semester {val}</span> },
        { key: 'courseId', label: 'Course', render: (val) => <span style={{ color: '#d1d5db' }}>{getCourseName(val)}</span> },
        { key: 'studentCount', label: 'Students', render: (val) => <span style={{ color: '#9ca3af' }}>{val || 0}</span> },
        { key: 'classTeacherId', label: 'Class Teacher', render: (val) => <span style={{ color: '#d1d5db' }}>{getTeacherName(val)}</span> }
    ];

    const renderActions = (row) => (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
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

            <DataTable
                title="Semester List"
                columns={columns}
                data={semesters}
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
                            min="1"
                            max="12"
                            value={formData.semesterNo}
                            onChange={(e) => setFormData({ ...formData, semesterNo: e.target.value })}
                            required
                            placeholder="e.g. 1"
                            style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#374151', border: '1px solid #4b5563', color: 'white', outline: 'none' }}
                        />
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
                            {faculty.map(f => (
                                <option key={f.id} value={f.id}>{f.displayName} ({f.department})</option>
                            ))}
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
