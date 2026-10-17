import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../utils/api';
import { useSettings } from './SettingsContext';

interface AuthContextType {
  isConfigured: boolean;
  isLocked: boolean;
  hint?: string;
  login: (password: string) => Promise<{ success: boolean; message?: string }>;
  setupPassword: (password: string, hint?: string) => Promise<{ success: boolean; message?: string }>;
  lockApp: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConfigured, setIsConfigured] = useState<boolean>(true);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [hint, setHint] = useState<string | undefined>(undefined);
  const { settings } = useSettings();

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const lockApp = useCallback(() => {
    setIsLocked(true);
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    const timeoutMinutes = parseInt(settings.lock_timeout_minutes || '15', 10);
    if (timeoutMinutes > 0 && !isLocked && isConfigured) {
      inactivityTimerRef.current = setTimeout(() => {
        lockApp();
      }, timeoutMinutes * 60 * 1000);
    }
  }, [settings.lock_timeout_minutes, isLocked, isConfigured, lockApp]);

  useEffect(() => {
    const handleActivity = () => resetInactivityTimer();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    resetInactivityTimer();

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [resetInactivityTimer]);

  const checkAuth = useCallback(async () => {
    try {
      const status = await api.getAuthStatus();
      setIsConfigured(status.isConfigured);
      setHint(status.hint);
      if (status.isConfigured) {
        setIsLocked(true); // Locked on cold start
      } else {
        setIsLocked(false);
      }
    } catch (e) {
      console.error('Failed to check auth status:', e);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (password: string) => {
    const res = await api.verifyPassword(password);
    if (res.success) {
      setIsLocked(false);
      resetInactivityTimer();
    }
    return res;
  };

  const setupPassword = async (password: string, newHint?: string) => {
    const res = await api.setupPassword(password, newHint);
    if (res.success) {
      setIsConfigured(true);
      setIsLocked(false);
      setHint(newHint);
      resetInactivityTimer();
    }
    return res;
  };

  return (
    <AuthContext.Provider value={{
      isConfigured,
      isLocked,
      hint,
      login,
      setupPassword,
      lockApp,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
