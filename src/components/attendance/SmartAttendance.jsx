import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Mic, CheckCircle, AlertTriangle, RefreshCw, Save, X, UserCheck, UserX, Info } from 'lucide-react';
import { getHeadcount, processRollCall, saveAttendanceSession } from '../../services/facultyService';
import { getStudentsBySemester } from '../../services/academicService';
import { useAuth } from '../../context/AuthContext';

const SmartAttendance = ({ course, onClose }) => {
    const { user } = useAuth();
    const [step, setStep] = useState('camera'); // 'camera', 'headcount', 'voice', 'rollcall', 'preview'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Media hooks/refs
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recognitionRef = useRef(null);
    const [stream, setStream] = useState(null);
    const streamRef = useRef(null);
    const [recording, setRecording] = useState(false);

    // Data states
    const [capturedImage, setCapturedImage] = useState(null);
    const [headcount, setHeadcount] = useState(0);
    const [transcribedText, setTranscribedText] = useState("");
    const transcriptRef = useRef("");
    const [recognitionStatus, setRecognitionStatus] = useState("idle");
    const [manualInput, setManualInput] = useState(false);
    const [manualText, setManualText] = useState("");
    const [recognizedRollNumbers, setRecognizedRollNumbers] = useState([]);
    const [students, setStudents] = useState([]);
    const [attendanceMap, setAttendanceMap] = useState({}); // studentId -> status
    const [mismatchPrompt, setMismatchPrompt] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);

    useEffect(() => {
        fetchStudents();
        startCamera();
        return () => stopMedia();
    }, []);

    const fetchStudents = async () => {
        try {
            const data = await getStudentsBySemester(course.semesterId);
            setStudents(data);
            // Default everyone to absent initially
            const initialMap = {};
            data.forEach(s => initialMap[s.id] = 'Absent');
            setAttendanceMap(initialMap);
        } catch (err) {
            console.error("Error fetching students", err);
        }
    };

    const startCamera = async () => {
        // Stop any existing stream first
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }

        try {
            const s = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            setStream(s);
            streamRef.current = s;
            if (videoRef.current) {
                videoRef.current.srcObject = s;
                // Some browsers need a slight delay or explicit play
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current.play();
                    setCameraReady(true);
                };
            }
            setError(null);
        } catch (err) {
            console.error("Camera access error:", err);
            setError("Cannot access camera: " + err.message);
        }
    };

    const stopMedia = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setStream(null);
    };

    const captureImage = async () => {
        console.log("Capture Image clicked");
        if (!videoRef.current || !canvasRef.current) {
            console.error("Video or Canvas ref not found");
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video.videoWidth === 0 || video.videoHeight === 0) {
            console.warn("Video dimensions are 0. Retrying in 100ms...");
            setTimeout(captureImage, 100);
            return;
        }

        // Visual flash effect
        video.style.opacity = '0.5';
        setTimeout(() => video.style.opacity = '1', 100);

        console.log(`Video dimensions: ${video.videoWidth}x${video.videoHeight}`);
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        setLoading(true);
        setError(null);

        try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setCapturedImage(dataUrl);

            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const result = await getHeadcount(blob);
            setHeadcount(result.count);
            setStep('headcount');
        } catch (err) {
            setError("Capture failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const startRecording = async () => {
        try {
            const s = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(s);
            mediaRecorderRef.current = recorder;
            const chunks = [];

            // Initialize Web Speech API
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            let recognition = null;
            if (SpeechRecognition) {
                recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'en-US';

                recognition.onstart = () => {
                    console.log("[DEBUG] Recognition started");
                    setRecognitionStatus("listening");
                };

                recognition.onresult = (event) => {
                    let fullTranscript = '';
                    for (let i = 0; i < event.results.length; i++) {
                        fullTranscript += event.results[i][0].transcript;
                    }
                    console.log("[DEBUG] Browser Transcript:", fullTranscript);
                    setTranscribedText(fullTranscript);
                    transcriptRef.current = fullTranscript;
                };

                recognition.onerror = (event) => {
                    console.error("[DEBUG] Recognition error:", event.error);
                    if (event.error === 'network') {
                        setRecognitionStatus("network-error");
                        // Permanently stop this recognition session to avoid loops
                        recognition.onend = null;
                        try { recognition.stop(); } catch (e) { }
                        console.warn("[DEBUG] Network error detected. Recognition stopped. Fallback will occur on Stop.");
                    } else if (event.error === 'no-speech') {
                        setRecognitionStatus("no-speech");
                    } else {
                        setRecognitionStatus("error");
                        setError("Voice Recognition Error: " + event.error);
                    }
                };

                recognition.onend = () => {
                    console.log("[DEBUG] Recognition ended");
                    if (recording) {
                        try {
                            recognition.start(); // Restart if still recording
                        } catch (e) {
                            console.error("[DEBUG] Failed to restart recognition:", e);
                        }
                    }
                };

                setRecognitionStatus("starting");
                recognition.start();
                recognitionRef.current = recognition;
            } else {
                console.warn("[DEBUG] Web Speech API not supported in this browser.");
                setRecognitionStatus("error");
                setError("Voice recognize is not supported in this browser. Please use Chrome or Edge.");
            }

            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = async () => {
                const mimeType = recorder.mimeType || 'audio/webm';
                const blob = new Blob(chunks, { type: mimeType });
                console.log(`[DEBUG] Audio captured: ${mimeType}, size: ${blob.size} bytes`);

                if (recognition && recognitionStatus !== 'network-error' && transcriptRef.current.trim()) {
                    setRecognitionStatus("processing");
                    recognition.onend = null; // Prevent restart
                    recognition.stop();
                    // Use ref to get the absolute latest transcript
                    processTranscript(transcriptRef.current, blob);
                } else {
                    // Fallback to backend STT if browser API failed, resulted in error, or provided no text
                    console.log("[DEBUG] Falling back to backend STT. Reason:",
                        !recognition ? "No API support" :
                            recognitionStatus === 'network-error' ? "Network Error" :
                                "No transcript captured");

                    if (recognition) {
                        recognition.onend = null;
                        recognition.stop();
                    }
                    setRecognitionStatus("server-processing");
                    processAudio(blob);
                }

                s.getTracks().forEach(t => t.stop());
            };

            recorder.start();
            setRecording(true);
        } catch (err) {
            setError("Cannot access microphone: " + err.message);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && recording) {
            mediaRecorderRef.current.stop();
            setRecording(false);
        }
    };

    const processTranscript = async (text, audioBlob) => {
        setLoading(true);
        try {
            // Send audio to backend anyway for storage
            const formData = new FormData();
            formData.append('audio', audioBlob, 'rollcall.wav');

            // Extract numbers from text
            const rollNumbers = extractNumbersFromText(text);
            setRecognizedRollNumbers(rollNumbers);

            // Match students
            const newMap = { ...attendanceMap };
            students.forEach(s => {
                if (rollNumbers.includes(String(s.regNo))) {
                    newMap[s.id] = 'Present';
                }
            });

            setAttendanceMap(newMap);
            setStep('preview');

            // Send to backend for logging and verification
            await processRollCall(audioBlob);

            // Check for mismatch
            const presentCount = Object.values(newMap).filter(v => v === 'Present').length;
            if (presentCount !== headcount) {
                setMismatchPrompt(true);
            }
        } catch (err) {
            console.error("Transcript processing error:", err);
            // Don't show error if we already have frontend results
        } finally {
            setLoading(false);
        }
    };

    const handleManualSubmit = () => {
        const numbers = extractNumbersFromText(manualText);
        if (numbers.length === 0) {
            setError("No valid roll numbers found in text.");
            return;
        }
        setRecognizedRollNumbers(numbers);
        const newMap = { ...attendanceMap };
        students.forEach(s => {
            if (numbers.includes(String(s.regNo))) {
                newMap[s.id] = 'Present';
            }
        });
        setAttendanceMap(newMap);
        setStep('preview');
        const presentCount = Object.values(newMap).filter(v => v === 'Present').length;
        if (presentCount !== headcount) {
            setMismatchPrompt(true);
        }
    };

    const extractNumbersFromText = (text) => {
        if (!text) return [];
        const wordToNum = {
            'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
            'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
            'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
            'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
            'eighteen': '18', 'nineteen': '19', 'twenty': '20'
        };

        const cleanText = text.toLowerCase().replace(/[,.]/g, ' ');
        const words = cleanText.split(/\s+/);
        const extracted = new Set();

        words.forEach(word => {
            if (/^\d+$/.test(word)) {
                extracted.add(word);
            } else if (wordToNum[word]) {
                extracted.add(wordToNum[word]);
            }
        });

        // Also catch digits embedded in text
        const digits = cleanText.match(/\d+/g);
        if (digits) digits.forEach(d => extracted.add(d));

        return Array.from(extracted);
    };

    const processAudio = async (blob) => {
        setLoading(true);
        try {
            const result = await processRollCall(blob);
            setRecognizedRollNumbers(result.roll_numbers);

            // Map recognized roll numbers to student list
            const newMap = { ...attendanceMap };
            const presentRolls = result.roll_numbers.map(n => String(n));

            students.forEach(s => {
                if (presentRolls.includes(String(s.regNo))) {
                    newMap[s.id] = 'Present';
                }
            });

            setAttendanceMap(newMap);
            setStep('preview');

            // Check for mismatch
            const presentCount = Object.values(newMap).filter(v => v === 'Present').length;
            if (presentCount !== headcount) {
                setMismatchPrompt(true);
            }
        } catch (err) {
            setError("Speech recognition failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = (studentId) => {
        setAttendanceMap(prev => ({
            ...prev,
            [studentId]: prev[studentId] === 'Present' ? 'Absent' : 'Present'
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const presentStudentIds = Object.keys(attendanceMap).filter(id => attendanceMap[id] === 'Present');

            await saveAttendanceSession({
                subjectId: course.subjectId,
                semesterId: course.semesterId,
                subjectName: course.name || course.subjectName,
                section: course.section || 'N/A',
                periodIndex: course.periodIndex,
                timeRange: course.timeRange,
                dateString: new Date().toISOString().split('T')[0],
                mode: 'smart',
                confidence: 100, // Manual review done
                facultyId: user?.uid,
                status: 'completed',
                presentStudentIds: presentStudentIds,
                headcount: headcount,
                voiceCount: presentStudentIds.length
            });
            onClose();
        } catch (err) {
            setError("Failed to save attendance: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const resetFlow = () => {
        setError(null);
        setStep('camera');
        setHeadcount(0);
        setTranscribedText("");
        transcriptRef.current = "";
        setRecognitionStatus("idle");
        setManualInput(false);
        setManualText("");
        setRecognizedRollNumbers([]);
        setCapturedImage(null);
        setMismatchPrompt(false);
        const initialMap = {};
        students.forEach(s => initialMap[s.id] = 'Absent');
        setAttendanceMap(initialMap);
        startCamera();
    };

    return (
        <div style={{ padding: '1rem', color: 'white' }}>
            <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {course?.name}
                    <span style={{ fontSize: '0.8rem', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '0.2rem 0.6rem', borderRadius: '0.5rem', textTransform: 'uppercase' }}>
                        Period {course?.periodIndex !== undefined ? course.periodIndex + 1 : '?'}
                    </span>
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    {course?.code} • Section {course?.section || 'N/A'}
                </div>
            </div>
            {error && (
                <div style={{ marginBottom: '1rem', padding: '1rem', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '0.5rem', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={18} />
                    {error}
                </div>
            )}

            <AnimatePresence mode="wait">
                {step === 'camera' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div style={{ position: 'relative', borderRadius: '1rem', overflow: 'hidden', background: '#000', marginBottom: '1.5rem', aspectRatio: '4/3' }}>
                            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.5)', padding: '0.5rem 1rem', borderRadius: '2rem', fontSize: '0.8rem' }}>
                                Step 1: Capture Whole Class
                            </div>
                        </div>
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button
                                onClick={captureImage}
                                disabled={loading || !cameraReady}
                                style={{
                                    padding: '1rem 2rem',
                                    background: cameraReady ? '#3b82f6' : '#475569',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '3rem',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    cursor: cameraReady ? 'pointer' : 'not-allowed',
                                    opacity: loading ? 0.7 : 1,
                                    boxShadow: cameraReady ? '0 4px 15px rgba(59, 130, 246, 0.3)' : 'none'
                                }}
                            >
                                {loading ? <RefreshCw className="animate-spin" /> : <Camera />}
                                {!cameraReady ? 'Initializing...' : 'Take Picture'}
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 'headcount' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: 'center' }}>
                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{ fontSize: '1.5rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Students Counted</div>
                            <div style={{ fontSize: '5rem', fontWeight: 800, color: '#3b82f6' }}>{headcount}</div>
                        </div>
                        <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>Next, please say the roll numbers of students who are present.</p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                            <button onClick={resetFlow} style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: '0.5rem', cursor: 'pointer' }}>
                                Retake Picture
                            </button>
                            <button onClick={() => setStep('voice')} style={{ padding: '0.75rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>
                                Start Roll Call
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 'voice' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <div style={{ marginBottom: '2.5rem', position: 'relative' }}>
                            <div className={`pulse-ring ${recording ? 'active' : ''}`} style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Mic size={48} color={recording ? '#3b82f6' : '#94a3b8'} />
                            </div>
                            {recording && (
                                <div style={{ marginTop: '1rem', color: '#3b82f6', fontWeight: 600 }} className="animate-pulse">Recording...</div>
                            )}
                        </div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Listening for Roll Numbers</h3>
                        <p style={{ color: '#94a3b8', marginBottom: '2.5rem', maxWidth: '300px', margin: '0 auto' }}>Speak clearly. Say roll numbers separated by pauses. (e.g., "1... 2... 15... 22")</p>

                        {/* Live Transcript Preview */}
                        <div style={{
                            minHeight: '80px',
                            background: 'rgba(0,0,0,0.3)',
                            borderRadius: '1rem',
                            padding: '1rem',
                            margin: '0 1rem 2rem',
                            border: '1px dashed rgba(255,255,255,0.1)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            position: 'relative'
                        }}>
                            <div style={{ position: 'absolute', top: '-0.75rem', left: '1rem', background: '#1e293b', padding: '0 0.5rem', fontSize: '0.7rem', color: '#94a3b8', borderRadius: '0.25rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                                STATUS: {recognitionStatus.replace('-', ' ').toUpperCase()}
                            </div>
                            {transcribedText ? (
                                <div style={{ color: '#3b82f6', fontStyle: 'italic', fontSize: '1rem' }}>"{transcribedText}"</div>
                            ) : (
                                <div style={{ color: '#475569', fontSize: '0.9rem' }}>
                                    {recognitionStatus === 'starting' ? 'Initializing microphone...' :
                                        recognitionStatus === 'network-error' ? 'Browser voice service unavailable. Using server backup instead.' :
                                            recognitionStatus === 'server-processing' ? 'Server is analyzing your voice...' :
                                                recognitionStatus === 'no-speech' ? 'No speech detected. Try speaking louder.' :
                                                    'Waiting for speech...'}
                                </div>
                            )}
                            {recognitionStatus === 'network-error' && (
                                <div style={{ marginTop: '0.5rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                                    Don't worry, keep speaking and then click "Stop & Process".
                                </div>
                            )}
                        </div>

                        {manualInput ? (
                            <div style={{ padding: '0 1rem' }}>
                                <textarea
                                    value={manualText}
                                    onChange={(e) => setManualText(e.target.value)}
                                    placeholder="Type roll numbers here (e.g. 1, 2, 5, 10...)"
                                    style={{
                                        width: '100%',
                                        height: '100px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '0.75rem',
                                        padding: '1rem',
                                        color: 'white',
                                        fontSize: '1rem',
                                        marginBottom: '1rem',
                                        resize: 'none',
                                        outline: 'none'
                                    }}
                                />
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button
                                        onClick={() => setManualInput(false)}
                                        style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#94a3b8', borderRadius: '0.5rem', cursor: 'pointer' }}
                                    >
                                        Back to Voice
                                    </button>
                                    <button
                                        onClick={handleManualSubmit}
                                        style={{ flex: 2, padding: '0.75rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Identify Students
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                {!recording ? (
                                    <button onClick={startRecording} style={{ padding: '1rem 2.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '3rem', fontWeight: 600, cursor: 'pointer' }}>
                                        Start Speaking
                                    </button>
                                ) : (
                                    <button onClick={stopRecording} style={{ padding: '1rem 2.5rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '3rem', fontWeight: 600, cursor: 'pointer' }}>
                                        Stop & Process
                                    </button>
                                )}
                                <button
                                    onClick={() => setManualInput(true)}
                                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.875rem', textDecoration: 'underline', cursor: 'pointer' }}
                                >
                                    Or type roll numbers manually
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}

                {step === 'preview' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Attendance Preview</h3>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Headcount</div>
                                    <div style={{ fontWeight: 700 }}>{headcount}</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Present</div>
                                    <div style={{ fontWeight: 700, color: Object.values(attendanceMap).filter(v => v === 'Present').length === headcount ? '#34d399' : '#f59e0b' }}>
                                        {Object.values(attendanceMap).filter(v => v === 'Present').length}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {mismatchPrompt && (
                            <div style={{ marginBottom: '1.5rem', padding: '1.25rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '1rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                                <AlertTriangle color="#ef4444" style={{ marginTop: '0.2rem', flexShrink: 0 }} />
                                <div>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#ef4444', fontWeight: 700 }}>Attendance Mismatch</h4>
                                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#94a3b8', lineHeight: '1.5' }}>
                                        Headcount is **{headcount}**, but voice registration identified **{Object.values(attendanceMap).filter(v => v === 'Present').length}** students.
                                        How would you like to proceed?
                                    </p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                        <button
                                            onClick={() => { resetFlow(); setStep('camera'); }}
                                            style={{ padding: '0.5rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                        >
                                            <Camera size={14} /> Retake Picture
                                        </button>
                                        <button
                                            onClick={() => { setStep('voice'); setMismatchPrompt(false); }}
                                            style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                        >
                                            <Mic size={14} /> Redo Voice Call
                                        </button>
                                        <button
                                            onClick={() => setMismatchPrompt(false)}
                                            style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}
                                        >
                                            Manual Override
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ maxHeight: '300px', overflowY: 'auto', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem' }}>
                            {students.map(student => (
                                <div key={student.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: attendanceMap[student.id] === 'Present' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(248, 113, 113, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {attendanceMap[student.id] === 'Present' ? <UserCheck size={16} color="#34d399" /> : <UserX size={16} color="#f87171" />}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{student.name}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Roll: {student.regNo}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleToggleStatus(student.id)}
                                        style={{
                                            padding: '0.3rem 0.75rem',
                                            borderRadius: '0.4rem',
                                            fontSize: '0.75rem',
                                            border: '1px solid',
                                            background: attendanceMap[student.id] === 'Present' ? 'rgba(52, 211, 153, 0.1)' : 'transparent',
                                            borderColor: attendanceMap[student.id] === 'Present' ? '#34d399' : '#475569',
                                            color: attendanceMap[student.id] === 'Present' ? '#34d399' : '#94a3b8',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Override: {attendanceMap[student.id] === 'Present' ? 'Absent' : 'Present'}
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={resetFlow} style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: '0.75rem', cursor: 'pointer' }}>
                                Start Over
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                style={{
                                    flex: 1, padding: '1rem', background: '#34d399', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', cursor: 'pointer', opacity: loading ? 0.7 : 1
                                }}
                            >
                                {loading ? <RefreshCw className="animate-spin" /> : <Save />}
                                Final Save
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* CSS for custom animation */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 0.5; }
                    50% { transform: scale(1.1); opacity: 0.3; }
                    100% { transform: scale(1); opacity: 0.5; }
                }
                .pulse-ring.active {
                    animation: pulse 2s infinite ease-in-out;
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-pulse {
                    animation: pulse-text 1.5s infinite;
                }
                @keyframes pulse-text {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}} />
        </div>
    );
};

export default SmartAttendance;
