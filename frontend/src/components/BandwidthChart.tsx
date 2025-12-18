'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

interface BandwidthChartProps {
  token: string | null;
}

type TimeRange = '5m' | '30m' | '1h' | '6h' | '24h' | 'today';

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '5m', label: 'Last 5 min' },
  { value: '30m', label: 'Last 30 min' },
  { value: '1h', label: 'Last hour' },
  { value: '6h', label: 'Last 6 hours' },
  { value: '24h', label: 'Last 24 hours' },
  { value: 'today', label: 'Today' },
];

function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || isNaN(bytes) || bytes < 0) return '0 B';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i < 0 || i >= sizes.length || isNaN(i)) return '0 B';
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatTimeLabel(timestamp: string, range: TimeRange): string {
  const date = new Date(timestamp);
  
  switch (range) {
    case '5m':
    case '30m':
    case '1h':
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    case '6h':
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    case '24h':
    case 'today':
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    default:
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

export default function BandwidthChart({ token }: BandwidthChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<TimeRange>('1h');
  const [bucketMinutes, setBucketMinutes] = useState<number>(5);

  const fetchData = useCallback(async () => {
    if (!token) return;
    
    try {
      const res = await fetch(`${API_URL}/api/stats/bandwidth?range=${range}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const result = await res.json();
        setBucketMinutes(result.bucketMinutes || 5);
        
        // Format data for chart
        const formatted = (result.data || []).map((item: any) => ({
          time: formatTimeLabel(item.timestamp, range),
          timestamp: item.timestamp,
          total: item.bytesSent,
          cached: item.bytesFromCache,
          requests: item.requests,
        }));
        setData(formatted);
      }
    } catch (error) {
      console.error('Failed to fetch bandwidth data:', error);
    } finally {
      setLoading(false);
    }
  }, [token, range]);

  useEffect(() => {
    setLoading(true);
    fetchData();
    
    // Refresh interval based on range
    const refreshInterval = range === '5m' ? 10000 : range === '30m' ? 30000 : 60000;
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, range]);

  const getBucketLabel = (): string => {
    if (bucketMinutes >= 60) {
      return `${bucketMinutes / 60}-hour`;
    }
    return `${bucketMinutes}-minute`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-4 bg-gray-200 rounded w-48 mb-6 animate-pulse"></div>
        <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Bandwidth Usage</h2>
          <p className="text-sm text-gray-500">{getBucketLabel()} intervals</p>
        </div>
        <div className="flex gap-1">
          {TIME_RANGES.map((tr) => (
            <button
              key={tr.value}
              onClick={() => setRange(tr.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                range === tr.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tr.label}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-500">
          No bandwidth data available yet
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="10%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 11 }} 
                stroke="#9ca3af"
                interval="preserveStartEnd"
              />
              <YAxis tickFormatter={formatBytes} tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatBytes(value),
                  name === 'total' ? 'Total Bandwidth' : 'From Cache',
                ]}
                labelFormatter={(label) => `Time: ${label}`}
                labelStyle={{ color: '#374151' }}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar
                dataKey="total"
                fill="#3b82f6"
                name="Total Bandwidth"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="cached"
                fill="#22c55e"
                name="From Cache"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
