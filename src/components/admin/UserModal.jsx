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
    const [errors, setErrors] = useState({});
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
        setErrors({});
    }, [editingUser, isOpen]);

    if (!isOpen) return null;

    const validateField = (name, value) => {
        let error = "";

        // Required Fields List
        const requiredFields = [
            'displayName', 'email', 'role', 'status',
            'gender', 'dateOfBirth', 'nationality', 'maritalStatus',
            'department', 'designation', 'employeeId', 'joiningDate',
            'specialization', 'qualifications', 'experience',
            'phone', 'address', 'city', 'state', 'zipCode',
            'emergencyContactName', 'emergencyContactRelation', 'emergencyContactPhone'
        ];

        if (requiredFields.includes(name)) {
            if (!value || value.toString().trim() === '') {
                error = "This field is required.";
            }
        }

        // Specific Validations
        if (name === 'phone' || name === 'emergencyContactPhone') {
            if (value) {
                if (!/^\d{10}$/.test(value)) {
                    error = "Must be exactly 10 digits.";
                } else if (/^(\d)\1{9}$/.test(value)) {
                    error = "Invalid phone number (repeating digits).";
                }
            }
        }

        if (name === 'email') {
            if (value && !/\S+@\S+\.\S+/.test(value)) {
                error = "Invalid email address.";
            }
        }

        return error;
    };

    const validateForm = () => {
        const newErrors = {};
        let isValid = true;

        // Validate all keys in formData that are relevant
        // We can just iterate over our required list + check specifics
        const allFields = Object.keys(formData);

        allFields.forEach(field => {
            const error = validateField(field, formData[field]);
            if (error) {
                newErrors[field] = error;
                isValid = false;
            }
        });

        setErrors(newErrors);
        return isValid;
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? (checked ? 'active' : 'disabled') : value;

        setFormData(prev => ({
            ...prev,
            [name]: newValue
        }));

        // Realtime Validation
        const error = validateField(name, newValue);
        setErrors(prev => ({
            ...prev,
            [name]: error
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            // Optional: alert or just focus first error
            // alert("Please fix the errors in the form.");
            return;
        }

        setLoading(true);
        onSubmit(formData);
        setLoading(false);
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

    const inputStyle = (hasError) => ({
        padding: '0.75rem', borderRadius: '0.5rem',
        border: hasError ? '1px solid #ef4444' : '1px solid #4b5563',
        background: '#374151', color: 'white', outline: 'none', width: '100%'
    });

    const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#d1d5db', marginBottom: '0.4rem' };
    const errorStyle = { color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' };

    // Helper for rendering inputs with error
    const renderInput = (label, name, type = "text", required = false, disabled = false) => (
        <div>
            <label style={labelStyle}>{label} {required && <span style={{ color: '#f87171' }}>*</span>}</label>
            <input
                type={type}
                name={name}
                value={formData[name]}
                onChange={handleChange}
                style={inputStyle(!!errors[name])}
                disabled={disabled}
            />
            {errors[name] && <div style={errorStyle}>{errors[name]}</div>}
        </div>
    );

    // Helper for Selects
    const renderSelect = (label, name, options, required = false) => (
        <div>
            <label style={labelStyle}>{label} {required && <span style={{ color: '#f87171' }}>*</span>}</label>
            <select
                name={name}
                value={formData[name]}
                onChange={handleChange}
                style={inputStyle(!!errors[name])}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            {errors[name] && <div style={errorStyle}>{errors[name]}</div>}
        </div>
    );

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
                                {renderInput("Full Name", "displayName", "text", true)}
                                {renderInput("Email", "email", "email", true, !!editingUser)}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                {renderSelect("System Role", "role", [
                                    { value: "faculty", label: "Faculty" },
                                    { value: "admin", label: "Administrator" }
                                ], true)}
                                {renderSelect("Account Status", "status", [
                                    { value: "active", label: "Active" },
                                    { value: "disabled", label: "Disabled" }
                                ], true)}
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
                            {renderSelect("Gender", "gender", [
                                { value: "", label: "Select..." },
                                { value: "Male", label: "Male" },
                                { value: "Female", label: "Female" },
                                { value: "Other", label: "Other" }
                            ])}
                            {renderInput("Date of Birth", "dateOfBirth", "date")}
                            {renderInput("Nationality", "nationality")}
                            {renderSelect("Marital Status", "maritalStatus", [
                                { value: "", label: "Select..." },
                                { value: "Single", label: "Single" },
                                { value: "Married", label: "Married" }
                            ])}
                        </div>
                    )}

                    {/* PROFESSIONAL TAB */}
                    {activeTab === 'professional' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div>
                                <label style={labelStyle}>Department</label>
                                <select
                                    name="department"
                                    value={formData.department}
                                    onChange={handleChange}
                                    style={inputStyle(!!errors.department)}
                                >
                                    <option value="">Select...</option>
                                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                </select>
                                {errors.department && <div style={errorStyle}>{errors.department}</div>}
                            </div>
                            {renderInput("Designation", "designation")}
                            {renderInput("Employee ID", "employeeId")}
                            {renderInput("Joining Date", "joiningDate", "date")}
                            <div style={{ gridColumn: 'span 2' }}>
                                {renderInput("Specialization", "specialization")}
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                {renderInput("Qualifications", "qualifications")}
                            </div>
                        </div>
                    )}

                    {/* CONTACT TAB */}
                    {activeTab === 'contact' && (
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                {renderInput("Phone Number", "phone")}
                                {renderInput("City", "city")}
                            </div>
                            {renderInput("Address", "address")}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                {renderInput("State", "state")}
                                {renderInput("Zip Code", "zipCode")}
                            </div>

                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                                <h4 style={{ color: '#f87171', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>Emergency Contact</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                    {renderInput("Name", "emergencyContactName")}
                                    {renderInput("Relation", "emergencyContactRelation")}
                                    {renderInput("Phone", "emergencyContactPhone")}
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
