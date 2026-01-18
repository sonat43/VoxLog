import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Circle, Book, Save, AlertCircle } from 'lucide-react';
import { getMySubjects, getSyllabus, updateTopicStatus, initializeSyllabus } from '../../services/facultyService';
import { useAuth } from '../../context/AuthContext';
import Toast from '../../components/common/Toast';

const AcademicProgress = () => {
    const { user } = useAuth();
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [syllabus, setSyllabus] = useState({ topics: [] });
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);

    // Mock default topics to initialize if empty
    const defaultTopics = [
        { id: 1, name: 'Module 1: Introduction & Concepts', completed: false, dateCompleted: null },
        { id: 2, name: 'Module 2: Core Principles', completed: false, dateCompleted: null },
        { id: 3, name: 'Module 3: Advanced Techniques', completed: false, dateCompleted: null },
        { id: 4, name: 'Module 4: Case Studies', completed: false, dateCompleted: null },
        { id: 5, name: 'Module 5: Project & Review', completed: false, dateCompleted: null },
    ];

    useEffect(() => {
        const fetchSubjects = async () => {
            if (user?.uid) {
                try {
                    const mySubjects = await getMySubjects(user.uid);
                    setSubjects(mySubjects);
                    if (mySubjects.length > 0) {
                        setSelectedSubject(mySubjects[0]);
                    }
                } catch (error) {
                    console.error("Error fetching subjects:", error);
                    setToast({ message: "Failed to load subjects", type: "error" });
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchSubjects();
    }, [user]);

    useEffect(() => {
        if (selectedSubject) {
            loadSyllabus(selectedSubject.id);
        }
    }, [selectedSubject]);

    const loadSyllabus = async (subjectId) => {
        setLoading(true);
        try {
            let data = await getSyllabus(subjectId);
            if (data.topics.length === 0) {
                // Auto-initialize for demo purposes
                await initializeSyllabus(subjectId, defaultTopics);
                data = { topics: defaultTopics, id: 'new' }; // temporary local state update
            }
            setSyllabus(data);
        } catch (error) {
            console.error("Error loading syllabus:", error);
            setToast({ message: "Failed to load syllabus", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const toggleTopic = async (topicId) => {
        const updatedTopics = syllabus.topics.map(t => {
            if (t.id === topicId) {
                return {
                    ...t,
                    completed: !t.completed,
                    dateCompleted: !t.completed ? new Date().toISOString() : null
                };
            }
            return t;
        });

        // Optimistic UI update
        const oldTopics = syllabus.topics;
        setSyllabus({ ...syllabus, topics: updatedTopics });

        try {
            await updateTopicStatus(syllabus.id, updatedTopics);
            setToast({ message: "Progress saved", type: "success" });
        } catch (error) {
            console.error("Error saving progress:", error);
            setToast({ message: "Failed to save progress", type: "error" });
            setSyllabus({ ...syllabus, topics: oldTopics }); // Revert
        }
    };

    const calculateProgress = () => {
        if (!syllabus.topics.length) return 0;
        const completed = syllabus.topics.filter(t => t.completed).length;
        return Math.round((completed / syllabus.topics.length) * 100);
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Book color="#14b8a6" /> Course Progress Tracker
                    </h1>
                    <p style={{ color: '#9ca3af', marginTop: '0.5rem' }}>Track syllabus coverage and teaching milestones.</p>
                </div>

                {/* Subject Selector */}
                <select
                    value={selectedSubject?.id || ''}
                    onChange={(e) => {
                        const sub = subjects.find(s => s.id === e.target.value);
                        setSelectedSubject(sub);
                    }}
                    style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '0.5rem',
                        background: '#1f2937',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.1)',
                        outline: 'none',
                        cursor: 'pointer'
                    }}
                >
                    {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div style={{ color: 'white', textAlign: 'center', padding: '2rem' }}>Loading data...</div>
            ) : !selectedSubject ? (
                <div style={{
                    padding: '3rem',
                    background: 'rgba(31, 41, 55, 0.5)',
                    borderRadius: '1rem',
                    textAlign: 'center',
                    border: '1px dashed rgba(255,255,255,0.1)'
                }}>
                    <AlertCircle size={48} color="#9ca3af" style={{ margin: '0 auto 1rem auto' }} />
                    <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>No Courses Assigned</h3>
                    <p style={{ color: '#9ca3af' }}>You have not been assigned any subjects yet. Contact the administrator.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
                    {/* Main List */}
                    <div style={{
                        background: '#1f2937',
                        borderRadius: '1rem',
                        padding: '1.5rem',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <h3 style={{ margin: 0, color: 'white' }}>Syllabus Topics</h3>
                            <span style={{ fontSize: '0.875rem', color: '#14b8a6', background: 'rgba(20, 184, 166, 0.1)', padding: '0.25rem 0.75rem', borderRadius: '1rem' }}>
                                {syllabus.topics.filter(t => t.completed).length} / {syllabus.topics.length} Completed
                            </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {syllabus.topics.map((topic) => (
                                <motion.div
                                    key={topic.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '1rem',
                                        borderRadius: '0.75rem',
                                        background: topic.completed ? 'rgba(20, 184, 166, 0.05)' : 'rgba(255,255,255,0.02)',
                                        border: topic.completed ? '1px solid rgba(20, 184, 166, 0.2)' : '1px solid rgba(255,255,255,0.05)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onClick={() => toggleTopic(topic.id)}
                                >
                                    <div style={{ marginRight: '1rem' }}>
                                        {topic.completed ? (
                                            <CheckCircle size={24} color="#14b8a6" fill="rgba(20, 184, 166, 0.2)" />
                                        ) : (
                                            <Circle size={24} color="#6b7280" />
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            color: topic.completed ? 'white' : '#9ca3af',
                                            fontSize: '1rem',
                                            fontWeight: 500,
                                            textDecoration: topic.completed ? 'line-through' : 'none'
                                        }}>
                                            {topic.name}
                                        </div>
                                        {topic.completed && topic.dateCompleted && (
                                            <div style={{ fontSize: '0.75rem', color: '#14b8a6', marginTop: '0.25rem' }}>
                                                Completed on {new Date(topic.dateCompleted).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Progress Sidebar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(37, 99, 235, 0.1))',
                            borderRadius: '1rem',
                            padding: '2rem',
                            textAlign: 'center',
                            border: '1px solid rgba(139, 92, 246, 0.2)'
                        }}>
                            <h3 style={{ margin: '0 0 1rem 0', color: '#a78bfa' }}>Overall Progress</h3>
                            <div style={{ position: 'relative', width: '150px', height: '150px', margin: '0 auto' }}>
                                <svg width="150" height="150" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#1f2937" strokeWidth="8" />
                                    <circle
                                        cx="50" cy="50" r="45"
                                        fill="none"
                                        stroke="#8b5cf6"
                                        strokeWidth="8"
                                        strokeDasharray={`${calculateProgress() * 2.83} 283`}
                                        strokeLinecap="round"
                                        transform="rotate(-90 50 50)"
                                    />
                                </svg>
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexDirection: 'column'
                                }}>
                                    <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>{calculateProgress()}%</span>
                                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Completed</span>
                                </div>
                            </div>
                        </div>

                        <div style={{
                            background: '#1f2937',
                            padding: '1.5rem',
                            borderRadius: '1rem',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <h4 style={{ margin: '0 0 1rem 0', color: 'white' }}>Quick Stats</h4>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                                <span style={{ color: '#9ca3af' }}>Total Modules</span>
                                <span style={{ color: 'white' }}>{syllabus.topics.length}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                                <span style={{ color: '#9ca3af' }}>Remaining</span>
                                <span style={{ color: '#f87171' }}>{syllabus.topics.length - syllabus.topics.filter(t => t.completed).length}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                <span style={{ color: '#9ca3af' }}>Est. Completion</span>
                                <span style={{ color: '#fbbf24' }}>4 Weeks</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default AcademicProgress;
