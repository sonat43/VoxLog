import React, { useState, useEffect } from 'react';
import AcademicMonthView from '../../components/common/AcademicMonthView';
import { db } from '../../services/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Calendar } from 'lucide-react';
import Toast from '../../components/common/Toast';

const ViewCalendar = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

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
            Toast.error("Failed to load school calendar");
        } finally {
            setLoading(false);
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
                    margin: 0 0 0.5rem 0;
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
                    <p style={{ color: '#94a3b8', margin: 0 }}>School-wide events, holidays, and examination dates</p>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>Loading calendar...</div>
            ) : (
                <div className="calendar-container">
                    <AcademicMonthView
                        events={events}
                        onDateClick={() => { }} // Read-only
                        readOnly={true}
                    />
                </div>
            )}
        </div>
    );
};

export default ViewCalendar;
