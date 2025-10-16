import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getActiveOrders } from "@/api/api";

const AdminDashboard: React.FC = () => {
  const role = localStorage.getItem('adminRole');
  const username = localStorage.getItem('adminUsername');
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    preparedOrders: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const orders = await getActiveOrders();
        const totalOrders = orders.length;
        const pendingOrders = orders.filter(o => o.status === 'pending').length;
        const preparedOrders = orders.filter(o => o.status === 'prepared').length;
        const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);

        setStats({
          totalOrders,
          pendingOrders,
          preparedOrders,
          totalRevenue,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      label: 'Total Orders',
      value: stats.totalOrders,
      icon: '📦',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      label: 'Pending Orders',
      value: stats.pendingOrders,
      icon: '⏳',
      color: 'from-orange-500 to-red-500',
    },
    {
      label: 'Prepared Orders',
      value: stats.preparedOrders,
      icon: '✅',
      color: 'from-green-500 to-emerald-500',
    },
    {
      label: 'Total Revenue',
      value: `$${stats.totalRevenue.toFixed(2)}`,
      icon: '💰',
      color: 'from-purple-500 to-pink-500',
    },
  ];

  const quickActions = [
    {
      title: 'Manage Orders',
      description: 'View and update order statuses',
      icon: '🛒',
      link: '/admin/orders',
      color: 'bg-blue-500',
    },
    {
      title: 'Table Management',
      description: 'Create tables and generate QR codes',
      icon: '🪑',
      link: '/admin/tables',
      color: 'bg-green-500',
    },
    ...(role === 'admin' ? [{
      title: 'Staff Management',
      description: 'Add and manage staff members',
      icon: '👥',
      link: '/admin/staff',
      color: 'bg-purple-500',
    }] : []),
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {username}!</h1>
        <p className="text-gray-600 dark:text-neutral-400">
          Here's what's happening with your restaurant today.
        </p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((stat, index) => (
              <div
                key={index}
                className="bg-white dark:bg-neutral-900 rounded-xl border border-zinc-300/70 dark:border-white/20 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center text-2xl`}>
                    {stat.icon}
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-neutral-400 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quickActions.map((action, index) => (
                <Link
                  key={index}
                  to={action.link}
                  className="bg-white dark:bg-neutral-900 rounded-xl border border-zinc-300/70 dark:border-white/20 p-6 hover:shadow-lg transition-all hover:scale-105"
                >
                  <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center text-2xl mb-4`}>
                    {action.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{action.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-neutral-400">
                    {action.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;