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
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notificationContent, setNotificationContent] = useState({ greeting: '', quote: '' });
    const [profilePic, setProfilePic] = useState(null);

    // Mock Notifications Data
    const quotes = [
        "The art of teaching is the art of assisting discovery.",
        "Education is not the filling of a pail, but the lighting of a fire.",
        "A good teacher can inspire hope, ignite the imagination, and instill a love of learning.",
        "Teaching is the one profession that creates all other professions.",
        "Your heart is slightly larger than the average human heart, but that's because you're a teacher."
    ];

    const generateNotification = () => {
        const hour = new Date().getHours();
        let greeting = 'Good Morning';
        if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';
        else if (hour >= 17) greeting = 'Good Evening';

        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        setNotificationContent({ greeting, quote: randomQuote });
    };

    const toggleNotifications = () => {
        if (!showNotifications) generateNotification();
        setShowNotifications(!showNotifications);
    };

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

        return () => window.removeEventListener('profile-pic-updated', loadProfilePic);
    }, [user]);

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/faculty/dashboard' },
        { icon: BookOpen, label: 'My Courses', path: '/faculty/courses' },
        { icon: Users, label: 'My Class', path: '/faculty/my-class' },
        { icon: ClipboardCheck, label: 'Leave Management', path: '/faculty/leave-management' },
        { icon: History, label: 'My Attendance', path: '/faculty/my-attendance' },
        { icon: Users, label: 'Substitutions', path: '/faculty/substitutions' },

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
                {/* Logo Section */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <img
                        src="/logo.png"
                        alt="VoxLog Logo"
                        style={{
                            height: '40px',
                            width: 'auto',
                            marginRight: '0.75rem',
                            objectFit: 'contain'
                        }}
                    />
                    <h2 style={{
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
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={toggleNotifications}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--color-text-muted)',
                                cursor: 'pointer',
                                position: 'relative',
                                padding: '0.5rem',
                                borderRadius: '50%',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <Bell size={20} />
                            <span style={{
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                minWidth: '8px',
                                height: '8px',
                                background: 'var(--color-error)',
                                borderRadius: '50%',
                                display: 'block'
                            }} />
                        </button>

                        <AnimatePresence>
                            {showNotifications && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    style={{
                                        position: 'absolute',
                                        top: '120%',
                                        right: 0,
                                        width: '320px',
                                        background: 'var(--color-surface)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '0.75rem',
                                        boxShadow: 'var(--shadow-lg)',
                                        zIndex: 50,
                                        overflow: 'hidden'
                                    }}
                                >
                                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>
                                        Notifications
                                    </div>
                                    <div style={{ padding: '1.5rem', textAlign: 'left' }}>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
                                            {notificationContent.greeting}, {user?.displayName || user?.email?.split('@')[0] || 'Faculty'}!
                                        </div>
                                        <div style={{ fontStyle: 'italic', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                                            "{notificationContent.quote}"
                                        </div>
                                    </div>

                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

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
                    {/* Navigation */}
                    <div style={{ flex: 1, padding: '1rem 0.75rem', overflowY: 'auto' }}>
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
