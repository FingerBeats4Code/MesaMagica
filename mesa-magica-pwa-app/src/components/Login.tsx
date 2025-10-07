import React, { useState, useEffect } from "react";

const Login: React.FC = () => {
  const [tenantSlug, setTenantSlug] = useState('MesaMagica');
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const hostname = window.location.hostname;
    const slug = hostname.includes('.') ? hostname.split('.')[1] : 'MesaMagica';
    setTenantSlug(slug);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder for login logic (replace with your auth API)
    if (username === "admin" && password === "password") {
      alert(`Logged in as ${username} for ${tenantSlug}`);
      // Redirect to admin dashboard or perform other actions
    } else {
      setError("Invalid username or password");
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
          <h1 className="text-3xl font-bold text-center mb-6">{tenantSlug} Admin/Staff Login</h1>
          {error && <p className="text-red-500 text-center mb-4">{error}</p>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-neutral-300">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300/70 dark:border-white/20 p-2 text-gray-800 dark:text-neutral-100 dark:bg-neutral-800"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-neutral-300">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300/70 dark:border-white/20 p-2 text-gray-800 dark:text-neutral-100 dark:bg-neutral-800"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-neutral-900 dark:bg-orange-500 text-white rounded-lg py-2 font-medium hover:bg-neutral-700 dark:hover:bg-orange-600 transition-colors"
            >
              Log In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;