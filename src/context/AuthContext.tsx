
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, getErrorMessage } from '../services/supabaseClient';
import { Session, User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'organizer' | 'participant';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async (userId: string) => {
      try {
          const { data, error } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', userId)
              .single();
          
          if (data) {
              setRole(data.role as UserRole);
          } else {
              // Fallback default if profile missing
              setRole('participant');
          }
      } catch {
          // Ignore
          setRole('participant');
      }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check active session
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
            await fetchProfile(session.user.id);
        }
      } catch (err: any) {
        // Ignore
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
          await fetchProfile(session.user.id);
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
    error,
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
