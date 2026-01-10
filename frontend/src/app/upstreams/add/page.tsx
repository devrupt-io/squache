'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Server, Globe, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import AppLayout from '@/components/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

interface ParsedUrl {
  host: string;
  port: number;
  username?: string;
  password?: string;
  protocol?: string;
  detectedProvider: string | null;
  providerName: string | null;
  providerType: string | null;
  supportsLocations: boolean;
}

interface Provider {
  id: string;
  name: string;
  type: string;
  supportsLocations: boolean;
}

// Common country options
const COUNTRIES = [
  { code: '', label: 'Any location' },
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'CA', label: 'Canada' },
  { code: 'AU', label: 'Australia' },
  { code: 'JP', label: 'Japan' },
  { code: 'SG', label: 'Singapore' },
  { code: 'NL', label: 'Netherlands' },
  { code: 'CH', label: 'Switzerland' },
  { code: 'SE', label: 'Sweden' },
  { code: 'BR', label: 'Brazil' },
  { code: 'IN', label: 'India' },
  { code: 'KR', label: 'South Korea' },
];

function AddUpstreamContent() {
  const router = useRouter();
  const { token, user } = useAuth();
  
  const [proxyUrl, setProxyUrl] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'vpn' | 'residential' | 'datacenter'>('datacenter');
  const [countryFilter, setCountryFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [priority, setPriority] = useState(0);
  
  const [parsedUrl, setParsedUrl] = useState<ParsedUrl | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const [providers, setProviders] = useState<Provider[]>([]);

  // Check auth
  useEffect(() => {
    if (user && user?.role !== 'admin') {
      router.push('/upstreams');
    }
  }, [user, router]);

  // Fetch providers
  useEffect(() => {
    if (!token) return;
    
    fetch(`${API_URL}/api/upstreams/providers`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setProviders(data))
      .catch(err => console.error('Failed to fetch providers:', err));
  }, [token]);

  // Parse URL when it changes
  useEffect(() => {
    if (!proxyUrl.trim() || !token) {
      setParsedUrl(null);
      setParseError(null);
      return;
    }

    const timeout = setTimeout(async () => {
      setParsing(true);
      setParseError(null);
      
      try {
        const res = await fetch(`${API_URL}/api/upstreams/parse-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ url: proxyUrl }),
        });

        const data = await res.json();
        
        if (!res.ok) {
          setParseError(data.error || 'Invalid proxy URL');
          setParsedUrl(null);
        } else {
          setParsedUrl(data);
          // Auto-set type if detected
          if (data.providerType) {
            setType(data.providerType);
          }
          // Auto-generate name if empty
          if (!name && data.host) {
            const providerPrefix = data.detectedProvider || 'proxy';
            setName(`${providerPrefix}-${Date.now().toString(36)}`);
          }
        }
      } catch (err) {
        setParseError('Failed to parse URL');
        setParsedUrl(null);
      } finally {
        setParsing(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [proxyUrl, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!proxyUrl.trim() && !parsedUrl) {
      setSubmitError('Please enter a proxy URL');
      return;
    }
    
    if (!name.trim()) {
      setSubmitError('Please enter a name for this proxy');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`${API_URL}/api/upstreams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          proxyUrl: proxyUrl.trim(),
          type,
          countryFilter: countryFilter || null,
          cityFilter: cityFilter.trim() || null,
          priority,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || 'Failed to create proxy');
      } else {
        router.push('/upstreams');
      }
    } catch (err) {
      setSubmitError('Failed to create proxy');
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/upstreams')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Upstreams
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Add Upstream Proxy</h1>
          <p className="text-gray-600 mt-1">
            Add a new upstream proxy for routing traffic through VPN, residential, or datacenter proxies.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Proxy URL Input */}
          <div className="bg-white rounded-lg shadow p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proxy URL
            </label>
            <input
              type="text"
              value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)}
              placeholder="http://username:password@proxy.example.com:8080"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
            />
            <p className="mt-2 text-sm text-gray-500">
              Enter the proxy URL including credentials. Supported formats: http://user:pass@host:port, socks5://host:port, or just host:port
            </p>

            {/* Parsing status */}
            {parsing && (
              <div className="mt-3 flex items-center text-gray-500">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Parsing URL...
              </div>
            )}

            {parseError && (
              <div className="mt-3 flex items-center text-red-600">
                <AlertCircle className="w-4 h-4 mr-2" />
                {parseError}
              </div>
            )}

            {parsedUrl && !parseError && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center text-green-700 mb-2">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  <span className="font-medium">URL parsed successfully</span>
                </div>
                <div className="text-sm text-green-600 space-y-1">
                  <div>Host: <span className="font-mono">{parsedUrl.host}:{parsedUrl.port}</span></div>
                  {parsedUrl.username && <div>Username: <span className="font-mono">{parsedUrl.username}</span></div>}
                  {parsedUrl.providerName && (
                    <div className="flex items-center mt-2 pt-2 border-t border-green-200">
                      <Server className="w-4 h-4 mr-2" />
                      Detected provider: <span className="font-medium ml-1">{parsedUrl.providerName}</span>
                      {parsedUrl.supportsLocations && (
                        <span className="ml-2 text-xs px-2 py-0.5 bg-green-200 rounded-full">
                          Supports geo-targeting
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Name and Type */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-residential-proxy"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                A unique name to identify this proxy
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Proxy Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="datacenter">Datacenter</option>
                <option value="residential">Residential</option>
                <option value="vpn">VPN</option>
              </select>
            </div>
          </div>

          {/* Location Filters */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Globe className="w-5 h-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Location Filters</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Optionally restrict which locations this proxy can use. Useful for providers like Webshare or Bright Data that support geo-targeting.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <select
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City (optional)
                </label>
                <input
                  type="text"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  placeholder="e.g., New York"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  disabled={!countryFilter}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Leave empty to allow any city within the country
                </p>
              </div>
            </div>
          </div>

          {/* Priority */}
          <div className="bg-white rounded-lg shadow p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
              className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Higher priority proxies are preferred when multiple match the routing criteria
            </p>
          </div>

          {/* Error display */}
          {submitError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              {submitError}
            </div>
          )}

          {/* Submit buttons */}
          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={submitting || parsing || !!parseError}
              className="flex-1 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Upstream Proxy'
              )}
            </button>
            <button
              type="button"
              onClick={() => router.push('/upstreams')}
              className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
  );
}

function AddUpstreamPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <AddUpstreamContent />
      </AppLayout>
    </ProtectedRoute>
  );
}

export default AddUpstreamPage;
