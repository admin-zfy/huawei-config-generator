import { useState } from 'react';
import {
  Network, Globe, Shield, GitBranch, LayoutTemplate, Bot,
  ChevronRight, Cpu, Server
} from 'lucide-react';

const MENU_ITEMS = [
  { id: 'vlan', label: 'VLAN 配置', icon: Network, color: '#00b4d8' },
  { id: 'ospf', label: 'OSPF 配置', icon: Globe, color: '#06d6a0' },
  { id: 'acl', label: 'ACL 配置', icon: Shield, color: '#ffd166' },
  { id: 'stp', label: 'STP 配置', icon: GitBranch, color: '#ef476f' },
  { id: 'templates', label: '配置模板', icon: LayoutTemplate, color: '#a78bfa' },
  { id: 'ai', label: 'AI 助手', icon: Bot, color: '#f472b6' },
];

export default function Sidebar({ activeTab, onTabChange, config }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="h-full border-r border-huawei-border bg-huawei-card/80 backdrop-blur-sm py-4 flex flex-col">
      {/* 折叠按钮 */}
      <div className="px-3 mb-4 flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 hover:bg-huawei-panel rounded transition"
        >
          <ChevronRight
            size={16}
            className={`text-huawei-text-dim transition-transform duration-300 ${expanded ? 'rotate-90' : ''}`}
          />
        </button>
        {expanded && (
          <span className="text-xs text-huawei-text-dim font-medium">
            导航菜单
          </span>
        )}
      </div>

      {/* 菜单项 */}
      <nav className="flex-1 px-2 space-y-1">
        {MENU_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
                isActive
                  ? 'bg-huawei-panel border border-huawei-border text-huawei-text-bright shadow-huawei'
                  : 'text-huawei-text-dim hover:text-huawei-text hover:bg-huawei-panel/50 border border-transparent'
              }`}
              style={isActive ? { borderColor: item.color + '40' } : {}}
            >
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center transition-all duration-200"
                style={{
                  background: isActive ? item.color + '18' : 'transparent',
                }}
              >
                <Icon
                  size={18}
                  style={{ color: isActive ? item.color : undefined }}
                  className={!isActive ? 'text-huawei-text-dim group-hover:text-huawei-text' : ''}
                />
              </div>
              {expanded && (
                <span
                  className="font-medium transition-colors"
                  style={{ color: isActive ? item.color : undefined }}
                >
                  {item.label}
                </span>
              )}
              {isActive && expanded && (
                <div
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ background: item.color }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* 底部信息 */}
      {expanded && (
        <div className="px-4 py-4 border-t border-huawei-border mt-auto">
          {/* 设备状态 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-huawei-text-dim">
              <Cpu size={14} className="text-huawei-primary" />
              <span>模拟设备状态</span>
            </div>

            <div className="space-y-1.5">
              <StatusBar label="CPU" value={23} color="#06d6a0" />
              <StatusBar label="MEM" value={45} color="#00b4d8" />
              <StatusBar label="TEMP" value={38} color="#ffd166" />
            </div>

            {config && (
              <div className="flex items-center gap-2 text-xs">
                <Server size={14} className="text-huawei-success" />
                <span className="text-huawei-text-dim">
                  配置已生成
                </span>
                <span className="pulse-dot ml-auto" />
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-huawei-border text-center">
            <p className="text-xs text-huawei-text-dim/60">
              Huawei Config Generator
            </p>
            <p className="text-xs text-huawei-text-dim/40 mt-0.5">
              HCIE Edition
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-huawei-text-dim w-8">{label}</span>
      <div className="flex-1 h-1.5 bg-huawei-bg rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${value}%`,
            background: `linear-gradient(90deg, ${color}80, ${color})`,
            boxShadow: `0 0 6px ${color}40`,
          }}
        />
      </div>
      <span className="text-xs text-huawei-text-dim w-8 text-right">{value}%</span>
    </div>
  );
}
