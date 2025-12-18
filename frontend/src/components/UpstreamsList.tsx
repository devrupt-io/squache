'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Server, Globe, MapPin, ExternalLink } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

interface UpstreamsListProps {
  token: string | null;
  isAdmin: boolean;
}

interface Upstream {
  id: number;
  name: string;
  type: 'vpn' | 'residential' | 'datacenter';
  host: string | null;
  port: number | null;
  provider: string | null;
  countryFilter: string | null;
  cityFilter: string | null;
  country: string | null;
  city: string | null;
  enabled: boolean;
  priority: number;
}

// Map country codes to names
const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  CA: 'Canada',
  AU: 'Australia',
  JP: 'Japan',
  SG: 'Singapore',
  NL: 'Netherlands',
  CH: 'Switzerland',
  SE: 'Sweden',
  BR: 'Brazil',
  IN: 'India',
  KR: 'South Korea',
};

export default function UpstreamsList({ token, isAdmin }: UpstreamsListProps) {
  const router = useRouter();
  const [upstreams, setUpstreams] = useState<Upstream[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUpstreams = async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/upstreams`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUpstreams(data);
      }
    } catch (error) {
      console.error('Failed to fetch upstreams:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpstreams();
  }, [token]);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this upstream proxy?')) return;

    try {
      const res = await fetch(`${API_URL}/api/upstreams/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        fetchUpstreams();
      }
    } catch (error) {
      console.error('Failed to delete upstream:', error);
    }
  };

  const typeColors: Record<string, string> = {
    vpn: 'bg-blue-100 text-blue-800',
    residential: 'bg-green-100 text-green-800',
    datacenter: 'bg-purple-100 text-purple-800',
  };

  const getLocationDisplay = (upstream: Upstream): string | null => {
    const country = upstream.countryFilter || upstream.country;
    const city = upstream.cityFilter || upstream.city;
    
    if (!country && !city) return null;
    
    const countryName = country ? (COUNTRY_NAMES[country] || country) : '';
    if (city && countryName) {
      return `${city}, ${countryName}`;
    }
    return countryName || city || null;
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Upstream Proxies</h2>
        {isAdmin && (
          <button
            onClick={() => router.push('/upstreams/add')}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Proxy</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading...</div>
      ) : upstreams.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <Server className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No upstream proxies configured</p>
          <p className="text-sm mt-1">Add VPN or residential proxies to route traffic</p>
          {isAdmin && (
            <button
              onClick={() => router.push('/upstreams/add')}
              className="mt-4 inline-flex items-center px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Proxy
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y">
          {upstreams.map((upstream) => {
            const location = getLocationDisplay(upstream);
            
            return (
              <div key={upstream.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      upstream.enabled ? 'bg-green-100' : 'bg-gray-100'
                    }`}
                  >
                    <Server
                      className={`w-5 h-5 ${upstream.enabled ? 'text-green-600' : 'text-gray-400'}`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{upstream.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          typeColors[upstream.type]
                        }`}
                      >
                        {upstream.type}
                      </span>
                      {upstream.provider && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {upstream.provider}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center space-x-3 mt-0.5">
                      {upstream.host && upstream.port && (
                        <span className="font-mono text-xs">
                          {upstream.host}:{upstream.port}
                        </span>
                      )}
                      {location && (
                        <span className="flex items-center space-x-1">
                          <Globe className="w-3 h-3" />
                          <span>{location}</span>
                        </span>
                      )}
                      {upstream.priority > 0 && (
                        <span className="text-xs text-gray-400">
                          Priority: {upstream.priority}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(upstream.id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
