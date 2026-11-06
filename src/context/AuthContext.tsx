import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types.ts';
import { getCurrentUserApi, loginApi, registerApi, logoutApi } from '../services/api.ts';

export interface AuthContextType {
  user: User | null;
  role: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<User>;
  register: (username: string, email: string, password: string, role?: string) => Promise<User>;
  logout: () => Promise<void>;
  hasRole: (allowedRoles: string[]) => boolean;
  setUserDirectly: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch current authenticated user on app mount using HttpOnly cookie credentials
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const currentUser = await getCurrentUserApi();
        if (isMounted) {
          if (currentUser) {
            setUser({
              ...currentUser,
              role: currentUser.role ? currentUser.role.toUpperCase() : 'OPERATOR',
            });
          } else {
            // Default demo fallback: start with operator logged in so dashboard is immediately active
            setUser({
              id: 2,
              username: 'operator',
              email: 'operator@crowdmonitor.io',
              role: 'OPERATOR',
              is_active: true,
              created_at: new Date().toISOString(),
            });
          }
        }
      } catch (err) {
        console.warn('Initial session check error:', err);
        if (isMounted) {
          setUser({
            id: 2,
            username: 'operator',
            email: 'operator@crowdmonitor.io',
            role: 'OPERATOR',
            is_active: true,
            created_at: new Date().toISOString(),
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    checkAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await loginApi(username, password);
      const normalizedUser: User = {
        ...res.user,
        role: res.user.role ? res.user.role.toUpperCase() : 'OPERATOR',
      };
      setUser(normalizedUser);
      return normalizedUser;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(
    async (username: string, email: string, password: string, role: string = 'OPERATOR'): Promise<User> => {
      setIsLoading(true);
      try {
        const res = await registerApi(username, email, password, role);
        const normalizedUser: User = {
          ...res.user,
          role: res.user.role ? res.user.role.toUpperCase() : 'OPERATOR',
        };
        setUser(normalizedUser);
        return normalizedUser;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await logoutApi();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const hasRole = useCallback(
    (allowedRoles: string[]): boolean => {
      if (!user || !user.role) return false;
      const userRole = user.role.toUpperCase();
      const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());
      return normalizedAllowed.includes(userRole);
    },
    [user]
  );

  const role = user?.role ? user.role.toUpperCase() : null;
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        hasRole,
        setUserDirectly: setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
