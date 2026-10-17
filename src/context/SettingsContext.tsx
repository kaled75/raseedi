import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

interface SettingsContextType {
  settings: Record<string, string>;
  currency: string;
  decimals: number;
  hideBalances: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  toggleHideBalances: () => void;
  formatMoney: (amount: number | undefined | null, includeCurrency?: boolean) => string;
  refreshSettings: () => Promise<void>;
  updateSettings: (newSettings: Record<string, string>) => Promise<boolean>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Record<string, string>>({
    app_name: 'رَصيدي',
    owner_name: '',
    currency: 'LYD',
    currency_decimals: '2',
    currency_symbol_position: 'after',
    theme: 'light',
    language: 'ar',
    lock_timeout_minutes: '15',
    privacy_hide_balances: '0'
  });

  const currency = settings.currency || 'LYD';
  const decimals = parseInt(settings.currency_decimals || '2', 10);
  const hideBalances = settings.privacy_hide_balances === '1';
  const theme = (settings.theme === 'dark' ? 'dark' : 'light') as 'light' | 'dark';

  const applyTheme = useCallback((currentTheme: 'light' | 'dark') => {
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const data = await api.getSettings();
      if (data && Object.keys(data).length > 0) {
        setSettings(data);
        applyTheme(data.theme === 'dark' ? 'dark' : 'light');
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }, [applyTheme]);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const updateSettings = async (newSettings: Record<string, string>) => {
    try {
      await api.updateSettings(newSettings);
      setSettings(prev => ({ ...prev, ...newSettings }));
      if (newSettings.theme) {
        applyTheme(newSettings.theme === 'dark' ? 'dark' : 'light');
      }
      return true;
    } catch (e) {
      console.error('Failed to update settings:', e);
      return false;
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    updateSettings({ theme: nextTheme });
  };

  const toggleHideBalances = () => {
    updateSettings({ privacy_hide_balances: hideBalances ? '0' : '1' });
  };

  const formatMoney = useCallback((amount: number | undefined | null, includeCurrency = true): string => {
    const symbolPos = settings.currency_symbol_position || 'after';

    if (amount === undefined || amount === null || isNaN(amount)) {
      const zeroStr = (0).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
      if (!includeCurrency) return zeroStr;
      return symbolPos === 'before' ? `${currency} ${zeroStr}` : `${zeroStr} ${currency}`;
    }

    if (hideBalances) {
      return includeCurrency ? `•••••• ${currency}` : '••••••';
    }

    const formattedNum = Number(amount).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });

    if (!includeCurrency) return formattedNum;

    return symbolPos === 'before' ? `${currency} ${formattedNum}` : `${formattedNum} ${currency}`;
  }, [currency, decimals, hideBalances, settings.currency_symbol_position]);

  return (
    <SettingsContext.Provider value={{
      settings,
      currency,
      decimals,
      hideBalances,
      theme,
      toggleTheme,
      toggleHideBalances,
      formatMoney,
      refreshSettings,
      updateSettings
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
};
