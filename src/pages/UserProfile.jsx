import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Building, Save, CheckCircle, AlertCircle, Phone, FileText } from 'lucide-react';
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
        email: '', // Read only
    });
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);

    useEffect(() => {
        if (user) {
            setFormData({
                displayName: user.displayName || '',
                phone: user.phone || '', // Check if phone exists in user doc
                department: user.department || '',
                bio: user.bio || '', // Check if bio exists
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
            await updateDoc(userRef, {
                displayName: formData.displayName,
                phone: formData.phone,
                department: formData.department,
                bio: formData.bio
            });
            setStatus('success');
            setIsEditing(false);
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
                style={{
                    maxWidth: '800px',
                    margin: '0 auto',
                    paddingBottom: '2rem'
                }}
            >
                {/* Header */}
                <div style={{
                    marginBottom: '2rem',
                    borderBottom: '1px solid var(--color-border)',
                    paddingBottom: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>
                            My Profile
                        </h1>
                        <p style={{ color: 'var(--color-text-muted)' }}>
                            Update your photo and personal details here.
                        </p>
                    </div>
                </div>

                {/* Status Messages */}
                {status && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        style={{
                            background: status === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${status === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                            color: status === 'success' ? 'var(--color-success)' : 'var(--color-error)',
                            padding: '1rem',
                            borderRadius: '0.5rem',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        {status === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        {status === 'success' ? 'Changes saved successfully.' : 'Failed to save changes.'}
                    </motion.div>
                )}

                <div style={{
                    background: 'var(--color-surface)',
                    borderRadius: '1rem',
                    border: '1px solid var(--color-border)',
                    overflow: 'hidden'
                }}>
                    {/* Banner / Cover */}
                    <div style={{ height: '120px', background: 'linear-gradient(to right, var(--color-primary), var(--color-accent))', opacity: 0.8 }} />

                    <div style={{ padding: '0 2rem 2rem 2rem', position: 'relative' }}>
                        {/* Avatar Overlay */}
                        <div style={{
                            marginTop: '-40px',
                            marginBottom: '2rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-end'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem' }}>
                                <div style={{
                                    width: '96px',
                                    height: '96px',
                                    borderRadius: '50%',
                                    background: '#1f2937',
                                    border: '4px solid var(--color-surface)',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '2.5rem',
                                    fontWeight: 700
                                }}>
                                    {formData.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                                </div>
                                <div style={{ marginBottom: '0.5rem' }}>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', margin: 0 }}>
                                        {formData.displayName || 'User'}
                                    </h2>
                                    <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
                                        {formData.email}
                                    </p>
                                </div>
                            </div>

                            {!isEditing && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: 'transparent',
                                        border: '1px solid var(--color-border)',
                                        color: 'white',
                                        borderRadius: '0.5rem',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        fontWeight: 500,
                                        marginBottom: '0.5rem'
                                    }}
                                >
                                    Edit Profile
                                </button>
                            )}
                        </div>

                        {/* Form Section */}
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                                {/* Personal Info Section */}
                                <div style={{ gridColumn: 'span 2' }}>
                                    <h4 style={{ color: 'white', margin: '0 0 1rem 0', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>
                                        Personal Information
                                    </h4>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>Display Name</label>
                                    <div style={{ position: 'relative' }}>
                                        <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                                        <input
                                            type="text"
                                            name="displayName"
                                            value={formData.displayName}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder="Your full name"
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem 1rem 0.75rem 2.75rem',
                                                background: isEditing ? 'rgba(0,0,0,0.2)' : 'transparent',
                                                border: isEditing ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                                                borderRadius: '0.5rem',
                                                color: 'white',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>Phone Number</label>
                                    <div style={{ position: 'relative' }}>
                                        <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                                        <input
                                            type="text"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder="+1 (555) 000-0000"
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem 1rem 0.75rem 2.75rem',
                                                background: isEditing ? 'rgba(0,0,0,0.2)' : 'transparent',
                                                border: isEditing ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                                                borderRadius: '0.5rem',
                                                color: 'white',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>Bio / About</label>
                                    <div style={{ position: 'relative' }}>
                                        <FileText size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', color: '#6b7280' }} />
                                        <textarea
                                            name="bio"
                                            value={formData.bio}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            rows="3"
                                            placeholder="Tell us a little bit about yourself..."
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem 1rem 0.75rem 2.75rem',
                                                background: isEditing ? 'rgba(0,0,0,0.2)' : 'transparent',
                                                border: isEditing ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                                                borderRadius: '0.5rem',
                                                color: 'white',
                                                outline: 'none',
                                                resize: 'none',
                                                fontFamily: 'inherit'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Academic Info Section */}
                                <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
                                    <h4 style={{ color: 'white', margin: '0 0 1rem 0', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>
                                        Academic Credentials
                                    </h4>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>Department</label>
                                    <div style={{ position: 'relative' }}>
                                        <Building size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                                        <input
                                            type="text"
                                            name="department"
                                            value={formData.department}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder="e.g. Computer Science"
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem 1rem 0.75rem 2.75rem',
                                                background: isEditing ? 'rgba(0,0,0,0.2)' : 'transparent',
                                                border: isEditing ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                                                borderRadius: '0.5rem',
                                                color: 'white',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>Email Address</label>
                                    <div style={{ position: 'relative' }}>
                                        <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                                        <input
                                            type="email"
                                            value={formData.email}
                                            disabled
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem 1rem 0.75rem 2.75rem',
                                                background: 'rgba(255,255,255,0.02)', // Visibly disabled
                                                border: '1px solid var(--color-border)',
                                                borderRadius: '0.5rem',
                                                color: 'var(--color-text-muted)',
                                                cursor: 'not-allowed'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            {isEditing && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditing(false);
                                            // Reset to initial values
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
                                            padding: '0.625rem 1.25rem',
                                            background: 'transparent',
                                            border: '1px solid var(--color-border)',
                                            color: 'var(--color-text-muted)',
                                            borderRadius: '0.5rem',
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
                                            padding: '0.625rem 1.25rem',
                                            background: 'var(--color-primary)',
                                            border: 'none',
                                            color: 'white',
                                            borderRadius: '0.5rem',
                                            cursor: loading ? 'wait' : 'pointer',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        {loading ? 'Saving...' : (
                                            <>
                                                <Save size={18} /> Save Changes
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </motion.div>
        </DashboardLayout>
    );
};

export default UserProfile;
