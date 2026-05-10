/**
 * 华为网络配置验证工具 — 所有函数返回 { valid, error?, warn? } 结构
 */

// ===== IP 地址验证 =====

function isValidIPv4(ip) {
  if (typeof ip !== 'string') return false;
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;
  return parts.every(p => {
    const n = parseInt(p, 10);
    return !isNaN(n) && n >= 0 && n <= 255 && String(n) === p;
  });
}

function validateIPAddress(ip, label = 'IP地址') {
  if (!ip) return { valid: true }; // IP 可选

  if (!isValidIPv4(ip)) {
    return { valid: false, error: `${label}格式无效，必须为 x.x.x.x 格式` };
  }

  const octets = ip.trim().split('.').map(Number);

  // 拒绝全 0
  if (octets.every(o => o === 0)) {
    return { valid: false, error: `${label}不能为 0.0.0.0` };
  }
  // 拒绝全 255
  if (octets.every(o => o === 255)) {
    return { valid: false, error: `${label}不能为 255.255.255.255` };
  }
  // 拒绝组播地址
  if (octets[0] >= 224 && octets[0] <= 239) {
    return { valid: false, error: `${label}不能使用组播地址 (224.0.0.0-239.255.255.255)` };
  }
  // 拒绝 E 类地址
  if (octets[0] >= 240) {
    return { valid: false, error: `${label}不能使用保留地址 (240.0.0.0+)` };
  }
  // 拒绝回环地址 (127.0.0.0/8)
  if (octets[0] === 127) {
    return { valid: false, error: `${label}不能使用回环地址 (127.0.0.0/8)` };
  }
  // 拒绝链路本地 (169.254.0.0/16)
  if (octets[0] === 169 && octets[1] === 254) {
    return { valid: false, error: `${label}不能使用链路本地地址 (169.254.0.0/16)` };
  }

  return { valid: true };
}

function validateSubnetMask(mask, label = '子网掩码') {
  if (!mask) return { valid: true };

  if (!isValidIPv4(mask)) {
    return { valid: false, error: `${label}格式无效` };
  }

  const octets = mask.trim().split('.').map(Number);
  const binary = octets.map(o => o.toString(2).padStart(8, '0')).join('');

  // 子网掩码必须是连续的 1 后跟连续的 0
  if (!/^1+0+$/.test(binary)) {
    return { valid: false, error: `${label}不是有效的连续掩码` };
  }

  return { valid: true };
}

// ===== VLAN ID 验证 =====

function validateVlanID(vlanId) {
  if (vlanId === undefined || vlanId === null || vlanId === '') {
    return { valid: false, error: 'VLAN ID 为必填项' };
  }

  const id = parseInt(vlanId, 10);

  if (isNaN(id)) {
    return { valid: false, error: 'VLAN ID 必须为数字' };
  }

  if (id < 1 || id > 4094) {
    return { valid: false, error: 'VLAN ID 范围: 1-4094' };
  }

  if (id >= 1 && id <= 10) {
    return { valid: true, warn: `VLAN ${id} 属于系统保留 VLAN，请确认后再使用` };
  }

  return { valid: true, value: id };
}

function validateVlanIDs(vlanIds, label = 'VLAN列表') {
  if (!Array.isArray(vlanIds) || vlanIds.length === 0) {
    return { valid: false, error: `${label}为空` };
  }

  const results = vlanIds.map(id => {
    const num = parseInt(id, 10);
    if (isNaN(num) || num < 1 || num > 4094) {
      return { valid: false, id, error: `VLAN ID ${id} 无效 (范围: 1-4094)` };
    }
    return { valid: true, value: num };
  });

  const errors = results.filter(r => !r.valid);
  if (errors.length > 0) {
    return { valid: false, errors: errors.map(e => e.error) };
  }

  return { valid: true, values: results.map(r => r.value) };
}

// ===== VLAN 名称验证 =====

function validateVlanName(name) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return { valid: false, error: 'VLAN 名称不能为空' };
  }

  const trimmed = name.trim();

  if (trimmed.length > 32) {
    return { valid: false, error: 'VLAN 名称不能超过 32 个字符' };
  }

  // 华为VRP VLAN描述允许字母数字、中文、下划线、短横线
  if (!/^[a-zA-Z0-9_一-鿿\-]+$/.test(trimmed)) {
    return { valid: false, error: 'VLAN 名称包含无效字符 (允许: 字母/数字/中文/下划线/短横线)' };
  }

  return { valid: true, value: trimmed };
}

// ===== 接口名称验证 =====

const HUAWEI_IF_PATTERN = /^(GigabitEthernet|XGigabitEthernet|10GigabitEthernet|Eth-Trunk|\d+GigEthernet|Ethernet|FastEthernet|25GE|40GE|100GE|LoopBack)\d+(\/\d+)*(\.\d+)?$/i;

function validateInterfaceName(name, label = '接口名') {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return { valid: false, error: `${label}不能为空` };
  }

  const trimmed = name.trim();

  // 允许缩写: GE, XGE, Eth-Trunk
  const normalized = trimmed
    .replace(/^GE\b/i, 'GigabitEthernet')
    .replace(/^XGE\b/i, 'XGigabitEthernet');

  if (!HUAWEI_IF_PATTERN.test(normalized)) {
    return {
      valid: false,
      error: `${label} "${trimmed}" 格式无效 (如: GigabitEthernet0/0/1, Eth-Trunk1, XGigabitEthernet0/0/1)`,
    };
  }

  return { valid: true, value: trimmed, normalized };
}

// ===== 端口范围解析 =====

/**
 * 解析端口范围字符串如 "GigabitEthernet0/0/1 to GigabitEthernet0/0/10"
 * 返回端口名数组
 */
function parsePortRange(startPort, endPort) {
  const s = validateInterfaceName(startPort, '起始端口');
  const e = validateInterfaceName(endPort, '结束端口');
  if (!s.valid) return s;
  if (!e.valid) return e;

  const sNorm = s.normalized;
  const eNorm = e.normalized;

  // 提取前缀和下标
  const sMatch = sNorm.match(/^(.+?)(\d+)$/);
  const eMatch = eNorm.match(/^(.+?)(\d+)$/);

  if (!sMatch || !eMatch) {
    return { valid: false, error: '无法解析端口范围' };
  }

  if (sMatch[1] !== eMatch[1]) {
    return { valid: false, error: '起始和结束端口的前缀不一致' };
  }

  const startNum = parseInt(sMatch[2], 10);
  const endNum = parseInt(eMatch[2], 10);

  if (startNum > endNum) {
    return { valid: false, error: '起始端口号不能大于结束端口号' };
  }

  if (endNum - startNum > 47) {
    return { valid: false, error: '批量端口范围不能超过 48 个' };
  }

  const prefix = sMatch[1];
  const ports = [];
  for (let i = startNum; i <= endNum; i++) {
    ports.push(`${prefix}${i}`);
  }

  return { valid: true, ports };
}

// ===== Router ID 验证 =====

function validateRouterID(routerId) {
  if (!routerId || typeof routerId !== 'string') {
    return { valid: false, error: 'Router ID 为必填项' };
  }

  if (!isValidIPv4(routerId)) {
    return { valid: false, error: 'Router ID 格式无效，必须为 x.x.x.x' };
  }

  const octets = routerId.trim().split('.').map(Number);
  if (octets.every(o => o === 0)) {
    return { valid: false, error: 'Router ID 不能为 0.0.0.0' };
  }
  if (octets.every(o => o === 255)) {
    return { valid: false, error: 'Router ID 不能为 255.255.255.255' };
  }

  return { valid: true };
}

// ===== ACL 编号验证 =====

function validateACLNumber(aclNumber) {
  const num = parseInt(aclNumber, 10);
  if (isNaN(num)) {
    return { valid: false, error: 'ACL 编号必须为数字' };
  }

  const validRanges = [
    [2000, 2999, '基本ACL'],
    [3000, 3999, '高级ACL'],
    [4000, 4999, '二层ACL'],
    [5000, 5999, '用户自定义ACL'],
  ];

  for (const [min, max, type] of validRanges) {
    if (num >= min && num <= max) {
      return { valid: true, aclType: type, value: num };
    }
  }

  return {
    valid: false,
    error: `ACL 编号 ${num} 无效。有效范围: 2000-2999/3000-3999/4000-4999/5000-5999`,
  };
}

// ===== OSPF Area 验证 =====

function validateOSPArea(area) {
  if (area === undefined || area === null || area === '') {
    return { valid: false, error: 'OSPF Area 为必填项' };
  }

  const areaStr = String(area).trim();

  // 普通 area: 0-4294967295 或 x.x.x.x
  if (/^\d+$/.test(areaStr)) {
    const num = parseInt(areaStr, 10);
    if (num < 0 || num > 4294967295) {
      return { valid: false, error: 'OSPF Area 范围: 0-4294967295' };
    }
    return { valid: true, value: areaStr };
  }

  if (isValidIPv4(areaStr)) {
    return { valid: true, value: areaStr };
  }

  return { valid: false, error: 'OSPF Area 格式无效 (数字或 x.x.x.x)' };
}

// ===== 设备感知接口名验证 =====

/**
 * 根据设备定义校验接口名（含子接口格式 .N）
 */
function validateInterfaceNameForDevice(name, deviceId, label = '接口名') {
  const baseCheck = validateInterfaceName(name, label);
  if (!baseCheck.valid) return baseCheck;

  if (!deviceId) return baseCheck; // 无设备时仅做基础校验

  const { getDevice } = require('../device-definitions');
  const dev = getDevice(deviceId);
  if (!dev) return baseCheck;

  const trimmed = baseCheck.value;

  // 提取前缀和端口号，检查是否匹配设备的接口定义
  const match = trimmed.match(/^([A-Za-z]+)(\d+(?:\/\d+)*)(\.\d+)?$/);
  if (!match) return baseCheck;

  const prefix = match[1]; // e.g., GigabitEthernet
  const portPath = match[2]; // e.g., 0/0/1
  const isSubInterface = !!match[3]; // .10

  // 检查接口前缀是否属于设备支持的接口类型
  const validPrefixes = Object.values(dev.interfaces).map(iface => iface.prefix.toLowerCase());
  if (!validPrefixes.includes(prefix.toLowerCase())) {
    return {
      valid: false,
      error: `${label} "${trimmed}" — 前缀 "${prefix}" 不适用于 ${dev.label}（可用: ${Object.values(dev.interfaces).map(i => i.prefix).join(', ')}）`,
    };
  }

  // 路由器支持子接口
  if (isSubInterface && dev.category !== 'router') {
    return { valid: false, error: `${label} "${trimmed}" — 子接口格式仅适用于路由器` };
  }

  return baseCheck;
}

// ===== 验证值是否在某设备接口范围内 =====
function validatePortInRange(portName, deviceId, portType) {
  const { getDevice, getDefaultPorts } = require('../device-definitions');
  const dev = getDevice(deviceId);
  if (!dev) return { valid: true }; // 无设备定义时放行

  const validPorts = getDefaultPorts(deviceId, portType);
  if (validPorts.length === 0) return { valid: true };

  if (!validPorts.includes(portName)) {
    return {
      valid: false,
      error: `端口 "${portName}" 不在 ${dev.label} 的 ${portType} 端口范围内`,
    };
  }

  return { valid: true };
}

module.exports = {
  isValidIPv4,
  validateIPAddress,
  validateSubnetMask,
  validateVlanID,
  validateVlanIDs,
  validateVlanName,
  validateInterfaceName,
  validateInterfaceNameForDevice,
  validatePortInRange,
  parsePortRange,
  validateRouterID,
  validateACLNumber,
  validateOSPArea,
};
