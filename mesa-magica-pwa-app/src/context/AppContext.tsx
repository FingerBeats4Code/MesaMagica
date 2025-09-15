import React, { createContext, useContext, useState } from 'react';

interface AppContextType {
  jwt: string;
  sessionId: string;
  tenantSlug: string;
  tableId: string;
  setAuth: (jwt: string, sessionId: string, tenantSlug: string, tableId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jwt, setJwt] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [tableId, setTableId] = useState('');

  const setAuth = (newJwt: string, newSessionId: string, newTenantSlug: string, newTableId: string) => {
    setJwt(newJwt);
    setSessionId(newSessionId);
    setTenantSlug(newTenantSlug);
    setTableId(newTableId);
  };

  return (
    <AppContext.Provider value={{ jwt, sessionId, tenantSlug, tableId, setAuth }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};