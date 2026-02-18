import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, FileText, CheckCircle, XCircle, AlertCircle, Plus, Trash2, Filter } from 'lucide-react';
import { applyLeave, getMyLeaveRequests, checkDuplicateLeave, deleteAllLeavesForFaculty } from '../../services/leaveService';
import Toast from '../../components/common/Toast';
import { useAuth } from '../../context/AuthContext';
const LeaveManagement = () => {
    const { user } = useAuth();
    const [allLeaves, setAllLeaves] = useState([]);
    const [filteredLeaves, setFilteredLeaves] = useState([]);
    const [filterStatus, setFilterStatus] = useState('All'); // All, Pending, Approved, Rejected

    const [loading, setLoading] = useState(true);
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [toast, setToast] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        type: 'Sick Leave',
        fromDate: '',
        toDate: '',
        reason: ''
    });

    useEffect(() => {
        if (user) {
            fetchLeaves();
        }
    }, [user]);

    // Apply Filter
    useEffect(() => {
        if (filterStatus === 'All') {
            setFilteredLeaves(allLeaves);
        } else {
            setFilteredLeaves(allLeaves.filter(l => l.status === filterStatus));
        }
    }, [filterStatus, allLeaves]);

    const fetchLeaves = async () => {
        setLoading(true);
        try {
            const data = await getMyLeaveRequests(user.uid);
            setAllLeaves(data);
        } catch (error) {
            console.error(error);
            setToast({ type: 'error', message: 'Failed to fetch leave history.' });
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async (e) => {
        e.preventDefault();
        try {
            if (!formData.fromDate || !formData.toDate || !formData.reason) {
                setToast({ type: 'error', message: 'Please fill all fields.' });
                return;
            }

            // 1. Check if dates are future/today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const start = new Date(formData.fromDate);
            const end = new Date(formData.toDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);

            if (start < today) {
                setToast({ type: 'error', message: 'Cannot apply for leave in the past.' });
                return;
            }
            if (end < start) {
                setToast({ type: 'error', message: 'End date cannot be before start date.' });
                return;
            }

            // 3. Weekend Check (Sat/Sun)
            const startDay = start.getDay();
            const endDay = end.getDay();
            if (startDay === 0 || startDay === 6) {
                setToast({ type: 'error', message: 'Leave cannot start on a weekend (Saturday/Sunday).' });
                return;
            }
            if (endDay === 0 || endDay === 6) {
                setToast({ type: 'error', message: 'Leave cannot end on a weekend (Saturday/Sunday).' });
                return;
            }

            // 2. Check Overlap
            const isOverlap = await checkDuplicateLeave(user.uid, formData.fromDate, formData.toDate);
            if (isOverlap) {
                setToast({ type: 'error', message: 'You already have a Pending or Approved leave for these dates.' });
                return;
            }

            await applyLeave({
                facultyId: user.uid,
                facultyName: user.displayName || 'Unknown Faculty',
                type: formData.type,
                fromDate: formData.fromDate,
                toDate: formData.toDate,
                reason: formData.reason
            });

            setToast({ type: 'success', message: 'Leave request submitted successfully.' });
            setShowApplyModal(false);
            setFormData({ type: 'Sick Leave', fromDate: '', toDate: '', reason: '' });
            fetchLeaves();

        } catch (error) {
            console.error(error);
            setToast({ type: 'error', message: 'Failed to submit leave request.' });
        }
    };

    const handleClearHistory = async () => {
        if (!window.confirm("Are you sure you want to DELETE ALL leave history? This cannot be undone.")) return;

        try {
            await deleteAllLeavesForFaculty(user.uid);
            setToast({ type: 'success', message: 'Leave history cleared.' });
            fetchLeaves();
        } catch (error) {
            console.error(error);
            setToast({ type: 'error', message: 'Failed to clear history. invalid-permissions?' });
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Approved': return 'text-green-400 bg-green-400/10 border-green-400/20';
            case 'Rejected': return 'text-red-400 bg-red-400/10 border-red-400/20';
            default: return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
        }
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>Leave Management</h1>
                    <p style={{ color: '#94a3b8' }}>View your leave history and apply for new leaves.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    {/* Dev/Admin Tool: Clear History */}
                    <button
                        onClick={handleClearHistory}
                        style={{
                            padding: '12px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#f87171',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '12px',
                            cursor: 'pointer'
                        }}
                        title="Delete Copy"
                    >
                        <Trash2 size={20} />
                    </button>

                    <button
                        onClick={() => setShowApplyModal(true)}
                        style={{
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.4)'
                        }}
                    >
                        <Plus size={20} /> Apply for Leave
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div style={{ marginBottom: '24px', display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: '12px', width: 'fit-content' }}>
                {['All', 'Pending', 'Approved', 'Rejected'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: filterStatus === status ? '#334155' : 'transparent',
                            color: filterStatus === status ? 'white' : '#94a3b8',
                            cursor: 'pointer',
                            fontWeight: 500,
                            fontSize: '0.9rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Leave History List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>Loading...</div>
            ) : filteredLeaves.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '4rem',
                    background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed #334155'
                }}>
                    <Calendar size={48} color="#475569" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '8px' }}>
                        {filterStatus === 'All' ? 'No Leave History' : `No ${filterStatus} Requests`}
                    </h3>
                    <p style={{ color: '#94a3b8' }}>
                        {filterStatus === 'All' ? "You haven't applied for any leaves yet." : `You have no ${filterStatus.toLowerCase()} requests.`}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                    {filteredLeaves.map((leave) => (
                        <motion.div
                            key={leave.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                background: '#1e293b',
                                borderRadius: '16px',
                                padding: '24px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                border: '1px solid #334155'
                            }}
                        >
                            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                                <div style={{
                                    width: '56px', height: '56px', borderRadius: '12px',
                                    background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <FileText size={28} color="#94a3b8" />
                                </div>
                                <div>
                                    <h3 style={{ color: 'white', fontSize: '1.1rem', fontWeight: 600, marginBottom: '4px' }}>
                                        {leave.type}
                                    </h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#94a3b8', fontSize: '0.9rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Calendar size={14} />
                                            {leave.fromDate} to {leave.toDate}
                                        </div>
                                    </div>
                                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
                                        {leave.reason}
                                    </p>
                                </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(leave.status)}`}>
                                    {leave.status}
                                </span>
                                <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#64748b' }}>
                                    Applied on {leave.createdAt?.toDate ? leave.createdAt.toDate().toLocaleDateString() : 'Just now'}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Apply Leave Modal */}
            <AnimatePresence>
                {showApplyModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
                    }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{
                                background: '#1e293b', width: '500px', maxWidth: '95%',
                                borderRadius: '24px', padding: '32px',
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                            }}
                        >
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '24px' }}>Apply for Leave</h2>

                            <form onSubmit={handleApply} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '8px', fontSize: '0.9rem' }}>Leave Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#0f172a', border: '1px solid #334155', color: 'white' }}
                                    >
                                        <option>Sick Leave</option>
                                        <option>Casual Leave</option>
                                        <option>Academic Duty</option>
                                        <option>Personal Emergency</option>
                                    </select>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', color: '#94a3b8', marginBottom: '8px', fontSize: '0.9rem' }}>From Date</label>
                                        <input
                                            type="date"
                                            value={formData.fromDate}
                                            onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                                            min={new Date().toISOString().split('T')[0]}
                                            required
                                            style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#0f172a', border: '1px solid #334155', color: 'white' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', color: '#94a3b8', marginBottom: '8px', fontSize: '0.9rem' }}>To Date</label>
                                        <input
                                            type="date"
                                            value={formData.toDate}
                                            onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                                            min={formData.fromDate || new Date().toISOString().split('T')[0]}
                                            required
                                            style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#0f172a', border: '1px solid #334155', color: 'white' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '8px', fontSize: '0.9rem' }}>Reason</label>
                                    <textarea
                                        value={formData.reason}
                                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                        rows="3"
                                        placeholder="Briefly explain the reason..."
                                        required
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#0f172a', border: '1px solid #334155', color: 'white', fontFamily: 'inherit' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowApplyModal(false)}
                                        style={{ padding: '12px 24px', borderRadius: '12px', background: 'transparent', color: '#94a3b8', border: '1px solid #334155', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        style={{ padding: '12px 24px', borderRadius: '12px', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                                    >
                                        Submit Request
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default LeaveManagement;
