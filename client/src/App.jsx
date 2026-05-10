import { useState, useCallback, useRef, useEffect } from 'react';
import { Menu, X, Terminal } from 'lucide-react';
import Sidebar from './components/Sidebar';
import VLANForm from './components/VLANForm';
import OSPFForm from './components/OSPFForm';
import ACLForm from './components/ACLForm';
import STPForm from './components/STPForm';
import ConfigPreview from './components/ConfigPreview';
import Templates from './components/Templates';
import AIAssistant from './components/AIAssistant';
import ExportButtons from './components/ExportButtons';
import DeviceSelector from './components/DeviceSelector';
import ConfigAnalyzer from './components/ConfigAnalyzer';
import { useConfig } from './hooks/useConfig';

const TABS = [
  { id: 'vlan', label: 'VLAN 配置', icon: '🔗', feature: 'vlan' },
  { id: 'ospf', label: 'OSPF 配置', icon: '🌐', feature: 'ospf' },
  { id: 'acl', label: 'ACL/策略', icon: '🛡️', feature: 'acl' },
  { id: 'stp', label: 'STP 配置', icon: '🔀', feature: 'stp' },
  { id: 'templates', label: '配置模板', icon: '📋', feature: null },
  { id: 'analyzer', label: '配置分析', icon: '🔍', feature: null },
  { id: 'ai', label: 'AI 助手', icon: '🤖', feature: null },
];

export default function App() {
  const { config, setConfig, loading, error, validationErrors, warnings, activeTab, setActiveTab, generateConfig, lineCount, selectedDevice, setSelectedDevice, deviceSupports } = useConfig();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const mobileMenuRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // 设备切换时自动跳到有效 tab
  const handleDeviceChange = useCallback((deviceId) => {
    setSelectedDevice(deviceId);
    setShowExport(false);
  }, [setSelectedDevice]);

  // 当前 tab 是否被设备支持
  const currentTabDef = TABS.find(t => t.id === activeTab);
  const currentTabDisabled = currentTabDef?.feature !== null && !deviceSupports.includes(currentTabDef?.feature);

  useEffect(() => {
    if (currentTabDisabled) {
      // 切换到第一个支持的 tab
      const firstAvailable = TABS.find(t => t.feature === null || deviceSupports.includes(t.feature));
      if (firstAvailable) setActiveTab(firstAvailable.id);
    }
  }, [selectedDevice]); // 仅在设备切换时触发
  useEffect(() => {
    function handleClick(e) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
        setSidebarOpen(false);
      }
    }
    if (sidebarOpen) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [sidebarOpen]);

  const handleGenerate = useCallback(async (type, params) => {
    await generateConfig(type, params);
    setShowExport(true);
  }, [generateConfig]);

  const handleTemplateSelect = useCallback((templateConfig) => {
    setConfig(templateConfig);
    setShowExport(true);
    showToast('模板已加载');
  }, [setConfig, showToast]);

  const renderForm = () => {
    switch (activeTab) {
      case 'vlan':
        return <VLANForm onGenerate={(p) => handleGenerate('vlan', p)} loading={loading} deviceId={selectedDevice} />;
      case 'ospf':
        return <OSPFForm onGenerate={(p) => handleGenerate('ospf', p)} loading={loading} deviceId={selectedDevice} />;
      case 'acl':
        return <ACLForm onGenerate={(p) => handleGenerate('acl', p)} loading={loading} deviceId={selectedDevice} />;
      case 'stp':
        return <STPForm onGenerate={(p) => handleGenerate('stp', p)} loading={loading} deviceId={selectedDevice} />;
      case 'templates':
        return <Templates onSelect={handleTemplateSelect} />;
      case 'analyzer':
        return <ConfigAnalyzer />;
      case 'ai':
        return <AIAssistant config={config} setConfig={setConfig} />;
      default:
        return null;
    }
  };

  const getActiveTabLabel = () => TABS.find(t => t.id === activeTab)?.label || '';

  return (
    <div className="min-h-screen bg-huawei-bg bg-grid relative">
      <div className="bg-noise" />

      {/* ===== 顶部导航栏 ===== */}
      <header className="sticky top-0 z-50 bg-huawei-card/90 backdrop-blur-md border-b border-huawei-border">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* 左侧 Logo */}
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 hover:bg-huawei-panel rounded-md transition"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-huawei-primary to-huawei-primary-dark flex items-center justify-center text-lg">
                🖧
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold text-huawei-text-bright leading-tight">
                  华为配置生成器
                </h1>
                <p className="text-xs text-huawei-text-dim leading-tight">
                  Huawei Config Generator
                </p>
              </div>
            </div>
          </div>

          {/* 中间 Tab 导航 (桌面端) */}
          <nav className="hidden lg:flex items-center gap-1">
            {TABS.map(tab => {
              const isDisabled = tab.feature !== null && !deviceSupports.includes(tab.feature);
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  disabled={isDisabled}
                  onClick={() => { if (!isDisabled) { setActiveTab(tab.id); setShowExport(false); } }}
                  title={isDisabled ? '当前设备不支持此功能' : tab.label}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    isDisabled
                      ? 'text-gray-700 cursor-not-allowed'
                      : isActive
                        ? 'bg-huawei-primary/15 text-huawei-primary border border-huawei-primary/30 shadow-huawei'
                        : 'text-huawei-text-dim hover:text-huawei-text hover:bg-huawei-panel/50'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* 右侧状态 */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <span className="pulse-dot" />
              <span className="text-xs text-huawei-text-dim">系统就绪</span>
            </div>
            <div className="text-xs text-huawei-text-dim border border-huawei-border rounded px-2 py-0.5">
              v1.0
            </div>
          </div>
        </div>

        {/* 移动端 Tab 导航 */}
        <nav className="lg:hidden flex overflow-x-auto gap-1 px-2 pb-2 scrollbar-hide">
          {TABS.map(tab => {
            const isDisabled = tab.feature !== null && !deviceSupports.includes(tab.feature);
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                disabled={isDisabled}
                onClick={() => { if (!isDisabled) { setActiveTab(tab.id); setShowExport(false); } }}
                className={`flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
                  isDisabled
                    ? 'text-gray-700 cursor-not-allowed'
                    : isActive
                      ? 'bg-huawei-primary/15 text-huawei-primary border border-huawei-primary/30'
                      : 'text-huawei-text-dim hover:text-huawei-text hover:bg-huawei-panel/50'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* ===== 主体区域 ===== */}
      <div className="relative z-10 flex max-w-7xl mx-auto">
        {/* 桌面端侧边栏 */}
        <aside className="hidden lg:block w-52 flex-shrink-0">
          <Sidebar
            activeTab={activeTab}
            onTabChange={(tab) => { setActiveTab(tab); setShowExport(false); }}
            config={config}
          />
        </aside>

        {/* 移动端侧边栏 (滑出式) */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
            <div ref={mobileMenuRef} className="absolute left-0 top-0 h-full w-64 animate-slide-right">
              <Sidebar
                activeTab={activeTab}
                onTabChange={(tab) => { setActiveTab(tab); setSidebarOpen(false); setShowExport(false); }}
                config={config}
              />
            </div>
          </div>
        )}

        {/* 中间表单区域 */}
        <main className="flex-1 min-w-0 p-4 lg:p-6 animate-fade-in">
          {/* 设备选择器 */}
          <div className="mb-4">
            <DeviceSelector selectedDevice={selectedDevice} onDeviceChange={handleDeviceChange} />
          </div>

          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-huawei-text-bright">
                {getActiveTabLabel()}
              </h2>
              <p className="text-xs text-huawei-text-dim mt-0.5">
                填写参数后点击生成，右侧实时预览配置
              </p>
            </div>
            {config && showExport && activeTab !== 'templates' && activeTab !== 'ai' && activeTab !== 'analyzer' && (
              <div className="flex items-center gap-2">
                <ExportButtons config={config} onToast={showToast} />
              </div>
            )}
          </div>

          {currentTabDisabled ? (
            <div className="bg-[#12121a] border border-[#2a2a4a] rounded-xl p-8 text-center">
              <p className="text-gray-500 text-sm">
                当前设备 <span className="text-gray-300 font-medium">{selectedDevice}</span> 不支持 <span className="text-gray-300">{getActiveTabLabel()}</span> 功能
              </p>
              <p className="text-gray-600 text-xs mt-2">请切换到其他配置页</p>
            </div>
          ) : (
            renderForm()
          )}
        </main>

        {/* 右侧配置预览 */}
        <aside className="hidden xl:block w-96 flex-shrink-0 border-l border-huawei-border p-4 lg:p-6 animate-slide-up">
          <ConfigPreview
            config={config}
            loading={loading}
            error={error}
            validationErrors={validationErrors}
            warnings={warnings}
            lineCount={lineCount}
            onCopy={() => showToast('已复制到剪贴板')}
          >
            {config && showExport && activeTab !== 'templates' && activeTab !== 'ai' && activeTab !== 'analyzer' && (
              <ExportButtons config={config} onToast={showToast} />
            )}
          </ConfigPreview>
        </aside>
      </div>

      {/* 移动端/平板底部预览面板 */}
      <div className="xl:hidden border-t border-huawei-border bg-huawei-card/95 backdrop-blur-md sticky bottom-0 z-30">
        <div className="max-w-7xl mx-auto">
          <ConfigPreview
            config={config}
            loading={loading}
            error={error}
            validationErrors={validationErrors}
            warnings={warnings}
            lineCount={lineCount}
            onCopy={() => showToast('已复制到剪贴板')}
            collapsed
          >
            {config && showExport && activeTab !== 'templates' && activeTab !== 'ai' && activeTab !== 'analyzer' && (
              <div className="flex gap-2 mt-2">
                <ExportButtons config={config} onToast={showToast} />
              </div>
            )}
          </ConfigPreview>
        </div>
      </div>

      {/* ===== Toast 通知 ===== */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-slide-up ${
            toast.type === 'success'
              ? 'bg-huawei-success/20 border border-huawei-success/40 text-huawei-success'
              : toast.type === 'error'
              ? 'bg-huawei-danger/20 border border-huawei-danger/40 text-huawei-danger'
              : 'bg-huawei-primary/20 border border-huawei-primary/40 text-huawei-primary'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
