import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Folder, Upload, Trash2, Video, Link as LinkIcon } from 'lucide-react';
import { getMySubjects, uploadResource, getSubjectResources, deleteResource } from '../../services/facultyService';
import { useAuth } from '../../context/AuthContext';
import Toast from '../../components/common/Toast';
import SimpleModal from '../../components/admin/academic/SimpleModal';

const ResourceCenter = () => {
    const { user } = useAuth();
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [allResources, setAllResources] = useState({}); // Keyed by subjectId
    const [loading, setLoading] = useState(true);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [newResource, setNewResource] = useState({ title: '', type: 'File', url: '', file: null });
    const [toast, setToast] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Initial Data Fetch
    useEffect(() => {
        const init = async () => {
            if (user?.uid) {
                const mySubjects = await getMySubjects(user.uid);
                setSubjects(mySubjects);
                setLoading(false);
            }
        };
        init();
    }, [user]);

    // Fetch Resources for Selected Subject
    useEffect(() => {
        const fetchResources = async () => {
            if (selectedSubject) {
                setLoading(true);
                try {
                    const docs = await getSubjectResources(selectedSubject.id);
                    setAllResources(prev => ({
                        ...prev,
                        [selectedSubject.id]: docs
                    }));
                } catch (err) {
                    console.error("Failed to load resources", err);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchResources();
    }, [selectedSubject]);

    const handleUpload = async (e) => {
        e.preventDefault();
        setUploading(true);

        try {
            // Upload to Firebase
            const result = await uploadResource(selectedSubject.id, newResource, newResource.file);

            // Add to local state
            const newItem = {
                id: result.id,
                title: newResource.title,
                type: newResource.file ? (newResource.file.type.includes('pdf') ? 'PDF' : 'File') : 'Link',
                date: new Date().toISOString().split('T')[0],
                url: result.url,
                fileName: newResource.file ? newResource.file.name : null,
                storageRefPath: result.storageRefPath // Important for delete
            };

            const subjectId = selectedSubject.id;
            setAllResources(prev => ({
                ...prev,
                [subjectId]: [newItem, ...(prev[subjectId] || [])]
            }));

            setToast({ message: "Resource uploaded successfully", type: "success" });
            setIsUploadModalOpen(false);
            setNewResource({ title: '', type: 'File', url: '', file: null });

        } catch (error) {
            console.error(error);
            setToast({ message: "Failed to upload resource", type: "error" });
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (e, resourceId, storageRefPath) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this resource?")) return;

        try {
            await deleteResource(resourceId, storageRefPath);
            setAllResources(prev => ({
                ...prev,
                [selectedSubject.id]: prev[selectedSubject.id].filter(r => r.id !== resourceId)
            }));
            setToast({ message: "Resource deleted", type: "success" });
        } catch (error) {
            setToast({ message: "Failed to delete", type: "error" });
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'Video': return <Video size={20} color="#f59e0b" />;
            case 'Link': return <LinkIcon size={20} color="#3b82f6" />;
            case 'Image': return <FileText size={20} color="#10b981" />;
            default: return <FileText size={20} color="#ef4444" />;
        }
    };

    // --- Render: Folder View (No subject selected) ---
    if (!selectedSubject) {
        return (
            <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Folder color="#3b82f6" /> Resource Center
                    </h1>
                    <p style={{ color: '#9ca3af', marginTop: '0.5rem' }}>Select a class to manage its study materials.</p>
                </div>

                {loading ? (
                    <div style={{ color: 'white' }}>Loading subjects...</div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        {subjects.map(subject => (
                            <motion.div
                                key={subject.id}
                                whileHover={{ scale: 1.02, y: -5 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setSelectedSubject(subject)}
                                style={{
                                    background: 'linear-gradient(145deg, rgba(31, 41, 55, 0.6), rgba(17, 24, 39, 0.8))',
                                    borderRadius: '1rem',
                                    padding: '2rem',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    textAlign: 'center'
                                }}
                            >
                                <div style={{
                                    width: '64px', height: '64px',
                                    borderRadius: '20%',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    color: '#3b82f6',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Folder size={32} fill="currentColor" fillOpacity={0.2} />
                                </div>
                                <div>
                                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'white', fontSize: '1.1rem' }}>{subject.name}</h3>
                                    <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.9rem' }}>{subject.code}</p>
                                    <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#6b7280', background: 'rgba(0,0,0,0.2)', padding: '0.25rem 0.75rem', borderRadius: '1rem', display: 'inline-block' }}>
                                        Open Folder
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                        {subjects.length === 0 && (
                            <div style={{ color: '#9ca3af', gridColumn: '1/-1', textAlign: 'center' }}>No subjects assigned yet.</div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // --- Render: File View (Subject Selected) ---
    const subjectResources = allResources[selectedSubject.id] || [];

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <button
                        onClick={() => setSelectedSubject(null)}
                        style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        ← Back to Classes
                    </button>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Folder color="#3b82f6" /> {selectedSubject.name}
                    </h1>
                    <p style={{ color: '#9ca3af', marginTop: '0.5rem' }}>Managing resources for {selectedSubject.code}</p>
                </div>
            </div>

            {/* File List Area */}
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
                    {subjectResources.map(file => (
                        <motion.div
                            key={file.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.02 }}
                            style={{
                                background: 'rgba(255,255,255,0.03)',
                                padding: '1rem',
                                borderRadius: '0.75rem',
                                border: '1px solid rgba(255,255,255,0.05)',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                height: '140px',
                                cursor: 'pointer',
                                textDecoration: 'none'
                            }}
                            onClick={() => window.open(file.url, '_blank')}
                        >
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <div style={{ background: 'rgba(55, 65, 81, 0.5)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                                        {getIcon(file.type)}
                                    </div>
                                    <button
                                        onClick={(e) => handleDelete(e, file.id, file.storageRefPath)}
                                        style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}
                                        title="Delete"
                                    >
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
                    {subjectResources.length === 0 && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
                            <Folder size={48} style={{ opacity: 0.2, marginBottom: '0.5rem' }} />
                            <p>No resources uploaded yet.</p>
                        </div>
                    )}
                </div>
            </div>

            <SimpleModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title={`Upload to ${selectedSubject.name}`}>
                <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>Title</label>
                        <input value={newResource.title} onChange={e => setNewResource({ ...newResource, title: e.target.value })} required style={inputStyle} placeholder="Resource Name" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>Content Type</label>
                        <select value={newResource.type} onChange={e => setNewResource({ ...newResource, type: e.target.value })} style={inputStyle}>
                            <option value="File">File Upload</option>
                            <option value="Link">External URL</option>
                        </select>
                    </div>
                    {newResource.type === 'Link' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>URL</label>
                            <input value={newResource.url} onChange={e => setNewResource({ ...newResource, url: e.target.value })} style={inputStyle} placeholder="https://..." required />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>Select File</label>
                            <input type="file" onChange={e => setNewResource({ ...newResource, file: e.target.files[0] })} style={{ ...inputStyle, padding: '0.5rem' }} required />
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={uploading}
                        style={{
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            background: uploading ? '#6b7280' : '#3b82f6',
                            border: 'none',
                            color: 'white',
                            fontWeight: 600,
                            marginTop: '0.5rem',
                            cursor: uploading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                        }}
                    >
                        {uploading && <div className="spinner" style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid white', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}></div>}
                        {uploading ? 'Uploading...' : (newResource.type === 'Link' ? 'Add Link' : 'Upload File')}
                    </button>
                    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                </form>
            </SimpleModal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

const inputStyle = { padding: '0.75rem', borderRadius: '0.5rem', background: '#374151', border: '1px solid #4b5563', color: 'white', outline: 'none' };

export default ResourceCenter;
