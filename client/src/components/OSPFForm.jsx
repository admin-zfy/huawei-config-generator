import { useState } from 'react';
import { Plus, Trash2, Globe, Radio, Network, Play, RotateCcw } from 'lucide-react';

const INITIAL_FORM = {
  routerId: '',
  processId: '1',
  area: '0.0.0.0',
  areaType: 'normal',
  networks: [],
};

const AREA_TYPES = [
  { value: 'normal', label: '普通区域 (Normal)' },
  { value: 'stub', label: 'Stub 区域' },
  { value: 'nssa', label: 'NSSA 区域' },
];

export default function OSPFForm({ onGenerate, loading }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const addNetwork = () => {
    setForm(prev => ({
      ...prev,
      networks: [...prev.networks, { address: '', wildcard: '0.0.0.255', interface: '' }],
    }));
  };

  const updateNetwork = (index, field, value) => {
    setForm(prev => {
      const networks = [...prev.networks];
      networks[index] = { ...networks[index], [field]: value };
      return { ...prev, networks };
    });
  };

  const removeNetwork = (index) => {
    setForm(prev => ({
      ...prev,
      networks: prev.networks.filter((_, i) => i !== index),
    }));
  };

  const validate = () => {
    const errs = {};
    if (!form.routerId || !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(form.routerId)) {
      errs.routerId = '请输入有效的 Router ID (如 1.1.1.1)';
    }
    if (!form.area || !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(form.area) && form.area !== '0') {
      errs.area = '请输入有效的 Area (如 0.0.0.0)';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const networks = form.networks
      .filter(n => n.address)
      .map(n => ({
        address: n.address,
        wildcard: n.wildcard || '0.0.0.255',
        interface: n.interface || undefined,
      }));

    let areaValue = form.area;
    if (form.areaType !== 'normal') {
      areaValue = `${form.areaType}:${form.area}`;
    }

    onGenerate({
      routerId: form.routerId,
      processId: parseInt(form.processId) || 1,
      area: form.area,
      networks: networks.length > 0 ? networks : undefined,
    });
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setErrors({});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-slide-up">
      {/* 基本信息 */}
      <div className="bg-huawei-card border border-huawei-border rounded-xl p-5 card-hover">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-md bg-huawei-success/10 flex items-center justify-center">
            <Globe size={16} className="text-huawei-success" />
          </div>
          <h3 className="text-sm font-bold text-huawei-text-bright">OSPF 基本设置</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-huawei-text-dim mb-1.5">
              Router ID <span className="text-huawei-danger">*</span>
            </label>
            <input
              type="text"
              value={form.routerId}
              onChange={e => updateField('routerId', e.target.value)}
              placeholder="例如: 1.1.1.1"
              className={errors.routerId ? 'border-huawei-danger' : ''}
            />
            {errors.routerId && (
              <p className="text-xs text-huawei-danger mt-1">{errors.routerId}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-huawei-text-dim mb-1.5">
              Process ID
            </label>
            <input
              type="number"
              value={form.processId}
              onChange={e => updateField('processId', e.target.value)}
              min="1"
              max="65535"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-huawei-text-dim mb-1.5">
              Area <span className="text-huawei-danger">*</span>
            </label>
            <input
              type="text"
              value={form.area}
              onChange={e => updateField('area', e.target.value)}
              placeholder="例如: 0.0.0.0"
              className={errors.area ? 'border-huawei-danger' : ''}
            />
            {errors.area && (
              <p className="text-xs text-huawei-danger mt-1">{errors.area}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-huawei-text-dim mb-1.5">
              区域类型
            </label>
            <select
              value={form.areaType}
              onChange={e => updateField('areaType', e.target.value)}
            >
              {AREA_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 网络宣告 */}
      <div className="bg-huawei-card border border-huawei-border rounded-xl p-5 card-hover">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-huawei-primary/10 flex items-center justify-center">
              <Radio size={16} className="text-huawei-primary" />
            </div>
            <h3 className="text-sm font-bold text-huawei-text-bright">网络宣告</h3>
          </div>
          <button
            type="button"
            onClick={addNetwork}
            className="btn-secondary text-xs py-1 px-3"
          >
            <Plus size={14} />
            添加网络
          </button>
        </div>

        {form.networks.length === 0 ? (
          <p className="text-xs text-huawei-text-dim/50 text-center py-4">
            点击"添加网络"宣告 OSPF 网段
          </p>
        ) : (
          <div className="space-y-3">
            {form.networks.map((net, index) => (
              <div
                key={index}
                className="bg-huawei-bg/50 border border-huawei-border rounded-lg p-3 animate-slide-up"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-huawei-text-dim">
                    网络 #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeNetwork(index)}
                    className="p-1 hover:bg-huawei-danger/10 rounded transition"
                  >
                    <Trash2 size={14} className="text-huawei-danger" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={net.address}
                    onChange={e => updateNetwork(index, 'address', e.target.value)}
                    placeholder="网络地址 (如 192.168.1.0)"
                    className="text-xs"
                  />
                  <input
                    type="text"
                    value={net.wildcard}
                    onChange={e => updateNetwork(index, 'wildcard', e.target.value)}
                    placeholder="通配符 (如 0.0.0.255)"
                    className="text-xs"
                  />
                  <input
                    type="text"
                    value={net.interface}
                    onChange={e => updateNetwork(index, 'interface', e.target.value)}
                    placeholder="接口 (可选, 如 Vlanif100)"
                    className="text-xs"
                  />
                </div>
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
              生成 OSPF 配置
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
