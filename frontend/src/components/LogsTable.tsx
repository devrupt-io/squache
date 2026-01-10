'use client';

import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, CheckCircle, XCircle, MinusCircle, AlertTriangle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

interface LogsTableProps {
  token: string | null;
}

interface LogEntry {
  id: number;
  timestamp: string;
  clientIp: string;
  method: string;
  url: string;
  httpStatus: number;
  bytesSent: number;
  cacheStatus: string;
  responseTime: number;
}

function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || isNaN(bytes) || bytes < 0) return '0 B';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i < 0 || i >= sizes.length || isNaN(i)) return '0 B';
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const time = new Date(timestamp).getTime();
  const diffMs = now - time;
  
  if (diffMs < 0) return 'now';
  
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatSmartUrl(url: string, method: string, maxLength: number = 50): { display: string; isSpecial: boolean; tooltip: string } {
  // Handle CONNECT requests (TLS tunnel establishment)
  if (method === 'CONNECT') {
    // url is like "example.com:443"
    const host = url.split(':')[0];
    return {
      display: host,
      isSpecial: false,
      tooltip: `TLS tunnel to ${url}`,
    };
  }

  // Handle error entries from Squid
  if (url.startsWith('error:')) {
    const errorType = url.replace('error:', '').replace(/-/g, ' ');
    return {
      display: errorType,
      isSpecial: true,
      tooltip: `Squid error: ${errorType}`,
    };
  }

  try {
    // Try to parse as URL
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      // If not a valid URL, just truncate
      const display = url.length <= maxLength ? url : url.substring(0, maxLength - 3) + '...';
      return { display, isSpecial: false, tooltip: url };
    }
    
    const hostname = parsed.hostname;
    const pathname = parsed.pathname;
    const search = parsed.search;
    
    // Always show hostname
    let display = hostname;
    
    // Get the filename (last segment) if it looks like a file
    const pathParts = pathname.split('/').filter(Boolean);
    const lastSegment = pathParts[pathParts.length - 1] || '';
    const hasFileExtension = /\.[a-zA-Z0-9]{1,10}$/.test(lastSegment);
    
    // Calculate remaining space after hostname
    const remainingSpace = maxLength - hostname.length - 1; // -1 for the /
    
    if (pathname === '/' || pathname === '') {
      // Just the domain
      return { display, isSpecial: false, tooltip: url };
    }
    
    const fullPath = pathname + search;
    
    if (fullPath.length <= remainingSpace) {
      // Path fits entirely
      return { display: display + fullPath, isSpecial: false, tooltip: url };
    }
    
    if (hasFileExtension && lastSegment.length < remainingSpace - 4) {
      // Show domain + ... + filename
      const availableForPath = remainingSpace - lastSegment.length - 4; // 4 for /...
      if (availableForPath > 0 && pathParts.length > 1) {
        const startPath = '/' + pathParts[0].substring(0, Math.min(pathParts[0].length, availableForPath));
        return { display: display + startPath + '/.../' + lastSegment, isSpecial: false, tooltip: url };
      }
      return { display: display + '/.../' + lastSegment, isSpecial: false, tooltip: url };
    }
    
    // Just truncate the path with ellipsis in the middle
    const halfLength = Math.floor((remainingSpace - 3) / 2);
    if (halfLength > 0) {
      const truncated = display + fullPath.substring(0, halfLength) + '...' + fullPath.substring(fullPath.length - halfLength);
      return { display: truncated, isSpecial: false, tooltip: url };
    }
    
    return { display: display + '/...', isSpecial: false, tooltip: url };
  } catch {
    // Fallback: simple truncation
    const display = url.length <= maxLength ? url : url.substring(0, maxLength - 3) + '...';
    return { display, isSpecial: false, tooltip: url };
  }
}

// Format method for display
function formatMethod(method: string): { display: string; color: string; icon?: 'connect' | 'error' } {
  if (method === 'CONNECT') {
    return { display: 'CONNECT', color: 'text-blue-600', icon: 'connect' };
  }
  if (method === '-' || method === '') {
    return { display: 'ERROR', color: 'text-red-600', icon: 'error' };
  }
  return { display: method, color: 'text-gray-900' };
}

export default function LogsTable({ token }: LogsTableProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [searchUrl, setSearchUrl] = useState('');
  const limit = 50;

  const fetchLogs = async () => {
    if (!token) return;

    setLoading(true);
    try {
      let url = `${API_URL}/api/logs?limit=${limit}&offset=${offset}`;
      if (searchUrl) {
        url = `${API_URL}/api/logs/search?url=${encodeURIComponent(searchUrl)}&limit=${limit}&offset=${offset}`;
      }

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token, offset, searchUrl]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    fetchLogs();
  };

  const cacheStatusColor = (status: string): string => {
    if (status.includes('HIT')) return 'bg-green-100 text-green-800';
    if (status.includes('MISS')) return 'bg-yellow-100 text-yellow-800';
    if (status.includes('DENIED')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const httpStatusColor = (status: number): string => {
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 300 && status < 400) return 'text-blue-600';
    if (status >= 400 && status < 500) return 'text-yellow-600';
    if (status >= 500) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <form onSubmit={handleSearch} className="flex space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchUrl}
              onChange={(e) => setSearchUrl(e.target.value)}
              placeholder="Search by URL..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Age
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Method
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                URL
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cache
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Size
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No logs found
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const urlInfo = formatSmartUrl(log.url, log.method);
                const methodInfo = formatMethod(log.method);
                return (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td 
                    className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap cursor-help"
                    title={new Date(log.timestamp).toLocaleString()}
                  >
                    {formatRelativeTime(log.timestamp)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`font-medium ${methodInfo.color} flex items-center`}>
                      {methodInfo.display}
                    </span>
                  </td>
                  <td 
                    className={`px-4 py-3 text-sm font-mono cursor-help ${urlInfo.isSpecial ? 'text-red-600 italic' : 'text-gray-600'}`} 
                    title={urlInfo.tooltip}
                  >
                    {urlInfo.display}
                  </td>
                  <td className={`px-4 py-3 text-sm font-medium ${httpStatusColor(log.httpStatus)}`}>
                    {log.httpStatus}
                  </td>
                  <td className="px-4 py-3 text-sm" title={log.cacheStatus}>
                    {log.cacheStatus.includes('HIT') ? (
                      <CheckCircle className="w-5 h-5 text-green-500 cursor-help" />
                    ) : log.cacheStatus.includes('DENIED') ? (
                      <MinusCircle className="w-5 h-5 text-red-500 cursor-help" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-400 cursor-help" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatBytes(log.bytesSent)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{log.responseTime}ms</td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">{log.clientIp}</td>
                </tr>
              );})
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-4 py-3 border-t flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} entries
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
            className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
