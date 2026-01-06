import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const AdminDashboard = () => {
    const { user, role, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/');
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ padding: '2rem', color: 'white', textAlign: 'left', maxWidth: '1200px', margin: '0 auto' }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        style={{ fontSize: '2.5rem', fontWeight: 'bold' }}
                    >
                        Admin Dashboard
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        style={{ color: '#9ca3af' }}
                    >
                        Welcome, Administrator {user?.email}
                    </motion.p>
                </div>
                <div style={{ background: '#1f2937', padding: '0.5rem 1rem', borderRadius: '9999px', fontSize: '0.875rem' }}>
                    {role?.toUpperCase()}
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                style={{ marginTop: '2rem', padding: '2rem', background: 'rgba(31, 41, 55, 0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem' }}
            >
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#22d3ee' }}>System Overview</h2>
                <ul style={{ lineHeight: '2', color: '#d1d5db' }}>
                    <li>‣ User Lifecycle Management</li>
                    <li>‣ System Audit Logs</li>
                    <li>‣ Global Class Structure</li>
                </ul>
            </motion.div>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                style={{
                    marginTop: '2rem',
                    padding: '0.75rem 1.5rem',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#fca5a5',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontWeight: 600
                }}
            >
                Secure Logout
            </motion.button>
        </motion.div>
    );
};

export default AdminDashboard;
