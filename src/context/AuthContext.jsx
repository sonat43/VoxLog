import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import LoadingScreen from '../components/LoadingScreen';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null); // 'admin' | 'faculty' | null
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Demos removed but function kept to avoid breaking LoginCard if not fully cleaned up yet?
    // Actually LoginCard cleaned up call, but context might still export.
    // I will keep the function definition empty or just minimal to avoid errors if I missed a spot, 
    // but the previous steps show I removed the call from LoginCard.
    const loginDemo = async () => { };

    useEffect(() => {
        let unsubscribeSnapshot = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            // 1. Immediate Clean-up of previous snapshot
            if (typeof unsubscribeSnapshot === 'function') {
                try {
                    unsubscribeSnapshot();
                } catch (e) {
                    console.warn("Error unsubscribing from snapshot:", e);
                }
                unsubscribeSnapshot = null;
            }

            if (!currentUser) {
                setUser(null);
                setRole(null);
                setLoading(false);
                setError('');
            } else {
                setLoading(true);
                setError('');
                
                try {
                    const userDocRef = doc(db, 'users', currentUser.uid);
                    
                    // Set up real-time listener
                    unsubscribeSnapshot = onSnapshot(userDocRef, (snapshot) => {
                        if (snapshot.exists()) {
                            const userData = snapshot.data();

                            if (userData.status === 'disabled' || userData.status === 'Disabled') {
                                setError("Your account has been disabled by the administrator.");
                                // Use setTimeout to avoid synchronous auth state changes within firestore callback
                                setTimeout(() => {
                                    firebaseSignOut(auth).catch(console.error);
                                }, 0);
                                setUser(null);
                                setRole(null);
                            } else {
                                setRole(userData.role?.toLowerCase());
                                setUser({ ...currentUser, ...userData, role: userData.role?.toLowerCase() });
                                setError('');
                            }
                        } else {
                            setError("Access Denied. User profile not found.");
                            setTimeout(() => {
                                firebaseSignOut(auth).catch(console.error);
                            }, 0);
                            setUser(null);
                            setRole(null);
                        }
                        setLoading(false);
                    }, (err) => {
                        console.error("Auth Snapshot Error:", err);
                        // If it's a permission error, it might be because we just signed out
                        if (err.code !== 'permission-denied') {
                          setError("Failed to sync profile data: " + err.message);
                        }
                        setLoading(false);
                    });
                } catch (err) {
                    console.error("Error establishing snapshot listener:", err);
                    setLoading(false);
                }
            }
        });

        return () => {
            unsubscribeAuth();
            if (typeof unsubscribeSnapshot === 'function') {
                try {
                    unsubscribeSnapshot();
                } catch (e) {
                    // Ignore already unsubscribed errors
                }
            }
        };
    }, []);

    useEffect(() => {
        let timeoutId;
        
        const handleInactivityLogout = async () => {
            console.log("Session timed out due to inactivity");
            alert("Your session has expired due to 10 minutes of inactivity. Please log in again.");
            await firebaseSignOut(auth);
        };

        const resetTimer = () => {
            if (timeoutId) clearTimeout(timeoutId);
            if (user) {
                // Set timeout for 10 minutes (600,000 ms)
                timeoutId = setTimeout(handleInactivityLogout, 600000);
            }
        };

        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

        // Add listeners only when a user is actively logged in
        if (user && !loading) {
            resetTimer();
            events.forEach(event => window.addEventListener(event, resetTimer, { passive: true }));
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            events.forEach(event => window.removeEventListener(event, resetTimer, { passive: true }));
        };
    }, [user, loading]);

    const logout = async () => {
        return firebaseSignOut(auth);
    };

    const value = {
        user,
        role,
        loading,
        error,
        logout,
        loginDemo
    };

    // If loading, show the LoadingScreen instead of nothing
    if (loading) {
        return <LoadingScreen message="Verifying Security Credentials..." />;
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
