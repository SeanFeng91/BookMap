/**
 * 地图管理模块
 * 负责地图相关操作，如初始化、更新、添加标记和路线等
 */

import { 
    getMapForYear, 
    formatYear, 
    styleByCategory, 
    createEventPopupContent, 
    createMigrationPopupContent,
    eventsToGeoJSON,
    filterEventsByTimeRange,
    filterActiveMigrations,
    calculateMigrationProgress,
    migrationToGeoJSON
} from './map-exports.js';

import { 
    getEventsForYear, 
    getMigrationsForYear 
} from './data-loader.js';

/**
 * 地图管理器类
 * 封装地图的初始化和操作
 */
export class MapManager {
    /**
     * 构造函数
     * @param {string} mapElementId - 地图容器的DOM元素ID
     */
    constructor(mapElementId = 'map') {
        this.mapElementId = mapElementId;
        this.map = null;
        this.baseLayer = null;
        this.geojsonLayer = null;
        this.markersLayer = null;
        this.routesLayer = null;
        this.technologiesLayer = null; // 技术标记图层
        this.speciesLayer = null;      // 物种标记图层
        this.organizationsLayer = null; // 社会组织图层
        this.currentYear = 0;
        this.currentGeoJSON = null;
        this.showEvents = true;
        this.showMigrations = true;
        this.showTechnologies = true;  // 是否显示技术
        this.showSpecies = true;       // 是否显示物种
        this.showOrganizations = true; // 是否显示社会组织
        this.eventMarkersMap = new Map(); // 存储事件ID与对应标记的映射
        
        // 确保所有数组都被初始化，防止未定义错误
        this.eventMarkers = [];
        this.migrationRoutes = [];
        this.techMarkers = [];
        this.speciesMarkers = [];
        this.highlightedElements = [];
        this.labels = [];
        this.labelNames = new Set();
        
        // 国家/地区颜色映射
        this.countryColors = {
            // 文明/帝国
            'roman': '#e74c3c',         // 罗马 - 红色
            'byzantine': '#9b59b6',     // 拜占庭 - 紫色
            'persian': '#d35400',       // 波斯 - 橙棕色
            'mongol': '#795548',        // 蒙古 - 棕色
            'greek': '#3498db',         // 希腊 - 蓝色
            'islamic': '#2c3e50',       // 伊斯兰 - 深蓝色
            'ottoman': '#e67e22',       // 奥斯曼 - 橙色
            'chinese': '#27ae60',       // 中国 - 绿色
            'indian': '#8e44ad',        // 印度 - 深紫色
            'maya': '#f39c12',          // 玛雅 - 橙黄色
            'inca': '#16a085',          // 印加 - 青绿色
            'aztec': '#c0392b',         // 阿兹特克 - 深红色
            
            // 区域
            'europe': '#3498db',        // 欧洲 - 蓝色
            'asia': '#27ae60',          // 亚洲 - 绿色
            'africa': '#f1c40f',        // 非洲 - 黄色
            'north_america': '#e74c3c', // 北美洲 - 红色
            'south_america': '#e67e22', // 南美洲 - 橙色
            'oceania': '#1abc9c',       // 大洋洲 - 青色
            'middle_east': '#d35400',   // 中东 - 橙棕色
            
            // 默认颜色
            'default': '#95a5a6'        // 默认 - 灰色
        };
        
        // 类别颜色映射
        this.categoryColors = {
            '技术': '#2196F3',  // 蓝色
            '农业': '#4CAF50',  // 绿色
            '文明': '#9C27B0',  // 紫色
            '征服': '#F44336',  // 红色
            '疾病': '#FF9800',  // 橙色
            '迁徙': '#795548'   // 棕色
        };
    }
    
    /**
     * 获取国家/地区的颜色
     * @param {Object} feature - GeoJSON特征
     * @returns {string} 颜色十六进制代码
     */
    getCountryColor(feature) {
        if (!feature || !feature.properties) return this.countryColors.default;
        
        // 尝试从各种属性中提取类型或名称
        const props = feature.properties;
        const type = (props.TYPE || props.type || '').toLowerCase();
        const name = (props.NAME || props.name || '').toLowerCase();
        
        // 检查类型匹配
        if (type && this.countryColors[type]) {
            return this.countryColors[type];
        }
        
        // 检查名称中的关键词
        for (const [key, color] of Object.entries(this.countryColors)) {
            if (key === 'default') continue;
            
            if (name.includes(key)) {
                return color;
            }
        }
        
        // 使用不同的颜色为各个国家/地区添加一些变化
        // 使用名称的哈希值来确定颜色
        if (name) {
            const hash = this.simpleHash(name);
            const hue = hash % 360;
            return `hsl(${hue}, 70%, 60%)`;
        }
        
        return this.countryColors.default;
    }
    
    /**
     * 简单哈希函数
     * @param {string} str - 输入字符串
     * @returns {number} 哈希值
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash);
    }
    
    /**
     * 初始化地图
     */
    initialize() {
        console.log('初始化地图...');
        
        // 创建Leaflet地图实例
        this.map = L.map(this.mapElementId, {
            center: [30, 15], // 初始地图中心
            zoom: 2,         // 初始缩放级别
            minZoom: 2,      // 最小缩放级别
            maxZoom: 8,      // 最大缩放级别
            zoomControl: true, // 显示缩放控件
            attributionControl: true, // 显示归属控件
            worldCopyJump: false, // 禁止世界地图复制
            maxBounds: [[-90, -180], [90, 180]], // 限制地图可拖动范围
            maxBoundsViscosity: 1.0, // 完全限制在边界内
            fadeAnimation: true,      // 启用淡入淡出动画
            zoomAnimation: true,      // 启用缩放动画
            markerZoomAnimation: true // 启用标记缩放动画
        });
        
        // 判断当前主题
        const isDarkMode = document.body.classList.contains('dark');
        
        // 添加底图图层 - 使用更美观的地图源
        const lightStyleUrl = 'https://api.maptiler.com/maps/voyager/style.json?key=get_your_own_key';
        const darkStyleUrl = 'https://api.maptiler.com/maps/darkmatter/style.json?key=get_your_own_key';
        
        // 使用备选底图
        const lightTileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
        const darkTileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
        
        // 添加底图图层
        this.baseLayer = L.tileLayer(isDarkMode ? darkTileUrl : lightTileUrl, {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20,
            minZoom: 0
        }).addTo(this.map);
        
        // 监听主题变化
        document.addEventListener('themeChanged', (e) => {
            const isDark = e.detail && e.detail.isDark;
            // 更新底图
            this.baseLayer.setUrl(isDark ? darkTileUrl : lightTileUrl);
        });
        
        // 创建图层组
        this.labelsLayer = L.layerGroup().addTo(this.map);
        
        // 确保所有专用图层也被初始化
        this.geojsonLayer = null; // 先设为null，后面会创建
        this.markersLayer = L.layerGroup().addTo(this.map);
        this.routesLayer = L.layerGroup().addTo(this.map);
        this.technologiesLayer = L.layerGroup().addTo(this.map);
        this.speciesLayer = L.layerGroup().addTo(this.map);
        this.organizationsLayer = L.layerGroup().addTo(this.map);
        
        // 重新初始化数组以确保清空
        this.eventMarkers = [];
        this.migrationRoutes = [];
        this.techMarkers = [];
        this.speciesMarkers = [];
        this.highlightedElements = [];
        this.labels = [];
        this.labelNames = new Set();
        
        // 添加GeoJSON区域边界
        this.loadGeoJSON();
        
        // 添加缩放事件监听器
        this.map.on('zoomend', () => {
            this.updateLabelsVisibility();
        });
        
        // 添加主题切换处理
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            // 短暂延迟以确保DOM类已更新
            setTimeout(() => {
                // 触发自定义事件
                document.dispatchEvent(new CustomEvent('themeChanged', {
                    detail: { isDark: document.body.classList.contains('dark') }
                }));
                
                // 通知地图刷新 - 这会触发重绘
                this.map.invalidateSize();
            }, 50);
        });
        
        console.log('地图初始化完成');
    }
    
    /**
     * 更新地图到指定年份
     * @param {number} year - 目标年份
     * @param {Object} data - 包含事件和迁徙数据的对象
     * @returns {Promise<void>} 
     */
    async updateToYear(year, data) {
        try {
            console.log(`更新地图到年份: ${year}`);
            this.currentYear = year;
            
            // 显示加载中指示器
            this.showLoader();
            
            // 加载指定年份的地图数据
            this.currentGeoJSON = await getMapForYear(year);
            
            // 更新GeoJSON图层
            this.updateGeoJSONLayer();
            
            // 如果有事件数据且启用了事件显示，则更新事件标记
            if (data.historyEvents && this.showEvents) {
                this.updateEventMarkers(data.historyEvents);
            }
            
            // 如果有迁徙数据且启用了迁徙显示，则更新迁徙路线
            if (data.migrations && this.showMigrations) {
                this.updateMigrationRoutes(data.migrations);
            }
            
            // 如果有技术发展数据且启用了技术显示，则更新技术标记
            if (data.technologicalDevelopments && this.showTechnologies) {
                this.updateTechnologicalDevelopments(data.technologicalDevelopments);
            }
            
            // 如果有物种数据且启用了物种显示，则更新物种标记
            if (data.regionalSpecies && this.showSpecies) {
                this.updateRegionalSpecies(data.regionalSpecies);
            }
            
            // 如果有社会组织数据且启用了社会组织显示，则更新社会组织标记
            if (data.socialOrganizations && this.showOrganizations) {
                this.updateSocialOrganizations(data.socialOrganizations);
            }
            
            // 隐藏加载中指示器
            this.hideLoader();
            
            console.log(`地图已更新到年份: ${formatYear(year)}`);
        } catch (error) {
            console.error('更新地图时出错:', error);
            this.hideLoader();
            this.showError('更新地图时出错: ' + error.message);
        }
    }
    
    /**
     * 更新GeoJSON图层
     */
    updateGeoJSONLayer() {
        console.log('更新GeoJSON图层');
        
        // 保存当前GeoJSON数据
        this.currentGeoJSON = this.currentGeoJSON;
        
        // 清除现有图层
        if (this.geojsonLayer) {
            this.map.removeLayer(this.geojsonLayer);
        }
        
        // 清除现有标签
        this.clearRegionLabels();
        
        // 如果没有GeoJSON数据，则不添加新图层
        if (!this.currentGeoJSON) {
            console.warn('没有GeoJSON数据可显示');
            return;
        }
        
        // 保存唯一国家/区域名称集合，用于防止重复标签
        const uniqueNames = new Set();
        
        // 添加新图层
        this.geojsonLayer = L.geoJSON(this.currentGeoJSON, {
            style: (feature) => {
                // 设置区域样式
                return this.getRegionStyle(feature);
            },
            onEachFeature: (feature, layer) => {
                // 为每个区域添加交互
                this.addRegionInteraction(feature, layer);
                
                // 为满足条件的区域添加标签
                if (feature.properties && feature.properties.name) {
                    // 跳过"未命名区域"
                    if (feature.properties.name === "未命名区域" || 
                        feature.properties.name.includes("未命名")) {
                        return;
                    }
                    
                    // 只添加唯一的名称标签
                    if (!uniqueNames.has(feature.properties.name)) {
                        uniqueNames.add(feature.properties.name);
                        this.addLabelToFeature(feature);
                    }
                }
            }
        }).addTo(this.map);
        
        // 监听缩放事件，更新标签可见性
        this.map.on('zoomend', () => {
            this.updateLabelsVisibility();
        });
        
        console.log('GeoJSON图层更新完成');
    }
    
    /**
     * 获取区域样式
     * @param {Object} feature - GeoJSON特征
     * @returns {Object} 样式配置
     */
    getRegionStyle(feature) {
        // 默认样式
        const defaultStyle = {
            fillColor: '#3b82f6',
            fillOpacity: 0.2,
            color: '#64748b',
            weight: 1,
            opacity: 0.8
        };
        
        // 根据属性计算填充颜色
        if (feature.properties) {
            // 如果有fill属性，使用它
            if (feature.properties.fill) {
                defaultStyle.fillColor = feature.properties.fill;
                defaultStyle.fillOpacity = feature.properties.fill_opacity || 0.2;
            } 
            // 如果有color或stroke属性，使用它
            if (feature.properties.color || feature.properties.stroke) {
                defaultStyle.color = feature.properties.color || feature.properties.stroke;
                defaultStyle.opacity = feature.properties.opacity || feature.properties.stroke_opacity || 0.8;
            }
            
            // 如果提供了weight属性，使用它
            if (feature.properties.weight || feature.properties.stroke_width) {
                defaultStyle.weight = feature.properties.weight || feature.properties.stroke_width;
            }
            
            // 如果是历史区域，使用特定样式
            if (feature.properties.type === 'historical') {
                return {
                    fillColor: feature.properties.fill || '#8b5cf6',
                    fillOpacity: feature.properties.fill_opacity || 0.2,
                    color: feature.properties.stroke || '#7c3aed',
                    weight: feature.properties.stroke_width || 1,
                    opacity: feature.properties.stroke_opacity || 0.8,
                    dashArray: '2,2'
                };
            }
            
            // 如果有自定义样式属性，应用它们
            if (feature.properties.style) {
                return {
                    ...defaultStyle,
                    ...feature.properties.style
                };
            }
            
            // 基于特征ID或名称应用不同颜色（如果没有指定颜色）
            if (!feature.properties.fill && !feature.properties.style) {
                const colorSeed = feature.id || feature.properties.name || JSON.stringify(feature.properties);
                defaultStyle.fillColor = this.getCountryColor(feature);
            }
        }
        
        return defaultStyle;
    }
    
    /**
     * 为区域添加交互
     * @param {Object} feature - GeoJSON特征
     * @param {Object} layer - Leaflet图层
     */
    addRegionInteraction(feature, layer) {
        // 添加鼠标悬停效果
        layer.on({
            mouseover: (e) => {
                const layer = e.target;
                layer.setStyle({
                    fillOpacity: 0.3,
                    weight: 2,
                    opacity: 1
                });
                
                layer.bringToFront();
                
                // 显示信息提示
                if (feature.properties && feature.properties.name) {
                    this.showRegionTooltip(feature, layer);
                }
            },
            mouseout: (e) => {
                this.geojsonLayer.resetStyle(e.target);
                this.map.closePopup();
            },
            click: (e) => {
                // 点击显示区域详情
                if (feature.properties) {
                    this.showRegionPopup(feature, e.latlng);
                }
            }
        });
    }
    
    /**
     * 显示区域悬停提示
     * @param {Object} feature - GeoJSON特征
     * @param {Object} layer - Leaflet图层
     */
    showRegionTooltip(feature, layer) {
        const name = feature.properties.name;
        const period = feature.properties.period || '';
        const tooltipContent = `
            <div>
                <strong>${name}</strong>
                ${period ? `<div>${period}</div>` : ''}
            </div>
        `;
        
        layer.bindTooltip(tooltipContent, {
            direction: 'top',
            sticky: true,
            offset: [0, -10],
            opacity: 0.9,
            className: 'region-tooltip'
        }).openTooltip();
    }
    
    /**
     * 显示区域详情弹窗
     * @param {Object} feature - GeoJSON特征
     * @param {Object} latlng - 点击位置
     */
    showRegionPopup(feature, latlng) {
        const properties = feature.properties;
        
        // 检查是否有足够的信息显示
        if (!properties.name) return;
        
        let popupContent = `
            <div class="popup-header">
                <h3 class="popup-title">${properties.name}</h3>
                <button class="popup-close" onclick="this.parentNode.parentNode.parentNode._closeButton.click()">
                    <i class="material-icons-round">close</i>
                </button>
            </div>
            <div class="popup-content">
        `;
        
        // 添加时期信息
        if (properties.period) {
            popupContent += `<p><strong>时期:</strong> ${properties.period}</p>`;
        }
        
        // 添加描述信息
        if (properties.description) {
            popupContent += `<p>${properties.description}</p>`;
        }
        
        // 添加其他可能的属性
        if (properties.population) {
            popupContent += `<p><strong>人口:</strong> ${properties.population}</p>`;
        }
        
        if (properties.culture) {
            popupContent += `<p><strong>文化:</strong> ${properties.culture}</p>`;
        }
        
        if (properties.religion) {
            popupContent += `<p><strong>宗教:</strong> ${properties.religion}</p>`;
        }
        
        // 关闭内容div
        popupContent += `</div>`;
        
        // 如果有更多信息的链接
        if (properties.moreInfo) {
            popupContent += `
                <div class="popup-footer">
                    <button onclick="window.open('${properties.moreInfo}', '_blank')">
                        了解更多
                    </button>
                </div>
            `;
        }
        
        // 创建并打开弹窗
        L.popup({
            maxWidth: 300,
            className: 'custom-popup'
        })
        .setLatLng(latlng)
        .setContent(popupContent)
        .openOn(this.map);
    }
    
    /**
     * 清除区域标签
     */
    clearRegionLabels() {
        if (this.regionLabels) {
            this.regionLabels.forEach(label => {
                if (label._icon) {
                    this.map.removeLayer(label);
                }
            });
        }
        
        this.regionLabels = [];
    }
    
    /**
     * 为特征添加标签
     * @param {Object} feature - GeoJSON特征
     */
    addLabelToFeature(feature) {
        if (!feature.properties || !feature.properties.name) return;
        
        try {
            // 计算区域的中心点
            const layer = L.geoJSON(feature);
            const bounds = layer.getBounds();
            const center = bounds.getCenter();
            
            // 计算区域大小（用于缩放时显示/隐藏）
            const areaSize = this.calculateAreaSize(bounds);
            
            // 创建标签
            const label = L.marker(center, {
                icon: L.divIcon({
                    className: 'region-label',
                    html: feature.properties.name,
                    iconSize: [100, 40],
                    iconAnchor: [50, 20]
                }),
                interactive: false
            });
            
            // 存储区域大小用于缩放时的可见性控制
            label.areaSize = areaSize;
            
            // 添加到地图
            label.addTo(this.map);
            
            // 确保regionLabels数组已初始化
            if (!this.regionLabels) {
                this.regionLabels = [];
            }
            
            // 保存到标签数组中
            this.regionLabels.push(label);
        } catch (error) {
            console.error('为特征添加标签失败:', error);
        }
    }
    
    /**
     * 计算区域大小
     * @param {Object} bounds - Leaflet边界对象
     * @returns {number} 区域大小估计值
     */
    calculateAreaSize(bounds) {
        // 计算边界框对角线长度作为区域大小的估计
        const northEast = bounds.getNorthEast();
        const southWest = bounds.getSouthWest();
        const diagonalDistance = this.map.distance(
            [northEast.lat, northEast.lng],
            [southWest.lat, southWest.lng]
        );
        
        // 返回平方公里为单位的面积估计
        return diagonalDistance / 1000;
    }
    
    /**
     * 更新标签可见性
     */
    updateLabelsVisibility() {
        const currentZoom = this.map.getZoom();
        
        if (!this.regionLabels) return;
        
        this.regionLabels.forEach(label => {
            // 根据缩放级别和区域大小确定可见性
            let isVisible = false;
            
            // 大区域在低缩放级别显示
            if (label.areaSize > 500 && currentZoom >= 2) {
                isVisible = true;
            } 
            // 中等区域在中等缩放级别显示
            else if (label.areaSize > 100 && currentZoom >= 4) {
                isVisible = true;
            } 
            // 小区域在高缩放级别显示
            else if (currentZoom >= 6) {
                isVisible = true;
            }
            
            // 设置可见性
            if (isVisible && label._icon) {
                label._icon.style.display = '';
            } else if (label._icon) {
                label._icon.style.display = 'none';
            }
        });
    }
    
    /**
     * 更新事件标记
     * @param {Array} events - 事件数组
     */
    updateEventMarkers(events) {
        console.log('更新事件标记...');
        
        // 清除现有的事件标记
        this.clearEventMarkers();
        
        if (!events || events.length === 0) {
            console.log('没有事件数据，跳过更新事件标记');
            return;
        }
        
        // 获取与当前年份相关的事件
        const relevantEvents = this.getRelevantEvents(events, this.currentYear);
        console.log(`找到 ${relevantEvents.length} 个相关事件`);
        
        // 创建GeoJSON特征集合
        const features = relevantEvents.map(event => {
            // 检查事件是否有坐标
            if (!event.coordinates || !Array.isArray(event.coordinates) || event.coordinates.length < 2) {
                console.warn(`事件 "${event.name}" 缺少有效坐标`);
                return null;
            }
            
            // 创建GeoJSON特征
            return {
                type: 'Feature',
                properties: {
                    id: event.id,
                    name: event.name,
                    category: event.category,
                    description: event.description,
                    year: event.year,
                    endYear: event.endYear,
                    importance: event.importance || 1,
                    historicalSignificance: event.historicalSignificance,
                    originalData: event.originalData
                },
                geometry: {
                    type: 'Point',
                    coordinates: [event.coordinates[1], event.coordinates[0]] // 注意：GeoJSON使用[经度，纬度]
                }
            };
        }).filter(Boolean); // 过滤掉无效的特征
        
        // 创建GeoJSON图层
        if (features.length > 0) {
            this.eventMarkersLayer = L.geoJSON({
                type: 'FeatureCollection',
                features: features
            }, {
            pointToLayer: (feature, latlng) => {
                    // 根据重要性调整标记大小
                    const size = 24 + (feature.properties.importance || 1) * 4;
                    
                    // 创建自定义HTML标记
                    const icon = L.divIcon({
                        className: 'custom-marker',
                        html: this.createEventMarkerHTML(feature),
                        iconSize: [size, size],
                        iconAnchor: [size/2, size/2],
                        popupAnchor: [0, -size/2 - 5]
                    });
                    
                    // 创建标记
                    const marker = L.marker(latlng, { 
                        icon: icon,
                        riseOnHover: true,
                        riseOffset: 300,
                        zIndexOffset: feature.properties.importance * 100
                    });
                    
                    // 添加气泡
                    marker.bindPopup(this.createEventPopupContent(feature));
                    
                    // 添加到事件标记组
                    this.eventMarkers.push(marker);
                
                return marker;
            }
            }).addTo(this.map);
            
            // 在地图上为事件添加额外的标题标签
            features.forEach(feature => {
                if (feature.properties.importance >= 4) { // 只为重要事件添加标签
                    const latlng = L.latLng(
                        feature.geometry.coordinates[1], 
                        feature.geometry.coordinates[0]
                    );
                    
                    const labelContent = this.createEventLabelHTML(feature);
                    const labelIcon = L.divIcon({
                        className: 'event-label',
                        html: labelContent,
                        iconSize: [200, 40],
                        iconAnchor: [100, -20]
                    });
                    
                    const label = L.marker(latlng, { 
                        icon: labelIcon,
                        zIndexOffset: 1000
                    }).addTo(this.map);
                    
                    this.eventMarkers.push(label);
                }
            });
        }
    }
    
    /**
     * 创建事件标记HTML
     * @param {Object} feature - GeoJSON特征
     * @returns {string} HTML字符串
     */
    createEventMarkerHTML(feature) {
        const properties = feature.properties;
        const category = properties.category || '其他';
        const importance = properties.importance || 1;
        
        // 根据类别选择图标
        let icon = 'category';
        switch (category) {
            case '农业': icon = 'grass'; break;
            case '技术': icon = 'precision_manufacturing'; break;
            case '文明': icon = 'account_balance'; break;
            case '征服': icon = 'gavel'; break;
            case '疾病': icon = 'coronavirus'; break;
            case '迁徙': icon = 'timeline'; break;
        }
        
        // 根据重要性选择尺寸和阴影
        const iconSize = 16 + importance * 2;
        const shadowBlur = 8 + importance * 2;
        
        // 构建HTML
        return `
            <div class="map-marker event-marker" data-event-id="${properties.id}">
                <div class="marker-icon ${category}" style="width: ${iconSize}px; height: ${iconSize}px; box-shadow: 0 0 ${shadowBlur}px rgba(0, 0, 0, 0.3);">
                    <i class="material-icons-round" style="font-size: ${iconSize * 0.6}px;">${icon}</i>
                </div>
            </div>
        `;
    }
    
    /**
     * 创建事件标签HTML
     * @param {Object} feature - GeoJSON特征
     * @returns {string} HTML字符串
     */
    createEventLabelHTML(feature) {
        const properties = feature.properties;
        const name = properties.name;
        
        // 格式化年份
        let yearDisplay = '';
        if (properties.year !== undefined && properties.endYear !== undefined && properties.year !== properties.endYear) {
            yearDisplay = `(${this.formatYear(properties.year)}-${this.formatYear(properties.endYear)})`;
        } else if (properties.year !== undefined) {
            yearDisplay = `(${this.formatYear(properties.year)})`;
        }
        
        return `
            <div class="event-title-label">
                <span class="event-title-text">${name}</span>
                <span class="event-title-year">${yearDisplay}</span>
            </div>
        `;
    }
    
    /**
     * 格式化年份
     * @param {number} year - 年份
     * @returns {string} 格式化后的年份字符串
     */
    formatYear(year) {
        if (year === undefined) return '';
        return year < 0 ? `前${Math.abs(year)}` : `${year}`;
    }
    
    /**
     * 创建事件弹窗内容
     * @param {Object} feature - GeoJSON特征
     * @returns {string} HTML字符串
     */
    createEventPopupContent(feature) {
        const properties = feature.properties;
        
        // 格式化年份
        let yearDisplay = '';
        if (properties.year !== undefined && properties.endYear !== undefined && properties.year !== properties.endYear) {
            yearDisplay = `${this.formatYear(properties.year)} - ${this.formatYear(properties.endYear)}`;
        } else if (properties.year !== undefined) {
            yearDisplay = this.formatYear(properties.year);
        } else {
            yearDisplay = '未知时间';
        }
        
        // 获取重要性星级
        const importanceStars = '★'.repeat(properties.importance || 0);
        
        // 构建详情内容
        return `
            <div class="event-popup">
                <h3 class="text-lg font-semibold text-gray-900">${properties.name}</h3>
                
                <div class="flex justify-between items-center text-sm text-gray-600 mt-1 mb-2">
                    <div>
                        <i class="material-icons-round align-middle text-sm">event</i>
                        ${yearDisplay}
                    </div>
                    <div class="text-amber-500">
                        ${importanceStars}
                    </div>
                </div>
                
                <div class="text-sm text-gray-600 mt-2">
                    ${properties.description || '无详细描述'}
                </div>
                
                ${properties.historicalSignificance ? `
                <div class="mt-2 pt-2 border-t border-gray-200">
                    <div class="text-xs font-medium text-gray-500">历史意义:</div>
                    <div class="text-sm text-gray-600">${properties.historicalSignificance}</div>
                </div>
                ` : ''}
                
                <div class="mt-3 pt-2 border-t border-gray-200 text-right">
                    <button class="view-details-btn text-xs text-blue-500 hover:text-blue-700" onclick="document.dispatchEvent(new CustomEvent('viewEventDetails', {detail: {eventId: '${properties.id}'}}))">
                        查看完整详情
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * 更新迁徙路线
     * @param {Array} migrations - 迁徙数据数组
     */
    updateMigrationRoutes(migrations) {
        console.log('更新迁徙路线...');
        
        // 清除现有的迁徙路线
        this.clearMigrationRoutes();
        
        if (!migrations || migrations.length === 0) {
            console.log('没有迁徙数据，跳过更新迁徙路线');
            return;
        }
        
        // 确保routesLayer存在
        if (!this.routesLayer) {
            this.routesLayer = L.layerGroup().addTo(this.map);
        }
        
        // 获取当前活跃的迁徙
        const activeMigrations = this.getActiveMigrations(migrations, this.currentYear);
        console.log(`找到 ${activeMigrations.length} 条活跃迁徙路线`);
        
        // 为每条迁徙路线创建曲线
        activeMigrations.forEach(migration => {
            // 检查迁徙是否有完整的起点和终点坐标
            if (!migration.startCoordinates || !migration.endCoordinates || 
                !Array.isArray(migration.startCoordinates) || !Array.isArray(migration.endCoordinates) ||
                migration.startCoordinates.length < 2 || migration.endCoordinates.length < 2) {
                
                console.warn(`迁徙路线 "${migration.name || '未命名'}" 坐标数据不完整，跳过`);
                return;
            }
            
            // 提取起点和终点
            const startLat = migration.startCoordinates[0];
            const startLng = migration.startCoordinates[1];
            const endLat = migration.endCoordinates[0];
            const endLng = migration.endCoordinates[1];
            
            // 再次检查坐标值是否有效
            if (typeof startLat !== 'number' || typeof startLng !== 'number' || 
                typeof endLat !== 'number' || typeof endLng !== 'number' ||
                isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
                
                console.warn(`迁徙路线 "${migration.name || '未命名'}" 坐标值无效，跳过`);
                return;
            }
            
            try {
                // 创建曲线控制点
                const curvedPath = this.createCurvedPath(startLat, startLng, endLat, endLng);
                
                // 为迁徙计算适当的颜色
                const color = this.getMigrationColor(migration.category);
                
                // 创建路径
                const path = L.polyline(curvedPath, {
                    color: color,
                        weight: 3,
                    opacity: 0.7,
                    lineJoin: 'round',
                    dashArray: '6, 8',
                    className: 'migration-path'
                });
                
                // 添加到路由图层
                path.addTo(this.routesLayer);
                
                // 添加箭头指示方向
                if (curvedPath.length > 0) {
                    const arrowOffset = Math.floor(curvedPath.length / 2); // 在曲线中间位置添加箭头
                    if (arrowOffset < curvedPath.length) {
                        const arrowPoint = curvedPath[arrowOffset];
                        
                        const arrowIcon = L.divIcon({
                            className: 'migration-arrow',
                            html: `<i class="material-icons-round" style="color: ${color};">arrow_forward</i>`,
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        });
                        
                        const arrowMarker = L.marker(arrowPoint, { icon: arrowIcon });
                        arrowMarker.addTo(this.routesLayer);
                        
                        // 存储箭头引用以便后续清除
                        this.migrationRoutes.push(arrowMarker);
                    }
                }
                
                // 添加气泡信息
                path.bindPopup(this.createMigrationPopupContent(migration));
                
                // 存储路径引用以便后续清除
                this.migrationRoutes.push(path);
                
                // 为重要迁徙添加标签
                if (migration.importance >= 4 && curvedPath.length > 0) {
                    const labelOffset = Math.floor(curvedPath.length / 3); // 在曲线三分之一处添加标签
                    if (labelOffset < curvedPath.length) {
                        const labelPoint = curvedPath[labelOffset];
                        
                        const labelIcon = L.divIcon({
                            className: 'migration-label',
                            html: `<div class="migration-label-text">${migration.name || '未命名迁徙'}</div>`,
                            iconSize: [150, 30],
                            iconAnchor: [75, 15]
                        });
                        
                        const label = L.marker(labelPoint, { icon: labelIcon });
                        label.addTo(this.routesLayer);
                        
                        // 存储标签引用以便后续清除
                        this.migrationRoutes.push(label);
                    }
                }
            } catch (error) {
                console.error(`处理迁徙路线时出错:`, error, migration);
            }
        });
    }
    
    /**
     * 创建曲线路径点数组
     * @param {number} startLat - 起点纬度
     * @param {number} startLng - 起点经度
     * @param {number} endLat - 终点纬度
     * @param {number} endLng - 终点经度
     * @returns {Array} 路径点数组
     */
    createCurvedPath(startLat, startLng, endLat, endLng) {
        // 确保所有坐标为有效数字
        if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
            console.warn('创建曲线路径时遇到无效坐标:', startLat, startLng, endLat, endLng);
            // 返回一个安全的默认直线路径
            return [
                [0, 0],
                [1, 1]
            ];
        }
        
        // 计算中间控制点
        const center = [(startLat + endLat) / 2, (startLng + endLng) / 2];
        
        // 计算垂直于起点-终点连线的方向
        const dx = endLng - startLng;
        const dy = endLat - startLat;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // 如果起点和终点几乎重合，则返回一个小圆圈
        if (dist < 0.1) {
            console.log('起点和终点几乎重合，创建一个小圆圈');
            const circle = [];
            const steps = 10;
            const radius = 0.1;
            for (let i = 0; i <= steps; i++) {
                const angle = (i / steps) * Math.PI * 2;
                circle.push([
                    startLat + Math.sin(angle) * radius,
                    startLng + Math.cos(angle) * radius
                ]);
            }
            return circle;
        }
        
        // 控制弯曲程度，距离越远弯曲越大
        const curvature = Math.min(0.2, dist / 30);
        
        // 创建垂直于线段的偏移
        const offsetX = -dy * curvature;
        const offsetY = dx * curvature;
        
        // 计算控制点
        const controlPoint = [center[0] + offsetX, center[1] + offsetY];
        
        // 使用贝塞尔曲线生成路径点
        const points = [];
        const steps = 30; // 平滑度
        
        for (let t = 0; t <= steps; t++) {
            const ratio = t / steps;
            
            // 二次贝塞尔曲线公式
            const lat = (1 - ratio) * (1 - ratio) * startLat +
                        2 * (1 - ratio) * ratio * controlPoint[0] +
                        ratio * ratio * endLat;
            
            const lng = (1 - ratio) * (1 - ratio) * startLng +
                        2 * (1 - ratio) * ratio * controlPoint[1] +
                        ratio * ratio * endLng;
            
            points.push([lat, lng]);
        }
        
        return points;
    }
    
    /**
     * 获取迁徙类别对应的颜色
     * @param {string} category - 迁徙类别
     * @returns {string} 颜色代码
     */
    getMigrationColor(category) {
        const colors = {
            '人口迁徙': '#7c3aed',
            '文化传播': '#8b5cf6',
            '技术扩散': '#3b82f6',
            '商业贸易': '#10b981',
            '军事入侵': '#ef4444',
            '疾病传播': '#f59e0b'
        };
        
        return colors[category] || '#6b7280';
    }
    
    /**
     * 创建迁徙弹窗内容
     * @param {Object} migration - 迁徙数据
     * @returns {string} HTML字符串
     */
    createMigrationPopupContent(migration) {
        // 格式化年份
        const formatYear = (year) => {
            if (year === undefined) return '未知';
            return year < 0 ? `公元前${Math.abs(year)}年` : `公元${year}年`;
        };
        
        // 构建年份显示
        let yearDisplay = '';
        if (migration.startYear !== undefined && migration.endYear !== undefined) {
            yearDisplay = `${formatYear(migration.startYear)} 至 ${formatYear(migration.endYear)}`;
        } else if (migration.startYear !== undefined) {
            yearDisplay = `始于 ${formatYear(migration.startYear)}`;
        } else if (migration.endYear !== undefined) {
            yearDisplay = `止于 ${formatYear(migration.endYear)}`;
        } else {
            yearDisplay = '时间不详';
        }
        
        // 获取重要性星级
        const importanceStars = '★'.repeat(migration.importance || 0);
        
        return `
            <div class="migration-popup">
                <h3 class="text-lg font-semibold text-gray-900">${migration.name}</h3>
                
                <div class="flex justify-between items-center text-sm text-gray-600 mt-1 mb-2">
                    <div>
                        <i class="material-icons-round align-middle text-sm">event</i>
                        ${yearDisplay}
                    </div>
                    <div class="text-amber-500">
                        ${importanceStars}
                    </div>
                </div>
                
                <div class="flex items-center gap-1 mb-2">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                        ${migration.category || '未分类'}
                    </span>
                </div>
                
                <div class="flex items-center gap-2 text-sm text-gray-700 mb-1">
                    <i class="material-icons-round text-green-600">play_arrow</i>
                    <strong>起点:</strong> ${migration.startLocation}
                </div>
                
                <div class="flex items-center gap-2 text-sm text-gray-700 mb-2">
                    <i class="material-icons-round text-red-600">flag</i>
                    <strong>终点:</strong> ${migration.endLocation}
                </div>
                
                <div class="text-sm text-gray-600">
                    ${migration.description || '无详细描述'}
                </div>
                
                ${migration.historicalSignificance ? `
                <div class="mt-2 pt-2 border-t border-gray-200">
                    <div class="text-xs font-medium text-gray-500">历史意义:</div>
                    <div class="text-sm text-gray-600">${migration.historicalSignificance}</div>
                </div>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * 更新技术发展标记
     * @param {Array} technologies - 技术发展数据数组
     */
    updateTechnologicalDevelopments(technologies) {
        // 清除现有的技术标记
        this.technologiesLayer.clearLayers();
        
        if (!technologies || !Array.isArray(technologies)) {
            console.warn('技术发展数据无效');
            return;
        }
        
        // 获取与当前年份相关的技术
        const relevantTechnologies = technologies.filter(tech => {
            return this.isTimeRangeRelevant(tech.year, tech.endYear || tech.year, this.currentYear);
        });
        
        if (relevantTechnologies.length === 0) {
            console.log(`年份 ${this.currentYear} 没有相关技术发展`);
            return;
        }
        
        // 添加技术标记
        relevantTechnologies.forEach(tech => {
            if (tech.location && tech.location.length === 2) {
                // 创建技术图标
                const marker = this.createCustomMarker(
                    [tech.location[1], tech.location[0]],
                    '技术',
                    tech.title
                );
            
            // 添加弹出框
                marker.bindPopup(this.createTechnologyPopup(tech));
                
                // 添加到技术图层
                this.technologiesLayer.addLayer(marker);
            }
        });
        
        console.log(`添加了 ${relevantTechnologies.length} 个技术发展标记`);
    }
    
    /**
     * 更新区域物种标记
     * @param {Array} species - 物种数据数组
     */
    updateRegionalSpecies(species) {
        // 清除现有的物种标记
        this.speciesLayer.clearLayers();
        
        if (!species || !Array.isArray(species)) {
            console.warn('物种数据无效');
            return;
        }
        
        // 获取与当前年份相关的物种
        const relevantSpecies = species.filter(s => {
            return this.isTimeRelevant(s.year, this.currentYear);
        });
        
        if (relevantSpecies.length === 0) {
            console.log(`年份 ${this.currentYear} 没有相关物种`);
            return;
        }
        
        // 添加物种标记
        relevantSpecies.forEach(species => {
            if (species.location && species.location.length === 2) {
                // 创建物种图标
                const marker = this.createCustomMarker(
                    [species.location[1], species.location[0]],
                    '农业',
                    species.title
                );
                
                // 添加弹出框
                marker.bindPopup(this.createSpeciesPopup(species));
                
                // 添加到物种图层
                this.speciesLayer.addLayer(marker);
            }
        });
        
        console.log(`添加了 ${relevantSpecies.length} 个物种标记`);
    }
    
    /**
     * 更新社会组织标记
     * @param {Array} organizations - 社会组织数据数组
     */
    updateSocialOrganizations(organizations) {
        // 清除现有的社会组织标记
        this.organizationsLayer.clearLayers();
        
        if (!organizations || !Array.isArray(organizations)) {
            console.warn('社会组织数据无效');
            return;
        }
        
        // 获取与当前年份相关的社会组织
        const relevantOrganizations = organizations.filter(org => {
            // 判断组织是否在当前时间范围内
            if (org.形成时间) {
                return this.isTimeRelevant(this.parseYearString(org.形成时间), this.currentYear);
            }
            return false;
        });
        
        if (relevantOrganizations.length === 0) {
            console.log(`年份 ${this.currentYear} 没有相关社会组织`);
            return;
        }
        
        // 添加社会组织标记
        relevantOrganizations.forEach(org => {
            if (org.中心位置 && org.中心位置.coordinates) {
                const coordinates = org.中心位置.coordinates;
                // 创建社会组织图标
                const marker = this.createCustomMarker(
                    [coordinates[1], coordinates[0]],
                    '文明',
                    org.组织名称
                );
                
                // 添加弹出框
                marker.bindPopup(`
                    <div class="popup-content">
                        <h3 class="text-lg font-bold">${org.组织名称}</h3>
                        <p class="text-sm text-gray-600">形成时间: ${org.形成时间}</p>
                        <p class="mt-2">类型: ${org.组织类型}</p>
                        <p>人口规模: ${org.人口规模 || '未知'}</p>
                        <p class="mt-2">${org.特点描述}</p>
                    </div>
                `);
                
                // 添加到社会组织图层
                this.organizationsLayer.addLayer(marker);
            }
        });
        
        console.log(`添加了 ${relevantOrganizations.length} 个社会组织标记`);
    }
    
    /**
     * 创建技术弹出窗口内容
     * @param {Object} tech - 技术对象
     * @returns {string} HTML内容
     */
    createTechnologyPopup(tech) {
        // 本地年份格式化函数
        const formatYearLocal = (year) => {
            return year < 0 ? `公元前${Math.abs(year)}年` : `公元${year}年`;
        };
        
        return `
            <div class="popup-content">
                <h3 class="text-lg font-bold">${tech.title}</h3>
                <p class="text-sm text-gray-600">时间: ${formatYearLocal(tech.year)}</p>
                <p class="mt-2">${tech.description}</p>
                <p class="mt-2"><strong>影响:</strong> ${tech.impact || '未知'}</p>
            </div>
        `;
    }
    
    /**
     * 创建物种弹出窗口内容
     * @param {Object} species - 物种对象
     * @returns {string} HTML内容
     */
    createSpeciesPopup(species) {
        // 本地年份格式化函数
        const formatYearLocal = (year) => {
            return year < 0 ? `公元前${Math.abs(year)}年` : `公元${year}年`;
        };
        
        return `
            <div class="popup-content">
                <h3 class="text-lg font-bold">${species.title}</h3>
                <p class="text-sm text-gray-600">驯化时间: ${formatYearLocal(species.year)}</p>
                <p class="mt-2">类型: ${species.type || '未知'}</p>
                <p>用途: ${species.uses || '未知'}</p>
                <p class="mt-2"><strong>贡献:</strong> ${species.impact || '未知'}</p>
            </div>
        `;
    }
    
    /**
     * 创建自定义标记
     * @param {Array} latlng - 经纬度坐标 [lat, lng]
     * @param {string} category - 类别
     * @param {string} name - 名称
     * @returns {L.Marker} Leaflet标记对象
     */
    createCustomMarker(latlng, category, name) {
        // 根据类别获取颜色
        const color = this.categoryColors[category] || this.categoryColors.default;
        
        // 创建自定义图标
        const icon = L.divIcon({
            className: `custom-icon ${category}`,
            html: `<div class="icon-inner" style="background-color: ${color};">${name.charAt(0)}</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        
        return L.marker(latlng, { icon: icon });
    }
    
    /**
     * 判断时间是否相关
     * @param {number} time - 时间（年份）
     * @param {number} currentYear - 当前年份
     * @param {number} range - 范围（年）
     * @returns {boolean} 是否相关
     */
    isTimeRelevant(time, currentYear, range = 100) {
        if (time === undefined || time === null) return false;
        return Math.abs(time - currentYear) <= range;
    }
    
    /**
     * 判断时间范围是否相关
     * @param {number} startTime - 开始时间
     * @param {number} endTime - 结束时间
     * @param {number} currentYear - 当前年份
     * @param {number} buffer - 缓冲范围（年）
     * @returns {boolean} 是否相关
     */
    isTimeRangeRelevant(startTime, endTime, currentYear, buffer = 50) {
        if (startTime === undefined || endTime === undefined) return false;
        // 添加缓冲区，使得临近的事件也能显示
        return (currentYear >= startTime - buffer) && (currentYear <= endTime + buffer);
    }
    
    /**
     * 解析年份字符串
     * @param {string} yearStr - 年份字符串
     * @returns {number} 年份数值
     */
    parseYearString(yearStr) {
        if (!yearStr) return 0;
        
        // 移除"约"、"公元"等词
        const cleanStr = yearStr.replace(/约|公元/g, '').trim();
        
        // 处理公元前
        if (cleanStr.includes('前')) {
            const year = parseInt(cleanStr.replace(/前|年/g, '').trim());
            return isNaN(year) ? 0 : -year;
        }
        
        // 处理普通年份
        const year = parseInt(cleanStr.replace(/年/g, '').trim());
        return isNaN(year) ? 0 : year;
    }
    
    /**
     * 显示或隐藏事件标记
     * @param {boolean} show - 是否显示事件
     */
    toggleEvents(show) {
        this.showEvents = show;
        if (show) {
            this.map.addLayer(this.markersLayer);
        } else {
            this.map.removeLayer(this.markersLayer);
        }
    }
    
    /**
     * 显示或隐藏迁徙路线
     * @param {boolean} show - 是否显示迁徙
     */
    toggleMigrations(show) {
        this.showMigrations = show;
        if (show) {
            this.map.addLayer(this.routesLayer);
        } else {
            this.map.removeLayer(this.routesLayer);
        }
    }
    
    /**
     * 高亮显示事件
     * @param {string} eventId - 事件ID
     */
    highlightEvent(eventId) {
        if (!eventId) return;
        
        console.log(`高亮显示事件: ${eventId}`);
        
        // 清除现有高亮
        this.clearHighlights();
        
        // 在所有事件标记中查找匹配的事件
        const markerElement = document.querySelector(`.map-marker[data-event-id="${eventId}"]`);
        if (markerElement) {
            // 添加高亮样式
            markerElement.classList.add('highlighted');
            
            // 查找对应的Leaflet标记并打开其弹窗
            this.eventMarkers.forEach(marker => {
                if (marker.getElement && marker.getElement()) {
                    const element = marker.getElement();
                    if (element.querySelector(`.map-marker[data-event-id="${eventId}"]`)) {
                        // 获取marker的经纬度
                        const latlng = marker.getLatLng();
                        
                        // 平移地图到这个位置（使用飞行动画）
                        this.map.flyTo(latlng, Math.max(this.map.getZoom(), 5), {
                            duration: 1.5,
                            easeLinearity: 0.25
                        });
                        
                        // 打开弹窗
                        marker.openPopup();
                        
                        // 创建一个临时的脉冲效果
                        const pulseIcon = L.divIcon({
                            className: 'pulse-marker',
                            html: '<div class="pulse-circle"></div>',
                            iconSize: [40, 40],
                            iconAnchor: [20, 20]
                        });
                        
                        const pulseMarker = L.marker(latlng, { 
                            icon: pulseIcon,
                            zIndexOffset: 1000
                        }).addTo(this.map);
                        
                        // 将脉冲标记添加到高亮列表
                        this.highlightedElements.push(pulseMarker);
                        
                        // 3秒后移除脉冲效果
                        setTimeout(() => {
                            if (this.map.hasLayer(pulseMarker)) {
                                this.map.removeLayer(pulseMarker);
                                
                                // 从高亮列表中移除
                                const index = this.highlightedElements.indexOf(pulseMarker);
                                if (index !== -1) {
                                    this.highlightedElements.splice(index, 1);
                                }
                            }
                        }, 3000);
                    }
                }
            });
        } else {
            console.warn(`未找到事件ID为 ${eventId} 的标记`);
        }
    }
    
    /**
     * 清除高亮显示
     */
    clearHighlights() {
        // 移除所有标记的高亮样式
        document.querySelectorAll('.map-marker.highlighted').forEach(element => {
            element.classList.remove('highlighted');
        });
        
        // 移除任何临时添加的高亮元素
        this.highlightedElements.forEach(element => {
            if (this.map.hasLayer(element)) {
                this.map.removeLayer(element);
            }
        });
        
        // 清空高亮元素数组
        this.highlightedElements = [];
    }
    
    /**
     * 显示加载中指示器
     */
    showLoader() {
        const loader = document.getElementById('map-loader');
        if (loader) {
            loader.style.display = 'flex';
        }
    }
    
    /**
     * 隐藏加载中指示器
     */
    hideLoader() {
        const loader = document.getElementById('map-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }
    
    /**
     * 显示错误信息
     * @param {string} message - 错误信息
     */
    showError(message) {
        const errorBox = document.getElementById('error-box');
        if (errorBox) {
            errorBox.textContent = message;
            errorBox.style.display = 'block';
            
            // 5秒后自动隐藏
            setTimeout(() => {
                errorBox.style.display = 'none';
            }, 5000);
        }
    }
    
    /**
     * 清除事件标记
     */
    clearEventMarkers() {
        // 移除所有事件标记
        this.eventMarkers.forEach(marker => {
            if (this.map.hasLayer(marker)) {
                this.map.removeLayer(marker);
            }
        });
        
        // 清空事件标记数组
        this.eventMarkers = [];
    }
    
    /**
     * 清除迁徙路线
     */
    clearMigrationRoutes() {
        // 首先尝试清除routesLayer的内容
        if (this.routesLayer) {
            this.routesLayer.clearLayers();
        }
        
        // 然后确保移除所有单独保存的迁徙路线
        if (this.migrationRoutes && this.migrationRoutes.length > 0) {
            this.migrationRoutes.forEach(route => {
                if (route && this.map.hasLayer(route)) {
                    this.map.removeLayer(route);
                }
            });
        }
        
        // 清空迁徙路线数组
        this.migrationRoutes = [];
        
        console.log('已清除所有迁徙路线');
    }
    
    /**
     * 清除技术标记
     */
    clearTechMarkers() {
        // 移除所有技术标记
        this.techMarkers.forEach(marker => {
            if (this.map.hasLayer(marker)) {
                this.map.removeLayer(marker);
            }
        });
        
        // 清空技术标记数组
        this.techMarkers = [];
    }
    
    /**
     * 清除物种标记
     */
    clearSpeciesMarkers() {
        // 移除所有物种标记
        this.speciesMarkers.forEach(marker => {
            if (this.map.hasLayer(marker)) {
                this.map.removeLayer(marker);
            }
        });
        
        // 清空物种标记数组
        this.speciesMarkers = [];
    }
    
    /**
     * 加载GeoJSON数据
     */
    async loadGeoJSON() {
        try {
            console.log('加载GeoJSON数据...');
            
            // 尝试加载当前年份的地图数据，默认使用0年（公元元年）
            this.currentGeoJSON = await getMapForYear(this.currentYear || 0);
            
            // 更新GeoJSON图层
            this.updateGeoJSONLayer();
            
            console.log('GeoJSON数据加载完成');
        } catch (error) {
            console.error('加载GeoJSON数据时出错:', error);
            this.showError('加载地图数据时出错: ' + error.message);
        }
    }
    
    /**
     * 获取与当前年份相关的事件
     * @param {Array} events - 事件数组
     * @param {number} year - 年份
     * @returns {Array} 相关事件数组
     */
    getRelevantEvents(events, year) {
        if (!events || !Array.isArray(events)) {
            console.warn('传入的事件数据无效');
            return [];
        }
        
        console.log(`正在搜索与${year}年相关的事件，共${events.length}个事件`);
        
        const relevantEvents = events.filter(event => {
            // 检查事件时间格式
            // 1. 如果有开始年份和结束年份，检查当前年份是否在这个范围内
            if (event.year !== undefined && event.endYear !== undefined) {
                const isRelevant = year >= event.year && year <= event.endYear;
                if (isRelevant) {
                    console.log(`匹配到事件(范围): ${event.name}, 年份范围 ${event.year}-${event.endYear}`);
                }
                return isRelevant;
            }
            
            // 2. 如果只有一个年份，检查是否在合理范围内(±100年)
            if (event.year !== undefined) {
                const isRelevant = Math.abs(event.year - year) <= 100;
                if (isRelevant) {
                    console.log(`匹配到事件(单一): ${event.name}, 年份 ${event.year}`);
                }
                return isRelevant;
            }
            
            // 3. 如果有原始数据的时间范围，尝试解析
            if (event.originalData && event.originalData.occurrenceTime) {
                const timeStr = event.originalData.occurrenceTime;
                if (timeStr.includes('至')) {
                    const [startStr, endStr] = timeStr.split('至');
                    const startYear = this.parseYearString(startStr);
                    const endYear = this.parseYearString(endStr);
                    if (startYear !== 0 && endYear !== 0) {
                        const isRelevant = year >= startYear && year <= endYear;
                        if (isRelevant) {
                            console.log(`匹配到事件(原始范围): ${event.name}, 时间 ${timeStr}, 解析为 ${startYear}-${endYear}`);
                        }
                        return isRelevant;
                    }
                }
            }
            
            // 4. 尝试按照历史时期进行粗略匹配
            if (year <= -8000) { // 史前时期
                return event.category === '农业' || event.description?.includes('史前') || 
                       event.name?.includes('史前') || event.description?.includes('古人类');
            } else if (year <= -1000) { // 古代早期
                return event.description?.includes('古代') || event.description?.includes('古文明') ||
                       event.name?.includes('古代') || event.name?.includes('古文明');
            } else if (year <= 1500) { // 古代晚期到中世纪
                return event.description?.includes('中世纪') || event.description?.includes('古代') ||
                       event.name?.includes('中世纪') || event.name?.includes('古代');
            } else { // 现代
                return event.description?.includes('现代') || event.description?.includes('工业') ||
                       event.name?.includes('现代') || event.name?.includes('工业') ||
                       (event.year >= 1500);
            }
            
            return false;
        });
        
        console.log(`找到${relevantEvents.length}个与${year}年相关的事件`);
        return relevantEvents;
    }
    
    /**
     * 获取与当前年份活跃的迁徙路线
     * @param {Array} migrations - 迁徙数组
     * @param {number} year - 年份
     * @returns {Array} 活跃的迁徙数组
     */
    getActiveMigrations(migrations, year) {
        if (!migrations || !Array.isArray(migrations)) {
            console.warn('传入的迁徙数据无效');
            return [];
        }
        
        console.log(`正在搜索${year}年活跃的迁徙路线，共${migrations.length}条路线`);
        
        const activeMigrations = migrations.filter(migration => {
            // 如果有开始年份和结束年份，检查当前年份是否在这个范围内
            if (migration.startYear !== undefined && migration.endYear !== undefined) {
                return year >= migration.startYear && year <= migration.endYear;
            }
            
            // 如果只有开始年份，假设迁徙持续100年
            if (migration.startYear !== undefined) {
                return year >= migration.startYear && year <= (migration.startYear + 100);
            }
            
            // 如果只有结束年份，假设迁徙提前100年开始
            if (migration.endYear !== undefined) {
                return year >= (migration.endYear - 100) && year <= migration.endYear;
            }
            
            // 如果有原始数据的时间范围，尝试解析
            if (migration.originalData && migration.originalData.timeFrame) {
                const timeStr = migration.originalData.timeFrame;
                if (timeStr.includes('至')) {
                    const [startStr, endStr] = timeStr.split('至');
                    const startYear = this.parseYearString(startStr);
                    const endYear = this.parseYearString(endStr);
                    if (startYear !== 0 && endYear !== 0) {
                        return year >= startYear && year <= endYear;
                    }
                }
            }
            
            return false;
        });
        
        console.log(`找到${activeMigrations.length}条活跃的迁徙路线`);
        return activeMigrations;
    }
} 