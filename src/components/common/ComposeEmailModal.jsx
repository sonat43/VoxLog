import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Users, Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { sendEmailNotification } from '../../services/emailService';

/**
 * Reusable modal for composing and sending emails to a list of recipients.
 * 
 * @param {boolean} isOpen - Modal state
 * @param {function} onClose - Function to close modal
 * @param {Array} recipients - Array of { email: string, name: string }
 * @param {string} title - Modal title (default: "Compose Email")
 */
const ComposeEmailModal = ({ isOpen, onClose, recipients = [], title = "Compose Message", defaultSubject = "" }) => {
    const [subject, setSubject] = useState(defaultSubject);

    // Update subject if defaultSubject changes
    React.useEffect(() => {
        if (isOpen) {
            setSubject(defaultSubject);
        }
    }, [isOpen, defaultSubject]);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState({ type: null, message: '' }); // { type: 'success' | 'error' | 'sending', message: '' }
    const [progress, setProgress] = useState({ current: 0, total: recipients.length });

    const handleSend = async (e) => {
        e.preventDefault();
        if (!subject || !message) {
            setStatus({ type: 'error', message: 'Please fill in both subject and message.' });
            return;
        }

        if (recipients.length === 0) {
            setStatus({ type: 'error', message: 'No recipients selected.' });
            return;
        }

        setSending(true);
        setStatus({ type: 'sending', message: `Preparing to send to ${recipients.length} recipients...` });
        setProgress({ current: 0, total: recipients.length });

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < recipients.length; i++) {
            const recipient = recipients[i];
            setProgress({ current: i + 1, total: recipients.length });
            setStatus({ type: 'sending', message: `Sending to ${recipient.name || recipient.email}...` });

            try {
                // Wrap message in basic HTML template if needed
                const htmlBody = `
                    <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                        <h2 style="color: #2563eb;">Message from VoxLog Dashboard</h2>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                        <div style="white-space: pre-wrap;">${message}</div>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="font-size: 12px; color: #666;">
                            This is a broadcast message sent from your academic institution via VoxLog.
                        </p>
                    </div>
                `;

                const result = await sendEmailNotification(recipient.email, subject, htmlBody);
                if (result.success) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (err) {
                console.error(`Failed to send to ${recipient.email}:`, err);
                failCount++;
            }

            // Small delay to prevent rate limiting or UI freezing
            if (recipients.length > 1) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }

        setSending(false);
        if (failCount === 0) {
            setStatus({ type: 'success', message: `Successfully sent to all ${successCount} recipients!` });
            // Close after a brief delay
            setTimeout(() => {
                onClose();
                resetForm();
            }, 2000);
        } else {
            setStatus({
                type: failCount === recipients.length ? 'error' : 'warning',
                message: `Completed. Success: ${successCount}, Failed: ${failCount}.`
            });
        }
    };

    const resetForm = () => {
        setSubject('');
        setMessage('');
        setStatus({ type: null, message: '' });
        setProgress({ current: 0, total: recipients.length });
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
                padding: '20px'
            }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    style={{
                        background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '1.5rem', width: '100%', maxWidth: '600px',
                        maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: 'rgba(255,255,255,0.02)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ padding: '0.6rem', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '0.75rem', color: '#3b82f6' }}>
                                <Mail size={20} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, color: 'white', fontSize: '1.25rem', fontWeight: 700 }}>{title}</h3>
                                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Users size={14} /> {recipients.length} Recipient(s)
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={sending}
                            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.5rem' }}
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSend} style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600 }}>Subject</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                disabled={sending}
                                placeholder="Enter subject line..."
                                style={{
                                    padding: '0.875rem 1rem', borderRadius: '0.75rem', background: '#0f172a',
                                    border: '1px solid #334155', color: 'white', outline: 'none', width: '100%',
                                    boxSizing: 'border-box'
                                }}
                                required
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600 }}>Message Body</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                disabled={sending}
                                placeholder="Type your message here..."
                                style={{
                                    padding: '1rem', borderRadius: '0.75rem', background: '#0f172a',
                                    border: '1px solid #334155', color: 'white', outline: 'none', width: '100%',
                                    minHeight: '200px', resize: 'vertical', boxSizing: 'border-box',
                                    lineHeight: '1.6'
                                }}
                                required
                            />
                        </div>

                        {/* Status / Progress */}
                        {status.type && (
                            <div style={{
                                padding: '1rem', borderRadius: '0.75rem',
                                background: status.type === 'error' ? 'rgba(239, 68, 68, 0.1)' :
                                    status.type === 'success' ? 'rgba(16, 185, 129, 0.1)' :
                                        status.type === 'warning' ? 'rgba(245, 158, 11, 0.1)' :
                                            'rgba(59, 130, 246, 0.1)',
                                border: `1px solid ${status.type === 'error' ? 'rgba(239, 68, 68, 0.2)' :
                                    status.type === 'success' ? 'rgba(16, 185, 129, 0.2)' :
                                        status.type === 'warning' ? 'rgba(245, 158, 11, 0.2)' :
                                            'rgba(59, 130, 246, 0.2)'
                                    }`,
                                color: status.type === 'error' ? '#f87171' :
                                    status.type === 'success' ? '#34d399' :
                                        status.type === 'warning' ? '#fbbf24' :
                                            '#60a5fa',
                                fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.75rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    {status.type === 'sending' ? <Loader2 size={18} className="animate-spin" /> :
                                        status.type === 'success' ? <CheckCircle2 size={18} /> :
                                            <AlertCircle size={18} />}
                                    <span>{status.message}</span>
                                </div>

                                {status.type === 'sending' && (
                                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                                            style={{ height: '100%', background: '#3b82f6', borderRadius: '2px' }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Footer Actions */}
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={sending}
                                style={{
                                    padding: '0.75rem 1.5rem', borderRadius: '0.75rem', background: 'transparent',
                                    border: '1px solid #334155', color: 'white', cursor: sending ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={sending || !subject || !message}
                                style={{
                                    padding: '0.75rem 2rem', borderRadius: '0.75rem',
                                    background: sending ? '#475569' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                    color: 'white', border: 'none', fontWeight: 700,
                                    cursor: (sending || !subject || !message) ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                                }}
                            >
                                {sending ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send size={18} />
                                        Send Message
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ComposeEmailModal;
