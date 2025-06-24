import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Package,
  Tag,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  User,
  ChevronDown,
  MapPin,
  DollarSign
} from 'lucide-react';
import BackButton from '../BackButton';

interface AdminLayoutProps {
  children?: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isAdmin } = useAuth();
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

  if (!isAdmin) {
    return null; // Don't render anything while redirecting
  }

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
    { name: 'Products', href: '/admin/products', icon: Package },
    { name: 'Categories', href: '/admin/categories', icon: Tag },
    { name: 'Subcategories', href: '/admin/subcategories', icon: Tag },
    { name: 'Delivery Locations', href: '/admin/delivery-locations', icon: MapPin },
    { name: 'Delivery Costs', href: '/admin/delivery-costs', icon: DollarSign },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { name: 'Users', href: '/admin/users', icon: Users },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  const getPageInfo = () => {
    const currentPage = navigation.find((item) => item.href === location.pathname);
    const descriptions: Record<string, string> = {
      '/admin': 'Overview of your store\'s performance and key metrics',
      '/admin/products': 'Manage your product catalog, inventory, and pricing',
      '/admin/categories': 'Organize your products with categories and subcategories',
      '/admin/subcategories': 'Create and manage subcategories for better product organization',
      '/admin/orders': 'Track and manage customer orders and fulfillment',
      '/admin/analytics': 'Detailed insights and reports about your store\'s performance',
      '/admin/users': 'Manage user accounts, roles, and permissions',
      '/admin/delivery-locations': 'Manage delivery counties and regions for order fulfillment',
      '/admin/delivery-costs': 'Set and manage delivery costs for regions with paid delivery'
    };

    return {
      title: currentPage?.name || 'Admin Panel',
      description: descriptions[location.pathname] || 'Manage your online store'
    };
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-slate-800/95 backdrop-blur-sm border-r border-slate-700/50">
          <div className="flex h-16 items-center justify-between px-4 border-b border-slate-700/50">
            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Admin Panel</h2>
            <button
              type="button"
              className="text-slate-400 hover:text-white transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-3 py-2.5 text-base font-medium rounded-lg transition-colors ${
                    location.pathname === item.href
                      ? 'bg-slate-700/50 text-white'
                      : 'text-slate-300 hover:bg-slate-700/30 hover:text-white'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 ${
                    location.pathname === item.href
                      ? 'text-blue-400'
                      : 'text-slate-400 group-hover:text-blue-400'
                  }`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-slate-700/50 p-4">
            {/* Profile Section */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700/30 hover:text-white rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <User className="mr-3 h-5 w-5 text-slate-400" />
                  <span className="truncate">{user?.email}</span>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>
              {showProfileMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-full bg-slate-800 rounded-lg shadow-lg border border-slate-700/50 overflow-hidden">
                  <Link
                    to="/profile"
                    className="flex items-center px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700/30 hover:text-white transition-colors"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <Settings className="mr-3 h-5 w-5 text-slate-400" />
                    Edit Profile
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setShowProfileMenu(false);
                    }}
                    className="flex w-full items-center px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700/30 hover:text-white transition-colors"
                  >
                    <LogOut className="mr-3 h-5 w-5 text-slate-400" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-slate-800/95 backdrop-blur-sm border-r border-slate-700/50">
          <div className="flex h-16 items-center justify-center px-4 border-b border-slate-700/50">
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Admin Panel</h2>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-3 py-2.5 text-base font-medium rounded-lg transition-colors ${
                    location.pathname === item.href
                      ? 'bg-slate-700/50 text-white'
                      : 'text-slate-300 hover:bg-slate-700/30 hover:text-white'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 ${
                    location.pathname === item.href
                      ? 'text-blue-400'
                      : 'text-slate-400 group-hover:text-blue-400'
                  }`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-slate-700/50 p-4">
            {/* Profile Section */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700/30 hover:text-white rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <User className="mr-3 h-5 w-5 text-slate-400" />
                  <span className="truncate">{user?.email}</span>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>
              {showProfileMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-full bg-slate-800 rounded-lg shadow-lg border border-slate-700/50 overflow-hidden">
                  <Link
                    to="/profile"
                    className="flex items-center px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700/30 hover:text-white transition-colors"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <Settings className="mr-3 h-5 w-5 text-slate-400" />
                    Edit Profile
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setShowProfileMenu(false);
                    }}
                    className="flex w-full items-center px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700/30 hover:text-white transition-colors"
                  >
                    <LogOut className="mr-3 h-5 w-5 text-slate-400" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/50 lg:hidden">
          <button
            type="button"
            className="px-4 text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Page Header */}
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl" />
              <div className="relative flex flex-col md:flex-row md:items-center md:justify-between p-6">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-2">{getPageInfo().title}</h1>
                  <p className="text-slate-300">{getPageInfo().description}</p>
                </div>
                <div className="mt-4 md:mt-0">
                  <BackButton text="Back to Store" onClick={() => navigate('/')} />
                </div>
              </div>
            </div>

            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout; 