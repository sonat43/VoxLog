import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, LogOut, User as UserIcon } from 'lucide-react';

const TopBar = ({ isOpen }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/');
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    const getPageTitle = (pathname) => {
        if (pathname.includes('overview')) return 'Dashboard Overview';
        if (pathname.includes('users')) return 'Manage Faculty & Admins';

        if (pathname.includes('students')) return 'Manage Students';
        if (pathname.includes('reports')) return 'Attendance Audit & Reports';

        if (pathname.includes('settings')) return 'Settings & Config';
        return 'Admin Dashboard';
    };

    return (
        <header style={{
            height: '64px',
            backgroundColor: '#111827', // Match sidebar
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'fixed',
            top: 0,
            right: 0,
            left: isOpen ? '260px' : '70px',
            transition: 'left 0.3s ease',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 2rem'
        }}>
            {/* Center: Dynamic Title (Left aligned in the flex space typically, or center) */}
            {/* User requested "Center: Dynamic Page Title", but pure center might conflict with Search. 
                I'll put it on the left-ish or true center. Let's go with left-aligned next to search or center absolute.
                Let's stick to standard flow: Left=Title, Right=Actions 
                Actually user said: "Branding: Prominent VoxLog (Top Nav)" -> But I put Branding in Sidebar.
                "Center: Dynamic Page Title".
                "Right: Search, Bell, Profile, Logout".
                
                If Sidebar has branding, TopBar usually just has Title.
            */}

            <h2 style={{
                margin: 0,
                fontSize: '1.1rem',
                fontWeight: 600,
                color: 'white',
                minWidth: '200px'
            }}>
                {getPageTitle(location.pathname)}
            </h2>

            {/* Right Side Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>

                {/* Search */}
                <div style={{ position: 'relative' }}>
                    <Search size={18} color="#9ca3af" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        type="text"
                        placeholder="Search..."
                        style={{
                            backgroundColor: 'rgba(31, 41, 55, 0.5)',
                            border: '1px solid rgba(75, 85, 99, 0.4)',
                            borderRadius: '9999px',
                            padding: '0.4rem 1rem 0.4rem 2.5rem',
                            color: 'white',
                            fontSize: '0.875rem',
                            outline: 'none',
                            width: '240px',
                            transition: 'width 0.2s',
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#14b8a6'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(75, 85, 99, 0.4)'}
                    />
                </div>

                {/* Notifications */}
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}>
                    <Bell size={20} color="#9ca3af" />
                    <span style={{
                        position: 'absolute', top: '-2px', right: '-2px',
                        width: '8px', height: '8px',
                        backgroundColor: '#ef4444',
                        borderRadius: '50%'
                    }}></span>
                </button>

                {/* Vertical Divider */}
                <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>

                {/* Profile */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ textAlign: 'right', display: 'block' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'white' }}>{user?.displayName || 'Admin User'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Administrator</div>
                    </div>
                    <div style={{
                        width: '36px', height: '36px',
                        borderRadius: '50%',
                        backgroundColor: '#1f2937',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <UserIcon size={20} color="#14b8a6" />
                    </div>
                </div>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    title="Logout"
                    style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        padding: '0.5rem',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        color: '#fca5a5',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    <LogOut size={18} />
                </button>
            </div>
        </header>
    );
};

export default TopBar;
