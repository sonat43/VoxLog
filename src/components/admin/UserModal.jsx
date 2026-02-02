import React, { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, Loader2, User, Briefcase, MapPin, Shield } from 'lucide-react';
import { getDepartments } from '../../services/academicService';

const UserModal = ({ isOpen, onClose, onSubmit, editingUser = null }) => {
    const [departments, setDepartments] = useState([]);
    const [activeTab, setActiveTab] = useState('account');
    const [formData, setFormData] = useState({
        // Auth
        displayName: '', email: '', role: 'faculty', status: 'active',
        // Identity
        gender: '', dateOfBirth: '', nationality: '', maritalStatus: '',
        // Professional
        department: '', designation: '', employeeId: '', joiningDate: '',
        specialization: '', qualifications: '', experience: '',
        // Contact
        phone: '', address: '', city: '', state: '', zipCode: '',
        // Emergency
        emergencyContactName: '', emergencyContactRelation: '', emergencyContactPhone: '',
        // Web
        linkedInProfile: '', googleScholarProfile: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchDepts = async () => {
            try {
                const depts = await getDepartments();
                setDepartments(depts);
            } catch (error) {
                console.error("Failed to fetch departments", error);
            }
        };
        fetchDepts();

        if (editingUser) {
            setFormData({
                ...editingUser,
                // Ensure defaults for potentially undefined new fields
                gender: editingUser.gender || '',
                dateOfBirth: editingUser.dateOfBirth || '',
                nationality: editingUser.nationality || '',
                maritalStatus: editingUser.maritalStatus || '',
                department: editingUser.department || '',
                designation: editingUser.designation || '',
                employeeId: editingUser.employeeId || '',
                joiningDate: editingUser.joiningDate || '',
                specialization: editingUser.specialization || '',
                qualifications: editingUser.qualifications || '',
                experience: editingUser.experience || '',
                phone: editingUser.phone || '',
                address: editingUser.address || '',
                city: editingUser.city || '',
                state: editingUser.state || '',
                zipCode: editingUser.zipCode || '',
                emergencyContactName: editingUser.emergencyContactName || '',
                emergencyContactRelation: editingUser.emergencyContactRelation || '',
                emergencyContactPhone: editingUser.emergencyContactPhone || '',
                linkedInProfile: editingUser.linkedInProfile || '',
                googleScholarProfile: editingUser.googleScholarProfile || ''
            });
        } else {
            setFormData({
                displayName: '', email: '', role: 'faculty', status: 'active',
                gender: '', dateOfBirth: '', nationality: '', maritalStatus: '',
                department: '', designation: '', employeeId: '', joiningDate: '',
                specialization: '', qualifications: '', experience: '',
                phone: '', address: '', city: '', state: '', zipCode: '',
                emergencyContactName: '', emergencyContactRelation: '', emergencyContactPhone: '',
                linkedInProfile: '', googleScholarProfile: ''
            });
        }
    }, [editingUser, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        onSubmit(formData);
        setLoading(false);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (checked ? 'active' : 'disabled') : value
        }));
    };

    const TabButton = ({ id, label, icon: Icon }) => (
        <button
            type="button"
            onClick={() => setActiveTab(id)}
            style={{
                background: activeTab === id ? 'rgba(20, 184, 166, 0.1)' : 'transparent',
                color: activeTab === id ? '#2dd4bf' : '#9ca3af',
                border: 'none',
                borderBottom: activeTab === id ? '2px solid #2dd4bf' : '2px solid transparent',
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                transition: 'all 0.2s'
            }}
        >
            <Icon size={16} /> {label}
        </button>
    );

    const inputStyle = {
        padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #4b5563',
        background: '#374151', color: 'white', outline: 'none', width: '100%'
    };

    const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#d1d5db', marginBottom: '0.4rem' };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div style={{
                background: '#1f2937', borderRadius: '1rem',
                width: '95%', maxWidth: '800px', maxHeight: '90vh',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'white', fontWeight: 700 }}>
                        {editingUser ? 'Edit User Profile' : 'Provision New User'}
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}><X size={20} /></button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0 1rem' }}>
                    <TabButton id="account" label="Account" icon={Shield} />
                    <TabButton id="identity" label="Identity" icon={User} />
                    <TabButton id="professional" label="Professional" icon={Briefcase} />
                    <TabButton id="contact" label="Contact" icon={MapPin} />
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>

                    {/* ACCOUNT TAB */}
                    {activeTab === 'account' && (
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div>
                                    <label style={labelStyle}>Full Name <span style={{ color: '#f87171' }}>*</span></label>
                                    <input type="text" name="displayName" value={formData.displayName} onChange={handleChange} required style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Email <span style={{ color: '#f87171' }}>*</span></label>
                                    <input type="email" name="email" value={formData.email} onChange={handleChange} required disabled={!!editingUser} style={{ ...inputStyle, cursor: editingUser ? 'not-allowed' : 'text', opacity: editingUser ? 0.7 : 1 }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div>
                                    <label style={labelStyle}>System Role</label>
                                    <select name="role" value={formData.role} onChange={handleChange} style={inputStyle}>
                                        <option value="faculty">Faculty</option>
                                        <option value="admin">Administrator</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Account Status</label>
                                    <select name="status" value={formData.status} onChange={handleChange} style={inputStyle}>
                                        <option value="active">Active</option>
                                        <option value="disabled">Disabled</option>
                                    </select>
                                </div>
                            </div>

                            {!editingUser && (
                                <div style={{ padding: '1rem', background: 'rgba(20, 184, 166, 0.1)', border: '1px solid rgba(20, 184, 166, 0.2)', borderRadius: '0.5rem', fontSize: '0.9rem', color: '#2dd4bf', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <AlertTriangle size={16} />
                                    New users will receive an email to set their password.
                                </div>
                            )}
                        </div>
                    )}

                    {/* IDENTITY TAB */}
                    {activeTab === 'identity' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div>
                                <label style={labelStyle}>Gender</label>
                                <select name="gender" value={formData.gender} onChange={handleChange} style={inputStyle}>
                                    <option value="">Select...</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Date of Birth</label>
                                <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Nationality</label>
                                <input type="text" name="nationality" value={formData.nationality} onChange={handleChange} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Marital Status</label>
                                <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} style={inputStyle}>
                                    <option value="">Select...</option>
                                    <option value="Single">Single</option>
                                    <option value="Married">Married</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* PROFESSIONAL TAB */}
                    {activeTab === 'professional' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div>
                                <label style={labelStyle}>Department</label>
                                <select name="department" value={formData.department} onChange={handleChange} style={inputStyle}>
                                    <option value="">Select...</option>
                                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Designation</label>
                                <input type="text" name="designation" placeholder="e.g. Assistant Professor" value={formData.designation} onChange={handleChange} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Employee ID</label>
                                <input type="text" name="employeeId" value={formData.employeeId} onChange={handleChange} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Joining Date</label>
                                <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} style={inputStyle} />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={labelStyle}>Specialization</label>
                                <input type="text" name="specialization" value={formData.specialization} onChange={handleChange} style={inputStyle} />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={labelStyle}>Qualifications</label>
                                <input type="text" name="qualifications" value={formData.qualifications} onChange={handleChange} style={inputStyle} />
                            </div>
                        </div>
                    )}

                    {/* CONTACT TAB */}
                    {activeTab === 'contact' && (
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div>
                                    <label style={labelStyle}>Phone Number</label>
                                    <input type="text" name="phone" value={formData.phone} onChange={handleChange} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>City</label>
                                    <input type="text" name="city" value={formData.city} onChange={handleChange} style={inputStyle} />
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Address</label>
                                <input type="text" name="address" value={formData.address} onChange={handleChange} style={inputStyle} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div>
                                    <label style={labelStyle}>State</label>
                                    <input type="text" name="state" value={formData.state} onChange={handleChange} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Zip Code</label>
                                    <input type="text" name="zipCode" value={formData.zipCode} onChange={handleChange} style={inputStyle} />
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                                <h4 style={{ color: '#f87171', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>Emergency Contact</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                    <input type="text" name="emergencyContactName" placeholder="Name" value={formData.emergencyContactName} onChange={handleChange} style={inputStyle} />
                                    <input type="text" name="emergencyContactRelation" placeholder="Relation" value={formData.emergencyContactRelation} onChange={handleChange} style={inputStyle} />
                                    <input type="text" name="emergencyContactPhone" placeholder="Phone" value={formData.emergencyContactPhone} onChange={handleChange} style={inputStyle} />
                                </div>
                            </div>
                        </div>
                    )}

                </form>

                {/* Footer */}
                <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button onClick={onClose} type="button" style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: '1px solid #4b5563', background: 'transparent', color: '#e5e7eb', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleSubmit} type="button" disabled={loading} style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none', background: '#14b8a6', color: 'white', fontWeight: 600, cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {loading && <Loader2 className="animate-spin" size={16} />}
                        {editingUser ? 'Save Changes' : 'Provision User'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserModal;
