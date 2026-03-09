import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import AcademicMonthView from '../../components/common/AcademicMonthView';
import { db } from '../../services/firebase';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc, query, where } from 'firebase/firestore';
import { Trash2, Plus, Calendar, Edit2 } from 'lucide-react';
import Toast from '../../components/common/Toast';

const SchoolCalendar = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [toast, setToast] = useState(null);

    // Form State
    const [selectedDate, setSelectedDate] = useState(null);
    const [title, setTitle] = useState('');
    const [type, setType] = useState('Holiday');
    const [editingEventId, setEditingEventId] = useState(null);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, "academic_events"));
            const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setEvents(fetched);
        } catch (error) {
            console.error("Error fetching events:", error);
            setToast({ type: 'error', message: "Failed to load calendar events" });
        } finally {
            setLoading(false);
        }
    };

    const handleDateClick = (date, dayEvents) => {
        // Use date-fns format to get the local date string instead of toISOString() which uses UTC
        const dateStr = format(date, 'yyyy-MM-dd');
        setSelectedDate(dateStr);
        setEditingEventId(null);
        setTitle('');
        setType('Holiday');
        setShowModal(true);
    };

    const handleSaveEvent = async (e) => {
        e.preventDefault();
        try {
            if (editingEventId) {
                await updateDoc(doc(db, "academic_events", editingEventId), {
                    title,
                    type
                });
                setToast({ type: 'success', message: "Event updated successfully" });
            } else {
                await addDoc(collection(db, "academic_events"), {
                    date: selectedDate,
                    title,
                    type
                });
                setToast({ type: 'success', message: "Event added successfully" });
            }
            setShowModal(false);
            setTitle('');
            setType('Holiday');
            setEditingEventId(null);
            fetchEvents();
        } catch (error) {
            console.error("Error saving event:", error);
            setToast({ type: 'error', message: "Failed to save event" });
        }
    };

    const handleDeleteEvent = async (id) => {
        try {
            await deleteDoc(doc(db, "academic_events", id));
            setToast({ type: 'success', message: "Event deleted" });

            // clear editing state if we deleted the event we were editing
            if (editingEventId === id) {
                setEditingEventId(null);
                setTitle('');
                setType('Holiday');
            }

            fetchEvents();
        } catch (error) {
            console.error("Error deleting event:", error);
            setToast({ type: 'error', message: "Failed to delete event" });
        }
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
            <style>{`
                .calendar-container {
                    background: #0f172a;
                    padding: 2rem;
                    border-radius: 16px;
                    border: 1px solid #1e293b;
                }
                .calendar-header-title {
                    font-size: 2rem;
                    font-weight: 700;
                    color: white;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                @media (max-width: 768px) {
                    .calendar-container {
                        padding: 1rem;
                        border-radius: 12px;
                    }
                    .calendar-header-title {
                        font-size: 1.5rem;
                    }
                }
            `}</style>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 className="calendar-header-title">
                        <Calendar color="#3b82f6" />
                        Academic Calendar
                    </h1>
                    <p style={{ color: '#94a3b8', margin: 0 }}>School-wide event and holiday management</p>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>Loading calendar...</div>
            ) : (
                <div className="calendar-container">
                    <AcademicMonthView
                        events={events}
                        onDateClick={handleDateClick}
                        readOnly={false}
                    />
                </div>
            )}

            {/* Add Event Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
                }}>
                    <div style={{
                        background: '#1e293b', padding: '2rem', borderRadius: '16px',
                        width: '100%', maxWidth: '400px', border: '1px solid #334155'
                    }}>
                        <h3 style={{ marginTop: 0, color: 'white', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {editingEventId ? <Edit2 size={20} color="#3b82f6" /> : <Plus size={20} color="#3b82f6" />}
                            {editingEventId ? 'Edit Event' : `Add Event`}
                        </h3>

                        {/* Existing Events for this day */}
                        {events.filter(e => e.date === selectedDate).length > 0 && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px', display: 'block' }}>Existing Events:</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {events.filter(e => e.date === selectedDate).map(evt => (
                                        <div key={evt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', padding: '10px', borderRadius: '8px' }}>
                                            <div>
                                                <div style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>{evt.title}</div>
                                                <div style={{ color: evt.type === 'Holiday' ? '#a855f7' : '#f97316', fontSize: '0.75rem' }}>{evt.type}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingEventId(evt.id); setTitle(evt.title); setType(evt.type); }} style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '4px' }} title="Edit Event">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteEvent(evt.id); }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }} title="Delete Event">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSaveEvent}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1', fontSize: '0.9rem' }}>Date</label>
                                <input
                                    type="date"
                                    value={selectedDate || ''}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    required
                                    disabled={!!editingEventId}
                                    style={{
                                        width: '100%', padding: '10px 14px', background: editingEventId ? 'rgba(30, 41, 59, 0.5)' : '#0f172a',
                                        border: '1px solid #334155', borderRadius: '8px', color: editingEventId ? '#94a3b8' : 'white', outline: 'none'
                                    }}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1', fontSize: '0.9rem' }}>Event Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                    placeholder="e.g. Diwali Holiday"
                                    style={{
                                        width: '100%', padding: '10px 14px', background: '#0f172a',
                                        border: '1px solid #334155', borderRadius: '8px', color: 'white', outline: 'none'
                                    }}
                                />
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1', fontSize: '0.9rem' }}>Event Type</label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    style={{
                                        width: '100%', padding: '10px 14px', background: '#0f172a',
                                        border: '1px solid #334155', borderRadius: '8px', color: 'white', outline: 'none'
                                    }}
                                >
                                    <option value="Holiday">Holiday</option>
                                    <option value="Exam">Exam Date</option>
                                    <option value="Event">General Event</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => { setShowModal(false); setEditingEventId(null); setTitle(''); setType('Holiday'); }} style={{ padding: '10px 16px', background: 'transparent', border: '1px solid #334155', color: '#cbd5e1', borderRadius: '8px', cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <button type="submit" style={{ padding: '10px 16px', background: '#3b82f6', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                                    {editingEventId ? 'Update Event' : 'Save Event'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default SchoolCalendar;
