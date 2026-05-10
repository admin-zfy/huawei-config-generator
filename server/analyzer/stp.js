/**
 * STP 生成树安全风险检测
 */
function analyzeSTP(parsed) {
  const findings = [];

  const stp = parsed.stp;
  if (!stp || !stp.mode) return findings;

  // STP-001: bpdu-protection 未启用
  if (!stp.bpduProtection) {
    findings.push({
      id: 'STP-001',
      severity: 'high',
      category: 'stp',
      title: '全局 BPDU 保护未启用 (stp bpdu-protection)',
      description: '未启用 BPDU 保护。攻击者可通过发送伪造 BPDU 报文尝试抢夺根桥角色，导致网络拓扑震荡。接入层边缘端口必须配合全局 bpdu-protection 使用。',
      location: '全局 STP 配置',
      remediation: '全局启用 BPDU 保护',
      command: 'stp bpdu-protection',
    });
  }

  // STP-002: tc-protection 未启用
  if (!stp.tcProtection) {
    findings.push({
      id: 'STP-002',
      severity: 'medium',
      category: 'stp',
      title: '全局 TC 保护未启用 (stp tc-protection)',
      description: '未启用 TC-BPDU 攻击防御。攻击者可能通过频繁发送 TC 报文导致 MAC 地址表反复刷新，造成网络性能下降。',
      location: '全局 STP 配置',
      remediation: '启用 TC 保护并设置阈值',
      command: 'stp tc-protection\nstp tc-protection threshold 3',
    });
  }

  // STP-003/004: 边缘端口检查
  for (const iface of parsed.interfaces) {
    if (iface.type !== 'access') continue;

    if (!iface.stpEdge) {
      findings.push({
        id: 'STP-003',
        severity: 'high',
        category: 'stp',
        title: `Access 端口 ${iface.name} 未启用 STP 边缘端口`,
        description: '接入终端设备的端口未启用 stp edged-port enable。终端上下线会触发 STP 拓扑变更（TCN），导致全网 MAC 表刷新。边缘端口可跳过 STP 计算，直接进入转发状态，同时避免产生 TCN。',
        location: `interface ${iface.name}`,
        remediation: '将接入终端端口配置为 STP 边缘端口',
        command: `interface ${iface.name}\nstp edged-port enable\nstp bpdu-filter enable`,
      });
    } else if (iface.stpEdge && !iface.bpduFilter) {
      findings.push({
        id: 'STP-004',
        severity: 'medium',
        category: 'stp',
        title: `Access 端口 ${iface.name} 启用了边缘端口但未启用 BPDU 过滤`,
        description: '边缘端口启用了 edged-port enable 但未同时启用 bpdu-filter enable。边缘端口在收到 BPDU 后会丧失边缘属性，恢复参与 STP 计算。建议同时启用 BPDU 过滤以防止此问题。',
        location: `interface ${iface.name}`,
        remediation: '在边缘端口上同时启用 BPDU 过滤',
        command: `interface ${iface.name}\nstp bpdu-filter enable`,
      });
    }
  }

  return findings;
}

module.exports = { analyzeSTP };
