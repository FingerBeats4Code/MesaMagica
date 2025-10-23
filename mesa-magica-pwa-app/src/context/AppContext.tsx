import React, { createContext, useContext, useState, useEffect } from 'react';

interface AppContextType {
  jwt: string | null;
  sessionId: string | null;
  tenantSlug: string;
  setAuth: (jwt: string | null, sessionId: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jwt, setJwt] = useState<string | null>(() => localStorage.getItem('jwt') || null);
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem('sessionId') || null);
  
  // Extract tenant slug from hostname
  const hostname = window.location.hostname;
  const tenantSlug = hostname.includes('.') ? hostname.split('.')[1] : 'MesaMagica';

  const setAuth = (newJwt: string | null, newSessionId: string | null) => {
    console.log(`[${new Date().toISOString()}] Setting auth - JWT: ${newJwt ? 'present' : 'null'}, SessionID: ${newSessionId}`);
    
    setJwt(newJwt);
    setSessionId(newSessionId);
    
    if (newJwt) {
      localStorage.setItem('jwt', newJwt);
    } else {
      localStorage.removeItem('jwt');
    }
    
    if (newSessionId) {
      localStorage.setItem('sessionId', newSessionId);
    } else {
      localStorage.removeItem('sessionId');
    }
  };

  useEffect(() => {
    console.log(`[${new Date().toISOString()}] AppContext initialized - Tenant: ${tenantSlug}, JWT: ${jwt ? 'present' : 'null'}, SessionID: ${sessionId}`);
  }, [tenantSlug, jwt, sessionId]);

  return (
    <AppContext.Provider value={{ jwt, sessionId, tenantSlug, setAuth }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};