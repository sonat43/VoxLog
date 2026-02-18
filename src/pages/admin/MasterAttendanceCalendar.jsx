import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, Download, Filter } from 'lucide-react';
import { getMasterAttendanceReport } from '../../services/reportingService';
import { fetchAllUsers } from '../../services/adminService';
import Toast from '../../components/common/Toast';

const MasterAttendanceCalendar = () => {
    const [reportData, setReportData] = useState({});
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date()); // View reference date
    const [facultyList, setFacultyList] = useState([]);

    // Date Range Logic (Weekly View)
    const getWeekRange = (date) => {
        const start = new Date(date);
        start.setDate(start.getDate() - start.getDay() + 1); // Monday
        const end = new Date(start);
        end.setDate(end.getDate() + 5); // Saturday
        return { start, end };
    };

    const { start, end } = getWeekRange(currentDate);
    const weekDates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        weekDates.push(new Date(d));
    }

    useEffect(() => {
        loadReport();
    }, [start.toISOString()]); // Reload when week changes

    const loadReport = async () => {
        setLoading(true);
        try {
            const data = await getMasterAttendanceReport(start, end);
            setReportData(data);
            setFacultyList(Object.keys(data).map(id => ({ id, ...data[id] })));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrevWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentDate(newDate);
    };

    const handleNextWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentDate(newDate);
    };

    const getStatusStyle = (cell) => {
        if (!cell) return { bg: '#1e293b', text: '-' };

        switch (cell.color) {
            case 'Green': return { bg: 'rgba(34, 197, 94, 0.2)', border: '1px solid #22c55e', text: 'P' };
            case 'Yellow': return { bg: 'rgba(234, 179, 8, 0.2)', border: '1px solid #eab308', text: 'L' };
            case 'Red': return { bg: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', text: 'A' };
            case 'Blue': return { bg: 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6', text: 'S' };
            case 'Gray': return { bg: '#334155', border: 'none', text: '-' };
            default: return { bg: '#1e293b', border: 'none', text: '?' };
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>Master Attendance Calendar</h1>
                    <p style={{ color: '#94a3b8' }}>Overview of faculty attendance, leaves, and substitutions.</p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#1e293b', borderRadius: '12px', padding: '4px' }}>
                        <button onClick={handlePrevWeek} style={{ padding: '8px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                            <ChevronLeft size={20} />
                        </button>
                        <span style={{ padding: '0 16px', color: '#cbd5e1', fontWeight: 600 }}>
                            {start.toLocaleDateString()} - {end.toLocaleDateString()}
                        </span>
                        <button onClick={handleNextWeek} style={{ padding: '8px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', padding: '16px', background: '#1e293b', borderRadius: '12px', width: 'fit-content' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '16px', height: '16px', background: 'rgba(34, 197, 94, 0.2)', border: '1px solid #22c55e', borderRadius: '4px' }}></div>
                    <span style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Present</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '16px', height: '16px', background: 'rgba(234, 179, 8, 0.2)', border: '1px solid #eab308', borderRadius: '4px' }}></div>
                    <span style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>On Leave</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '16px', height: '16px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '4px' }}></div>
                    <span style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Absent</span>
                </div>
                {/* <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '16px', height: '16px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6', borderRadius: '4px' }}></div>
                    <span style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Substituted</span>
                </div> */}
            </div>

            {/* Calendar Grid */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>Loading...</div>
            ) : (
                <div style={{ overflowX: 'auto', background: '#0f172a', borderRadius: '16px', border: '1px solid #334155' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ background: '#1e293b' }}>
                                <th style={{ padding: '16px', textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #334155', minWidth: '200px' }}>Faculty</th>
                                {weekDates.map(date => (
                                    <th key={date.toISOString()} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', borderBottom: '1px solid #334155', width: '100px' }}>
                                        <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '4px' }}>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                        <div style={{ fontSize: '1.1rem', color: 'white' }}>{date.getDate()}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {facultyList.map(faculty => (
                                <tr key={faculty.id} style={{ borderBottom: '1px solid #1e293b' }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ fontWeight: 600, color: 'white' }}>{faculty.facultyName}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{faculty.department}</div>
                                    </td>
                                    {weekDates.map(date => {
                                        const dateStr = date.toISOString().split('T')[0];
                                        const cell = faculty.days[dateStr];
                                        const style = getStatusStyle(cell);

                                        return (
                                            <td key={dateStr} style={{ padding: '8px', textAlign: 'center' }}>
                                                <div
                                                    title={cell?.details}
                                                    style={{
                                                        width: '40px', height: '40px', margin: '0 auto',
                                                        borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        background: style.bg, border: style.border, color: 'white', fontWeight: 600,
                                                        fontSize: '0.9rem', cursor: 'default'
                                                    }}
                                                >
                                                    {style.text}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default MasterAttendanceCalendar;
