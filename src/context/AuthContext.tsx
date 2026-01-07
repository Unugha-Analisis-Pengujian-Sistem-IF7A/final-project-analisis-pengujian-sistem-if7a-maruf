import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Session, User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'participant';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    // Add a 5s timeout to profile fetch
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Profile fetch timeout')), 5000));
    
    try {
      const response = await Promise.race([
        supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single(),
        timeout
      ]) as { data: { role: string } | null; error: Error | null };
      
      const { data, error: profileError } = response;
      if (profileError) throw profileError;

      if (data) {
        setRole(data.role as UserRole);
      } else {
        setRole('participant');
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
      setRole('participant'); // Default fallback
    }
  };

  useEffect(() => {
    // onAuthStateChange fires on mount with current session
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        setLoading(true);
        await fetchProfile(currentSession.user.id);
      } else {
        setRole(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setUser(null);
    setSession(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const value = {
    session,
    user,
    role,
    loading,
    signOut,
    refreshProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
