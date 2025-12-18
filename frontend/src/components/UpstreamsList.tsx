'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Server, Globe, MapPin } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

interface UpstreamsListProps {
  token: string | null;
  isAdmin: boolean;
}

interface Upstream {
  id: number;
  name: string;
  type: 'vpn' | 'residential' | 'datacenter';
  host: string;
  port: number;
  country: string | null;
  city: string | null;
  provider: string | null;
  enabled: boolean;
  priority: number;
}

export default function UpstreamsList({ token, isAdmin }: UpstreamsListProps) {
  const [upstreams, setUpstreams] = useState<Upstream[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'vpn' as const,
    host: '',
    port: 1080,
    username: '',
    password: '',
    country: '',
    city: '',
    provider: '',
    priority: 0,
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch(`${API_URL}/api/upstreams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowAddForm(false);
        setFormData({
          name: '',
          type: 'vpn',
          host: '',
          port: 1080,
          username: '',
          password: '',
          country: '',
          city: '',
          provider: '',
          priority: 0,
        });
        fetchUpstreams();
      }
    } catch (error) {
      console.error('Failed to add upstream:', error);
    }
  };

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

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Upstream Proxies</h2>
        {isAdmin && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Proxy</span>
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="p-4 bg-gray-50 border-b">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="pia-us-east"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="vpn">VPN</option>
                <option value="residential">Residential</option>
                <option value="datacenter">Datacenter</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
              <input
                type="text"
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="proxy.example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
              <input
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country (ISO)</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="US"
                maxLength={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="New York"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
              <input
                type="text"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="PIA"
              />
            </div>
          </div>
          <div className="mt-4 flex space-x-2">
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              Add Upstream
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading...</div>
      ) : upstreams.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <Server className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No upstream proxies configured</p>
          <p className="text-sm">Add VPN or residential proxies to route traffic</p>
        </div>
      ) : (
        <div className="divide-y">
          {upstreams.map((upstream) => (
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
                  </div>
                  <div className="text-sm text-gray-500 flex items-center space-x-3">
                    <span>
                      {upstream.host}:{upstream.port}
                    </span>
                    {upstream.country && (
                      <span className="flex items-center space-x-1">
                        <Globe className="w-3 h-3" />
                        <span>{upstream.country}</span>
                      </span>
                    )}
                    {upstream.city && (
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span>{upstream.city}</span>
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
          ))}
        </div>
      )}
    </div>
  );
}
