import React, { useState, useEffect } from 'react';
import SimpleModal from './SimpleModal';
import { Plus, Trash2, Save, Loader2, BookOpen, Sparkles, Edit2, X, Check } from 'lucide-react';
import { getSyllabus, saveSyllabus } from '../../../services/academicService';
import Toast from '../../../components/common/Toast';

const SyllabusModal = ({ isOpen, onClose, subject }) => {
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newTopic, setNewTopic] = useState('');
    const [editingIndex, setEditingIndex] = useState(-1);
    const [editValue, setEditValue] = useState('');
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (isOpen && subject) {
            setSaving(false);
            fetchSyllabus();
        } else {
            setTopics([]);
            setNewTopic('');
            setSaving(false);
        }
    }, [isOpen, subject]);

    const fetchSyllabus = async () => {
        setLoading(true);
        try {
            const data = await getSyllabus(subject.id);
            if (data && data.topics) {
                setTopics(data.topics);
            } else {
                setTopics([]);
            }
        } catch (error) {
            console.error("Error fetching syllabus:", error);
            setToast({ message: "Failed to load syllabus", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const handleAddTopic = (e) => {
        e.preventDefault();
        if (!newTopic.trim()) return;

        // Add as uncompleted by default (admin just defines the list)
        setTopics([...topics, { name: newTopic.trim(), completed: false }]);
        setNewTopic('');
    };

    const handleAutoGenerate = () => {
        if (!subject?.name) return;

        const name = subject.name.toLowerCase();
        let suggestedTopics = [];

        // Dictionary of common subjects
        if (name.includes('python')) {
            suggestedTopics = [
                "Introduction to Python & Installation", "Variables, Data Types, and Operators",
                "Control Flow: If/Else & Loops", "Functions & Modules",
                "Data Structures: Lists, Tuples, Dictionaries", "File Handling",
                "Object Oriented Programming (OOP)", "Exception Handling",
                "NumPy & Pandas Basics", "Final Project"
            ];
        } else if (name.includes('java')) {
            suggestedTopics = [
                "Java Basics & JVM Architecture", "Data Types & Operators",
                "Control Statements", "OOPs Concepts: Classes & Objects",
                "Inheritance & Polymorphism", "Abstraction & Encapsulation",
                "Exception Handling", "Collections Framework",
                "Multithreading", "Java IO"
            ];
        } else if (name.includes('web') || name.includes('html') || name.includes('css')) {
            suggestedTopics = [
                "HTML5 Fundamentals", "CSS3 Styling & Layouts",
                "Responsive Design with Media Queries", "JavaScript Basics",
                "DOM Manipulation", "ES6+ Features",
                "React/Vue/Angular Intro", "Backend Integration",
                "Deployment & Hosting"
            ];
        } else if (name.includes('data structure') || name.includes('dsa') || name.includes('algorithm')) {
            suggestedTopics = [
                "Introduction to Algorithms & Complexity", "Arrays & Linked Lists",
                "Stacks & Queues", "Trees & Graphs",
                "Sorting & Searching Algorithms", "Hashing",
                "Dynamic Programming", "Greedy Algorithms"
            ];
        } else if (name.includes('database') || name.includes('sql') || name.includes('dbms')) {
            suggestedTopics = [
                "Introduction to DBMS", "ER Modeling",
                "Relational Model & Normalization", "SQL Basics (DDL, DML)",
                "Joins & Subqueries", "Transactions & Concurrency",
                "Indexing & Hashing", "NoSQL Databases"
            ];
        } else {
            // Fallback Template
            suggestedTopics = [
                `Unit 1: Introduction to ${subject.name}`,
                `Unit 2: Core Concepts of ${subject.name}`,
                `Unit 3: Advanced Topics in ${subject.name}`,
                `Unit 4: Practical Applications`,
                `Unit 5: Case Studies & Projects`
            ];
        }

        // Merge with existing topics (avoid duplicates)
        const newTopicObjects = suggestedTopics
            .filter(t => !topics.some(existing => existing.name === t))
            .map(t => ({ name: t, completed: false }));

        if (newTopicObjects.length > 0) {
            setTopics([...topics, ...newTopicObjects]);
            setToast({ message: `Added ${newTopicObjects.length} suggested topics!`, type: "success" });
        } else {
            setToast({ message: "Relevant topics already exist.", type: "info" });
        }
    };

    const removeTopic = (index) => {
        const updated = [...topics];
        updated.splice(index, 1);
        setTopics(updated);
        if (editingIndex === index) cancelEdit();
    };

    const startEdit = (index, currentValue) => {
        setEditingIndex(index);
        setEditValue(currentValue);
    };

    const cancelEdit = () => {
        setEditingIndex(-1);
        setEditValue('');
    };

    const saveEdit = (index) => {
        if (!editValue.trim()) return;
        const updated = [...topics];
        updated[index].name = editValue.trim();
        setTopics(updated);
        cancelEdit();
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Create a timeout promise that rejects after 10 seconds
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error("Request timed out")), 10000);
            });

            // Race the save operation against the timeout
            await Promise.race([
                saveSyllabus(subject.id, topics),
                timeoutPromise
            ]);

            setToast({ message: "Syllabus saved successfully", type: "success" });
            setTimeout(() => {
                onClose();
            }, 1000);
        } catch (error) {
            console.error(error);
            if (error.message === "Request timed out") {
                setToast({ message: "Network timeout. Check ad-blocker/connection.", type: "error" });
            } else {
                setToast({ message: "Failed to save changes", type: "error" });
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <SimpleModal isOpen={isOpen} onClose={onClose} title={`Manage Syllabus: ${subject?.name || ''}`}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '60vh' }}>

                {/* Add Topic Input */}
                {/* Add Topic Input Section */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <form onSubmit={handleAddTopic} style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                        <input
                            value={newTopic}
                            onChange={(e) => setNewTopic(e.target.value)}
                            placeholder="Enter topic name (e.g. Unit 1: Introduction)"
                            style={{
                                flex: 1, padding: '0.75rem', borderRadius: '0.5rem',
                                background: '#1e293b', border: '1px solid #334155', color: 'white', outline: 'none'
                            }}
                        />
                        <button
                            type="submit"
                            title="Add Topic"
                            disabled={!newTopic.trim()}
                            style={{
                                padding: '0.75rem 1rem', borderRadius: '0.5rem',
                                background: '#3b82f6', border: 'none', color: 'white', cursor: 'pointer',
                                opacity: !newTopic.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center'
                            }}
                        >
                            <Plus size={20} />
                        </button>
                    </form>

                    <button
                        type="button"
                        onClick={handleAutoGenerate}
                        title="Auto-Generate Topics based on Subject Name"
                        style={{
                            padding: '0.75rem 1rem', borderRadius: '0.5rem',
                            background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)',
                            color: '#a78bfa', cursor: 'pointer',
                            display: 'flex', alignItems: 'center'
                        }}
                    >
                        <Sparkles size={20} />
                    </button>
                </div>

                {/* Topics List */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', color: '#64748b', marginTop: '2rem' }}>Loading...</div>
                    ) : topics.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#64748b', marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                            <BookOpen size={40} opacity={0.3} />
                            <p>No topics defined yet. Add some above.</p>
                        </div>
                    ) : (
                        topics.map((topic, idx) => (
                            <div key={idx} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                background: '#0f172a', padding: '0.75rem 1rem', borderRadius: '0.5rem',
                                border: '1px solid #1e293b'
                            }}>
                                {editingIndex === idx ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                        <input
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            autoFocus
                                            style={{
                                                flex: 1, padding: '0.5rem', borderRadius: '0.25rem',
                                                background: '#1e293b', border: '1px solid #3b82f6', color: 'white', outline: 'none'
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') saveEdit(idx);
                                                if (e.key === 'Escape') cancelEdit();
                                            }}
                                        />
                                        <button onClick={() => saveEdit(idx)} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer' }} title="Save">
                                            <Check size={18} />
                                        </button>
                                        <button onClick={cancelEdit} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="Cancel">
                                            <X size={18} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <span style={{ color: '#e2e8f0', flex: 1 }}>{topic.name}</span>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => startEdit(idx, topic.name)}
                                                style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: '0.25rem' }}
                                                title="Edit Topic"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => removeTopic(idx)}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                                                title="Remove Topic"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Actions */}
                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button
                        onClick={onClose}
                        style={{ padding: '0.75rem 1.5rem', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        style={{
                            padding: '0.75rem 1.5rem', borderRadius: '0.5rem',
                            background: '#10b981', color: 'white', border: 'none', fontWeight: 600,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                            opacity: (saving || loading) ? 0.7 : 1
                        }}
                    >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        Save Syllabus
                    </button>
                </div>

                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            </div>
        </SimpleModal>
    );
};

export default SyllabusModal;
