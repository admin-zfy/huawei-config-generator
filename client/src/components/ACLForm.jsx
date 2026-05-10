import { useState } from 'react';
import { Plus, Trash2, Shield, Filter, Play, RotateCcw } from 'lucide-react';

const ACL_NUMBER_PRESETS = [
  { value: '2000', label: '2000 — 基本 ACL' },
  { value: '3000', label: '3000 — 高级 ACL' },
  { value: '4000', label: '4000 — 二层 ACL' },
];

const PROTOCOLS = ['ip', 'tcp', 'udp', 'icmp', 'ospf', 'gre'];
const ACTIONS = ['permit', 'deny'];
const PORT_OPERATORS = ['eq', 'gt', 'lt', 'range'];

const INITIAL_FORM = { aclNumber: '3000', rules: [] };

export default function ACLForm({ onGenerate, loading }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const addRule = () => {
    setForm(prev => ({
      ...prev,
      rules: [
        ...prev.rules,
        {
          id: (prev.rules.length + 1) * 5,
          action: 'permit',
          protocol: 'ip',
          source: '',
          sourceMask: '0.0.0.0',
          destination: '',
          destMask: '0.0.0.0',
          destPort: '',
          destPortOperator: 'eq',
          description: '',
        },
      ],
    }));
  };

  const updateRule = (index, field, value) => {
    setForm(prev => {
      const rules = [...prev.rules];
      rules[index] = { ...rules[index], [field]: value };
      return { ...prev, rules };
    });
  };

  const removeRule = (index) => {
    setForm(prev => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index),
    }));
  };

  const validate = () => {
    const errs = {};
    if (!form.aclNumber) {
      errs.aclNumber = '请选择 ACL 编号';
    }
    if (form.rules.length === 0) {
      errs.rules = '请至少添加一条规则';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const rules = form.rules.map(r => ({
      id: r.id,
      action: r.action,
      protocol: r.protocol,
      source: r.source || undefined,
      sourceMask: r.source ? (r.sourceMask || '0.0.0.0') : undefined,
      destination: r.destination || undefined,
      destMask: r.destination ? (r.destMask || '0.0.0.0') : undefined,
      destPort: r.destPort || undefined,
      destPortOperator: r.destPort ? r.destPortOperator : undefined,
      description: r.description || undefined,
    }));

    onGenerate({
      aclNumber: form.aclNumber,
      rules,
    });
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setErrors({});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-slide-up">
      {/* ACL 类型 */}
      <div className="bg-huawei-card border border-huawei-border rounded-xl p-5 card-hover">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-md bg-huawei-warning/10 flex items-center justify-center">
            <Shield size={16} className="text-huawei-warning" />
          </div>
          <h3 className="text-sm font-bold text-huawei-text-bright">ACL 类型</h3>
        </div>

        <div>
          <label className="block text-xs font-medium text-huawei-text-dim mb-1.5">
            ACL 编号 <span className="text-huawei-danger">*</span>
          </label>
          <select
            value={form.aclNumber}
            onChange={e => updateField('aclNumber', e.target.value)}
            className={errors.aclNumber ? 'border-huawei-danger' : ''}
          >
            {ACL_NUMBER_PRESETS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          {errors.aclNumber && (
            <p className="text-xs text-huawei-danger mt-1">{errors.aclNumber}</p>
          )}
          <p className="text-xs text-huawei-text-dim/50 mt-1">
            2000-2999: 基本ACL | 3000-3999: 高级ACL | 4000-4999: 二层ACL
          </p>
        </div>
      </div>

      {/* ACL 规则 */}
      <div className="bg-huawei-card border border-huawei-border rounded-xl p-5 card-hover">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-huawei-danger/10 flex items-center justify-center">
              <Filter size={16} className="text-huawei-danger" />
            </div>
            <h3 className="text-sm font-bold text-huawei-text-bright">ACL 规则</h3>
            {form.rules.length > 0 && (
              <span className="text-xs text-huawei-text-dim bg-huawei-panel px-2 py-0.5 rounded">
                {form.rules.length} 条规则
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={addRule}
            className="btn-secondary text-xs py-1 px-3"
          >
            <Plus size={14} />
            添加规则
          </button>
        </div>

        {errors.rules && (
          <p className="text-xs text-huawei-danger mb-2">{errors.rules}</p>
        )}

        {form.rules.length === 0 ? (
          <p className="text-xs text-huawei-text-dim/50 text-center py-6">
            点击"添加规则"配置 ACL 访问控制规则
          </p>
        ) : (
          <div className="space-y-3">
            {form.rules.map((rule, index) => (
              <div
                key={index}
                className="bg-huawei-bg/50 border border-huawei-border rounded-lg p-3 animate-slide-up"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-huawei-text-dim">
                    规则 #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRule(index)}
                    className="p-1 hover:bg-huawei-danger/10 rounded transition"
                  >
                    <Trash2 size={14} className="text-huawei-danger" />
                  </button>
                </div>

                {/* 第一行：规则ID + 动作 + 协议 */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
                  <div>
                    <label className="text-xs text-huawei-text-dim/70">规则ID</label>
                    <input
                      type="number"
                      value={rule.id}
                      onChange={e => updateRule(index, 'id', parseInt(e.target.value) || 0)}
                      className="text-xs"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-huawei-text-dim/70">动作</label>
                    <select
                      value={rule.action}
                      onChange={e => updateRule(index, 'action', e.target.value)}
                      className="text-xs"
                    >
                      {ACTIONS.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-huawei-text-dim/70">协议</label>
                    <select
                      value={rule.protocol}
                      onChange={e => updateRule(index, 'protocol', e.target.value)}
                      className="text-xs"
                    >
                      {PROTOCOLS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-huawei-text-dim/70">描述</label>
                    <input
                      type="text"
                      value={rule.description}
                      onChange={e => updateRule(index, 'description', e.target.value)}
                      placeholder="规则描述"
                      className="text-xs"
                    />
                  </div>
                </div>

                {/* 第二行：源地址 + 目标地址 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  <div className="flex gap-1">
                    <div className="flex-1">
                      <label className="text-xs text-huawei-text-dim/70">源 IP</label>
                      <input
                        type="text"
                        value={rule.source}
                        onChange={e => updateRule(index, 'source', e.target.value)}
                        placeholder="如 192.168.1.0"
                        className="text-xs"
                      />
                    </div>
                    <div className="w-24">
                      <label className="text-xs text-huawei-text-dim/70">掩码</label>
                      <input
                        type="text"
                        value={rule.sourceMask}
                        onChange={e => updateRule(index, 'sourceMask', e.target.value)}
                        placeholder="0.0.0.255"
                        className="text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <div className="flex-1">
                      <label className="text-xs text-huawei-text-dim/70">目标 IP</label>
                      <input
                        type="text"
                        value={rule.destination}
                        onChange={e => updateRule(index, 'destination', e.target.value)}
                        placeholder="如 10.0.0.0"
                        className="text-xs"
                      />
                    </div>
                    <div className="w-24">
                      <label className="text-xs text-huawei-text-dim/70">掩码</label>
                      <input
                        type="text"
                        value={rule.destMask}
                        onChange={e => updateRule(index, 'destMask', e.target.value)}
                        placeholder="0.0.0.255"
                        className="text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* 第三行：目标端口 */}
                <div>
                  <label className="text-xs text-huawei-text-dim/70">目标端口</label>
                  <div className="flex gap-1">
                    <select
                      value={rule.destPortOperator}
                      onChange={e => updateRule(index, 'destPortOperator', e.target.value)}
                      className="text-xs w-20"
                    >
                      {PORT_OPERATORS.map(op => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={rule.destPort}
                      onChange={e => updateRule(index, 'destPort', e.target.value)}
                      placeholder="如 80, 443"
                      className="text-xs flex-1"
                    />
                  </div>
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
              生成 ACL 配置
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
