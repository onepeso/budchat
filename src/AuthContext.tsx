import React, {createContext, useContext, useEffect, useState} from 'react';
import {User} from '@supabase/supabase-js';
import {supabasePromise} from './supabase'; // Import the promise

interface AuthContextType {
    user: User | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Wait for Supabase to initialize
        supabasePromise.then((supabase) => {
            // Get initial session
            supabase.auth.getSession().then(({data: {session}}) => {
                setUser(session?.user ?? null);
                setLoading(false);
            });

            // Listen for auth changes
            const {data: {subscription}} = supabase.auth.onAuthStateChange((_event, session) => {
                setUser(session?.user ?? null);
                setLoading(false);
            });

            return () => subscription.unsubscribe();
        }).catch((error) => {
            console.error('Failed to initialize Supabase:', error);
            setLoading(false);
        });
    }, []);

    return (
        <AuthContext.Provider value={{user, loading}}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};