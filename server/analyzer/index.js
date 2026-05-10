/**
 * 配置分析编排器 — 运行所有分析模块并汇总结果
 */
const { analyzePassword } = require('./password');
const { analyzeInterface } = require('./interface');
const { analyzeSTP } = require('./stp');
const { analyzeVLAN } = require('./vlan');
const { analyzeACL } = require('./acl');
const { analyzeOSPF } = require('./ospf');

const ANALYZERS = [
  { name: 'password',  fn: analyzePassword,  label: '密码/认证安全' },
  { name: 'interface', fn: analyzeInterface, label: '接口管理' },
  { name: 'stp',       fn: analyzeSTP,       label: 'STP安全' },
  { name: 'vlan',      fn: analyzeVLAN,      label: 'VLAN安全' },
  { name: 'acl',       fn: analyzeACL,       label: 'ACL风险' },
  { name: 'ospf',      fn: analyzeOSPF,      label: 'OSPF路由安全' },
];

function runAnalysis(parsedConfig) {
  if (!parsedConfig) return { findings: [], summary: {}, byCategory: {} };

  const allFindings = [];

  for (const analyzer of ANALYZERS) {
    try {
      const findings = analyzer.fn(parsedConfig);
      allFindings.push(...findings);
    } catch (err) {
      console.error(`[Analyzer] ${analyzer.name} 分析异常:`, err.message);
    }
  }

  // 按严重度排序: critical > high > medium > low > info
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  allFindings.sort((a, b) => {
    const sa = severityOrder[a.severity] ?? 5;
    const sb = severityOrder[b.severity] ?? 5;
    return sa - sb;
  });

  // 摘要统计
  const summary = {
    total: allFindings.length,
    critical: allFindings.filter(f => f.severity === 'critical').length,
    high: allFindings.filter(f => f.severity === 'high').length,
    medium: allFindings.filter(f => f.severity === 'medium').length,
    low: allFindings.filter(f => f.severity === 'low').length,
    info: allFindings.filter(f => f.severity === 'info').length,
    score: null, // 下面计算
  };

  // 安全评分: 100 - (critical*20 + high*10 + medium*5 + low*2)
  const penalty = (summary.critical * 20) + (summary.high * 10) + (summary.medium * 5) + (summary.low * 2);
  summary.score = Math.max(0, Math.min(100, 100 - penalty));
  summary.grade = summary.score >= 80 ? 'A' : summary.score >= 60 ? 'B' : summary.score >= 40 ? 'C' : 'D';

  // 按类别统计
  const byCategory = {};
  for (const f of allFindings) {
    if (!byCategory[f.category]) byCategory[f.category] = [];
    byCategory[f.category].push(f);
  }

  return { findings: allFindings, summary, byCategory };
}

module.exports = { runAnalysis, ANALYZERS };
