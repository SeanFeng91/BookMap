# 世界历史地图可视化项目

这是一个交互式世界历史地图可视化项目，展示了从史前到现代的重要历史事件、人口迁徙、技术发展、物种驯化和文明演变。

## 项目特点

- 按时间轴浏览世界历史变迁
- 查看各个时期的历史事件、迁徙路线、科技发展
- 多种数据类型：历史事件、人口迁徙、技术发展、物种驯化、文明演变、战争、疾病和农业
- 支持黑暗模式和浅色模式
- 交互式地图界面，支持缩放和平移

## 部署到 Cloudflare Workers

### 准备工作

1. 安装 Wrangler CLI：

```bash
npm install -g wrangler
```

2. 登录到你的 Cloudflare 账号：

```bash
wrangler login
```

### 部署步骤

1. 克隆代码库到本地：

```bash
git clone https://github.com/your-username/world-history-viz.git
cd world-history-viz
```

2. 确保项目结构正确：

```
WorldHistoryViz/
├── css/                # 样式文件
├── data/               # 数据文件
├── js/                 # JavaScript文件
├── maps/               # 地图文件
│   └── geojson/        # GeoJSON地图数据
├── index.html          # 主页面
├── worker.js           # Cloudflare Worker入口
└── wrangler.toml       # Wrangler配置
```

3. 创建 `maps/geojson` 目录并复制地图文件：

```bash
mkdir -p maps/geojson
cp -r historical-basemaps/geojson/* maps/geojson/
```

4. 部署到 Cloudflare Workers：

```bash
wrangler deploy
```

5. 查看部署结果：

```bash
wrangler dev
```

## 文件结构说明

- `css/`: 包含所有样式文件
- `data/`: 包含历史数据JSON文件
- `js/`: 包含应用程序的JavaScript代码
- `maps/geojson/`: 包含历史时期的GeoJSON地图数据
- `index.html`: 主HTML页面
- `worker.js`: Cloudflare Workers的入口点
- `wrangler.toml`: Wrangler部署配置

## 本地开发

1. 安装本地服务器（如http-server）：

```bash
npm install -g http-server
```

2. 启动本地服务器：

```bash
http-server -p 8080
```

3. 在浏览器中打开 [http://localhost:8080](http://localhost:8080)

## 许可证

MIT 