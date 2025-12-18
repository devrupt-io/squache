'use client';

import React, { useState, useEffect } from 'react';
import {
  Save,
  RefreshCw,
  HardDrive,
  Cpu,
  Shield,
  Globe,
  Settings,
  AlertCircle,
  CheckCircle,
  Download,
  FileKey,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

interface SettingsPanelProps {
  token: string | null;
  isAdmin: boolean;
}

interface ConfigState {
  caching_enabled: boolean;
  max_object_size: number;
  cache_size: number;
  memory_cache_size: number;
  default_upstream: string;
  ssl_bump_enabled: boolean;
  aggressive_caching: boolean;
  log_retention_days: number;
}

// Default config values (in bytes for sizes)
const DEFAULT_CONFIG: ConfigState = {
  caching_enabled: true,
  max_object_size: 1073741824, // 1 GB
  cache_size: 10737418240, // 10 GB
  memory_cache_size: 536870912, // 512 MB
  default_upstream: 'direct',
  ssl_bump_enabled: true,
  aggressive_caching: true,
  log_retention_days: 30,
};

// Size units for conversion
const SIZE_UNITS = [
  { label: 'MB', multiplier: 1024 * 1024 },
  { label: 'GB', multiplier: 1024 * 1024 * 1024 },
];

function formatBytes(bytes: number): { value: number; unit: string } {
  if (bytes >= 1024 * 1024 * 1024) {
    return { value: Math.round(bytes / (1024 * 1024 * 1024)), unit: 'GB' };
  }
  return { value: Math.round(bytes / (1024 * 1024)), unit: 'MB' };
}

function parseToBytes(value: number, unit: string): number {
  const unitData = SIZE_UNITS.find((u) => u.label === unit);
  return value * (unitData?.multiplier || 1);
}

export default function SettingsPanel({ token, isAdmin }: SettingsPanelProps) {
  const [config, setConfig] = useState<ConfigState>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalConfig, setOriginalConfig] = useState<ConfigState>(DEFAULT_CONFIG);

  // SSL certificate state
  const [sslCertExists, setSslCertExists] = useState(false);
  const [sslDownloading, setSslDownloading] = useState(false);

  // Size input states with units
  const [maxObjectSizeValue, setMaxObjectSizeValue] = useState(1);
  const [maxObjectSizeUnit, setMaxObjectSizeUnit] = useState('GB');
  const [cacheSizeValue, setCacheSizeValue] = useState(10);
  const [cacheSizeUnit, setCacheSizeUnit] = useState('GB');
  const [memoryCacheSizeValue, setMemoryCacheSizeValue] = useState(512);
  const [memoryCacheSizeUnit, setMemoryCacheSizeUnit] = useState('MB');

  // Check SSL certificate status
  const checkSslStatus = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/config/ssl/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSslCertExists(data.exists);
      }
    } catch (error) {
      console.error('Failed to check SSL status:', error);
    }
  };

  // Download SSL certificate
  const handleDownloadCert = async () => {
    if (!token) return;
    setSslDownloading(true);
    try {
      const res = await fetch(`${API_URL}/api/config/ssl/certificate`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'squache-ca.crt';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.message || 'Failed to download certificate' });
      }
    } catch (error) {
      console.error('Failed to download certificate:', error);
      setMessage({ type: 'error', text: 'Failed to download certificate' });
    } finally {
      setSslDownloading(false);
    }
  };

  const fetchConfig = async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/config`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        const parsed: ConfigState = {
          caching_enabled: data.caching_enabled === 'true',
          max_object_size: parseInt(data.max_object_size) || DEFAULT_CONFIG.max_object_size,
          cache_size: parseInt(data.cache_size) || DEFAULT_CONFIG.cache_size,
          memory_cache_size: parseInt(data.memory_cache_size) || DEFAULT_CONFIG.memory_cache_size,
          default_upstream: data.default_upstream || DEFAULT_CONFIG.default_upstream,
          ssl_bump_enabled: data.ssl_bump_enabled !== 'false',
          aggressive_caching: data.aggressive_caching !== 'false',
          log_retention_days: parseInt(data.log_retention_days) || DEFAULT_CONFIG.log_retention_days,
        };
        setConfig(parsed);
        setOriginalConfig(parsed);

        // Set size values with units
        const maxObj = formatBytes(parsed.max_object_size);
        setMaxObjectSizeValue(maxObj.value);
        setMaxObjectSizeUnit(maxObj.unit);

        const cacheSize = formatBytes(parsed.cache_size);
        setCacheSizeValue(cacheSize.value);
        setCacheSizeUnit(cacheSize.unit);

        const memCache = formatBytes(parsed.memory_cache_size);
        setMemoryCacheSizeValue(memCache.value);
        setMemoryCacheSizeUnit(memCache.unit);
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    checkSslStatus();
  }, [token]);

  // Update config when size values change
  useEffect(() => {
    const newMaxObjectSize = parseToBytes(maxObjectSizeValue, maxObjectSizeUnit);
    const newCacheSize = parseToBytes(cacheSizeValue, cacheSizeUnit);
    const newMemoryCacheSize = parseToBytes(memoryCacheSizeValue, memoryCacheSizeUnit);

    setConfig((prev) => ({
      ...prev,
      max_object_size: newMaxObjectSize,
      cache_size: newCacheSize,
      memory_cache_size: newMemoryCacheSize,
    }));
  }, [maxObjectSizeValue, maxObjectSizeUnit, cacheSizeValue, cacheSizeUnit, memoryCacheSizeValue, memoryCacheSizeUnit]);

  // Check for changes
  useEffect(() => {
    const changed = JSON.stringify(config) !== JSON.stringify(originalConfig);
    setHasChanges(changed);
  }, [config, originalConfig]);

  const handleSave = async () => {
    if (!token || !isAdmin) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_URL}/api/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          caching_enabled: String(config.caching_enabled),
          max_object_size: String(config.max_object_size),
          cache_size: String(config.cache_size),
          memory_cache_size: String(config.memory_cache_size),
          default_upstream: config.default_upstream,
          ssl_bump_enabled: String(config.ssl_bump_enabled),
          aggressive_caching: String(config.aggressive_caching),
          log_retention_days: String(config.log_retention_days),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const squidStatus = data.squidStatus || 'Settings saved successfully.';
        setMessage({ type: 'success', text: squidStatus });
        setOriginalConfig(config);
        setHasChanges(false);
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to save settings' });
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(originalConfig);
    const maxObj = formatBytes(originalConfig.max_object_size);
    setMaxObjectSizeValue(maxObj.value);
    setMaxObjectSizeUnit(maxObj.unit);

    const cacheSize = formatBytes(originalConfig.cache_size);
    setCacheSizeValue(cacheSize.value);
    setCacheSizeUnit(cacheSize.unit);

    const memCache = formatBytes(originalConfig.memory_cache_size);
    setMemoryCacheSizeValue(memCache.value);
    setMemoryCacheSizeUnit(memCache.unit);

    setMessage(null);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with save button */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Proxy Settings</h2>
              <p className="text-sm text-gray-500">Configure cache and proxy behavior</p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center space-x-3">
              {hasChanges && (
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  Reset
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  hasChanges
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mt-4 p-3 rounded-lg flex items-center space-x-2 ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {!isAdmin && (
          <div className="mt-4 p-3 rounded-lg bg-yellow-50 text-yellow-700 flex items-center space-x-2">
            <AlertCircle className="w-5 h-5" />
            <span>You need admin privileges to modify settings</span>
          </div>
        )}
      </div>

      {/* Cache Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="flex items-center space-x-2">
            <HardDrive className="w-5 h-5 text-gray-600" />
            <h3 className="text-md font-semibold text-gray-900">Cache Settings</h3>
          </div>
        </div>
        <div className="p-6 space-y-6">
          {/* Caching Enabled */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-900">Enable Caching</label>
              <p className="text-sm text-gray-500">Turn HTTP/HTTPS response caching on or off</p>
            </div>
            <button
              onClick={() => isAdmin && setConfig((prev) => ({ ...prev, caching_enabled: !prev.caching_enabled }))}
              disabled={!isAdmin}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.caching_enabled ? 'bg-primary-600' : 'bg-gray-200'
              } ${!isAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.caching_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Aggressive Caching */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-900">Aggressive Caching</label>
              <p className="text-sm text-gray-500">
                Override cache headers for static assets (images, JS, CSS, fonts)
              </p>
            </div>
            <button
              onClick={() => isAdmin && setConfig((prev) => ({ ...prev, aggressive_caching: !prev.aggressive_caching }))}
              disabled={!isAdmin}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.aggressive_caching ? 'bg-primary-600' : 'bg-gray-200'
              } ${!isAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.aggressive_caching ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Cache Size */}
          <div>
            <label className="font-medium text-gray-900">Maximum Cache Size</label>
            <p className="text-sm text-gray-500 mb-2">Total disk space allocated for cached content</p>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={cacheSizeValue}
                onChange={(e) => isAdmin && setCacheSizeValue(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={!isAdmin}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                min="1"
              />
              <select
                value={cacheSizeUnit}
                onChange={(e) => isAdmin && setCacheSizeUnit(e.target.value)}
                disabled={!isAdmin}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="MB">MB</option>
                <option value="GB">GB</option>
              </select>
            </div>
          </div>

          {/* Memory Cache Size */}
          <div>
            <label className="font-medium text-gray-900">Memory Cache Size</label>
            <p className="text-sm text-gray-500 mb-2">RAM allocated for hot cache (frequently accessed items)</p>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={memoryCacheSizeValue}
                onChange={(e) => isAdmin && setMemoryCacheSizeValue(Math.max(64, parseInt(e.target.value) || 64))}
                disabled={!isAdmin}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                min="64"
              />
              <select
                value={memoryCacheSizeUnit}
                onChange={(e) => isAdmin && setMemoryCacheSizeUnit(e.target.value)}
                disabled={!isAdmin}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="MB">MB</option>
                <option value="GB">GB</option>
              </select>
            </div>
          </div>

          {/* Max Object Size */}
          <div>
            <label className="font-medium text-gray-900">Maximum Object Size</label>
            <p className="text-sm text-gray-500 mb-2">Largest single file that can be cached</p>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={maxObjectSizeValue}
                onChange={(e) => isAdmin && setMaxObjectSizeValue(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={!isAdmin}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                min="1"
              />
              <select
                value={maxObjectSizeUnit}
                onChange={(e) => isAdmin && setMaxObjectSizeUnit(e.target.value)}
                disabled={!isAdmin}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="MB">MB</option>
                <option value="GB">GB</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* SSL & Security Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-gray-600" />
            <h3 className="text-md font-semibold text-gray-900">SSL & Security</h3>
          </div>
        </div>
        <div className="p-6 space-y-6">
          {/* SSL Bump */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-900">SSL Bumping</label>
              <p className="text-sm text-gray-500">
                Intercept HTTPS traffic for caching (requires CA certificate installation)
              </p>
            </div>
            <button
              onClick={() => isAdmin && setConfig((prev) => ({ ...prev, ssl_bump_enabled: !prev.ssl_bump_enabled }))}
              disabled={!isAdmin}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.ssl_bump_enabled ? 'bg-primary-600' : 'bg-gray-200'
              } ${!isAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.ssl_bump_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* SSL Certificate Download */}
          <div className="pt-4 border-t">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <FileKey className="w-5 h-5 text-gray-600" />
                  <label className="font-medium text-gray-900">CA Certificate</label>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Install this certificate in your system or browser to trust HTTPS connections through Squache.
                </p>
                <div className="mt-3 text-xs text-gray-500 space-y-1">
                  <p><strong>Linux:</strong> Copy to <code className="bg-gray-100 px-1 rounded">/usr/local/share/ca-certificates/</code> and run <code className="bg-gray-100 px-1 rounded">update-ca-certificates</code></p>
                  <p><strong>macOS:</strong> Double-click the file and add to System keychain with "Always Trust"</p>
                  <p><strong>Node.js:</strong> Set <code className="bg-gray-100 px-1 rounded">NODE_EXTRA_CA_CERTS=/path/to/squache-ca.crt</code></p>
                </div>
              </div>
              <button
                onClick={handleDownloadCert}
                disabled={!sslCertExists || sslDownloading}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  sslCertExists
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {sslDownloading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{sslDownloading ? 'Downloading...' : 'Download Certificate'}</span>
              </button>
            </div>
            {!sslCertExists && (
              <div className="mt-3 p-3 bg-yellow-50 text-yellow-700 rounded-lg text-sm flex items-center space-x-2">
                <AlertCircle className="w-4 h-4" />
                <span>SSL certificate not found. Run the SSL setup script to generate certificates.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Proxy Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-gray-600" />
            <h3 className="text-md font-semibold text-gray-900">Proxy Routing</h3>
          </div>
        </div>
        <div className="p-6 space-y-6">
          {/* Default Upstream */}
          <div>
            <label className="font-medium text-gray-900">Default Upstream</label>
            <p className="text-sm text-gray-500 mb-2">
              Default proxy routing when X-Squache-Upstream header is not specified
            </p>
            <select
              value={config.default_upstream}
              onChange={(e) => isAdmin && setConfig((prev) => ({ ...prev, default_upstream: e.target.value }))}
              disabled={!isAdmin}
              className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="direct">Direct (No Upstream)</option>
              <option value="vpn">VPN Proxy</option>
              <option value="residential">Residential Proxy</option>
              <option value="datacenter">Datacenter Proxy</option>
            </select>
          </div>
        </div>
      </div>

      {/* Log Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-gray-600" />
            <h3 className="text-md font-semibold text-gray-900">Logging & Retention</h3>
          </div>
        </div>
        <div className="p-6 space-y-6">
          {/* Log Retention */}
          <div>
            <label className="font-medium text-gray-900">Log Retention Period</label>
            <p className="text-sm text-gray-500 mb-2">Number of days to keep access logs in the database</p>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={config.log_retention_days}
                onChange={(e) =>
                  isAdmin &&
                  setConfig((prev) => ({
                    ...prev,
                    log_retention_days: Math.max(1, Math.min(365, parseInt(e.target.value) || 30)),
                  }))
                }
                disabled={!isAdmin}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                min="1"
                max="365"
              />
              <span className="text-gray-500">days</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
