import React, { useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000); // Auto close after 5s

        return () => clearTimeout(timer);
    }, [onClose]);

    const styles = {
        container: {
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            borderRadius: '8px',
            background: '#1f2937', // Dark gray
            color: 'white',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
            borderLeft: `4px solid ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'}`,
            animation: 'slideIn 0.3s ease-out',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        },
        icon: {
            color: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'
        },
        close: {
            background: 'none',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            marginLeft: '8px'
        }
    };

    const icons = {
        success: <CheckCircle size={20} />,
        error: <AlertTriangle size={20} />,
        info: <Info size={20} />
    };

    return (
        <div style={styles.container}>
            <div style={styles.icon}>{icons[type]}</div>
            <div style={{ flex: 1, fontSize: '0.95rem' }}>{message}</div>
            <button onClick={onClose} style={styles.close}>
                <X size={16} />
            </button>
            <style>
                {`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                `}
            </style>
        </div>
    );
};

export default Toast;
