import React, { useState, useEffect } from "react";
import { addStaff, getStaff, updateStaffRole } from "@/api/api";

interface Staff {
  id: string;
  username: string;
  role: string;
}

const Staff: React.FC = () => {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await getStaff();
        setStaffList(response);
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch staff");
        setLoading(false);
      }
    };
    fetchStaff();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newStaff = await addStaff({ username, password, role });
      setStaffList([...staffList, newStaff]);
      setUsername("");
      setPassword("");
      setRole("staff");
    } catch (err) {
      setError("Failed to add staff");
    }
  };

  const handleUpdateRole = async (id: string, newRole: string) => {
    try {
      await updateStaffRole(id, newRole);
      setStaffList(staffList.map(s => s.id === id ? { ...s, role: newRole } : s));
    } catch (err) {
      setError("Failed to update role");
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="bg-white dark:bg-neutral-950 text-gray-800 dark:text-neutral-100 min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">Manage Staff</h1>
      <form onSubmit={handleAddStaff} className="space-y-4 max-w-md mb-8">
        <div>
          <label htmlFor="username" className="block text-sm font-medium">
            Username
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 w-full rounded-lg border p-2 dark:bg-neutral-800 dark:text-neutral-100"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border p-2 dark:bg-neutral-800 dark:text-neutral-100"
            required
          />
        </div>
        <div>
          <label htmlFor="role" className="block text-sm font-medium">
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 w-full rounded-lg border p-2 dark:bg-neutral-800 dark:text-neutral-100"
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          className="bg-neutral-900 dark:bg-orange-500 text-white rounded-lg py-2 px-4 hover:bg-neutral-700 dark:hover:bg-orange-600"
        >
          Add Staff
        </button>
      </form>
      <h2 className="text-2xl font-semibold mb-4">Staff List</h2>
      <div className="space-y-4">
        {staffList.map(staff => (
          <div key={staff.id} className="border p-4 rounded-lg">
            <p>Username: {staff.username}</p>
            <p>Role: {staff.role}</p>
            <select
              value={staff.role}
              onChange={(e) => handleUpdateRole(staff.id, e.target.value)}
              className="mt-2 rounded-lg border p-1 dark:bg-neutral-800 dark:text-neutral-100"
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Staff;