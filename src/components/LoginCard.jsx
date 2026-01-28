import React, { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { Loader2, Lock, Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import './LoginCard.css';

const LoginCard = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isResetMode, setIsResetMode] = useState(false);

    // Global Auth Error Handling
    const { error: authError } = useAuth();

    // Watch for global auth errors (e.g., account disabled/deleted after login attempt)
    React.useEffect(() => {
        if (authError) {
            setError(authError);
            setLoading(false);
        }
    }, [authError]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await signInWithEmailAndPassword(auth, email, password);
            // We do NOT navigate here. The AuthContext listener will pick up the change,
            // update the global state, and LoginPage.jsx will handle the redirect.
            // This ensures we don't race with the context update.
        } catch (err) {
            console.error("Login Error:", err);
            setLoading(false); // Only unset loading on error. On success, we unmount anyway.
            if (err.code === 'auth/invalid-credential') setError('Invalid email or password.');
            else if (err.code === 'auth/too-many-requests') setError('Too many failed attempts. Please try again later.');
            else setError(`Error: ${err.message}`);
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        if (!email) {
            setError('Please enter your email address first.');
            return;
        }
        setLoading(true);
        setError('');
        setSuccessMsg('');

        try {
            await sendPasswordResetEmail(auth, email);
            setSuccessMsg('Password reset email sent! Check your inbox.');
        } catch (err) {
            console.error("Reset Error:", err);
            if (err.code === 'auth/user-not-found') setError('No user found with this email address.');
            else setError(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-card-glass">
            <div className="login-header">
                <h2 className="login-title">{isResetMode ? 'Reset Password' : 'Secure Access'}</h2>
                <p className="login-subtitle">
                    {isResetMode ? 'Enter your email to receive a reset link' : 'Enter your credentials to continue'}
                </p>
            </div>

            <form onSubmit={isResetMode ? handlePasswordReset : handleLogin} className="login-form">
                <div className="input-group">
                    <label htmlFor="email">Email Identifier</label>
                    <div className="input-wrapper">
                        <Mail className="input-icon" size={18} />
                        <input
                            id="email"
                            type="email"
                            placeholder="user@university.edu"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="glass-input"
                        />
                    </div>
                </div>

                {!isResetMode && (
                    <div className="input-group">
                        <div className="password-label-row">
                            <label htmlFor="password">Password</label>
                        </div>
                        <div className="input-wrapper">
                            <Lock className="input-icon" size={18} />
                            <input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="glass-input"
                            />
                        </div>
                        <div className="forgot-password-row">
                            <button
                                type="button"
                                onClick={() => { setIsResetMode(true); setError(''); setSuccessMsg(''); }}
                                className="forgot-link"
                            >
                                Forgot Password?
                            </button>
                        </div>
                    </div>
                )}

                {error && <div className="error-message">{error}</div>}
                {successMsg && <div className="success-message">{successMsg}</div>}

                <button
                    type="submit"
                    disabled={loading}
                    className={`login-btn ${loading ? 'loading' : ''}`}
                >
                    {loading ? (
                        <div className="btn-loader-wrapper">
                            <Loader2 className="animate-spin" size={20} />
                            <span>Verifying...</span>
                        </div>
                    ) : (
                        isResetMode ? (
                            <>Send Reset Link <ArrowRight size={18} /></>
                        ) : (
                            <>Access VoxLog Platform <ArrowRight size={18} /></>
                        )
                    )}
                </button>

                {isResetMode && (
                    <button
                        type="button"
                        onClick={() => { setIsResetMode(false); setError(''); setSuccessMsg(''); }}
                        className="back-link"
                    >
                        <ArrowLeft size={16} /> Back to Login
                    </button>
                )}

                {!isResetMode && (
                    <div className="security-audit-text">
                        <Lock size={12} className="inline-block mr-1" />
                        <span>Platform access is strictly controlled. Audited Session.</span>
                    </div>
                )}
            </form>
        </div>
    );
};

export default LoginCard;
