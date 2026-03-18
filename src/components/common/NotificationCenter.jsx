import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch, orderBy, limit } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NotificationCenter = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!user?.uid) return;

        // Listen for new notifications in real-time
        const q = query(
            collection(db, "notifications"),
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc"),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = [];
            let unread = 0;
            snapshot.forEach((doc) => {
                const data = doc.data();
                notifs.push({ id: doc.id, ...data });
                if (!data.read) unread++;
            });
            setNotifications(notifs);
            setUnreadCount(unread);
        }, (error) => {
            console.error("Error fetching notifications:", error);
            // Index might be missing. If so, Firebase will log the URL to create it.
            // We can gracefully handle the fallback by ignoring the order if it fails,
            // but for now, we assume the index exists or will be created.
        });

        return () => unsubscribe();
    }, [user?.uid]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (notificationId) => {
        try {
            await updateDoc(doc(db, "notifications", notificationId), {
                read: true
            });
        } catch (error) {
            console.error("Failed to mark as read", error);
        }
    };

    const markAllAsRead = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (unreadCount === 0) return;

        // Optimistic UI Update
        const currentNotifications = [...notifications];
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);

        try {
            const batch = writeBatch(db);
            let hasWrites = false;
            currentNotifications.forEach(notif => {
                if (!notif.read) {
                    batch.update(doc(db, "notifications", notif.id), { read: true });
                    hasWrites = true;
                }
            });
            if (hasWrites) {
                await batch.commit();
            }
        } catch (error) {
            console.error("Failed to mark all as read", error);
        }
    };

    const handleNotificationClick = async (e, notif) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!notif.read) {
            // Optimistic Update
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
            markAsRead(notif.id); // Fire and forget
        }
        setIsOpen(false);
        if (notif.link) {
            navigate(notif.link);
        }
    };

    const getIconColor = (type) => {
        switch (type) {
            case 'Leave': return '#3b82f6';
            case 'Substitution': return '#f59e0b';
            case 'Academic': return '#10b981';
            case 'Calendar': return '#ec4899';
            case 'System': return '#6366f1';
            default: return '#94a3b8';
        }
    };

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-text-muted, #9ca3af)',
                    cursor: 'pointer',
                    position: 'relative',
                    padding: '0.5rem',
                    borderRadius: '50%',
                    transition: 'background 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: 2,
                        right: 4,
                        minWidth: '18px',
                        height: '18px',
                        background: 'var(--color-error, #ef4444)',
                        color: 'white',
                        fontSize: '0.65rem',
                        fontWeight: 'bold',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid var(--color-surface, #1e293b)'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        style={{
                            position: 'absolute',
                            top: '120%',
                            right: 0,
                            width: '350px',
                            maxHeight: '400px',
                            background: 'var(--color-surface, #1e293b)',
                            border: '1px solid var(--color-border, #334155)',
                            borderRadius: '0.75rem',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                            zIndex: 50,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{ 
                            padding: '1rem', 
                            borderBottom: '1px solid var(--color-border, #334155)', 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'rgba(0,0,0,0.2)'
                        }}>
                            <span style={{ fontWeight: 600, color: '#f8fafc' }}>Notifications</span>
                            {unreadCount > 0 && (
                                <button 
                                    onClick={markAllAsRead}
                                    style={{
                                        background: 'transparent', border: 'none', 
                                        color: 'var(--color-primary, #14b8a6)', 
                                        fontSize: '0.8rem', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '4px'
                                    }}
                                >
                                    <Check size={14} /> Mark all read
                                </button>
                            )}
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {notifications.filter(n => !n.read).length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                                    <Bell size={32} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                                    <p>You're all caught up!</p>
                                    <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>No new notifications.</p>
                                </div>
                            ) : (
                                notifications.filter(n => !n.read).map(notif => (
                                    <div 
                                        key={notif.id}
                                        onClick={(e) => handleNotificationClick(e, notif)}
                                        style={{
                                            padding: '1rem',
                                            borderBottom: '1px solid var(--color-border, #334155)',
                                            background: notif.read ? 'transparent' : 'rgba(20, 184, 166, 0.05)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            gap: '1rem',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (notif.read) e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (notif.read) e.currentTarget.style.background = 'transparent';
                                            else e.currentTarget.style.background = 'rgba(20, 184, 166, 0.05)';
                                        }}
                                    >
                                        <div style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: notif.read ? 'transparent' : 'var(--color-primary, #14b8a6)',
                                            marginTop: '6px',
                                            flexShrink: 0
                                        }} />
                                        
                                        <div style={{ flex: 1 }}>
                                            <div style={{ 
                                                fontSize: '0.85rem', 
                                                color: getIconColor(notif.type),
                                                fontWeight: 600,
                                                marginBottom: '4px',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em'
                                            }}>
                                                {notif.type}
                                            </div>
                                            <div style={{
                                                fontSize: '0.9rem',
                                                color: notif.read ? '#94a3b8' : '#f8fafc',
                                                lineHeight: 1.4,
                                                marginBottom: '6px'
                                            }}>
                                                {notif.message}
                                            </div>
                                            <div style={{
                                                fontSize: '0.75rem',
                                                color: '#64748b',
                                                display: 'flex',
                                                justifyContent: 'space-between'
                                            }}>
                                                <span>
                                                    {notif.createdAt?.toDate() ? 
                                                        notif.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }) 
                                                        : 'Just now'}
                                                </span>
                                                {notif.link && <ExternalLink size={12} />}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationCenter;
