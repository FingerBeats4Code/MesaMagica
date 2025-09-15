import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { startSession, type SessionResponse } from '../api';
import { useGlobalContext } from '../context/GlobalContext';

const SessionPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { setTenantSlug, setSessionData } = useGlobalContext(); // This line triggers the error if not in provider
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const apiKey = import.meta.env.VITE_API_KEY || '';

    useEffect(() => {
        debugger;
        const tenantSlug = searchParams.get('tenant');
        const tableId = searchParams.get('table');
        const qrCodeUrl = `${window.location.origin}/session?tenantSlug=${tenantSlug}&tableId=${tableId}`;

        console.log('SessionPage - tenantSlug:', tenantSlug, 'tableId:', tableId);

        if (!tenantSlug || !tableId) {
            setError('Invalid QR code. Missing tenant or table information.');
            setLoading(false);
            return;
        }

        const startSessionAsync = async () => {
            try {
                const response: SessionResponse = await startSession(qrCodeUrl, tenantSlug, apiKey, tableId);
                const { sessionId, jwt } = response;
                if (!sessionId || !jwt) {
                    throw new Error('Invalid session response: missing sessionId or jwt');
                }
                if (setTenantSlug && setSessionData) {
                    setTenantSlug(tenantSlug);
                    setSessionData(sessionId, jwt);
                    console.log('SessionPage - Token set:', jwt, 'sessionId:', sessionId);
                }
                navigate(`/menu?tenantSlug=${tenantSlug}&sessionId=${sessionId}`);
            } catch (err: any) {
                setError(err.response?.data?.message || err.message || 'Failed to start session.');
                setLoading(false);
            }
        };

        startSessionAsync();
    }, [searchParams, navigate, apiKey, setTenantSlug, setSessionData]);

    if (loading) return <div className="flex items-center justify-center min-h-screen">Starting session...</div>;
    if (error) return <div className="flex items-center justify-center min-h-screen text-red-500">{error}</div>;

    return null;
};

export default SessionPage;