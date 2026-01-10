'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import AppLayout from '@/components/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import StatsCards from '@/components/StatsCards';
import BandwidthChart from '@/components/BandwidthChart';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

function DashboardContent() {
  const { token } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  return (
    <AppLayout onRefresh={handleRefresh} refreshing={refreshing}>
      <div className="space-y-8">
        <StatsCards stats={stats} loading={loading} />
        <BandwidthChart token={token} />
      </div>
    </AppLayout>
  );
}

export default function Home() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
