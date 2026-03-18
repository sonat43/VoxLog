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
    Clock,
    Calendar,
    X,
    ChevronLeft,
    Bell,
    GraduationCap,
    Users
} from 'lucide-react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import NotificationCenter from '../components/common/NotificationCenter';

const SidebarItem = ({ icon: Icon, label, active, onClick, collapsed }) => (
    <motion.button
        whileHover={{ x: 4, backgroundColor: 'var(--color-bg)' }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            padding: '0.75rem 1rem',
            margin: '0.25rem 0',
            border: 'none',
            background: active ? 'var(--color-primary)' : 'transparent',
            color: active ? '#ffffff' : 'var(--color-text-muted)',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontSize: '0.925rem',
            fontWeight: active ? 600 : 500,
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'all 0.2s',
            position: 'relative'
        }}
    >
        <Icon size={20} strokeWidth={2} />
        {!collapsed && (
            <span style={{ marginLeft: '0.75rem' }}>{label}</span>
        )}
    </motion.button>
);

const DashboardLayout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [profilePic, setProfilePic] = useState(null);

    React.useEffect(() => {
        if (!user?.uid) return;

        // Load Profile Picture
        const loadProfilePic = () => {
            const localPic = localStorage.getItem(`user_profile_pic_${user.uid}`);
            if (localPic) setProfilePic(localPic);
        };
        loadProfilePic();

        // Listen for updates from UserProfile
        window.addEventListener('profile-pic-updated', loadProfilePic);

        // NotificationCenter handles its own fetching, so we removed the mock fetchUnread here.

        return () => window.removeEventListener('profile-pic-updated', loadProfilePic);
    }, [user]);

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/faculty/dashboard' },
        { icon: BookOpen, label: 'My Courses', path: '/faculty/courses' },
        { icon: Users, label: 'My Class', path: '/faculty/my-class' },
        { icon: ClipboardCheck, label: 'Leave Management', path: '/faculty/leave-management' },
        { icon: History, label: 'My Attendance', path: '/faculty/my-attendance' },
        { icon: Users, label: 'Substitutions', path: '/faculty/substitutions' },
        { icon: Calendar, label: 'Academic Calendar', path: '/faculty/academic-calendar' },

        { icon: User, label: 'Profile', path: '/faculty/profile' },
    ];

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            background: 'var(--color-bg)',
            overflow: 'hidden'
        }}>
            {/* Top Navigation Bar */}
            <header style={{
                height: '64px',
                background: 'var(--color-surface)',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 1.5rem',
                zIndex: 30,
                position: 'relative'
            }}>
                {/* Logo Section & Hamburger */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        className="show-on-mobile"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--color-text-main)', cursor: 'pointer', padding: 0 }}
                    >
                        {window.innerWidth >= 1024 ? null : (isSidebarOpen ? <X size={20} /> : <Menu size={20} />)}
                    </button>
                    <img
                        src="/logo.png"
                        alt="VoxLog Logo"
                        style={{
                            height: '40px',
                            width: 'auto',
                            objectFit: 'contain'
                        }}
                    />
                    <h2 className="hide-on-mobile" style={{
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                        margin: 0,
                        letterSpacing: '-0.01em',
                        fontFamily: 'serif'
                    }}>
                        VoxLog
                    </h2>
                </div>

                {/* Right Side Icons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <NotificationCenter />

                    <div style={{
                        width: '36px',
                        height: '36px',
                        background: profilePic ? 'transparent' : 'var(--color-primary)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        border: '2px solid var(--color-surface)',
                        boxShadow: 'var(--shadow-sm)',
                        overflow: 'hidden'
                    }} onClick={() => navigate('/faculty/profile')}>
                        {profilePic ? (
                            <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            user?.email?.[0]?.toUpperCase() || 'F'
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content Wrapper */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Mobile Overlay */}
                {isSidebarOpen && (
                    <div
                        className="mobile-overlay show-on-mobile"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <motion.div
                    className={`sidebar-wrapper ${isSidebarOpen ? 'open' : ''}`}
                    animate={{ width: window.innerWidth >= 1024 ? 260 : (isSidebarOpen ? 260 : 0) }}
                    style={{
                        background: 'var(--color-surface)',
                        borderRight: '1px solid var(--color-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        zIndex: 50 // Increased to sit above the mobile overlay
                    }}
                >
                    {/* Navigation */}
                    <div style={{ flex: 1, padding: '1rem 0.75rem', overflowY: 'auto' }}>
                        {menuItems.map((item) => (
                            <SidebarItem
                                key={item.label}
                                icon={item.icon}
                                label={item.label}
                                active={location.pathname === item.path}
                                collapsed={window.innerWidth >= 1024 ? false : !isSidebarOpen}
                                onClick={() => {
                                    if (window.innerWidth < 1024) setIsSidebarOpen(false);
                                    navigate(item.path);
                                }}
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
