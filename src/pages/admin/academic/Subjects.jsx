import React, { useState, useEffect } from 'react';
import DataTable from '../../../components/admin/DataTable';
import SimpleModal from '../../../components/admin/academic/SimpleModal';
import { getSubjects, addSubject, getCourses, getSemesters, updateSubject, deleteSubject } from '../../../services/academicService';
import Toast from '../../../components/common/Toast';
import { Edit, Trash2 } from 'lucide-react';
import ConfirmModal from '../../../components/common/ConfirmModal';

const Subjects = () => {
    const [subjects, setSubjects] = useState([]);
    const [courses, setCourses] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState(null);

    const [formData, setFormData] = useState({ code: '', name: '', credits: 3, courseId: '', semesterId: '' });
    const [editingId, setEditingId] = useState(null);
    const [toast, setToast] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [subjectsData, coursesData, semestersData] = await Promise.all([
                getSubjects(),
                getCourses(),
                getSemesters()
            ]);

            setSubjects(subjectsData);
            setCourses(coursesData);
            setSemesters(semestersData);
        } catch (error) {
            console.error("Subjects Fetch Error:", error);
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
                await updateSubject(editingId, {
                    code: formData.code,
                    name: formData.name,
                    credits: formData.credits,
                    semesterId: formData.semesterId,
                    courseId: formData.courseId
                });
                setToast({ message: "Subject updated successfully", type: "success" });
            } else {
                await addSubject(formData.code, formData.name, formData.credits, formData.semesterId, formData.courseId);
                setToast({ message: "Subject added successfully", type: "success" });
            }
            handleCloseModal();
            fetchData();
        } catch (error) {
            setToast({ message: error.message, type: "error" });
        }
    };

    const startEdit = (sub) => {
        setFormData({
            code: sub.code,
            name: sub.name,
            credits: sub.credits,
            courseId: sub.courseId,
            semesterId: sub.semesterId
        });
        setEditingId(sub.id);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData({ code: '', name: '', credits: 3, courseId: '', semesterId: '' });
        setEditingId(null);
    };

    const confirmDelete = (subject) => {
        setSelectedSubject(subject);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedSubject) return;
        try {
            await deleteSubject(selectedSubject.id);
            setToast({ message: "Subject deleted successfully", type: "success" });
            setIsDeleteModalOpen(false);
            fetchData();
        } catch (error) {
            setToast({ message: error.message || "Failed to delete", type: "error" });
            setIsDeleteModalOpen(false);
        }
    };

    const getCourseName = (courseId) => {
        const c = courses.find(x => x.id === courseId);
        return c ? c.name : 'Unknown';
    };

    const getSemesterName = (semId) => {
        const s = semesters.find(x => x.id === semId);
        return s ? `Sem ${s.semesterNo}` : 'Unknown';
    };

    const columns = [
        { key: 'code', label: 'Subject Code', render: (val) => <span style={{ fontFamily: 'monospace', color: '#14b8a6' }}>{val}</span> },
        { key: 'name', label: 'Subject Name', render: (val) => <span style={{ color: 'white', fontWeight: 500 }}>{val}</span> },
        { key: 'courseId', label: 'Course', render: (val) => <span style={{ color: '#d1d5db' }}>{getCourseName(val)}</span> },
        { key: 'semesterId', label: 'Semester', render: (val) => <span style={{ color: '#9ca3af' }}>{getSemesterName(val)}</span> },
        { key: 'credits', label: 'Credits', render: (val) => <span style={{ color: '#9ca3af' }}>{val}</span> }
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
                title="Edit Subject"
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
                title="Delete Subject"
            >
                <Trash2 size={16} />
            </button>
        </div>
    );

    // Filter semesters based on selected course
    const availableSemesters = semesters
        .filter(s => String(s.courseId) === String(formData.courseId)) // Ensure string comparison
        .sort((a, b) => a.semesterNo - b.semesterNo);

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: 'white' }}>Subjects</h1>
                <p style={{ color: '#9ca3af', margin: 0 }}>Manage subjects for each semester.</p>
            </div>

            <DataTable
                title="Subject List"
                columns={columns}
                data={subjects}
                onAdd={() => {
                    setEditingId(null);
                    setFormData({ code: '', name: '', credits: 3, courseId: '', semesterId: '' });
                    setIsModalOpen(true);
                }}
                renderActions={renderActions}
            />

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Delete Subject"
                message={`Are you sure you want to delete ${selectedSubject?.name}?`}
                isDangerous={true}
                confirmText="Delete"
            />

            <SimpleModal isOpen={isModalOpen} onClose={handleCloseModal} title={editingId ? "Edit Subject" : "Add Subject"}>
                <form onSubmit={handleCreateOrUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>Course</label>
                        <select
                            value={formData.courseId}
                            onChange={(e) => setFormData({ ...formData, courseId: e.target.value, semesterId: '' })}
                            required
                            style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#374151', border: '1px solid #4b5563', color: 'white', outline: 'none' }}
                        >
                            <option value="">Select Course...</option>
                            {courses.length === 0 && <option disabled>No courses found</option>}
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>Semester</label>
                        <select
                            value={formData.semesterId}
                            onChange={(e) => setFormData({ ...formData, semesterId: e.target.value })}
                            required
                            disabled={!formData.courseId}
                            style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#374151', border: '1px solid #4b5563', color: 'white', outline: 'none', opacity: !formData.courseId ? 0.5 : 1 }}
                        >
                            <option value="">Select Semester...</option>
                            {formData.courseId && availableSemesters.length === 0 && <option disabled>No semesters found for this course</option>}
                            {availableSemesters.map(s => (
                                <option key={s.id} value={s.id}>Semester {s.semesterNo}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                            <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>Subject Code</label>
                            <input
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                required
                                placeholder="e.g. CS101"
                                style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#374151', border: '1px solid #4b5563', color: 'white', outline: 'none' }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100px' }}>
                            <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>Credits</label>
                            <input
                                type="number"
                                min="0"
                                max="10"
                                value={formData.credits}
                                onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                                required
                                style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#374151', border: '1px solid #4b5563', color: 'white', outline: 'none' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>Subject Name</label>
                        <input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            placeholder="e.g. Introduction to Programming"
                            style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#374151', border: '1px solid #4b5563', color: 'white', outline: 'none' }}
                        />
                    </div>

                    <button type="submit" style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#14b8a6', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                        {editingId ? "Update Subject" : "Create Subject"}
                    </button>
                </form>
            </SimpleModal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};
export default Subjects;
