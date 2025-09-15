import React, { createContext, useContext, useState, ReactNode } from 'react';

interface GlobalContextType {
    tenantSlug: string;
    sessionId: string | null;
    jwt: string | null;
    setTenantSlug: (slug: string) => void;
    setSessionData: (sessionId: string, jwt: string) => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [tenantSlug, setTenantSlug] = useState<string>('');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [jwt, setJwt] = useState<string | null>(null);

    const setSessionData = (sessionId: string, jwt: string) => {
        setSessionId(sessionId);
        setJwt(jwt);
    };

    return (
        <GlobalContext.Provider value={{ tenantSlug, sessionId, jwt, setTenantSlug, setSessionData }}>
            {children}
        </GlobalContext.Provider>
    );
};

export const useGlobalContext = () => {
    const context = useContext(GlobalContext);
    if (!context) throw new Error('useGlobalContext must be used within a GlobalProvider');
    return context;
};