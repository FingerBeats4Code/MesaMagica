// mesa-magica-pwa-app/src/pages/admin/Tables.tsx
import React, { useState, useEffect } from "react";
import { createTable, getTables, deleteTable, TableResponse, CreateTableRequest } from "@/api/api";

type FilterStatus = 'all' | 'occupied' | 'free';

const Tables: React.FC = () => {
  const [tables, setTables] = useState<TableResponse[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTable, setSelectedTable] = useState<TableResponse | null>(null);
  const [tableNumber, setTableNumber] = useState("");
  const [seatCapacity, setSeatCapacity] = useState(4);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const response = await getTables();
      setTables(response);
    } catch (err: any) {
      setError(err.message || "Failed to fetch tables");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTable = async () => {
    if (!tableNumber.trim()) {
      alert('Please enter a table number');
      return;
    }
    
    try {
      const payload: CreateTableRequest = {
        tableNumber,
        seatCapacity
      };
      await createTable(payload);
      setTableNumber("");
      setSeatCapacity(4);
      setShowCreateForm(false);
      await fetchTables();
    } catch (err: any) {
      setError(err.message || "Failed to create table");
    }
  };

  const handleDeleteTable = async (tableId: number) => {
    if (!confirm('Are you sure you want to delete this table?')) return;
    
    try {
      await deleteTable(tableId);
      setSelectedTable(null);
      await fetchTables();
    } catch (err: any) {
      setError(err.message || "Failed to delete table");
    }
  };

  const handleDownloadQR = (table: TableResponse) => {
    // Create a download link
    const link = document.createElement('a');
    link.href = table.qrCodeUrl;
    link.download = `${table.tableNumber}-QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTables = tables.filter(table => {
    if (filterStatus === 'occupied') return table.isOccupied;
    if (filterStatus === 'free') return !table.isOccupied;
    return true;
  });

  const stats = {
    total: tables.length,
    occupied: tables.filter(t => t.isOccupied).length,
    free: tables.filter(t => !t.isOccupied).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Manage Tables</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-orange-500 text-white rounded-lg py-2 px-4 hover:bg-orange-600 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Table
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-zinc-300/70 dark:border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-neutral-400">Total Tables</p>
              <p className="text-3xl font-bold mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-zinc-300/70 dark:border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-neutral-400">Occupied</p>
              <p className="text-3xl font-bold mt-1 text-red-600">{stats.occupied}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-zinc-300/70 dark:border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-neutral-400">Available</p>
              <p className="text-3xl font-bold mt-1 text-green-600">{stats.free}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterStatus === 'all'
              ? 'bg-neutral-900 dark:bg-orange-500 text-white'
              : 'bg-white dark:bg-neutral-900 border border-zinc-300/70 dark:border-white/20 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          All Tables
        </button>
        <button
          onClick={() => setFilterStatus('occupied')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterStatus === 'occupied'
              ? 'bg-neutral-900 dark:bg-orange-500 text-white'
              : 'bg-white dark:bg-neutral-900 border border-zinc-300/70 dark:border-white/20 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          Occupied
        </button>
        <button
          onClick={() => setFilterStatus('free')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterStatus === 'free'
              ? 'bg-neutral-900 dark:bg-orange-500 text-white'
              : 'bg-white dark:bg-neutral-900 border border-zinc-300/70 dark:border-white/20 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          Available
        </button>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTables.map(table => (
          <div
            key={table.tableId}
            className={`bg-white dark:bg-neutral-900 rounded-xl border-2 p-6 cursor-pointer transition-all hover:shadow-lg ${
              table.isOccupied
                ? 'border-red-300 dark:border-red-700'
                : 'border-green-300 dark:border-green-700'
            } ${selectedTable?.tableId === table.tableId ? 'ring-2 ring-orange-500' : ''}`}
            onClick={() => setSelectedTable(table)}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold">{table.tableNumber}</h3>
                <p className="text-sm text-gray-600 dark:text-neutral-400">
                  Capacity: {table.seatCapacity} seats
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                table.isOccupied
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              }`}>
                {table.isOccupied ? 'Occupied' : 'Free'}
              </div>
            </div>

            <div className="mb-4">
              <img 
                src={table.qrCodeUrl} 
                alt={`QR Code for ${table.tableNumber}`}
                className="w-32 h-32 mx-auto border border-zinc-300/70 dark:border-white/20 rounded-lg"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadQR(table);
                }}
                className="flex-1 bg-blue-500 text-white rounded-lg py-2 text-sm hover:bg-blue-600 flex items-center justify-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download QR
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTable(table.tableId);
                }}
                className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredTables.length === 0 && (
        <div className="text-center py-12">
          <p className="text-lg text-gray-600 dark:text-neutral-400">No tables found</p>
        </div>
      )}

      {/* Create Table Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Create New Table</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Table Number
                </label>
                <input
                  type="text"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300/70 dark:border-white/20 p-3 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., Table-6"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Seat Capacity
                </label>
                <input
                  type="number"
                  value={seatCapacity}
                  onChange={(e) => setSeatCapacity(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-300/70 dark:border-white/20 p-3 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  min="1"
                  max="20"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateTable}
                  className="flex-1 bg-orange-500 text-white rounded-lg py-3 font-medium hover:bg-orange-600"
                >
                  Create Table
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-gray-500 text-white rounded-lg py-3 font-medium hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table Details Panel */}
      {selectedTable && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t-2 border-zinc-300/70 dark:border-white/20 p-6 shadow-2xl z-40">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold">{selectedTable.tableNumber}</h3>
                <p className="text-sm text-gray-600 dark:text-neutral-400">
                  Created: {new Date(selectedTable.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedTable(null)}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-neutral-400 mb-1">Status</p>
                <p className={`font-semibold ${selectedTable.isOccupied ? 'text-red-600' : 'text-green-600'}`}>
                  {selectedTable.isOccupied ? 'Occupied' : 'Available'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-neutral-400 mb-1">Capacity</p>
                <p className="font-semibold">{selectedTable.seatCapacity} seats</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-neutral-400 mb-1">Table ID</p>
                <p className="font-semibold">{selectedTable.tableId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-neutral-400 mb-1">QR Code</p>
                <button
                  onClick={() => handleDownloadQR(selectedTable)}
                  className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                >
                  Download QR Code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tables;