# 华为网络配置生成器

Huawei Network Configuration Generator — Web 工具，用于生成华为交换机和路由器的 CLI 配置，并支持上传 `display current-configuration` 文件进行安全风险分析。

## 功能

| 模块 | 说明 |
|------|------|
| VLAN 配置 | Access/Trunk/Hybrid 端口、VLANIF 网关、批量端口 |
| OSPF 配置 | 区域/网络/认证/计时器/静默接口 |
| ACL/安全策略 | 基本 ACL、高级 ACL、防火墙安全策略 |
| STP 配置 | MSTP/RSTP 模式、边缘端口、BPDU 保护、TC 保护 |
| NAT/DHCP | AR 路由器 NAT Outbound、DHCP 地址池 |
| 设备模板 | 内置 S5700/S5735/AR/USG6000 四套默认端口布局 |
| 配置分析 | 上传配置文件，检测弱密码/接口/STP/VLAN/ACL/OSPF 六大类风险，生成 HTML 报告 |

## 技术栈

- **前端**: React 18 + Vite + TailwindCSS
- **后端**: Node.js + Express
- **部署**: Vercel（前端） + Render（后端）

## 本地开发

```bash
# 1. 安装根依赖
npm install

# 2. 安装前后端依赖
npm run install:all

# 3. 启动开发环境（前后端并行）
npm run dev
```

- 前端: `http://localhost:5173`
- 后端: `http://localhost:3001`

## 项目结构

```
huawei-config-generator/
├── client/                  # React 前端
│   ├── src/
│   │   ├── api.js           # API 地址适配（自动切换本地/生产）
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── VLANForm.jsx
│   │   │   ├── OSPFForm.jsx
│   │   │   ├── ACLForm.jsx
│   │   │   ├── STPForm.jsx
│   │   │   ├── ConfigAnalyzer.jsx  # 配置安全分析
│   │   │   ├── ConfigPreview.jsx
│   │   │   ├── DeviceSelector.jsx
│   │   │   ├── ExportButtons.jsx
│   │   │   ├── Templates.jsx
│   │   │   └── AIAssistant.jsx
│   │   └── hooks/useConfig.js
│   ├── .env.development     # 开发环境变量
│   ├── .env.production      # 生产环境变量（部署时修改）
│   └── vercel.json          # Vercel 部署配置
├── server/                  # Express 后端
│   ├── index.js             # 入口 + API 路由 + 生产静态托管
│   ├── parser/              # VRP 配置解析器
│   ├── analyzer/            # 6 类安全风险分析模块
│   ├── generators/          # 配置生成器
│   ├── report/              # HTML 报告生成
│   ├── utils/               # 校验工具
│   ├── device-definitions.js
│   └── .env.example         # 环境变量模板
└── .gitignore
```

## 公网部署

### 架构

```
用户浏览器 → Vercel (前端静态) → Render (后端 API)
```

### 第 1 步：上传到 GitHub

```bash
cd huawei-config-generator

# 初始化仓库（如果还没有）
git init
git add -A
git commit -m "init: 华为配置生成器"

# 在 github.com 创建新仓库后：
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git branch -M main
git push -u origin main
```

### 第 2 步：部署后端到 Render

1. 打开 [dashboard.render.com](https://dashboard.render.com) 登录
2. 点击 **New +** → **Web Service**
3. 连接 GitHub 仓库，选择刚才上传的仓库
4. 配置：
   - **Name**: `huawei-config-server`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Plan**: Free
5. 添加环境变量（Environment → Environment Variables）：
   ```
   NODE_ENV=production
   ALLOWED_ORIGINS=https://<你的Vercel域名>.vercel.app
   ```
   > `ALLOWED_ORIGINS` 等 Vercel 部署后拿到域名再回填，也可先填 `*` 测试
6. 点击 **Create Web Service**，等待部署完成
7. 复制 Render 分配的 URL，例如 `https://huawei-config-server.onrender.com`

### 第 3 步：部署前端到 Vercel

1. 打开 [vercel.com](https://vercel.com) 登录
2. 点击 **Add New** → **Project**
3. 导入 GitHub 仓库
4. 配置：
   - **Framework**: `Vite`
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. 添加环境变量：
   ```
   VITE_API_BASE=https://huawei-config-server.onrender.com/api
   ```
   > 把域名换成 Render 第 7 步的实际 URL + `/api`
6. 点击 **Deploy**
7. Vercel 会分配域名，例如 `https://huawei-config.vercel.app`
8. **回填 Render 的 CORS**：把 Vercel 域名填回 Render 的 `ALLOWED_ORIGINS` 环境变量

### 第 4 步：验证

1. 浏览器访问 Vercel 域名
2. 确认设备选择器能加载设备列表（API 调通）
3. 测试 VLAN/OSPF 等配置生成功能
4. 测试配置分析上传功能
5. 检查 Render 日志确认无 CORS 错误

## 环境变量参考

### 前端 (Vite)

| 变量 | 说明 | 示例 |
|------|------|------|
| `VITE_API_BASE` | 后端 API 地址 | `https://xxx.onrender.com/api` |

### 后端 (Express)

| 变量 | 说明 | 示例 |
|------|------|------|
| `PORT` | 服务端口（Render 自动注入） | `3001` |
| `NODE_ENV` | 运行环境 | `production` |
| `ALLOWED_ORIGINS` | 允许的前端域名（CORS） | `https://xxx.vercel.app` |

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/devices` | 设备列表 |
| GET | `/api/devices/:id` | 设备详情 |
| POST | `/api/generate/vlan` | 生成 VLAN 配置 |
| POST | `/api/generate/ospf` | 生成 OSPF 配置 |
| POST | `/api/generate/acl` | 生成 ACL 配置 |
| POST | `/api/generate/stp` | 生成 STP 配置 |
| POST | `/api/generate/nat` | 生成 NAT/DHCP 配置 |
| POST | `/api/generate/security` | 生成安全策略配置 |
| POST | `/api/analyze` | 配置安全分析 |
| GET | `/api/health` | 健康检查 |

## License

MIT
