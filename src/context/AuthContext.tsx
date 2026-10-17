import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../utils/api';
import { useSettings } from './SettingsContext';

interface AuthContextType {
  isConfigured: boolean;
  isLocked: boolean;
  hasCompletedSetup: boolean;
  hint?: string;
  login: (password: string) => Promise<{ success: boolean; message?: string }>;
  setupPassword: (password: string, hint?: string) => Promise<{ success: boolean; message?: string }>;
  changePassword: (currentPassword: string, newPassword: string, hint?: string) => Promise<{ success: boolean; message?: string }>;
  skipSetup: () => Promise<void>;
  removePassword: (currentPassword: string) => Promise<{ success: boolean; message?: string }>;
  lockApp: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConfigured, setIsConfigured] = useState<boolean>(() => {
    try {
      return localStorage.getItem('raseedi_auth_configured') === '1';
    } catch {
      return false;
    }
  });

  const [isLocked, setIsLocked] = useState<boolean>(() => {
    try {
      // If configured, lock immediately on cold start so no dashboard flash can occur
      return localStorage.getItem('raseedi_auth_configured') === '1';
    } catch {
      return false;
    }
  });

  const [hasCompletedSetup, setHasCompletedSetup] = useState<boolean>(() => {
    try {
      return localStorage.getItem('raseedi_auth_dismissed') === '1';
    } catch {
      return false;
    }
  });
  const [hint, setHint] = useState<string | undefined>(undefined);
  const { settings } = useSettings();

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const lockApp = useCallback(() => {
    if (isConfigured) {
      setIsLocked(true);
      try { sessionStorage.removeItem('raseedi_session_authed'); } catch {}
    }
  }, [isConfigured]);

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
        try { localStorage.setItem('raseedi_auth_configured', '1'); } catch {}
        // On initial check, if configured and session is not authenticated, ensure locked
        setIsLocked(prev => (prev === false ? (sessionStorage.getItem('raseedi_session_authed') === '1' ? false : true) : true));
      } else {
        try { localStorage.removeItem('raseedi_auth_configured'); } catch {}
        setIsLocked(false);
      }

      if (status.hasCompletedSetup) {
        setHasCompletedSetup(true);
        try { localStorage.setItem('raseedi_auth_dismissed', '1'); } catch {}
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
      try { sessionStorage.setItem('raseedi_session_authed', '1'); } catch {}
      resetInactivityTimer();
    }
    return res;
  };

  const setupPassword = async (password: string, newHint?: string) => {
    const res = await api.setupPassword(password, newHint);
    if (res.success) {
      setIsConfigured(true);
      setIsLocked(false);
      setHasCompletedSetup(true);
      try { 
        localStorage.setItem('raseedi_auth_configured', '1'); 
        localStorage.setItem('raseedi_auth_dismissed', '1'); 
        sessionStorage.setItem('raseedi_session_authed', '1');
      } catch {}
      setHint(newHint);
      resetInactivityTimer();
    }
    return res;
  };

  const changePassword = async (currentPass: string, newPass: string, newHint?: string) => {
    const res = await api.changePassword(currentPass, newPass, newHint);
    if (res.success) {
      setIsConfigured(true);
      setHint(newHint);
      setHasCompletedSetup(true);
      try { 
        localStorage.setItem('raseedi_auth_configured', '1'); 
        localStorage.setItem('raseedi_auth_dismissed', '1'); 
        sessionStorage.setItem('raseedi_session_authed', '1');
      } catch {}
      resetInactivityTimer();
    }
    return res;
  };

  const skipSetup = async () => {
    try {
      await api.dismissInitialSetup();
    } catch (e) {
      console.error(e);
    }
    setHasCompletedSetup(true);
    try { localStorage.setItem('raseedi_auth_dismissed', '1'); } catch {}
    setIsConfigured(false);
    setIsLocked(false);
  };

  const removePassword = async (currentPassword: string) => {
    const res = await api.removePassword(currentPassword);
    if (res.success) {
      setIsConfigured(false);
      setIsLocked(false);
      setHint(undefined);
      setHasCompletedSetup(true);
      try { 
        localStorage.removeItem('raseedi_auth_configured');
        localStorage.setItem('raseedi_auth_dismissed', '1'); 
        sessionStorage.removeItem('raseedi_session_authed');
      } catch {}
    }
    return res;
  };

  return (
    <AuthContext.Provider value={{
      isConfigured,
      isLocked,
      hasCompletedSetup,
      hint,
      login,
      setupPassword,
      changePassword,
      skipSetup,
      removePassword,
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
