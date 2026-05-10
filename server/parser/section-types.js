/**
 * VRP 配置段类型识别
 * 根据段首行内容判断段类型
 */

const SECTION_PATTERNS = [
  // 系统级
  { pattern: /^sysname\s/, type: 'sysname', category: 'global' },
  { pattern: /^aaa$/, type: 'aaa', category: 'aaa' },
  { pattern: /^local-user\s/, type: 'local-user', category: 'aaa' },
  { pattern: /^user-interface\s+vty/, type: 'vty', category: 'line' },
  { pattern: /^authentication-mode/, type: 'auth-mode', category: 'line' },

  // VLAN
  { pattern: /^vlan\s+batch\s/, type: 'vlan-batch', category: 'vlan' },
  { pattern: /^vlan\s+\d+$/, type: 'vlan-section', category: 'vlan' },

  // 接口
  { pattern: /^interface\s+(Vlanif\d+|Vlan\s*\d+)/i, type: 'interface-vlanif', category: 'interface' },
  { pattern: /^interface\s+(GigabitEthernet|XGigabitEthernet|10GE|Ethernet|Eth-Trunk|FastEthernet|LoopBack)/i, type: 'interface-physical', category: 'interface' },

  // 路由
  { pattern: /^ospf\s+\d+/, type: 'ospf', category: 'ospf' },
  { pattern: /^(area\s+[\d.]+|network\s)/, type: 'ospf-area', category: 'ospf' },

  // STP
  { pattern: /^stp\s+(mode|enable|region|instance|root|bpdu|tc-|pathcost|timer|loop-)/, type: 'stp', category: 'stp' },

  // ACL
  { pattern: /^acl\s+\d+/, type: 'acl', category: 'acl' },
  { pattern: /^\s+rule\s+\d+/, type: 'acl-rule', category: 'acl' },

  // DHCP / NAT
  { pattern: /^dhcp\s+(enable|select|server)/, type: 'dhcp', category: 'dhcp' },
  { pattern: /^ip\s+pool\s/, type: 'ip-pool', category: 'dhcp' },

  // SNMP
  { pattern: /^snmp-agent/, type: 'snmp', category: 'snmp' },

  // 端口组
  { pattern: /^port-group/, type: 'port-group', category: 'interface' },

  // Telnet/SSH
  { pattern: /^stelnet\s/, type: 'stelnet', category: 'line' },
  { pattern: /^ssh\s/, type: 'ssh', category: 'line' },
];

function identifySection(firstLine) {
  const trimmed = firstLine.trim();
  if (!trimmed || trimmed === '#' || trimmed === 'return') return { type: 'empty', category: 'meta' };

  for (const { pattern, type, category } of SECTION_PATTERNS) {
    if (pattern.test(trimmed)) return { type, category };
  }

  return { type: 'unknown', category: 'other' };
}

function classifyLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed === '#') return 'empty';
  if (trimmed.startsWith('#')) return 'comment';
  if (line.startsWith(' ') || line.startsWith('\t')) return 'sub-command';
  return 'command';
}

module.exports = { identifySection, classifyLine, SECTION_PATTERNS };
