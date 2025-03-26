# 世界历史地图可视化

本项目是一个基于Web的世界历史地图可视化应用，灵感来源于《枪炮、病毒与钢铁》一书。通过交互式地图，用户可以探索不同时期的世界地图、历史事件和人类迁徙路线。

## 项目特点

- 时间轴驱动的历史地图浏览，覆盖从公元前10,000年到现代的历史
- 显示各时期重要的历史事件和人类迁徙路线
- 按类别筛选历史事件
- 事件详情查看功能
- 简洁直观的时间轴控制

## 项目结构

项目采用模块化结构，各模块的功能如下：

### 核心模块

- `app.js` - 主应用模块，整合所有功能模块
- `map-utils.js` - 地图工具函数库，处理GeoJSON数据和地图操作
- `data-loader.js` - 数据加载模块，负责加载和处理历史数据
- `map-manager.js` - 地图管理模块，负责地图的初始化和更新
- `timeline-manager.js` - 时间轴管理模块，处理年份控制和时间轴交互
- `events-manager.js` - 事件管理模块，处理历史事件的显示和交互

### 数据文件

数据文件位于 `data` 目录下：

- `historical_events.json` - 历史事件数据
- `human_migrations.json` - 人类迁徙路线数据
- `technological_developments.json` - 技术发展数据
- `regional_species.json` - 区域物种数据
- `social_organizations.json` - 社会组织数据
- 其他关联数据文件

### 地图数据

历史地图数据位于 `../historical-basemaps/geojson` 目录下，包含不同时期的世界地图GeoJSON文件。

## 模块化设计

项目采用模块化设计，主要优势包括：

1. **代码组织清晰**：每个模块负责特定的功能，降低了代码的复杂度
2. **维护性更好**：可以独立维护各个模块，不会相互影响
3. **可扩展性强**：可以方便地添加新功能或替换现有模块
4. **复用性高**：模块间的低耦合设计使得代码更容易在其他项目中复用

## 数据流

应用的数据流如下：

1. 用户通过时间轴或年份输入选择一个年份
2. `TimelineManager` 捕获这一变化并通知主应用
3. 主应用调用 `MapManager` 来更新地图
4. `MapManager` 使用 `map-utils.js` 中的工具函数加载相应的历史地图
5. 主应用同时调用 `EventsManager` 来更新事件列表和事件详情
6. `EventsManager` 使用 `data-loader.js` 提供的函数筛选与当前年份相关的事件

## 使用

1. 打开 `index.html` 文件
2. 使用时间轴或输入框选择年份
3. 查看地图上的历史事件和迁徙路线
4. 点击事件可查看详情
5. 使用左侧的类别按钮筛选事件

## 数据来源

- 历史事件和迁徙路线数据基于《枪炮、病毒与钢铁》一书
- 历史地图数据基于 [historical-basemaps](https://github.com/aourednik/historical-basemaps) 项目

## 技术栈

- HTML5
- CSS3
- JavaScript (ES6+)
- Leaflet.js (地图库)
- Tailwind CSS (样式库)

## 安装与使用

### 在线使用

访问[项目演示网站](https://your-demo-site.com)即可在线使用本应用。

### 本地安装

1. 克隆本仓库：
   ```
   git clone https://github.com/yourusername/guns-germs-steel-viz.git
   ```

2. 进入项目目录：
   ```
   cd guns-germs-steel-viz
   ```

3. 使用本地Web服务器运行项目（以下是几种方法）：

   - 使用Python内置的HTTP服务器：
     ```
     # Python 3.x
     python -m http.server
     ```

   - 使用Node.js的http-server：
     ```
     # 安装http-server
     npm install -g http-server
     
     # 运行服务器
     http-server
     ```

4. 在浏览器中访问 `http://localhost:8000` 或服务器提供的URL

## 自定义和扩展

您可以通过编辑以下文件来自定义和扩展此应用：

- `js/events-data.js`：添加或修改历史事件
- `js/migrations-data.js`：添加或修改迁徙路线
- `css/style.css`：自定义应用的外观

## 许可证

本项目采用MIT许可证 - 详见 [LICENSE](LICENSE) 文件 