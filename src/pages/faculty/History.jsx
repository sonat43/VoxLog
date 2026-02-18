import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAttendanceHistory } from '../../services/facultyService';
import { History as HistoryIcon, Clock, Calendar, Search, Filter } from 'lucide-react';
import LoadingScreen from '../../components/LoadingScreen';

const History = () => {
    const { user } = useAuth();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSubject, setFilterSubject] = useState('');

    useEffect(() => {
        const fetchHistory = async () => {
            if (user) {
                setLoading(true);
                try {
                    const data = await getAttendanceHistory(user.uid);
                    setHistory(data);
                } catch (error) {
                    console.error("Failed to load history", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchHistory();
    }, [user]);

    // Unique subjects for filter
    const subjects = [...new Set(history.map(item => item.subjectName).filter(Boolean))];

    const filteredHistory = history.filter(item => {
        const matchesSearch =
            (item.subjectName && item.subjectName.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.topic && item.topic.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesFilter = filterSubject ? item.subjectName === filterSubject : true;

        return matchesSearch && matchesFilter;
    });

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate();
        return {
            date: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
            time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
    };

    if (loading) return <LoadingScreen />;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ color: 'white', marginBottom: '0.5rem', fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <HistoryIcon size={32} color="#f59e0b" />
                    Attendance History
                </h1>
                <p style={{ color: 'var(--color-text-muted)' }}>
                    View past attendance sessions and records.
                </p>
            </div>

            {/* Filters */}
            <div style={{
                display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap',
                background: 'rgba(30, 41, 59, 0.4)', padding: '1.5rem', borderRadius: '1rem',
                border: '1px solid var(--color-border)'
            }}>
                <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Search by subject or topic..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px',
                            background: '#0f172a', border: '1px solid #334155', color: 'white', outline: 'none'
                        }}
                    />
                </div>
                <div style={{ minWidth: '200px', position: 'relative' }}>
                    <Filter size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <select
                        value={filterSubject}
                        onChange={(e) => setFilterSubject(e.target.value)}
                        style={{
                            width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px',
                            background: '#0f172a', border: '1px solid #334155', color: 'white', outline: 'none',
                            appearance: 'none', cursor: 'pointer'
                        }}
                    >
                        <option value="">All Subjects</option>
                        {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {/* Content */}
            {filteredHistory.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '4rem',
                    background: 'rgba(255,255,255,0.02)', borderRadius: '1rem',
                    border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)'
                }}>
                    <HistoryIcon size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <p>No history records found.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {filteredHistory.map((item) => {
                        const { date, time } = formatDate(item.timestamp);
                        return (
                            <div key={item.id} style={{
                                background: 'rgba(30, 41, 59, 0.6)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '0.75rem',
                                padding: '1.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'transform 0.2s',
                                cursor: 'default'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                    <div style={{
                                        padding: '12px', borderRadius: '12px',
                                        background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '80px'
                                    }}>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{date}</span>
                                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{time}</span>
                                    </div>
                                    <div>
                                        <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: 'white' }}>{item.subjectName}</h3>
                                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>
                                            {item.topic || 'No topic recorded'}
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Stats</div>
                                        <div style={{ color: '#e2e8f0', fontWeight: 500 }}>
                                            <span style={{ color: '#10b981' }}>{item.presentCount} P</span> / <span style={{ color: '#ef4444' }}>{item.absentCount} A</span>
                                        </div>
                                    </div>

                                    <div style={{
                                        padding: '6px 12px', borderRadius: '20px',
                                        background: item.mode === 'voice' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                        color: item.mode === 'voice' ? '#a78bfa' : '#34d399',
                                        fontSize: '0.8rem', fontWeight: 600,
                                        border: `1px solid ${item.mode === 'voice' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                                    }}>
                                        {item.mode === 'voice' ? 'Voice AI' : 'Manual'}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default History;
