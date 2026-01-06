import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", isDangerous = false }) => {
    if (!isOpen) return null;

    const overlayStyle = {
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
    };

    const modalStyle = {
        background: '#1f2937', borderRadius: '12px', width: '90%', maxWidth: '450px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)'
    };

    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                <div style={{ padding: '1.5rem', display: 'flex', gap: '1rem' }}>
                    <div style={{
                        width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0,
                        background: isDangerous ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: isDangerous ? '#ef4444' : '#3b82f6'
                    }}>
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600, color: 'white' }}>{title}</h3>
                        <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.95rem', lineHeight: 1.5 }}>{message}</p>
                    </div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #374151',
                            background: 'white', color: '#374151', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none',
                            background: isDangerous ? '#ef4444' : '#3b82f6',
                            color: 'white', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem'
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
