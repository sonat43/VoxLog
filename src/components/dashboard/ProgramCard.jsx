import React from 'react';
import { motion } from 'framer-motion';
import { Users, Clock } from 'lucide-react';

const ProgramCard = ({ programCode, programName, section, studentCount, status, statusMessage, onAction }) => {
    const isActive = status === 'active';

    return (
        <motion.div
            whileHover={{ scale: isActive ? 1.02 : 1 }}
            style={{
                background: 'rgba(31, 41, 55, 0.4)', // Transparent dark
                borderRadius: '1rem',
                border: '1px solid var(--color-border)',
                overflow: 'hidden',
                opacity: isActive ? 1 : 0.7,
                boxShadow: 'none',
                position: 'relative'
            }}
        >
            {/* Status Badge - Only show if Active */}
            {isActive && (
                <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: 'var(--color-success)',
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                }}>
                    Active
                </div>
            )}

            <div style={{ padding: '1.5rem' }}>
                <div style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--color-accent)',
                    marginBottom: '0.25rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}>
                    {programCode}
                </div>
                <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: 'var(--color-text-main)',
                    marginBottom: '0.5rem',
                    lineHeight: 1.4,
                    height: '3rem', // Fixed height for 2 lines
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                }}>
                    {programName}
                </h3>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    color: 'var(--color-text-muted)',
                    fontSize: '0.875rem',
                    marginBottom: '1.5rem'
                }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-secondary)' }}>Sec:</span> {section}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Users size={14} /> {studentCount} Students
                    </span>
                </div>

                {/* Take Attendance button removed as requested */}
            </div>
        </motion.div>
    );
};

export default ProgramCard;
