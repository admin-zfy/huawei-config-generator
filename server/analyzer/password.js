/**
 * 弱密码 / 认证安全风险检测
 */
function analyzePassword(parsed) {
  const findings = [];

  // PW-001: 明文密码
  for (const user of parsed.users) {
    if (user.passwordType === 'simple') {
      findings.push({
        id: 'PW-001',
        severity: 'critical',
        category: 'password',
        title: '检测到明文密码存储',
        description: `用户 "${user.name}" 使用 simple (明文) 方式存储密码，密码在配置文件中直接可见。攻击者获取配置后可直接登录设备。`,
        location: `local-user ${user.name}`,
        remediation: '将密码改为 cipher 加密存储',
        command: `local-user ${user.name} password cipher <新密码>`,
      });
    }
  }

  // PW-002: cipher 但可能强度不够
  for (const user of parsed.users) {
    if (user.passwordType === 'cipher' && user.hashedLen < 20) {
      findings.push({
        id: 'PW-002',
        severity: 'high',
        category: 'password',
        title: `用户 "${user.name}" 密码哈希过短，可能为弱密码`,
        description: 'cipher 类型密码哈希长度不足（< 20 字符），可能为常见弱密码或短密码。建议更换为复杂度更高的密码（8位以上，含大小写字母、数字、特殊字符）。',
        location: `local-user ${user.name}`,
        remediation: '重新设置符合复杂度要求的密码',
        command: `local-user ${user.name} password cipher <强密码>`,
      });
    }
  }

  // PW-003: admin 用户（常见攻击目标）
  for (const user of parsed.users) {
    if (user.name.toLowerCase() === 'admin') {
      findings.push({
        id: 'PW-003',
        severity: 'medium',
        category: 'password',
        title: '使用默认用户名 "admin"，建议更换',
        description: '"admin" 是最常见的攻击目标用户名。建议创建业务专用管理员账户并禁用默认 admin 账户，或至少重命名为非标准名称。',
        location: `local-user admin`,
        remediation: '创建专用管理员账户，删除或重命名 admin 用户',
        command: `local-user netadmin password cipher <强密码>\nlocal-user netadmin service-type ssh\nundo local-user admin`,
      });
    }
  }

  // PW-004: VTY 无认证
  for (const vty of parsed.vtyLines) {
    if (vty.authMode === 'none') {
      findings.push({
        id: 'PW-004',
        severity: 'medium',
        category: 'password',
        title: 'VTY 线路未配置认证',
        description: 'VTY 虚拟终端线路使用 authentication-mode none，任何人无需密码即可远程登录。这是极其危险的配置。',
        location: 'user-interface vty 0 4',
        remediation: '启用 AAA 认证模式',
        command: 'user-interface vty 0 4\nauthentication-mode aaa\nprotocol inbound ssh',
      });
    }
  }

  // PW-005: 启用了 telnet 但无 local-user
  if (parsed.hasTelnet && parsed.users.length === 0) {
    findings.push({
      id: 'PW-005',
      severity: 'high',
      category: 'password',
      title: '启用了 Telnet/远程登录但未配置本地用户',
      description: '设备允许远程登录但未创建任何 local-user 账户。这可能导致使用默认账户或不安全的认证方式。',
      location: 'user-interface vty / local-user 配置段',
      remediation: '创建 local-user 并配置 AAA 认证',
      command: 'local-user netadmin password cipher <密码>\nlocal-user netadmin privilege level 15\nlocal-user netadmin service-type ssh',
    });
  }

  // PW-006: SNMP 弱 community
  for (const comm of parsed.snmp.communities) {
    if (comm === 'public' || comm === 'private') {
      findings.push({
        id: 'PW-006',
        severity: 'low',
        category: 'password',
        title: `SNMP community "${comm}" 使用默认值`,
        description: `SNMP community 字符串为默认值 "${comm}"，攻击者可利用此读取/写入 SNMP 数据。建议更换为复杂的私有 community 字符串。`,
        location: 'snmp-agent community',
        remediation: '更换 SNMP community 为复杂字符串',
        command: `undo snmp-agent community ${comm}\nsnmp-agent community <复杂community> mib-view <视图名>`,
      });
    }
  }

  return findings;
}

module.exports = { analyzePassword };
