import React, { useState, useEffect } from 'react';
import DataTable from '../../../components/admin/DataTable';
import SimpleModal from '../../../components/admin/academic/SimpleModal';
import { getFacultyAssignments, assignFacultyToSubject, getSubjects, updateFacultyAssignment, deleteFacultyAssignment } from '../../../services/academicService';
import { fetchAllUsers } from '../../../services/adminService';
import Toast from '../../../components/common/Toast';
import { Edit2, Trash2 } from 'lucide-react';
import ConfirmModal from '../../../components/common/ConfirmModal';

const FacultyAssignments = () => {
    const [assignments, setAssignments] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [faculty, setFaculty] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState({ facultyId: '', subjectId: '', academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1).toString().slice(-2) });

    // Confirm Delete State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    const [toast, setToast] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [assignmentsData, subjectsData, usersData] = await Promise.all([
                getFacultyAssignments(),
                getSubjects(),
                fetchAllUsers()
            ]);
            setAssignments(assignmentsData);
            setSubjects(subjectsData);
            setFaculty(usersData.filter(u => u.role === 'Faculty' || u.role === 'faculty')); // Handle mixed case just in case
        } catch (error) {
            console.error(error);
            setToast({ message: "Failed to load data", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const resetForm = () => {
        setFormData({ facultyId: '', subjectId: '', academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1).toString().slice(-2) });
        setIsEditMode(false);
        setEditId(null);
    };

    const handleOpenCreate = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const handleEdit = (assignment) => {
        setFormData({
            facultyId: assignment.facultyId,
            subjectId: assignment.subjectId,
            academicYear: assignment.academicYear
        });
        setEditId(assignment.id);
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (id) => {
        setDeleteId(id);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        try {
            await deleteFacultyAssignment(deleteId);
            setToast({ message: "Assignment deleted successfully", type: "success" });
            setIsDeleteModalOpen(false);
            setDeleteId(null);
            fetchData();
        } catch (error) {
            setToast({ message: "Failed to delete assignment", type: "error" });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditMode) {
                await updateFacultyAssignment(editId, formData);
                setToast({ message: "Assignment updated successfully", type: "success" });
            } else {
                await assignFacultyToSubject(formData.facultyId, formData.subjectId, formData.academicYear);
                setToast({ message: "Assignment created successfully", type: "success" });
            }
            setIsModalOpen(false);
            resetForm();
            fetchData();
        } catch (error) {
            setToast({ message: error.message, type: "error" });
        }
    };

    const getFacultyName = (id) => {
        const f = faculty.find(x => x.id === id);
        return f ? f.displayName : 'Unknown Faculty';
    };

    const getSubjectName = (id) => {
        const s = subjects.find(x => x.id === id);
        return s ? `${s.name} (${s.code})` : 'Unknown Subject';
    };

    const columns = [
        { key: 'facultyId', label: 'Faculty', render: (val) => <span style={{ color: 'white', fontWeight: 500 }}>{getFacultyName(val)}</span> },
        { key: 'subjectId', label: 'Subject', render: (val) => <span style={{ color: '#d1d5db' }}>{getSubjectName(val)}</span> },
        { key: 'academicYear', label: 'Academic Year', render: (val) => <span style={{ color: '#14b8a6', fontFamily: 'monospace' }}>{val}</span> },
        {
            key: 'actions',
            label: 'Actions',
            render: (_, row) => (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => handleEdit(row)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#60a5fa' }}
                        title="Edit"
                    >
                        <Edit2 size={18} />
                    </button>
                    <button
                        onClick={() => handleDeleteClick(row.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171' }}
                        title="Delete"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: 'white' }}>Faculty Assignments</h1>
                <p style={{ color: '#9ca3af', margin: 0 }}>Assign subjects to faculty for specific academic years.</p>
            </div>

            <DataTable
                title="Assignment List"
                columns={columns}
                data={assignments}
                onAdd={handleOpenCreate}
            />

            <SimpleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditMode ? "Edit Assignment" : "Assign Faculty"}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>Academic Year</label>
                        <select
                            value={formData.academicYear}
                            onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                            required
                            style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#374151', border: '1px solid #4b5563', color: 'white', outline: 'none' }}
                        >
                            <option value="">Select Year...</option>
                            {[...Array(5)].map((_, i) => {
                                const year = new Date().getFullYear() - 1 + i; // Start from last year
                                const acadYear = `${year}-${(year + 1).toString().slice(-2)}`;
                                return (
                                    <option key={acadYear} value={acadYear}>
                                        {acadYear}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>Faculty Member</label>
                        <select
                            value={formData.facultyId}
                            onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
                            required
                            style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#374151', border: '1px solid #4b5563', color: 'white', outline: 'none' }}
                        >
                            <option value="">Select Faculty...</option>
                            {faculty.map(f => (
                                <option key={f.id} value={f.id}>{f.displayName} ({f.department})</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>Subject</label>
                        <select
                            value={formData.subjectId}
                            onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                            required
                            style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#374151', border: '1px solid #4b5563', color: 'white', outline: 'none' }}
                        >
                            <option value="">Select Subject...</option>
                            {subjects.map(s => {
                                // Check if this subject is already assigned for the selected academic year
                                // Exclude the current assignment if we are in edit mode
                                const isAssigned = assignments.some(a =>
                                    a.subjectId === s.id &&
                                    a.academicYear === formData.academicYear &&
                                    (!isEditMode || a.id !== editId)
                                );

                                return (
                                    <option
                                        key={s.id}
                                        value={s.id}
                                        disabled={isAssigned}
                                        style={{ color: isAssigned ? '#9ca3af' : 'white' }}
                                    >
                                        {s.code} - {s.name} {isAssigned ? '(Assigned)' : ''}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <button type="submit" style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#14b8a6', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                        {isEditMode ? "Update Assignment" : "Assign Faculty"}
                    </button>
                </form>
            </SimpleModal>

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Delete Assignment"
                message="Are you sure you want to remove this faculty assignment? This action cannot be undone."
            />

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default FacultyAssignments;
