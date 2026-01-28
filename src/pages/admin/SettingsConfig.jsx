import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Save, Shield, Bell, Cpu, Database, Layout, Clock, Users,
    FileText, Globe, AlertTriangle, CheckCircle, Server, Lock,
    Activity, Zap, RefreshCw, ChevronRight, Info, Mail
} from 'lucide-react';
import { fetchSettings, saveSettings } from '../../services/settingsService';
import './SettingsConfig.css';

const SettingsConfig = () => {
    const [activeTab, setActiveTab] = useState('institution');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null);
    const [settings, setSettings] = useState(null);

    // Mock states for interactions
    const [calibrating, setCalibrating] = useState(false);
    const [testEmailSent, setTestEmailSent] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const data = await fetchSettings();
                setSettings(data);
            } catch (error) {
                showNotification('error', 'Failed to load system configuration.');
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveSettings(settings);
            showNotification('success', 'System configuration updated successfully.');
        } catch (error) {
            showNotification('error', 'Failed to synchronize settings.');
        } finally {
            setSaving(false);
        }
    };

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const updateSetting = (section, key, value) => {
        setSettings(prev => ({
            ...prev,
            [section]: { ...prev[section], [key]: value }
        }));
    };

    const handleCalibration = () => {
        setCalibrating(true);
        setTimeout(() => {
            setCalibrating(false);
            showNotification('success', 'AI Model calibrated to new threshold.');
        }, 2000);
    };

    const handleTestEmail = () => {
        setTestEmailSent(true);
        setTimeout(() => {
            setTestEmailSent(false);
            showNotification('success', 'Test alert sent to admin@voxlog.edu');
        }, 1500);
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px', color: '#14b8a6' }}>
            <RefreshCw className="animate-spin" size={32} />
        </div>
    );

    if (!settings) return null;

    const navGroups = [
        {
            title: "OPERATIONS",
            items: [
                { id: 'institution', label: 'Institution & Global', icon: Globe },
                { id: 'attendance', label: 'Attendance Rules', icon: Clock },
                { id: 'faculty', label: 'Faculty Permissions', icon: Users },
            ]
        },
        {
            title: "PLATFORM INTELLIGENCE",
            items: [
                { id: 'ai', label: 'AI Engine', icon: Cpu },
                { id: 'reports', label: 'Analytics & Audits', icon: FileText },
                { id: 'notifications', label: 'Communications', icon: Bell },
            ]
        },
        {
            title: "SYSTEM CORE",
            items: [
                { id: 'security', label: 'Security Protocols', icon: Shield },
                { id: 'session', label: 'Session Management', icon: Server },
                { id: 'ui', label: 'Interface & Theme', icon: Layout },
                { id: 'maintenance', label: 'Maintenance & Info', icon: Database },
            ]
        }
    ];

    return (
        <div className="sc-container">
            {/* Header */}
            <div className="sc-header">
                <div className="sc-header-bg-glow" />
                <div className="sc-header-content">
                    <div>
                        <div className="sc-breadcrumbs">
                            <span>Admin</span> <ChevronRight size={12} />
                            <span>Configuration</span> <ChevronRight size={12} />
                            <span className="sc-text-teal">System V2.4</span>
                        </div>
                        <h1 className="sc-title">System Configuration</h1>
                        <p className="sc-subtitle">
                            Manage global parameters, security protocols, and AI policies. Changes propagate across the system immediately upon saving.
                        </p>
                    </div>

                    <div className="sc-actions">
                        <div className="sc-health-indicator">
                            <div className="sc-health-badge">
                                <Activity size={14} /> <span>SYSTEM OPTIMAL</span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Last Audit: 2 mins ago</span>
                        </div>
                        <button onClick={handleSave} disabled={saving} className="sc-save-btn">
                            {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                            {saving ? 'SYNCHRONIZING...' : 'SAVE CHANGES'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Layout */}
            <div className="sc-layout">
                {/* Sidebar */}
                <div className="sc-sidebar">
                    {navGroups.map((group, idx) => (
                        <div key={idx}>
                            <h3 className="sc-nav-group-title">{group.title}</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {group.items.map(tab => {
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`sc-nav-item ${isActive ? 'active' : ''}`}
                                        >
                                            {isActive && <motion.div layoutId="activeTabIndicator" className="sc-nav-indicator" />}
                                            <tab.icon size={18} style={{ color: isActive ? 'var(--sc-primary)' : 'inherit' }} />
                                            <span>{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Content */}
                <div className="sc-content">
                    <AnimatePresence mode='wait'>
                        {/* Toast */}
                        {notification && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, x: '-50%' }}
                                animate={{ opacity: 1, y: 0, x: '-50%' }}
                                exit={{ opacity: 0, y: 10, x: '-50%' }}
                                style={{
                                    position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
                                    zIndex: 100, padding: '12px 24px', borderRadius: '50px',
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    backgroundColor: notification.type === 'success' ? 'rgba(6, 78, 59, 0.9)' : 'rgba(127, 29, 29, 0.9)',
                                    color: 'white', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)'
                                }}
                            >
                                {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                                <span>{notification.message}</span>
                            </motion.div>
                        )}

                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.2 }}
                        >
                            {renderContent(activeTab, settings, updateSetting, {
                                calibrating, handleCalibration, testEmailSent, handleTestEmail
                            })}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

// --- Reusable Components (mapped to CSS classes) ---

const SectionDesc = ({ title, desc }) => (
    <div className="sc-section-hero">
        <h2 className="sc-section-title">{title}</h2>
        <p className="sc-section-desc">{desc}</p>
    </div>
);

const SettingCard = ({ children }) => (
    <div className="sc-setting-card">{children}</div>
);

const Badge = ({ type, text }) => (
    <span className={`sc-badge sc-badge-${type}`}>{text}</span>
);

const ToggleRow = ({ label, desc, checked, onChange, impact }) => (
    <div className="sc-toggle-row">
        <div>
            <div className="sc-label">
                <span>{label}</span>
                {impact && <Badge type={impact.type} text={impact.text} />}
            </div>
            <p className="sc-desc-small">{desc}</p>
        </div>
        <button
            onClick={() => onChange(!checked)}
            className={`sc-toggle-btn ${checked ? 'sc-toggle-active' : 'sc-toggle-inactive'}`}
        >
            <div className="sc-toggle-circle" />
        </button>
    </div>
);

const renderContent = (tab, settings, update, actions) => {
    switch (tab) {
        case 'ai':
            return (
                <div>
                    <SectionDesc
                        title="Artificial Intelligence Engine"
                        desc="Configure sensitivity and autonomy of AI models. Adjusting thresholds impacts accuracy vs. recall."
                    />
                    <div className="sc-grid-2">
                        <SettingCard>
                            <div className="sc-flex-between sc-mb-4">
                                <div>
                                    <h3 style={{ fontWeight: 600, color: 'white' }}>Facial Recognition Confidence</h3>
                                    <p className="sc-desc-small">Min score for auto-marking presence.</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--sc-primary)' }}>
                                        {settings.ai.facialRecognitionThreshold}%
                                    </span>
                                </div>
                            </div>
                            <input
                                type="range"
                                min="50" max="99"
                                value={settings.ai.facialRecognitionThreshold}
                                onChange={(e) => update('ai', 'facialRecognitionThreshold', parseInt(e.target.value))}
                                className="sc-slider"
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                                <span className="sc-desc-small">MODEL_V3.1_RESNET</span>
                                <button className="sc-btn-outline" onClick={actions.handleCalibration} disabled={actions.calibrating}>
                                    {actions.calibrating ? <RefreshCw className="animate-spin" size={14} /> : <Zap size={14} />}
                                    {actions.calibrating ? 'CALIBRATING...' : 'RUN CALIBRATION TEST'}
                                </button>
                            </div>
                        </SettingCard>

                        <SettingCard>
                            <ToggleRow
                                label="Anomaly Detection"
                                desc="Flag suspicious concurrent appearances."
                                checked={settings.ai.anomalyDetectionEnabled}
                                onChange={(v) => update('ai', 'anomalyDetectionEnabled', v)}
                                impact={{ type: 'info', text: 'Recommended' }}
                            />
                        </SettingCard>
                    </div>
                </div>
            );

        case 'security':
            return (
                <div>
                    <SectionDesc title="Security Protocols" desc="Enforce access control policies and harden the platform." />
                    <div style={{ display: 'grid', gap: '16px' }}>
                        <SettingCard>
                            <ToggleRow
                                label="Enforce 2-Factor Authentication (2FA)"
                                desc="Mandatory 2FA for all 'Admin' or 'Faculty' roles."
                                checked={settings.security.requireTwoFactor}
                                onChange={(v) => update('security', 'requireTwoFactor', v)}
                                impact={{ type: 'warning', text: 'High Impact' }}
                            />
                        </SettingCard>
                        <SettingCard>
                            <h3 className="sc-label">Password Complexity Policy</h3>
                            <div className="sc-grid-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: '16px' }}>
                                {['Standard', 'Strong', 'Enterprise'].map((level) => (
                                    <button
                                        key={level}
                                        onClick={() => update('security', 'minPasswordStrength', level)}
                                        style={{
                                            padding: '12px',
                                            borderRadius: '8px',
                                            border: settings.security.minPasswordStrength === level ? '1px solid var(--sc-primary)' : '1px solid #334155',
                                            background: settings.security.minPasswordStrength === level ? 'rgba(20, 184, 166, 0.1)' : 'transparent',
                                            color: settings.security.minPasswordStrength === level ? 'var(--sc-primary)' : '#94a3b8',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div style={{ fontWeight: 'bold' }}>{level}</div>
                                    </button>
                                ))}
                            </div>
                        </SettingCard>
                    </div>
                </div>
            );

        case 'notifications':
            return (
                <div>
                    <SectionDesc title="Communication Hub" desc="Manage outgoing alerts and system notifications." />
                    <SettingCard>
                        <ToggleRow
                            label="System Email Gateways"
                            desc="Allow the system to send emails (SMTP/API)."
                            checked={settings.notifications.enableEmailAlerts}
                            onChange={(v) => update('notifications', 'enableEmailAlerts', v)}
                        />
                        <div style={{ borderTop: '1px solid var(--sc-border-color)', marginTop: '20px', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="sc-btn-secondary" onClick={actions.handleTestEmail}>
                                <Mail size={14} /> Send Test Email
                            </button>
                        </div>
                    </SettingCard>
                </div>
            );

        case 'institution':
            return (
                <div>
                    <SectionDesc title="Institution & Global" desc="Core identity and localization settings." />
                    <SettingCard>
                        <label className="sc-label" style={{ marginBottom: '8px' }}>Registered Institution Name</label>
                        <input
                            className="sc-input"
                            value={settings.institution.name}
                            onChange={(e) => update('institution', 'name', e.target.value)}
                        />
                    </SettingCard>
                    <div className="sc-grid-2">
                        <SettingCard>
                            <label className="sc-label">Contact Email</label>
                            <input className="sc-input" value={settings.institution.contactEmail || ''} onChange={(e) => update('institution', 'contactEmail', e.target.value)} />
                        </SettingCard>
                        <SettingCard>
                            <label className="sc-label">Official Website</label>
                            <input className="sc-input" value={settings.institution.website || ''} onChange={(e) => update('institution', 'website', e.target.value)} />
                        </SettingCard>
                    </div>
                    <div className="sc-grid-2" style={{ marginTop: '16px' }}>
                        <SettingCard>
                            <label className="sc-label">Academic Year</label>
                            <input className="sc-input" value={settings.institution.academicYear} onChange={(e) => update('institution', 'academicYear', e.target.value)} />
                        </SettingCard>
                        <SettingCard>
                            <label className="sc-label">Timezone</label>
                            <select className="sc-select" value={settings.institution.timezone} onChange={(e) => update('institution', 'timezone', e.target.value)}>
                                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                                <option value="UTC">UTC (Universal)</option>
                                <option value="America/New_York">New York (EST)</option>
                            </select>
                        </SettingCard>
                    </div>
                </div>
            );

        case 'attendance':
            return (
                <div>
                    <SectionDesc title="Attendance Rules" desc="Define thresholds for student attendance tracking." />
                    <div className="sc-grid-2">
                        <SettingCard>
                            <label className="sc-label">Min Attendance Threshold (%)</label>
                            <div className="sc-flex-between sc-mb-4">
                                <input
                                    type="range" min="50" max="95"
                                    value={settings.attendance.minAttendanceThreshold}
                                    onChange={(e) => update('attendance', 'minAttendanceThreshold', parseInt(e.target.value))}
                                    className="sc-slider" style={{ width: '70%' }}
                                />
                                <span style={{ fontWeight: 'bold', color: 'var(--sc-primary)' }}>{settings.attendance.minAttendanceThreshold}%</span>
                            </div>
                        </SettingCard>
                        <SettingCard>
                            <label className="sc-label sc-mb-4">Lateness Grace Period (Mins)</label>
                            <input
                                type="number" className="sc-input"
                                value={settings.attendance.latenessGracePeriodMinutes}
                                onChange={(e) => update('attendance', 'latenessGracePeriodMinutes', parseInt(e.target.value))}
                            />
                        </SettingCard>
                    </div>
                </div>
            );

        case 'faculty':
            return (
                <div>
                    <SectionDesc title="Faculty Permissions" desc="Control what actions faculty members can perform." />
                    <SettingCard>
                        <ToggleRow
                            label="Edit Past Attendance"
                            desc="Allow faculty to modify records after submission."
                            checked={settings.facultyPermissions.canEditAttendance}
                            onChange={(v) => update('facultyPermissions', 'canEditAttendance', v)}
                            impact={{ type: 'warning', text: 'Audit Risk' }}
                        />
                        {settings.facultyPermissions.canEditAttendance && (
                            <div style={{ marginTop: '16px' }}>
                                <label className="sc-label">Edit Window (Hours)</label>
                                <input
                                    type="number" className="sc-input" style={{ width: '100px' }}
                                    value={settings.facultyPermissions.editWindowHours}
                                    onChange={(e) => update('facultyPermissions', 'editWindowHours', parseInt(e.target.value))}
                                />
                            </div>
                        )}
                    </SettingCard>
                    <SettingCard>
                        <ToggleRow
                            label="Delete Generated Reports"
                            desc="Allow permanent deletion of academic reports."
                            checked={settings.facultyPermissions.canDeleteReports}
                            onChange={(v) => update('facultyPermissions', 'canDeleteReports', v)}
                            impact={{ type: 'danger', text: 'Critical' }}
                        />
                    </SettingCard>
                </div>
            );

        case 'session':
            return (
                <div>
                    <SectionDesc title="Session Management" desc="Configure user session timeouts and concurrency." />
                    <SettingCard>
                        <label className="sc-label sc-mb-4">Session Timeout (Minutes)</label>
                        <input
                            type="number" className="sc-input sc-mb-4"
                            value={settings.session.sessionTimeoutMinutes}
                            onChange={(e) => update('session', 'sessionTimeoutMinutes', parseInt(e.target.value))}
                        />
                        <ToggleRow
                            label="Force Logout on Idle"
                            desc="Automatically terminate session after timeout."
                            checked={settings.session.forceLogoutIdle}
                            onChange={(v) => update('session', 'forceLogoutIdle', v)}
                        />
                    </SettingCard>
                </div>
            );

        case 'reports':
            return (
                <div>
                    <SectionDesc title="Analytics & Audits" desc="Data retention policies and automatic reporting." />
                    <SettingCard>
                        <label className="sc-label sc-mb-4">Audit Log Retention</label>
                        <select
                            className="sc-select sc-mb-4"
                            value={settings.reports.auditLogRetentionDays}
                            onChange={(e) => update('reports', 'auditLogRetentionDays', parseInt(e.target.value))}
                        >
                            <option value="30">30 Days</option>
                            <option value="90">90 Days</option>
                            <option value="365">1 Year</option>
                        </select>
                        <ToggleRow
                            label="Auto-Generate Weekly Reports"
                            desc="Email summary reports to admins every Monday."
                            checked={settings.reports.autoGenerateWeeklyReports}
                            onChange={(v) => update('reports', 'autoGenerateWeeklyReports', v)}
                        />
                    </SettingCard>
                </div>
            );

        case 'ui':
            return (
                <div>
                    <SectionDesc title="Interface & Theme" desc="Customize the admin dashboard experience." />
                    <div className="sc-grid-2">
                        <SettingCard>
                            <label className="sc-label">Default Theme</label>
                            <select
                                className="sc-select"
                                value={settings.ui.theme}
                                onChange={(e) => update('ui', 'theme', e.target.value)}
                            >
                                <option value="dark">Dark Mode</option>
                                <option value="light">Light Mode</option>
                                <option value="system">System Default</option>
                            </select>
                        </SettingCard>
                        <SettingCard>
                            <label className="sc-label">Information Density</label>
                            <select
                                className="sc-select"
                                value={settings.ui.density}
                                onChange={(e) => update('ui', 'density', e.target.value)}
                            >
                                <option value="comfortable">Comfortable</option>
                                <option value="compact">Compact</option>
                            </select>
                        </SettingCard>
                    </div>
                </div>
            );

        case 'maintenance':
            return (
                <div>
                    <SectionDesc title="Maintenance & Info" desc="System versioning and emergency controls." />
                    <SettingCard>
                        <div style={{ marginBottom: '24px', opacity: 0.7, fontSize: '0.9rem', fontFamily: 'monospace' }}>
                            <div className="sc-flex-between"><span>System Version:</span> <span className="sc-text-teal">v2.4.0</span></div>
                            <div className="sc-flex-between"><span>Build Hash:</span> <span>#8f92a10</span></div>
                        </div>
                        <ToggleRow
                            label="Maintenance Mode"
                            desc="Lock out all non-admin users immediately."
                            checked={settings.system.maintenanceMode}
                            onChange={(v) => update('system', 'maintenanceMode', v)}
                            impact={{ type: 'danger', text: 'Disruptive' }}
                        />
                    </SettingCard>
                </div>
            );

        default:
            return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Select a category to configure.</div>;
    }
}

export default SettingsConfig;
