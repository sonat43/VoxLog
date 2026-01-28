import React, { useState } from 'react';
import DataTable from '../../components/admin/DataTable';
import UserModal from '../../components/admin/UserModal';
import { MoreVertical, Edit2, UserX, Shield, RefreshCw, Trash2, Key } from 'lucide-react';
import { provisionUser, fetchAllUsers, updateUser, deleteUser } from '../../services/adminService';
import Toast from '../../components/common/Toast';
import ConfirmModal from '../../components/common/ConfirmModal';

const UserManagement = () => {
    // State
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Tab Logic
    const tabs = ['All Users', 'Faculty', 'Admins', 'Active', 'Disabled'];

    const [activeTab, setActiveTab] = useState('All Users');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);

    // UI State
    const [toast, setToast] = useState(null); // { message, type }
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDangerous: false });

    // Fetch Data on Mount
    React.useEffect(() => {
        const loadUsers = async () => {
            console.log("UserManagement: Starting to load users...");
            try {
                const data = await fetchAllUsers();
                console.log("UserManagement: Received data:", data);
                setUsers(data);
            } catch (error) {
                console.error("UserManagement: Failed to load users", error);
            } finally {
                setLoading(false);
            }
        };
        loadUsers();
    }, []);

    if (loading) return <div style={{ color: 'white', padding: '2rem' }}>Loading users...</div>;

    // Filtering Logic
    const getFilteredUsers = () => {
        switch (activeTab) {
            case 'Faculty': return users.filter(u => (u.role || '').toLowerCase() === 'faculty');
            case 'Admins': return users.filter(u => (u.role || '').toLowerCase() === 'admin');
            case 'Active': return users.filter(u => (u.status || '').toLowerCase() === 'active');
            case 'Disabled': return users.filter(u => (u.status || '').toLowerCase() === 'disabled');
            default: return users;
        }
    };



    // ... (in component)

    const handleProvisionUser = async (formData) => {
        if (editingUser) {
            // Edit Mode - Real Firestore Update
            try {
                await updateUser(editingUser.id, formData);

                setUsers(users.map(u => u.id === editingUser.id ? {
                    ...u,
                    displayName: formData.displayName,
                    department: formData.department,
                    role: formData.role === 'admin' ? 'Admin' : 'Faculty',
                    status: formData.status === 'active' ? 'Active' : 'Disabled'
                } : u));

                setToast({ message: "User updated successfully.", type: 'success' });
                setIsModalOpen(false);
                setEditingUser(null);
            } catch (error) {
                console.error("Update Error:", error);
                setToast({ message: "Failed to update user: " + error.message, type: 'error' });
            }
        } else {
            // Create Mode - REAL Firebase Provisioning
            try {
                // Provision via service (creates Auth User + Firestore Doc)
                const result = await provisionUser(formData);

                // Optimistically update UI
                const newUser = {
                    id: result.uid,
                    displayName: formData.displayName,
                    email: formData.email,
                    department: formData.department,
                    role: formData.role === 'admin' ? 'Admin' : 'Faculty',
                    status: formData.status === 'active' ? 'Active' : 'Disabled',
                    assignedClasses: 0,
                    lastLogin: 'Never'
                };

                setUsers([newUser, ...users]);

                if (formData.setPassword && formData.password) {
                    setToast({ message: `Success! User ${newUser.email} created.`, type: 'success' });
                } else {
                    setToast({ message: `Success! User ${newUser.email} created. Welcome email sent.`, type: 'success' });
                }

                setIsModalOpen(false);
                setEditingUser(null);

            } catch (error) {
                console.error("Provisioning Error:", error);

                let msg = error.message;
                if (error.code === 'auth/email-already-in-use') {
                    msg = "This email address is already registered.";
                } else if (error.code === 'auth/weak-password') {
                    msg = "Password is too weak. Please use at least 6 characters.";
                }

                setToast({ message: msg, type: 'error' });
                // Don't close modal so they can fix it
            }
        }
    };

    const handleMenuAction = async (action, user) => {
        setOpenMenuId(null);
        if (action === 'edit') {
            setEditingUser({
                id: user.id,
                displayName: user.displayName,
                email: user.email,
                department: user.department,
                role: user.role.toLowerCase(),
                status: user.status.toLowerCase()
            });
            setIsModalOpen(true);
        } else if (action === 'disable') {
            const newStatus = user.status === 'Active' ? 'Disabled' : 'Active';
            try {
                await updateUser(user.id, { ...user, status: newStatus });
                setUsers(users.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
                setToast({ message: `User ${user.displayName || 'User'} is now ${newStatus}`, type: 'success' });
            } catch (error) {
                console.error("Disable Error:", error);
                setToast({ message: "Failed to update status", type: 'error' });
            }
        } else if (action === 'role') {
            setEditingUser({
                id: user.id,
                displayName: user.displayName,
                email: user.email,
                department: user.department,
                role: user.role.toLowerCase(),
                status: user.status.toLowerCase()
            });
            setIsModalOpen(true);
        } else if (action === 'reset') {
            setToast({ message: `Password reset link sent to ${user.email}`, type: 'success' });
        } else if (action === 'delete') {
            // Confirm Modal Trigger
            setConfirmModal({
                isOpen: true,
                title: 'Delete User',
                message: `Are you sure you want to permanently delete ${user.displayName || 'this user'}? This action cannot be undone.`,
                isDangerous: true,
                confirmText: 'Delete User',
                onConfirm: async () => {
                    try {
                        await deleteUser(user.id);
                        setUsers(users.filter(u => u.id !== user.id));
                        setToast({ message: "User deleted successfully.", type: 'success' });
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    } catch (error) {
                        console.error("Delete Error:", error);
                        setToast({ message: "Failed to delete user: " + error.message, type: 'error' });
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    }
                }
            });
        }
    };

    const columns = [
        {
            key: 'displayName', label: 'Name / Email', render: (val, row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600, color: 'white' }}>
                        {(val || '?').charAt(0)}
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, color: 'white' }}>{val || 'Unknown'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{row.email}</div>
                    </div>
                </div>
            )
        },
        {
            key: 'role', label: 'Role', render: (val) => {
                const normalizedRole = (val || '').toLowerCase();
                const isAdmin = normalizedRole === 'admin';
                return (
                    <span style={{
                        padding: '0.25rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.025em',
                        background: isAdmin ? '#312e81' : '#134e4a', // Darker backgrounds for better contrast
                        color: isAdmin ? '#a78bfa' : '#2dd4bf',
                        border: `1px solid ${isAdmin ? 'rgba(139, 92, 246, 0.3)' : 'rgba(20, 184, 166, 0.3)'}`
                    }}>
                        {(val || 'Unknown').toUpperCase()}
                    </span>
                );
            }
        },
        {
            key: 'status', label: 'Status', render: (val) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: val === 'Active' ? '#10b981' : '#ef4444',
                        boxShadow: val === 'Active' ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none'
                    }}></span>
                    <span style={{ color: val === 'Active' ? '#e5e7eb' : '#9ca3af' }}>{val}</span>
                </div>
            )
        },
        { key: 'department', label: 'Department' },
        {
            key: 'assignedClasses', label: 'Assigned Classes', render: (val) => (
                <span style={{ color: '#9ca3af' }}>{val > 0 ? `${val} Classes` : '-'}</span>
            )
        },
        { key: 'lastLogin', label: 'Last Login', render: (val) => <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#9ca3af' }}>{val}</span> },
    ];

    const renderActions = (row) => (
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end' }}>
            <button
                onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === row.id ? null : row.id); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '0.25rem' }}
            >
                <MoreVertical size={18} />
            </button>

            {/* Context Menu */}
            {openMenuId === row.id && (
                <div style={{
                    position: 'absolute', right: '0', top: '100%', zIndex: 50,
                    background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)', width: '180px', overflow: 'hidden'
                }}>
                    <div style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column' }}>
                        <button onClick={() => handleMenuAction('edit', row)} style={menuItemStyle}><Edit2 size={14} /> Edit Profile</button>
                        <button onClick={() => handleMenuAction('role', row)} style={menuItemStyle}><Shield size={14} /> Change Role</button>
                        <button onClick={() => handleMenuAction('reset', row)} style={menuItemStyle}><Key size={14} /> Reset Password</button>
                        <button onClick={() => handleMenuAction('disable', row)} style={menuItemStyle}>
                            <RefreshCw size={14} /> {row.status === 'Active' ? 'Disable User' : 'Activate User'}
                        </button>
                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '0.25rem 0' }}></div>
                        <button onClick={() => handleMenuAction('delete', row)} style={{ ...menuItemStyle, color: '#f87171' }}><Trash2 size={14} /> Delete User</button>
                    </div>
                </div>
            )}
            {/* Click outside listener handled by pure CSS backdrop usually, but here simple toggle */}
        </div>
    );

    const menuItemStyle = {
        background: 'transparent', border: 'none', color: '#d1d5db',
        padding: '0.5rem', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem',
        display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '0.25rem',
        transition: 'background 0.2s'
    };

    return (
        <div onClick={() => setOpenMenuId(null)}> {/* Close menu on outside click */}
            {/* Page Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>User Management: Faculty & Administrators</h1>
                <p style={{ color: '#9ca3af', margin: 0 }}>Manage faculty and administrator accounts, control access levels, and ensure secure system usage.</p>
            </div>

            {/* Segmentation Tabs */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1px' }}>
                {tabs.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            background: 'none', border: 'none', padding: '0.75rem 0.5rem',
                            color: activeTab === tab ? '#14b8a6' : '#9ca3af',
                            borderBottom: activeTab === tab ? '2px solid #14b8a6' : '2px solid transparent',
                            cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        {tab} <span style={{
                            fontSize: '0.75rem', background: activeTab === tab ? 'rgba(20, 184, 166, 0.2)' : 'rgba(255,255,255,0.05)',
                            padding: '0.1rem 0.4rem', borderRadius: '9999px', marginLeft: '0.25rem'
                        }}>
                            {/* Mock Counts based on filter logic */}
                            {tab === 'All Users' ? users.length :
                                tab === 'Faculty' ? users.filter(u => (u.role || '').toLowerCase() === 'faculty').length :
                                    tab === 'Admins' ? users.filter(u => (u.role || '').toLowerCase() === 'admin').length :
                                        tab === 'Active' ? users.filter(u => (u.status || '').toLowerCase() === 'active').length :
                                            users.filter(u => (u.status || '').toLowerCase() === 'disabled').length}
                        </span>
                    </button>
                ))}
            </div>

            <DataTable
                title="System Users"
                columns={columns}
                data={getFilteredUsers()}
                onAdd={() => { setEditingUser(null); setIsModalOpen(true); }}
                renderActions={renderActions}
            />

            <UserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleProvisionUser}
                editingUser={editingUser}
            />



            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                isDangerous={confirmModal.isDangerous}
                confirmText={confirmModal.confirmText}
            />
        </div>
    );
};

export default UserManagement;
