import React, { useState, useEffect } from 'react';
import DataTable from '../../../components/admin/DataTable';
import SimpleModal from '../../../components/admin/academic/SimpleModal';
import { getFacultyAssignments, assignFacultyToSubject, getSubjects } from '../../../services/academicService';
import { fetchAllUsers } from '../../../services/adminService';
import Toast from '../../../components/common/Toast';

const FacultyAssignments = () => {
    const [assignments, setAssignments] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [faculty, setFaculty] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [formData, setFormData] = useState({ facultyId: '', subjectId: '', academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1).toString().slice(-2) });
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

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await assignFacultyToSubject(formData.facultyId, formData.subjectId, formData.academicYear);
            setToast({ message: "Assignment created successfully", type: "success" });
            setIsModalOpen(false);
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
        { key: 'academicYear', label: 'Academic Year', render: (val) => <span style={{ color: '#14b8a6', fontFamily: 'monospace' }}>{val}</span> }
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
                onAdd={() => setIsModalOpen(true)}
            />

            <SimpleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Assign Faculty">
                <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>Academic Year</label>
                        <input
                            value={formData.academicYear}
                            onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                            required
                            placeholder="e.g. 2025-26"
                            style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#374151', border: '1px solid #4b5563', color: 'white', outline: 'none' }}
                        />
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
                            {subjects.map(s => (
                                <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                            ))}
                        </select>
                    </div>

                    <button type="submit" style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#14b8a6', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                        Assign Faculty
                    </button>
                </form>
            </SimpleModal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default FacultyAssignments;
