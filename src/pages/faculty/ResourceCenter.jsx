import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Folder, Upload, Download, Trash2, Video, Link as LinkIcon } from 'lucide-react';
import { getMySubjects } from '../../services/facultyService';
import { useAuth } from '../../context/AuthContext';
import Toast from '../../components/common/Toast';
import SimpleModal from '../../components/admin/academic/SimpleModal';

const ResourceCenter = () => {
    const { user } = useAuth();
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [newResource, setNewResource] = useState({ title: '', type: 'PDF', url: '' });
    const [toast, setToast] = useState(null);

    useEffect(() => {
        const init = async () => {
            if (user?.uid) {
                const mySubjects = await getMySubjects(user.uid);
                setSubjects(mySubjects);
                if (mySubjects.length > 0) setSelectedSubject(mySubjects[0]);
                setLoading(false);
            }
        };
        init();
    }, [user]);

    useEffect(() => {
        if (selectedSubject) {
            // Mock fetching resources for now
            // In real app: await getResources(selectedSubject.id)
            setResources([
                { id: 1, title: 'Week 1: Introduction Slides', type: 'PDF', date: '2026-01-10', url: '#' },
                { id: 2, title: 'Lecture Recording: Setup', type: 'Video', date: '2026-01-12', url: '#' },
                { id: 3, title: 'Reference Material: Documentation', type: 'Link', date: '2026-01-12', url: '#' },
            ]);
        }
    }, [selectedSubject]);

    const handleUpload = (e) => {
        e.preventDefault();
        // Mock upload
        const newItem = {
            id: Date.now(),
            title: newResource.title,
            type: newResource.type,
            date: new Date().toISOString().split('T')[0],
            url: newResource.url
        };
        setResources([newItem, ...resources]);
        setToast({ message: "Resource added successfully", type: "success" });
        setIsUploadModalOpen(false);
        setNewResource({ title: '', type: 'PDF', url: '' });
    };

    const getIcon = (type) => {
        switch (type) {
            case 'Video': return <Video size={20} color="#f59e0b" />;
            case 'Link': return <LinkIcon size={20} color="#3b82f6" />;
            default: return <FileText size={20} color="#ef4444" />;
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Folder color="#3b82f6" /> Resource Center
                    </h1>
                    <p style={{ color: '#9ca3af', marginTop: '0.5rem' }}>Share study materials and resources with students.</p>
                </div>

                <select
                    value={selectedSubject?.id || ''}
                    onChange={(e) => setSelectedSubject(subjects.find(s => s.id === e.target.value))}
                    style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#1f2937', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                </select>
            </div>

            <div style={{ background: '#1f2937', borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <h3 style={{ margin: 0, color: 'white' }}>Files & Links</h3>
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        style={{
                            background: '#3b82f6', color: 'white', border: 'none',
                            padding: '0.5rem 1rem', borderRadius: '0.5rem',
                            display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600
                        }}
                    >
                        <Upload size={18} /> Upload Resource
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                    {resources.map(file => (
                        <motion.div
                            key={file.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={{
                                background: 'rgba(255,255,255,0.03)',
                                padding: '1rem',
                                borderRadius: '0.75rem',
                                border: '1px solid rgba(255,255,255,0.05)',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                height: '140px'
                            }}
                        >
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <div style={{ background: 'rgba(55, 65, 81, 0.5)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                                        {getIcon(file.type)}
                                    </div>
                                    <button style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }} title="Delete">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div style={{ fontWeight: 500, color: 'white', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                    {file.title}
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                                <span>{file.date}</span>
                                <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', padding: '0.2rem 0.5rem', borderRadius: '0.25rem' }}>{file.type}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            <SimpleModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Upload Resource">
                <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>Title</label>
                        <input value={newResource.title} onChange={e => setNewResource({ ...newResource, title: e.target.value })} required style={inputStyle} placeholder="Resource Name" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>Type</label>
                        <select value={newResource.type} onChange={e => setNewResource({ ...newResource, type: e.target.value })} style={inputStyle}>
                            <option>PDF</option>
                            <option>Video</option>
                            <option>Link</option>
                            <option>Document</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>URL / File Link</label>
                        <input value={newResource.url} onChange={e => setNewResource({ ...newResource, url: e.target.value })} style={inputStyle} placeholder="https://..." />
                    </div>
                    <button type="submit" style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#3b82f6', border: 'none', color: 'white', fontWeight: 600, marginTop: '0.5rem', cursor: 'pointer' }}>Add Resource</button>
                </form>
            </SimpleModal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

const inputStyle = { padding: '0.75rem', borderRadius: '0.5rem', background: '#374151', border: '1px solid #4b5563', color: 'white', outline: 'none' };

export default ResourceCenter;
