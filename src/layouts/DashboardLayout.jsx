import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    BookOpen,
    ClipboardCheck,
    History,
    FileText,
    User,
    LogOut,
    Menu,
    ChevronLeft,
    Bell,
    GraduationCap,
    Users
} from 'lucide-react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const SidebarItem = ({ icon: Icon, label, active, onClick, collapsed }) => (
    <motion.button
        whileHover={{ x: 4, backgroundColor: 'rgba(0,0,0,0.03)' }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            padding: '0.75rem 1rem',
            margin: '0.25rem 0',
            border: 'none',
            background: active ? 'var(--color-accent-light)' : 'transparent',
            color: active ? 'var(--color-accent)' : 'var(--color-text-muted)',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontSize: '0.925rem',
            fontWeight: active ? 600 : 500,
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'color 0.2s',
            position: 'relative'
        }}
    >
        <Icon size={20} strokeWidth={2} />
        {!collapsed && (
            <span style={{ marginLeft: '0.75rem' }}>{label}</span>
        )}
        {active && !collapsed && (
            <motion.div
                layoutId="active-pill"
                style={{
                    position: 'absolute',
                    left: 0,
                    width: '3px',
                    height: '60%',
                    background: 'var(--color-accent)',
                    borderRadius: '0 4px 4px 0'
                }}
            />
        )}
    </motion.button>
);

const DashboardLayout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    React.useEffect(() => {
        if (!user?.uid) return;
        const fetchUnread = async () => {
            try {
                const q = query(collection(db, "notifications"), where("userId", "==", user.uid), where("read", "==", false));
                const snap = await getDocs(q);
                setUnreadCount(snap.size);
            } catch (e) {
                console.error("Failed to fetch notifications", e);
            }
        };
        fetchUnread();
    }, [user]);

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/faculty/dashboard' },
        { icon: BookOpen, label: 'My Courses', path: '/faculty/courses' },
        { icon: Users, label: 'My Class', path: '/faculty/my-class' },
        { icon: ClipboardCheck, label: 'Leave Management', path: '/faculty/leave-management' },
        { icon: Users, label: 'Substitutions', path: '/faculty/substitutions' },

        { icon: History, label: 'History', path: '/faculty/history' },

        { icon: User, label: 'Profile', path: '/faculty/profile' },
    ];

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <div style={{
            display: 'flex',
            height: '100vh',
            background: 'var(--color-bg)',
            overflow: 'hidden'
        }}>
            {/* Sidebar */}
            <motion.div
                animate={{ width: isSidebarOpen ? 260 : 80 }}
                style={{
                    background: 'var(--color-surface)',
                    borderRight: '1px solid var(--color-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 20
                }}
            >
                {/* Logo Area */}
                <div style={{
                    padding: '0 1.25rem',
                    height: '64px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isSidebarOpen ? 'flex-start' : 'center',
                    borderBottom: '1px solid var(--color-border)',
                    marginBottom: '1rem'
                }}>
                    <img src="/logo.png" alt="VoxLog" style={{ height: '32px', width: 'auto' }} />
                    {isSidebarOpen && (
                        <h2 style={{
                            fontSize: '1.25rem',
                            fontWeight: 800,
                            color: 'white',
                            margin: '0 0 0 0.75rem',
                            letterSpacing: '-0.025em'
                        }}>
                            VoxLog
                        </h2>
                    )}
                </div>

                {/* Navigation */}
                <div style={{ flex: 1, padding: '0 0.75rem', overflowY: 'auto' }}>
                    {menuItems.map((item) => (
                        <SidebarItem
                            key={item.label}
                            icon={item.icon}
                            label={item.label}
                            active={location.pathname === item.path}
                            collapsed={!isSidebarOpen}
                            onClick={() => navigate(item.path)}
                        />
                    ))}
                </div>

                {/* User Profile / Logout */}
                <div style={{
                    padding: '1rem',
                    borderTop: '1px solid var(--color-border)',
                }}>
                    <button
                        onClick={handleLogout}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            width: '100%',
                            padding: '0.75rem',
                            border: 'none',
                            background: 'rgba(239, 68, 68, 0.05)',
                            color: 'var(--color-error)',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            justifyContent: isSidebarOpen ? 'flex-start' : 'center'
                        }}
                    >
                        <LogOut size={20} />
                        {isSidebarOpen && <span style={{ marginLeft: '0.75rem', fontWeight: 500 }}>Logout</span>}
                    </button>
                </div>
            </motion.div>

            {/* Main Content Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Top Bar */}
                <header style={{
                    height: '64px',
                    background: 'var(--color-surface)',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 2rem',
                    zIndex: 10
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginLeft: 'auto' }}>
                        <button style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer',
                            position: 'relative'
                        }}>
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <span style={{
                                    position: 'absolute',
                                    top: -4,
                                    right: -4,
                                    minWidth: '16px',
                                    height: '16px',
                                    background: 'var(--color-error)',
                                    borderRadius: '50%',
                                    color: 'white',
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '2px'
                                }}>
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        <div style={{
                            width: '36px',
                            height: '36px',
                            background: 'var(--color-accent)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }} onClick={() => navigate('/faculty/profile')}>
                            {user?.email?.[0]?.toUpperCase() || 'F'}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '2rem',
                    position: 'relative'
                }}>
                    {children || <Outlet />}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
