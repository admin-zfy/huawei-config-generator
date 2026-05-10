/**
 * 华为 VRP display current-configuration 解析器
 * 将文本配置转换为结构化对象，供分析器使用
 */
const { identifySection } = require('./section-types');

function parseVRPConfig(text) {
  if (!text || typeof text !== 'string') return null;

  const lines = text.split(/\r?\n/);
  const result = {
    sysname: '',
    vlans: [],
    interfaces: [],
    vlanifs: [],
    ospf: null,
    acls: [],
    stp: { mode: null, bpduProtection: false, tcProtection: false, regionName: null, instances: [] },
    users: [],
    aaa: { hasLocalAuth: false },
    snmp: { communities: [] },
    dhcp: { enabled: false, pools: [] },
    vtyLines: [],
    rawLines: lines.map((l, i) => ({ num: i + 1, text: l })),
    hasTelnet: false,
    hasSSH: false,
    allVlanRefs: new Set(),
  };

  // 按 # 分割成段落
  const sections = splitIntoSections(lines);

  for (const section of sections) {
    const firstCmd = section.lines[0]?.trim() || '';
    const { type } = identifySection(firstCmd);

    switch (type) {
      case 'sysname':
        result.sysname = firstCmd.replace(/^sysname\s+/i, '').trim();
        break;

      case 'vlan-batch':
        parseVlanBatch(section, result);
        break;

      case 'vlan-section':
        parseVlanSection(section, result);
        break;

      case 'interface-physical':
        parsePhysicalInterface(section, result);
        break;

      case 'interface-vlanif':
        parseVlanifInterface(section, result);
        break;

      case 'ospf':
      case 'ospf-area':
        parseOSPFSection(section, result);
        break;

      case 'stp':
        parseSTPSection(section, result);
        break;

      case 'acl':
      case 'acl-rule':
        parseACLSection(section, result);
        break;

      case 'local-user':
        parseLocalUser(section, result);
        break;

      case 'aaa':
        result.aaa.hasLocalAuth = true;
        break;

      case 'auth-mode':
      case 'vty':
        parseVTYSection(section, result);
        break;

      case 'snmp':
        parseSNMPSection(section, result);
        break;

      case 'dhcp':
      case 'ip-pool':
        parseDHCPSection(section, result);
        break;

      case 'stelnet':
        result.hasSSH = true;
        break;

      case 'ssh':
        result.hasSSH = true;
        break;
    }
  }

  // 后处理：标记已使用/未使用的 VLAN
  computeVlanUsage(result);

  // 后处理：标记 ACL 是否被接口引用
  computeACLUsage(result);

  result.allVlanRefs = undefined; // 内部用，不暴露
  return result;
}

// ===== 按 # 分割段落 =====
function splitIntoSections(lines) {
  const sections = [];
  let current = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // # 单独成行表示段分隔
    if (trimmed === '#' && current.length > 0) {
      sections.push({ lines: current });
      current = [];
      continue;
    }
    // 跳过完全空行和 return
    if (trimmed === 'return' || trimmed === '') continue;
    current.push(line);
  }

  if (current.length > 0) sections.push({ lines: current });

  return sections;
}

// ===== VLAN 解析 =====
function parseVlanBatch(section, result) {
  for (const line of section.lines) {
    const m = line.trim().match(/^vlan\s+batch\s+(.+)/i);
    if (m) {
      const ids = m[1].split(/\s+/).map(s => parseInt(s)).filter(n => !isNaN(n));
      result.vlans.push(...ids);
      ids.forEach(id => result.allVlanRefs.add(id));
    }
  }
}

function parseVlanSection(section, result) {
  let desc = '';
  for (const line of section.lines) {
    const m = line.trim().match(/^\s*description\s+(.+)/i);
    if (m) desc = m[1].trim();
  }
  // 描述信息暂存，后续可扩展
}

// ===== 物理接口解析 =====
function parsePhysicalInterface(section, result) {
  const firstLine = section.lines[0]?.trim() || '';
  const nameMatch = firstLine.match(/^interface\s+(.+)/i);
  const ifName = nameMatch ? nameMatch[1].trim() : '';

  const iface = {
    name: ifName,
    type: 'unknown',
    vlan: null,
    nativeVlan: null,
    allowedVlans: [],
    description: null,
    stpEdge: false,
    bpduFilter: false,
    shutdown: false,
    configured: false,
    aclApplied: [],
  };

  for (const line of section.lines) {
    const cmd = line.trim();
    const subCmd = line.match(/^\s+(.+)/);

    if (cmd.match(/^port\s+link-type\s+access/i)) {
      iface.type = 'access';
      iface.configured = true;
    } else if (cmd.match(/^port\s+link-type\s+trunk/i)) {
      iface.type = 'trunk';
      iface.configured = true;
    } else if (cmd.match(/^port\s+link-type\s+hybrid/i)) {
      iface.type = 'hybrid';
      iface.configured = true;
    } else if (cmd.match(/^port\s+default\s+vlan\s+(\d+)/i)) {
      const v = parseInt(RegExp.$1);
      iface.vlan = v;
      result.allVlanRefs.add(v);
      iface.configured = true;
    } else if (cmd.match(/^port\s+trunk\s+allow-pass\s+vlan\s+(.+)/i)) {
      const vlansRaw = RegExp.$1;
      if (vlansRaw.toLowerCase() === 'all') {
        iface.allowedVlans = 'all';
      } else {
        iface.allowedVlans = vlansRaw.split(/\s+/).map(s => parseInt(s)).filter(n => !isNaN(n));
        iface.allowedVlans.forEach(v => result.allVlanRefs.add(v));
      }
      iface.configured = true;
    } else if (cmd.match(/^port\s+trunk\s+pvid\s+vlan\s+(\d+)/i)) {
      iface.nativeVlan = parseInt(RegExp.$1);
      result.allVlanRefs.add(parseInt(RegExp.$1));
    } else if (cmd.match(/^stp\s+edged-port\s+enable/i)) {
      iface.stpEdge = true;
      iface.configured = true;
    } else if (cmd.match(/^stp\s+bpdu-filter\s+enable/i)) {
      iface.bpduFilter = true;
      iface.configured = true;
    } else if (cmd.match(/^shutdown$/i)) {
      iface.shutdown = true;
      iface.configured = true;
    } else if (subCmd && subCmd[1].match(/^description\s+(.+)/i)) {
      iface.description = RegExp.$1.trim();
      iface.configured = true;
    } else if (subCmd && subCmd[1].match(/^ip\s+address\s+/i)) {
      iface.configured = true;
    } else if (cmd.match(/^undo\s+shutdown/i) || cmd.match(/^no\s+shutdown/i)) {
      iface.shutdown = false;
      iface.configured = true;
    } else if (cmd.match(/traffic-filter.*acl\s+(\d+)/i)) {
      iface.aclApplied.push(parseInt(RegExp.$1));
    }
  }

  result.interfaces.push(iface);
}

// ===== VLANIF 解析 =====
function parseVlanifInterface(section, result) {
  const firstLine = section.lines[0]?.trim() || '';
  const nameMatch = firstLine.match(/interface\s+(Vlanif|Vlan)\s*(\d+)/i);
  const vlanId = nameMatch ? parseInt(nameMatch[2]) : null;

  const vlanif = { vlanId, ip: null, mask: null, description: null };

  for (const line of section.lines) {
    const cmd = line.trim();
    const subCmd = line.match(/^\s+(.+)/);
    if (cmd.match(/^ip\s+address\s+(\S+)\s+(\S+)/)) {
      vlanif.ip = RegExp.$1;
      vlanif.mask = RegExp.$2;
    } else if (subCmd && subCmd[1].match(/^description\s+(.+)/)) {
      vlanif.description = RegExp.$1.trim();
    }
  }

  result.vlanifs.push(vlanif);
  if (vlanId) result.allVlanRefs.add(vlanId);
}

// ===== OSPF 解析 =====
function parseOSPFSection(section, result) {
  if (!result.ospf) result.ospf = { processId: 1, routerId: null, areas: [], networks: [], authConfigured: false, silentInterfaces: [] };

  for (const line of section.lines) {
    const cmd = line.trim();
    if (cmd.match(/^ospf\s+(\d+)\s+router-id\s+(\S+)/i)) {
      result.ospf.processId = parseInt(RegExp.$1);
      result.ospf.routerId = RegExp.$2;
    } else if (cmd.match(/^area\s+(\S+)/i)) {
      const areaId = RegExp.$1;
      if (!result.ospf.areas.some(a => a.id === areaId)) {
        result.ospf.areas.push({ id: areaId, authConfigured: false });
      }
    } else if (cmd.match(/^\s+network\s+(\S+)\s+(\S+)/)) {
      result.ospf.networks.push({ address: RegExp.$1, wildcard: RegExp.$2 });
    } else if (cmd.match(/^\s+authentication-mode/i)) {
      result.ospf.authConfigured = true;
      // 标记最后一个 area
      const lastArea = result.ospf.areas[result.ospf.areas.length - 1];
      if (lastArea) lastArea.authConfigured = true;
    } else if (cmd.match(/silent-interface\s+(.+)/i)) {
      result.ospf.silentInterfaces.push(RegExp.$1.trim());
    }
  }
}

// ===== STP 解析 =====
function parseSTPSection(section, result) {
  for (const line of section.lines) {
    const cmd = line.trim();
    if (cmd.match(/^stp\s+mode\s+(\S+)/i)) {
      result.stp.mode = RegExp.$1.toLowerCase();
    } else if (cmd.match(/^stp\s+bpdu-protection/i)) {
      result.stp.bpduProtection = true;
    } else if (cmd.match(/^stp\s+tc-protection/)) {
      result.stp.tcProtection = true;
    } else if (cmd.match(/^\s+region-name\s+(\S+)/)) {
      result.stp.regionName = RegExp.$1;
    } else if (cmd.match(/^stp\s+enable/)) {
      result.stp.enabled = true;
    }
  }
}

// ===== ACL 解析 =====
function parseACLSection(section, result) {
  const firstLine = section.lines[0]?.trim() || '';
  const aclMatch = firstLine.match(/^acl\s+(\d+)/);
  if (!aclMatch) return;

  const acl = { number: parseInt(aclMatch[1]), rules: [], description: null };

  for (const line of section.lines) {
    const cmd = line.trim();
    if (cmd.match(/^\s*description\s+(.+)/)) {
      acl.description = RegExp.$1.trim();
    } else if (cmd.match(/^\s*rule\s+(\d+)\s+(permit|deny)\s+(.+)/i)) {
      const rule = {
        id: parseInt(RegExp.$1),
        action: RegExp.$2.toLowerCase(),
        raw: RegExp.$3.trim(),
      };
      // 检测 any-any permit
      if (rule.action === 'permit' && /source\s+any|destination\s+any/i.test(rule.raw)) {
        rule.hasAnySource = /source\s+any/i.test(rule.raw);
        rule.hasAnyDest = /destination\s+any/i.test(rule.raw);
      }
      acl.rules.push(rule);
    }
  }

  result.acls.push(acl);
}

// ===== 用户解析 =====
function parseLocalUser(section, result) {
  const user = { name: '', passwordType: null, passwordHash: null, hashedLen: 0, serviceTypes: [] };

  for (const line of section.lines) {
    const cmd = line.trim();
    if (cmd.match(/^local-user\s+(\S+)/i)) {
      user.name = RegExp.$1;
    } else if (cmd.match(/password\s+(simple|cipher)\s+(.+)/i)) {
      user.passwordType = RegExp.$1.toLowerCase();
      user.passwordHash = RegExp.$2.trim();
      user.hashedLen = user.passwordHash.length;
    } else if (cmd.match(/service-type\s+(.+)/i)) {
      const services = RegExp.$1.split(/\s+/);
      user.serviceTypes = services;
      if (services.some(s => /telnet/i.test(s))) result.hasTelnet = true;
      if (services.some(s => /ssh|stelnet/i.test(s))) result.hasSSH = true;
    }
  }

  if (user.name) result.users.push(user);
}

// ===== VTY 解析 =====
function parseVTYSection(section, result) {
  for (const line of section.lines) {
    const cmd = line.trim();
    if (cmd.match(/^authentication-mode\s+(\S+)/i)) {
      const mode = RegExp.$1;
      result.vtyLines.push({ authMode: mode });
      if (mode === 'none') result.hasTelnet = true;
    }
  }
}

// ===== SNMP 解析 =====
function parseSNMPSection(section, result) {
  for (const line of section.lines) {
    const cmd = line.trim();
    if (cmd.match(/community\s+(\S+)/i)) {
      result.snmp.communities.push(RegExp.$1);
    }
  }
}

// ===== DHCP 解析 =====
function parseDHCPSection(section, result) {
  for (const line of section.lines) {
    const cmd = line.trim();
    if (cmd.match(/^dhcp\s+enable/i)) {
      result.dhcp.enabled = true;
    } else if (cmd.match(/^ip\s+pool\s+(\S+)/i)) {
      result.dhcp.pools.push({ name: RegExp.$1 });
    }
  }
}

// ===== 后处理 =====
function computeVlanUsage(result) {
  const usedVlans = new Set();
  for (const iface of result.interfaces) {
    if (iface.vlan) usedVlans.add(iface.vlan);
    if (Array.isArray(iface.allowedVlans)) {
      iface.allowedVlans.forEach(v => usedVlans.add(v));
    }
  }
  for (const vlanif of result.vlanifs) {
    if (vlanif.vlanId) usedVlans.add(vlanif.vlanId);
  }
  usedVlans.delete(1); // VLAN 1 特殊处理

  result.unusedVlans = result.vlans.filter(v => v !== 1 && !usedVlans.has(v));
  result.vlan1Used = usedVlans.has(1) || result.vlans.includes(1);
}

function computeACLUsage(result) {
  const usedACLs = new Set();
  for (const iface of result.interfaces) {
    for (const aclNum of (iface.aclApplied || [])) {
      usedACLs.add(aclNum);
    }
  }

  for (const acl of result.acls) {
    acl.appliedOnInterface = usedACLs.has(acl.number);
  }
}

module.exports = { parseVRPConfig };
