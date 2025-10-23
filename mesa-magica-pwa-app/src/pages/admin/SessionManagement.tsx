// mesa-magica-pwa-app/src/pages/admin/SessionManagement.tsx
import React, { useState, useEffect } from "react";
import { getActiveSessions, closeSessionAdmin, getSessionDetailsAdmin, ActiveSessionResponse, SessionDetailsResponse } from "@/api/api";

const SessionManagement: React.FC = () => {
  const [sessions, setSessions] = useState<ActiveSessionResponse[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await getActiveSessions();
      setSessions(data);
      setError("");
    } catch (err: any) {
      setError(err.message || "Failed to fetch sessions");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (sessionId: string) => {
    try {
      const details = await getSessionDetailsAdmin(sessionId);
      setSelectedSession(details);
      setShowDetails(true);
    } catch (err: any) {
      setError(err.message || "Failed to fetch session details");
    }
  };

  const handleCloseSession = async (sessionId: string, tableNumber: string) => {
    if (!confirm(`Are you sure you want to close the session for ${tableNumber}?`)) return;

    try {
      await closeSessionAdmin(sessionId);
      await fetchSessions();
      setShowDetails(false);
      setSelectedSession(null);
    } catch (err: any) {
      const errorData = err.response?.data;
      if (errorData?.unpaidOrderCount) {
        alert(
          `Cannot close session: ${errorData.unpaidOrderCount} unpaid order(s) totaling $${errorData.totalUnpaidAmount.toFixed(2)}\n\n` +
          `Please close all orders first.`
        );
      } else {
        setError(err.message || "Failed to close session");
      }
    }
  };

  const getStatusColor = (activeMinutes: number) => {
    if (activeMinutes > 45) return 'text-red-600 dark:text-red-400';
    if (activeMinutes > 30) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  };

  if (loading && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Session Management</h1>
        <button
          onClick={fetchSessions}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-zinc-300/70 dark:border-white/20 p-4">
          <p className="text-sm text-gray-600 dark:text-neutral-400">Active Sessions</p>
          <p className="text-2xl font-bold">{sessions.length}</p>
        </div>
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-zinc-300/70 dark:border-white/20 p-4">
          <p className="text-sm text-gray-600 dark:text-neutral-400">Total Guests</p>
          <p className="text-2xl font-bold">{sessions.reduce((sum, s) => sum + s.sessionCount, 0)}</p>
        </div>
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-zinc-300/70 dark:border-white/20 p-4">
          <p className="text-sm text-gray-600 dark:text-neutral-400">Unpaid Orders</p>
          <p className="text-2xl font-bold text-orange-600">
            {sessions.reduce((sum, s) => sum + s.unpaidOrders, 0)}
          </p>
        </div>
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-zinc-300/70 dark:border-white/20 p-4">
          <p className="text-sm text-gray-600 dark:text-neutral-400">Total Revenue</p>
          <p className="text-2xl font-bold text-green-600">
            ${sessions.reduce((sum, s) => sum + s.totalAmount, 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {sessions.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-neutral-900 rounded-xl border border-zinc-300/70 dark:border-white/20">
            <p className="text-gray-600 dark:text-neutral-400">No active sessions</p>
          </div>
        ) : (
          sessions.map(session => (
            <div
              key={session.sessionId}
              className="bg-white dark:bg-neutral-900 rounded-xl border border-zinc-300/70 dark:border-white/20 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold">{session.tableNumber}</h3>
                  <p className="text-sm text-gray-600 dark:text-neutral-400">
                    Session ID: {session.sessionId.slice(0, 8)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">
                    Started: {new Date(session.startedAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getStatusColor(session.activeMinutes)}`}>
                    {session.activeMinutes}m
                  </div>
                  <p className="text-xs text-gray-600 dark:text-neutral-400">active</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-600 dark:text-neutral-400">Guests</p>
                  <p className="text-lg font-semibold">{session.sessionCount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-neutral-400">Orders</p>
                  <p className="text-lg font-semibold">{session.totalOrders}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-neutral-400">Unpaid</p>
                  <p className="text-lg font-semibold text-orange-600">{session.unpaidOrders}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-neutral-400">Total</p>
                  <p className="text-lg font-semibold text-green-600">
                    ${session.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-300/70 dark:border-white/20">
                <div className="grid grid-cols-3 gap-2 text-xs mb-4">
                  <div className="text-center">
                    <p className="text-gray-600 dark:text-neutral-400">Pending</p>
                    <p className="font-semibold">{session.pendingOrders}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600 dark:text-neutral-400">Preparing</p>
                    <p className="font-semibold">{session.preparingOrders}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600 dark:text-neutral-400">Served</p>
                    <p className="font-semibold">{session.servedOrders}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewDetails(session.sessionId)}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleCloseSession(session.sessionId, session.tableNumber)}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                    disabled={session.unpaidOrders > 0}
                  >
                    Close Session
                  </button>
                </div>
                {session.unpaidOrders > 0 && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 text-center">
                    Close all orders before ending session
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Session Details Modal */}
      {showDetails && selectedSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">{selectedSession.tableNumber} - Session Details</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-3">
                <p className="text-xs text-gray-600 dark:text-neutral-400">Session Count</p>
                <p className="text-lg font-bold">{selectedSession.sessionCount}</p>
              </div>
              <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-3">
                <p className="text-xs text-gray-600 dark:text-neutral-400">Total Orders</p>
                <p className="text-lg font-bold">{selectedSession.totalOrderCount}</p>
              </div>
              <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-3">
                <p className="text-xs text-gray-600 dark:text-neutral-400">Cart Items</p>
                <p className="text-lg font-bold">{selectedSession.cartItemCount}</p>
              </div>
              <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-3">
                <p className="text-xs text-gray-600 dark:text-neutral-400">Total Amount</p>
                <p className="text-lg font-bold text-green-600">${selectedSession.totalOrderAmount.toFixed(2)}</p>
              </div>
            </div>

            {/* Orders */}
            {selectedSession.orders.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Orders</h3>
                <div className="space-y-3">
                  {selectedSession.orders.map(order => (
                    <div key={order.orderId} className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Order #{order.orderId.slice(0, 8)}</span>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          {order.status}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        {order.items.map(item => (
                          <div key={item.orderItemId} className="flex justify-between">
                            <span>{item.itemName} x{item.quantity}</span>
                            <span>${item.subtotal.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-neutral-700 flex justify-between font-bold">
                        <span>Total</span>
                        <span>${order.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cart */}
            {selectedSession.cartItems.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Current Cart</h3>
                <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
                  <div className="space-y-2 text-sm">
                    {selectedSession.cartItems.map(item => (
                      <div key={item.id} className="flex justify-between">
                        <span>{item.itemName} x{item.quantity}</span>
                        <span>${item.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-neutral-700 flex justify-between font-bold">
                    <span>Cart Total</span>
                    <span>${selectedSession.cartTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionManagement;