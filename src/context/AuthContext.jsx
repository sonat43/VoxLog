import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                setUser(null);
                setRole(null);
            } else {
                setLoading(true);
                setError('');
                try {
                    const userDocRef = doc(db, 'users', currentUser.uid);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        const userData = userDoc.data();

                        // Check if account is active
                        if (userData.status === 'disabled' || userData.status === 'Disabled') {
                            throw new Error("Your account has been disabled by the administrator.");
                        }

                        setRole(userData.role);
                        setUser({ ...currentUser, ...userData });
                    } else {
                        // Profile deleted
                        throw new Error("Access Denied. User profile not found.");
                    }
                } catch (err) {
                    console.error("Auth Validation Error:", err);
                    await firebaseSignOut(auth); // Force Logout
                    setUser(null);
                    setRole(null);
                    setError(err.message);
                }
            }
            // Always turn off loading after check
            setLoading(false);
        });

        return unsubscribe;
    }, []);

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
