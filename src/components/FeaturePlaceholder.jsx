import React from 'react';
import { motion } from 'framer-motion';
import { Construction, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';

const FeaturePlaceholder = ({ title = "Under Construction" }) => {
    const navigate = useNavigate();

    return (
        <DashboardLayout>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    minHeight: '60vh',
                    textAlign: 'center',
                    color: 'var(--color-text-muted)'
                }}
            >
                <div style={{
                    padding: '2rem',
                    background: 'var(--color-surface)',
                    borderRadius: '50%',
                    marginBottom: '2rem',
                    border: '1px solid var(--color-border)'
                }}>
                    <Construction size={64} strokeWidth={1} color="var(--color-accent)" />
                </div>

                <h1 style={{
                    fontSize: '2rem',
                    fontWeight: 700,
                    color: 'white',
                    marginBottom: '1rem'
                }}>
                    Feature Coming Soon
                </h1>

                <p style={{ maxWidth: '400px', marginBottom: '2rem', lineHeight: 1.6 }}>
                    This module is currently under active development.
                    We are crafting a professional experience for <strong>{title}</strong>.
                </p>

                <button
                    onClick={() => navigate('/faculty/dashboard')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        background: 'transparent',
                        border: '1px solid var(--color-border)',
                        color: 'white',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s'
                    }}
                >
                    <ArrowLeft size={16} /> Return to Dashboard
                </button>
            </motion.div>
        </DashboardLayout>
    );
};

export default FeaturePlaceholder;
