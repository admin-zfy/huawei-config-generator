/**
 * 华为设备定义 — 所有设备的信息集中在此，驱动接口命名/功能适配
 */
const DEVICES = {
  's5700': {
    id: 's5700',
    label: 'S5700 系列接入/汇聚交换机',
    category: 'switch',
    systemHeader: 'S5700 Series Switch',
    interfaces: {
      access:  { prefix: 'GigabitEthernet',  slotPattern: '0/0', count: 48, startIndex: 1, abbr: 'GE' },
      uplink:  { prefix: 'XGigabitEthernet', slotPattern: '0/0', count: 4,  startIndex: 1, abbr: 'XGE' },
    },
    supports: ['vlan', 'ospf', 'acl', 'stp', 'eth-trunk'],
    defaultStpMode: 'mstp',
    description: '48×GE 接入 + 4×10GE 上行',
  },
  's5735': {
    id: 's5735',
    label: 'S5735-L 系列新一代接入交换机',
    category: 'switch',
    systemHeader: 'S5735-L Series Switch',
    interfaces: {
      access:  { prefix: 'GigabitEthernet',   slotPattern: '0/0', count: 48, startIndex: 1, abbr: 'GE' },
      uplink:  { prefix: 'XGigabitEthernet',   slotPattern: '0/0', count: 4,  startIndex: 1, abbr: 'XGE' },
    },
    supports: ['vlan', 'ospf', 'acl', 'stp', 'eth-trunk'],
    defaultStpMode: 'mstp',
    description: '48×GE 接入 + 4×10GE 上行 (新一代)',
  },
  'ar-router': {
    id: 'ar-router',
    label: 'AR6120/AR6140 系列路由器',
    category: 'router',
    systemHeader: 'AR Series Router',
    interfaces: {
      wan: { prefix: 'GigabitEthernet', slotPattern: '0/0', count: 3, startIndex: 0, abbr: 'GE' },
    },
    supports: ['ospf', 'acl', 'nat', 'dhcp-server', 'sub-interface'],
    defaultStpMode: null,
    description: '3×GE WAN + 子接口/NAT/DHCP',
    subInterface: { delimiter: '.', vlanRange: [1, 4094] },
  },
  'usg6000': {
    id: 'usg6000',
    label: 'USG6000 系列防火墙',
    category: 'firewall',
    systemHeader: 'USG6000 Series Firewall',
    interfaces: {
      main: { prefix: 'GigabitEthernet', slotPattern: '1/0', count: 8, startIndex: 0, abbr: 'GE' },
    },
    supports: ['ospf', 'acl', 'security-zone', 'security-policy', 'nat'],
    defaultStpMode: null,
    description: '8×GE (槽位 1/0) + 安全区域/策略',
    defaultZones: ['trust', 'untrust', 'dmz'],
  },
};

// ===== 辅助函数 =====

function getDevice(id) {
  return DEVICES[id] || null;
}

function getDeviceList() {
  return Object.values(DEVICES).map(d => ({
    id: d.id,
    label: d.label,
    category: d.category,
    description: d.description,
    supports: d.supports,
  }));
}

function getSupportedFeatures(deviceId) {
  const dev = getDevice(deviceId);
  return dev ? dev.supports : [];
}

/**
 * 返回指定设备的指定类型接口完整名称列表
 * 例如 getDefaultPorts('s5700', 'access') => ['GigabitEthernet0/0/1', ..., 'GigabitEthernet0/0/48']
 */
function getDefaultPorts(deviceId, portType) {
  const dev = getDevice(deviceId);
  if (!dev) return [];

  const iface = dev.interfaces[portType];
  if (!iface) return [];

  const ports = [];
  for (let i = 0; i < iface.count; i++) {
    const idx = iface.startIndex + i;
    ports.push(`${iface.prefix}${iface.slotPattern}/${idx}`);
  }
  return ports;
}

/**
 * 返回设备的接口布局摘要（前端展示用）
 */
function getInterfaceSummary(deviceId) {
  const dev = getDevice(deviceId);
  if (!dev) return null;

  const summaries = [];
  for (const [type, iface] of Object.entries(dev.interfaces)) {
    summaries.push({
      type,
      label: type === 'access' ? '接入口' : type === 'uplink' ? '上行口' : type === 'wan' ? 'WAN口' : '接口',
      prefix: iface.prefix,
      abbr: iface.abbr,
      count: iface.count,
      sample: `${iface.prefix}${iface.slotPattern}/${iface.startIndex}`,
    });
  }
  return summaries;
}

/**
 * 生成设备接口名的 placeholder 示例
 */
function getPortPlaceholder(deviceId) {
  const dev = getDevice(deviceId);
  if (!dev) return 'GigabitEthernet0/0/1';

  const firstIface = Object.values(dev.interfaces)[0];
  if (!firstIface) return 'GigabitEthernet0/0/1';

  return `${firstIface.prefix}${firstIface.slotPattern}/${firstIface.startIndex}`;
}

module.exports = {
  DEVICES,
  getDevice,
  getDeviceList,
  getSupportedFeatures,
  getDefaultPorts,
  getInterfaceSummary,
  getPortPlaceholder,
};
