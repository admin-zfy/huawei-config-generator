/**
 * 华为 STP/MSTP/RSTP 生成树协议配置生成器 — 设备感知 VRP CLI
 */
const { validateInterfaceName } = require('../utils/validator');
const { getDevice } = require('../device-definitions');

function generateSTP(params, deviceId) {
  const errors = [];
  const warnings = [];
  const dev = deviceId ? getDevice(deviceId) : null;

  // 非交换机设备不支持 STP
  if (dev && dev.category !== 'switch') {
    throw Object.assign(
      new Error(`${dev.label} 不支持 STP 生成树协议。STP 仅适用于交换机设备。`),
      { validationErrors: [`${dev.label} (${dev.category}) 不支持 STP`], warnings: [] }
    );
  }

  const defaultMode = dev ? dev.defaultStpMode : 'mstp';
  const mode = (params.mode || defaultMode).toLowerCase();

  if (!['mstp', 'rstp', 'stp'].includes(mode)) {
    errors.push('STP 模式必须为 mstp / rstp / stp');
  }

  const validInstances = [];
  if (params.instances && Array.isArray(params.instances)) {
    for (let i = 0; i < params.instances.length; i++) {
      const inst = params.instances[i];
      if (!inst.id && inst.id !== 0) { errors.push(`实例 #${i + 1}: 缺少实例ID`); continue; }
      const instId = parseInt(inst.id, 10);
      if (isNaN(instId) || instId < 0 || instId > 4094) { errors.push(`实例 #${i + 1}: ID 无效`); continue; }
      validInstances.push({ id: instId, vlans: inst.vlans || null, bridgePriority: inst.bridgePriority || null });
    }
  }

  const validEdgePorts = [];
  if (params.edgePorts && Array.isArray(params.edgePorts)) {
    for (let i = 0; i < params.edgePorts.length; i++) {
      const p = params.edgePorts[i];
      const name = typeof p === 'string' ? p : p.name;
      const ifCheck = validateInterfaceName(name, `边缘端口 #${i + 1}`);
      if (!ifCheck.valid) { errors.push(ifCheck.error); continue; }
      validEdgePorts.push(ifCheck.value);
    }
  }

  if (errors.length > 0) {
    throw Object.assign(new Error(errors.join('; ')), { validationErrors: errors, warnings });
  }

  const now = new Date().toLocaleString('zh-CN', { hour12: false });
  const devLabel = dev ? dev.systemHeader : 'Switch';
  const lines = [];

  lines.push(`#`);
  lines.push(`# 华为 ${devLabel} STP 生成树协议配置`);
  lines.push(`# 生成时间: ${now}`);
  lines.push(`# 模式: ${mode.toUpperCase()}`);
  if (dev) lines.push(`# 设备: ${dev.label}`);
  lines.push(`#`);
  lines.push(``);
  lines.push(`system-view`);
  lines.push(``);

  lines.push(`# 启用 ${mode.toUpperCase()} 模式`);
  if (mode === 'stp') lines.push(`stp mode stp`);
  else lines.push(`stp mode ${mode}`);
  lines.push(`stp enable`);
  if (mode !== 'stp') lines.push(`stp pathcost-standard dot1t`);
  lines.push(`stp timer forward-delay 1500`);
  lines.push(`stp timer hello 200`);
  lines.push(`stp timer max-age 2000`);
  lines.push(`#`);

  if (mode === 'mstp' && params.regionName) {
    lines.push(`# MST 区域配置`);
    lines.push(`stp region-configuration`);
    lines.push(` region-name ${params.regionName}`);
    if (params.revisionLevel !== undefined && params.revisionLevel !== null) {
      lines.push(` revision-level ${params.revisionLevel}`);
    }
    for (const inst of validInstances) {
      if (inst.vlans) lines.push(` instance ${inst.id} vlan ${inst.vlans}`);
    }
    lines.push(` active region-configuration`);
    lines.push(`#`);
  }

  if (params.rootPrimary === 'primary' || params.rootPrimary === 'secondary') {
    const role = params.rootPrimary === 'primary' ? '主根桥' : '备份根桥';
    lines.push(`# 设备角色: ${role}`);
    if (mode === 'rstp' || mode === 'stp') lines.push(`stp root ${params.rootPrimary}`);
    else lines.push(`stp instance 0 root ${params.rootPrimary}`);
    lines.push(`#`);
  }

  for (const inst of validInstances) {
    if (inst.bridgePriority !== null) {
      lines.push(`stp instance ${inst.id} priority ${inst.bridgePriority}`);
    }
  }

  if (validEdgePorts.length > 0) {
    lines.push(`# 边缘端口 (${validEdgePorts.length} 个)`);
    for (const name of validEdgePorts) {
      lines.push(`interface ${name}`);
      lines.push(` stp edged-port enable`);
      lines.push(` stp bpdu-filter enable`);
      lines.push(`#`);
    }
  }

  lines.push(`#`);
  lines.push(`# 全局保护`);
  lines.push(`stp bpdu-protection`);
  lines.push(`stp tc-protection threshold 3`);
  lines.push(`#`);
  lines.push(`# 验证命令`);
  lines.push(`# display stp brief`);
  if (mode === 'mstp') lines.push(`# display stp region-configuration`);
  lines.push(`#`);
  lines.push(`save`);
  lines.push(`Y`);
  lines.push(``);
  lines.push(`return`);

  return lines.join('\n');
}

module.exports = { generateSTP };
