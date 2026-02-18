import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, FileText, User, Calendar } from 'lucide-react';
import { getLeaveRequests, updateLeaveStatus } from '../../services/leaveService';
import Toast from '../../components/common/Toast';

const LeaveApproval = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('Pending'); // Pending, Approved, Rejected, All
    const [toast, setToast] = useState(null);

    useEffect(() => {
        fetchRequests();
    }, [filter]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const status = filter === 'All' ? null : filter;
            const data = await getLeaveRequests(status);
            setRequests(data);
        } catch (error) {
            console.error(error);
            setToast({ type: 'error', message: 'Failed to fetch leave requests.' });
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (requestId, newStatus) => {
        try {
            await updateLeaveStatus(requestId, newStatus);
            setToast({
                type: 'success',
                message: `Request ${newStatus.toLowerCase()} successfully.`
            });
            // Refresh list
            fetchRequests();
        } catch (error) {
            console.error(error);
            setToast({ type: 'error', message: `Failed to ${newStatus.toLowerCase()} request.` });
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>Leave Approvals</h1>
                    <p style={{ color: '#94a3b8' }}>Manage faculty leave requests.</p>
                </div>

                {/* Filter Tabs */}
                <div style={{ background: '#1e293b', padding: '4px', borderRadius: '12px', display: 'flex', gap: '4px' }}>
                    {['Pending', 'Approved', 'Rejected', 'All'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                background: filter === f ? '#3b82f6' : 'transparent',
                                color: filter === f ? 'white' : '#94a3b8',
                                border: 'none', cursor: 'pointer', fontWeight: 500,
                                transition: 'all 0.2s'
                            }}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>Loading requests...</div>
            ) : requests.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '4rem',
                    background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed #334155',
                    color: '#64748b'
                }}>
                    No {filter !== 'All' ? filter.toLowerCase() : ''} requests found.
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                    {requests.map(req => (
                        <motion.div
                            key={req.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                background: '#1e293b', borderRadius: '16px', padding: '24px',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                                border: '1px solid #334155'
                            }}
                        >
                            <div style={{ display: 'flex', gap: '20px' }}>
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '50%',
                                    background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 700, color: 'white'
                                }}>
                                    {req.facultyName ? req.facultyName.charAt(0) : 'U'}
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                                        <h3 style={{ color: 'white', fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>
                                            {req.facultyName}
                                        </h3>
                                        <span style={{
                                            fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px',
                                            background: '#334155', color: '#cbd5e1'
                                        }}>
                                            {req.type}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Calendar size={14} />
                                            {req.fromDate} - {req.toDate}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Clock size={14} />
                                            Applied {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleDateString() : 'recently'}
                                        </div>
                                    </div>

                                    <p style={{ color: '#cbd5e1', fontSize: '0.95rem', margin: 0 }}>
                                        "{req.reason}"
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                {req.status === 'Pending' ? (
                                    <>
                                        <button
                                            onClick={() => handleAction(req.id, 'Rejected')}
                                            style={{
                                                padding: '8px 16px', borderRadius: '8px',
                                                border: '1px solid #ef4444', background: 'transparent', color: '#ef4444',
                                                cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px'
                                            }}
                                        >
                                            <XCircle size={18} /> Reject
                                        </button>
                                        <button
                                            onClick={() => handleAction(req.id, 'Approved')}
                                            style={{
                                                padding: '8px 16px', borderRadius: '8px',
                                                background: '#22c55e', border: 'none', color: 'white',
                                                cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
                                                boxShadow: '0 4px 6px -1px rgba(34, 197, 94, 0.4)'
                                            }}
                                        >
                                            <CheckCircle size={18} /> Approve
                                        </button>
                                    </>
                                ) : (
                                    <span style={{
                                        padding: '6px 16px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 600,
                                        background: req.status === 'Approved' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        color: req.status === 'Approved' ? '#4ade80' : '#f87171',
                                        border: req.status === 'Approved' ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                                    }}>
                                        {req.status}
                                    </span>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default LeaveApproval;
