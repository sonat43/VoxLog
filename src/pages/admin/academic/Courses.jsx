import React, { useState, useEffect } from 'react';
import DataTable from '../../../components/admin/DataTable';
import SimpleModal from '../../../components/admin/academic/SimpleModal';
import { getCourses, addCourse, getPrograms, getSemesters, updateCourse, deleteCourse } from '../../../services/academicService';
import Toast from '../../../components/common/Toast';
import ConfirmModal from '../../../components/common/ConfirmModal';
import SyllabusModal from '../../../components/admin/academic/SyllabusModal';
import { BookOpen, Edit, Trash2 } from 'lucide-react';

const Courses = () => {
    const [courses, setCourses] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isSyllabusModalOpen, setIsSyllabusModalOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);

    const [formData, setFormData] = useState({ code: '', name: '', credits: 3, programId: '', semesterId: '' });
    const [editingId, setEditingId] = useState(null);
    const [toast, setToast] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [coursesData, programsData, semestersData] = await Promise.all([
                getCourses(),
                getPrograms(),
                getSemesters()
            ]);

            setCourses(coursesData);
            setPrograms(programsData);
            setSemesters(semestersData);
        } catch (error) {
            console.error("Courses Fetch Error:", error);
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
                    code: formData.code,
                    name: formData.name,
                    credits: formData.credits,
                    semesterId: formData.semesterId,
                    programId: formData.programId
                });
                setToast({ message: "Course updated successfully", type: "success" });
            } else {
                await addCourse(formData.code, formData.name, formData.credits, formData.semesterId, formData.programId);
                setToast({ message: "Course added successfully", type: "success" });
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
            programId: sub.programId,
            semesterId: sub.semesterId
        });
        setEditingId(sub.id);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData({ code: '', name: '', credits: 3, programId: '', semesterId: '' });
        setEditingId(null);
    };

    const confirmDelete = (course) => {
        setSelectedCourse(course);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedCourse) return;
        try {
            await deleteCourse(selectedCourse.id);
            setToast({ message: "Course deleted successfully", type: "success" });
            setIsDeleteModalOpen(false);
            fetchData();
        } catch (error) {
            setToast({ message: error.message || "Failed to delete", type: "error" });
            setIsDeleteModalOpen(false);
        }
    };

    const getProgramName = (programId, row) => {
        let pId = programId;
        // Fallback: If course doesn't have programId, get it from its semester
        if (!pId && row && row.semesterId) {
            const sem = semesters.find(s => String(s.id) === String(row.semesterId));
            if (sem) pId = sem.programId;
        }
        const c = programs.find(x => String(x.id) === String(pId));
        return c ? c.name : 'Unknown';
    };

    const getSemesterName = (semId) => {
        const s = semesters.find(x => x.id === semId);
        return s ? `Sem ${s.semesterNo}` : 'Unknown';
    };

    const columns = [
        { key: 'code', label: 'Course Code', render: (val) => <span style={{ fontFamily: 'monospace', color: '#14b8a6' }}>{val}</span> },
        { key: 'name', label: 'Course Name', render: (val) => <span style={{ color: 'white', fontWeight: 500 }}>{val}</span> },
        { key: 'programId', label: 'Program', render: (val, row) => <span style={{ color: '#d1d5db' }}>{getProgramName(val, row)}</span> },
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
                title="Edit Course"
            >
                <Edit size={16} />
            </button>
            <button
                onClick={() => {
                    setSelectedCourse(row);
                    setIsSyllabusModalOpen(true);
                }}
                style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '0.375rem',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    color: '#3b82f6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
                title="Manage Syllabus"
            >
                <BookOpen size={16} />
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
                title="Delete Course"
            >
                <Trash2 size={16} />
            </button>
        </div>
    );

    // Filter semesters based on selected program
    const availableSemesters = semesters
        .filter(s => String(s.programId) === String(formData.programId)) // Ensure string comparison
        .sort((a, b) => a.semesterNo - b.semesterNo);

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: 'white' }}>Courses</h1>
                <p style={{ color: '#9ca3af', margin: 0 }}>Manage courses for each semester.</p>
            </div>

            <DataTable
                title="Course List"
                columns={columns}
                data={courses}
                onAdd={() => {
                    setEditingId(null);
                    setFormData({ code: '', name: '', credits: 3, programId: '', semesterId: '' });
                    setIsModalOpen(true);
                }}
                renderActions={renderActions}
            />

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Delete Course"
                message={`Are you sure you want to delete ${selectedCourse?.name}?`}
                isDangerous={true}
                confirmText="Delete"
            />

            <SyllabusModal
                isOpen={isSyllabusModalOpen}
                onClose={() => setIsSyllabusModalOpen(false)}
                course={selectedCourse}
            />

            <SimpleModal isOpen={isModalOpen} onClose={handleCloseModal} title={editingId ? "Edit Course" : "Add Course"}>
                <form onSubmit={handleCreateOrUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>Program</label>
                        <select
                            value={formData.programId}
                            onChange={(e) => setFormData({ ...formData, programId: e.target.value, semesterId: '' })}
                            required
                            style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#374151', border: '1px solid #4b5563', color: 'white', outline: 'none' }}
                        >
                            <option value="">Select Program...</option>
                            {programs.length === 0 && <option disabled>No programs found</option>}
                            {programs.map(c => (
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
                            disabled={!formData.programId}
                            style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#374151', border: '1px solid #4b5563', color: 'white', outline: 'none', opacity: !formData.programId ? 0.5 : 1 }}
                        >
                            <option value="">Select Semester...</option>
                            {formData.programId && availableSemesters.length === 0 && <option disabled>No semesters found for this program</option>}
                            {availableSemesters.map(s => (
                                <option key={s.id} value={s.id}>Semester {s.semesterNo}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                            <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>Course Code</label>
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
                        <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>Course Name</label>
                        <input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            placeholder="e.g. Introduction to Programming"
                            style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#374151', border: '1px solid #4b5563', color: 'white', outline: 'none' }}
                        />
                    </div>

                    <button type="submit" style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#14b8a6', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                        {editingId ? "Update Course" : "Create Course"}
                    </button>
                </form>
            </SimpleModal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};
export default Courses;
