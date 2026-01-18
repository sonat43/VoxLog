import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    Home,
    Users,
    BookOpen,
    GraduationCap,
    FileText,
    BarChart2,
    Settings,
    ChevronLeft,
    Menu,
    Layers,
    Book,
    Calendar,
    Library,
    UserCheck
} from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const navItems = [
        { path: '/admin-dashboard/overview', icon: Home, label: 'Overview' },
        { path: '/admin-dashboard/users', icon: Users, label: 'Manage Faculty & Admins' },

        { path: '/admin-dashboard/students', icon: GraduationCap, label: 'Manage Students' },
        { path: '/admin-dashboard/reports', icon: FileText, label: 'Attendance Audit' },

        { path: '/admin-dashboard/settings', icon: Settings, label: 'Settings & Config' },
        // New Academic Structure Modules
        { path: '/admin-dashboard/departments', icon: Layers, label: 'Departments' },
        { path: '/admin-dashboard/academic-courses', icon: Book, label: 'Courses' },
        { path: '/admin-dashboard/semesters', icon: Calendar, label: 'Semesters' },
        { path: '/admin-dashboard/subjects', icon: Library, label: 'Subjects' },
        { path: '/admin-dashboard/assignments', icon: UserCheck, label: 'Faculty Assignment' },
    ];

    return (
        <aside style={{
            width: isOpen ? '260px' : '70px',
            backgroundColor: '#111827',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            height: '100vh',
            transition: 'width 0.3s ease',
            position: 'fixed',
            left: 0,
            top: 0,
            zIndex: 40,
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Logo Area */}
            <div style={{
                height: '64px',
                display: 'flex',
                alignItems: 'center',
                padding: isOpen ? '0 1.5rem' : '0',
                justifyContent: isOpen ? 'flex-start' : 'center',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
                <img src="/logo.png" alt="Logo" style={{ height: '32px', width: 'auto' }} />
                {isOpen && (
                    <span style={{
                        marginLeft: '0.75rem',
                        fontWeight: '800',
                        fontSize: '1.25rem',
                        color: 'white',
                        letterSpacing: '-0.02em'
                    }}>
                        VoxLog
                    </span>
                )}
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, padding: '1.5rem 0.75rem', overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            style={({ isActive }) => ({
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                color: isActive ? '#fff' : '#9ca3af',
                                backgroundColor: isActive ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
                                borderLeft: isActive ? '3px solid #14b8a6' : '3px solid transparent',
                                textDecoration: 'none',
                                transition: 'all 0.2s ease',
                                justifyContent: isOpen ? 'flex-start' : 'center',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden'
                            })}
                        >
                            <item.icon size={20} color={isOpen ? undefined : (isActive ? '#14b8a6' : '#9ca3af')} />
                            {isOpen && (
                                <span style={{ marginLeft: '1rem', fontSize: '0.9rem', fontWeight: 500 }}>
                                    {item.label}
                                </span>
                            )}
                        </NavLink>
                    ))}
                </div>
            </nav>

            {/* Collapse Toggle */}
            <div style={{
                padding: '1rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex',
                justifyContent: isOpen ? 'flex-end' : 'center'
            }}>
                <button
                    onClick={toggleSidebar}
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: 'none',
                        color: '#9ca3af',
                        padding: '0.5rem',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    {isOpen ? <ChevronLeft size={18} /> : <Menu size={18} />}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
