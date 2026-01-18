import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Building, Save, CheckCircle, AlertCircle, Phone, FileText, Camera, Edit2, X, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import DashboardLayout from '../layouts/DashboardLayout';

const UserProfile = () => {
    const { user, role } = useAuth();
    const [formData, setFormData] = useState({
        displayName: '',
        phone: '',
        department: '',
        bio: '',
        email: '',
    });
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);

    // Premium Gold Accent Color for "Precious" feel
    const GOLD_ACCENT = '#fbbf24';

    useEffect(() => {
        if (user) {
            setFormData({
                displayName: user.displayName || '',
                phone: user.phone || '',
                department: user.department || '',
                bio: user.bio || '',
                email: user.email || ''
            });
        }
    }, [user, role]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (status) setStatus(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        try {
            const userRef = doc(db, 'users', user.uid);
            // Department is intentionally excluded from update to keep it read-only/admin-assigned
            await updateDoc(userRef, {
                displayName: formData.displayName,
                phone: formData.phone,
                bio: formData.bio
            });
            setStatus('success');
            setIsEditing(false);
            setTimeout(() => setStatus(null), 3000);
        } catch (error) {
            console.error("Error updating profile:", error);
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '3rem' }}
            >
                {/* Header Section */}
                <div style={{ marginBottom: '2.5rem' }}>
                    <h1 style={{
                        fontSize: '2.5rem',
                        fontWeight: 800,
                        background: 'linear-gradient(to right, #fff, #94a3b8)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '0.5rem',
                        letterSpacing: '-0.025em'
                    }}>
                        Your Profile
                    </h1>
                    <p style={{ color: '#9ca3af', fontSize: '1.1rem' }}>
                        Verify your identity and manage your personal details.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 2fr', gap: '2.5rem', alignItems: 'start' }}>

                    {/* Left Column: Premium Identity Card */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        style={{
                            background: 'rgba(30, 41, 59, 0.4)',
                            borderRadius: '2rem',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            padding: '3rem 2rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            backdropFilter: 'blur(40px)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Premium Gradient Overlay */}
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0,
                            height: '150px',
                            background: 'linear-gradient(180deg, rgba(234, 179, 8, 0.1) 0%, transparent 100%)',
                            pointerEvents: 'none'
                        }} />

                        <div style={{ position: 'relative', marginBottom: '2rem', zIndex: 1 }}>
                            <div style={{
                                width: '140px',
                                height: '140px',
                                borderRadius: '50%',
                                padding: '4px',
                                background: `linear-gradient(135deg, ${GOLD_ACCENT}, #d97706)`,
                                boxShadow: `0 0 30px rgba(245, 158, 11, 0.4)`
                            }}>
                                <div style={{
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '50%',
                                    background: '#0f172a',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '3.5rem',
                                    fontWeight: 800,
                                    color: 'white',
                                    overflow: 'hidden'
                                }}>
                                    {/* Placeholder for real image or Initials */}
                                    {formData.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                                </div>
                            </div>
                        </div>

                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>
                            {formData.displayName || 'Faculty Member'}
                        </h2>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: 'rgba(234, 179, 8, 0.1)',
                            border: '1px solid rgba(234, 179, 8, 0.2)',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '1rem',
                            color: '#fbbf24',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            marginBottom: '2rem'
                        }}>
                            <Star size={14} fill="currentColor" /> Premium Faculty
                        </div>

                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{
                                background: 'rgba(255,255,255,0.03)',
                                padding: '1rem',
                                borderRadius: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                textAlign: 'left',
                                border: '1px solid rgba(255,255,255,0.02)'
                            }}>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                                    <Building size={20} color="#94a3b8" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Department</div>
                                    <div style={{ color: 'white', fontSize: '1rem', fontWeight: 500 }}>{formData.department || 'Unassigned'}</div>
                                </div>
                            </div>

                            <div style={{
                                background: 'rgba(255,255,255,0.03)',
                                padding: '1rem',
                                borderRadius: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                textAlign: 'left',
                                border: '1px solid rgba(255,255,255,0.02)'
                            }}>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                                    <Mail size={20} color="#94a3b8" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Email</div>
                                    <div style={{ color: 'white', fontSize: '1rem', fontWeight: 500 }}>{formData.email}</div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right Column: Editable Form */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                            {!isEditing && (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setIsEditing(true)}
                                    style={{
                                        padding: '0.75rem 1.5rem',
                                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '0.75rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)'
                                    }}
                                >
                                    <Edit2 size={16} /> Edit Profile
                                </motion.button>
                            )}
                        </div>

                        {/* Status Message */}
                        <AnimatePresence>
                            {status && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginBottom: '1.5rem' }}
                                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    style={{
                                        background: status === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        border: `1px solid ${status === 'success' ? '#059669' : '#dc2626'}`,
                                        color: status === 'success' ? '#34d399' : '#f87171',
                                        padding: '1rem',
                                        borderRadius: '0.75rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem'
                                    }}
                                >
                                    {status === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                                    <span style={{ fontWeight: 500 }}>{status === 'success' ? 'Profile updated successfully.' : 'Failed to save changes.'}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <section>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                                    Personal Details
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    {/* Display Name Input */}
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#94a3b8', marginBottom: '0.5rem' }}>Full Name</label>
                                        <input
                                            type="text"
                                            name="displayName"
                                            value={formData.displayName}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder="John Doe"
                                            style={{
                                                width: '100%',
                                                padding: '1rem',
                                                background: isEditing ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.02)',
                                                border: isEditing ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.05)',
                                                borderRadius: '0.75rem',
                                                color: 'white',
                                                fontSize: '1rem',
                                                transition: 'all 0.2s'
                                            }}
                                        />
                                    </div>

                                    {/* Phone Input */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#94a3b8', marginBottom: '0.5rem' }}>Phone</label>
                                        <input
                                            type="text"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder="+1 (555) 555-5555"
                                            style={{
                                                width: '100%',
                                                padding: '1rem',
                                                background: isEditing ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.02)',
                                                border: isEditing ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.05)',
                                                borderRadius: '0.75rem',
                                                color: 'white',
                                                fontSize: '1rem',
                                                transition: 'all 0.2s'
                                            }}
                                        />
                                    </div>

                                    {/* Bio Input */}
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#94a3b8', marginBottom: '0.5rem' }}>Professional Bio</label>
                                        <textarea
                                            name="bio"
                                            value={formData.bio}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            rows="4"
                                            placeholder="Share your expertise and background..."
                                            style={{
                                                width: '100%',
                                                padding: '1rem',
                                                background: isEditing ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.02)',
                                                border: isEditing ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.05)',
                                                borderRadius: '0.75rem',
                                                color: 'white',
                                                fontSize: '1rem',
                                                fontFamily: 'inherit',
                                                resize: 'vertical',
                                                transition: 'all 0.2s'
                                            }}
                                        />
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                                    System Information
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                                    {/* Department - READ ONLY */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#94a3b8' }}>Department</label>
                                            <span style={{ fontSize: '0.75rem', color: GOLD_ACCENT, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <Star size={12} fill="currentColor" /> Admin Assigned
                                            </span>
                                        </div>
                                        <div style={{
                                            width: '100%',
                                            padding: '1rem',
                                            background: 'rgba(234, 179, 8, 0.05)',
                                            border: '1px solid rgba(234, 179, 8, 0.1)',
                                            borderRadius: '0.75rem',
                                            color: '#fbbf24', // Gold text
                                            fontSize: '1rem',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}>
                                            <Building size={18} /> {formData.department || 'Not Assigned'}
                                        </div>
                                        <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                                            Department assignment can only be changed by system administrators.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {isEditing && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1rem' }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditing(false);
                                            // Reset
                                            setFormData({
                                                displayName: user.displayName || '',
                                                phone: user.phone || '',
                                                department: user.department || '',
                                                bio: user.bio || '',
                                                email: user.email || ''
                                            });
                                        }}
                                        disabled={loading}
                                        style={{
                                            padding: '0.875rem 1.5rem',
                                            background: 'transparent',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            color: '#94a3b8',
                                            borderRadius: '0.75rem',
                                            cursor: 'pointer',
                                            fontWeight: 600
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        style={{
                                            padding: '0.875rem 2.5rem',
                                            background: `linear-gradient(135deg, ${GOLD_ACCENT}, #d97706)`,
                                            border: 'none',
                                            color: 'white',
                                            borderRadius: '0.75rem',
                                            cursor: loading ? 'wait' : 'pointer',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)'
                                        }}
                                    >
                                        {loading ? 'Saving...' : (
                                            <>
                                                <Save size={18} /> Save Changes
                                            </>
                                        )}
                                    </button>
                                </motion.div>
                            )}
                        </form>
                    </motion.div>
                </div>
            </motion.div>
        </DashboardLayout>
    );
};

export default UserProfile;
