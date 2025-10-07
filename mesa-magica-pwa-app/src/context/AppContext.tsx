import React, { createContext, useContext, useState, useEffect } from 'react';

interface AppContextType {
  jwt: string | null;
  sessionId: string | null;
  setAuth: (jwt: string | null, sessionId: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jwt, setJwt] = useState<string | null>(() => localStorage.getItem('jwt') || null);
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem('sessionId') || null);

  const setAuth = (newJwt: string | null, newSessionId: string | null) => {
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

  return (
    <AppContext.Provider value={{ jwt, sessionId, setAuth }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};