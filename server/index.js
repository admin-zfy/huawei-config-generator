const express = require('express');
const cors = require('cors');
const path = require('path');
const { generateVLAN } = require('./generators/vlan');
const { generateOSPF } = require('./generators/ospf');
const { generateACL } = require('./generators/acl');
const { generateSTP } = require('./generators/stp');
const { generateNAT } = require('./generators/nat');
const { generateSecurity } = require('./generators/security');
const { getDeviceList, getDevice, getInterfaceSummary, getDefaultPorts, getPortPlaceholder } = require('./device-definitions');
const { parseVRPConfig } = require('./parser/vrp-parser');
const { runAnalysis } = require('./analyzer/index');
const { generateReport } = require('./report/generator');

const app = express();
const PORT = process.env.PORT || 3001;

const IS_VERCEL = !!process.env.VERCEL;
const IS_PROD = process.env.NODE_ENV === 'production' || IS_VERCEL;

// CORS — 全栈部署同域，开发环境放开
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));

// 生产/Vercel 环境 — 托管前端静态资源
if (IS_PROD) {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

function handleGenerate(res, generateFn, configName) {
  try {
    const config = generateFn();
    const lineCount = config.split('\n').length;
    console.log(`[${configName}] 生成成功 — ${lineCount} 行`);
    res.json({ success: true, config, lineCount });
  } catch (err) {
    if (err.validationErrors) {
      console.warn(`[${configName}] 校验失败:`, err.validationErrors);
      return res.status(400).json({
        success: false,
        error: err.message,
        validationErrors: err.validationErrors,
        warnings: err.warnings || [],
      });
    }
    console.error(`[${configName}] 异常:`, err.message);
    res.status(500).json({ success: false, error: '服务器内部错误: ' + err.message });
  }
}

// ===== 设备信息 =====
app.get('/api/devices', (req, res) => {
  res.json({ success: true, devices: getDeviceList() });
});

app.get('/api/devices/:id', (req, res) => {
  const dev = getDevice(req.params.id);
  if (!dev) return res.status(404).json({ success: false, error: '设备不存在' });
  res.json({
    success: true,
    device: {
      id: dev.id,
      label: dev.label,
      category: dev.category,
      description: dev.description,
      supports: dev.supports,
      interfaces: getInterfaceSummary(dev.id),
      defaultPorts: {
        sample: getPortPlaceholder(dev.id),
      },
    },
  });
});

app.get('/api/devices/:id/ports', (req, res) => {
  const dev = getDevice(req.params.id);
  if (!dev) return res.status(404).json({ success: false, error: '设备不存在' });

  const ports = {};
  for (const [type, iface] of Object.entries(dev.interfaces)) {
    ports[type] = getDefaultPorts(dev.id, type);
  }
  res.json({ success: true, deviceId: dev.id, ports });
});

// ===== VLAN 配置 =====
app.post('/api/generate/vlan', (req, res) => {
  const deviceId = req.body.deviceId;
  handleGenerate(res, () => generateVLAN(req.body, deviceId), `VLAN${deviceId ? ` (${deviceId})` : ''}`);
});

// ===== OSPF 配置 =====
app.post('/api/generate/ospf', (req, res) => {
  const deviceId = req.body.deviceId;
  handleGenerate(res, () => generateOSPF(req.body, deviceId), `OSPF${deviceId ? ` (${deviceId})` : ''}`);
});

// ===== ACL / 安全策略 配置 =====
app.post('/api/generate/acl', (req, res) => {
  const deviceId = req.body.deviceId;
  handleGenerate(res, () => generateACL(req.body, deviceId), `ACL${deviceId ? ` (${deviceId})` : ''}`);
});

// ===== STP 配置 =====
app.post('/api/generate/stp', (req, res) => {
  const deviceId = req.body.deviceId;
  handleGenerate(res, () => generateSTP(req.body, deviceId), `STP${deviceId ? ` (${deviceId})` : ''}`);
});

// ===== NAT/DHCP 配置 (路由器) =====
app.post('/api/generate/nat', (req, res) => {
  const deviceId = req.body.deviceId;
  handleGenerate(res, () => generateNAT(req.body, deviceId), `NAT${deviceId ? ` (${deviceId})` : ''}`);
});

// ===== 安全区域/策略配置 (防火墙) =====
app.post('/api/generate/security', (req, res) => {
  const deviceId = req.body.deviceId;
  handleGenerate(res, () => generateSecurity(req.body, deviceId), `Security${deviceId ? ` (${deviceId})` : ''}`);
});

// ===== 配置分析 =====
app.post('/api/analyze', (req, res) => {
  const { configText } = req.body;
  if (!configText || typeof configText !== 'string' || configText.trim().length === 0) {
    return res.status(400).json({ success: false, error: '请提供有效的配置文本' });
  }

  try {
    const parsed = parseVRPConfig(configText);
    const { findings, summary, byCategory } = runAnalysis(parsed);
    const parsedWithAnalysis = Object.assign({}, parsed, { _analysisResult: { summary, byCategory } });
    const reportHtml = generateReport(findings, parsedWithAnalysis, configText);

    res.json({ success: true, findings, summary, reportHtml, parsed: { sysname: parsed.sysname } });
  } catch (err) {
    console.error('[Analyze] 分析失败:', err.message);
    res.status(500).json({ success: false, error: '分析过程出错: ' + err.message });
  }
});

app.post('/api/analyze/report', (req, res) => {
  const { configText, format } = req.body;
  if (!configText || typeof configText !== 'string' || configText.trim().length === 0) {
    return res.status(400).json({ success: false, error: '请提供有效的配置文本' });
  }

  try {
    const parsed = parseVRPConfig(configText);
    const { findings, summary, byCategory } = runAnalysis(parsed);
    const parsedWithAnalysis = Object.assign({}, parsed, { _analysisResult: { summary, byCategory } });
    const reportHtml = generateReport(findings, parsedWithAnalysis, configText);

    if (format === 'pdf') {
      // PDF generation requires puppeteer. For now, return HTML and let frontend handle with window.print()
      res.json({ success: true, format: 'html', reportHtml, note: 'PDF请通过浏览器打印功能生成 (Ctrl+P)' });
    } else {
      res.json({ success: true, format: 'html', reportHtml });
    }
  } catch (err) {
    console.error('[Analyze] 报告生成失败:', err.message);
    res.status(500).json({ success: false, error: '报告生成出错: ' + err.message });
  }
});

// ===== 健康检查 =====
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Vercel serverless 导出 app；本地/其他平台直接 listen
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`┌──────────────────────────────────────────────┐`);
    console.log(`│  华为配置生成器 v2.1                            │`);
    console.log(`│  Server: http://localhost:${PORT}                │`);
    console.log(`│  Health: http://localhost:${PORT}/api/health      │`);
    console.log(`├──────────────────────────────────────────────┤`);
    console.log(`│  GET  /api/devices            — 设备列表       │`);
    console.log(`│  GET  /api/devices/:id        — 设备详情       │`);
    console.log(`│  POST /api/generate/vlan      — VLAN配置       │`);
    console.log(`│  POST /api/generate/ospf      — OSPF路由       │`);
    console.log(`│  POST /api/generate/acl       — ACL/安全策略    │`);
    console.log(`│  POST /api/generate/stp       — STP生成树      │`);
    console.log(`│  POST /api/generate/nat       — NAT/DHCP       │`);
    console.log(`│  POST /api/generate/security  — 安全区域/策略   │`);
    console.log(`├──────────────────────────────────────────────┤`);
    console.log(`│  POST /api/analyze            — 配置安全分析   │`);
    console.log(`│  POST /api/analyze/report     — 生成分析报告   │`);
    console.log(`└──────────────────────────────────────────────┘`);
  });
}

module.exports = app;
