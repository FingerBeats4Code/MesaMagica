import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "@/api/api";

const Login: React.FC = () => {
  const [tenantSlug, setTenantSlug] = useState('MesaMagica');
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already logged in
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      navigate('/admin', { replace: true });
      return;
    }

    // Extract tenant slug from hostname
    const hostname = window.location.hostname;
    const slug = hostname.includes('.') ? hostname.split('.')[1] : 'MesaMagica';
    setTenantSlug(slug);
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      console.log(`[${new Date().toISOString()}] Attempting login for user: ${username}`);
      
      const response = await login({
        username,
        password,
        tenantSlug,
      });

      console.log(`[${new Date().toISOString()}] Login successful - Role: ${response.role}`);

      // Store admin credentials
      localStorage.setItem('adminToken', response.token);
      localStorage.setItem('adminRole', response.role);
      localStorage.setItem('adminUsername', username);
      localStorage.setItem('adminTenant', tenantSlug);

      // Redirect to admin dashboard
      navigate('/admin', { replace: true });
    } catch (err: any) {
      console.error(`[${new Date().toISOString()}] Login failed:`, err);
      setError(err.message || "Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white text-gray-800 dark:bg-neutral-950 relative isolate antialiased dark:text-neutral-100 min-h-screen">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="h-[60vh] w-[60vh] rounded-full bg-gradient-to-br absolute -top-32 -left-32 from-indigo-200 via-lime-200 to-purple-300 opacity-20 blur-2xl dark:opacity-0"></div>
        <div className="h-[40vh] w-[50vh] rounded-full bg-gradient-to-tr absolute -bottom-20 right-10 from-fuchsia-300 via-orange-300 to-rose-200 opacity-40 blur-3xl dark:opacity-0"></div>
        <div className="h-[35vh] w-[45vh] rounded-full bg-gradient-to-b dark:h-[28vh] absolute top-28 left-1/4 from-orange-300 via-amber-200 to-rose-100 opacity-60 blur-3xl dark:from-orange-600 dark:via-amber-500 dark:to-rose-400 dark:opacity-64"></div>
      </div>
      <div className="mx-auto px-8 max-w-7xl py-16">
        <div className="bg-white/70 dark:bg-neutral-900/50 rounded-xl border border-zinc-300/70 dark:border-white/20 p-8 max-w-md mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold">{tenantSlug}</h1>
            <p className="text-sm text-gray-600 dark:text-neutral-400 mt-2">Admin/Staff Login</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-zinc-300/70 dark:border-white/20 p-3 text-gray-800 dark:text-neutral-100 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
                autoComplete="username"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-zinc-300/70 dark:border-white/20 p-3 text-gray-800 dark:text-neutral-100 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-neutral-900 dark:bg-orange-500 text-white rounded-lg py-3 font-medium hover:bg-neutral-700 dark:hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-zinc-300/70 dark:border-white/20">
            <p className="text-xs text-gray-600 dark:text-neutral-400 text-center">
              Test Credentials:<br />
              Admin: <code className="bg-gray-100 dark:bg-neutral-800 px-2 py-1 rounded">admin / password</code><br />
              Staff: <code className="bg-gray-100 dark:bg-neutral-800 px-2 py-1 rounded">staff / password</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;