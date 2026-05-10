import { useState } from 'react';
import { Plus, Trash2, GitBranch, TrendingUp, Shield, Play, RotateCcw } from 'lucide-react';

const STP_MODES = [
  { value: 'mstp', label: 'MSTP (多生成树协议)' },
  { value: 'rstp', label: 'RSTP (快速生成树协议)' },
];

const ROOT_OPTIONS = [
  { value: '', label: '不指定' },
  { value: 'primary', label: '根桥 (Primary)' },
  { value: 'secondary', label: '备份根桥 (Secondary)' },
  { value: '0', label: '实例 0 根桥' },
  { value: '1', label: '实例 1 根桥' },
];

const INITIAL_FORM = {
  mode: 'mstp',
  regionName: '',
  revisionLevel: '0',
  rootPrimary: '',
  instances: [],
  edgePorts: [],
};

export default function STPForm({ onGenerate, loading }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  // MSTP 实例管理
  const addInstance = () => {
    setForm(prev => ({
      ...prev,
      instances: [
        ...prev.instances,
        { id: prev.instances.length + 1, vlans: '', bridgePriority: '' },
      ],
    }));
  };

  const updateInstance = (index, field, value) => {
    setForm(prev => {
      const instances = [...prev.instances];
      instances[index] = { ...instances[index], [field]: value };
      return { ...prev, instances };
    });
  };

  const removeInstance = (index) => {
    setForm(prev => ({
      ...prev,
      instances: prev.instances.filter((_, i) => i !== index),
    }));
  };

  // 边缘端口管理
  const addEdgePort = () => {
    setForm(prev => ({
      ...prev,
      edgePorts: [...prev.edgePorts, ''],
    }));
  };

  const updateEdgePort = (index, value) => {
    setForm(prev => {
      const edgePorts = [...prev.edgePorts];
      edgePorts[index] = value;
      return { ...prev, edgePorts };
    });
  };

  const removeEdgePort = (index) => {
    setForm(prev => ({
      ...prev,
      edgePorts: prev.edgePorts.filter((_, i) => i !== index),
    }));
  };

  const validate = () => {
    const errs = {};
    if (form.mode === 'mstp' && form.instances.length > 0) {
      const hasEmpty = form.instances.some(i => !i.id || !i.vlans);
      if (hasEmpty) errs.instances = '请完整填写实例 ID 和 VLAN';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const instances = form.instances
      .filter(i => i.id && i.vlans)
      .map(i => ({
        id: i.id,
        vlans: i.vlans,
        bridgePriority: i.bridgePriority || undefined,
      }));

    const edgePorts = form.edgePorts.filter(Boolean);

    onGenerate({
      mode: form.mode,
      regionName: form.regionName || undefined,
      revisionLevel: form.revisionLevel ? parseInt(form.revisionLevel) : undefined,
      rootPrimary: form.rootPrimary || undefined,
      instances: instances.length > 0 ? instances : undefined,
      edgePorts: edgePorts.length > 0 ? edgePorts : undefined,
    });
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setErrors({});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-slide-up">
      {/* STP 模式 */}
      <div className="bg-huawei-card border border-huawei-border rounded-xl p-5 card-hover">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-md bg-huawei-danger/10 flex items-center justify-center">
            <GitBranch size={16} className="text-huawei-danger" />
          </div>
          <h3 className="text-sm font-bold text-huawei-text-bright">STP 模式设置</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-huawei-text-dim mb-1.5">
              STP 模式 <span className="text-huawei-danger">*</span>
            </label>
            <select
              value={form.mode}
              onChange={e => updateField('mode', e.target.value)}
            >
              {STP_MODES.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-huawei-text-dim mb-1.5">
              根桥角色
            </label>
            <select
              value={form.rootPrimary}
              onChange={e => updateField('rootPrimary', e.target.value)}
            >
              {ROOT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* MSTP 区域配置 */}
      {form.mode === 'mstp' && (
        <div className="bg-huawei-card border border-huawei-border rounded-xl p-5 card-hover">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-md bg-huawei-primary/10 flex items-center justify-center">
              <TrendingUp size={16} className="text-huawei-primary" />
            </div>
            <h3 className="text-sm font-bold text-huawei-text-bright">MST 区域配置</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-huawei-text-dim mb-1.5">
                区域名称
              </label>
              <input
                type="text"
                value={form.regionName}
                onChange={e => updateField('regionName', e.target.value)}
                placeholder="例如: huawei_region"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-huawei-text-dim mb-1.5">
                修订级别
              </label>
              <input
                type="number"
                value={form.revisionLevel}
                onChange={e => updateField('revisionLevel', e.target.value)}
                min="0"
                max="65535"
              />
            </div>
          </div>

          {/* MSTP 实例 */}
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-medium text-huawei-text-dim">实例映射</h4>
            <button
              type="button"
              onClick={addInstance}
              className="btn-secondary text-xs py-1 px-3"
            >
              <Plus size={14} />
              添加实例
            </button>
          </div>

          {errors.instances && (
            <p className="text-xs text-huawei-danger mb-2">{errors.instances}</p>
          )}

          {form.instances.length === 0 ? (
            <p className="text-xs text-huawei-text-dim/50 text-center py-2">
              实例 0 为默认实例，可添加额外实例
            </p>
          ) : (
            <div className="space-y-2">
              {form.instances.map((inst, index) => (
                <div
                  key={index}
                  className="bg-huawei-bg/50 border border-huawei-border rounded-lg p-2 flex items-center gap-2 animate-slide-up"
                >
                  <span className="text-xs text-huawei-text-dim w-6">#{index + 1}</span>
                  <input
                    type="number"
                    value={inst.id}
                    onChange={e => updateInstance(index, 'id', e.target.value)}
                    placeholder="实例ID"
                    className="text-xs w-20"
                    min="0"
                  />
                  <input
                    type="text"
                    value={inst.vlans}
                    onChange={e => updateInstance(index, 'vlans', e.target.value)}
                    placeholder="VLAN (如 100 to 200)"
                    className="text-xs flex-1"
                  />
                  <input
                    type="number"
                    value={inst.bridgePriority}
                    onChange={e => updateInstance(index, 'bridgePriority', e.target.value)}
                    placeholder="优先级"
                    className="text-xs w-24"
                    min="0"
                    max="61440"
                    step="4096"
                  />
                  <button
                    type="button"
                    onClick={() => removeInstance(index)}
                    className="p-1 hover:bg-huawei-danger/10 rounded transition flex-shrink-0"
                  >
                    <Trash2 size={14} className="text-huawei-danger" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 边缘端口 */}
      <div className="bg-huawei-card border border-huawei-border rounded-xl p-5 card-hover">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-huawei-success/10 flex items-center justify-center">
              <Shield size={16} className="text-huawei-success" />
            </div>
            <h3 className="text-sm font-bold text-huawei-text-bright">边缘端口</h3>
          </div>
          <button
            type="button"
            onClick={addEdgePort}
            className="btn-secondary text-xs py-1 px-3"
          >
            <Plus size={14} />
            添加端口
          </button>
        </div>

        {form.edgePorts.length === 0 ? (
          <p className="text-xs text-huawei-text-dim/50 text-center py-2">
            边缘端口快速进入转发状态 (可选)
          </p>
        ) : (
          <div className="space-y-2">
            {form.edgePorts.map((port, index) => (
              <div key={index} className="flex items-center gap-2 animate-slide-up">
                <span className="text-xs text-huawei-text-dim w-6">#{index + 1}</span>
                <input
                  type="text"
                  value={port}
                  onChange={e => updateEdgePort(index, e.target.value)}
                  placeholder="接口名 (如 GigabitEthernet0/0/1)"
                  className="text-xs flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeEdgePort(index)}
                  className="p-1 hover:bg-huawei-danger/10 rounded transition"
                >
                  <Trash2 size={14} className="text-huawei-danger" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="btn-primary flex-1 sm:flex-none"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Play size={16} />
              生成 STP 配置
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="btn-secondary"
        >
          <RotateCcw size={16} />
          重置
        </button>
      </div>
    </form>
  );
}
