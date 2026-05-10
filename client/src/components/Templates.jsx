import { useState } from 'react';
import { Building2, Hotel, GraduationCap, Video, ArrowRight, CheckCircle2, Copy } from 'lucide-react';

const TEMPLATES = [
  {
    id: 'enterprise',
    name: '企业办公网',
    icon: Building2,
    color: '#00b4d8',
    description: '适用于中小企业办公网络，包含多个 VLAN 划分、OSPF 路由、ACL 安全策略',
    features: ['VLAN 10: 管理网', 'VLAN 20: 办公网', 'VLAN 30: 访客网', 'VLAN 40: 服务器区', 'OSPF Area 0', '基本 ACL 策略'],
    config: `#
# 华为企业办公网络配置模板
# 生成时间: ${new Date().toLocaleString('zh-CN')}
# 场景: 中小企业办公网络
#

system-view

# ========== VLAN 配置 ==========
# 创建 VLAN
vlan batch 10 20 30 40

# 管理 VLAN
vlan 10
 description Management
 quit

interface Vlanif10
 description Gateway_Management
 ip address 192.168.10.1 255.255.255.0
 quit

# 办公 VLAN
vlan 20
 description Office
 quit

interface Vlanif20
 description Gateway_Office
 ip address 192.168.20.1 255.255.255.0
 dhcp select relay
 dhcp relay server-ip 192.168.10.10
 quit

# 访客 VLAN
vlan 30
 description Guest
 quit

interface Vlanif30
 description Gateway_Guest
 ip address 192.168.30.1 255.255.255.0
 quit

# 服务器 VLAN
vlan 40
 description Server
 quit

interface Vlanif40
 description Gateway_Server
 ip address 192.168.40.1 255.255.255.0
 quit

# ========== Access 端口 ==========
# 办公区域端口
interface GigabitEthernet0/0/1
 description Access_Office_Floor1
 port link-type access
 port default vlan 20
 stp edged-port enable
 quit

interface GigabitEthernet0/0/2
 description Access_Office_Floor2
 port link-type access
 port default vlan 20
 stp edged-port enable
 quit

# 服务器端口
interface GigabitEthernet0/0/10
 description Access_Server_Rack1
 port link-type access
 port default vlan 40
 quit

# ========== Trunk 端口 ==========
interface GigabitEthernet0/0/24
 description Trunk_Uplink_Core
 port link-type trunk
 port trunk allow-pass vlan 10 20 30 40
 quit

# ========== STP 配置 ==========
stp mode mstp
stp enable
stp region-configuration
 region-name ENTERPRISE
 instance 1 vlan 10 20 30
 instance 2 vlan 40
 active region-configuration

stp instance 0 root primary
stp bpdu-protection

# ========== OSPF 路由配置 ==========
ospf 1 router-id 1.1.1.1
 area 0.0.0.0
  network 192.168.10.0 0.0.0.255
  network 192.168.20.0 0.0.0.255
  network 192.168.30.0 0.0.0.255
  network 192.168.40.0 0.0.0.255
 quit

# ========== ACL 安全策略 ==========
# 访客网络不能访问办公网和服务器
acl number 3000
 description Guest_to_Office_Deny
 rule 5 deny ip source 192.168.30.0 0.0.0.255 destination 192.168.20.0 0.0.0.255
 rule 10 deny ip source 192.168.30.0 0.0.0.255 destination 192.168.40.0 0.0.0.255
 rule 100 permit ip
 quit

# 在访客网关入方向应用 ACL
interface Vlanif30
 traffic-filter inbound acl 3000
 quit

# ========== 安全加固 ==========
# 关闭未使用端口
# interface range GigabitEthernet0/0/3 to GigabitEthernet0/0/9
#  shutdown
#  quit

save
y
return`,
  },
  {
    id: 'hotel',
    name: '酒店网络',
    icon: Hotel,
    color: '#a78bfa',
    description: '适用于酒店/客房网络，包含客房 VLAN、IPTV VLAN、管理 VLAN',
    features: ['VLAN 10: 管理网', 'VLAN 50: 客房网', 'VLAN 60: IPTV', 'VLAN 70: 公共区域 WiFi', 'Portal 认证准备', '带宽限速'],
    config: `#
# 华为酒店网络配置模板
# 生成时间: ${new Date().toLocaleString('zh-CN')}
# 场景: 酒店/客房网络
#

system-view

# ========== VLAN 配置 ==========
vlan batch 10 50 60 70

# 管理 VLAN
vlan 10
 description Management
 quit

interface Vlanif10
 description Gateway_Management
 ip address 10.10.10.1 255.255.255.0
 quit

# 客房 VLAN
vlan 50
 description GuestRoom
 quit

interface Vlanif50
 description Gateway_GuestRoom
 ip address 10.10.50.1 255.255.255.0
 dhcp select relay
 dhcp relay server-ip 10.10.10.10
 quit

# IPTV VLAN
vlan 60
 description IPTV
 quit

interface Vlanif60
 description Gateway_IPTV
 ip address 10.10.60.1 255.255.255.0
 igmp enable
 igmp version 3
 quit

# 公共 WiFi VLAN
vlan 70
 description Public_WiFi
 quit

interface Vlanif70
 description Gateway_PublicWiFi
 ip address 10.10.70.1 255.255.255.0
 dhcp select relay
 dhcp relay server-ip 10.10.10.10
 quit

# ========== 端口配置示例 ==========
# 客房端口 (Access + IPTV)
interface GigabitEthernet0/0/1
 description GuestRoom_101
 port link-type hybrid
 port hybrid pvid vlan 50
 port hybrid untagged vlan 50 60
 stp edged-port enable
 quit

# 公共区域 AP
interface GigabitEthernet0/0/20
 description AP_Lobby
 port link-type trunk
 port trunk allow-pass vlan 10 70
 port trunk pvid vlan 70
 quit

# ========== 上行端口 ==========
interface GigabitEthernet0/0/24
 description Trunk_Uplink
 port link-type trunk
 port trunk allow-pass vlan 10 50 60 70
 quit

# ========== STP ==========
stp mode rstp
stp enable
stp bpdu-protection

# ========== ACL (客房隔离) ==========
# 客房之间二层隔离 (使用端口隔离)
# port-isolate mode l2
# interface GigabitEthernet0/0/1
#  port-isolate enable
#  quit

acl number 3000
 description GuestRoom_Internet_Only
 rule 5 permit ip source 10.10.50.0 0.0.0.255
 rule 10 permit ip source 10.10.70.0 0.0.0.255
 quit

# ========== 带宽限速 (QoS) ==========
# 每客房限速 10Mbps
# traffic classifier GuestRoom
#  if-match vlan-id 50
# traffic behavior Limit10M
#  car cir 10240 cbs 1024000
# traffic policy Hotel_QoS
#  classifier GuestRoom behavior Limit10M

save
y
return`,
  },
  {
    id: 'campus',
    name: '校园网络',
    icon: GraduationCap,
    color: '#06d6a0',
    description: '适用于校园/教育机构网络，多区域 OSPF、教学/办公/宿舍网络分离',
    features: ['VLAN 分层设计', '教学/办公/宿舍分离', '多 Area OSPF', 'DHCP 中继', '环路保护', '安全 ACL'],
    config: `#
# 华为校园网络配置模板
# 生成时间: ${new Date().toLocaleString('zh-CN')}
# 场景: 校园/教育机构网络
#

system-view

# ========== VLAN 规划 ==========
vlan batch 10 20 30 40 50 60

# 管理网
vlan 10
 description Management
 quit

interface Vlanif10
 description Gateway_Mgmt
 ip address 172.16.10.1 255.255.255.0
 quit

# 教学区
vlan 20
 description Teaching
 quit

interface Vlanif20
 description Gateway_Teaching
 ip address 172.16.20.1 255.255.255.0
 dhcp select relay
 dhcp relay server-ip 172.16.10.10
 quit

# 办公区
vlan 30
 description Office
 quit

interface Vlanif30
 description Gateway_Office
 ip address 172.16.30.1 255.255.255.0
 dhcp select relay
 dhcp relay server-ip 172.16.10.10
 quit

# 学生宿舍
vlan 40
 description Dormitory
 quit

interface Vlanif40
 description Gateway_Dormitory
 ip address 172.16.40.1 255.255.255.0
 dhcp select relay
 dhcp relay server-ip 172.16.10.10
 quit

# 图书馆
vlan 50
 description Library
 quit

interface Vlanif50
 description Gateway_Library
 ip address 172.16.50.1 255.255.255.0
 quit

# 服务器区
vlan 60
 description ServerFarm
 quit

interface Vlanif60
 description Gateway_Servers
 ip address 172.16.60.1 255.255.255.0
 quit

# ========== 链路聚合 (核心到汇聚) ==========
interface Eth-Trunk1
 description Core_to_Distribution
 port link-type trunk
 port trunk allow-pass vlan 10 20 30 40 50 60
 mode lacp
 quit

interface GigabitEthernet0/0/23
 eth-trunk 1
 quit

interface GigabitEthernet0/0/24
 eth-trunk 1
 quit

# ========== MSTP ==========
stp mode mstp
stp enable
stp region-configuration
 region-name CAMPUS
 revision-level 1
 instance 1 vlan 20 30 50
 instance 2 vlan 40
 instance 3 vlan 60
 active region-configuration

stp instance 0 root primary
stp instance 1 root primary
stp bpdu-protection
stp tc-protection

# ========== OSPF 多区域 ==========
ospf 1 router-id 2.2.2.2
 area 0.0.0.0
  network 172.16.10.0 0.0.0.255
  network 172.16.60.0 0.0.0.255
 area 0.0.0.1
  network 172.16.20.0 0.0.0.255
  network 172.16.30.0 0.0.0.255
  network 172.16.50.0 0.0.0.255
 area 0.0.0.2
  network 172.16.40.0 0.0.0.255
 quit

# ========== 安全 ACL ==========
# 学生宿舍不能访问教学区和办公区
acl number 3000
 description Dormitory_Security
 rule 5 deny ip source 172.16.40.0 0.0.0.255 destination 172.16.20.0 0.0.0.255
 rule 10 deny ip source 172.16.40.0 0.0.0.255 destination 172.16.30.0 0.0.0.255
 rule 100 permit ip
 quit

interface Vlanif40
 traffic-filter inbound acl 3000
 quit

# ========== 端口安全 ==========
# 防止私接路由器
# interface GigabitEthernet0/0/1
#  port-security enable
#  port-security max-mac-num 1
#  quit

save
y
return`,
  },
  {
    id: 'surveillance',
    name: '监控网络',
    icon: Video,
    color: '#ef476f',
    description: '适用于视频监控网络，包含摄像头 VLAN、NVR 存储 VLAN、大带宽保障',
    features: ['VLAN 100: 摄像头', 'VLAN 200: NVR存储', 'VLAN 10: 管理', 'QoS 带宽保障', '端口隔离', 'PoE 配置'],
    config: `#
# 华为监控网络配置模板
# 生成时间: ${new Date().toLocaleString('zh-CN')}
# 场景: 视频监控网络
#

system-view

# ========== VLAN 配置 ==========
vlan batch 10 100 200

# 管理 VLAN
vlan 10
 description Management
 quit

interface Vlanif10
 description Gateway_Management
 ip address 10.0.10.1 255.255.255.0
 quit

# 摄像头 VLAN
vlan 100
 description IP_Camera
 quit

interface Vlanif100
 description Gateway_Camera
 ip address 10.0.100.1 255.255.255.0
 dhcp select relay
 dhcp relay server-ip 10.0.10.10
 quit

# NVR 存储 VLAN
vlan 200
 description NVR_Storage
 quit

interface Vlanif200
 description Gateway_NVR
 ip address 10.0.200.1 255.255.255.0
 quit

# ========== Access 端口 ==========
# 摄像头端口 (PoE)
interface GigabitEthernet0/0/1
 description IP_Camera_Parking_01
 port link-type access
 port default vlan 100
 stp edged-port enable
 # PoE (如支持)
 # poe enable
 # poe power 15400
 quit

interface GigabitEthernet0/0/2
 description IP_Camera_Entrance_01
 port link-type access
 port default vlan 100
 stp edged-port enable
 quit

# NVR 端口
interface GigabitEthernet0/0/20
 description NVR_Server_01
 port link-type access
 port default vlan 200
 quit

# ========== 上行端口 ==========
interface GigabitEthernet0/0/24
 description Trunk_Uplink_Core
 port link-type trunk
 port trunk allow-pass vlan 10 100 200
 quit

# ========== STP ==========
stp mode rstp
stp enable
stp bpdu-protection

# 摄像头端口设为边缘端口
interface range GigabitEthernet0/0/1 to GigabitEthernet0/0/19
 stp edged-port enable
 stp bpdu-filter enable
 quit

# ========== 端口隔离 (摄像头之间隔离) ==========
# port-isolate mode l2
# interface range GigabitEthernet0/0/1 to GigabitEthernet0/0/19
#  port-isolate enable
#  quit

# ========== ACL ==========
# 摄像头 VLAN 仅允许与 NVR 通信
acl number 3000
 description Camera_NVR_Only
 rule 5 permit ip source 10.0.100.0 0.0.0.255 destination 10.0.200.0 0.0.0.255
 rule 10 permit ip source 10.0.100.0 0.0.0.255 destination 10.0.10.0 0.0.0.255
 rule 15 deny ip source 10.0.100.0 0.0.0.255
 quit

interface Vlanif100
 traffic-filter inbound acl 3000
 quit

# ========== QoS 带宽保障 ==========
# 保障监控视频流量优先级
# traffic classifier Camera
#  if-match vlan-id 100
# traffic behavior PriorityHigh
#  remark dscp ef
#  queue ef wfq weight 30
# traffic policy Surveillance_QoS
#  classifier Camera behavior PriorityHigh

# ========== SNMP 监控 ==========
snmp-agent
snmp-agent sys-info version v2c v3
snmp-agent community read Monitor@2024
snmp-agent trap enable

save
y
return`,
  },
];

export default function Templates({ onSelect }) {
  const [selectedId, setSelectedId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const handleSelect = (template) => {
    setSelectedId(template.id);
    onSelect(template.config);
  };

  const handleCopy = async (e, template) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(template.config);
      setCopiedId(template.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = template.config;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId(template.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="bg-huawei-card border border-huawei-border rounded-xl p-5">
        <p className="text-sm text-huawei-text-dim leading-relaxed">
          内置华为网络配置模板，覆盖常见部署场景。选择一个模板即可快速加载完整配置，
          可在右侧预览并导出为 TXT 或 PDF。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {TEMPLATES.map(template => {
          const Icon = template.icon;
          const isSelected = selectedId === template.id;

          return (
            <div
              key={template.id}
              onClick={() => handleSelect(template)}
              className={`bg-huawei-card border rounded-xl p-5 cursor-pointer card-hover transition-all duration-300 ${
                isSelected ? 'border-huawei-primary shadow-neon' : 'border-huawei-border'
              }`}
            >
              {/* 头部 */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: template.color + '15' }}
                  >
                    <Icon size={22} style={{ color: template.color }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-huawei-text-bright">
                      {template.name}
                    </h3>
                    <p className="text-xs text-huawei-text-dim mt-0.5">
                      {template.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => handleCopy(e, template)}
                  className="p-1.5 hover:bg-huawei-panel rounded transition flex-shrink-0"
                  title="复制配置"
                >
                  {copiedId === template.id ? (
                    <CheckCircle2 size={16} className="text-huawei-success" />
                  ) : (
                    <Copy size={16} className="text-huawei-text-dim" />
                  )}
                </button>
              </div>

              {/* 特性列表 */}
              <div className="space-y-1.5 mb-3">
                {template.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-1 h-1 rounded-full flex-shrink-0"
                      style={{ background: template.color }}
                    />
                    <span className="text-huawei-text-dim">{f}</span>
                  </div>
                ))}
              </div>

              {/* 选择按钮 */}
              <button
                className={`w-full py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                  isSelected
                    ? 'text-white'
                    : 'text-huawei-text-dim border border-huawei-border hover:border-huawei-primary hover:text-huawei-primary'
                }`}
                style={isSelected ? { background: `linear-gradient(135deg, ${template.color}90, ${template.color}40)` } : {}}
              >
                {isSelected ? (
                  <>
                    <CheckCircle2 size={14} />
                    已加载到预览
                  </>
                ) : (
                  <>
                    <ArrowRight size={14} />
                    加载模板
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
