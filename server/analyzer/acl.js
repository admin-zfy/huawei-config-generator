/**
 * ACL 访问控制列表安全风险检测
 */
function analyzeACL(parsed) {
  const findings = [];

  if (!parsed.acls || parsed.acls.length === 0) return findings;

  for (const acl of parsed.acls) {
    // ACL-001: any-any permit 规则
    for (const rule of acl.rules) {
      if (rule.action === 'permit' && rule.hasAnySource && rule.hasAnyDest) {
        findings.push({
          id: 'ACL-001',
          severity: 'critical',
          category: 'acl',
          title: `ACL ${acl.number} 存在全通规则 (rule ${rule.id} permit ip source any destination any)`,
          description: '该规则允许任意源到任意目标的 IP 流量，相当于 ACL 完全失效。如果此 ACL 应用于 NAT Outbound 或流量过滤，将无任何访问控制效果。如果是 NAT ACL，建议精确匹配内网地址段。',
          location: `acl ${acl.number} rule ${rule.id}`,
          remediation: '将 any 替换为具体的内网地址段',
          command: `acl ${acl.number}\nundo rule ${rule.id}\nrule ${rule.id} permit ip source <内网地址段> <通配符>`,
        });
      }
    }

    // ACL-002: 规则无描述
    const hasDescribed = acl.rules.some(r => r.id); // all rules have IDs but checking description
    const rulesWithoutDesc = !acl.description;
    if (rulesWithoutDesc) {
      findings.push({
        id: 'ACL-002',
        severity: 'medium',
        category: 'acl',
        title: `ACL ${acl.number} 无 description，缺少用途说明`,
        description: 'ACL 及其规则缺少描述信息。在网络规模扩大后，难以追溯每条规则的用途，增加运维风险。',
        location: `acl ${acl.number}`,
        remediation: '为 ACL 添加描述说明用途',
        command: `acl ${acl.number}\ndescription <ACL用途描述>`,
      });
    }

    // ACL-003: 定义了但未在接口上应用
    if (!acl.appliedOnInterface) {
      findings.push({
        id: 'ACL-003',
        severity: 'low',
        category: 'acl',
        title: `ACL ${acl.number} 已定义但未在任何接口上应用`,
        description: '该 ACL 已配置规则但未通过 traffic-filter 应用到任何接口，处于"孤立"状态。如果 ACL 已不再使用，建议删除以保持配置整洁。',
        location: `acl ${acl.number}`,
        remediation: '应用 ACL 到接口或删除未使用的 ACL',
        command: `# 应用到接口:\ninterface <接口名>\n traffic-filter inbound acl ${acl.number}\n# 或删除:\nundo acl ${acl.number}`,
      });
    }

    // ACL-004: 高级 ACL 最后无显式 deny
    if (acl.number >= 3000 && acl.number <= 3999) {
      const lastRule = acl.rules[acl.rules.length - 1];
      if (lastRule && lastRule.action !== 'deny') {
        findings.push({
          id: 'ACL-004',
          severity: 'medium',
          category: 'acl',
          title: `高级 ACL ${acl.number} 末尾缺少显式 deny 规则`,
          description: '高级 ACL 未在最后添加 deny 规则。虽然 VRP 默认会在 ACL 末尾隐式拒绝，但在嵌套 ACL 引用场景下，显式 deny 能使规则意图更明确，并可在 deny 规则上配置 logging 记录被拒绝的流量。',
          location: `acl ${acl.number} (末尾)`,
          remediation: '在 ACL 末尾添加显式 deny 规则（可选 logging）',
          command: `acl ${acl.number}\nrule 100 deny ip`,
        });
      }
    }
  }

  return findings;
}

module.exports = { analyzeACL };
