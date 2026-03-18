import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TrustFlow from '../components/TrustFlow';
import LoginCard from '../components/LoginCard';
import LoadingScreen from '../components/LoadingScreen';
import './LoginPage.css';

const LoginPage = () => {
    const { user, role, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Auto-redirect if logged in
    useEffect(() => {
        if (!loading && user && role) {
            const userRole = role.toLowerCase();
            const fromPath = location.state?.from?.pathname;
            
            // Default paths based on role
            const defaultPath = userRole === 'admin' ? '/admin-dashboard' : '/faculty/dashboard';
            
            let finalPath = defaultPath;
            
            // Role-aware redirection: only use 'from' if it matches the current user's role capability
            if (fromPath) {
                const isAdminPath = fromPath.startsWith('/admin-dashboard');
                const isFacultyPath = fromPath.startsWith('/faculty');
                
                if (userRole === 'admin' && isAdminPath) {
                    finalPath = fromPath;
                } else if (userRole === 'faculty' && isFacultyPath) {
                    finalPath = fromPath;
                }
            }

            navigate(finalPath, { replace: true });
        }
    }, [user, role, loading, navigate, location]);

    // Show 3D Loader during auth check or redirect phase
    if (loading || (user && role)) {
        return <LoadingScreen />;
    }

    return (
        <div className="login-page-container">
            {/* Background Effects */}
            <div className="bg-gradient-mesh" />

            {/* Left Section: Info/Marketing (55%) */}
            <div className="info-section">
                <div className="brand-header">
                    <img src="/logo.png" alt="VoxLog Logo" className="logo-img" />
                    <h1 className="brand-name">VoxLog</h1>
                </div>

                <div className="hero-content">
                    <h2 className="hero-headline">
                        Smart Attendance: <br />
                        <span className="text-gradient">Automated & Verified.</span>
                    </h2>

                    <p className="hero-subtext">
                        Eliminate proxy fraud with our multi-modal verification system. VoxLog combines computer vision head-counting with voice-to-text roll calls for 100% accurate reporting.
                    </p>

                    <div className="trust-flow-wrapper">
                        <TrustFlow />
                    </div>
                </div>

                <div className="footer-mini">
                    <p>VoxLog © 2026 | AI-Assisted Attendance System | Enterprise Ready</p>
                </div>
            </div>

            {/* Right Section: Action/Login (45%) */}
            <div className="action-section">
                <div className="login-card-wrapper">
                    <LoginCard />
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
