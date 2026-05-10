/**
 * 华为 USG 防火墙安全区域/安全策略配置生成器 — 真实 VRP CLI
 */
const { getDevice } = require('../device-definitions');
const { validateInterfaceName } = require('../utils/validator');

function generateSecurity(params, deviceId) {
  const errors = [];
  const warnings = [];
  const dev = deviceId ? getDevice(deviceId) : null;

  if (dev && dev.category !== 'firewall') {
    throw Object.assign(
      new Error(`安全区域/策略仅适用于防火墙设备，当前: ${dev.label}`),
      { validationErrors: ['安全策略仅适用于防火墙'], warnings: [] }
    );
  }

  // 安全区域
  const zones = params.zones || [
    { name: 'trust', priority: 85, interfaces: ['GigabitEthernet1/0/0', 'GigabitEthernet1/0/1'] },
    { name: 'untrust', priority: 5, interfaces: ['GigabitEthernet1/0/2'] },
    { name: 'dmz', priority: 50, interfaces: ['GigabitEthernet1/0/3'] },
  ];

  // 校验接口
  for (const zone of zones) {
    if (zone.interfaces && Array.isArray(zone.interfaces)) {
      for (const ifName of zone.interfaces) {
        if (typeof ifName === 'string' && ifName.trim()) {
          const check = validateInterfaceName(ifName, `区域 "${zone.name}" 接口`);
          if (!check.valid) errors.push(check.error);
        }
      }
    }
  }

  if (errors.length > 0) {
    throw Object.assign(new Error(errors.join('; ')), { validationErrors: errors, warnings });
  }

  const now = new Date().toLocaleString('zh-CN', { hour12: false });
  const devLabel = dev ? dev.systemHeader : 'USG6000';
  const lines = [];

  lines.push(`#`);
  lines.push(`# 华为 ${devLabel} 安全区域 & 策略配置`);
  lines.push(`# 生成时间: ${now}`);
  if (dev) lines.push(`# 设备: ${dev.label}`);
  lines.push(`#`);
  lines.push(``);
  lines.push(`system-view`);
  lines.push(``);

  // ===== 安全区域 =====
  lines.push(`# ===== 安全区域定义 =====`);
  for (const zone of zones) {
    lines.push(`#`);
    lines.push(`firewall zone ${zone.name}`);
    lines.push(` set priority ${zone.priority || 50}`);

    if (zone.interfaces && zone.interfaces.length > 0) {
      for (const ifName of zone.interfaces) {
        if (ifName && ifName.trim()) {
          lines.push(` add interface ${ifName.trim()}`);
        }
      }
    }
    lines.push(`#`);
    lines.push(`quit`);
  }
  lines.push(`#`);

  // ===== 安全策略 =====
  lines.push(`# ===== 安全策略 =====`);
  lines.push(`security-policy`);
  lines.push(`#`);

  const policies = params.policies || [
    { name: 'Trust_to_Untrust', srcZone: 'trust', dstZone: 'untrust', srcAddr: 'any', dstAddr: 'any', service: 'any', action: 'permit', description: '内网访问外网' },
    { name: 'Untrust_to_DMZ', srcZone: 'untrust', dstZone: 'dmz', srcAddr: 'any', dstAddr: 'any', service: 'http https', action: 'permit', description: '外网访问DMZ服务' },
    { name: 'Default_Deny_All', srcZone: 'any', dstZone: 'any', srcAddr: 'any', dstAddr: 'any', service: 'any', action: 'deny', description: '默认拒绝所有' },
  ];

  for (const p of policies) {
    lines.push(` rule name ${p.name}`);
    if (p.description) lines.push(`  description ${p.description}`);
    lines.push(`  source-zone ${p.srcZone || 'any'}`);
    lines.push(`  destination-zone ${p.dstZone || 'any'}`);
    if (p.srcAddr) lines.push(`  source-address ${p.srcAddr}`);
    if (p.dstAddr) lines.push(`  destination-address ${p.dstAddr}`);
    if (p.service) lines.push(`  service ${p.service}`);
    if (p.application) lines.push(`  application ${p.application}`);
    if (p.timeRange) lines.push(`  time-range ${p.timeRange}`);
    if (p.profile) lines.push(`  profile ${p.profile}`);
    lines.push(`  action ${p.action || 'deny'}`);
    if (p.logging) lines.push(`  logging`);
    lines.push(`#`);
  }

  lines.push(`quit`);
  lines.push(`#`);

  // ===== NAT Policy (可选) =====
  if (params.enableNat) {
    lines.push(`# ===== NAT 策略 =====`);
    lines.push(`nat-policy`);
    lines.push(` rule name NAT_Outbound`);
    lines.push(`  source-zone trust`);
    lines.push(`  destination-zone untrust`);
    lines.push(`  source-address any`);
    lines.push(`  action source-nat easy-ip`);
    lines.push(`#`);
    lines.push(`quit`);
    lines.push(`#`);
  }

  // ===== 验证 =====
  lines.push(`# ===== 验证命令 =====`);
  lines.push(`# display firewall zone`);
  lines.push(`# display security-policy rule all`);
  lines.push(`# display firewall session table`);
  lines.push(`# display nat-policy rule all`);
  lines.push(`#`);
  lines.push(`save`);
  lines.push(`Y`);
  lines.push(``);
  lines.push(`return`);

  return lines.join('\n');
}

module.exports = { generateSecurity };
