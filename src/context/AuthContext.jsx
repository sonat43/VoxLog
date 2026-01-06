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
                setLoading(true); // Ensure loading is true while fetching profile
                setError('');
                try {
                    const userDocRef = doc(db, 'users', currentUser.uid);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setRole(userData.role);
                        setUser({ ...currentUser, ...userData });
                    } else {
                        setRole(null);
                        setUser(currentUser);
                        setError('Access Denied. No user profile found.');
                    }
                } catch (err) {
                    console.error("Error fetching user role:", err);
                    setError('Failed to fetch user permissions.');
                    setRole(null);
                    setUser(currentUser);
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
