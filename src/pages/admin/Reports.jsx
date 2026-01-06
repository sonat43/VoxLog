import React from 'react';
import DataTable from '../../components/admin/DataTable';
import { Download, Filter } from 'lucide-react';

const Reports = () => {
    // Mock Data
    const auditData = [
        { date: '2025-12-28', class: 'CS-302 (OS)', faculty: 'Dr. Sarah Wilson', total: 60, present: 52, absent: 8, rate: '86.6%' },
        { date: '2025-12-28', class: 'EC-201 (Circuits)', faculty: 'Prof. James Miller', total: 45, present: 40, absent: 5, rate: '88.8%' },
        { date: '2025-12-27', class: 'ME-101 (Mechanics)', faculty: 'Prof. Alex Brown', total: 55, present: 45, absent: 10, rate: '81.8%' },
        { date: '2025-12-27', class: 'CV-401 (Struct)', faculty: 'Dr. Laura Davis', total: 50, present: 48, absent: 2, rate: '96.0%' },
        { date: '2025-12-26', class: 'CS-302 (OS)', faculty: 'Dr. Sarah Wilson', total: 60, present: 55, absent: 5, rate: '91.6%' },
    ];

    const columns = [
        { key: 'date', label: 'Date' },
        { key: 'class', label: 'Class / Section' },
        { key: 'faculty', label: 'Faculty' },
        { key: 'total', label: 'Total' },
        { key: 'present', label: 'Present', render: (val) => <strong style={{ color: '#34d399' }}>{val}</strong> },
        { key: 'absent', label: 'Absent', render: (val) => <strong style={{ color: '#f87171' }}>{val}</strong> },
        { key: 'rate', label: 'Attendance %', render: (val) => parseFloat(val) > 85 ? <span style={{ color: '#34d399' }}>{val}</span> : <span style={{ color: '#f59e0b' }}>{val}</span> },
    ];

    return (
        <div>
            {/* Filter Panel Mockup */}
            <div style={{
                background: '#1f2937',
                padding: '1.5rem',
                borderRadius: '1rem',
                marginBottom: '2rem',
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1rem',
                alignItems: 'end'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Date Range</label>
                    <input type="date" style={{ background: '#374151', border: '1px solid #4b5563', padding: '0.5rem', borderRadius: '0.375rem', color: 'white' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Department</label>
                    <select style={{ background: '#374151', border: '1px solid #4b5563', padding: '0.5rem', borderRadius: '0.375rem', color: 'white', minWidth: '150px' }}>
                        <option>All Departments</option>
                        <option>Computer Science</option>
                        <option>Electronics</option>
                    </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Status</label>
                    <select style={{ background: '#374151', border: '1px solid #4b5563', padding: '0.5rem', borderRadius: '0.375rem', color: 'white', minWidth: '150px' }}>
                        <option>All Sections</option>
                        <option>Low Attendance Warning</option>
                    </select>
                </div>
                <button style={{
                    marginTop: 'auto',
                    background: '#374151', color: 'white', border: '1px solid #4b5563',
                    padding: '0.5rem 1rem', borderRadius: '0.375rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}>
                    <Filter size={16} /> Filter
                </button>
                <div style={{ flex: 1 }}></div>
                <button style={{
                    marginTop: 'auto',
                    background: '#10b981', color: 'white', border: 'none',
                    padding: '0.5rem 1rem', borderRadius: '0.375rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}>
                    <Download size={16} /> Export CSV
                </button>
            </div>

            <DataTable
                title="Class Attendance Audit"
                columns={columns}
                data={auditData}
            />
        </div>
    );
};

export default Reports;
