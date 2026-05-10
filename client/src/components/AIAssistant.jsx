import { useState, useMemo, useCallback } from 'react';
import { Bot, Sparkles, AlertTriangle, CheckCircle, Info, Shield, Zap, Thermometer, RefreshCw, ArrowRight, ThumbsUp } from 'lucide-react';

// AI 分析规则引擎
function analyzeConfig(config) {
  if (!config || config.trim().length === 0) {
    return { risks: [], suggestions: [], score: 0, summary: '请先生成或加载配置后再进行分析。' };
  }

  const configText = config.toLowerCase();
  const risks = [];
  const suggestions = [];
  let totalChecks = 0;
  let passedChecks = 0;

  // 1. 检查 VLAN 配置
  if (configText.includes('vlan')) {
    totalChecks++;
    if (configText.includes('vlan batch')) {
      passedChecks++;
    } else {
      risks.push({
        level: 'medium',
        title: 'VLAN 创建方式',
        detail: '建议使用 "vlan batch" 命令批量创建 VLAN，逐条创建效率较低。',
        fix: '使用 vlan batch 10 20 30 一次性创建多个 VLAN。',
      });
    }

    // 检查 VLAN 描述
    totalChecks++;
    if (configText.includes('description')) {
      passedChecks++;
    } else {
      suggestions.push({
        level: 'info',
        title: 'VLAN 描述缺失',
        detail: '建议为每个 VLAN 添加 description 以便于管理维护。',
      });
    }
  }

  // 2. 检查 STP 配置
  totalChecks++;
  if (configText.includes('stp') && (configText.includes('stp mode') || configText.includes('stp enable'))) {
    passedChecks++;
  } else if (configText.includes('vlan')) {
    risks.push({
      level: 'high',
      title: 'STP 未启用',
      detail: 'VLAN 配置存在但 STP 未启用，存在环路风险。强烈建议开启 STP。',
      fix: '添加: stp mode rstp 或 stp mode mstp, 然后 stp enable。',
    });
  }

  // 3. 检查边缘端口
  totalChecks++;
  if (configText.includes('stp edged-port')) {
    passedChecks++;
  } else {
    suggestions.push({
      level: 'info',
      title: '边缘端口未配置',
      detail: '接入终端端口建议启用 stp edged-port enable 以加快上线速度。',
      fix: '在 Access 端口添加: stp edged-port enable。',
    });
  }

  // 4. 检查 BPDU 保护
  totalChecks++;
  if (configText.includes('bpdu-protection') || configText.includes('bpdu protection')) {
    passedChecks++;
  } else {
    suggestions.push({
      level: 'medium',
      title: 'BPDU 保护未配置',
      detail: '建议全局开启 BPDU 保护，防止恶意 BPDU 攻击导致网络震荡。',
      fix: '添加全局命令: stp bpdu-protection。',
    });
  }

  // 5. 检查 OSPF 认证
  if (configText.includes('ospf')) {
    totalChecks++;
    if (configText.includes('authentication')) {
      passedChecks++;
    } else {
      risks.push({
        level: 'medium',
        title: 'OSPF 未配置认证',
        detail: 'OSPF 协议未配置区域或接口认证，存在路由安全风险。',
        fix: '在 OSPF 区域下添加: authentication-mode md5 1 cipher <PASSWORD>。',
      });
    }
  }

  // 6. 检查 OSPF 静默接口
  if (configText.includes('ospf')) {
    totalChecks++;
    if (configText.includes('silent-interface')) {
      passedChecks++;
    } else {
      suggestions.push({
        level: 'info',
        title: 'OSPF 静默接口未配置',
        detail: '接入终端的 VLANIF 接口建议设置为静默接口，减少不必要的 OSPF Hello 报文。',
        fix: '在 OSPF 进程下添加: silent-interface Vlanif<ID>。',
      });
    }
  }

  // 7. 检查 ACL 日志
  if (configText.includes('acl')) {
    totalChecks++;
    if (configText.includes('logging') || configText.includes('log')) {
      passedChecks++;
    } else {
      suggestions.push({
        level: 'info',
        title: 'ACL 规则无日志记录',
        detail: '关键 ACL 规则建议启用日志功能以便审计。',
        fix: '在关键 ACL 规则末尾添加 logging 参数。',
      });
    }
  }

  // 8. 检查端口安全
  totalChecks++;
  if (configText.includes('port-security')) {
    passedChecks++;
  } else {
    suggestions.push({
      level: 'medium',
      title: '端口安全未配置',
      detail: '建议在接入端口启用端口安全 (port-security)，限制 MAC 地址学习数量，防止 MAC 泛洪攻击。',
      fix: 'interface <port> → port-security enable → port-security max-mac-num 5。',
    });
  }

  // 9. 检查保存命令
  totalChecks++;
  if (configText.includes('save') && configText.includes('y')) {
    passedChecks++;
  } else {
    suggestions.push({
      level: 'low',
      title: '缺少 save 命令',
      detail: '配置末尾建议添加 save 和 y 命令确保配置持久化保存。',
      fix: '在配置末尾添加: save 然后 y。',
    });
  }

  // 10. 检查管理访问控制
  totalChecks++;
  if (configText.includes('acl') && (configText.includes('vty') || configText.includes('ssh') || configText.includes('telnet'))) {
    passedChecks++;
  } else {
    suggestions.push({
      level: 'medium',
      title: '管理访问控制未配置',
      detail: '建议配置 VTY/SSH 的 ACL 访问控制，限制管理源 IP 地址。',
      fix: '使用 ACL 限制 SSH/Telnet 访问源: user-interface vty 0 4 → acl <num> inbound。',
    });
  }

  // 11. 检查环路保护
  if (configText.includes('stp')) {
    totalChecks++;
    if (configText.includes('loop-protection') || configText.includes('loop protection')) {
      passedChecks++;
    } else {
      suggestions.push({
        level: 'medium',
        title: 'STP 环路保护未配置',
        detail: '建议在根端口和备选端口启用环路保护。',
        fix: '在关键端口添加: stp loop-protection。',
      });
    }
  }

  // 12. 检查 SNMP
  totalChecks++;
  if (configText.includes('snmp')) {
    passedChecks++;
  } else {
    suggestions.push({
      level: 'low',
      title: 'SNMP 监控未配置',
      detail: '建议配置 SNMP 以便于网络监控和告警。',
      fix: '添加: snmp-agent 和 snmp-agent community read <COMMUNITY>。',
    });
  }

  // 计算安全评分
  const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

  let summary = '';
  if (score >= 80) {
    summary = '配置整体安全性良好，存在少量可优化项。建议根据下方的建议进行完善。';
  } else if (score >= 50) {
    summary = '配置存在一些中等问题，建议重点关注高风险项目并及时修复。';
  } else if (score > 0) {
    summary = '配置安全性需要重点关注，存在多项高风险问题。';
  }

  return { risks, suggestions, score, summary, passedChecks, totalChecks };
}

const LEVEL_CONFIG = {
  high: { icon: AlertTriangle, color: '#ef476f', bg: 'rgba(239,71,111,0.1)', label: '高风险' },
  medium: { icon: Shield, color: '#ffd166', bg: 'rgba(255,209,102,0.1)', label: '中风险' },
  low: { icon: Info, color: '#00b4d8', bg: 'rgba(0,180,216,0.1)', label: '建议' },
  info: { icon: Info, color: '#8888aa', bg: 'rgba(136,136,170,0.1)', label: '提示' },
};

export default function AIAssistant({ config, setConfig }) {
  const [analyzing, setAnalyzing] = useState(false);

  const analysis = useMemo(() => analyzeConfig(config), [config]);

  const handleAnalyze = useCallback(() => {
    setAnalyzing(true);
    setTimeout(() => setAnalyzing(false), 1200);
  }, []);

  if (!config) {
    return (
      <div className="animate-slide-up">
        <div className="bg-huawei-card border border-huawei-border rounded-xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-huawei-primary/5 flex items-center justify-center animate-float">
            <Bot size={32} className="text-huawei-primary" />
          </div>
          <h3 className="text-lg font-bold text-huawei-text-bright mb-2">AI 配置分析助手</h3>
          <p className="text-sm text-huawei-text-dim mb-4 max-w-md mx-auto">
            自动分析华为网络配置，识别潜在风险并提供优化建议。
            请先在 VLAN/OSPF/ACL/STP 页面生成配置，或加载配置模板。
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-huawei-text-dim">
            <Sparkles size={14} className="text-huawei-warning" />
            <span>支持分析: VLAN · OSPF · ACL · STP · 安全策略</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* 分析按钮栏 */}
      <div className="bg-huawei-card border border-huawei-border rounded-xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-huawei-primary/10 flex items-center justify-center">
            <Bot size={24} className="text-huawei-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-huawei-text-bright">AI 配置分析</h3>
            <p className="text-xs text-huawei-text-dim">
              检测到配置 {config.split('\n').length} 行 · {config.length} 字符
            </p>
          </div>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="btn-primary text-sm py-2"
        >
          {analyzing ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              分析中...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              重新分析
            </>
          )}
        </button>
      </div>

      {/* 安全评分 */}
      <div className="bg-huawei-card border border-huawei-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-huawei-text-bright">安全评分</h3>
          <span className="text-xs text-huawei-text-dim">
            {analysis.passedChecks}/{analysis.totalChecks} 项通过
          </span>
        </div>

        {/* 评分环形图 */}
        <div className="flex items-center gap-6">
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#1a1a2e" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="34" fill="none"
                stroke={analysis.score >= 80 ? '#06d6a0' : analysis.score >= 50 ? '#ffd166' : '#ef476f'}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${(analysis.score / 100) * 213.6} 213.6`}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="text-xl font-bold"
                style={{ color: analysis.score >= 80 ? '#06d6a0' : analysis.score >= 50 ? '#ffd166' : '#ef476f' }}
              >
                {analysis.score}
              </span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm text-huawei-text-dim leading-relaxed">{analysis.summary}</p>
            <div className="flex gap-3 mt-2">
              <div className="flex items-center gap-1 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ background: '#ef476f' }} />
                <span className="text-huawei-text-dim">高风险 {analysis.risks.filter(r => r.level === 'high').length}</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ background: '#ffd166' }} />
                <span className="text-huawei-text-dim">中风险 {analysis.risks.filter(r => r.level === 'medium').length}</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ background: '#00b4d8' }} />
                <span className="text-huawei-text-dim">建议 {analysis.suggestions.filter(s => s.level !== 'low' && s.level !== 'info').length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 风险列表 */}
      {analysis.risks.length > 0 && (
        <div className="bg-huawei-card border border-huawei-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-huawei-danger" />
            <h3 className="text-sm font-bold text-huawei-text-bright">
              安全风险 ({analysis.risks.length})
            </h3>
          </div>
          <div className="space-y-3">
            {analysis.risks.map((risk, index) => {
              const levelCfg = LEVEL_CONFIG[risk.level] || LEVEL_CONFIG.info;
              const Icon = levelCfg.icon;
              return (
                <div
                  key={index}
                  className="rounded-lg p-3 border animate-slide-up"
                  style={{ background: levelCfg.bg, borderColor: levelCfg.color + '30' }}
                >
                  <div className="flex items-start gap-2">
                    <Icon size={16} style={{ color: levelCfg.color }} className="mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-huawei-text">{risk.title}</h4>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded font-medium"
                          style={{ color: levelCfg.color, background: levelCfg.color + '15' }}
                        >
                          {levelCfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-huawei-text-dim mb-2">{risk.detail}</p>
                      {risk.fix && (
                        <div className="flex items-start gap-2 bg-huawei-bg/60 rounded p-2">
                          <Zap size={12} className="text-huawei-primary mt-0.5 flex-shrink-0" />
                          <code className="text-xs text-huawei-success font-mono break-all">{risk.fix}</code>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 优化建议 */}
      {analysis.suggestions.length > 0 && (
        <div className="bg-huawei-card border border-huawei-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={16} className="text-huawei-success" />
            <h3 className="text-sm font-bold text-huawei-text-bright">
              优化建议 ({analysis.suggestions.length})
            </h3>
          </div>
          <div className="space-y-3">
            {analysis.suggestions.map((suggestion, index) => {
              const levelCfg = LEVEL_CONFIG[suggestion.level] || LEVEL_CONFIG.info;
              const Icon = levelCfg.icon;
              return (
                <div
                  key={index}
                  className="rounded-lg p-3 border animate-slide-up"
                  style={{ background: 'transparent', borderColor: '#2a2a4a' }}
                >
                  <div className="flex items-start gap-2">
                    <ThumbsUp size={14} className="text-huawei-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-huawei-text">{suggestion.title}</h4>
                      </div>
                      <p className="text-xs text-huawei-text-dim mb-2">{suggestion.detail}</p>
                      {suggestion.fix && (
                        <div className="bg-huawei-bg/60 rounded p-2">
                          <code className="text-xs text-huawei-success font-mono break-all">{suggestion.fix}</code>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 无风险提示 */}
      {analysis.risks.length === 0 && analysis.suggestions.length === 0 && analysis.score >= 80 && (
        <div className="bg-huawei-card border border-huawei-success/20 rounded-xl p-5 text-center">
          <CheckCircle size={40} className="text-huawei-success mx-auto mb-2" />
          <h3 className="text-sm font-bold text-huawei-success mb-1">配置检查通过</h3>
          <p className="text-xs text-huawei-text-dim">未发现明显安全风险或优化建议</p>
        </div>
      )}
    </div>
  );
}
