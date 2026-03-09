import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Camera, CheckCircle, AlertCircle, ArrowRight, ArrowLeft, UserCheck } from 'lucide-react';
import { saveAttendanceSession } from '../../services/facultyService';
import { checkSubstitutionForAttendance } from '../../services/substitutionService';
import { useAuth } from '../../context/AuthContext';
import SmartAttendance from '../attendance/SmartAttendance';
import Toast from '../common/Toast';

const AttendanceModal = ({ isOpen, onClose, programs }) => {
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [selectedProgram, setSelectedProgram] = useState(null);
    const [mode, setMode] = useState(null); // 'voice', 'camera', or 'smart'
    const [aiConfidence, setAiConfidence] = useState(0);

    // Substitution Internal State
    const [isSubstitute, setIsSubstitute] = useState(false);
    const [originalFacultyId, setOriginalFacultyId] = useState(null);
    const [verifying, setVerifying] = useState(false);
    const [toast, setToast] = useState(null);

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            if (programs && programs.length === 1 && programs[0].status === 'active') {
                setSelectedProgram(programs[0]);
                setMode('smart');
                setStep(3);
            } else {
                setStep(1);
                setSelectedProgram(null);
                setMode(null);
            }
            setAiConfidence(0);
            setIsSubstitute(false);
            setOriginalFacultyId(null);
            setVerifying(false);
        }
    }, [isOpen, programs]);

    // Simulate AI Confidence Calculation
    useEffect(() => {
        if (step === 3) {
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 5;
                if (progress >= 96) {
                    progress = 96;
                    clearInterval(interval);
                }
                setAiConfidence(Math.floor(progress));
            }, 100);
            return () => clearInterval(interval);
        }
    }, [step]);

    const handleNext = async () => {
        if (step === 1) {
            // Verify Substitution if User is not the Regular faculty (Note: In this UI, 'programs' passed are usually assigned to user. 
            // EXCEPT if we update FacultyPrograms to optionally include substituted programs. 
            // THE PLAN: We decided to verify here anyway for security or logic flow.

            // Check if there is an active substitution for THIS program TODAY
            // dateString = Today
            setVerifying(true);
            try {
                // Use Local Date string (YYYY-MM-DD)
                const d = new Date();
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const today = `${year}-${month}-${day}`;

                const sub = await checkSubstitutionForAttendance(today, null, null, selectedProgram.courseId);

                if (sub) {
                    if (sub.substituteFacultyId === user.uid) {
                        setIsSubstitute(true);
                        setOriginalFacultyId(sub.originalFacultyId || "Unknown"); // Or fetch from substitution doc if we saved it
                        setToast({ message: "Recognized as Substitute Teacher.", type: 'success' });
                    } else if (sub.originalFacultyId === user.uid) {
                        // Original teacher trying to take attendance when sub exists?
                        // Allow it, but maybe warn? For now, standard flow.
                        setToast({ message: "Warning: A substitute is assigned for this class.", type: 'warning' });
                    }
                }
            } catch (err) {
                console.error("Verification check failed", err);
            } finally {
                setVerifying(false);
                setStep(step + 1);
            }
        } else {
            setStep(step + 1);
        }
    };

    const handleBack = () => setStep(step - 1);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{
                    background: 'var(--color-surface)',
                    width: '600px',
                    maxWidth: '95%',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    borderRadius: '1.5rem',
                    padding: '1.5rem',
                    boxShadow: 'var(--shadow-lg)',
                    position: 'relative'
                }}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1.5rem',
                        right: '1.5rem',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer'
                    }}
                >
                    <X size={24} />
                </button>

                {/* Header */}
                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '0.5rem' }}>
                        Start Attendance
                    </h2>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} style={{
                                width: '3rem',
                                height: '4px',
                                borderRadius: '2px',
                                background: step >= i ? 'var(--color-accent)' : 'var(--color-border)',
                                transition: 'background 0.3s'
                            }} />
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div style={{ minHeight: '300px' }}>
                    {step === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-secondary)' }}>
                                Step 1: Select Program & Section
                            </h3>
                            {programs.filter(c => c.status === 'active').length === 0 ? (
                                <div style={{
                                    padding: '1rem',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    color: 'var(--color-error)',
                                    borderRadius: '0.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    <AlertCircle size={20} />
                                    No Active Sections Assigned
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    {programs.filter(c => c.status === 'active').map(program => (
                                        <button
                                            key={program.id}
                                            onClick={() => setSelectedProgram(program)}
                                            style={{
                                                padding: '1rem',
                                                border: selectedProgram?.id === program.id ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                                                background: selectedProgram?.id === program.id ? 'var(--color-accent-light)' : 'transparent',
                                                borderRadius: '0.75rem',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{program.code}</span>
                                                    <span style={{ color: 'var(--color-text-muted)' }}>•</span>
                                                    <span style={{ fontWeight: 600, color: 'var(--color-accent)' }}>
                                                        Period {program.periodIndex !== undefined ? program.periodIndex + 1 : '?'}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{program.name}</div>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '0.25rem', color: 'var(--color-secondary)' }}>
                                                    Section {program.section}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-secondary)' }}>
                                Step 2: Choose Mode
                            </h3>

                            {isSubstitute && (
                                <div style={{
                                    padding: '10px', background: 'rgba(20, 184, 166, 0.1)',
                                    color: '#14b8a6', borderRadius: '8px', marginBottom: '10px',
                                    display: 'flex', alignItems: 'center', justifySelf: 'center', gap: '8px', margin: '0 auto'
                                }}>
                                    <UserCheck size={18} /> Acting as Substitute Teacher
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
                                <button
                                    onClick={() => setMode('voice')}
                                    style={{
                                        flex: 1,
                                        padding: '2rem',
                                        border: mode === 'voice' ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                                        background: mode === 'voice' ? 'var(--color-accent-light)' : 'transparent',
                                        borderRadius: '1rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{
                                        width: '64px', height: '64px',
                                        background: 'rgba(15, 118, 110, 0.1)',
                                        borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'var(--color-accent)'
                                    }}>
                                        <Mic size={32} />
                                    </div>
                                    <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>Voice Roll Call</span>
                                </button>
                                <button
                                    onClick={() => setMode('camera')}
                                    style={{
                                        flex: 1,
                                        padding: '2rem',
                                        border: mode === 'camera' ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                                        background: mode === 'camera' ? 'var(--color-accent-light)' : 'transparent',
                                        borderRadius: '1rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{
                                        width: '64px', height: '64px',
                                        background: 'rgba(15, 118, 110, 0.1)',
                                        borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'var(--color-accent)'
                                    }}>
                                        <Camera size={32} />
                                    </div>
                                    <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>AI Head Count</span>
                                </button>
                                <button
                                    onClick={() => setMode('smart')}
                                    style={{
                                        flex: 1,
                                        padding: '2rem',
                                        border: mode === 'smart' ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                                        background: mode === 'smart' ? 'var(--color-accent-light)' : 'transparent',
                                        borderRadius: '1rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{
                                        width: '64px', height: '64px',
                                        background: 'rgba(59, 130, 246, 0.1)',
                                        borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'var(--color-primary)'
                                    }}>
                                        <Camera size={32} />
                                    </div>
                                    <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>Smart Attendance</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>(Camera + Voice)</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && mode === 'smart' && (
                        <SmartAttendance
                            program={selectedProgram}
                            onClose={onClose}
                        />
                    )}

                    {step === 3 && (mode === 'voice' || mode === 'camera') && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1.5rem' }}>
                            <div style={{
                                position: 'relative',
                                width: '120px',
                                height: '120px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                                    <circle cx="60" cy="60" r="54" fill="none" stroke="var(--color-border)" strokeWidth="12" />
                                    <circle cx="60" cy="60" r="54" fill="none" stroke="var(--color-accent)" strokeWidth="12"
                                        strokeDasharray="339.292"
                                        strokeDashoffset={339.292 - (339.292 * aiConfidence / 100)}
                                        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                                    />
                                </svg>
                                <div style={{ position: 'absolute', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                                    {aiConfidence}%
                                </div>
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-main)' }}>AI System Ready</h3>
                                <p style={{ color: 'var(--color-text-muted)' }}>Confidence Score for {mode === 'voice' ? 'Voice Analysis' : 'Visual Recognition'}</p>
                            </div>
                            <div style={{
                                padding: '1rem',
                                borderRadius: '0.75rem',
                                background: 'var(--color-bg)',
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                textAlign: 'left'
                            }}>
                                <div style={{ padding: '0.5rem', background: 'white', borderRadius: '0.5rem' }}>
                                    <CheckCircle size={20} color="var(--color-success)" />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                        Period {selectedProgram?.periodIndex !== undefined ? selectedProgram.periodIndex + 1 : '?'} • Ready
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                        {selectedProgram?.code} - {selectedProgram?.name}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                    <button
                        onClick={handleBack}
                        disabled={step === 1}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--color-border)',
                            background: 'white',
                            color: 'var(--color-text-muted)',
                            cursor: step === 1 ? 'not-allowed' : 'pointer',
                            opacity: step === 1 ? 0.5 : 1,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                    {step < 3 ? (
                        <button
                            onClick={handleNext}
                            disabled={(step === 1 && !selectedProgram) || (step === 2 && !mode) || verifying}
                            style={{
                                padding: '0.75rem 1.5rem',
                                borderRadius: '0.5rem',
                                border: 'none',
                                background: 'var(--color-primary)',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                opacity: ((step === 1 && !selectedProgram) || (step === 2 && !mode) || verifying) ? 0.5 : 1
                            }}
                        >
                            {verifying ? 'Verifying...' : <>Next <ArrowRight size={16} /></>}
                        </button>
                    ) : mode === 'smart' ? null : (
                        <button
                            onClick={async () => {
                                if (selectedProgram) {
                                    try {
                                        await saveAttendanceSession({
                                            courseId: selectedProgram.courseId,
                                            semesterId: selectedProgram.semesterId,
                                            courseName: selectedProgram.name,
                                            section: selectedProgram.section || 'N/A',
                                            mode: mode,
                                            confidence: aiConfidence,
                                            facultyId: user?.uid,
                                            status: 'active',
                                            role: isSubstitute ? 'Substitute' : 'Regular',
                                            originalFacultyId: originalFacultyId
                                        });
                                        onClose();
                                    } catch (error) {
                                        console.error("Failed to start session", error);
                                        // Optional: Show error
                                        onClose();
                                    }
                                }
                            }}
                            style={{
                                padding: '0.75rem 1.5rem',
                                borderRadius: '0.5rem',
                                border: 'none',
                                background: 'var(--color-accent)',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: 600,
                                boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)'
                            }}
                        >
                            Launch Session
                        </button>
                    )}
                </div>
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            </motion.div>
        </div>
    );
};

export default AttendanceModal;
