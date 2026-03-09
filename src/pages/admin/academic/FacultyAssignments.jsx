import React, { useState, useEffect } from 'react';
import DataTable from '../../../components/admin/DataTable';
import SimpleModal from '../../../components/admin/academic/SimpleModal';
import { getFacultyAssignments, assignFacultyToCourse, getCourses, updateFacultyAssignment, deleteFacultyAssignment, getDepartments, getPrograms, getSemesters } from '../../../services/academicService';
import { fetchAllUsers } from '../../../services/adminService';
import Toast from '../../../components/common/Toast';
import { Edit2, Trash2, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import ConfirmModal from '../../../components/common/ConfirmModal';

const FacultyAssignments = () => {
    const [assignments, setAssignments] = useState([]);
    const [courses, setCourses] = useState([]);
    const [faculty, setFaculty] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState({ facultyId: '', courseId: '', academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1).toString().slice(-2) });

    // Confirm Delete State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    const [toast, setToast] = useState(null);

    // Filtering State
    const [filters, setFilters] = useState({
        facultyId: '',
        courseId: '',
        academicYear: '',
        departmentId: '',
        programId: '',
        semesterId: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [assignmentsData, coursesData, usersData, deptsData, progsData, semsData] = await Promise.all([
                getFacultyAssignments(),
                getCourses(),
                fetchAllUsers(),
                getDepartments(),
                getPrograms(),
                getSemesters()
            ]);
            setAssignments(assignmentsData);
            setCourses(coursesData);
            setFaculty(usersData.filter(u => u.role === 'Faculty' || u.role === 'faculty'));
            setDepartments(deptsData);
            setPrograms(progsData);
            setSemesters(semsData);
        } catch (error) {
            console.error(error);
            setToast({ message: "Failed to load data", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const filteredAssignments = assignments.filter(assignment => {
        const course = courses.find(c => c.id === assignment.courseId);
        const semester = semesters.find(s => s.id === course?.semesterId);
        const program = programs.find(p => p.id === semester?.courseId || p.id === semester?.programId);

        const matchFaculty = !filters.facultyId || assignment.facultyId === filters.facultyId;
        const matchCourse = !filters.courseId || assignment.courseId === filters.courseId;
        const matchYear = !filters.academicYear || assignment.academicYear === filters.academicYear;
        const matchDept = !filters.departmentId || program?.departmentId === filters.departmentId;
        const matchProg = !filters.programId || program?.id === filters.programId;
        const matchSem = !filters.semesterId || semester?.id === filters.semesterId;

        return matchFaculty && matchCourse && matchYear && matchDept && matchProg && matchSem;
    });

    useEffect(() => {
        fetchData();
    }, []);

    const resetForm = () => {
        setFormData({ facultyId: '', courseId: '', academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1).toString().slice(-2) });
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
            courseId: assignment.courseId,
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
                await assignFacultyToCourse(formData.facultyId, formData.courseId, formData.academicYear);
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

    const getCourseName = (id) => {
        const s = courses.find(x => x.id === id);
        return s ? `${s.name} (${s.code})` : 'Unknown Course';
    };

    const columns = [
        { key: 'facultyId', label: 'Faculty', render: (val) => <span style={{ color: 'white', fontWeight: 500 }}>{getFacultyName(val)}</span> },
        { key: 'courseId', label: 'Course', render: (val) => <span style={{ color: '#d1d5db' }}>{getCourseName(val)}</span> },
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
                <p style={{ color: '#9ca3af', margin: 0 }}>Assign courses to faculty for specific academic years.</p>
            </div>

            <div style={{
                background: '#1f2937', padding: '1.5rem', borderRadius: '1rem',
                border: '1px solid rgba(255, 255, 255, 0.05)', marginBottom: '2rem'
            }}>
                <div
                    onClick={() => setShowFilters(!showFilters)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: showFilters ? '1.5rem' : 0 }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'white' }}>
                        <Filter size={20} className="text-teal-400" />
                        <span style={{ fontWeight: 600 }}>Assignment Filters</span>
                        {(filters.facultyId || filters.courseId || filters.academicYear || filters.departmentId || filters.programId || filters.semesterId) && (
                            <span style={{ background: '#14b8a6', color: 'white', fontSize: '0.7rem', padding: '0.1rem 0.6rem', borderRadius: '999px' }}>Active</span>
                        )}
                    </div>
                    {showFilters ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                </div>

                {showFilters && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Department</label>
                            <select
                                value={filters.departmentId}
                                onChange={(e) => setFilters({ ...filters, departmentId: e.target.value, programId: '', semesterId: '' })}
                                style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#374151', border: '1px solid #4b5563', color: 'white', outline: 'none' }}
                            >
                                <option value="">All Departments</option>
                                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Program</label>
                            <select
                                value={filters.programId}
                                onChange={(e) => setFilters({ ...filters, programId: e.target.value, semesterId: '' })}
                                style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#374151', border: '1px solid #4b5563', color: 'white', outline: 'none' }}
                                disabled={!filters.departmentId}
                            >
                                <option value="">All Programs</option>
                                {programs.filter(p => p.departmentId === filters.departmentId).map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Semester</label>
                            <select
                                value={filters.semesterId}
                                onChange={(e) => setFilters({ ...filters, semesterId: e.target.value })}
                                style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#374151', border: '1px solid #4b5563', color: 'white', outline: 'none' }}
                                disabled={!filters.programId}
                            >
                                <option value="">All Semesters</option>
                                {semesters.filter(s => (s.courseId === filters.programId || s.programId === filters.programId)).sort((a, b) => a.semesterNo - b.semesterNo).map(s => (
                                    <option key={s.id} value={s.id}>Semester {s.semesterNo}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Faculty</label>
                            <select
                                value={filters.facultyId}
                                onChange={(e) => setFilters({ ...filters, facultyId: e.target.value })}
                                style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#374151', border: '1px solid #4b5563', color: 'white', outline: 'none' }}
                            >
                                <option value="">All Faculty</option>
                                {faculty.map(f => <option key={f.id} value={f.id}>{f.displayName}</option>)}
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Academic Year</label>
                            <select
                                value={filters.academicYear}
                                onChange={(e) => setFilters({ ...filters, academicYear: e.target.value })}
                                style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#374151', border: '1px solid #4b5563', color: 'white', outline: 'none' }}
                            >
                                <option value="">All Years</option>
                                {[...new Set(assignments.map(a => a.academicYear))].sort().map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <button
                                onClick={() => setFilters({ facultyId: '', courseId: '', academicYear: '', departmentId: '', programId: '', semesterId: '' })}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'transparent', border: '1px solid #4b5563', color: '#9ca3af', cursor: 'pointer' }}
                            >
                                Clear All Filters
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <DataTable
                title="Assignment List"
                columns={columns}
                data={filteredAssignments}
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

                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ color: '#9ca3af', fontSize: '0.75rem', fontWeight: 600 }}>Department</label>
                                <select
                                    value={formData.departmentId}
                                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value, programId: '', semesterId: '', courseId: '' })}
                                    required
                                    style={{ padding: '0.6rem', borderRadius: '0.4rem', background: '#1f2937', border: '1px solid #374151', color: 'white', fontSize: '0.85rem' }}
                                >
                                    <option value="">Select Dept...</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ color: '#9ca3af', fontSize: '0.75rem', fontWeight: 600 }}>Program</label>
                                <select
                                    value={formData.programId}
                                    onChange={(e) => setFormData({ ...formData, programId: e.target.value, semesterId: '', courseId: '' })}
                                    required
                                    disabled={!formData.departmentId}
                                    style={{ padding: '0.6rem', borderRadius: '0.4rem', background: '#1f2937', border: '1px solid #374151', color: 'white', fontSize: '0.85rem', opacity: formData.departmentId ? 1 : 0.5 }}
                                >
                                    <option value="">Select Program...</option>
                                    {programs.filter(p => p.departmentId === formData.departmentId).map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ color: '#9ca3af', fontSize: '0.75rem', fontWeight: 600 }}>Semester</label>
                            <select
                                value={formData.semesterId}
                                onChange={(e) => setFormData({ ...formData, semesterId: e.target.value, courseId: '' })}
                                required
                                disabled={!formData.programId}
                                style={{ padding: '0.6rem', borderRadius: '0.4rem', background: '#1f2937', border: '1px solid #374151', color: 'white', fontSize: '0.85rem', opacity: formData.programId ? 1 : 0.5 }}
                            >
                                <option value="">Select Semester...</option>
                                {semesters.filter(s => (s.courseId === formData.programId || s.programId === formData.programId)).sort((a, b) => a.semesterNo - b.semesterNo).map(s => (
                                    <option key={s.id} value={s.id}>Semester {s.semesterNo}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>Course (Subject)</label>
                        <select
                            value={formData.courseId}
                            onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                            required
                            disabled={!formData.semesterId}
                            style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#374151', border: '1px solid #4b5563', color: 'white', outline: 'none', opacity: formData.semesterId ? 1 : 0.5 }}
                        >
                            <option value="">Select Course...</option>
                            {courses.filter(c => c.semesterId === formData.semesterId).map(s => {
                                // Check if this course is already assigned for the selected academic year
                                // Exclude the current assignment if we are in edit mode
                                const isAssigned = assignments.some(a =>
                                    a.courseId === s.id &&
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
