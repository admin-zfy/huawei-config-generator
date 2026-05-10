import { useState, useCallback } from 'react';
import { API_BASE } from '../api';

// 设备功能支持表 (前端 fallback)
const DEVICE_SUPPORTS = {
  's5700':     ['vlan', 'ospf', 'acl', 'stp', 'eth-trunk'],
  's5735':     ['vlan', 'ospf', 'acl', 'stp', 'eth-trunk'],
  'ar-router': ['ospf', 'acl', 'nat', 'dhcp-server', 'sub-interface'],
  'usg6000':   ['ospf', 'acl', 'security-zone', 'security-policy', 'nat'],
};

export function useConfig() {
  const [config, setConfig] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [activeTab, setActiveTab] = useState('vlan');
  const [lineCount, setLineCount] = useState(0);
  const [selectedDevice, setSelectedDevice] = useState('s5700');

  const deviceSupports = DEVICE_SUPPORTS[selectedDevice] || [];

  const generateConfig = useCallback(async (type, params) => {
    setLoading(true);
    setError(null);
    setValidationErrors([]);
    setWarnings([]);
    try {
      const body = { ...params, deviceId: selectedDevice };
      const res = await fetch(`${API_BASE}/generate/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const err = new Error(data.error || '生成失败');
        err.validationErrors = data.validationErrors || [];
        err.warnings = data.warnings || [];
        throw err;
      }
      setConfig(data.config);
      setLineCount(data.lineCount || 0);
      return data.config;
    } catch (err) {
      setError(err.message);
      setValidationErrors(err.validationErrors || []);
      setWarnings(err.warnings || []);
      setConfig('');
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  const clearConfig = useCallback(() => {
    setConfig('');
    setError(null);
    setValidationErrors([]);
    setWarnings([]);
    setLineCount(0);
  }, []);

  return {
    config, setConfig,
    loading, error,
    validationErrors, warnings,
    activeTab, setActiveTab,
    generateConfig, clearConfig,
    lineCount,
    selectedDevice, setSelectedDevice,
    deviceSupports,
  };
}
