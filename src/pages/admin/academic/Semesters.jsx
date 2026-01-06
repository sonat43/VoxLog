import React, { useState, useEffect } from 'react';
import DataTable from '../../../components/admin/DataTable';
import SimpleModal from '../../../components/admin/academic/SimpleModal';
import { getSemesters, addSemester, getCourses, deleteSemester } from '../../../services/academicService';
import Toast from '../../../components/common/Toast';
import ConfirmModal from '../../../components/common/ConfirmModal';
import { Trash } from 'lucide-react';

const Semesters = () => {
    const [semesters, setSemesters] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedSemester, setSelectedSemester] = useState(null);

    const [formData, setFormData] = useState({ courseId: '', semesterNo: '' });
    const [toast, setToast] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [semestersData, coursesData] = await Promise.all([
                getSemesters(),
                getCourses()
            ]);
            setSemesters(semestersData);
            setCourses(coursesData);
        } catch (error) {
            setToast({ message: "Failed to load data", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await addSemester(formData.courseId, formData.semesterNo);
            setToast({ message: "Semester added successfully", type: "success" });
            setIsModalOpen(false);
            setFormData({ courseId: '', semesterNo: '' });
            fetchData();
        } catch (error) {
            setToast({ message: error.message, type: "error" });
        }
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

    const columns = [
        { key: 'semesterNo', label: 'Semester No', render: (val) => <span style={{ color: 'white', fontWeight: 600 }}>Semester {val}</span> },
        { key: 'courseId', label: 'Course', render: (val) => <span style={{ color: '#d1d5db' }}>{getCourseName(val)}</span> }
    ];

    const renderActions = (row) => (
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
    );

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: 'white' }}>Semesters</h1>
                <p style={{ color: '#9ca3af', margin: 0 }}>Manage semesters for courses.</p>
            </div>

            <DataTable
                title="Semester List"
                columns={columns}
                data={semesters}
                onAdd={() => setIsModalOpen(true)}
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

            <SimpleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Semester">
                <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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

                    <button type="submit" style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#14b8a6', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                        Create Semester
                    </button>
                </form>
            </SimpleModal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default Semesters;
