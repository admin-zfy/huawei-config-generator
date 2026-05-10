/**
 * 华为 OSPF 路由协议配置生成器 — 真实 VRP CLI 格式 (设备感知)
 */
const { validateRouterID, validateOSPArea, validateIPAddress } = require('../utils/validator');
const { getDevice } = require('../device-definitions');

function generateOSPF(params, deviceId) {
  const errors = [];
  const dev = deviceId ? getDevice(deviceId) : null;

  const ridCheck = validateRouterID(params.routerId);
  if (!ridCheck.valid) errors.push(ridCheck.error);

  const areaCheck = validateOSPArea(params.area);
  if (!areaCheck.valid) errors.push(areaCheck.error);
  const area = areaCheck.value || params.area;

  const processId = params.processId || 1;

  const validNetworks = [];
  if (params.networks && Array.isArray(params.networks)) {
    for (let i = 0; i < params.networks.length; i++) {
      const net = params.networks[i];
      if (!net.address) { errors.push(`网络宣告 #${i + 1}: 缺少网络地址`); continue; }
      const ipCheck = validateIPAddress(net.address, `网络地址 #${i + 1}`);
      if (!ipCheck.valid) { errors.push(ipCheck.error); continue; }
      if (!net.wildcard) { errors.push(`网络宣告 #${i + 1}: 缺少通配符掩码`); continue; }
      const wcCheck = validateIPAddress(net.wildcard, `通配符掩码 #${i + 1}`);
      if (!wcCheck.valid) { errors.push(wcCheck.error); continue; }
      validNetworks.push({ address: net.address.trim(), wildcard: net.wildcard.trim(), interface: net.interface || null });
    }
  }

  if (errors.length > 0) {
    throw Object.assign(new Error(errors.join('; ')), { validationErrors: errors, warnings: [] });
  }

  const now = new Date().toLocaleString('zh-CN', { hour12: false });
  const devLabel = dev ? dev.systemHeader : 'VRP Device';
  const lines = [];

  lines.push(`#`);
  lines.push(`# 华为 ${devLabel} OSPF 路由协议配置`);
  lines.push(`# 生成时间: ${now}`);
  lines.push(`# Router ID: ${params.routerId.trim()}`);
  lines.push(`# Area: ${area} | 进程ID: ${processId}`);
  if (dev) lines.push(`# 设备: ${dev.label}`);
  lines.push(`#`);
  lines.push(``);
  lines.push(`system-view`);
  lines.push(``);

  // 防火墙的 OSPF 需要在虚拟路由器上下文中
  if (dev && dev.category === 'firewall') {
    lines.push(`# 防火墙 OSPF — 系统视图下直接配置`);
  }

  lines.push(`# 启用 OSPF 进程`);
  lines.push(`ospf ${processId} router-id ${params.routerId.trim()}`);
  lines.push(`#`);

  if (params.areaType) {
    const areaId = params.areaId || area;
    switch (params.areaType) {
      case 'nssa':
        lines.push(`# NSSA 区域`);
        lines.push(` area ${areaId}`);
        lines.push(`  nssa default-route-advertise no-summary`);
        break;
      case 'stub':
        lines.push(`# Stub 区域`);
        lines.push(` area ${areaId}`);
        lines.push(`  stub no-summary`);
        break;
    }
    lines.push(`#`);
  }

  if (validNetworks.length > 0) {
    lines.push(`# 网络宣告`);
    for (const net of validNetworks) {
      lines.push(` area ${area}`);
      lines.push(`  network ${net.address} ${net.wildcard}`);
    }
    lines.push(`#`);
  }

  lines.push(`# OSPF 性能调优`);
  lines.push(` spf-schedule-interval 5 500 1000`);
  lines.push(` bandwidth-reference 1000`);
  lines.push(`#`);

  if (params.silentInterfaces && Array.isArray(params.silentInterfaces) && params.silentInterfaces.length > 0) {
    lines.push(`# 静默接口`);
    for (const ifName of params.silentInterfaces) {
      lines.push(` silent-interface ${ifName}`);
    }
    lines.push(`#`);
  }

  if (dev && dev.category === 'firewall') {
    lines.push(`# 防火墙安全区域宣告 OSPF 接口:`);
    lines.push(`# interface GigabitEthernet1/0/0`);
    lines.push(`#  ospf enable ${processId} area ${area}`);
    lines.push(`#`);
  }

  lines.push(`#`);
  lines.push(`# 验证命令`);
  lines.push(`# display ospf peer brief`);
  lines.push(`# display ospf routing`);
  lines.push(`#`);
  lines.push(`save`);
  lines.push(`Y`);
  lines.push(``);
  lines.push(`return`);

  return lines.join('\n');
}

module.exports = { generateOSPF };
