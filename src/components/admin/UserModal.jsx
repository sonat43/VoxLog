import React, { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, Loader2 } from 'lucide-react';

const UserModal = ({ isOpen, onClose, onSubmit, editingUser = null }) => {
    const [formData, setFormData] = useState({
        displayName: '',
        email: '',
        department: '',
        role: 'faculty',
        status: 'active'
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (editingUser) {
            setFormData(editingUser);
        } else {
            setFormData({
                displayName: '',
                email: '',
                department: '',
                role: 'faculty', // Default per requirements
                status: 'active'
            });
        }
    }, [editingUser, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        onSubmit(formData);
        setLoading(false);
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(5px)'
        }}>
            <div style={{
                background: '#1f2937',
                borderRadius: '1rem',
                width: '100%', maxWidth: '500px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'white' }}>
                        {editingUser ? 'Edit User Profile' : 'Provision New User'}
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    {/* Name */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#e5e7eb' }}>Full Name <span style={{ color: '#f87171' }}>*</span></label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Dr. Sarah Connor"
                            value={formData.displayName}
                            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                            style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #4b5563', background: '#374151', color: 'white', outline: 'none' }}
                        />
                    </div>

                    {/* Email */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#e5e7eb' }}>Email Address <span style={{ color: '#f87171' }}>*</span></label>
                        <input
                            type="email"
                            required
                            disabled={!!editingUser} // Cannot change email typically
                            placeholder="user@university.edu"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            style={{
                                padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #4b5563',
                                background: editingUser ? 'rgba(55, 65, 81, 0.5)' : '#374151',
                                color: editingUser ? '#9ca3af' : 'white',
                                outline: 'none',
                                cursor: editingUser ? 'not-allowed' : 'text'
                            }}
                        />
                        {!editingUser && <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>User will receive a secure link to set their password.</span>}
                    </div>

                    {/* Password Handling */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#e5e7eb' }}>Security Credential</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {/* Toggle Option */}
                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#d1d5db' }}>
                                    <input
                                        type="radio"
                                        name="passwordMethod"
                                        checked={!formData.setPassword}
                                        onChange={() => setFormData({ ...formData, setPassword: false, password: '' })}
                                        style={{ accentColor: '#14b8a6' }}
                                    />
                                    Send Reset Link (Recommended)
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#d1d5db' }}>
                                    <input
                                        type="radio"
                                        name="passwordMethod"
                                        checked={formData.setPassword}
                                        onChange={() => setFormData({ ...formData, setPassword: true })}
                                        style={{ accentColor: '#14b8a6' }}
                                    />
                                    Set Password Now
                                </label>
                            </div>

                            {/* Password Context */}
                            {!formData.setPassword ? (
                                <div style={{
                                    padding: '0.75rem', background: 'rgba(20, 184, 166, 0.1)',
                                    border: '1px solid rgba(20, 184, 166, 0.2)', borderRadius: '0.5rem',
                                    display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#2dd4bf'
                                }}>
                                    <AlertTriangle size={14} />
                                    <span>User will receive an email to securely create their own password.</span>
                                </div>
                            ) : (
                                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                                    <input
                                        type="password"
                                        placeholder="Enter initial password (min. 6 chars)"
                                        value={formData.password || ''}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required={formData.setPassword}
                                        style={{
                                            width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
                                            border: '1px solid #4b5563', background: '#374151', color: 'white', outline: 'none'
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Department */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#e5e7eb' }}>Department / Division</label>
                        <select
                            value={formData.department}
                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #4b5563', background: '#374151', color: 'white', outline: 'none' }}
                        >
                            <option value="">Select Department...</option>
                            <option value="Computer Science">Computer Science</option>
                            <option value="Electronics">Electronics</option>
                            <option value="Mechanical">Mechanical</option>
                            <option value="Civil">Civil</option>
                            <option value="Administration">Administration</option>
                        </select>
                    </div>

                    {/* Role Selection */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#e5e7eb' }}>System Role <span style={{ color: '#f87171' }}>*</span></label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <label style={{
                                flex: 1, cursor: 'pointer', padding: '0.75rem', borderRadius: '0.5rem', border: `1px solid ${formData.role === 'faculty' ? '#14b8a6' : '#4b5563'}`,
                                background: formData.role === 'faculty' ? 'rgba(20, 184, 166, 0.1)' : 'transparent',
                                display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}>
                                <input
                                    type="radio"
                                    name="role"
                                    value="faculty"
                                    checked={formData.role === 'faculty'}
                                    onChange={() => setFormData({ ...formData, role: 'faculty' })}
                                />
                                <span style={{ color: 'white' }}>Faculty</span>
                            </label>

                            <label style={{
                                flex: 1, cursor: 'pointer', padding: '0.75rem', borderRadius: '0.5rem', border: `1px solid ${formData.role === 'admin' ? '#8b5cf6' : '#4b5563'}`,
                                background: formData.role === 'admin' ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                                display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}>
                                <input
                                    type="radio"
                                    name="role"
                                    value="admin"
                                    checked={formData.role === 'admin'}
                                    onChange={() => setFormData({ ...formData, role: 'admin' })}
                                />
                                <span style={{ color: 'white' }}>Administrator</span>
                            </label>
                        </div>
                    </div>

                    {/* Initial Status (Only for new users or explicitly editing) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <input
                            type="checkbox"
                            id="status"
                            checked={formData.status === 'active'}
                            onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 'active' : 'disabled' })}
                            style={{ width: '16px', height: '16px', accentColor: '#14b8a6' }}
                        />
                        <label htmlFor="status" style={{ color: '#e5e7eb', fontSize: '0.9rem' }}>Account is Active</label>
                    </div>

                    {/* Footer Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: '1px solid #4b5563', background: 'transparent', color: '#e5e7eb', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none',
                                background: '#14b8a6', color: 'white', fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}
                        >
                            {loading && <Loader2 className="animate-spin" size={16} />}
                            {editingUser ? 'Save Changes' : 'Provision User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserModal;
