'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from './AuthProvider';
import {
  Database,
  Activity,
  HardDrive,
  Zap,
  LogOut,
  BarChart2,
  List,
  Settings,
  Server,
  RefreshCw,
} from 'lucide-react';
import StatsCards from './StatsCards';
import BandwidthChart from './BandwidthChart';
import LogsTable from './LogsTable';
import UpstreamsList from './UpstreamsList';
import SettingsPanel from './SettingsPanel';

type Tab = 'dashboard' | 'logs' | 'upstreams' | 'settings';

const VALID_TABS: Tab[] = ['dashboard', 'logs', 'upstreams', 'settings'];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

export default function Dashboard() {
  const { user, token, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Get initial tab from URL or default to 'dashboard'
  const getInitialTab = (): Tab => {
    const tabParam = searchParams.get('tab');
    if (tabParam && VALID_TABS.includes(tabParam as Tab)) {
      return tabParam as Tab;
    }
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Update URL when tab changes
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'dashboard') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newUrl, { scroll: false });
  };

  // Sync state with URL on browser back/forward
  useEffect(() => {
    const tab = getInitialTab();
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const fetchStats = async () => {
    if (!token) return;
    
    try {
      const res = await fetch(`${API_URL}/api/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
    { id: 'logs', label: 'Logs', icon: List },
    { id: 'upstreams', label: 'Upstreams', icon: Server },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                <Database className="w-6 h-6 text-primary-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Squache</h1>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                disabled={refreshing}
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
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
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as Tab)}
                  className={`flex items-center space-x-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
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
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <StatsCards stats={stats} loading={loading} />
            <BandwidthChart token={token} />
          </div>
        )}

        {activeTab === 'logs' && <LogsTable token={token} />}

        {activeTab === 'upstreams' && <UpstreamsList token={token} isAdmin={user?.role === 'admin'} />}

        {activeTab === 'settings' && <SettingsPanel token={token} isAdmin={user?.role === 'admin'} />}
      </main>
    </div>
  );
}
