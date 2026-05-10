/**
 * OSPF 路由协议安全风险检测
 */
function analyzeOSPF(parsed) {
  const findings = [];

  if (!parsed.ospf || !parsed.ospf.routerId) return findings;

  const ospf = parsed.ospf;

  // OSPF-001: 未配置区域认证
  if (!ospf.authConfigured) {
    findings.push({
      id: 'OSPF-001',
      severity: 'high',
      category: 'ospf',
      title: 'OSPF 未配置区域认证',
      description: 'OSPF 未启用认证，任何设备只要接入同网段并配置相同 Area ID 即可建立 OSPF 邻居关系并注入路由。攻击者可利用此漏洞注入虚假路由或发起路由表投毒攻击。强烈建议启用 MD5 区域认证。',
      location: `ospf ${ospf.processId}`,
      remediation: '为 OSPF 区域启用 MD5 认证',
      command: `ospf ${ospf.processId}\narea ${ospf.areas[0]?.id || '0'}\n authentication-mode md5 1 cipher <密钥>`,
    });
  }

  // OSPF-002: 未配置 silent-interface
  const accessIfaces = parsed.interfaces.filter(i => i.type === 'access');
  if (ospf.silentInterfaces.length === 0 && accessIfaces.length > 0) {
    findings.push({
      id: 'OSPF-002',
      severity: 'medium',
      category: 'ospf',
      title: 'OSPF 未配置 silent-interface 在用户接入侧',
      description: '用户接入端口（Access 端口）无需发送 OSPF Hello 报文。不配置 silent-interface 会导致：1) OSPF Hello 组播报文被泛洪到接入终端 2) 攻击者可能伪装 OSPF 邻居。',
      location: `ospf ${ospf.processId}`,
      remediation: '在面向用户的 VLANIF 和接口上配置静默',
      command: 'ospf 1\n silent-interface Vlanif<接入VLAN>',
    });
  }

  // OSPF-003: hello/dead 默认值
  findings.push({
    id: 'OSPF-003',
    severity: 'medium',
    category: 'ospf',
    title: 'OSPF 计时器使用默认值 (hello=10s, dead=40s)',
    description: '检测到 OSPF 接口使用默认 hello/dead 计时器。在大型网络中，较长的 hello 间隔可减少路由协议开销。广播网络中 dead 应为 hello 的 4 倍。',
    location: `ospf ${ospf.processId}`,
    remediation: '根据网络规模调优 OSPF 计时器',
    command: '# 在接口视图下:\nospf timer hello 10\nospf timer dead 40',
  });

  // OSPF-004: bandwidth-reference 默认值
  findings.push({
    id: 'OSPF-004',
    severity: 'low',
    category: 'ospf',
    title: 'bandwidth-reference 可能为默认值 (100Mbps)',
    description: 'OSPF 开销计算使用 bandwidth-reference 作为参考带宽。默认 100Mbps 意味着 1Gbps 链路的开销也是 1（与 100Mbps 相同）。建议将 reference 设为 10Gbps 以上以区分高速链路。',
    location: `ospf ${ospf.processId}`,
    remediation: '调整带宽参考值为 10Gbps+',
    command: `ospf ${ospf.processId}\n bandwidth-reference 10000`,
  });

  return findings;
}

module.exports = { analyzeOSPF };
