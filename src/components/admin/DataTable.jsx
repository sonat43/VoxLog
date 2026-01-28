import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';

const DataTable = ({ title, columns, data, onSearch, onAdd, renderActions, itemsPerPage = 5 }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    // const itemsPerPage = 5; // Removed hardcoded value

    // Filter Logic (Simple client-side)
    const filteredData = data.filter(item =>
        Object.values(item).some(val =>
            String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const displayedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div style={{
            background: '#111827',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '1rem',
            overflow: 'hidden'
        }}>
            {/* Table Header */}
            <div style={{
                padding: '1.5rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                alignItems: 'center'
            }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{title}</h3>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} color="#9ca3af" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            style={{
                                backgroundColor: 'rgba(31, 41, 55, 0.5)',
                                border: '1px solid rgba(75, 85, 99, 0.4)',
                                borderRadius: '0.5rem',
                                padding: '0.5rem 1rem 0.5rem 2.5rem',
                                color: 'white',
                                fontSize: '0.875rem',
                                outline: 'none',
                                width: '200px'
                            }}
                        />
                    </div>
                    {onAdd && (
                        <button
                            onClick={onAdd}
                            style={{
                                backgroundColor: '#14b8a6',
                                color: '#fff',
                                border: 'none',
                                padding: '0.5rem 1rem',
                                borderRadius: '0.5rem',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}
                        >
                            <span>+ Add New</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Table Content */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                            {columns.map((col, i) => (
                                <th key={i} style={{ padding: '1rem 1.5rem', color: '#9ca3af', fontWeight: 500, fontSize: '0.875rem' }}>
                                    {col.label}
                                </th>
                            ))}
                            {renderActions && <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {displayedData.length > 0 ? displayedData.map((row, rowIdx) => (
                            <tr key={rowIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                                {columns.map((col, colIdx) => (
                                    <td key={colIdx} style={{ padding: '1rem 1.5rem', color: '#f3f4f6', fontSize: '0.9rem' }}>
                                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                                    </td>
                                ))}
                                {renderActions && (
                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                        {renderActions(row)}
                                    </td>
                                )}
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={columns.length + (renderActions ? 1 : 0)} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                                    No records found matching your query.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: '#9ca3af',
                fontSize: '0.875rem'
            }}>
                <span>Showing {displayedData.length} of {filteredData.length} entries</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                        style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', color: currentPage === 1 ? '#4b5563' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        disabled={currentPage === totalPages || totalPages === 0}
                        onClick={() => setCurrentPage(p => p + 1)}
                        style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', color: (currentPage === totalPages || totalPages === 0) ? '#4b5563' : 'white', cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer' }}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DataTable;
