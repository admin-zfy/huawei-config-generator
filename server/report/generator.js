/**
 * HTML 安全分析报告生成器
 */

const SEVERITY_COLORS = {
  critical: { bg: '#dc2626', text: '#fff', label: '严重' },
  high:     { bg: '#ea580c', text: '#fff', label: '高危' },
  medium:   { bg: '#d97706', text: '#fff', label: '中危' },
  low:      { bg: '#16a34a', text: '#fff', label: '低危' },
  info:     { bg: '#6b7280', text: '#fff', label: '提示' },
};

const SEVERITY_ICONS = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🟢',
  info: '🔵',
};

function generateReport(findings, parsedConfig, originalText) {
  const { summary, byCategory } = parsedConfig._analysisResult || { summary: {}, byCategory: {} };
  const now = new Date().toLocaleString('zh-CN', { hour12: false });
  const sysname = parsedConfig?.sysname || 'Unknown';
  const deviceLabel = parsedConfig?.sysname || '华为网络设备';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>安全分析报告 — ${deviceLabel}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif; background: #f5f5f5; color: #1f2937; line-height: 1.6; }
  .report { max-width: 960px; margin: 0 auto; padding: 24px; }
  .header { background: linear-gradient(135deg, #1e293b, #0f172a); color: #fff; border-radius: 12px; padding: 32px; margin-bottom: 24px; }
  .header h1 { font-size: 24px; margin-bottom: 8px; }
  .header .meta { color: #94a3b8; font-size: 13px; }
  .header .grade { display: inline-block; font-size: 48px; font-weight: 900; color: #fbbf24; margin-right: 12px; vertical-align: middle; }

  .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 24px; }
  .summary-card { background: #fff; border-radius: 10px; padding: 16px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
  .summary-card .count { font-size: 36px; font-weight: 700; }
  .summary-card .label { font-size: 12px; color: #6b7280; margin-top: 4px; }
  .summary-card.total .count { color: #1e293b; }

  .section { margin-bottom: 24px; }
  .section h2 { font-size: 18px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; }
  .finding { background: #fff; border-radius: 8px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border-left: 4px solid #ccc; }
  .finding.critical { border-left-color: #dc2626; }
  .finding.high     { border-left-color: #ea580c; }
  .finding.medium   { border-left-color: #d97706; }
  .finding.low      { border-left-color: #16a34a; }
  .finding.info     { border-left-color: #6b7280; }

  .finding .id-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; color: #fff; margin-right: 8px; }
  .finding .title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .finding .title { font-size: 15px; font-weight: 600; }
  .finding .desc { color: #4b5563; font-size: 13px; margin-bottom: 8px; }
  .finding .meta-row { font-size: 12px; color: #9ca3af; margin-bottom: 8px; }
  .finding .fix-box { background: #1e293b; color: #4ade80; border-radius: 6px; padding: 12px; font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 12px; white-space: pre-wrap; overflow-x: auto; }
  .finding .fix-label { font-size: 11px; color: #94a3b8; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; }

  .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 32px; padding: 16px 0; border-top: 1px solid #e5e7eb; }

  @media print {
    body { background: #fff; }
    .report { max-width: 100%; }
    .finding { break-inside: avoid; }
    .fix-box { background: #f3f4f6; color: #1f2937; border: 1px solid #d1d5db; }
  }
</style>
</head>
<body>
<div class="report">

  <!-- 头部 -->
  <div class="header">
    <div style="display:flex;align-items:center;gap:16px;">
      <span class="grade">${summary.grade || '?'}</span>
      <div>
        <h1>${deviceLabel} — 安全配置分析报告</h1>
        <div class="meta">生成时间: ${now} | 主机名: ${sysname} | 安全评分: ${summary.score ?? 'N/A'}/100</div>
      </div>
    </div>
  </div>

  <!-- 风险统计 -->
  <div class="summary-grid">
    <div class="summary-card total">
      <div class="count">${summary.total || 0}</div>
      <div class="label">总问题数</div>
    </div>
    ${['critical','high','medium','low','info'].map(sev => `
    <div class="summary-card" style="border-top:3px solid ${SEVERITY_COLORS[sev].bg}">
      <div class="count" style="color:${SEVERITY_COLORS[sev].bg}">${summary[sev] || 0}</div>
      <div class="label">${SEVERITY_COLORS[sev].label}</div>
    </div>`).join('')}
    <div class="summary-card" style="border-top:3px solid #fbbf24">
      <div class="count" style="color:#f59e0b">${summary.score ?? '—'}</div>
      <div class="label">安全评分 /100</div>
    </div>
  </div>

  <!-- 详细列表 -->
  ${(findings || []).length === 0
    ? '<div class="section"><p style="color:#6b7280;text-align:center;padding:40px;">✅ 未检测到安全风险</p></div>'
    : `<div class="section">
        <h2>风险详情 (${findings.length} 条)</h2>
        ${findings.map((f, i) => `
        <div class="finding ${f.severity}">
          <div class="title-row">
            <span class="id-tag" style="background:${SEVERITY_COLORS[f.severity].bg}">${SEVERITY_ICONS[f.severity]} ${f.id}</span>
            <span class="title">${f.title}</span>
          </div>
          <div class="desc">${f.description}</div>
          <div class="meta-row">📍 ${f.location} | 类别: ${f.category}</div>
          <div style="display:flex;gap:16px;align-items:flex-start;">
            <div style="flex:1;">
              <div class="fix-label">🔧 修复建议</div>
              <div style="font-size:13px;color:#4b5563;">${f.remediation}</div>
            </div>
            ${f.command ? `
            <div style="flex:1;">
              <div class="fix-label">📋 VRP 修复命令</div>
              <pre class="fix-box">${escapeHtml(f.command)}</pre>
            </div>` : ''}
          </div>
        </div>`).join('')}
      </div>`
  }

  <div class="footer">
    华为配置安全分析报告 | 由 Config Analyzer 自动生成 | ${now}
  </div>

</div>
</body>
</html>`;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

module.exports = { generateReport };
