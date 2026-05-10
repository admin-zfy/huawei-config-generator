/**
 * VLAN 安全风险检测
 */
function analyzeVLAN(parsed) {
  const findings = [];

  // VLAN-001: 使用 VLAN 1
  if (parsed.vlan1Used || parsed.vlans.includes(1)) {
    findings.push({
      id: 'VLAN-001',
      severity: 'high',
      category: 'vlan',
      title: '配置中使用了 VLAN 1',
      description: 'VLAN 1 是交换机的默认 VLAN，所有端口默认属于 VLAN 1。安全最佳实践要求禁止在 VLAN 1 上传输业务数据，应将所有端口从 VLAN 1 迁移到业务 VLAN，并将 VLAN 1 的管理功能（如 VLANIF 1 IP）迁移到专用管理 VLAN。',
      location: 'VLAN 1 配置',
      remediation: '将所有业务端口从 VLAN 1 迁移到专用业务 VLAN，管理 IP 迁移到管理 VLAN（如 VLAN 99）',
      command: '# 创建管理 VLAN\nvlan batch 99\ninterface Vlanif99\n ip address <管理IP> <掩码>\n# 将端口从 VLAN 1 移除\ninterface range <端口列表>\n port default vlan <业务VLAN>',
    });
  }

  // VLAN-002: VLANIF 无描述
  for (const vlanif of parsed.vlanifs) {
    if (!vlanif.description) {
      findings.push({
        id: 'VLAN-002',
        severity: 'medium',
        category: 'vlan',
        title: `Vlanif${vlanif.vlanId} 未配置 description`,
        description: 'VLANIF 接口缺少描述信息。三层网关接口应标注其用途（如"Gateway_VLAN100_办公网段"），便于运维和故障排查。',
        location: `interface Vlanif${vlanif.vlanId}`,
        remediation: '为 VLANIF 接口添加描述',
        command: `interface Vlanif${vlanif.vlanId}\ndescription Gateway_VLAN${vlanif.vlanId}`,
      });
    }
  }

  // VLAN-003: 孤立 VLAN (创建了但未在任何端口上使用)
  if (parsed.unusedVlans && parsed.unusedVlans.length > 0) {
    findings.push({
      id: 'VLAN-003',
      severity: 'low',
      category: 'vlan',
      title: `检测到 ${parsed.unusedVlans.length} 个孤立 VLAN: ${parsed.unusedVlans.join(', ')}`,
      description: '这些 VLAN 已通过 vlan batch 创建，但未在任何 Access/Trunk 端口或 VLANIF 接口上使用。孤立 VLAN 增加管理复杂度，建议删除不使用的 VLAN。',
      location: 'vlan batch 配置',
      remediation: '删除未使用的 VLAN 或为其分配端口',
      command: `undo vlan batch ${parsed.unusedVlans.join(' ')}`,
    });
  }

  // VLAN-004: Access 端口 default vlan 为 1
  for (const iface of parsed.interfaces) {
    if (iface.type === 'access' && iface.vlan === 1) {
      findings.push({
        id: 'VLAN-004',
        severity: 'medium',
        category: 'vlan',
        title: `Access 端口 ${iface.name} 的 default vlan 为 1`,
        description: '该 Access 端口仍属于 VLAN 1。建议将接入端口划入业务 VLAN 以实现二层隔离。',
        location: `interface ${iface.name}`,
        remediation: '将该端口划入业务 VLAN',
        command: `interface ${iface.name}\nport default vlan <业务VLAN>`,
      });
    }
  }

  return findings;
}

module.exports = { analyzeVLAN };
