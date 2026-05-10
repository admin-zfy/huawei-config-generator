import { useState, useMemo } from 'react';
import { Plus, Trash2, Network, Cable, Router, Play, RotateCcw, AlertTriangle, CheckCircle, Zap, Shield } from 'lucide-react';

const INITIAL_FORM = {
  vlanId: '',
  vlanName: '',
  ipAddress: '',
  subnetMask: '255.255.255.0',
  ports: [],
  trunkPorts: [],
  batchRangeStart: '',
  batchRangeEnd: '',
};

const SUBNET_MASKS = [
  '255.255.255.252', '255.255.255.248', '255.255.255.240',
  '255.255.255.224', '255.255.255.192', '255.255.255.128',
  '255.255.255.0', '255.255.254.0', '255.255.252.0',
  '255.255.248.0', '255.255.240.0', '255.255.224.0',
  '255.255.192.0', '255.255.128.0', '255.255.0.0',
];

// ===== 实时校验函数 =====
function validateField(field, value, form) {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return null; // 空值不报错（提交时再检查必填）
  }

  switch (field) {
    case 'vlanId': {
      const id = parseInt(value, 10);
      if (isNaN(id)) return '必须为数字';
      if (id < 1 || id > 4094) return '范围: 1-4094';
      if (id <= 10) return '警告: VLAN 1-10 为系统保留';
      return null;
    }
    case 'vlanName': {
      if (value.trim().length > 32) return '不能超过32个字符';
      if (!/^[a-zA-Z0-9_\-一-鿿]+$/.test(value.trim())) return '含无效字符';
      return null;
    }
    case 'ipAddress': {
      if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value.trim())) return '格式无效';
      const octets = value.trim().split('.').map(Number);
      if (octets.some(o => o > 255)) return '每段不能超过255';
      if (octets[0] === 127) return '不能使用回环地址';
      if (octets[0] >= 224 && octets[0] <= 239) return '不能使用组播地址';
      if (octets[0] === 0) return '不能为 0.x.x.x';
      return null;
    }
    case 'ipSubnet': {
      // 子网掩码 + IP 必须同时出现
      if (value && !form.ipAddress?.trim()) return '请先填写IP地址';
      if (form.ipAddress?.trim() && !value) return '请填写子网掩码';
      return null;
    }
    default:
      return null;
  }
}

// 接口名缩写展开
function expandPortName(name) {
  if (!name || typeof name !== 'string') return name;
  const trimmed = name.trim();
  if (/^GE\b/i.test(trimmed)) return trimmed.replace(/^GE/i, 'GigabitEthernet');
  if (/^XGE\b/i.test(trimmed)) return trimmed.replace(/^XGE/i, 'XGigabitEthernet');
  return trimmed;
}

// 设备默认端口 sample
const DEVICE_PORT_DEFAULTS = {
  's5700':     { start: 'GigabitEthernet0/0/1', end: 'GigabitEthernet0/0/48', trunk: 'XGigabitEthernet0/0/1' },
  's5735':     { start: 'GigabitEthernet0/0/1', end: 'GigabitEthernet0/0/48', trunk: 'XGigabitEthernet0/0/1' },
  'ar-router': { start: 'GigabitEthernet0/0/0', end: 'GigabitEthernet0/0/2', trunk: 'GigabitEthernet0/0/0' },
  'usg6000':   { start: 'GigabitEthernet1/0/0', end: 'GigabitEthernet1/0/7', trunk: 'GigabitEthernet1/0/0' },
};

export default function VLANForm({ onGenerate, loading, deviceId }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState({});

  const portDef = DEVICE_PORT_DEFAULTS[deviceId] || DEVICE_PORT_DEFAULTS['s5700'];
  const isRouter = deviceId === 'ar-router';
  const isFirewall = deviceId === 'usg6000';

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    const err = validateField(field, value, form);
    setErrors(prev => ({ ...prev, [field]: err }));
    if (!err && warnings[field]) {
      setWarnings(prev => ({ ...prev, [field]: null }));
    }
  };

  // ===== Access 端口管理 =====
  const addPort = () => {
    const idx = form.ports.length + 1;
    setForm(prev => ({
      ...prev,
      ports: [...prev.ports, {
        name: `${portDef.start.replace(/\d+$/, String(idx))}`,
        description: '',
        stpEdge: true,
        bpdu: true,
      }],
    }));
  };

  const updatePort = (index, field, value) => {
    setForm(prev => {
      const ports = [...prev.ports];
      ports[index] = { ...ports[index], [field]: value };
      return { ...prev, ports };
    });
  };

  const removePort = (index) => {
    setForm(prev => ({
      ...prev,
      ports: prev.ports.filter((_, i) => i !== index),
    }));
  };

  // ===== 批量端口生成 =====
  const generateBatchPorts = () => {
    const start = expandPortName(form.batchRangeStart.trim());
    const end = expandPortName(form.batchRangeEnd.trim());

    if (!start || !end) {
      setErrors(prev => ({ ...prev, batchRange: '请填写起始和结束端口' }));
      return;
    }

    const sMatch = start.match(/^(.+?)(\d+)$/);
    const eMatch = end.match(/^(.+?)(\d+)$/);

    if (!sMatch || !eMatch) {
      setErrors(prev => ({ ...prev, batchRange: '端口格式无效 (如 GigabitEthernet0/0/1)' }));
      return;
    }

    if (sMatch[1] !== eMatch[1]) {
      setErrors(prev => ({ ...prev, batchRange: '起始和结束端口前缀必须一致' }));
      return;
    }

    const startNum = parseInt(sMatch[2], 10);
    const endNum = parseInt(eMatch[2], 10);

    if (startNum > endNum) {
      setErrors(prev => ({ ...prev, batchRange: '起始端口号不能大于结束端口号' }));
      return;
    }

    if (endNum - startNum > 47) {
      setErrors(prev => ({ ...prev, batchRange: '批量生成最多48个端口' }));
      return;
    }

    const prefix = sMatch[1];
    const newPorts = [];
    for (let i = startNum; i <= endNum; i++) {
      newPorts.push({
        name: `${prefix}${i}`,
        description: '',
        stpEdge: true,
        bpdu: true,
      });
    }

    setForm(prev => ({
      ...prev,
      ports: [...prev.ports, ...newPorts],
      batchRangeStart: '',
      batchRangeEnd: '',
    }));
    setErrors(prev => ({ ...prev, batchRange: null }));
  };

  // ===== Trunk 端口管理 =====
  const addTrunkPort = () => {
    setForm(prev => ({
      ...prev,
      trunkPorts: [...prev.trunkPorts, {
        name: '',
        description: '',
        allowedVlans: prev.vlanId ? String(prev.vlanId) : '',
        nativeVlan: '',
      }],
    }));
  };

  const updateTrunkPort = (index, field, value) => {
    setForm(prev => {
      const trunkPorts = [...prev.trunkPorts];
      trunkPorts[index] = { ...trunkPorts[index], [field]: value };
      return { ...prev, trunkPorts };
    });
  };

  const removeTrunkPort = (index) => {
    setForm(prev => ({
      ...prev,
      trunkPorts: prev.trunkPorts.filter((_, i) => i !== index),
    }));
  };

  // ===== 提交校验 =====
  const validate = () => {
    const errs = {};
    const warns = {};

    // VLAN ID
    if (!form.vlanId || !String(form.vlanId).trim()) {
      errs.vlanId = '必填';
    } else {
      const id = parseInt(form.vlanId, 10);
      if (isNaN(id) || id < 1 || id > 4094) {
        errs.vlanId = 'VLAN ID 范围: 1-4094';
      } else if (id <= 10) {
        warns.vlanId = 'VLAN 1-10 为系统保留 VLAN';
      }
    }

    // VLAN 名称
    if (!form.vlanName.trim()) {
      errs.vlanName = '必填';
    } else if (!/^[a-zA-Z0-9_\-一-鿿]+$/.test(form.vlanName.trim())) {
      errs.vlanName = '含无效字符';
    }

    // IP 地址
    const hasIP = form.ipAddress?.trim();
    const hasMask = form.subnetMask;
    if (hasIP || (hasMask && hasMask !== '255.255.255.0' && form.subnetMask !== INITIAL_FORM.subnetMask)) {
      if (hasIP && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hasIP)) {
        errs.ipAddress = 'IP 地址格式无效';
      }
      if (!hasIP && hasMask) {
        errs.ipAddress = 'IP地址与子网掩码必须同时提供';
      }
    }

    // Access 端口校验
    form.ports.forEach((port, i) => {
      if (!port.name.trim()) {
        errs[`port_${i}_name`] = '接口名必填';
      }
    });

    // Trunk 端口校验
    form.trunkPorts.forEach((port, i) => {
      if (!port.name.trim()) {
        errs[`trunk_${i}_name`] = '接口名必填';
      }
      if (port.nativeVlan && port.nativeVlan.trim()) {
        const nv = parseInt(port.nativeVlan, 10);
        if (isNaN(nv) || nv < 1 || nv > 4094) {
          errs[`trunk_${i}_nativeVlan`] = '无效VLAN ID';
        }
      }
    });

    setErrors(errs);
    setWarnings(warns);
    return { valid: Object.keys(errs).length === 0, warns };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { valid } = validate();
    if (!valid) return;

    const ports = form.ports
      .filter(p => p.name.trim())
      .map(p => ({
        name: expandPortName(p.name),
        description: p.description || undefined,
        stpEdge: p.stpEdge,
        bpdu: p.bpdu,
      }));

    const trunkPorts = form.trunkPorts
      .filter(p => p.name.trim())
      .map(p => ({
        name: expandPortName(p.name),
        description: p.description || undefined,
        allowedVlans: p.allowedVlans
          ? String(p.allowedVlans).split(/[\s,]+/).filter(Boolean)
          : undefined,
        nativeVlan: p.nativeVlan || undefined,
      }));

    onGenerate({
      vlanId: form.vlanId,
      vlanName: form.vlanName.trim(),
      ipAddress: form.ipAddress?.trim() || undefined,
      subnetMask: form.subnetMask || undefined,
      ports: ports.length > 0 ? ports : undefined,
      trunkPorts: trunkPorts.length > 0 ? trunkPorts : undefined,
    });
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setErrors({});
    setWarnings({});
  };

  const inputCls = (field) =>
    `w-full bg-[#0d0d1a] border rounded-md px-3 py-2 text-sm text-gray-200 outline-none transition-all focus:border-[#00b4d8] focus:shadow-[0_0_8px_rgba(0,180,216,0.15)] ${
      errors[field] ? 'border-red-500/70' : 'border-[#2a2a4a]'
    }`;

  // 防火墙不支持 VLAN 配置
  if (isFirewall) {
    return (
      <div className="bg-[#12121a] border border-[#2a2a4a] rounded-xl p-8 text-center animate-fade-in">
        <Shield size={40} className="text-gray-700 mx-auto mb-3" />
        <p className="text-gray-400 text-sm font-medium">防火墙不支持 VLAN 配置</p>
        <p className="text-gray-600 text-xs mt-2">
          USG6000 系列防火墙使用安全区域和策略进行网络隔离，无需配置 VLAN
        </p>
        <p className="text-gray-600 text-xs mt-1">
          请切换到 ACL/策略 配置页生成安全策略
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
      {/* 路由器子接口提示 */}
      {isRouter && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 text-xs font-medium">路由器子接口模式</p>
            <p className="text-amber-400/70 text-[11px] mt-0.5">
              AR 路由器通过子接口（dot1q 终结）实现 VLAN 隔离。Access/Trunk 端口区域不适用于路由器。
            </p>
          </div>
        </div>
      )}

      {/* ===== 基本信息卡片 ===== */}
      <div className="bg-[#12121a] border border-[#2a2a4a] rounded-xl p-5 hover:border-[#00b4d8]/30 transition-all">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-md bg-[#00b4d8]/10 flex items-center justify-center">
            <Network size={15} className="text-[#00b4d8]" />
          </div>
          <h3 className="text-sm font-semibold text-gray-200">基本信息</h3>
          <span className="text-[10px] text-gray-500 ml-auto">必填项以红色标记</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* VLAN ID */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              VLAN ID <span className="text-red-400">*</span>
            </label>
            <input
              type="number" min="1" max="4094"
              value={form.vlanId}
              onChange={e => updateField('vlanId', e.target.value)}
              placeholder="例如: 100"
              className={inputCls('vlanId')}
            />
            {errors.vlanId && <p className="text-[11px] text-red-400 mt-1">{errors.vlanId}</p>}
            {warnings.vlanId && !errors.vlanId && (
              <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
                <AlertTriangle size={10} /> {warnings.vlanId}
              </p>
            )}
          </div>

          {/* VLAN 名称 */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              VLAN 名称 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.vlanName}
              onChange={e => updateField('vlanName', e.target.value)}
              placeholder="例如: Office_VLAN"
              className={inputCls('vlanName')}
            />
            {errors.vlanName && <p className="text-[11px] text-red-400 mt-1">{errors.vlanName}</p>}
          </div>

          {/* IP 地址 */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              IP 地址 <span className="text-gray-600">(VLANIF, 可选)</span>
            </label>
            <input
              type="text"
              value={form.ipAddress}
              onChange={e => updateField('ipAddress', e.target.value)}
              placeholder="例如: 192.168.1.1"
              className={inputCls('ipAddress')}
            />
            {errors.ipAddress && <p className="text-[11px] text-red-400 mt-1">{errors.ipAddress}</p>}
          </div>

          {/* 子网掩码 */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              子网掩码
            </label>
            <select
              value={form.subnetMask}
              onChange={e => updateField('subnetMask', e.target.value)}
              className={inputCls('subnetMask')}
            >
              {SUBNET_MASKS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ===== 批量生成 Access 端口 ===== */}
      <div className="bg-[#12121a] border border-[#2a2a4a] rounded-xl p-5 hover:border-[#00b4d8]/30 transition-all">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-md bg-amber-500/10 flex items-center justify-center">
            <Zap size={15} className="text-amber-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-200">批量端口生成</h3>
          <span className="text-[10px] text-gray-600 ml-auto">快速生成连续端口</span>
        </div>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-[11px] text-gray-500 mb-1">起始端口</label>
            <input
              type="text"
              value={form.batchRangeStart}
              onChange={e => updateField('batchRangeStart', e.target.value)}
              placeholder={`例如: ${portDef.start} 或 ${portDef.start.replace('GigabitEthernet', 'GE')}`}
              className={inputCls('batchRange')}
            />
          </div>
          <span className="text-gray-500 text-sm pb-2">to</span>
          <div className="flex-1">
            <label className="block text-[11px] text-gray-500 mb-1">结束端口</label>
            <input
              type="text"
              value={form.batchRangeEnd}
              onChange={e => updateField('batchRangeEnd', e.target.value)}
              placeholder={`例如: ${portDef.end}`}
              className={inputCls('batchRange')}
            />
          </div>
          <button
            type="button"
            onClick={generateBatchPorts}
            className="px-4 py-2 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-md text-xs font-medium hover:bg-amber-500/25 transition-all flex items-center gap-1.5 flex-shrink-0"
          >
            <Zap size={13} />
            批量添加
          </button>
        </div>
        {errors.batchRange && (
          <p className="text-[11px] text-red-400 mt-2">{errors.batchRange}</p>
        )}
      </div>

      {/* ===== Access 端口 ===== */}
      <div className="bg-[#12121a] border border-[#2a2a4a] rounded-xl p-5 hover:border-[#00b4d8]/30 transition-all">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <Cable size={15} className="text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-200">
              Access 端口
              {form.ports.length > 0 && (
                <span className="ml-2 text-[11px] text-gray-500 bg-[#0d0d1a] px-2 py-0.5 rounded">
                  {form.ports.length} 个
                </span>
              )}
            </h3>
          </div>
          <button type="button" onClick={addPort} className="flex items-center gap-1 px-3 py-1.5 border border-[#2a2a4a] rounded-md text-xs text-gray-400 hover:border-[#00b4d8] hover:text-[#00b4d8] transition-all">
            <Plus size={13} /> 添加端口
          </button>
        </div>

        {form.ports.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-6">
            使用上方批量生成或手动添加 Access 端口
          </p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {form.ports.map((port, index) => (
              <div key={index} className="bg-[#0d0d1a] border border-[#2a2a4a] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium text-gray-500">
                    #{index + 1}
                  </span>
                  <button type="button" onClick={() => removePort(index)}
                    className="p-1 hover:bg-red-500/10 rounded transition">
                    <Trash2 size={13} className="text-red-400" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input
                    type="text"
                    value={port.name}
                    onChange={e => updatePort(index, 'name', e.target.value)}
                    placeholder={portDef.start}
                    className={inputCls(`port_${index}_name`)}
                  />
                  <input
                    type="text"
                    value={port.description}
                    onChange={e => updatePort(index, 'description', e.target.value)}
                    placeholder="描述 (可选)"
                    className={inputCls()}
                  />
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1 text-[11px] text-gray-400 cursor-pointer">
                    <input type="checkbox" checked={port.stpEdge}
                      onChange={e => updatePort(index, 'stpEdge', e.target.checked)}
                      className="accent-[#00b4d8]" />
                    STP边缘端口
                  </label>
                  <label className="flex items-center gap-1 text-[11px] text-gray-400 cursor-pointer">
                    <input type="checkbox" checked={port.bpdu}
                      onChange={e => updatePort(index, 'bpdu', e.target.checked)}
                      className="accent-[#00b4d8]" />
                    BPDU过滤
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== Trunk 端口 ===== */}
      <div className="bg-[#12121a] border border-[#2a2a4a] rounded-xl p-5 hover:border-[#00b4d8]/30 transition-all">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-violet-500/10 flex items-center justify-center">
              <Router size={15} className="text-violet-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-200">
              Trunk 端口
              {form.trunkPorts.length > 0 && (
                <span className="ml-2 text-[11px] text-gray-500 bg-[#0d0d1a] px-2 py-0.5 rounded">
                  {form.trunkPorts.length} 个
                </span>
              )}
            </h3>
          </div>
          <button type="button" onClick={addTrunkPort} className="flex items-center gap-1 px-3 py-1.5 border border-[#2a2a4a] rounded-md text-xs text-gray-400 hover:border-[#00b4d8] hover:text-[#00b4d8] transition-all">
            <Plus size={13} /> 添加端口
          </button>
        </div>

        {form.trunkPorts.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-6">
            添加 Trunk 端口用于上行链路
          </p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {form.trunkPorts.map((port, index) => (
              <div key={index} className="bg-[#0d0d1a] border border-[#2a2a4a] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium text-gray-500">
                    #{index + 1}
                  </span>
                  <button type="button" onClick={() => removeTrunkPort(index)}
                    className="p-1 hover:bg-red-500/10 rounded transition">
                    <Trash2 size={13} className="text-red-400" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={port.name}
                    onChange={e => updateTrunkPort(index, 'name', e.target.value)}
                    placeholder={`接口名 (如 ${portDef.trunk})`}
                    className={inputCls(`trunk_${index}_name`)}
                  />
                  <input
                    type="text"
                    value={port.description}
                    onChange={e => updateTrunkPort(index, 'description', e.target.value)}
                    placeholder="描述 (可选)"
                    className={inputCls()}
                  />
                  <input
                    type="text"
                    value={port.allowedVlans}
                    onChange={e => updateTrunkPort(index, 'allowedVlans', e.target.value)}
                    placeholder="允许VLAN (如 100 200 300)"
                    className={inputCls()}
                  />
                  <input
                    type="number" min="1" max="4094"
                    value={port.nativeVlan}
                    onChange={e => updateTrunkPort(index, 'nativeVlan', e.target.value)}
                    placeholder="Native VLAN (可选)"
                    className={inputCls(`trunk_${index}_nativeVlan`)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== 操作按钮 & 校验提示 ===== */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#00b4d8] to-[#0077b6] text-white rounded-md text-sm font-medium hover:shadow-[0_0_16px_rgba(0,180,216,0.3)] hover:-translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Play size={15} />
              生成 VLAN 配置
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2.5 border border-[#2a2a4a] rounded-md text-sm text-gray-400 hover:border-[#00b4d8] hover:text-[#00b4d8] transition-all"
        >
          <RotateCcw size={15} />
          重置
        </button>
      </div>
    </form>
  );
}
