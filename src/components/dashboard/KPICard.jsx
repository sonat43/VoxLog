import React from 'react';
import { motion } from 'framer-motion';

const KPICard = ({ title, value, icon: Icon, trend, trendUp, color, subtitle }) => {
    return (
        <motion.div
            whileHover={{ y: -5, boxShadow: 'var(--shadow-lg)' }}
            style={{
                background: 'rgba(31, 41, 55, 0.4)', // Slightly transparent dark
                borderRadius: '1rem',
                padding: '1.5rem',
                border: '1px solid var(--color-border)',
                boxShadow: 'none', // Admin uses no shadow by default
                display: 'flex',
                flexDirection: 'column', // Stacked layout like Admin
                gap: '1rem',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ zIndex: 2 }}>
                    <p style={{
                        margin: '0 0 0.25rem 0',
                        fontSize: '0.875rem',
                        color: 'var(--color-text-muted)',
                        fontWeight: 500
                    }}>
                        {title}
                    </p>
                    <div style={{
                        fontSize: '1.75rem',
                        fontWeight: 700,
                        color: 'white',
                        lineHeight: 1.2
                    }}>
                        {value}
                    </div>
                </div>

                <div style={{
                    background: color ? `${color}20` : 'rgba(255,255,255,0.05)',
                    padding: '0.75rem',
                    borderRadius: '0.75rem',
                    color: color || 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Icon size={24} strokeWidth={2} />
                </div>
            </div>

            {/* Trend Section at Bottom like Admin */}
            {(trend || subtitle) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                    {trend ? (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.25rem',
                            color: trendUp ? 'var(--color-success)' : 'var(--color-error)',
                            fontWeight: 600
                        }}>
                            <span>{trendUp ? '↑' : '↓'}</span>
                            {trend}
                        </div>
                    ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>{subtitle}</span>
                    )}
                </div>
            )}

            {/* Decorative background circle */}
            <div style={{
                position: 'absolute',
                right: -20,
                bottom: -20,
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: color ? `${color}08` : 'rgba(0,0,0,0.02)',
                zIndex: 1
            }} />
        </motion.div>
    );
};

export default KPICard;
