'use client';

import React from 'react';
import { Activity, HardDrive, Zap, TrendingUp } from 'lucide-react';

interface StatsCardsProps {
  stats: {
    totalRequests: number;
    cacheHits: number;
    cacheMisses: number;
    hitRate: number;
    bytesSent: number;
    bytesFromCache: number;
    bandwidthSaved: number;
    avgResponseTime: number;
  } | null;
  loading: boolean;
}

function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || isNaN(bytes) || bytes < 0) return '0 B';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i < 0 || i >= sizes.length || isNaN(i)) return '0 B';
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function StatsCards({ stats, loading }: StatsCardsProps) {
  const cards = [
    {
      title: 'Total Requests',
      value: stats?.totalRequests?.toLocaleString() || '0',
      subtitle: 'Last 24 hours',
      icon: Activity,
      color: 'blue',
    },
    {
      title: 'Cache Hit Rate',
      value: `${stats?.hitRate || 0}%`,
      subtitle: `${(stats?.cacheHits || 0).toLocaleString()} hits / ${(stats?.cacheMisses || 0).toLocaleString()} misses`,
      icon: Zap,
      color: 'green',
    },
    {
      title: 'Bandwidth Saved',
      value: formatBytes(stats?.bytesFromCache || 0),
      subtitle: `${stats?.bandwidthSaved || 0}% of total`,
      icon: TrendingUp,
      color: 'purple',
    },
    {
      title: 'Total Bandwidth',
      value: formatBytes(stats?.bytesSent || 0),
      subtitle: `Avg response: ${stats?.avgResponseTime || 0}ms`,
      icon: HardDrive,
      color: 'orange',
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string; icon: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'text-blue-500' },
    green: { bg: 'bg-green-50', text: 'text-green-600', icon: 'text-green-500' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', icon: 'text-purple-500' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', icon: 'text-orange-500' },
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const colors = colorClasses[card.color];
        return (
          <div key={card.title} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-600">{card.title}</span>
              <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${colors.icon}`} />
              </div>
            </div>
            <div className={`text-2xl font-bold ${colors.text} mb-1`}>{card.value}</div>
            <div className="text-xs text-gray-500">{card.subtitle}</div>
          </div>
        );
      })}
    </div>
  );
}
