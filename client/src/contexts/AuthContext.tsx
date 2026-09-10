import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { User, UsageInfo } from '../types';

interface AuthContextType {
  user: User | null;
  usage: UsageInfo | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshUsage: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.get<{ user: User; usage: UsageInfo }>('/auth/me');
      setUser(data.user);
      setUsage(data.usage);
    } catch {
      setUser(null);
      setUsage(null);
      api.setToken(null);
    }
  }, []);

  const refreshUsage = useCallback(async () => {
    try {
      const data = await api.get<UsageInfo>('/usage');
      setUsage(data);
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const data = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
    api.setToken(data.token);
    setUser(data.user);
    await refreshUser();
  };

  const register = async (email: string, username: string, password: string) => {
    const data = await api.post<{ token: string; user: User }>('/auth/register', { email, username, password });
    api.setToken(data.token);
    setUser(data.user);
    await refreshUser();
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    setUsage(null);
  };

  return (
    <AuthContext.Provider value={{ user, usage, loading, login, register, logout, refreshUser, refreshUsage }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
