/**
 * 华为交换机 VLAN / 路由器子接口 配置生成器 — 真实 VRP CLI 格式
 */
const {
  validateVlanID,
  validateVlanName,
  validateIPAddress,
  validateSubnetMask,
  validateInterfaceName,
  validateInterfaceNameForDevice,
} = require('../utils/validator');
const { getDevice, getPortPlaceholder } = require('../device-definitions');

function generateVLAN(params, deviceId) {
  const errors = [];
  const warnings = [];
  const dev = deviceId ? getDevice(deviceId) : null;

  // 防火墙不支持 VLAN
  if (dev && dev.category === 'firewall') {
    throw Object.assign(
      new Error('防火墙设备不支持 VLAN 配置，请使用安全区域/安全策略功能'),
      { validationErrors: ['防火墙不支持交换端口 VLAN 配置'], warnings: [] }
    );
  }

  // ===== 参数校验 =====
  const vlanCheck = validateVlanID(params.vlanId);
  if (!vlanCheck.valid) errors.push(vlanCheck.error);
  if (vlanCheck.warn) warnings.push(vlanCheck.warn);
  const vlanId = vlanCheck.value || parseInt(params.vlanId, 10);

  const nameCheck = validateVlanName(params.vlanName);
  if (!nameCheck.valid) errors.push(nameCheck.error);
  const vlanName = nameCheck.value || (params.vlanName || '').trim();

  const hasIP = !!(params.ipAddress && params.ipAddress.trim());
  const hasMask = !!(params.subnetMask && params.subnetMask.trim());

  if (hasIP || hasMask) {
    if (!hasIP) errors.push('IP地址与子网掩码必须同时提供');
    if (!hasMask) errors.push('IP地址与子网掩码必须同时提供');
    if (hasIP) {
      const ipCheck = validateIPAddress(params.ipAddress, 'IP地址');
      if (!ipCheck.valid) errors.push(ipCheck.error);
    }
    if (hasMask) {
      const maskCheck = validateSubnetMask(params.subnetMask, '子网掩码');
      if (!maskCheck.valid) errors.push(maskCheck.error);
    }
  }

  if (errors.length > 0) {
    throw Object.assign(new Error(errors.join('; ')), { validationErrors: errors, warnings });
  }

  const now = new Date().toLocaleString('zh-CN', { hour12: false });

  if (dev && dev.category === 'router') {
    // ===== 路由器：生成子接口配置 =====
    return generateRouterConfig({ dev, vlanId, vlanName, params, now, hasIP, hasMask, errors, warnings });
  }

  // ===== 交换机：标准 VLAN + Access/Trunk 端口 =====
  return generateSwitchConfig({ dev, vlanId, vlanName, params, now, hasIP, hasMask, errors, warnings });
}

function generateSwitchConfig({ dev, vlanId, vlanName, params, now, hasIP, hasMask, errors, warnings }) {
  const lines = [];
  const portSample = dev ? getPortPlaceholder(dev.id) : 'GigabitEthernet0/0/1';
  const devLabel = dev ? `适用于 ${dev.label}` : '适用于 S5700/S6700 系列';

  lines.push(`#`);
  lines.push(`# 华为${dev ? ' ' + dev.systemHeader : '交换机'} VLAN 配置`);
  lines.push(`# 生成时间: ${now}`);
  lines.push(`# VLAN: ${vlanId} - ${vlanName}`);
  lines.push(`# 格式: VRP (${devLabel})`);
  lines.push(`#`);
  lines.push(``);
  lines.push(`system-view`);
  lines.push(``);

  lines.push(`# 创建 VLAN`);
  lines.push(`vlan batch ${vlanId}`);
  lines.push(`#`);
  lines.push(`vlan ${vlanId}`);
  lines.push(` description ${vlanName}`);
  lines.push(`#`);

  if (hasIP && hasMask) {
    lines.push(`#`);
    lines.push(`# VLANIF 三层接口`);
    lines.push(`interface Vlanif${vlanId}`);
    lines.push(` description Gateway for ${vlanName.substring(0, 50)}`);
    lines.push(` ip address ${params.ipAddress.trim()} ${params.subnetMask.trim()}`);
    lines.push(`#`);
  }

  // Access 端口 (switch only)
  const accessPorts = [];
  if (params.ports && Array.isArray(params.ports)) {
    for (let i = 0; i < params.ports.length; i++) {
      const port = params.ports[i];
      const ifCheck = dev
        ? validateInterfaceNameForDevice(port.name, dev.id, `Access端口 #${i + 1}`)
        : validateInterfaceName(port.name, `Access端口 #${i + 1}`);
      if (!ifCheck.valid) { errors.push(ifCheck.error); continue; }
      accessPorts.push({
        name: ifCheck.normalized || ifCheck.value,
        description: port.description || `Access_VLAN${vlanId}`,
        stpEdge: !!port.stpEdge,
        bpdu: !!port.bpdu,
      });
    }
  }

  // Trunk 端口 (switch only)
  const trunkPorts = [];
  if (params.trunkPorts && Array.isArray(params.trunkPorts)) {
    for (let i = 0; i < params.trunkPorts.length; i++) {
      const port = params.trunkPorts[i];
      const ifCheck = dev
        ? validateInterfaceNameForDevice(port.name, dev.id, `Trunk端口 #${i + 1}`)
        : validateInterfaceName(port.name, `Trunk端口 #${i + 1}`);
      if (!ifCheck.valid) { errors.push(ifCheck.error); continue; }

      let allowedVlans = [];
      const raw = port.allowedVlans;
      if (raw) {
        if (Array.isArray(raw)) allowedVlans = raw.map(String);
        else allowedVlans = String(raw).split(/[\s,]+/).filter(Boolean);
      }
      const validVlans = [];
      for (const vid of allowedVlans) {
        const vc = validateVlanID(vid);
        if (vc.valid) validVlans.push(vc.value);
        else errors.push(`Trunk端口 "${port.name}" 允许VLAN ${vid} 无效: ${vc.error}`);
      }

      const nativeVlan = port.nativeVlan ? parseInt(port.nativeVlan, 10) : null;
      if (nativeVlan !== null) {
        const nv = validateVlanID(nativeVlan);
        if (!nv.valid) errors.push(`Trunk端口 "${port.name}" Native VLAN 无效: ${nv.error}`);
      }

      trunkPorts.push({
        name: ifCheck.normalized || ifCheck.value,
        description: port.description || 'Trunk_Uplink',
        allowedVlans: validVlans,
        nativeVlan,
      });
    }
  }

  if (errors.length > 0) {
    throw Object.assign(new Error(errors.join('; ')), { validationErrors: errors, warnings });
  }

  if (accessPorts.length > 0) {
    lines.push(`#`);
    lines.push(`# Access 端口 (共 ${accessPorts.length} 个)`);
    const groups = groupPortsByConfig(accessPorts);
    for (const g of groups) {
      const names = g.ports.map(p => p.name);
      const first = g.ports[0];
      lines.push(`#`);
      if (names.length === 1) {
        lines.push(`interface ${names[0]}`);
      } else {
        lines.push(`interface range ${names.join(' ')}`);
      }
      lines.push(` description ${first.description}`);
      lines.push(` port link-type access`);
      lines.push(` port default vlan ${vlanId}`);
      if (first.stpEdge) lines.push(` stp edged-port enable`);
      if (first.bpdu) lines.push(` stp bpdu-filter enable`);
      lines.push(`#`);
    }
  }

  if (trunkPorts.length > 0) {
    lines.push(`#`);
    lines.push(`# Trunk 端口 (共 ${trunkPorts.length} 个)`);
    for (const port of trunkPorts) {
      lines.push(`#`);
      lines.push(`interface ${port.name}`);
      lines.push(` description ${port.description}`);
      lines.push(` port link-type trunk`);
      if (port.allowedVlans.length > 0) {
        lines.push(` port trunk allow-pass vlan ${port.allowedVlans.join(' ')}`);
      } else {
        lines.push(` port trunk allow-pass vlan ${vlanId}`);
      }
      if (port.nativeVlan !== null) {
        lines.push(` port trunk pvid vlan ${port.nativeVlan}`);
      }
      lines.push(`#`);
    }
  }

  lines.push(`#`);
  lines.push(`# 验证命令`);
  lines.push(`# display vlan ${vlanId}`);
  lines.push(`# display interface brief`);
  if (hasIP) {
    lines.push(`# display ip interface brief Vlanif${vlanId}`);
    lines.push(`# ping ${params.ipAddress.trim()}`);
  }
  lines.push(`#`);
  lines.push(`save`);
  lines.push(`Y`);
  lines.push(``);
  lines.push(`return`);

  return lines.join('\n');
}

function generateRouterConfig({ dev, vlanId, vlanName, params, now, hasIP, hasMask, errors, warnings }) {
  const lines = [];
  const wanIface = getPortPlaceholder(dev.id);

  lines.push(`#`);
  lines.push(`# 华为 ${dev.systemHeader} 子接口配置`);
  lines.push(`# 生成时间: ${now}`);
  lines.push(`# VLAN: ${vlanId} - ${vlanName}`);
  lines.push(`# 格式: VRP (适用于 ${dev.label})`);
  lines.push(`# 注意: 路由器不支持 switchport 模式，使用子接口 + dot1q 终结`);
  lines.push(`#`);
  lines.push(``);
  lines.push(`system-view`);
  lines.push(``);

  if (params.subInterfaces && Array.isArray(params.subInterfaces) && params.subInterfaces.length > 0) {
    // 用户提供了子接口配置
    for (let i = 0; i < params.subInterfaces.length; i++) {
      const sub = params.subInterfaces[i];
      const subIfName = sub.interface || `${wanIface}.${sub.vlanId || vlanId}`;

      const ifCheck = validateInterfaceName(subIfName, `子接口 #${i + 1}`);
      if (!ifCheck.valid) { errors.push(ifCheck.error); continue; }

      const subVlanId = sub.vlanId || vlanId;
      lines.push(`# 子接口: ${subIfName}`);
      lines.push(`interface ${ifCheck.value}`);
      if (sub.description) lines.push(` description ${sub.description}`);
      lines.push(` dot1q termination vid ${subVlanId}`);
      if (sub.ipAddress && sub.subnetMask) {
        lines.push(` ip address ${sub.ipAddress} ${sub.subnetMask}`);
      }
      if (sub.arpBroadcastEnable !== false) {
        lines.push(` arp broadcast enable`);
      }
      lines.push(`#`);
    }

    if (errors.length > 0) {
      throw Object.assign(new Error(errors.join('; ')), { validationErrors: errors, warnings });
    }

    lines.push(`#`);
    lines.push(`# 验证命令`);
    lines.push(`# display ip interface brief`);
    lines.push(`# display dot1q information-termination`);
    lines.push(`#`);
    lines.push(`save`);
    lines.push(`Y`);
    lines.push(``);
    lines.push(`return`);

    return lines.join('\n');
  }

  // 默认：生成单个子接口示例
  const subIfName = `${wanIface}.${vlanId}`;
  lines.push(`# 子接口配置 (基于 WAN 口 ${wanIface})`);
  lines.push(`#`);
  lines.push(`interface ${subIfName}`);
  lines.push(` description SubIF_${vlanName.substring(0, 50)}`);
  lines.push(` dot1q termination vid ${vlanId}`);
  if (hasIP && hasMask) {
    lines.push(` ip address ${params.ipAddress.trim()} ${params.subnetMask.trim()}`);
  } else {
    lines.push(`# ip address <IP> <MASK>              # 请手动填写IP地址`);
  }
  lines.push(` arp broadcast enable`);
  lines.push(`#`);
  lines.push(`# 如果需要在物理口上配置 NAT:`);
  lines.push(`# interface ${wanIface}`);
  lines.push(`#  nat outbound 2000`);
  lines.push(`#`);
  lines.push(`# 验证命令`);
  lines.push(`# display ip interface brief`);
  lines.push(`# display dot1q information-termination`);
  lines.push(`#`);
  lines.push(`save`);
  lines.push(`Y`);
  lines.push(``);
  lines.push(`return`);

  return lines.join('\n');
}

function groupPortsByConfig(ports) {
  if (ports.length <= 1) return [{ ports: [ports[0]] }];
  const groups = [];
  let current = null;
  for (const port of ports) {
    const key = `${port.stpEdge}|${port.bpdu}`;
    if (!current || current.key !== key) {
      current = { key, ports: [port] };
      groups.push(current);
    } else {
      current.ports.push(port);
    }
  }
  return groups;
}

module.exports = { generateVLAN };
