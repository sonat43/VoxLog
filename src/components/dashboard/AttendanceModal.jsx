import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Camera, CheckCircle, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';

const AttendanceModal = ({ isOpen, onClose, courses }) => {
    const [step, setStep] = useState(1);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [mode, setMode] = useState(null); // 'voice' or 'camera'
    const [aiConfidence, setAiConfidence] = useState(0);

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSelectedCourse(null);
            setMode(null);
            setAiConfidence(0);
        }
    }, [isOpen]);

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

    const handleNext = () => setStep(step + 1);
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
                    maxWidth: '90%',
                    borderRadius: '1.5rem',
                    padding: '2rem',
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
                                Step 1: Select Course & Section
                            </h3>
                            {courses.filter(c => c.status === 'active').length === 0 ? (
                                <div style={{
                                    padding: '1rem',
                                    background: '#fee2e2',
                                    color: '#b91c1c',
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
                                    {courses.filter(c => c.status === 'active').map(course => (
                                        <button
                                            key={course.id}
                                            onClick={() => setSelectedCourse(course)}
                                            style={{
                                                padding: '1rem',
                                                border: selectedCourse?.id === course.id ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                                                background: selectedCourse?.id === course.id ? 'var(--color-accent-light)' : 'transparent',
                                                borderRadius: '0.75rem',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{course.code}</div>
                                            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{course.name}</div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '0.5rem', color: 'var(--color-secondary)' }}>
                                                Section {course.section}
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
                            </div>
                        </div>
                    )}

                    {step === 3 && (
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
                                    <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="12" />
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
                                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Ready to Start</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                        {selectedCourse?.code} - {selectedCourse?.name}
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
                            disabled={(step === 1 && !selectedCourse) || (step === 2 && !mode)}
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
                                opacity: ((step === 1 && !selectedCourse) || (step === 2 && !mode)) ? 0.5 : 1
                            }}
                        >
                            Next <ArrowRight size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
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
            </motion.div>
        </div>
    );
};

export default AttendanceModal;
