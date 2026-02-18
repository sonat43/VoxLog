import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Calendar, User, Clock, Filter, UserCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { getAllLeaveRequests, updateLeaveStatus, assignSubstitute, generateSubstitutionRequests } from '../../../services/adminService';
import { getPendingSubstitutions } from '../../../services/facultyService';
import Toast from '../../../components/common/Toast';
import SimpleModal from '../../../components/admin/academic/SimpleModal';

const LeaveApprovals = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending'); // pending, approved, rejected, all
    const [toast, setToast] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);
    const [pendingAdminSubs, setPendingAdminSubs] = useState([]); // Tasks assigned to Admin

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const data = await getAllLeaveRequests();
            setRequests(data);

            // Check for admin-assigned substitutions
            const adminSubs = await getPendingSubstitutions('ADMIN');
            setPendingAdminSubs(adminSubs);
        } catch (error) {
            console.error("Failed to fetch requests", error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            await updateLeaveStatus(id, status, user.uid);

            setToast({ message: `Leave request ${status}`, type: "success" });

            fetchRequests(); // Refresh
        } catch (error) {
            console.error(error);
            setToast({ message: "Failed to update status", type: "error" });
        }
    };

    const filteredRequests = requests.filter(req => {
        if (filter === 'all') return true;
        return req.status === filter;
    });

    const getStatusBadge = (status) => {
        const styles = {
            pending: {
                background: 'rgba(234, 179, 8, 0.1)',
                color: '#eab308',
                border: '1px solid rgba(234, 179, 8, 0.2)'
            },
            approved: {
                background: 'rgba(34, 197, 94, 0.1)',
                color: '#22c55e',
                border: '1px solid rgba(34, 197, 94, 0.2)'
            },
            rejected: {
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.2)'
            }
        };

        const currentStyle = styles[status] || styles.pending;

        return (
            <span style={{
                padding: '0.25rem 0.5rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                ...currentStyle
            }}>
                {status}
            </span>
        );
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1280px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Calendar size={28} color="#ec4899" /> Leave Approvals
                    </h1>
                    <p style={{ color: '#9ca3af', marginTop: '0.5rem' }}>Manage faculty leave applications.</p>
                </div>

                <div style={{
                    display: 'flex',
                    background: '#1f2937',
                    padding: '0.25rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #374151'
                }}>
                    {['pending', 'approved', 'rejected', 'all'].map(option => (
                        <button
                            key={option}
                            onClick={() => setFilter(option)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                background: filter === option ? '#db2777' : 'transparent',
                                color: filter === option ? 'white' : '#9ca3af',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: filter === option ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none'
                            }}
                        >
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Pending Admin Actions */}
            {pendingAdminSubs.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fca5a5', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <AlertCircle size={24} /> Action Required: Substitutions (Class Teacher Unavailable)
                    </h2>
                    <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                        {pendingAdminSubs.map(sub => (
                            <motion.div
                                key={sub.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                style={{
                                    background: 'rgba(127, 29, 29, 0.2)',
                                    border: '1px solid rgba(248, 113, 113, 0.2)',
                                    borderRadius: '0.75rem',
                                    padding: '1.25rem'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#fca5a5', fontWeight: 600 }}>{sub.date}</span>
                                    <span style={{ fontSize: '0.85rem', color: '#fda4af', background: 'rgba(255,255,255,0.05)', padding: '0 0.5rem', borderRadius: '4px' }}>
                                        {sub.slotTime.split(' - ')[0]}
                                    </span>
                                </div>
                                <h3 style={{ color: 'white', fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>{sub.subjectName}</h3>
                                <p style={{ fontSize: '0.9rem', color: '#d1d5db', margin: 0 }}>
                                    Original: Fac {sub.originalFacultyId.substr(0, 4)}
                                </p>
                                <button
                                    onClick={() => {
                                        // Adapt object for the simple modal
                                        setSelectedRequest({
                                            ...sub,
                                            facultyName: `Faculty ${sub.originalFacultyId.substr(0, 4)}`,
                                            startDate: sub.date,
                                            session: sub.slotTime
                                        });
                                        setIsSubModalOpen(true);
                                    }}
                                    style={{
                                        marginTop: '1rem', width: '100%', padding: '0.5rem',
                                        background: '#dc2626', color: 'white', border: 'none',
                                        borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer'
                                    }}
                                >
                                    Assign Substitute
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', color: '#6b7280', padding: '3rem' }}>Loading requests...</div>
            ) : filteredRequests.length === 0 && pendingAdminSubs.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '5rem',
                    background: 'rgba(31, 41, 55, 0.5)',
                    borderRadius: '1rem',
                    border: '1px solid #374151'
                }}>
                    <Filter size={64} style={{ color: '#4b5563', margin: '0 auto 1rem' }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#d1d5db' }}>No requests found</h3>
                    <p style={{ color: '#6b7280' }}>No leave requests match the selected filter.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {filteredRequests.map((req) => (
                        <motion.div
                            key={req.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                background: 'rgba(31, 41, 55, 0.6)',
                                backdropFilter: 'blur(4px)',
                                border: '1px solid #374151',
                                borderRadius: '0.75rem',
                                padding: '1.5rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                                <div style={{
                                    width: '48px', height: '48px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #6366f1, #9333ea)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontWeight: 700, fontSize: '1.125rem',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}>
                                    {req.facultyName ? req.facultyName.charAt(0).toUpperCase() : <User />}
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'white', margin: 0 }}>
                                            {req.facultyName || 'Unknown Faculty'}
                                        </h3>
                                        {getStatusBadge(req.status)}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
                                        <span style={{ color: '#f472b6', fontWeight: 500 }}>{req.type}</span>
                                        <span style={{ width: 4, height: 4, background: '#4b5563', borderRadius: '50%' }}></span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                            <Clock size={14} /> {req.startDate} to {req.endDate}
                                        </span>
                                    </div>
                                    <p style={{
                                        color: '#d1d5db',
                                        fontSize: '0.875rem',
                                        background: 'rgba(17, 24, 39, 0.5)',
                                        padding: '0.5rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid rgba(55, 65, 81, 0.5)',
                                        display: 'inline-block',
                                        margin: 0
                                    }}>
                                        "{req.reason}"
                                    </p>
                                </div>
                            </div>

                            {req.status === 'pending' && (
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button
                                        onClick={() => handleStatusUpdate(req.id, 'approved')}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                                            padding: '0.5rem 1rem',
                                            background: 'rgba(34, 197, 94, 0.1)',
                                            color: '#4ade80',
                                            border: '1px solid rgba(34, 197, 94, 0.2)',
                                            borderRadius: '0.5rem',
                                            cursor: 'pointer',
                                            fontWeight: 500,
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <Check size={18} /> Approve
                                    </button>
                                    <button
                                        onClick={() => handleStatusUpdate(req.id, 'rejected')}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                                            padding: '0.5rem 1rem',
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            color: '#f87171',
                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                            borderRadius: '0.5rem',
                                            cursor: 'pointer',
                                            fontWeight: 500,
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <X size={18} /> Reject
                                    </button>
                                </div>
                            )}

                            {req.status === 'approved' && (
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    <div style={{ fontSize: '0.875rem', color: '#6b7280', fontStyle: 'italic', marginRight: '1rem' }}>
                                        Reviewed on {req.reviewDate ? new Date(req.reviewDate).toLocaleDateString() : 'N/A'}
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedRequest(req);
                                            setIsSubModalOpen(true);
                                        }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                                            padding: '0.5rem 1rem',
                                            background: 'rgba(99, 102, 241, 0.1)',
                                            color: '#818cf8',
                                            border: '1px solid rgba(99, 102, 241, 0.2)',
                                            borderRadius: '0.5rem',
                                            cursor: 'pointer',
                                            fontWeight: 500,
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <UserCheck size={18} /> Assign Substitute
                                    </button>
                                </div>
                            )}
                            {req.status === 'rejected' && (
                                <div style={{ fontSize: '0.875rem', color: '#6b7280', fontStyle: 'italic' }}>
                                    Reviewed on {req.reviewDate ? new Date(req.reviewDate).toLocaleDateString() : 'N/A'}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Substitution Modal */}
            <SimpleModal isOpen={isSubModalOpen} onClose={() => setIsSubModalOpen(false)} title="Assign Substitute Teacher">
                {selectedRequest && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.5rem', fontSize: '0.9rem', color: '#d1d5db' }}>
                            <p style={{ margin: 0 }}><strong>Original Faculty:</strong> {selectedRequest.facultyName}</p>
                            <p style={{ margin: '0.25rem 0 0 0' }}><strong>Date:</strong> {selectedRequest.startDate}</p>
                            <p style={{ margin: '0.25rem 0 0 0' }}><strong>Session:</strong> {selectedRequest.session || 'Full Day'}</p>
                        </div>

                        {/* In a real app, we would fetch the timetable here. For now, manual entry */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>Substitute Faculty Email/ID</label>
                            <input
                                type="text"
                                placeholder="Enter Substitute Faculty ID (e.g. UID123)"
                                style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#374151', border: '1px solid #4b5563', color: 'white', outline: 'none' }}
                                id="subInput"
                            />
                            <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                                * Enter the UID of the teacher who will take the class. The class will appear in their dashboard.
                            </p>
                        </div>

                        <button
                            onClick={async () => {
                                const subId = document.getElementById('subInput').value;
                                if (!subId) return alert("Please enter ID");
                                try {
                                    // Hardcoded demo for now: Assigning a dummy substitution
                                    await assignSubstitute({
                                        date: selectedRequest.startDate,
                                        originalFacultyId: selectedRequest.facultyId,
                                        substituteFacultyId: subId,
                                        subjectId: 'demo_subject', // ideally picked from list
                                        slot: '10:00 - 11:00'
                                    });
                                    setToast({ message: "Substitute assigned successfully", type: "success" });
                                    setIsSubModalOpen(false);
                                } catch (e) {
                                    setToast({ message: "Failed to assign", type: "error" });
                                }
                            }}
                            style={{
                                padding: '0.75rem', borderRadius: '0.5rem',
                                background: '#db2777', border: 'none', color: 'white',
                                fontWeight: 600, marginTop: '1rem', cursor: 'pointer'
                            }}
                        >
                            Confirm Assignment
                        </button>
                    </div>
                )}
            </SimpleModal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default LeaveApprovals;
