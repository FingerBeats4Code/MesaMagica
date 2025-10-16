import React, { useState } from "react";
import { createTable } from "@/api/api";

const Tables: React.FC = () => {
  const [tableNumber, setTableNumber] = useState("");
  const [seatCapacity, setSeatCapacity] = useState(4);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await createTable({ tableNumber, seatCapacity });
      setSuccess(`Table ${response.tableId} created with QR: ${response.qrCodeUrl}`);
      setTableNumber("");
      setSeatCapacity(4);
    } catch (err) {
      setError("Failed to create table");
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-950 text-gray-800 dark:text-neutral-100 min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">Manage Tables</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {success && <p className="text-green-500 mb-4">{success}</p>}
      <form onSubmit={handleCreateTable} className="space-y-4 max-w-md">
        <div>
          <label htmlFor="tableNumber" className="block text-sm font-medium">
            Table Number
          </label>
          <input
            type="text"
            id="tableNumber"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            className="mt-1 w-full rounded-lg border p-2 dark:bg-neutral-800 dark:text-neutral-100"
            required
          />
        </div>
        <div>
          <label htmlFor="seatCapacity" className="block text-sm font-medium">
            Seat Capacity
          </label>
          <input
            type="number"
            id="seatCapacity"
            value={seatCapacity}
            onChange={(e) => setSeatCapacity(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border p-2 dark:bg-neutral-800 dark:text-neutral-100"
            min="1"
            required
          />
        </div>
        <button
          type="submit"
          className="bg-neutral-900 dark:bg-orange-500 text-white rounded-lg py-2 px-4 hover:bg-neutral-700 dark:hover:bg-orange-600"
        >
          Create Table
        </button>
      </form>
    </div>
  );
};

export default Tables;