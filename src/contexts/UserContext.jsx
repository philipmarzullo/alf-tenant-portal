import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const { session } = useAuth();
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [profileLoading, setProfileLoading] = useState(true);

  // Fetch current user's profile when session changes
  useEffect(() => {
    if (!session?.user?.id || !supabase) {
      setCurrentUser(null);
      setProfileLoading(false);
      return;
    }

    let cancelled = false;
    setProfileLoading(true);

    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Failed to fetch profile:', error);
          setCurrentUser(null);
        } else {
          setCurrentUser(data);
        }
        setProfileLoading(false);
      });

    return () => { cancelled = true; };
  }, [session?.user?.id]);

  // Fetch all users (for admin user management)
  const refreshUsers = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Failed to fetch users:', error);
    } else {
      setAllUsers(data);
    }
  }, []);

  // Load all users when we have a profile (admin may need the list)
  useEffect(() => {
    if (currentUser) {
      refreshUsers();
    } else {
      setAllUsers([]);
    }
  }, [currentUser, refreshUsers]);

  const activeUsers = allUsers.filter((u) => u.active);

  const hasModule = useCallback(
    (moduleKey) => {
      if (!currentUser) return false;
      if (!moduleKey) return true;
      if (currentUser.role === 'admin') return true;
      return currentUser.modules.includes(moduleKey);
    },
    [currentUser],
  );

  const isAdmin = currentUser?.role === 'admin';

  return (
    <UserContext.Provider
      value={{ currentUser, allUsers, activeUsers, refreshUsers, hasModule, isAdmin, profileLoading }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
