import { useState, useEffect } from 'react';
import { Server, Shield, Router, Network, Cpu } from 'lucide-react';
import { API_BASE } from '../api';

const DEVICE_ICONS = {
  switch: Cpu,
  router: Router,
  firewall: Shield,
};

const DEVICE_COLORS = {
  switch:   { active: 'border-[#00b4d8] bg-[#00b4d8]/10 text-[#00b4d8]', dot: 'bg-[#00b4d8]' },
  router:   { active: 'border-amber-400 bg-amber-400/10 text-amber-400', dot: 'bg-amber-400' },
  firewall: { active: 'border-red-400 bg-red-400/10 text-red-400', dot: 'bg-red-400' },
};

const CATEGORY_LABELS = {
  switch: '交换机',
  router: '路由器',
  firewall: '防火墙',
};

export default function DeviceSelector({ selectedDevice, onDeviceChange }) {
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/devices`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setDevices(data.devices);
      })
      .catch(() => {
        // 离线 fallback
        setDevices([
          { id: 's5700', label: 'S5700 交换机', category: 'switch', description: '48×GE + 4×10GE', supports: ['vlan','ospf','acl','stp'] },
          { id: 's5735', label: 'S5735 交换机', category: 'switch', description: '48×GE + 4×10GE', supports: ['vlan','ospf','acl','stp'] },
          { id: 'ar-router', label: 'AR 路由器', category: 'router', description: '3×GE + NAT/DHCP', supports: ['ospf','acl','nat','dhcp-server'] },
          { id: 'usg6000', label: 'USG6000 防火墙', category: 'firewall', description: '8×GE + 安全策略', supports: ['ospf','acl','security-zone','security-policy'] },
        ]);
      });
  }, []);

  return (
    <div className="bg-[#12121a] border border-[#2a2a4a] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-md bg-[#00b4d8]/10 flex items-center justify-center">
          <Server size={15} className="text-[#00b4d8]" />
        </div>
        <h3 className="text-sm font-semibold text-gray-200">选择设备</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {devices.map(dev => {
          const Icon = DEVICE_ICONS[dev.category] || Server;
          const colors = DEVICE_COLORS[dev.category] || DEVICE_COLORS.switch;
          const isActive = selectedDevice === dev.id;

          return (
            <button
              key={dev.id}
              onClick={() => onDeviceChange(dev.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all text-left ${
                isActive
                  ? colors.active + ' shadow-[0_0_12px_rgba(0,180,216,0.1)]'
                  : 'border-[#2a2a4a] text-gray-500 hover:border-[#3a3a5a] hover:text-gray-300'
              }`}
            >
              <Icon size={18} className={isActive ? '' : 'text-gray-600'} />
              <span className="text-[11px] font-medium leading-tight text-center">{dev.label}</span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-white/5'
                    : 'bg-[#0d0d1a] text-gray-600'
                }`}
              >
                {CATEGORY_LABELS[dev.category] || dev.category}
              </span>
              <span className="text-[9px] text-gray-600 text-center leading-tight">{dev.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
