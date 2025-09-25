// src/context/GlobalContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface GlobalState {
  tenantKey: string;
  setTenantKey: (key: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const GlobalContext = createContext<GlobalState | undefined>(undefined);

export const GlobalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tenantKey, setTenantKey] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Optional: Persist tenantKey to localStorage for session continuity (secure for non-sensitive keys)
  useEffect(() => {
    const savedKey = localStorage.getItem('tenantKey');
    if (savedKey) {
      setTenantKey(savedKey);
    }
  }, []);

  useEffect(() => {
    if (tenantKey) {
      localStorage.setItem('tenantKey', tenantKey);
    }
  }, [tenantKey]);

  return (
    <GlobalContext.Provider value={{ tenantKey, setTenantKey, loading, setLoading }}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobalContext must be used within a GlobalProvider');
  }
  return context;
};