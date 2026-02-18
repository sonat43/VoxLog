import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCheck, Clock, Calendar, AlertCircle, Users, CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getPendingSubstitutions, getPendingSubstitutionsForClass, allocateSubstitute } from '../../services/facultyService';
import { getSubjects, getFacultyAssignmentsByFaculty, getAllStudents, getFacultyAssignments } from '../../services/academicService';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Toast from '../../components/common/Toast';
import SimpleModal from '../../components/admin/academic/SimpleModal';

const SubstitutionManager = () => {
    const { user } = useAuth();
    const [pendingRequests, setPendingRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [availableFaculty, setAvailableFaculty] = useState([]);
    const [selectedFacultyId, setSelectedFacultyId] = useState('');
    const [loadingFaculty, setLoadingFaculty] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        fetchPending();
    }, [user]);

    const fetchPending = async () => {
        if (!user?.uid) return;
        setLoading(true);
        try {
            // 1. Get tasks assigned explicitly to me
            const myTasksPromise = getPendingSubstitutions(user.uid);

            // 2. Get tasks for classes where I am the Class Teacher
            const classTasksPromise = getPendingSubstitutionsForClass(user.uid);

            const [myTasks, classTasks] = await Promise.all([myTasksPromise, classTasksPromise]);

            // 3. Merge and Deduplicate
            const uniqueMap = new Map();
            myTasks.forEach(t => uniqueMap.set(t.id, t));
            classTasks.forEach(t => uniqueMap.set(t.id, t));

            const merged = Array.from(uniqueMap.values());

            // Sort by date/deadline
            merged.sort((a, b) => {
                const da = a.dateObj ? a.dateObj.seconds : 0;
                const db = b.dateObj ? b.dateObj.seconds : 0;
                return da - db;
            });

            setPendingRequests(merged);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = async (request) => {
        setSelectedRequest(request);
        setIsModalOpen(true);
        setLoadingFaculty(true);
        setAvailableFaculty([]);
        setSelectedFacultyId('');

        try {
            // 1. Find potential substitutes: Faculty teaching in this semester
            const qSubjects = query(collection(db, "subjects"), where("semesterId", "==", request.semesterId));
            const subSnap = await getDocs(qSubjects);
            const subjectIds = subSnap.docs.map(d => d.id);

            if (subjectIds.length > 0) {
                const allAssignments = await getFacultyAssignments(); // Optimize this in prod!
                const classAssignments = allAssignments.filter(a => subjectIds.includes(a.subjectId));
                const potentialFacultyIds = [...new Set(classAssignments.map(a => a.facultyId))];

                // 2. Identify Unavailable Faculty
                const unavailableIds = new Set([request.originalFacultyId]);

                // A. Check Leaves for this date
                // Ideally check date range logic, but simplified matching for now
                const leavesSnap = await getDocs(query(collection(db, "leave_requests"), where("status", "==", "approved")));
                leavesSnap.docs.forEach(doc => {
                    const l = doc.data();
                    const leaveStart = new Date(l.startDate);
                    const leaveEnd = new Date(l.endDate);
                    const reqDate = new Date(request.date);
                    if (reqDate >= leaveStart && reqDate <= leaveEnd) {
                        unavailableIds.add(l.facultyId);
                    }
                });

                // B. Check Existing Substitutions for this date and slot
                // If a faculty is already subbing elsewhere in this slot, they are busy
                // (Assuming strict slot matching string "10:00 - 11:00")
                const substitutionsSnap = await getDocs(query(collection(db, "substitutions"), where("date", "==", request.date), where("slotTime", "==", request.slotTime)));
                substitutionsSnap.docs.forEach(doc => {
                    unavailableIds.add(doc.data().substituteFacultyId);
                });

                // 3. Filter and Fetch Details
                const eligibleFacultyIds = potentialFacultyIds.filter(fid => !unavailableIds.has(fid));

                const facultyDetails = [];
                for (const fid of eligibleFacultyIds) {
                    const userRef = doc(db, "users", fid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        facultyDetails.push({ id: fid, ...userSnap.data() });
                    }
                }
                setAvailableFaculty(facultyDetails);
            }
        } catch (e) {
            console.error("Error fetching available faculty:", e);
            setToast({ message: "Failed to load faculty list", type: "error" });
        } finally {
            setLoadingFaculty(false);
        }
    };

    const handleAllocate = async () => {
        if (!selectedFacultyId) return setToast({ message: "Please select a faculty member", type: "error" });

        try {
            await allocateSubstitute(selectedRequest.id, {
                date: selectedRequest.date,
                slotTime: selectedRequest.slotTime,
                subjectId: selectedRequest.subjectId,
                originalFacultyId: selectedRequest.originalFacultyId,
                substituteFacultyId: selectedFacultyId,
                semesterId: selectedRequest.semesterId
            });

            setToast({ message: "Substitute assigned successfully", type: "success" });
            setIsModalOpen(false);
            fetchPending(); // Refresh list
        } catch (e) {
            setToast({ message: "Failed to allocate substitute", type: "error" });
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginBottom: '2rem' }}
            >
                <h1 style={{
                    fontSize: '2.5rem', fontWeight: 800,
                    background: 'linear-gradient(to right, #fff, #94a3b8)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem'
                }}>
                    <UserCheck size={40} className="text-emerald-400" /> Substitution Manager
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>
                    Manage class substitutions for your assigned classes.
                </p>
            </motion.div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>Loading requests...</div>
            ) : pendingRequests.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '4rem',
                    background: 'rgba(30, 41, 59, 0.4)', borderRadius: '1rem',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <CheckCircle size={48} style={{ color: '#34d399', margin: '0 auto 1rem' }} />
                    <h3 style={{ color: '#e2e8f0', fontSize: '1.25rem', marginBottom: '0.5rem' }}>All Caught Up!</h3>
                    <p style={{ color: '#94a3b8' }}>No pending substitution requests for your classes.</p>
                </div>
            ) : (
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    style={{ display: 'grid', gap: '1rem' }}
                >
                    {pendingRequests.map(req => (
                        <motion.div
                            key={req.id}
                            variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}
                            style={{
                                background: 'rgba(30, 41, 59, 0.6)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                borderRadius: '1rem',
                                padding: '1.5rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                <div style={{
                                    padding: '1rem', borderRadius: '1rem',
                                    background: 'rgba(239, 68, 68, 0.1)', color: '#f87171',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '80px'
                                }}>
                                    <span style={{ fontWeight: 700 }}>{req.dateObj ? new Date(req.dateObj.seconds * 1000).getDate() : ''}</span>
                                    <span style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>
                                        {req.dateObj ? new Date(req.dateObj.seconds * 1000).toLocaleString('default', { month: 'short' }) : ''}
                                    </span>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                        <span style={{
                                            fontSize: '0.75rem', fontWeight: 600,
                                            padding: '0.2rem 0.5rem', borderRadius: '0.25rem',
                                            background: '#374151', color: '#9ca3af'
                                        }}>
                                            {req.slotTime.split(' - ')[0]}
                                        </span>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white', margin: 0 }}>
                                            {req.subjectName || 'Unknown Subject'}
                                        </h3>
                                    </div>
                                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>
                                        Original Faculty: <span style={{ color: '#e2e8f0' }}>Fac {req.originalFacultyId.substr(0, 4)}...</span> (On Leave)
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => handleOpenModal(req)}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                                }}
                            >
                                <Users size={18} /> Allocate <ArrowRight size={16} />
                            </button>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            <SimpleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Allocate Substitute Teacher">
                {selectedRequest && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                                <div>
                                    <p style={{ color: '#94a3b8', margin: '0 0 0.25rem 0' }}>Class</p>
                                    <p style={{ color: 'white', margin: 0, fontWeight: 500 }}>{selectedRequest.subjectName}</p>
                                </div>
                                <div>
                                    <p style={{ color: '#94a3b8', margin: '0 0 0.25rem 0' }}>Time Slot</p>
                                    <p style={{ color: 'white', margin: 0, fontWeight: 500 }}>{selectedRequest.slotTime}</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', color: '#e2e8f0', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                Select Substitute Teacher
                            </label>
                            {loadingFaculty ? (
                                <div style={{ color: '#94a3b8', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Clock size={14} className="animate-spin" /> Finding eligible teachers...
                                </div>
                            ) : availableFaculty.length > 0 ? (
                                <select
                                    value={selectedFacultyId}
                                    onChange={(e) => setSelectedFacultyId(e.target.value)}
                                    style={{
                                        width: '100%', padding: '0.75rem',
                                        background: '#1f2937', border: '1px solid #374151',
                                        borderRadius: '0.5rem', color: 'white', outline: 'none'
                                    }}
                                >
                                    <option value="">-- Choose a Faculty Member --</option>
                                    {availableFaculty.map(fac => (
                                        <option key={fac.id} value={fac.id}>
                                            {fac.displayName || fac.email}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <p style={{ color: '#f87171', fontSize: '0.9rem' }}>
                                    No other faculty found teaching in this class.
                                </p>
                            )}
                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                                * Showing only faculty members who conduct classes for this semester.
                            </p>
                        </div>

                        <button
                            onClick={handleAllocate}
                            disabled={!selectedFacultyId}
                            style={{
                                width: '100%', padding: '1rem',
                                background: selectedFacultyId ? '#10b981' : '#374151',
                                color: selectedFacultyId ? 'white' : '#9ca3af',
                                border: 'none', borderRadius: '0.75rem',
                                fontWeight: 700, cursor: selectedFacultyId ? 'pointer' : 'not-allowed',
                                transition: 'all 0.2s'
                            }}
                        >
                            Confirm Allocation
                        </button>
                    </div>
                )}
            </SimpleModal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default SubstitutionManager;
