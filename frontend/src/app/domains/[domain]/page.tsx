'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Globe, TrendingUp, Clock, AlertTriangle, CheckCircle, XCircle, Database } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import AppLayout from '@/components/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

interface DomainDetail {
  domain: string;
  hours: number;
  summary: {
    totalRequests: number;
    totalBytes: number;
    hitRate: number;
    errors: number;
    avgResponseTime: number;
  };
  subdomains: Array<{
    subdomain: string;
    requests: number;
    bytes: number;
    hitRate: number;
    errors: number;
  }>;
  contentTypes: Array<{
    type: string;
    requests: number;
    bytes: number;
    hitRate: number;
  }>;
  hourlyStats: Array<{
    timestamp: string;
    requests: number;
    bytes: number;
    hitRate: number;
  }>;
}

function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || isNaN(bytes) || bytes < 0) return '0 B';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i < 0 || i >= sizes.length || isNaN(i)) return '0 B';
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function DomainDetailContent() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuth();
  const domain = decodeURIComponent(params.domain as string);
  
  const [data, setData] = useState<DomainDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(24);

  useEffect(() => {
    if (!token) {
      return;
    }

    const fetchDomainDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/api/domains/${encodeURIComponent(domain)}?hours=${timeRange}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error('Failed to fetch domain details');
        }

        const result = await res.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchDomainDetails();
  }, [token, domain, timeRange]);

  const hitRateColor = (rate: number): string => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <AppLayout>
      {/* Domain Header */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <button
            onClick={() => router.push('/domains')}
            className="mr-4 p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Globe className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{domain}</h1>
              <p className="text-sm text-gray-500">Domain Analytics</p>
            </div>
          </div>
          
          <div className="ml-auto flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(parseInt(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value={1}>Last 1 hour</option>
              <option value={6}>Last 6 hours</option>
              <option value={24}>Last 24 hours</option>
              <option value={168}>Last 7 days</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center text-red-800">
            <AlertTriangle className="w-5 h-5 mr-2" />
            {error}
          </div>
        </div>
      ) : data ? (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Requests</p>
                    <p className="text-2xl font-bold text-gray-900">{formatNumber(data.summary.totalRequests)}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Bandwidth</p>
                    <p className="text-2xl font-bold text-gray-900">{formatBytes(data.summary.totalBytes)}</p>
                  </div>
                  <Database className="w-8 h-8 text-purple-500" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Cache Hit Rate</p>
                    <p className={`text-2xl font-bold ${hitRateColor(data.summary.hitRate)}`}>
                      {data.summary.hitRate}%
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Errors</p>
                    <p className="text-2xl font-bold text-gray-900">{data.summary.errors}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Avg Response</p>
                    <p className="text-2xl font-bold text-gray-900">{data.summary.avgResponseTime}ms</p>
                  </div>
                  <Clock className="w-8 h-8 text-orange-500" />
                </div>
              </div>
            </div>

            {/* Subdomains Table */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 py-3 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Subdomains</h2>
                <p className="text-sm text-gray-500">Traffic breakdown by subdomain</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subdomain
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requests
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bandwidth
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hit Rate
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Errors
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data.subdomains.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          No subdomains found
                        </td>
                      </tr>
                    ) : (
                      data.subdomains.map((sub) => (
                        <tr key={sub.subdomain} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {sub.subdomain}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {formatNumber(sub.requests)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {formatBytes(sub.bytes)}
                          </td>
                          <td className={`px-4 py-3 text-sm font-medium ${hitRateColor(sub.hitRate)}`}>
                            {sub.hitRate}%
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {sub.errors > 0 ? (
                              <span className="text-red-600 font-medium">{sub.errors}</span>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Content Types */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 py-3 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Content Types</h2>
                <p className="text-sm text-gray-500">Traffic breakdown by content type</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requests
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bandwidth
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hit Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data.contentTypes.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                          No content types found
                        </td>
                      </tr>
                    ) : (
                      data.contentTypes.map((ct) => (
                        <tr key={ct.type} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 capitalize">
                            {ct.type === '-' ? 'Unknown' : ct.type}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {formatNumber(ct.requests)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {formatBytes(ct.bytes)}
                          </td>
                          <td className={`px-4 py-3 text-sm font-medium ${hitRateColor(ct.hitRate)}`}>
                            {ct.hitRate}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
    </AppLayout>
  );
}

export default function DomainDetailPage() {
  return (
    <ProtectedRoute>
      <DomainDetailContent />
    </ProtectedRoute>
  );
}
