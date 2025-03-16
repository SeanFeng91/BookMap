# 枪炮、病毒与钢铁 - 历史地图可视化

这个项目创建了一个交互式Web应用程序，用于可视化《枪炮、病毒与钢铁》一书中提到的历史事件、人口迁徙路线和地理因素，帮助读者更直观地理解人类文明发展的地理模式。

![项目预览图](preview.png)

## 功能特点

- **历史地图时间线**：通过时间滑块控制，可以查看从公元前10000年到公元2000年的世界历史地图
- **关键历史事件**：标记书中提到的重要历史事件，如农业起源、技术发明、文明形成等
- **人口迁徙路线**：展示主要的人口迁徙路径，如智人走出非洲、农业扩散、蒙古帝国扩张等
- **详细信息展示**：点击地图上的标记可查看事件或迁徙路线的详细信息
- **自动播放功能**：可以自动播放时间线，观察人类历史的发展演变

## 技术栈

- HTML5 / CSS3 / JavaScript
- [Leaflet.js](https://leafletjs.com/)：开源地图可视化库
- [Bootstrap 5](https://getbootstrap.com/)：响应式UI框架
- [D3.js](https://d3js.org/)：数据可视化库
- [historical-basemaps](https://github.com/aourednik/historical-basemaps)：历史地图数据

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

## 数据来源与致谢

本项目使用了以下开源数据：

- [historical-basemaps](https://github.com/aourednik/historical-basemaps) 提供的历史地图数据
- 《枪炮、病毒与钢铁》(Guns, Germs, and Steel) 一书作者贾雷德·戴蒙德的研究

## 项目结构

```
WorldHistoryViz/
│
├── index.html              # 主HTML文件
├── css/
│   └── style.css           # 样式文件
│
├── js/
│   ├── main.js             # 主JavaScript文件
│   ├── events-data.js      # 历史事件数据
│   ├── migrations-data.js  # 迁徙路线数据
│   └── map-utils.js        # 地图工具函数
│
└── data/                   # 数据目录（可选，自动从远程仓库加载）
```

## 自定义和扩展

您可以通过编辑以下文件来自定义和扩展此应用：

- `js/events-data.js`：添加或修改历史事件
- `js/migrations-data.js`：添加或修改迁徙路线
- `css/style.css`：自定义应用的外观

## 许可证

本项目采用MIT许可证 - 详见 [LICENSE](LICENSE) 文件 