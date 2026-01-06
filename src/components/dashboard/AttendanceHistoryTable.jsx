import React, { useState } from 'react';
import { ChevronDown, Search, Filter, Mic, Camera, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

const AttendanceHistoryTable = ({ history }) => {
    const [filter, setFilter] = useState('all');

    return (
        <div style={{
            background: 'var(--color-surface)',
            borderRadius: '1rem',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden'
        }}>
            {/* Header / Controls */}
            <div style={{
                padding: '1.5rem',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Recent Sessions</h3>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Search course..."
                            style={{
                                padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                                borderRadius: '0.5rem',
                                border: '1px solid var(--color-border)',
                                fontSize: '0.875rem',
                                outline: 'none',
                                background: 'transparent',
                                color: 'var(--color-text-main)'
                            }}
                        />
                    </div>
                    <button style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        color: 'var(--color-text-main)'
                    }}>
                        <Filter size={16} /> Filter
                    </button>
                </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'var(--color-bg)' }}>
                        <tr>
                            {['Date', 'Course', 'Section', 'Mode', 'Attendance %', 'Status'].map(header => (
                                <th key={header} style={{
                                    padding: '1rem 1.5rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    color: 'var(--color-text-muted)'
                                }}>
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {history.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ padding: '3rem', textAlign: 'center' }}>
                                    <div style={{
                                        width: '64px', height: '64px',
                                        background: 'var(--color-bg)',
                                        borderRadius: '50%',
                                        margin: '0 auto 1rem auto',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Calendar size={24} color="var(--color-text-muted)" />
                                    </div>
                                    <h4 style={{ margin: '0 0 0.5rem 0' }}>No history found</h4>
                                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Start a new session to see records here.</p>
                                </td>
                            </tr>
                        ) : (
                            history.map((item, index) => (
                                <motion.tr
                                    key={item.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                    style={{ borderBottom: '1px solid var(--color-border)' }}
                                    whileHover={{ background: 'var(--color-bg)' }}
                                >
                                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{item.date}</td>
                                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 600 }}>{item.course}</td>
                                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{item.section}</td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                                            fontSize: '0.875rem',
                                            color: item.mode === 'voice' ? 'var(--color-secondary)' : 'var(--color-accent)'
                                        }}>
                                            {item.mode === 'voice' ? <Mic size={16} /> : <Camera size={16} />}
                                            {item.mode === 'voice' ? 'Voice' : 'AI Cam'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ flex: 1, height: '6px', background: 'var(--color-bg)', borderRadius: '3px', width: '80px' }}>
                                                <div style={{ width: `${item.percentage}%`, height: '100%', background: item.percentage > 75 ? 'var(--color-success)' : 'var(--color-error)', borderRadius: '3px' }} />
                                            </div>
                                            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{item.percentage}%</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '999px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            background: 'rgba(16, 185, 129, 0.1)',
                                            color: 'var(--color-success)'
                                        }}>
                                            Completed
                                        </span>
                                    </td>
                                </motion.tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AttendanceHistoryTable;
