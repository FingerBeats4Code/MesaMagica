import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const adminRole = localStorage.getItem('adminRole');
  const adminUsername = localStorage.getItem('adminUsername');
  const tenantSlug = localStorage.getItem('adminTenant') || 'MesaMagica';

  const handleLogout = () => {
    console.log(`[${new Date().toISOString()}] Logging out admin user`);
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('adminUsername');
    localStorage.removeItem('adminTenant');
    navigate('/login', { replace: true });
  };

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: '📊' },
    { path: '/admin/orders', label: 'Orders', icon: '🛒' },
    { path: '/admin/tables', label: 'Tables', icon: '🪑' },
    ...(adminRole === 'admin' ? [{ path: '/admin/staff', label: 'Staff', icon: '👥' }] : []),
  ];

  return (
    <div className="bg-white dark:bg-neutral-950 text-gray-800 dark:text-neutral-100 min-h-screen">
      {/* Header */}
      <header className="bg-white/70 dark:bg-neutral-900/50 border-b border-zinc-300/70 dark:border-white/20 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                <span className="text-white text-xl font-bold">🍕</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">{tenantSlug} Admin</h1>
                <p className="text-xs text-gray-600 dark:text-neutral-400">
                  {adminUsername} • {adminRole}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Sidebar Navigation */}
          <aside className="col-span-12 lg:col-span-3">
            <nav className="sticky top-24 bg-white/50 dark:bg-neutral-900/30 rounded-xl border border-zinc-300/70 dark:border-white/20 p-4">
              <ul className="space-y-2">
                {navItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                        isActive(item.path)
                          ? 'bg-neutral-900 dark:bg-orange-500 text-white'
                          : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-gray-700 dark:text-neutral-300'
                      }`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="col-span-12 lg:col-span-9">
            <div className="bg-white/50 dark:bg-neutral-900/30 rounded-xl border border-zinc-300/70 dark:border-white/20 p-6 min-h-[600px]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;