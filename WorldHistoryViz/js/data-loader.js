/**
 * 数据加载模块
 * 用于加载所有数据文件，包括历史事件、迁徙路线等
 */

import { adaptHistoricalEvents, adaptMigrations, adaptTechnologies, adaptSpecies } from './data-adapter.js';

/**
 * 加载指定的JSON数据文件
 * @param {string} filename - 数据文件名
 * @returns {Promise} 包含解析后的JSON数据的Promise
 */
async function loadJSONData(filename) {
    console.log(`正在加载数据文件：${filename}`);
    try {
        const response = await fetch(`/WorldHistoryViz/data/${filename}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log(`成功加载 ${filename}，包含 ${Array.isArray(data) ? data.length : '未知数量'} 条记录`);
        return data;
    } catch (error) {
        console.error(`加载 ${filename} 失败:`, error);
        // 返回空数组作为默认值
        return [];
    }
}

/**
 * 加载所有数据文件
 * @returns {Promise} 包含所有数据的对象的Promise
 */
export async function loadAllData() {
    console.log('开始加载所有数据文件...');
    
    try {
        // 先加载索引文件
        const dataIndex = await loadJSONData('index.json');
        let categories = [];
        
        // 如果成功加载了索引文件，则使用索引中的分类加载数据
        if (dataIndex && dataIndex.categories) {
            console.log('使用索引文件加载分类数据...');
            categories = dataIndex.categories;
            
            // 加载所有分类数据文件
            const categoryDataPromises = categories.map(category => 
                loadJSONData(category.file)
            );
            
            const categoryData = await Promise.all(categoryDataPromises);
            
            // 合并所有分类数据
            let allEvents = [];
            categoryData.forEach((data, index) => {
                if (Array.isArray(data)) {
                    console.log(`加载了${data.length}条${categories[index].name}类别的数据`);
                    allEvents = allEvents.concat(data);
                }
            });
            
            console.log(`总共加载了${allEvents.length}条事件数据`);
            
            return {
                historyEvents: allEvents,
                categories: categories
            };
        } else {
            // 如果未能加载索引文件，则回退到加载旧的数据文件
            console.log('未能加载索引文件，回退到加载旧的数据格式...');
            
            // 并行加载所有数据文件
            const [
                rawHistoryEvents,
                rawMigrations,
                rawTechnologicalDevelopments,
                rawRegionalSpecies,
                socialOrganizations,
                speciesTechnologyRelations,
                socialTechnologyRelations,
                eventTechnologyRelations,
                eventSpeciesRelations
            ] = await Promise.all([
                loadJSONData('historical_events.json'),
                loadJSONData('human_migrations.json'),
                loadJSONData('technological_developments.json'),
                loadJSONData('regional_species.json'),
                loadJSONData('social_organizations.json'),
                loadJSONData('species_technology_relations.json'),
                loadJSONData('social_technology_relations.json'),
                loadJSONData('event_technology_relations.json'),
                loadJSONData('event_species_relations.json')
            ]);
            
            console.log('所有数据文件加载完成，开始适配数据格式');
            
            // 使用适配器转换数据格式
            const historyEvents = adaptHistoricalEvents(rawHistoryEvents);
            const migrations = adaptMigrations(rawMigrations);
            const technologicalDevelopments = adaptTechnologies(rawTechnologicalDevelopments);
            const regionalSpecies = adaptSpecies(rawRegionalSpecies);
            
            console.log('数据格式适配完成');
            
            // 返回包含所有数据的对象
            return {
                historyEvents,
                migrations,
                technologicalDevelopments,
                regionalSpecies,
                socialOrganizations,
                speciesTechnologyRelations,
                socialTechnologyRelations,
                eventTechnologyRelations,
                eventSpeciesRelations
            };
        }
    } catch (error) {
        console.error('加载数据失败:', error);
        return {
            historyEvents: [],
            migrations: [],
            technologicalDevelopments: [],
            regionalSpecies: []
        };
    }
}

/**
 * 加载历史事件数据
 * @returns {Promise} 包含历史事件数据的Promise
 */
export async function loadHistoricalEvents() {
    try {
        // 尝试加载索引文件
        const dataIndex = await loadJSONData('index.json');
        
        if (dataIndex && dataIndex.categories) {
            // 如果有索引文件，使用新的数据格式
            // 加载所有分类数据文件
            const categoryDataPromises = dataIndex.categories.map(category => 
                loadJSONData(category.file)
            );
            
            const categoryData = await Promise.all(categoryDataPromises);
            
            // 合并所有分类数据
            let allEvents = [];
            categoryData.forEach((data, index) => {
                if (Array.isArray(data)) {
                    allEvents = allEvents.concat(data);
                }
            });
            
            return allEvents;
        } else {
            // 回退到旧的加载方式
            const rawEvents = await loadJSONData('historical_events.json');
            return adaptHistoricalEvents(rawEvents);
        }
    } catch (error) {
        console.error('加载历史事件数据失败:', error);
        return [];
    }
}

/**
 * 加载迁徙路线数据
 * @returns {Promise} 包含迁徙路线数据的Promise
 */
export async function loadMigrations() {
    const rawMigrations = await loadJSONData('human_migrations.json');
    return adaptMigrations(rawMigrations);
}

/**
 * 加载技术发展数据
 * @returns {Promise} 包含技术发展数据的Promise
 */
export async function loadTechnologicalDevelopments() {
    const rawTechnologies = await loadJSONData('technological_developments.json');
    return adaptTechnologies(rawTechnologies);
}

/**
 * 加载区域物种数据
 * @returns {Promise} 包含区域物种数据的Promise
 */
export async function loadRegionalSpecies() {
    const rawSpecies = await loadJSONData('regional_species.json');
    return adaptSpecies(rawSpecies);
}

/**
 * 加载社会组织数据
 * @returns {Promise} 包含社会组织数据的Promise
 */
export async function loadSocialOrganizations() {
    return await loadJSONData('social_organizations.json');
}

/**
 * 获取与年份相关的事件
 * @param {Array} events - 事件数组
 * @param {number} year - 年份
 * @param {number} range - 年份范围
 * @returns {Array} 相关事件数组
 */
export function getEventsForYear(events, year, range = 100) {
    if (!events || !Array.isArray(events)) {
        console.warn('传入的事件数据无效');
        return [];
    }
    
    return events.filter(event => {
        // 如果事件有开始和结束年份，检查当前年份是否在该范围内
        if (event.startYear !== undefined && event.endYear !== undefined) {
            return year >= event.startYear && year <= event.endYear;
        } else if (event.year !== undefined && event.endYear !== undefined) {
            return year >= event.year && year <= event.endYear;
        }
        
        // 如果事件只有一个年份，检查与当前年份的差距是否在范围内
        if (event.startYear !== undefined) {
            return Math.abs(event.startYear - year) <= range;
        } else if (event.year !== undefined) {
            return Math.abs(event.year - year) <= range;
        }
        
        return false;
    });
}

/**
 * 获取与年份相关的迁徙路线
 * @param {Array} migrations - 迁徙路线数组
 * @param {number} year - 年份
 * @returns {Array} 相关迁徙路线数组
 */
export function getMigrationsForYear(migrations, year) {
    if (!migrations || !Array.isArray(migrations)) {
        console.warn('传入的迁徙数据无效');
        return [];
    }
    
    return migrations.filter(migration => {
        return migration.startYear <= year && migration.endYear >= year;
    });
}

/**
 * 获取与特定事件相关的事件
 * @param {Array} events - 事件数组
 * @param {string} eventId - 事件ID
 * @returns {Array} 相关事件数组
 */
export function getRelatedEvents(events, eventId) {
    if (!events || !Array.isArray(events)) {
        console.warn('传入的事件数据无效');
        return [];
    }
    
    // 找到目标事件
    const targetEvent = events.find(event => event.id === eventId);
    if (!targetEvent || !targetEvent.relatedEvents || !Array.isArray(targetEvent.relatedEvents)) {
        return [];
    }
    
    // 返回所有相关事件
    return events.filter(event => targetEvent.relatedEvents.includes(event.id));
}

/**
 * 按类别过滤事件
 * @param {Array} events - 事件数组
 * @param {string} category - 类别
 * @returns {Array} 过滤后的事件数组
 */
export function filterEventsByCategory(events, category) {
    if (!events || !Array.isArray(events)) {
        console.warn('传入的事件数据无效');
        return [];
    }
    
    if (!category) {
        return events;
    }
    
    return events.filter(event => event.category === category);
}

/**
 * 按重要性排序事件
 * @param {Array} events - 事件数组
 * @param {boolean} descending - 是否降序排序
 * @returns {Array} 排序后的事件数组
 */
export function sortEventsByImportance(events, descending = true) {
    if (!events || !Array.isArray(events)) {
        console.warn('传入的事件数据无效');
        return [];
    }
    
    return [...events].sort((a, b) => {
        const importanceA = a.importance || 0;
        const importanceB = b.importance || 0;
        return descending ? importanceB - importanceA : importanceA - importanceB;
    });
}

/**
 * 按年份排序事件
 * @param {Array} events - 事件数组
 * @param {boolean} ascending - 是否升序排序
 * @returns {Array} 排序后的事件数组
 */
export function sortEventsByYear(events, ascending = true) {
    if (!events || !Array.isArray(events)) {
        console.warn('传入的事件数据无效');
        return [];
    }
    
    return [...events].sort((a, b) => {
        const yearA = a.year || 0;
        const yearB = b.year || 0;
        return ascending ? yearA - yearB : yearB - yearA;
    });
}

/**
 * 加载分类数据
 * @returns {Promise} 包含分类数据的Promise
 */
export async function loadCategories() {
    try {
        const dataIndex = await loadJSONData('index.json');
        if (dataIndex && dataIndex.categories) {
            return dataIndex.categories;
        }
        return [];
    } catch (error) {
        console.error('加载分类数据失败:', error);
        return [];
    }
}