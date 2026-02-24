import { createContext, useContext, useState, useCallback } from 'react';
import { getUsers, getCurrentUserId, setCurrentUserId } from '../data/users';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [allUsers, setAllUsers] = useState(() => getUsers());
  const [currentUserId, setCurrentUserIdState] = useState(() => getCurrentUserId());

  const currentUser = allUsers.find((u) => u.id === currentUserId) || allUsers[0];

  const switchUser = useCallback((id) => {
    setCurrentUserId(id);
    setCurrentUserIdState(id);
  }, []);

  const refreshUsers = useCallback(() => {
    setAllUsers(getUsers());
  }, []);

  const activeUsers = allUsers.filter((u) => u.active);

  const hasModule = useCallback(
    (moduleKey) => {
      if (!moduleKey) return true;
      if (currentUser.role === 'admin') return true;
      return currentUser.modules.includes(moduleKey);
    },
    [currentUser],
  );

  const isAdmin = currentUser.role === 'admin';

  return (
    <UserContext.Provider
      value={{ currentUser, allUsers, activeUsers, switchUser, refreshUsers, hasModule, isAdmin }}
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
