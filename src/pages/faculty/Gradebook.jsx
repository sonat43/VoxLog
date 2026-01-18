import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Save, Award, AlertTriangle, Check, X } from 'lucide-react';
import { getMySubjects, createAssessment, getAssessments, saveStudentGrade, getGradesForAssessment } from '../../services/facultyService';
import { fetchAllUsers } from '../../services/adminService'; // To get students
import { useAuth } from '../../context/AuthContext';
import Toast from '../../components/common/Toast';
import SimpleModal from '../../components/admin/academic/SimpleModal';

const Gradebook = () => {
    const { user } = useAuth();
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [assessments, setAssessments] = useState([]);
    const [selectedAssessment, setSelectedAssessment] = useState(null);
    const [students, setStudents] = useState([]); // Mock or fetched
    const [grades, setGrades] = useState({}); // Map: studentId -> mark

    // UI State
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [toast, setToast] = useState(null);
    const [newAssessment, setNewAssessment] = useState({ title: '', type: 'Quiz', maxMarks: 100, weightage: 10 });

    useEffect(() => {
        const init = async () => {
            if (user?.uid) {
                const mySubjects = await getMySubjects(user.uid);
                setSubjects(mySubjects);
                if (mySubjects.length > 0) setSelectedSubject(mySubjects[0]);

                // Fetch mock students for now since we don't have a robust student-subject link yet
                // In prod: await getStudentsBySubject(subjectId)
                const allUsers = await fetchAllUsers();
                setStudents(allUsers.filter(u => u.role === 'Student' || u.role === 'student'));

                setLoading(false);
            }
        };
        init();
    }, [user]);

    useEffect(() => {
        if (selectedSubject) {
            loadAssessments(selectedSubject.id);
        }
    }, [selectedSubject]);

    useEffect(() => {
        if (selectedAssessment) {
            loadGrades(selectedAssessment.id);
        }
    }, [selectedAssessment]);

    const loadAssessments = async (subjectId) => {
        const data = await getAssessments(subjectId);
        setAssessments(data);
        if (data.length > 0) setSelectedAssessment(data[0]);
        else setSelectedAssessment(null);
    };

    const loadGrades = async (assessmentId) => {
        const data = await getGradesForAssessment(assessmentId);
        const gradeMap = {};
        data.forEach(g => gradeMap[g.studentId] = g.marksObtained);
        setGrades(gradeMap);
    };

    const handleCreateAssessment = async (e) => {
        e.preventDefault();
        try {
            await createAssessment({
                ...newAssessment,
                subjectId: selectedSubject.id,
                facultyId: user.uid
            });
            setToast({ message: "Assessment created", type: "success" });
            setIsCreateModalOpen(false);
            loadAssessments(selectedSubject.id);
        } catch (error) {
            setToast({ message: "Error creating assessment", type: "error" });
        }
    };

    const handleGradeChange = (studentId, value) => {
        // Client-side validation
        if (selectedAssessment && Number(value) > selectedAssessment.maxMarks) {
            // Visualize error? For now just clamp or ignore
            return;
        }
        setGrades({ ...grades, [studentId]: value });
    };

    const saveGrade = async (studentId) => {
        const mark = grades[studentId];
        if (mark === undefined || mark === '') return;

        // Validation check
        if (Number(mark) > selectedAssessment.maxMarks) {
            setToast({ message: `Mark cannot exceed ${selectedAssessment.maxMarks}`, type: "error" });
            return;
        }

        try {
            await saveStudentGrade(selectedAssessment.id, studentId, mark, user.uid);
            setToast({ message: "Grade saved", type: "success" });
        } catch (error) {
            setToast({ message: "Error saving grade", type: "error" });
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Award color="#8b5cf6" /> Gradebook
                    </h1>
                    <p style={{ color: '#9ca3af', marginTop: '0.5rem' }}>Manage assessments and enter student marks.</p>
                </div>

                <select
                    value={selectedSubject?.id || ''}
                    onChange={(e) => setSelectedSubject(subjects.find(s => s.id === e.target.value))}
                    style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#1f2937', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem' }}>
                {/* Sidebar: Assessments List */}
                <div style={{ background: '#1f2937', borderRadius: '1rem', padding: '1rem', border: '1px solid rgba(255,255,255,0.05)', height: 'fit-content' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: 'white' }}>Assessments</h3>
                        <button onClick={() => setIsCreateModalOpen(true)} style={{ background: '#8b5cf6', border: 'none', borderRadius: '0.25rem', padding: '0.25rem', cursor: 'pointer' }}>
                            <Plus size={16} color="white" />
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {assessments.length === 0 && <div style={{ color: '#9ca3af', fontSize: '0.8rem', textAlign: 'center' }}>No assessments created.</div>}
                        {assessments.map(a => (
                            <div
                                key={a.id}
                                onClick={() => setSelectedAssessment(a)}
                                style={{
                                    padding: '0.75rem',
                                    borderRadius: '0.5rem',
                                    background: selectedAssessment?.id === a.id ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                                    border: selectedAssessment?.id === a.id ? '1px solid #8b5cf6' : '1px solid transparent',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ color: 'white', fontWeight: 500, fontSize: '0.9rem' }}>{a.title}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                                    <span>{a.type}</span>
                                    <span>Max: {a.maxMarks}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main: Grading Table */}
                <div style={{ background: '#1f2937', borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {selectedAssessment ? (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                                <div>
                                    <h2 style={{ margin: 0, color: 'white', fontSize: '1.25rem' }}>{selectedAssessment.title}</h2>
                                    <div style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                                        Max Marks: {selectedAssessment.maxMarks} • Weightage: {selectedAssessment.weightage}%
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: '#10b981', fontWeight: 'bold' }}>Active</div>
                                        <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>Status</div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                                            <th style={{ padding: '1rem', color: '#9ca3af', fontWeight: 500 }}>Student Name</th>
                                            <th style={{ padding: '1rem', color: '#9ca3af', fontWeight: 500 }}>Email</th>
                                            <th style={{ padding: '1rem', color: '#9ca3af', fontWeight: 500 }}>Marks Obtained</th>
                                            <th style={{ padding: '1rem', color: '#9ca3af', fontWeight: 500 }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.map(student => (
                                            <tr key={student.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ fontWeight: 500 }}>{student.displayName}</div>
                                                </td>
                                                <td style={{ padding: '1rem', color: '#9ca3af', fontSize: '0.9rem' }}>{student.email}</td>
                                                <td style={{ padding: '1rem' }}>
                                                    <input
                                                        type="number"
                                                        value={grades[student.id] || ''}
                                                        onChange={(e) => handleGradeChange(student.id, e.target.value)}
                                                        placeholder="-"
                                                        style={{
                                                            width: '80px',
                                                            padding: '0.5rem',
                                                            background: 'rgba(0,0,0,0.2)',
                                                            border: Number(grades[student.id]) > selectedAssessment.maxMarks ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                                                            color: 'white',
                                                            borderRadius: '0.25rem',
                                                            outline: 'none',
                                                            textAlign: 'center'
                                                        }}
                                                    />
                                                    <span style={{ color: '#6b7280', marginLeft: '0.5rem', fontSize: '0.8rem' }}>/ {selectedAssessment.maxMarks}</span>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <button
                                                        onClick={() => saveGrade(student.id)}
                                                        style={{
                                                            background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                                                            padding: '0.4rem', borderRadius: '0.25rem',
                                                            cursor: 'pointer', color: '#10b981', display: 'flex', alignItems: 'center'
                                                        }}
                                                        title="Save"
                                                    >
                                                        <Save size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#6b7280' }}>
                            <Award size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                            <p>Select an assessment to begin grading</p>
                        </div>
                    )}
                </div>
            </div>

            <SimpleModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="New Assessment">
                <form onSubmit={handleCreateAssessment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>Title</label>
                        <input value={newAssessment.title} onChange={e => setNewAssessment({ ...newAssessment, title: e.target.value })} required style={inputStyle} placeholder="e.g. Mid-Term Exam" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>Type</label>
                            <select value={newAssessment.type} onChange={e => setNewAssessment({ ...newAssessment, type: e.target.value })} style={inputStyle}>
                                <option>Quiz</option>
                                <option>Assignment</option>
                                <option>Exam</option>
                                <option>Lab</option>
                                <option>Project</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>Max Marks</label>
                            <input type="number" value={newAssessment.maxMarks} onChange={e => setNewAssessment({ ...newAssessment, maxMarks: Number(e.target.value) })} style={inputStyle} />
                        </div>
                    </div>
                    <button type="submit" style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#8b5cf6', border: 'none', color: 'white', fontWeight: 600, marginTop: '0.5rem', cursor: 'pointer' }}>Create Assessment</button>
                </form>
            </SimpleModal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

const inputStyle = { padding: '0.75rem', borderRadius: '0.5rem', background: '#374151', border: '1px solid #4b5563', color: 'white', outline: 'none' };

export default Gradebook;
