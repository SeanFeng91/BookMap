/**
 * 地图工具函数库
 * 用于处理GeoJSON数据，以及地图相关的操作
 */

const MapUtils = {
    /**
     * 存储地图文件年份映射 - 仅使用整数年份
     */
    mapYears: [
        { year: -3000, file: 'world_bc3000.geojson' },
        { year: -2000, file: 'world_bc2000.geojson' },
        { year: -1000, file: 'world_bc1000.geojson' },
        { year: -500, file: 'world_bc500.geojson' },
        { year: -200, file: 'world_bc200.geojson' },
        { year: 0, file: 'world_0.geojson' },
        { year: 200, file: 'world_200.geojson' },
        { year: 500, file: 'world_500.geojson' },
        { year: 800, file: 'world_800.geojson' },
        { year: 1000, file: 'world_1000.geojson' },
        { year: 1200, file: 'world_1200.geojson' },
        { year: 1400, file: 'world_1400.geojson' },
        { year: 1500, file: 'world_1500.geojson' },
        { year: 1600, file: 'world_1600.geojson' },
        { year: 1700, file: 'world_1700.geojson' },
        { year: 1800, file: 'world_1800.geojson' },
        { year: 1900, file: 'world_1900.geojson' },
        { year: 2000, file: 'world_2000.geojson' }
    ],
    
    /**
     * historical-basemaps 仓库URL
     */
    historyBaseMapUrl: 'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/',
    
    /**
     * 查找最接近指定年份的地图数据文件
     * @param {number} year - 目标年份(负数表示公元前)
     * @returns {string} 最接近的地图文件名
     */
    findClosestMapFile: function(year) {
        console.log(`查找最接近年份 ${year} 的地图文件`);
        
        // 确保返回整百年的地图
        const targetYear = Math.round(year / 100) * 100;
        console.log(`将年份 ${year} 规整为整百年: ${targetYear}`);
        
        // 查找最接近的年份
        let closestYear = null;
        let minDiff = Infinity;
        
        for (const mapYear of this.mapYears) {
            const diff = Math.abs(mapYear.year - targetYear);
            if (diff < minDiff) {
                minDiff = diff;
                closestYear = mapYear;
            }
        }
        
        if (!closestYear) {
            console.error(`未找到适合年份 ${targetYear} 的地图文件`);
            // 返回最后一个地图作为默认值
            closestYear = this.mapYears[this.mapYears.length - 1];
        }
        
        console.log(`最接近的年份是: ${closestYear.year}，对应文件: ${closestYear.file}`);
        return closestYear;
    },
    
    /**
     * 加载GeoJSON数据
     * @param {string} fileName - GeoJSON文件名
     * @returns {Promise} 返回解析后的GeoJSON数据的Promise
     */
    loadGeoJSON: async function(fileName) {
        console.log(`尝试加载GeoJSON文件: ${fileName}`);
        
        try {
            const response = await fetch(fileName);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`成功加载GeoJSON数据：${fileName}`);
            return this.normalizeGeoJSON(data);
        } catch (error) {
            console.error(`加载GeoJSON文件 ${fileName} 失败:`, error);
            throw error;
        }
    },
    
    /**
     * 从historical-basemaps仓库加载GeoJSON数据
     * @param {string} fileName - GeoJSON文件名
     * @returns {Promise} 返回解析后的GeoJSON数据的Promise
     */
    loadGeoJSONFromRepo: async function(year) {
        console.log(`尝试从historical-basemaps仓库加载GeoJSON文件: ${year}`);
        
        try {
            const mapData = this.findClosestMapFile(year);
            const url = `${this.historyBaseMapUrl}${mapData.file}`;
            console.log(`尝试从仓库加载GeoJSON: ${url}`);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                console.error(`无法从仓库加载GeoJSON: ${response.status} ${response.statusText}`);
                return null;
            }
            
            const data = await response.json();
            console.log(`成功从仓库加载GeoJSON，包含 ${data.features.length} 个特征`);
            
            // 检查并标准化GeoJSON数据
            const normalizedData = this.normalizeGeoJSON(data);
            
            // 缓存到本地
            this.cacheGeoJSONLocally(mapData.file, normalizedData);
            
            return normalizedData;
        } catch (error) {
            console.error('从仓库加载GeoJSON时出错:', error);
            return null;
        }
    },
    
    /**
     * 加载备用地图
     * @param {string} fileName - 原始文件名
     * @returns {Promise} 返回替代地图数据
     */
    loadFallbackMap: async function() {
        console.log('加载备用世界地图');
        
        try {
            const response = await fetch('data/world.geojson');
            if (!response.ok) {
                console.error(`无法加载备用地图: ${response.status} ${response.statusText}`);
                return null;
            }
            
            const data = await response.json();
            console.log(`成功加载备用地图，包含 ${data.features.length} 个特征`);
            return data;
        } catch (error) {
            console.error('加载备用地图时出错:', error);
            return null;
        }
    },
    
    /**
     * 标准化不同格式的GeoJSON数据
     * @param {Object} data - GeoJSON数据
     * @returns {Object} 标准化后的GeoJSON数据
     */
    normalizeGeoJSON: function(data) {
        console.log('正在标准化GeoJSON数据');
        
        // 检查数据是否为有效的GeoJSON
        if (!data) {
            console.error('无效的GeoJSON数据');
            return this.getDefaultWorldMap();
        }
        
        // 如果已经是标准格式，直接返回
        if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
            console.log('数据已经是标准FeatureCollection格式');
            return data;
        }
        
        // 处理直接的Geometry对象
        if (data.type && (data.type === 'Polygon' || data.type === 'MultiPolygon')) {
            console.log('将Geometry对象转换为FeatureCollection');
            return {
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    properties: {},
                    geometry: data
                }]
            };
        }
        
        // 处理直接的Feature对象
        if (data.type === 'Feature') {
            console.log('将Feature对象转换为FeatureCollection');
            return {
                type: 'FeatureCollection',
                features: [data]
            };
        }
        
        // 处理非标准格式
        if (Array.isArray(data)) {
            console.log('将数组转换为FeatureCollection');
            // 假设是Feature数组
            return {
                type: 'FeatureCollection',
                features: data.map(item => {
                    if (item.type === 'Feature') {
                        return item;
                    } else {
                        return {
                            type: 'Feature',
                            properties: item.properties || {},
                            geometry: item
                        };
                    }
                })
            };
        }
        
        // 如果无法识别格式，返回默认数据
        console.error('无法识别的GeoJSON格式');
        return this.getDefaultWorldMap();
    },
    
    /**
     * 获取默认的世界地图（简化版）
     */
    getDefaultWorldMap: function() {
        console.log('返回默认世界地图');
        
        return {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: {
                        name: '默认世界地图',
                        description: '未能加载实际地图数据，这是一个简化的世界轮廓'
                    },
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[
                            [-180, 85], [180, 85], [180, -85], [-180, -85], [-180, 85]
                        ]]
                    }
                }
            ]
        };
    },
    
    /**
     * 缓存GeoJSON到本地
     */
    cacheGeoJSONLocally: function(fileName, data) {
        // 这是一个模拟函数，实际实现需要考虑浏览器存储限制
        // 在真实应用中，可以使用localStorage、IndexedDB等
        console.log(`缓存GeoJSON文件 ${fileName} 到本地存储`);
        
        try {
            // 仅作为演示
            localStorage.setItem(`geoJSON_${fileName}`, JSON.stringify(data));
        } catch (error) {
            console.warn('缓存GeoJSON失败:', error);
        }
    },
    
    /**
     * 过滤指定时间范围内的事件
     * @param {Array} events - 事件数组
     * @param {number} year - 目标年份
     * @param {number} range - 范围(正负年数)
     * @returns {Array} 过滤后的事件数组
     */
    filterEventsByTimeRange: function(events, year, range) {
        return events.filter(event => {
            return Math.abs(event.year - year) <= range;
        });
    },
    
    /**
     * 过滤指定时间内活跃的迁徙路线
     * @param {Array} migrations - 迁徙路线数组
     * @param {number} year - 目标年份
     * @returns {Array} 过滤后的迁徙路线数组
     */
    filterActiveMigrations: function(migrations, year) {
        return migrations.filter(migration => {
            return migration.startYear <= year && migration.endYear >= year;
        });
    },
    
    /**
     * 根据时间计算迁徙路线的完成百分比
     * @param {Object} migration - 迁徙路线对象
     * @param {number} year - 目标年份
     * @returns {number} 完成百分比(0-1)
     */
    calculateMigrationProgress: function(migration, year) {
        if (year <= migration.startYear) return 0;
        if (year >= migration.endYear) return 1;
        
        const totalDuration = migration.endYear - migration.startYear;
        const elapsedTime = year - migration.startYear;
        return elapsedTime / totalDuration;
    },
    
    /**
     * 将迁徙路线转换为GeoJSON LineString
     * @param {Object} migration - 迁徙路线对象
     * @param {number} progress - 完成百分比(0-1)
     * @returns {Object} GeoJSON LineString对象
     */
    migrationToGeoJSON: function(migration, progress) {
        // 根据进度计算应该显示多少点
        const totalPoints = migration.path.length;
        const pointsToShow = Math.max(2, Math.ceil(totalPoints * progress));
        
        // 截取路径点
        const visiblePath = migration.path.slice(0, pointsToShow);
        
        return {
            type: "Feature",
            properties: {
                id: migration.id,
                name: migration.name,
                category: migration.category,
                description: migration.description,
                startYear: migration.startYear,
                endYear: migration.endYear
            },
            geometry: {
                type: "LineString",
                coordinates: visiblePath
            }
        };
    },
    
    /**
     * 将事件数据转换为GeoJSON点
     * @param {Array} events - 事件数组
     * @returns {Object} GeoJSON FeatureCollection
     */
    eventsToGeoJSON: function(events) {
        const features = events.map(event => {
            return {
                type: "Feature",
                properties: {
                    id: event.id,
                    title: event.title,
                    year: event.year,
                    description: event.description,
                    category: event.category,
                    importance: event.importance
                },
                geometry: {
                    type: "Point",
                    coordinates: event.location
                }
            };
        });
        
        return {
            type: "FeatureCollection",
            features: features
        };
    },
    
    /**
     * 按类别为GeoJSON特征着色
     * @param {Object} feature - GeoJSON特征
     * @returns {Object} 样式对象
     */
    styleByCategory: function(feature) {
        if (!feature.properties) return {};
        
        // 颜色方案
        const colorMap = {
            // 事件类别颜色
            "农业": "#4CAF50",
            "技术": "#2196F3",
            "文明": "#9C27B0",
            "征服": "#F44336",
            "疾病": "#FF9800",
            "迁徙": "#795548",
            "探索": "#607D8B",
            "贸易": "#FFEB3B",
            "气候": "#00BCD4",
            "政治": "#3F51B5",
            
            // 迁徙类别颜色
            "早期人类": "#8BC34A",
            "农业扩散": "#4CAF50",
            "人口迁徙": "#795548",
            "航海扩张": "#03A9F4",
            "帝国扩张": "#F44336",
            "疾病传播": "#FF9800",
            "殖民扩张": "#9C27B0",
            "强制迁移": "#E91E63"
        };
        
        // 获取特征类别
        const category = feature.properties.category;
        
        // 设置默认颜色和透明度
        let fillColor = "#777777";
        let opacity = 0.8;
        let weight = 2;
        
        // 如果类别有对应的颜色，使用它
        if (category && colorMap[category]) {
            fillColor = colorMap[category];
        }
        
        // 根据重要性调整透明度
        if (feature.properties.importance) {
            opacity = 0.5 + (feature.properties.importance * 0.1);
        }
        
        return {
            fillColor: fillColor,
            weight: weight,
            opacity: opacity,
            color: fillColor,
            fillOpacity: opacity * 0.7
        };
    },
    
    /**
     * 创建事件弹出框内容
     * @param {Object} feature - GeoJSON特征
     * @returns {string} HTML内容
     */
    createEventPopupContent: function(feature) {
        const props = feature.properties;
        let yearDisplay = props.year < 0 ? `公元前${Math.abs(props.year)}年` : `公元${props.year}年`;
        
        return `
            <div class="custom-popup">
                <h4>${props.title}</h4>
                <p><strong>时间:</strong> ${yearDisplay}</p>
                <p><strong>类别:</strong> ${props.category}</p>
                <p>${props.description}</p>
            </div>
        `;
    },
    
    /**
     * 创建迁徙路线弹出框内容
     * @param {Object} feature - GeoJSON特征
     * @returns {string} HTML内容
     */
    createMigrationPopupContent: function(feature) {
        const props = feature.properties;
        let startYearDisplay = props.startYear < 0 ? `公元前${Math.abs(props.startYear)}年` : `公元${props.startYear}年`;
        let endYearDisplay = props.endYear < 0 ? `公元前${Math.abs(props.endYear)}年` : `公元${props.endYear}年`;
        
        return `
            <div class="custom-popup">
                <h4>${props.name}</h4>
                <p><strong>时间范围:</strong> ${startYearDisplay} - ${endYearDisplay}</p>
                <p><strong>类别:</strong> ${props.category}</p>
                <p>${props.description}</p>
            </div>
        `;
    },
    
    /**
     * 判断事件是否与当前年份相关
     * @param {Object} event - 事件对象
     * @param {number} currentYear - 当前年份
     * @returns {boolean} 事件是否与当前年份相关
     */
    isEventRelevantToYear: function(event, currentYear) {
        // 确保事件对象有效
        if (!event) {
            console.warn('事件对象为空');
            return false;
        }
        
        // 将数据打印到控制台帮助调试
        console.log(`检查事件 "${event.title}" (${event.year}) 是否与年份 ${currentYear} 相关`);
        
        // 兼容性处理：有些事件可能使用startYear/endYear，有些可能使用year/endYear
        const eventStartYear = event.startYear !== undefined ? event.startYear : event.year;
        const eventEndYear = event.endYear;
        
        // 确保有有效的年份
        if (eventStartYear === undefined) {
            console.warn(`事件 "${event.title}" 没有有效的开始年份`);
            return false;
        }
        
        // 精确年份事件
        if (eventStartYear === currentYear) {
            console.log(`事件 "${event.title}" 精确匹配当前年份 ${currentYear}`);
            return true;
        }
        
        // 持续范围的事件
        if (eventEndYear !== undefined) {
            const isInRange = currentYear >= eventStartYear && currentYear <= eventEndYear;
            if (isInRange) {
                console.log(`事件 "${event.title}" 在时间范围内 ${eventStartYear} - ${eventEndYear}`);
            }
            return isInRange;
        }
        
        // 扩大重要历史事件的影响范围
        // 事件影响范围与其发生年代和重要性有关
        let impactRange = 50; // 默认影响范围
        
        // 如果事件有重要性评级，适当调整影响范围
        if (event.importance) {
            impactRange = impactRange * event.importance; // 重要事件影响更广
        }
        
        // 年代越久远，范围越大
        if (Math.abs(eventStartYear) > 1000) {
            // 远古事件的时间精度较低
            impactRange = impactRange * 2;
        }
        
        // 计算事件年份与当前年份的差距
        const yearDifference = Math.abs(eventStartYear - currentYear);
        const isRecentEnough = yearDifference <= impactRange;
        
        if (isRecentEnough) {
            console.log(`事件 "${event.title}" 在影响范围内 (${eventStartYear} ± ${impactRange}年)`);
            return true;
        }
        
        return false;
    },
    
    /**
     * 检查迁徙是否与当前年份相关
     * @param {Object} migration - 迁徙路线对象
     * @param {number} currentYear - 当前年份
     * @returns {boolean} 迁徙路线是否与当前年份相关
     */
    isMigrationRelevantToYear: function(migration, currentYear) {
        return currentYear >= migration.startYear && currentYear <= migration.endYear;
    },
    
    /**
     * 计算迁徙群体当前位置
     * @param {Object} migration - 迁徙路线对象
     * @param {number} progress - 完成百分比(0-1)
     * @returns {Array} 迁徙群体当前位置
     */
    calculateCurrentPosition: function(migration, progress) {
        if (!migration.route || migration.route.length < 2) {
            return null;
        }
        
        if (progress <= 0) {
            return migration.route[0];
        }
        
        if (progress >= 1) {
            return migration.route[migration.route.length - 1];
        }
        
        // 找到当前路段
        const totalSegments = migration.route.length - 1;
        const currentSegmentIndex = Math.floor(progress * totalSegments);
        const segmentProgress = (progress * totalSegments) - currentSegmentIndex;
        
        const startPoint = migration.route[currentSegmentIndex];
        const endPoint = migration.route[currentSegmentIndex + 1];
        
        // 线性插值计算当前位置
        const lat = startPoint[0] + (endPoint[0] - startPoint[0]) * segmentProgress;
        const lng = startPoint[1] + (endPoint[1] - startPoint[1]) * segmentProgress;
        
        return [lat, lng];
    },
    
    /**
     * 将迁徙路线转换为GeoJSON
     * @param {Object} migration - 迁徙路线对象
     * @param {number} progress - 完成百分比(0-1)
     * @returns {Object} GeoJSON LineString对象
     */
    convertMigrationToGeoJSON: function(migration, progress = 1) {
        if (!migration.route || migration.route.length < 2) {
            return null;
        }
        
        // 计算迁徙路线显示的部分
        const displayedRoute = [...migration.route];
        
        if (progress < 1) {
            const totalSegments = migration.route.length - 1;
            const currentSegmentIndex = Math.floor(progress * totalSegments);
            const segmentProgress = (progress * totalSegments) - currentSegmentIndex;
            
            const startPoint = migration.route[currentSegmentIndex];
            const endPoint = migration.route[currentSegmentIndex + 1];
            
            // 计算当前线段上的插值点
            const currentPoint = [
                startPoint[0] + (endPoint[0] - startPoint[0]) * segmentProgress,
                startPoint[1] + (endPoint[1] - startPoint[1]) * segmentProgress
            ];
            
            // 保留已经经过的部分，加上当前点
            displayedRoute.splice(currentSegmentIndex + 1, displayedRoute.length - currentSegmentIndex - 1, currentPoint);
        }
        
        // 创建GeoJSON LineString
        return {
            type: 'Feature',
            properties: {
                name: migration.group,
                description: migration.description
            },
            geometry: {
                type: 'LineString',
                coordinates: displayedRoute.map(point => [point[1], point[0]]) // GeoJSON使用[lng, lat]格式
            }
        };
    },
    
    /**
     * 格式化年份显示
     * @param {number} year - 年份
     * @returns {string} 格式化后的年份字符串
     */
    formatYear: function(year) {
        if (year <= 0) {
            return `公元前${Math.abs(year)}年`;
        } else {
            return `公元${year}年`;
        }
    }
};

// 导出工具对象
if (typeof module !== 'undefined') {
    module.exports = MapUtils;
} 

// 导出需要的函数供ES模块使用
export function getMapForYear(year) {
    return MapUtils.loadGeoJSONFromRepo(year);
}

export function isEventRelevant(event, currentYear) {
    return MapUtils.isEventRelevantToYear(event, currentYear);
}

export function isMigrationRelevant(migration, currentYear) {
    return MapUtils.isMigrationRelevantToYear(migration, currentYear);
}

export function getKeyYears() {
    return MapUtils.mapYears.map(item => item.year);
}

export function findClosestMapFile(year) {
    return MapUtils.findClosestMapFile(year);
} 