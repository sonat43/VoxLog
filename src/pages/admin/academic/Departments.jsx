import React, { useState, useEffect } from 'react';
import DataTable from '../../../components/admin/DataTable';
import SimpleModal from '../../../components/admin/academic/SimpleModal';
import { Plus, Trash2, Power, AlertCircle } from 'lucide-react';
import { getDepartments, addDepartment, updateDepartmentStatus, deleteDepartment } from '../../../services/academicService';
import Toast from '../../../components/common/Toast';
import ConfirmModal from '../../../components/common/ConfirmModal';

const Departments = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newDeptName, setNewDeptName] = useState('');
    const [toast, setToast] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false });

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getDepartments();
            setDepartments(data);
        } catch (error) {
            setToast({ message: "Failed to load departments", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await addDepartment(newDeptName);
            setToast({ message: "Department added successfully", type: "success" });
            setIsModalOpen(false);
            setNewDeptName('');
            fetchData();
        } catch (error) {
            setToast({ message: error.message, type: "error" });
        }
    };

    const handleToggleStatus = async (dept) => {
        const newStatus = dept.status === 'active' ? 'inactive' : 'active';
        try {
            await updateDepartmentStatus(dept.id, newStatus);
            setToast({ message: `Department marked as ${newStatus}`, type: "success" });
            fetchData();
        } catch (error) {
            setToast({ message: "Failed to update status", type: "error" });
        }
    };

    const handleDelete = (dept) => {
        setConfirmModal({
            isOpen: true,
            title: "Delete Department",
            message: `Are you sure you want to delete ${dept.name}?`,
            isDangerous: true,
            confirmText: "Delete",
            onConfirm: async () => {
                try {
                    await deleteDepartment(dept.id);
                    setToast({ message: "Department deleted successfully", type: "success" });
                    setConfirmModal({ isOpen: false });
                    fetchData();
                } catch (error) {
                    setToast({ message: error.message, type: "error" });
                    setConfirmModal({ isOpen: false });
                }
            }
        });
    };

    const columns = [
        { key: 'name', label: 'Department Name', render: (val) => <span style={{ color: 'white', fontWeight: 500 }}>{val}</span> },
        {
            key: 'status',
            label: 'Status',
            render: (val) => (
                <span style={{
                    padding: '0.25rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 700,
                    background: val === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: val === 'active' ? '#10b981' : '#ef4444',
                    border: `1px solid ${val === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                }}>
                    {val.toUpperCase()}
                </span>
            )
        },
        {
            key: 'createdAt',
            label: 'Created At',
            render: (val) => <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{val?.toDate ? val.toDate().toLocaleDateString() : 'Just now'}</span>
        }
    ];

    const renderActions = (row) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
                onClick={() => handleToggleStatus(row)}
                title={row.status === 'active' ? 'Deactivate' : 'Activate'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: row.status === 'active' ? '#ef4444' : '#10b981' }}
            >
                <Power size={16} />
            </button>
            <button
                onClick={() => handleDelete(row)}
                title="Delete"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
            >
                <Trash2 size={16} />
            </button>
        </div>
    );

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: 'white' }}>Departments</h1>
                <p style={{ color: '#9ca3af', margin: 0 }}>Manage academic departments.</p>
            </div>

            <DataTable
                title="Department List"
                columns={columns}
                data={departments}
                onAdd={() => setIsModalOpen(true)}
                renderActions={renderActions}
            />

            <SimpleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Department">
                <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>Department Name</label>
                        <input
                            value={newDeptName}
                            onChange={(e) => setNewDeptName(e.target.value)}
                            required
                            placeholder="e.g. Computer Science"
                            style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#374151', border: '1px solid #4b5563', color: 'white', outline: 'none' }}
                        />
                    </div>
                    <button type="submit" style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#14b8a6', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                        Create Department
                    </button>
                </form>
            </SimpleModal>

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

export default Departments;
