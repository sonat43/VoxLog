import React, { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const AcademicMonthView = ({ events = [], onDateClick, readOnly = false }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    const renderHeader = () => {
        return (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'white' }}>
                    {format(currentDate, 'MMMM yyyy')}
                </h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={prevMonth} style={{ padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={nextMonth} style={{ padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        );
    };

    const renderDays = () => {
        const days = [];
        const startDate = startOfWeek(currentDate);

        for (let i = 0; i < 7; i++) {
            // Use format(..., 'E') for short day names (Mon, Tue) on mobile, 'EEEE' for desktop.
            // We can handle this via CSS by rendering both and hiding one.
            days.push(
                <div key={i} className="calendar-day-header" style={{ textAlign: 'center', fontWeight: 600, color: '#94a3b8', padding: '10px 0', textTransform: 'uppercase' }}>
                    <span className="hidden md:inline">{format(addDays(startDate, i), 'EEEE')}</span>
                    <span className="inline md:hidden">{format(addDays(startDate, i), 'EEEEE')}</span>
                </div>
            );
        }
        return <div className="calendar-grid">{days}</div>;
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const rows = [];
        let days = [];
        let day = startDate;

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                const formattedDate = format(day, 'd');
                const cloneDay = day;
                const dateStr = format(day, 'yyyy-MM-dd');
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                // Find events for this day
                const dayEvents = events.filter(e => e.date === dateStr);
                const hasHolidayEvent = dayEvents.some(e => e.type === 'Holiday');
                const isDesignatedHoliday = isWeekend || hasHolidayEvent;

                let cellBg = isSameMonth(day, monthStart) ? '#1e293b' : 'rgba(30, 41, 59, 0.4)';
                let borderColor = '#334155';

                if (isDesignatedHoliday && isSameMonth(day, monthStart)) {
                    cellBg = 'rgba(168, 85, 247, 0.05)'; // Very subtle purple for holidays/weekends
                    borderColor = 'rgba(168, 85, 247, 0.2)';
                }

                days.push(
                    <div
                        key={day.toISOString()}
                        className="calendar-cell"
                        onClick={() => !readOnly && onDateClick(cloneDay, dayEvents)}
                        style={{
                            minWidth: '0',
                            background: cellBg,
                            border: `1px solid ${borderColor}`,
                            borderRadius: '12px',
                            cursor: readOnly ? 'default' : 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            opacity: isSameMonth(day, monthStart) ? 1 : 0.4,
                            boxShadow: isDesignatedHoliday && isSameMonth(day, monthStart) ? 'inset 0 0 20px rgba(168, 85, 247, 0.02)' : 'none'
                        }}
                        onMouseEnter={(e) => {
                            if (!readOnly) e.currentTarget.style.borderColor = isDesignatedHoliday ? '#a855f7' : '#3b82f6';
                            if (!readOnly) e.currentTarget.style.background = isDesignatedHoliday ? 'rgba(168, 85, 247, 0.15)' : '#27354f';
                            if (!readOnly) e.currentTarget.style.transform = 'translateY(-2px)';
                            if (!readOnly) e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={(e) => {
                            if (!readOnly) e.currentTarget.style.borderColor = borderColor;
                            if (!readOnly) e.currentTarget.style.background = cellBg;
                            if (!readOnly) e.currentTarget.style.transform = 'translateY(0)';
                            if (!readOnly) e.currentTarget.style.boxShadow = isDesignatedHoliday && isSameMonth(day, monthStart) ? 'inset 0 0 20px rgba(168, 85, 247, 0.02)' : 'none';
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {/* Weekend/Holiday Indicator */}
                            {isDesignatedHoliday && isSameMonth(day, monthStart) ? (
                                <span className="calendar-holiday-indicator" style={{ fontWeight: 600, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {isWeekend ? 'Weekend' : 'Holiday'}
                                </span>
                            ) : <span></span>}

                            <span className="calendar-date-number" style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: '50%',
                                background: isSameDay(day, new Date()) ? '#3b82f6' : 'transparent',
                                color: isSameDay(day, new Date()) ? 'white' : (isDesignatedHoliday ? '#c084fc' : '#cbd5e1'),
                                fontWeight: isSameDay(day, new Date()) ? 700 : 600,
                            }}>
                                {formattedDate}
                            </span>
                        </div>

                        <div className="calendar-events-container" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' }}>
                            {dayEvents.map((evt, idx) => {
                                let bg = 'rgba(20, 184, 166, 0.15)';
                                let color = '#2dd4bf'; // Teal for Event

                                if (evt.type === 'Holiday') { bg = 'rgba(168, 85, 247, 0.2)'; color = '#d8b4fe'; }
                                if (evt.type === 'Exam') { bg = 'rgba(249, 115, 22, 0.15)'; color = '#fdba74'; }

                                return (
                                    <div key={idx} className="calendar-event-badge" style={{
                                        background: bg,
                                        color: color,
                                        borderRadius: '6px',
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        border: `1px solid ${color}40`
                                    }} title={evt.title}>
                                        {evt.title}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div key={day} className="calendar-grid">
                    {days}
                </div>
            );
            days = [];
        }
        return <div>{rows}</div>;
    };

    return (
        <div style={{ width: '100%' }}>
            <style>{`
                .calendar-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 10px;
                    margin-bottom: 10px;
                }
                .calendar-cell {
                    min-height: 120px;
                    padding: 8px;
                }
                .calendar-day-header {
                    font-size: 0.8rem;
                }
                .calendar-date-number {
                    width: 28px;
                    height: 28px;
                    font-size: 0.9rem;
                }
                .calendar-event-badge {
                    font-size: 0.75rem;
                    padding: 4px 8px;
                }
                .calendar-holiday-indicator {
                    font-size: 0.65rem;
                    display: block;
                }
                .calendar-events-container {
                    margin-top: 8px;
                }
                
                @media (max-width: 768px) {
                    .calendar-grid {
                        gap: 4px;
                        margin-bottom: 4px;
                    }
                    .calendar-cell {
                        min-height: 70px;
                        padding: 4px;
                        border-radius: 8px !important;
                    }
                    .calendar-day-header {
                        font-size: 0.65rem;
                        padding: 5px 0 !important;
                    }
                    .calendar-date-number {
                        width: 20px;
                        height: 20px;
                        font-size: 0.75rem;
                    }
                    .calendar-event-badge {
                        font-size: 0.55rem;
                        padding: 2px 4px;
                        border-radius: 4px !important;
                        white-space: normal !important;
                        line-height: 1.1;
                        text-align: center;
                    }
                    .calendar-holiday-indicator {
                        display: none; /* Hide label to save space on mobile */
                    }
                    .calendar-events-container {
                        margin-top: 4px;
                        gap: 2px !important;
                    }
                }
            `}</style>

            {renderHeader()}
            {renderDays()}
            {renderCells()}

            <div style={{ display: 'flex', gap: '16px', marginTop: '16px', padding: '16px', background: '#1e293b', borderRadius: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', background: '#a855f7', borderRadius: '2px' }}></div>
                    <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Holiday</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', background: '#f97316', borderRadius: '2px' }}></div>
                    <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Exam</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', background: '#14b8a6', borderRadius: '2px' }}></div>
                    <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Event</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', background: 'transparent', border: '1px solid #334155', borderRadius: '2px' }}></div>
                    <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>No Event</span>
                </div>
            </div>
        </div>
    );
};

export default AcademicMonthView;
