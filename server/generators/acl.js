/**
 * 华为 ACL / 防火墙安全策略 配置生成器 — 真实 VRP CLI (设备感知)
 */
const { validateACLNumber, validateIPAddress, isValidIPv4 } = require('../utils/validator');
const { getDevice } = require('../device-definitions');

function generateACL(params, deviceId) {
  const errors = [];
  const dev = deviceId ? getDevice(deviceId) : null;

  // 防火墙走安全策略路线
  if (dev && dev.category === 'firewall') {
    return generateSecurityPolicy(params, dev, errors);
  }

  const aclCheck = validateACLNumber(params.aclNumber);
  if (!aclCheck.valid) errors.push(aclCheck.error);
  const aclNum = aclCheck.value || parseInt(params.aclNumber, 10);
  const aclType = aclCheck.aclType || 'ACL';

  const validRules = [];
  if (params.rules && Array.isArray(params.rules)) {
    for (let i = 0; i < params.rules.length; i++) {
      const rule = params.rules[i];
      const ruleErrors = [];
      const ruleId = rule.id || (i + 1) * 5;
      const action = rule.action === 'deny' ? 'deny' : 'permit';
      const protocol = rule.protocol || 'ip';

      if (rule.source && !isValidIPv4(rule.source)) ruleErrors.push(`源IP "${rule.source}" 格式无效`);
      if (rule.sourceMask && !isValidIPv4(rule.sourceMask)) ruleErrors.push(`源通配符 "${rule.sourceMask}" 格式无效`);
      if (rule.destination && !isValidIPv4(rule.destination)) ruleErrors.push(`目标IP "${rule.destination}" 格式无效`);
      if (rule.destMask && !isValidIPv4(rule.destMask)) ruleErrors.push(`目标通配符 "${rule.destMask}" 格式无效`);

      if (ruleErrors.length > 0) { errors.push(`规则 #${i + 1}: ${ruleErrors.join('; ')}`); continue; }

      validRules.push({
        ruleId, action, protocol,
        source: rule.source || null, sourceMask: rule.sourceMask || '0.0.0.0',
        sourcePort: rule.sourcePort || null, sourcePortOp: rule.sourcePortOperator || null,
        destination: rule.destination || null, destMask: rule.destMask || '0.0.0.0',
        destPort: rule.destPort || null, destPortOp: rule.destPortOperator || null,
        timeRange: rule.timeRange || null,
        description: rule.description || `ACL_${aclNum}_Rule_${ruleId}`,
      });
    }
  }

  if (errors.length > 0) {
    throw Object.assign(new Error(errors.join('; ')), { validationErrors: errors, warnings: [] });
  }

  const now = new Date().toLocaleString('zh-CN', { hour12: false });
  const devLabel = dev ? dev.systemHeader : 'VRP Device';
  const lines = [];

  lines.push(`#`);
  lines.push(`# 华为 ${devLabel} ACL 访问控制列表`);
  lines.push(`# 生成时间: ${now}`);
  lines.push(`# ACL: ${aclNum} — ${aclType}`);
  if (dev) lines.push(`# 设备: ${dev.label}`);
  lines.push(`#`);
  lines.push(``);
  lines.push(`system-view`);
  lines.push(``);

  lines.push(`acl ${aclNum}`);
  lines.push(` description ${aclType} - Configuration`);

  for (const rule of validRules) {
    let ruleLine = ` rule ${rule.ruleId} ${rule.action} ${rule.protocol}`;
    if (rule.source) ruleLine += ` source ${rule.source} ${rule.sourceMask}`;
    if (rule.sourcePort) ruleLine += ` source-port ${rule.sourcePortOp || 'eq'} ${rule.sourcePort}`;
    if (rule.destination) ruleLine += ` destination ${rule.destination} ${rule.destMask}`;
    if (rule.destPort) ruleLine += ` destination-port ${rule.destPortOp || 'eq'} ${rule.destPort}`;
    if (rule.timeRange) ruleLine += ` time-range ${rule.timeRange}`;
    lines.push(` description ${rule.description}`);
    lines.push(ruleLine);
  }

  lines.push(`#`);
  lines.push(`# 接口应用 ACL`);
  if (dev && dev.category === 'router') {
    lines.push(`# interface GigabitEthernet0/0/0`);
  } else {
    lines.push(`# interface GigabitEthernet0/0/1`);
  }
  lines.push(`#  traffic-filter inbound acl ${aclNum}`);
  lines.push(`#`);
  lines.push(`# display acl ${aclNum}`);
  lines.push(`#`);
  lines.push(`save`);
  lines.push(`Y`);
  lines.push(``);
  lines.push(`return`);

  return lines.join('\n');
}

function generateSecurityPolicy(params, dev, errors) {
  const validPolicies = [];

  if (params.rules && Array.isArray(params.rules)) {
    for (let i = 0; i < params.rules.length; i++) {
      const rule = params.rules[i];
      const name = rule.name || `policy-${i + 1}`;
      const action = rule.action === 'deny' ? 'deny' : 'permit';
      const srcZone = rule.sourceZone || 'untrust';
      const dstZone = rule.destZone || 'trust';
      const srcAddr = rule.source || 'any';
      const dstAddr = rule.destination || 'any';
      const service = rule.service || (rule.protocol || 'any');

      if (rule.source && !isValidIPv4(rule.source) && rule.source !== 'any') {
        errors.push(`策略 "${name}" 源地址 "${rule.source}" 格式无效`);
        continue;
      }
      if (rule.destination && !isValidIPv4(rule.destination) && rule.destination !== 'any') {
        errors.push(`策略 "${name}" 目标地址 "${rule.destination}" 格式无效`);
        continue;
      }

      validPolicies.push({ name, action, srcZone, dstZone, srcAddr, dstAddr, service, description: rule.description || null });
    }
  }

  if (errors.length > 0) {
    throw Object.assign(new Error(errors.join('; ')), { validationErrors: errors, warnings: [] });
  }

  const now = new Date().toLocaleString('zh-CN', { hour12: false });
  const lines = [];

  lines.push(`#`);
  lines.push(`# 华为 ${dev.systemHeader} 安全策略配置`);
  lines.push(`# 生成时间: ${now}`);
  lines.push(`# 设备: ${dev.label}`);
  lines.push(`#`);
  lines.push(``);
  lines.push(`system-view`);
  lines.push(``);

  lines.push(`# 进入安全策略视图`);
  lines.push(`security-policy`);
  lines.push(`#`);

  if (validPolicies.length === 0) {
    // 默认示例策略
    lines.push(`# 默认 interzone 策略示例`);
    lines.push(` rule name Trust_to_Untrust`);
    lines.push(`  source-zone trust`);
    lines.push(`  destination-zone untrust`);
    lines.push(`  source-address any`);
    lines.push(`  destination-address any`);
    lines.push(`  service any`);
    lines.push(`  action permit`);
    lines.push(`#`);
    lines.push(` rule name Untrust_to_Trust`);
    lines.push(`  source-zone untrust`);
    lines.push(`  destination-zone trust`);
    lines.push(`  source-address any`);
    lines.push(`  destination-address any`);
    lines.push(`  service any`);
    lines.push(`  action deny`);
    lines.push(`#`);
  } else {
    for (const p of validPolicies) {
      lines.push(` rule name ${p.name}`);
      if (p.description) lines.push(`  description ${p.description}`);
      lines.push(`  source-zone ${p.srcZone}`);
      lines.push(`  destination-zone ${p.dstZone}`);
      lines.push(`  source-address ${p.srcAddr}`);
      lines.push(`  destination-address ${p.dstAddr}`);
      lines.push(`  service ${p.service}`);
      lines.push(`  action ${p.action}`);
      lines.push(`#`);
    }
  }

  lines.push(`quit`);
  lines.push(`#`);
  lines.push(`# 验证命令`);
  lines.push(`# display security-policy rule all`);
  lines.push(`# display firewall session table`);
  lines.push(`#`);
  lines.push(`save`);
  lines.push(`Y`);
  lines.push(``);
  lines.push(`return`);

  return lines.join('\n');
}

module.exports = { generateACL };
