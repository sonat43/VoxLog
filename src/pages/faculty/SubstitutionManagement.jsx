import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, User, CheckCircle, AlertCircle, X, Search, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getClassesNeedingSubstitution, getAvailableFaculty, createSubstitution } from '../../services/substitutionService';
import { getSemesters } from '../../services/academicService';
import Toast from '../../components/common/Toast';

const SubstitutionManagement = ({ isOpen, onClose }) => {
    const { user, role } = useAuth();

    // State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [impactedClasses, setImpactedClasses] = useState([]);

    // Selection for Assignment
    const [selectedImpactedClass, setSelectedImpactedClass] = useState(null);
    const [availableFaculty, setAvailableFaculty] = useState([]);
    const [selectedSubstitute, setSelectedSubstitute] = useState(null);

    const [loading, setLoading] = useState(false);
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [toast, setToast] = useState(null);

    // Manual Mode State
    const [showManualModal, setShowManualModal] = useState(false);
    const [semesters, setSemesters] = useState([]);
    const [manualSemesterId, setManualSemesterId] = useState('');
    const [manualPeriod, setManualPeriod] = useState('');
    const [manualSubjectName, setManualSubjectName] = useState('');

    // Initial Load
    useEffect(() => {
        if (isOpen) {
            loadImpactedClasses();
        }
    }, [isOpen, date]);

    // When a class is selected for substitution, check availability
    useEffect(() => {
        if (selectedImpactedClass) {
            setAvailableFaculty([]);
            setSelectedSubstitute(null);
            checkAvailability();
        }
    }, [selectedImpactedClass]);

    const loadImpactedClasses = async () => {
        setLoading(true);
        try {
            const classes = await getClassesNeedingSubstitution(date);

            // FILTER: If not Admin, only show MY classes matching originalFacultyId
            if (role === 'admin') {
                setImpactedClasses(classes);
            } else {
                const myClasses = classes.filter(c => c.originalFacultyId === user.uid);
                setImpactedClasses(myClasses);
            }

        } catch (error) {
            console.error(error);
            setToast({ type: 'error', message: 'Failed to load impacted classes.' });
        } finally {
            setLoading(false);
        }
    };

    const checkAvailability = async () => {
        if (!selectedImpactedClass) return;
        setCheckingAvailability(true);
        try {
            const facultyList = await getAvailableFaculty(
                date,
                selectedImpactedClass.periodIndex,
                selectedImpactedClass.timeRange,
                selectedImpactedClass.semesterId // We need semesterId to avoid conflicts
            );
            setAvailableFaculty(facultyList);
        } catch (error) {
            console.error(error);
            setToast({ type: 'error', message: 'Error checking faculty availability.' });
        } finally {
            setCheckingAvailability(false);
        }
    };



    const loadSemesters = async () => {
        try {
            const sems = await getSemesters();
            setSemesters(sems);
        } catch (error) {
            console.error(error);
        }
    };

    const handleManualOpen = () => {
        loadSemesters();
        setShowManualModal(true);
    };

    const handleManualSearch = async () => {
        if (!manualSemesterId || manualPeriod === '') return;

        // Create a dummy "impacted class" object to feed into the existing flow
        // fetching detailed info would be better, but we trust the user for manual entry
        const selectedSem = semesters.find(s => s.id === manualSemesterId);

        const dummyClass = {
            semesterId: manualSemesterId,
            subjectname: manualSubjectName || `Manual Entry (${selectedSem?.semesterNo || '?'}th Sem)`,
            periodIndex: Number(manualPeriod),
            timeRange: "Manual Slot", // We could map period index to time logic if strict
            originalFacultyId: null, // No specific original faculty
            originalFacultyName: 'Manual Override',
            status: 'Pending'
        };

        setSelectedImpactedClass(dummyClass);
        setShowManualModal(false);
        // The useEffect on 'selectedImpactedClass' will trigger checkAvailability automatically
    };

    const handleConfirm = async () => {
        if (!selectedImpactedClass || !selectedSubstitute) return;

        setLoading(true);
        try {
            await createSubstitution({
                date,
                periodIndex: selectedImpactedClass.periodIndex,
                timeRange: selectedImpactedClass.timeRange,
                classId: selectedImpactedClass.semesterId, // Use semesterId as classId
                subjectId: selectedImpactedClass.subjectId,
                subjectName: selectedImpactedClass.subjectname,
                originalFacultyId: selectedImpactedClass.originalFacultyId,
                substituteFacultyId: selectedSubstitute.uid || selectedSubstitute.id,
                substituteName: selectedSubstitute.displayName,
                requestedBy: user.uid,
                status: 'confirmed'
            });

            setToast({ type: 'success', message: 'Substitution confirmed & Substitute notified!' });

            // Refresh list
            loadImpactedClasses();
            setSelectedImpactedClass(null); // Close panel

        } catch (error) {
            console.error(error);
            setToast({ type: 'error', message: 'Failed to create substitution.' });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                style={{
                    background: '#1e293b', width: '900px', maxWidth: '95%',
                    borderRadius: '16px', padding: '24px',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                    display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflowY: 'auto'
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', margin: 0 }}>Substitution Management</h2>
                        <p style={{ color: '#94a3b8', margin: 0 }}>Assign substitutes for approved leaves.</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Date Selection */}
                <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', color: '#94a3b8', marginBottom: '8px', fontSize: '0.9rem' }}>Select Date</label>
                        <input
                            type="date"
                            value={date}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={(e) => setDate(e.target.value)}
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: 'white' }}
                        />
                    </div>
                    <div style={{ alignSelf: 'flex-end', display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => alert("Manual Override Feature Coming Soon! For now, please use the automatic list.")}
                            style={{ padding: '12px', borderRadius: '8px', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
                        >
                            + Manual Entry
                        </button>
                        <button
                            onClick={loadImpactedClasses}
                            style={{ padding: '12px', borderRadius: '8px', background: '#334155', color: 'white', border: 'none', cursor: 'pointer' }}
                            title="Refresh"
                        >
                            <RefreshCw size={20} />
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: 0 }}>

                    {/* Left Column: Impacted Classes List */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', paddingRight: '8px' }}>
                        <h3 style={{ fontSize: '1.1rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertTriangle size={18} color="#f59e0b" /> Classes Needing Coverage
                        </h3>

                        {loading && !impactedClasses.length ? (
                            <div style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>Checking schedules...</div>
                        ) : impactedClasses.length === 0 ? (
                            <div style={{ padding: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', textAlign: 'center', color: '#94a3b8' }}>
                                <CheckCircle size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                                <div>No classes found needing substitution for this date.</div>
                                <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Either no approved leaves or no scheduled classes.</div>
                            </div>
                        ) : (
                            impactedClasses.map((item, idx) => {
                                const isMyClass = item.originalFacultyId === user.uid;
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => item.status !== 'Covered' && setSelectedImpactedClass(item)}
                                        style={{
                                            padding: '16px', borderRadius: '12px',
                                            background: selectedImpactedClass === item ? 'rgba(245, 158, 11, 0.15)' : (isMyClass ? 'rgba(20, 184, 166, 0.1)' : '#0f172a'),
                                            border: selectedImpactedClass === item ? '1px solid #f59e0b' : (isMyClass ? '1px solid rgba(20, 184, 166, 0.3)' : '1px solid #334155'),
                                            cursor: item.status === 'Covered' ? 'default' : 'pointer',
                                            opacity: item.status === 'Covered' ? 0.7 : 1,
                                            transition: 'all 0.2s',
                                            position: 'relative'
                                        }}
                                    >
                                        {isMyClass && <div style={{ position: 'absolute', top: 12, right: 12, fontSize: '0.7rem', background: '#14b8a6', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>Me</div>}

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                            <div style={{ fontWeight: 600, color: 'white', fontSize: '1rem' }}>{item.subjectname}</div>
                                            {item.status === 'Covered' ? (
                                                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: '#14b8a6', color: 'white' }}>Covered</span>
                                            ) : (
                                                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: '#f59e0b', color: 'white' }}>Pending</span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.875rem' }}>
                                            <Clock size={14} /> {item.timeRange}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.875rem', marginTop: '4px' }}>
                                            <User size={14} /> {item.originalFacultyName || 'Unknown'}
                                            {/* Leave Status Badge */}
                                            <span style={{ marginLeft: '8px', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)' }}>
                                                {item.leaveType || 'Leave'} ({item.leaveStatus || 'Approved'})
                                            </span>
                                        </div>
                                        {item.status === 'Covered' && (
                                            <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#14b8a6' }}>
                                                Sub: {item.substituteName}
                                            </div>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>

                    {/* Right Column: Assignment Panel */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', padding: '16px' }}>
                        <h3 style={{ fontSize: '1.1rem', color: 'white', marginBottom: '16px' }}>Available Substitutes</h3>

                        {!selectedImpactedClass ? (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontStyle: 'italic' }}>
                                Select a pending class to find substitutes.
                            </div>
                        ) : (
                            <>
                                <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                    <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Finding substitutes for:</div>
                                    <div style={{ color: 'white', fontWeight: 600 }}>{selectedImpactedClass.subjectname}</div>
                                    <div style={{ color: '#f59e0b', fontSize: '0.9rem' }}>{selectedImpactedClass.timeRange}</div>
                                </div>

                                {checkingAvailability ? (
                                    <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Scanning faculty availability...</div>
                                ) : availableFaculty.length === 0 ? (
                                    <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: '8px' }}>
                                        No faculty found.
                                    </div>
                                ) : (
                                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {availableFaculty.map(fac => {
                                            const isSelected = selectedSubstitute?.id === (fac.id || fac.uid);
                                            const isBusy = fac.availabilityStatus === 'Busy';
                                            const isOnLeave = fac.availabilityStatus === 'On Leave';

                                            let statusColor = '#14b8a6'; // Free - Green
                                            if (isBusy) statusColor = '#f59e0b'; // Busy - Yellow
                                            if (isOnLeave) statusColor = '#ef4444'; // Leave - Red

                                            return (
                                                <button
                                                    key={fac.uid || fac.id}
                                                    onClick={() => {
                                                        if (isOnLeave) return; // Cannot select leave faculty
                                                        if (isBusy) {
                                                            if (!window.confirm(`Warning: ${fac.displayName} is marked as BUSY (${fac.busyReason}). Are you sure you want to assign them?`)) return;
                                                        }
                                                        setSelectedSubstitute(fac);
                                                    }}
                                                    disabled={isOnLeave}
                                                    style={{
                                                        padding: '12px', borderRadius: '8px',
                                                        background: isSelected ? `${statusColor}33` : 'rgba(255,255,255,0.03)',
                                                        border: isSelected ? `1px solid ${statusColor}` : '1px solid rgba(255,255,255,0.05)',
                                                        color: 'white', cursor: isOnLeave ? 'not-allowed' : 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: '12px',
                                                        textAlign: 'left', opacity: isOnLeave ? 0.6 : 1
                                                    }}
                                                >
                                                    <div style={{ position: 'relative' }}>
                                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 600 }}>
                                                            {fac.displayName ? fac.displayName.charAt(0) : '?'}
                                                        </div>
                                                        <div style={{
                                                            position: 'absolute', bottom: -2, right: -2, width: '12px', height: '12px', borderRadius: '50%',
                                                            background: statusColor, border: '2px solid #1e293b'
                                                        }} />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{fac.displayName}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                            {fac.availabilityStatus === 'Free' ? 'Available' : fac.busyReason || fac.availabilityStatus}
                                                        </div>
                                                    </div>
                                                    {isSelected && <CheckCircle size={16} color={statusColor} />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Action Buttons */}
                        {selectedImpactedClass && (
                            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button
                                    onClick={() => setSelectedImpactedClass(null)}
                                    style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #475569', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={!selectedSubstitute || loading}
                                    style={{
                                        padding: '10px 20px', borderRadius: '8px', border: 'none',
                                        background: !selectedSubstitute ? '#334155' : '#14b8a6',
                                        color: !selectedSubstitute ? '#64748b' : 'white',
                                        cursor: !selectedSubstitute ? 'not-allowed' : 'pointer',
                                        fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px'
                                    }}
                                >
                                    {loading ? 'Processing...' : 'Assign Substitute'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
                {/* Manual Substitution Modal */}
                <AnimatePresence>
                    {showManualModal && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                            background: 'rgba(0,0,0,0.8)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                style={{
                                    background: '#0f172a', width: '500px', maxWidth: '95%',
                                    borderRadius: '12px', padding: '24px', border: '1px solid #334155'
                                }}
                            >
                                <h3 style={{ color: 'white', marginTop: 0 }}>Manual Substitution Entry</h3>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '8px' }}>Select Semester (Class)</label>
                                    <select
                                        value={manualSemesterId}
                                        onChange={(e) => setManualSemesterId(e.target.value)}
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#1e293b', border: '1px solid #475569', color: 'white' }}
                                    >
                                        <option value="">-- Select Class --</option>
                                        {semesters.map(sem => (
                                            <option key={sem.id} value={sem.id}>Semester {sem.semesterNo} ({sem.courseName || 'Unknown Course'})</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '8px' }}>Select Period</label>
                                    <select
                                        value={manualPeriod}
                                        onChange={(e) => setManualPeriod(Number(e.target.value))}
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#1e293b', border: '1px solid #475569', color: 'white' }}
                                    >
                                        <option value="">-- Select Period --</option>
                                        <option value="0">Period 1 (08:00 - 09:00)</option>
                                        <option value="1">Period 2 (09:00 - 10:00)</option>
                                        <option value="2">Period 3 (10:20 - 11:10)</option>
                                        <option value="3">Period 4 (11:10 - 12:00)</option>
                                        <option value="4">Period 5 (13:00 - 14:00)</option>
                                        <option value="5">Period 6 (14:00 - 15:00)</option>
                                        <option value="6">Period 7 (15:15 - 16:00)</option>
                                    </select>
                                </div>

                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '8px' }}>Select Subject (Optional Metadata)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Data Structures (Leave blank if unknown)"
                                        value={manualSubjectName}
                                        onChange={(e) => setManualSubjectName(e.target.value)}
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#1e293b', border: '1px solid #475569', color: 'white' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                    <button
                                        onClick={() => setShowManualModal(false)}
                                        style={{ padding: '8px 16px', borderRadius: '6px', background: 'transparent', color: '#94a3b8', border: '1px solid #475569', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleManualSearch}
                                        disabled={!manualSemesterId || manualPeriod === ''}
                                        style={{
                                            padding: '8px 20px', borderRadius: '6px', border: 'none',
                                            background: (!manualSemesterId || manualPeriod === '') ? '#334155' : '#3b82f6',
                                            color: 'white', cursor: (!manualSemesterId || manualPeriod === '') ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        Find Substitutes
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default SubstitutionManagement;
