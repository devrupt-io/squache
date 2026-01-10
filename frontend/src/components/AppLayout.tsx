'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import {
  Database,
  LogOut,
  BarChart2,
  List,
  Settings,
  Server,
  RefreshCw,
  Globe,
} from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}

const tabs = [
  { id: 'dashboard', path: '/', label: 'Dashboard', icon: BarChart2 },
  { id: 'domains', path: '/domains', label: 'Domains', icon: Globe },
  { id: 'logs', path: '/logs', label: 'Logs', icon: List },
  { id: 'upstreams', path: '/upstreams', label: 'Upstreams', icon: Server },
  { id: 'settings', path: '/settings', label: 'Settings', icon: Settings },
];

export default function AppLayout({ children, onRefresh, refreshing = false }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Determine active tab from pathname
  const getActiveTab = () => {
    if (pathname === '/') return 'dashboard';
    const tab = tabs.find(t => t.path !== '/' && pathname.startsWith(t.path));
    return tab?.id || 'dashboard';
  };

  const activeTab = getActiveTab();

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div 
              className="flex items-center space-x-3 cursor-pointer"
              onClick={() => router.push('/')}
            >
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                <Database className="w-6 h-6 text-primary-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Squache</h1>
            </div>

            <div className="flex items-center space-x-4">
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  disabled={refreshing}
                >
                  <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              )}
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={logout}
                className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex space-x-4 -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleNavigation(tab.path)}
                  className={`flex items-center space-x-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
