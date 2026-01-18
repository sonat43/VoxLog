import React, { useState, useEffect } from 'react';
import DataTable from '../../../components/admin/DataTable';
import SimpleModal from '../../../components/admin/academic/SimpleModal';
import { Trash2, Edit } from 'lucide-react';
import { getCourses, addCourse, deleteCourse, getDepartments, updateCourse } from '../../../services/academicService';
import Toast from '../../../components/common/Toast';
import ConfirmModal from '../../../components/common/ConfirmModal';

const Courses = () => {
    const [courses, setCourses] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({ name: '', departmentId: '', duration: 3 });
    const [editingId, setEditingId] = useState(null);

    const [toast, setToast] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [coursesData, departmentsData] = await Promise.all([
                getCourses(),
                getDepartments()
            ]);
            setCourses(coursesData);
            setDepartments(departmentsData);
        } catch (error) {
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
                await updateCourse(editingId, {
                    name: formData.name,
                    departmentId: formData.departmentId,
                    duration: formData.duration
                });
                setToast({ message: "Course updated successfully", type: "success" });
            } else {
                await addCourse(formData.name, formData.departmentId, formData.duration);
                setToast({ message: "Course added successfully", type: "success" });
            }
            handleCloseModal();
            fetchData();
        } catch (error) {
            setToast({ message: error.message, type: "error" });
        }
    };

    const startEdit = (course) => {
        setFormData({
            name: course.name,
            departmentId: course.departmentId,
            duration: course.duration
        });
        setEditingId(course.id);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData({ name: '', departmentId: '', duration: 3 });
        setEditingId(null);
    };

    const handleDelete = (course) => {
        setConfirmModal({
            isOpen: true,
            title: "Delete Course",
            message: `Are you sure you want to delete ${course.name}?`,
            isDangerous: true,
            confirmText: "Delete",
            onConfirm: async () => {
                try {
                    await deleteCourse(course.id);
                    setToast({ message: "Course deleted successfully", type: "success" });
                    setConfirmModal({ isOpen: false });
                    fetchData();
                } catch (error) {
                    setToast({ message: error.message, type: "error" });
                    setConfirmModal({ isOpen: false });
                }
            }
        });
    };

    const getDeptName = (deptId) => {
        const dept = departments.find(d => d.id === deptId);
        return dept ? dept.name : 'Unknown Department';
    };

    const columns = [
        { key: 'name', label: 'Course Name', render: (val) => <span style={{ color: 'white', fontWeight: 500 }}>{val}</span> },
        { key: 'departmentId', label: 'Department', render: (val) => <span style={{ color: '#d1d5db' }}>{getDeptName(val)}</span> },
        { key: 'duration', label: 'Duration (Years)', render: (val) => <span style={{ color: '#9ca3af' }}>{val} Years</span> }
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
                title="Edit"
            >
                <Edit size={16} />
            </button>
            <button
                onClick={() => handleDelete(row)}
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
                title="Delete"
            >
                <Trash2 size={16} />
            </button>
        </div>
    );

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: 'white' }}>Courses</h1>
                <p style={{ color: '#9ca3af', margin: 0 }}>Manage academic courses.</p>
            </div>

            <DataTable
                title="Course List"
                columns={columns}
                data={courses}
                onAdd={() => {
                    setEditingId(null);
                    setFormData({ name: '', departmentId: '', duration: 3 });
                    setIsModalOpen(true);
                }}
                renderActions={renderActions}
            />

            <SimpleModal isOpen={isModalOpen} onClose={handleCloseModal} title={editingId ? "Edit Course" : "Add Course"}>
                <form onSubmit={handleCreateOrUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>Course Name</label>
                        <input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            placeholder="e.g. B.Tech Computer Science"
                            style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#374151', border: '1px solid #4b5563', color: 'white', outline: 'none' }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>Department</label>
                        <select
                            value={formData.departmentId}
                            onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                            required
                            style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#374151', border: '1px solid #4b5563', color: 'white', outline: 'none' }}
                        >
                            <option value="">Select Department...</option>
                            {departments.filter(d => d.status === 'active').map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>Duration (Years)</label>
                        <input
                            type="number"
                            min="1"
                            max="6"
                            value={formData.duration}
                            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                            required
                            style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#374151', border: '1px solid #4b5563', color: 'white', outline: 'none' }}
                        />
                    </div>

                    <button type="submit" style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#14b8a6', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                        {editingId ? "Update Course" : "Create Course"}
                    </button>
                </form>
            </SimpleModal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                isDangerous={confirmModal.isDangerous}
                confirmText={confirmModal.confirmText}
            />
        </div>
    );
};

export default Courses;
