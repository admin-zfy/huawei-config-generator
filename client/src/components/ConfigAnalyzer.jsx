import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, AlertTriangle, Shield, CheckCircle, Copy, Download, Loader2, X, ChevronDown, ChevronRight } from 'lucide-react';
import { API_BASE } from '../api';

const SEVERITY_META = {
  critical: { label: '严重', bg: '#dc2626', border: '#dc2626', text: '#fff' },
  high:     { label: '高危', bg: '#ea580c', border: '#ea580c', text: '#fff' },
  medium:   { label: '中危', bg: '#d97706', border: '#d97706', text: '#fff' },
  low:      { label: '低危', bg: '#16a34a', border: '#16a34a', text: '#fff' },
  info:     { label: '提示', bg: '#6b7280', border: '#6b7280', text: '#fff' },
};

const SEVERITY_ICONS = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🟢',
  info: '🔵',
};

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default function ConfigAnalyzer() {
  const [file, setFile] = useState(null);
  const [content, setContent] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});
  const [dragover, setDragover] = useState(false);
  const fileInputRef = useRef(null);

  const resetAnalysis = useCallback(() => {
    setResult(null);
    setError(null);
    setExpandedItems({});
  }, []);

  const handleFileSelect = useCallback((e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith('.txt') && !f.name.endsWith('.cfg') && !f.name.endsWith('.conf')) {
      setError('请上传 .txt / .cfg / .conf 格式的配置文件');
      return;
    }
    setFile(f);
    setError(null);
    resetAnalysis();
    const reader = new FileReader();
    reader.onload = (ev) => setContent(ev.target.result);
    reader.readAsText(f);
  }, [resetAnalysis]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragover(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragover(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragover(false);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (!f.name.endsWith('.txt') && !f.name.endsWith('.cfg') && !f.name.endsWith('.conf')) {
      setError('请上传 .txt / .cfg / .conf 格式的配置文件');
      return;
    }
    setFile(f);
    setError(null);
    resetAnalysis();
    const reader = new FileReader();
    reader.onload = (ev) => setContent(ev.target.result);
    reader.readAsText(f);
  }, [resetAnalysis]);

  const handlePaste = useCallback((e) => {
    const text = e.clipboardData?.getData('text');
    if (text && text.includes('sysname') && text.includes('#')) {
      e.preventDefault();
      setContent(text);
      setFile(null);
      setError(null);
      resetAnalysis();
    }
  }, [resetAnalysis]);

  const handleAnalyze = useCallback(async () => {
    if (!content.trim()) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configText: content }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '分析失败');
      }
      setResult(data);
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setAnalyzing(false);
    }
  }, [content]);

  const handleCopyCommand = useCallback((command) => {
    navigator.clipboard.writeText(command).catch(() => {});
  }, []);

  const handleDownloadReport = useCallback(() => {
    if (!result?.reportHtml) return;
    const blob = new Blob([result.reportHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `安全分析报告_${result.parsed?.sysname || 'device'}_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const handlePrintPDF = useCallback(() => {
    if (!result?.reportHtml) return;
    const win = window.open('', '_blank', 'width=960,height=800');
    if (!win) return;
    win.document.write(result.reportHtml);
    win.document.close();
    win.focus();
    win.onload = () => win.print();
  }, [result]);

  const toggleItem = useCallback((id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const contentPreview = content.slice(0, 3000);
  const hasMoreContent = content.length > 3000;

  return (
    <div className="space-y-4" onPaste={handlePaste}>
      {/* Upload Area */}
      {!result && (
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${
            dragover
              ? 'border-[#3b82f6] bg-[#1e3a5f]/30'
              : 'border-[#2a2a4a] hover:border-[#3a4a6a] bg-[#0d0d18]'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.cfg,.conf"
            onChange={handleFileSelect}
            className="hidden"
          />
          {file ? (
            <div className="space-y-2">
              <FileText size={40} className="mx-auto text-[#3b82f6]" />
              <p className="text-sm font-medium text-gray-200">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB — 点击重新选择</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Upload size={40} className="mx-auto text-gray-600" />
              <div>
                <p className="text-sm text-gray-300 font-medium">拖拽配置文件到此处，或点击上传</p>
                <p className="text-xs text-gray-600 mt-1">支持 display current-configuration 导出的 .txt 文件</p>
              </div>
              <p className="text-xs text-gray-600">也可以直接粘贴配置文本 (Ctrl+V) — 系统会自动识别</p>
            </div>
          )}
        </div>
      )}

      {/* Content Preview */}
      {content && !result && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-300">
              配置预览 ({content.split('\n').length} 行, {(content.length / 1024).toFixed(1)} KB)
            </h3>
            <button
              onClick={() => { setContent(''); setFile(null); }}
              className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
            >
              <X size={14} /> 清除
            </button>
          </div>
          <div className="bg-[#0a0a14] border border-[#1e1e32] rounded-lg p-4 max-h-60 overflow-auto">
            <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap">{contentPreview}</pre>
            {hasMoreContent && (
              <p className="text-xs text-gray-600 mt-2 text-center">... 还有更多内容未显示</p>
            )}
          </div>

          <button
            onClick={handleAnalyze}
            disabled={analyzing || !content.trim()}
            className="mt-4 w-full py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200
              bg-gradient-to-r from-[#3b82f6] to-[#2563eb] hover:from-[#2563eb] hover:to-[#1d4ed8] text-white
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                正在分析配置安全风险...
              </>
            ) : (
              <>
                <Shield size={18} />
                开始安全分析
              </>
            )}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-400">{error}</p>
            {content && (
              <button onClick={() => setError(null)} className="text-xs text-red-500 hover:text-red-300 mt-1 underline">
                忽略并重试
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-200">
                安全分析报告 — {result.parsed?.sysname || '未命名设备'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {result.summary.total} 个问题 · 安全评分 {result.summary.score}/100 · 等级 {result.summary.grade}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setResult(null); setContent(''); setFile(null); }}
                className="px-3 py-1.5 text-xs rounded-md text-gray-500 hover:text-gray-300 hover:bg-[#1a1a2e] transition"
              >
                重新分析
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-6 gap-2">
            <div className="bg-[#12121a] border border-[#2a2a4a] rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-200">{result.summary.total}</div>
              <div className="text-xs text-gray-500 mt-0.5">总计</div>
            </div>
            {['critical', 'high', 'medium', 'low', 'info'].map(sev => (
              <div key={sev} className="bg-[#12121a] border border-[#2a2a4a] rounded-lg p-3 text-center" style={{ borderTop: `2px solid ${SEVERITY_META[sev].border}` }}>
                <div className="text-2xl font-bold" style={{ color: SEVERITY_META[sev].bg }}>
                  {result.summary[sev] || 0}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{SEVERITY_META[sev].label}</div>
              </div>
            ))}
          </div>

          {/* Score */}
          <div className="bg-[#12121a] border border-[#2a2a4a] rounded-lg p-4 flex items-center gap-4">
            <div className="text-4xl font-black" style={{ color: result.summary.grade === 'A' ? '#22c55e' : result.summary.grade === 'B' ? '#eab308' : result.summary.grade === 'C' ? '#f97316' : '#ef4444' }}>
              {result.summary.grade}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-300">安全评分: {result.summary.score}/100</div>
              <div className="text-xs text-gray-500">扣分: critical×20 + high×10 + medium×5 + low×2</div>
            </div>
          </div>

          {/* Findings List */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300">
              风险详情 ({result.findings.length} 条)
            </h4>
            {result.findings.length === 0 ? (
              <div className="bg-[#0d1a0d] border border-[#166534] rounded-lg p-6 text-center">
                <CheckCircle size={32} className="mx-auto text-green-500 mb-2" />
                <p className="text-sm text-green-400">未检测到安全风险，配置符合基线要求</p>
              </div>
            ) : (
              result.findings.map((f) => (
                <div
                  key={f.id}
                  className="bg-[#12121a] border border-[#2a2a4a] rounded-lg overflow-hidden"
                  style={{ borderLeft: `3px solid ${SEVERITY_META[f.severity].border}` }}
                >
                  {/* Header row */}
                  <button
                    onClick={() => toggleItem(f.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-[#1a1a2e] transition text-left"
                  >
                    <span className="text-sm">{SEVERITY_ICONS[f.severity]}</span>
                    <span
                      className="px-2 py-0.5 rounded text-xs font-semibold text-white"
                      style={{ background: SEVERITY_META[f.severity].bg }}
                    >
                      {f.id}
                    </span>
                    <span className="flex-1 text-sm font-medium text-gray-200 truncate">{f.title}</span>
                    <span className="text-xs text-gray-600">{f.category.toUpperCase()}</span>
                    {expandedItems[f.id] ? <ChevronDown size={16} className="text-gray-600" /> : <ChevronRight size={16} className="text-gray-600" />}
                  </button>

                  {/* Expanded content */}
                  {expandedItems[f.id] && (
                    <div className="px-4 pb-4 space-y-3 border-t border-[#1a1a2e] pt-3">
                      <p className="text-sm text-gray-400">{f.description}</p>

                      <div className="flex gap-2 text-xs text-gray-600">
                        <span>📍 {f.location}</span>
                        <span>·</span>
                        <span>类别: {f.category}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#0a0a14] rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">修复建议</p>
                          <p className="text-sm text-gray-300">{f.remediation}</p>
                        </div>
                        {f.command && (
                          <div className="bg-[#0a0a14] rounded-lg p-3 relative group">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">VRP 修复命令</p>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCopyCommand(f.command); }}
                                className="text-xs text-gray-600 hover:text-blue-400 flex items-center gap-1 transition"
                              >
                                <Copy size={12} /> 复制
                              </button>
                            </div>
                            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">{escapeHtml(f.command)}</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleDownloadReport}
              className="flex-1 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 bg-[#1e293b] hover:bg-[#334155] text-gray-200 border border-[#334155] transition"
            >
              <Download size={16} />
              下载 HTML 报告
            </button>
            <button
              onClick={handlePrintPDF}
              className="flex-1 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 bg-[#1e293b] hover:bg-[#334155] text-gray-200 border border-[#334155] transition"
            >
              <Download size={16} />
              另存为 PDF (打印)
            </button>
          </div>
        </div>
      )}

      {/* No file, no result — show hint */}
      {!content && !result && (
        <div className="bg-[#0d0d18] border border-[#1e1e32] rounded-lg p-6 text-center">
          <Shield size={32} className="mx-auto text-gray-700 mb-3" />
          <p className="text-sm text-gray-500">
            上传华为交换机 <code className="text-gray-600 bg-[#1a1a2e] px-1 rounded">display current-configuration</code> 输出文件
          </p>
          <p className="text-xs text-gray-700 mt-1">
            支持检测: 弱密码 · 接口风险 · STP安全 · VLAN风险 · ACL风险 · OSPF风险
          </p>
        </div>
      )}
    </div>
  );
}
