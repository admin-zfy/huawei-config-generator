import { useState, useRef, useMemo } from 'react';
import { Terminal, Copy, Maximize2, Minimize2, ChevronUp, Check } from 'lucide-react';

export default function ConfigPreview({ config, loading, error, validationErrors, warnings, lineCount, onCopy, children, collapsed = false }) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef(null);

  const handleCopy = async () => {
    if (!config) return;
    try {
      await navigator.clipboard.writeText(config);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = config;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    if (onCopy) onCopy();
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      previewRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  // 带行号的代码视图
  const numberedConfig = useMemo(() => {
    if (!config) return '';
    const lines = config.split('\n');
    const digits = String(lines.length).length;
    return lines.map((line, i) => {
      const num = String(i + 1).padStart(digits, ' ');
      return `<span class="line-num">${num}</span>${escapeHtml(line)}`;
    }).join('\n');
  }, [config]);

  if (collapsed) {
    return (
      <div className="p-2">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#1a1a2e]/50 rounded-lg transition"
        >
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-[#00b4d8]" />
            <span className="text-sm font-medium text-gray-300">配置预览</span>
            {config && (
              <span className="text-[10px] text-gray-500 bg-[#0d0d1a] px-2 py-0.5 rounded">
                {lineCount || config.split('\n').length} 行
              </span>
            )}
          </div>
          <ChevronUp size={16} className={`text-gray-500 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
        </button>

        {!isCollapsed && (
          <div className="mt-2 animate-slide-up">
            <div className="flex items-center justify-between mb-2 px-2">
              <div className="flex items-center gap-2">
                {loading && <span className="w-3 h-3 border-2 border-[#00b4d8] border-t-transparent rounded-full animate-spin" />}
                {error && <span className="text-xs text-red-400">错误</span>}
              </div>
              {config && (
                <button onClick={handleCopy} className="p-1 hover:bg-[#1a1a2e] rounded transition">
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-gray-500" />}
                </button>
              )}
            </div>
            {error && (
              <div className="mx-2 mb-2 p-2 bg-red-500/5 border border-red-500/20 rounded text-xs text-red-400">
                {error}
                {validationErrors?.length > 0 && (
                  <ul className="mt-1 list-disc list-inside">
                    {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}
            <pre className="font-mono text-xs leading-relaxed bg-[#0d0d1a] border border-[#2a2a4a] rounded-lg p-3 text-emerald-400 max-h-48 overflow-auto whitespace-pre-wrap break-all">
              {config || '# 尚未生成配置\n# 请在左侧填写参数并点击生成按钮'}
            </pre>
            {children}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" ref={previewRef}>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-[#00b4d8]/10 flex items-center justify-center">
            <Terminal size={18} className="text-[#00b4d8]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-200">配置预览</h3>
            <p className="text-[10px] text-gray-600">VRP CLI Output</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleCopy} disabled={!config}
            className="p-1.5 hover:bg-[#1a1a2e] rounded transition disabled:opacity-30"
            title={copied ? '已复制' : '复制配置'}>
            {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} className="text-gray-400" />}
          </button>
          <button onClick={toggleFullscreen}
            className="p-1.5 hover:bg-[#1a1a2e] rounded transition"
            title="全屏预览">
            {isFullscreen
              ? <Minimize2 size={15} className="text-gray-400" />
              : <Maximize2 size={15} className="text-gray-400" />}
          </button>
        </div>
      </div>

      {/* 状态栏 */}
      <div className="flex items-center gap-2 mb-2 text-[11px] text-gray-500">
        {loading && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 border-2 border-[#00b4d8] border-t-transparent rounded-full animate-spin" />
            生成中...
          </span>
        )}
        {error && (
          <span className="text-red-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            生成失败
          </span>
        )}
        {config && !loading && !error && (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>配置就绪</span>
            <span className="text-gray-700">|</span>
            <span>{lineCount || config.split('\n').length} 行</span>
            <span className="text-gray-700">|</span>
            <span>{config.length} 字符</span>
          </>
        )}
        {!config && !loading && !error && (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-gray-700" />
            <span>等待输入...</span>
          </>
        )}
      </div>

      {/* 校验错误 */}
      {validationErrors?.length > 0 && (
        <div className="mb-2 p-2 bg-red-500/5 border border-red-500/20 rounded-md">
          <p className="text-[11px] text-red-400 font-medium mb-1">校验错误:</p>
          <ul className="text-[10px] text-red-400/80 list-disc list-inside space-y-0.5">
            {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* 警告 */}
      {warnings?.length > 0 && (
        <div className="mb-2 p-2 bg-amber-500/5 border border-amber-500/20 rounded-md">
          <p className="text-[11px] text-amber-400 font-medium mb-1">警告:</p>
          <ul className="text-[10px] text-amber-400/80 list-disc list-inside space-y-0.5">
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* 预览区 (带行号) */}
      <div className="flex-1 relative min-h-0">
        <div className="absolute inset-0">
          {config ? (
            <div className="h-full bg-[#0d0d1a] border border-[#2a2a4a] rounded-lg overflow-auto relative font-mono text-xs leading-relaxed">
              <pre
                className="p-4 text-emerald-400 whitespace-pre-wrap break-all"
                dangerouslySetInnerHTML={{ __html: numberedConfig }}
              />
              <div className="scan-line" />
            </div>
          ) : (
            <div className="h-full bg-[#0d0d1a] border border-[#2a2a4a] rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Terminal size={40} className="text-gray-700 mx-auto mb-3" />
                <p className="text-sm text-gray-600">在左侧填写参数后</p>
                <p className="text-sm text-gray-600">点击生成按钮</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 导出按钮 */}
      {children && (
        <div className="mt-3 pt-3 border-t border-[#2a2a4a]">
          {children}
        </div>
      )}
    </div>
  );
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
