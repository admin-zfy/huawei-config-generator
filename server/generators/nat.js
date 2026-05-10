/**
 * 华为 AR 路由器 NAT / DHCP Server 配置生成器 — 真实 VRP CLI
 */
const { validateIPAddress, validateSubnetMask, validateInterfaceName } = require('../utils/validator');
const { getDevice } = require('../device-definitions');

function generateNAT(params, deviceId) {
  const errors = [];
  const warnings = [];
  const dev = deviceId ? getDevice(deviceId) : null;

  if (dev && dev.category !== 'router') {
    throw Object.assign(
      new Error(`NAT/DHCP 仅适用于路由器设备，当前设备: ${dev.label}`),
      { validationErrors: [`${dev.label} 不支持 NAT/DHCP Server`], warnings: [] }
    );
  }

  const wanInterface = params.wanInterface || 'GigabitEthernet0/0/0';
  const lanInterface = params.lanInterface || 'GigabitEthernet0/0/1';
  const aclNumber = params.aclNumber || '2000';

  // WAN 口校验
  const wanCheck = validateInterfaceName(wanInterface, 'WAN接口');
  if (!wanCheck.valid) errors.push(wanCheck.error);

  // LAN 口校验
  const lanCheck = validateInterfaceName(lanInterface, 'LAN接口');
  if (!lanCheck.valid) errors.push(lanCheck.error);

  // DHCP 池校验
  const validPools = [];
  if (params.dhcpPools && Array.isArray(params.dhcpPools)) {
    for (let i = 0; i < params.dhcpPools.length; i++) {
      const pool = params.dhcpPools[i];
      const poolErrors = [];
      if (!pool.name) poolErrors.push('缺少池名称');
      if (!pool.network) poolErrors.push('缺少网络地址');
      if (pool.network) {
        const ipc = validateIPAddress(pool.network, `DHCP池 #${i + 1} 网络地址`);
        if (!ipc.valid) poolErrors.push(ipc.error);
      }
      if (pool.mask) {
        const mc = validateSubnetMask(pool.mask, `DHCP池 #${i + 1} 子网掩码`);
        if (!mc.valid) poolErrors.push(mc.error);
      }
      if (pool.gateway) {
        const gc = validateIPAddress(pool.gateway, `DHCP池 #${i + 1} 网关`);
        if (!gc.valid) poolErrors.push(gc.error);
      }
      if (pool.dnsPrimary) {
        const dc = validateIPAddress(pool.dnsPrimary, `DHCP池 #${i + 1} DNS`);
        if (!dc.valid) poolErrors.push(dc.error);
      }

      if (poolErrors.length > 0) {
        errors.push(`DHCP池 #${i + 1}: ${poolErrors.join('; ')}`);
        continue;
      }

      validPools.push({
        name: pool.name,
        network: pool.network,
        mask: pool.mask || '255.255.255.0',
        gateway: pool.gateway || null,
        dnsPrimary: pool.dnsPrimary || null,
        dnsSecondary: pool.dnsSecondary || null,
        leaseDays: pool.leaseDays || 1,
        excludedStart: pool.excludedStart || null,
        excludedEnd: pool.excludedEnd || null,
      });
    }
  }

  if (errors.length > 0) {
    throw Object.assign(new Error(errors.join('; ')), { validationErrors: errors, warnings });
  }

  const now = new Date().toLocaleString('zh-CN', { hour12: false });
  const devLabel = dev ? dev.systemHeader : 'AR Router';
  const lines = [];

  lines.push(`#`);
  lines.push(`# 华为 ${devLabel} NAT / DHCP 配置`);
  lines.push(`# 生成时间: ${now}`);
  lines.push(`# WAN: ${wanInterface} | LAN: ${lanInterface}`);
  if (dev) lines.push(`# 设备: ${dev.label}`);
  lines.push(`#`);
  lines.push(``);
  lines.push(`system-view`);
  lines.push(``);

  // ===== ACL for NAT =====
  lines.push(`# NAT ACL — 定义允许上网的内网地址段`);
  lines.push(`acl ${aclNumber}`);
  if (validPools.length > 0) {
    for (const pool of validPools) {
      lines.push(` rule 5 permit source ${pool.network} 0.0.0.255`);
    }
  } else {
    lines.push(` rule 5 permit source 192.168.1.0 0.0.0.255`);
  }
  lines.push(`#`);
  lines.push(`quit`);
  lines.push(`#`);

  // ===== NAT Outbound =====
  lines.push(`# NAT Outbound — WAN 口地址转换`);
  lines.push(`interface ${wanInterface}`);
  lines.push(` nat outbound ${aclNumber}`);
  lines.push(`#`);

  // NAT Server (端口映射)
  if (params.natServers && Array.isArray(params.natServers)) {
    for (const ns of params.natServers) {
      if (ns.protocol && ns.globalPort && ns.insideIP && ns.insidePort) {
        lines.push(` nat server protocol ${ns.protocol} global current-interface ${ns.globalPort} inside ${ns.insideIP} ${ns.insidePort}`);
      }
    }
  }
  lines.push(`#`);
  lines.push(`quit`);
  lines.push(`#`);

  // ===== DHCP Server =====
  if (validPools.length > 0) {
    lines.push(`#`);
    lines.push(`# DHCP Server 配置`);
    lines.push(`dhcp enable`);
    lines.push(`#`);

    for (const pool of validPools) {
      lines.push(`ip pool ${pool.name}`);
      lines.push(` gateway-list ${pool.gateway || pool.network.replace(/\d+$/, '1')}`);
      lines.push(` network ${pool.network} mask ${pool.mask}`);
      if (pool.dnsPrimary) {
        const dns = pool.dnsSecondary
          ? `${pool.dnsPrimary} ${pool.dnsSecondary}`
          : pool.dnsPrimary;
        lines.push(` dns-list ${dns}`);
      }
      if (pool.excludedStart) {
        lines.push(` excluded-ip-address ${pool.excludedStart} ${pool.excludedEnd || pool.excludedStart}`);
      }
      lines.push(` lease day ${pool.leaseDays} hour 0 minute 0`);
      lines.push(`#`);
    }

    lines.push(`# LAN 口启用 DHCP`);
    lines.push(`interface ${lanInterface}`);
    lines.push(` dhcp select global`);
    lines.push(`#`);
    lines.push(`quit`);
    lines.push(`#`);
  }

  lines.push(`#`);
  lines.push(`# 验证命令`);
  lines.push(`# display nat outbound`);
  lines.push(`# display ip pool`);
  lines.push(`# display dhcp server statistics`);
  lines.push(`#`);
  lines.push(`save`);
  lines.push(`Y`);
  lines.push(``);
  lines.push(`return`);

  return lines.join('\n');
}

module.exports = { generateNAT };
