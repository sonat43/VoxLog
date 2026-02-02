
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Building, Save, CheckCircle, AlertCircle, Phone, Edit2, X, Star, Calendar, MapPin, Briefcase, GraduationCap, Droplet, Globe, Linkedin, BookOpen, Heart, Shield, Camera, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../services/firebase';


const UserProfile = () => {
    const { user, role } = useAuth();
    const [formData, setFormData] = useState({
        displayName: '',
        phone: '',
        department: '',
        bio: '',
        email: '',
        photoURL: '',
        // New Fields
        gender: '',
        dateOfBirth: '',
        bloodGroup: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        qualifications: '',
        experience: '',
        joiningDate: ''
    });
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);
    const [activeTab, setActiveTab] = useState('personal');

    // Premium Gold Accent Color for "Precious" feel
    const GOLD_ACCENT = '#fbbf24';

    useEffect(() => {
        if (user) {
            setFormData({
                displayName: user.displayName || '',
                phone: user.phone || '',
                department: user.department || '',
                bio: user.bio || '',
                email: user.email || '',
                gender: user.gender || '',
                dateOfBirth: user.dateOfBirth || '',
                bloodGroup: user.bloodGroup || '',
                address: user.address || '',
                city: user.city || '',
                state: user.state || '',
                zipCode: user.zipCode || '',
                qualifications: user.qualifications || '',
                experience: user.experience || '',
                joiningDate: user.joiningDate || '',
                photoURL: user.photoURL || ''
            });
        }
    }, [user, role]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (status) setStatus(null);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validations
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            alert('File size should be less than 5MB');
            return;
        }

        setLoading(true);
        setStatus(null);
        // Debugging Alert
        setLoading(true);
        setStatus(null);
        // Debugging Alert Removed

        try {
            // Strict filepath per security rules: profile_photos/<uid>
            // We overwrite the existing file.
            const storageRef = ref(storage, `profile_photos/${user.uid}`);

            // Upload the file
            await uploadBytes(storageRef, file);

            // Get the download URL
            const photoURL = await getDownloadURL(storageRef);
            console.log("Uploaded Image URL:", photoURL);

            // Update Firestore
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { photoURL });

            // Force visual refresh
            const uniqueURL = `${photoURL}?t=${Date.now()}`;
            setFormData(prev => ({ ...prev, photoURL: uniqueURL }));

            alert("Profile Picture Updated Successfully!");
            setStatus('success');
            setTimeout(() => setStatus(null), 3000);
        } catch (error) {
            console.error("Error uploading image:", error);
            // Show specific error if possible
            let errorMessage = 'Error uploading image';
            if (error.code === 'storage/unauthorized') {
                errorMessage = 'Permission denied. Check Firebase Storage rules.';
            } else if (error.code === 'storage/canceled') {
                errorMessage = 'Upload canceled.';
            } else if (error.code === 'storage/unknown') {
                errorMessage = 'Unknown error occurred. Please try again.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            alert("Upload Failed: " + errorMessage); // Explicit Alert
            setStatus('error:' + errorMessage);
        } finally {
            setLoading(false);
        }
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
                bio: formData.bio,
                gender: formData.gender,
                dateOfBirth: formData.dateOfBirth,
                bloodGroup: formData.bloodGroup,
                address: formData.address,
                city: formData.city,
                state: formData.state,
                zipCode: formData.zipCode,
                qualifications: formData.qualifications,
                experience: formData.experience,
                joiningDate: formData.joiningDate,
                nationality: formData.nationality,
                maritalStatus: formData.maritalStatus,
                designation: formData.designation,
                specialization: formData.specialization,
                emergencyContactName: formData.emergencyContactName,
                emergencyContactRelation: formData.emergencyContactRelation,
                emergencyContactPhone: formData.emergencyContactPhone,
                linkedInProfile: formData.linkedInProfile,
                googleScholarProfile: formData.googleScholarProfile
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

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    // Helper to render field or placeholder
    const DisplayField = ({ label, value, icon: Icon }) => (
        <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.25rem' }}>{label}</label>
            <div style={{ color: 'white', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {Icon && <Icon size={16} color="#64748b" />}
                {value || <span style={{ color: '#475569', fontStyle: 'italic' }}>Not set</span>}
            </div>
        </div>
    );

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}
        >
            {/* Page Header */}
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
                    My Profile
                </h1>
                <p style={{ color: '#9ca3af', fontSize: '1.1rem' }}>
                    Manage your complete personal and professional profile.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '2rem', alignItems: 'start' }}>

                {/* LEFT COLUMN: IDENTITY CARD */}
                <motion.div variants={itemVariants} style={{
                    background: 'rgba(30, 41, 59, 0.4)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '1.5rem',
                    padding: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '6px',
                        background: 'linear-gradient(90deg, #06b6d4, #3b82f6)'
                    }}></div>

                    <div style={{
                        width: '120px', height: '120px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                        border: '4px solid rgba(255,255,255,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '3rem', fontWeight: 700, color: 'white',
                        marginBottom: '1.5rem',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {formData.photoURL ? (
                            <img
                                src={formData.photoURL.includes('?') ? formData.photoURL : `${formData.photoURL}?t=${new Date().getTime()}`}
                                key={formData.photoURL}
                                alt="Profile"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            formData.displayName ? formData.displayName.charAt(0).toUpperCase() : 'U'
                        )}

                        {/* Overlay for Image Upload */}
                        <label htmlFor="profile-upload" style={{
                            position: 'absolute', bottom: 0, left: 0, width: '100%', height: '30%',
                            background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', transition: 'background 0.2s',
                        }}>
                            <Camera size={16} color="white" />
                        </label>
                        <input
                            id="profile-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            style={{ display: 'none' }}
                        />
                    </div>

                    <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                        {formData.displayName || 'Faculty Member'}
                    </h2>

                    <div style={{
                        background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee',
                        padding: '0.25rem 1rem', borderRadius: '999px',
                        fontSize: '0.875rem', fontWeight: 600, marginBottom: '1.5rem',
                        border: '1px solid rgba(6, 182, 212, 0.3)'
                    }}>
                        Faculty
                    </div>

                    <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                <Building size={18} className="text-gray-400" />
                                <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">Department</span>
                            </div>
                            <div className="text-white font-medium pl-8">{formData.department || 'N/A'}</div>
                        </div>

                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                <Mail size={18} className="text-gray-400" />
                                <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">Email</span>
                            </div>
                            <div className="text-white font-medium pl-8" style={{ wordBreak: 'break-all', fontSize: '0.9rem' }}>{formData.email}</div>
                        </div>

                        <button
                            onClick={() => setIsEditing(true)}
                            style={{
                                width: '100%', padding: '0.75rem',
                                background: 'white', color: 'black',
                                borderRadius: '0.75rem', border: 'none',
                                fontWeight: 600, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                transition: 'transform 0.2s',
                                marginTop: '1rem'
                            }}
                        >
                            <Edit2 size={16} /> Edit Profile
                        </button>
                    </div>
                </motion.div>

                {/* RIGHT COLUMN: DETAILS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* SECTION: ACADEMIC BIO & OVERVIEW */}
                    <motion.div variants={itemVariants} style={{
                        background: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '1.5rem', padding: '2rem'
                    }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <BookOpen size={20} color={GOLD_ACCENT} /> Professional Bio
                        </h3>
                        <div style={{ color: '#cbd5e1', lineHeight: '1.7', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '1rem', borderLeft: `3px solid ${GOLD_ACCENT}` }}>
                            {formData.bio || <span style={{ fontStyle: 'italic', color: '#64748b' }}>No professional bio available.</span>}
                        </div>
                    </motion.div>

                    {/* TWO COLUMN ACADEMIC LAYOUT */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>

                        {/* LEFT: PERSONAL & CONTACT SIDEBAR */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            {/* Contact Card */}
                            <motion.div variants={itemVariants} style={{
                                background: 'rgba(15, 23, 42, 0.6)', borderRadius: '1rem', padding: '1.5rem',
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                <h4 style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Contact Details</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                        <Phone size={16} color={GOLD_ACCENT} style={{ marginTop: '3px' }} />
                                        <div>
                                            <div style={{ fontSize: '0.9rem', color: 'white' }}>{formData.phone || 'N/A'}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Mobile</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                        <MapPin size={16} color={GOLD_ACCENT} style={{ marginTop: '3px' }} />
                                        <div>
                                            <div style={{ fontSize: '0.9rem', color: 'white' }}>{formData.city}, {formData.state}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{formData.address}</div>
                                        </div>
                                    </div>
                                    {/* Socials */}
                                    {(formData.linkedInProfile || formData.googleScholarProfile) && (
                                        <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '1rem' }}>
                                            {formData.linkedInProfile && (
                                                <a href={formData.linkedInProfile} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', transition: 'color 0.2s' }}>
                                                    <Linkedin size={20} />
                                                </a>
                                            )}
                                            {formData.googleScholarProfile && (
                                                <a href={formData.googleScholarProfile} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', transition: 'color 0.2s' }}>
                                                    <Globe size={20} />
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            {/* Personal Details Card */}
                            <motion.div variants={itemVariants} style={{
                                background: 'rgba(15, 23, 42, 0.6)', borderRadius: '1rem', padding: '1.5rem',
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                <h4 style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Personal Info</h4>
                                <div style={{ display: 'grid', gap: '0.75rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                        <span style={{ color: '#64748b' }}>Date of Birth</span>
                                        <span style={{ color: 'white' }}>{formData.dateOfBirth || '-'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                        <span style={{ color: '#64748b' }}>Gender</span>
                                        <span style={{ color: 'white' }}>{formData.gender || '-'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                        <span style={{ color: '#64748b' }}>Nationality</span>
                                        <span style={{ color: 'white' }}>{formData.nationality || '-'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                        <span style={{ color: '#64748b' }}>Marital Status</span>
                                        <span style={{ color: 'white' }}>{formData.maritalStatus || '-'}</span>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* RIGHT: PROFESSIONAL & ACADEMIC MAIN CONTENT */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                            {/* Academic Background */}
                            <motion.div variants={itemVariants} style={{
                                background: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '1.5rem', padding: '2rem'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <GraduationCap size={20} color={GOLD_ACCENT} /> Academic Background
                                        </h3>
                                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.25rem' }}>Educational qualifications and specializations.</p>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gap: '1.5rem' }}>
                                    {/* Qualifications Splitter */}
                                    <div style={{ position: 'relative', paddingLeft: '1.5rem', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                                        <div style={{ position: 'absolute', left: '-5px', top: '0', width: '8px', height: '8px', borderRadius: '50%', background: GOLD_ACCENT }}></div>
                                        <h4 style={{ color: 'white', fontSize: '1rem', fontWeight: 600 }}>Qualifications</h4>
                                        <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {formData.qualifications ? formData.qualifications.split(',').map((q, i) => (
                                                <span key={i} style={{ background: 'rgba(251, 191, 36, 0.1)', color: GOLD_ACCENT, padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 500, border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                                                    {q.trim()}
                                                </span>
                                            )) : <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Not specified</span>}
                                        </div>
                                    </div>

                                    {/* Specialization */}
                                    <div style={{ position: 'relative', paddingLeft: '1.5rem', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                                        <div style={{ position: 'absolute', left: '-5px', top: '0', width: '8px', height: '8px', borderRadius: '50%', background: '#2dd4bf' }}></div>
                                        <h4 style={{ color: 'white', fontSize: '1rem', fontWeight: 600 }}>Area of Specialization</h4>
                                        <p style={{ color: '#e2e8f0', fontSize: '0.95rem', marginTop: '0.25rem' }}>
                                            {formData.specialization || 'General'}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Current Position */}
                            <motion.div variants={itemVariants} style={{
                                background: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '1.5rem', padding: '2rem'
                            }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'white', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Briefcase size={20} color={GOLD_ACCENT} /> Professional Profile
                                </h3>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: '0.75rem' }}>
                                        <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Current Designation</div>
                                        <div style={{ color: 'white', fontSize: '1.1rem', fontWeight: 600 }}>{formData.designation}</div>
                                        <div style={{ color: GOLD_ACCENT, fontSize: '0.9rem', marginTop: '0.25rem' }}>{formData.department}</div>
                                    </div>
                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: '0.75rem' }}>
                                        <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Teaching Experience</div>
                                        <div style={{ color: 'white', fontSize: '1.1rem', fontWeight: 600 }}>{formData.experience || '0'} Years</div>
                                        <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>Since {formData.joiningDate || 'Unknown'}</div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PREMIUM EDIT MODAL */}
            <AnimatePresence>
                {isEditing && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                        display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100
                    }}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            style={{
                                background: '#1e293b',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '1.5rem',
                                width: '95%', maxWidth: '900px', maxHeight: '90vh',
                                display: 'flex', flexDirection: 'column',
                                boxShadow: '0 50px 100px -20px rgba(0,0,0,0.7)'
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <Edit2 size={24} color={GOLD_ACCENT} /> Edit Profile
                                    </h2>
                                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.25rem' }}>Update your personal information and biography.</p>
                                </div>
                                <button onClick={() => setIsEditing(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', transition: 'all 0.2s' }} className="hover:bg-red-500/20 hover:text-red-400">
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Tabs Implementation (Inline for simplicity) */}
                            {/* Tabs Implementation */}
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0 1rem' }}>
                                    {[
                                        { id: 'personal', label: 'Personal' },
                                        { id: 'contact', label: 'Contact & Web' },
                                        { id: 'professional', label: 'Professional (Read-Only)' }
                                    ].map(tab => (
                                        <div
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            style={{
                                                padding: '1rem 1.5rem', cursor: 'pointer',
                                                color: activeTab === tab.id ? GOLD_ACCENT : '#94a3b8',
                                                fontWeight: 600, fontSize: '0.95rem',
                                                borderBottom: activeTab === tab.id ? `2px solid ${GOLD_ACCENT}` : '2px solid transparent',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {tab.label}
                                        </div>
                                    ))}
                                </div>

                                <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
                                    <form id="editForm" onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

                                        {activeTab === 'personal' && (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                                <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'rgba(148, 163, 184, 0.1)', borderRadius: '0.75rem', marginBottom: '1rem' }}>
                                                    <div style={{ padding: '0.5rem', background: '#334155', borderRadius: '50%' }}><Shield size={20} color="#94a3b8" /></div>
                                                    <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Official identity fields are managed by administrators.</div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm text-gray-400 mb-1">Full Name <Shield size={12} className="inline ml-1 text-slate-600" /></label>
                                                    <input type="text" value={formData.displayName} readOnly className="w-full p-3 bg-slate-900 border border-slate-800 rounded-lg text-gray-500 cursor-not-allowed" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-gray-400 mb-1">Date of Birth</label>
                                                    <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500 outline-none transition-colors" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-gray-400 mb-1">Gender</label>
                                                    <select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500 outline-none">
                                                        <option value="">Select Gender</option>
                                                        <option value="Male">Male</option>
                                                        <option value="Female">Female</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-gray-400 mb-1">Marital Status</label>
                                                    <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500 outline-none">
                                                        <option value="">Select Status</option>
                                                        <option value="Single">Single</option>
                                                        <option value="Married">Married</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-gray-400 mb-1">Nationality</label>
                                                    <input type="text" name="nationality" value={formData.nationality} onChange={handleChange} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500 outline-none" />
                                                </div>
                                                <div style={{ gridColumn: 'span 2' }}>
                                                    <label className="block text-sm text-gray-400 mb-1">Professional Bio</label>
                                                    <textarea name="bio" value={formData.bio} onChange={handleChange} rows="4" className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500 outline-none" placeholder="Write a brief professional biography..." />
                                                </div>
                                            </motion.div>
                                        )}

                                        {activeTab === 'contact' && (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                                <div>
                                                    <label className="block text-sm text-gray-400 mb-1">Phone Number</label>
                                                    <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-gray-400 mb-1">City</label>
                                                    <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500" />
                                                </div>
                                                <div style={{ gridColumn: 'span 2' }}>
                                                    <label className="block text-sm text-gray-400 mb-1">Address</label>
                                                    <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-gray-400 mb-1">State</label>
                                                    <input type="text" name="state" value={formData.state} onChange={handleChange} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-gray-400 mb-1">Zip Code</label>
                                                    <input type="text" name="zipCode" value={formData.zipCode} onChange={handleChange} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500" />
                                                </div>

                                                {/* Socials */}
                                                <div style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '1rem', paddingTop: '1.5rem' }}>
                                                    <h4 style={{ color: '#60a5fa', fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Globe size={16} /> Web Presence</h4>
                                                    <div style={{ display: 'grid', gap: '1rem' }}>
                                                        <div>
                                                            <label className="block text-sm text-gray-400 mb-1">LinkedIn URL</label>
                                                            <input type="text" name="linkedInProfile" value={formData.linkedInProfile} onChange={handleChange} placeholder="https://linkedin.com/in/..." className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm text-gray-400 mb-1">Google Scholar URL</label>
                                                            <input type="text" name="googleScholarProfile" value={formData.googleScholarProfile} onChange={handleChange} placeholder="https://scholar.google.com/..." className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Emergency */}
                                                <div style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '1rem', paddingTop: '1.5rem' }}>
                                                    <h4 style={{ color: '#f87171', fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertCircle size={16} /> Emergency Contact</h4>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                                        <input type="text" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} placeholder="Name" className="p-3 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                                                        <input type="text" name="emergencyContactRelation" value={formData.emergencyContactRelation} onChange={handleChange} placeholder="Relation" className="p-3 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                                                        <input type="text" name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleChange} placeholder="Phone" className="p-3 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}

                                        {activeTab === 'professional' && (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                                <div style={{ padding: '1rem', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: '0.5rem', color: GOLD_ACCENT, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Lock size={16} />
                                                    These fields are synchronized with university records and cannot be edited.
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                                    <div>
                                                        <label className="block text-sm text-gray-500 mb-1">Department</label>
                                                        <input type="text" value={formData.department} readOnly className="w-full p-3 bg-slate-900 border border-slate-800 rounded-lg text-gray-600 cursor-not-allowed" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm text-gray-500 mb-1">Designation</label>
                                                        <input type="text" value={formData.designation} readOnly className="w-full p-3 bg-slate-900 border border-slate-800 rounded-lg text-gray-600 cursor-not-allowed" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm text-gray-500 mb-1">Employee ID</label>
                                                        <input type="text" value={formData.employeeId} readOnly className="w-full p-3 bg-slate-900 border border-slate-800 rounded-lg text-gray-600 cursor-not-allowed" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm text-gray-500 mb-1">Joining Date</label>
                                                        <input type="text" value={formData.joiningDate} readOnly className="w-full p-3 bg-slate-900 border border-slate-800 rounded-lg text-gray-600 cursor-not-allowed" />
                                                    </div>
                                                    <div style={{ gridColumn: 'span 2' }}>
                                                        <label className="block text-sm text-gray-500 mb-1">Specialization</label>
                                                        <input type="text" value={formData.specialization} readOnly className="w-full p-3 bg-slate-900 border border-slate-800 rounded-lg text-gray-600 cursor-not-allowed" />
                                                    </div>
                                                    <div style={{ gridColumn: 'span 2' }}>
                                                        <label className="block text-sm text-gray-500 mb-1">Qualifications</label>
                                                        <input type="text" value={formData.qualifications} readOnly className="w-full p-3 bg-slate-900 border border-slate-800 rounded-lg text-gray-600 cursor-not-allowed" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm text-gray-500 mb-1">Experience (Years)</label>
                                                        <input type="text" value={formData.experience} readOnly className="w-full p-3 bg-slate-900 border border-slate-800 rounded-lg text-gray-600 cursor-not-allowed" />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </form>
                                </div>

                                {/* Modal Footer */}
                                <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: '#1e293b' }}>
                                    <button onClick={() => setIsEditing(false)} style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: '1px solid #4b5563', color: '#e5e7eb', borderRadius: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }} className="hover:bg-slate-800">Cancel</button>
                                    <button onClick={handleSubmit} disabled={loading} style={{ padding: '0.75rem 2rem', background: GOLD_ACCENT, border: 'none', color: 'black', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }} className="hover:bg-yellow-400">
                                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save Changes
                                    </button>
                                </div>
                            </div>

                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Notification Toast */}
            <AnimatePresence>
                {status && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        style={{
                            position: 'fixed', bottom: '2rem', right: '2rem',
                            background: status === 'success' ? '#10b981' : '#ef4444',
                            color: 'white', padding: '1rem 2rem', borderRadius: '0.5rem',
                            display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)'
                        }}
                    >
                        {status === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        {status === 'success' ? 'Profile Updated Successfully' : (status.startsWith('error:') ? status.split('error:')[1] : 'Error updating profile')}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default UserProfile;
