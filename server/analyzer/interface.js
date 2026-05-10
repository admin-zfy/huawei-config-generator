/**
 * 未使用接口 / 端口安全风险检测
 */
function analyzeInterface(parsed) {
  const findings = [];

  if (!parsed.interfaces || parsed.interfaces.length === 0) return findings;

  for (const iface of parsed.interfaces) {
    // IF-001: shutdown 端口
    if (iface.shutdown) {
      findings.push({
        id: 'IF-001',
        severity: 'low',
        category: 'interface',
        title: `接口 ${iface.name} 处于 shutdown 状态`,
        description: `接口已通过 shutdown 命令手动关闭。如果此端口不再使用，建议删除配置以保持整洁；如需使用请执行 undo shutdown。`,
        location: `interface ${iface.name}`,
        remediation: '如不使用请清理配置，如需使用请启用',
        command: `interface ${iface.name}\nundo shutdown`,
      });
    }

    // IF-002: Access 端口无描述
    if (iface.type === 'access' && !iface.description) {
      findings.push({
        id: 'IF-002',
        severity: 'medium',
        category: 'interface',
        title: `Access 端口 ${iface.name} 未配置 description`,
        description: '缺少端口描述信息，不利于运维管理和故障排查。建议为每个业务端口添加描述（如连接的设备、位置、VLAN等）。',
        location: `interface ${iface.name}`,
        remediation: '添加端口描述',
        command: `interface ${iface.name}\ndescription <设备名_位置_VLAN${iface.vlan || ''}>`,
      });
    }

    // IF-003: 无任何配置的物理口
    if (!iface.configured && !iface.shutdown) {
      findings.push({
        id: 'IF-003',
        severity: 'medium',
        category: 'interface',
        title: `接口 ${iface.name} 无任何配置（默认状态）`,
        description: '物理接口处于出厂默认状态。未使用的接口应执行 shutdown 或放入隔离 VLAN 以降低安全风险（防止非法设备接入）。',
        location: `interface ${iface.name}`,
        remediation: '关闭未使用端口或划入黑洞 VLAN',
        command: `interface ${iface.name}\nshutdown`,
      });
    }

    // IF-004: Trunk allow all
    if (iface.type === 'trunk' && iface.allowedVlans === 'all') {
      findings.push({
        id: 'IF-004',
        severity: 'low',
        category: 'interface',
        title: `Trunk 端口 ${iface.name} 允许所有 VLAN (port trunk allow-pass vlan all)`,
        description: 'Trunk 口允许所有 VLAN 通过，可能将不必要的广播域扩展到对端设备。建议仅允许实际需要的 VLAN。',
        location: `interface ${iface.name}`,
        remediation: '限制 Trunk 口允许通过的 VLAN 范围',
        command: `interface ${iface.name}\nundo port trunk allow-pass vlan all\nport trunk allow-pass vlan <需要的VLAN列表>`,
      });
    }
  }

  return findings;
}

module.exports = { analyzeInterface };
