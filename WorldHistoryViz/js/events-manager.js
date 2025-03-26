/**
 * 事件管理器模块
 * 负责管理历史事件的显示和交互
 */

/**
 * 事件管理器类
 */
export class EventsManager {
    /**
     * 构造函数
     * @param {string} eventsListId - 事件列表容器ID
     * @param {string} eventDetailsId - 事件详情容器ID
     */
    constructor(eventsListId, eventDetailsId) {
        this.eventsListElement = document.getElementById(eventsListId);
        this.eventDetailsElement = document.getElementById(eventDetailsId);
        this.eventSelectedCallback = null;
        this.events = [];
        this.currentCategory = 'all';
        this.currentImportance = 'all';
        this.currentYear = 0;
        
        // 初始化过滤器
        this.initFilters();
    }
    
    /**
     * 初始化事件过滤器
     */
    initFilters() {
        // 类别过滤器
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.currentCategory = e.target.value;
                this.updateEventsList(this.events, this.currentYear);
            });
        }
        
        // 重要性过滤器
        const importanceFilter = document.getElementById('importance-filter');
        if (importanceFilter) {
            importanceFilter.addEventListener('change', (e) => {
                this.currentImportance = e.target.value;
                this.updateEventsList(this.events, this.currentYear);
            });
        }
        
        // 初始化类别按钮
        this.initCategoryButtons();
    }
    
    /**
     * 初始化类别按钮
     */
    initCategoryButtons() {
        const buttons = document.querySelectorAll('.category-btn');
        if (buttons) {
            buttons.forEach(button => {
                button.addEventListener('click', () => {
                    // 移除所有按钮的激活状态
                    buttons.forEach(btn => btn.classList.remove('active'));
                    
                    // 添加当前按钮的激活状态
                    button.classList.add('active');
                    
                    // 更新当前类别
                    this.currentCategory = button.dataset.category;
                    
                    // 更新事件列表
                    this.updateEventsList(this.events, this.currentYear);
                    
                    // 更新类别过滤器下拉框的值
                    const categoryFilter = document.getElementById('category-filter');
                    if (categoryFilter) {
                        categoryFilter.value = this.currentCategory;
                    }
                });
            });
        }
    }
    
    /**
     * 设置事件选择回调
     * @param {Function} callback - 回调函数
     */
    setEventSelectedCallback(callback) {
        this.eventSelectedCallback = callback;
    }
    
    /**
     * 更新事件列表
     * @param {Array} events - 事件数组
     * @param {number} year - 当前年份
     */
    updateEventsList(events, year) {
        this.events = events || [];
        this.currentYear = year;
        
        // 清空事件列表
        if (this.eventsListElement) {
            this.eventsListElement.innerHTML = '';
        }
        
        // 获取与当前年份相关的事件
        const relevantEvents = this.filterEvents(events, year);
        
        // 显示年份范围
        this.updateYearRangeDisplay(year);
        
        // 如果没有相关事件，显示提示信息
        if (relevantEvents.length === 0) {
            this.showNoEventsMessage(year);
            return;
        }
        
        // 创建事件列表容器
        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'events-container';
        
        // 添加事件卡片
        relevantEvents.forEach(event => {
            const eventCard = this.createEventCard(event);
            eventsContainer.appendChild(eventCard);
        });
        
        // 添加到DOM
        if (this.eventsListElement) {
            this.eventsListElement.appendChild(eventsContainer);
        }
    }
    
    /**
     * 筛选事件
     * @param {Array} events - 事件数组
     * @param {number} year - 年份
     * @returns {Array} 筛选后的事件数组
     */
    filterEvents(events, year) {
        if (!events || !Array.isArray(events)) return [];
        
        console.log(`筛选年份 ${year} 的事件，类别: ${this.currentCategory}, 重要性: ${this.currentImportance}`);
        
        // 搜索范围：当前年份前后100年
        const rangeStart = year - 100;
        const rangeEnd = year + 100;
        
        // 先按年份筛选
        let filtered = events.filter(event => {
            // 如果事件有开始和结束年份，检查当前年份是否在该范围内
            if (event.year !== undefined && event.endYear !== undefined) {
                return year >= event.year && year <= event.endYear;
            }
            
            // 如果事件只有一个年份，检查与当前年份的差距是否在范围内
            if (event.year !== undefined) {
                return Math.abs(event.year - year) <= 100;
            }
            
            // 如果有原始数据的时间范围，尝试解析
            if (event.originalData && event.originalData.occurrenceTime) {
                const timeStr = event.originalData.occurrenceTime;
                if (timeStr.includes('至')) {
                    const [startStr, endStr] = timeStr.split('至');
                    const startYear = this.parseYearString(startStr);
                    const endYear = this.parseYearString(endStr);
                    if (startYear !== 0 && endYear !== 0) {
                        return year >= startYear && year <= endYear;
                    }
                }
            }
            
            // 尝试按照历史时期进行粗略匹配
            if (year <= -8000) { // 史前时期
                return event.category === '农业' || event.description.includes('史前') || 
                       event.name.includes('史前') || event.description.includes('古人类');
            } else if (year <= -1000) { // 古代早期
                return event.description.includes('古代') || event.description.includes('古文明') ||
                       event.name.includes('古代') || event.name.includes('古文明');
            } else if (year <= 1500) { // 古代晚期到中世纪
                return event.description.includes('中世纪') || event.description.includes('古代') ||
                       event.name.includes('中世纪') || event.name.includes('古代');
            } else { // 现代
                return event.description.includes('现代') || event.description.includes('工业') ||
                       event.name.includes('现代') || event.name.includes('工业') ||
                       (event.year >= 1500);
            }
            
            return false;
        });
        
        // 按类别筛选
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(event => {
                if (!event.category) return false;
                return event.category === this.currentCategory;
            });
        }
        
        // 按重要性筛选
        if (this.currentImportance !== 'all') {
            const minImportance = parseInt(this.currentImportance);
            filtered = filtered.filter(event => {
                if (!event.importance) return false;
                return event.importance >= minImportance;
            });
        }
        
        // 按重要性排序
        filtered.sort((a, b) => {
            // 首先按重要性降序排序
            if (b.importance !== a.importance) {
                return b.importance - a.importance;
            }
            
            // 然后按年份排序
            if (a.year !== b.year) {
                return a.year - b.year;
            }
            
            // 最后按名称排序
            return a.name.localeCompare(b.name);
        });
        
        return filtered;
    }
    
    /**
     * 解析年份字符串
     * @param {string} yearStr - 年份字符串
     * @returns {number} - 解析后的年份
     */
    parseYearString(yearStr) {
        if (!yearStr) return 0;
        
        // 去除空格
        yearStr = yearStr.trim();
        
        // 处理"公元前"情况
        if (yearStr.includes('公元前')) {
            const numStr = yearStr.replace('公元前', '').replace('年', '').trim();
            const num = parseInt(numStr);
            return isNaN(num) ? 0 : -num;
        }
        
        // 处理"公元"情况
        if (yearStr.includes('公元')) {
            const numStr = yearStr.replace('公元', '').replace('年', '').trim();
            const num = parseInt(numStr);
            return isNaN(num) ? 0 : num;
        }
        
        // 处理带有"年"的情况
        if (yearStr.includes('年')) {
            const numStr = yearStr.replace('年', '').trim();
            const num = parseInt(numStr);
            return isNaN(num) ? 0 : num;
        }
        
        // 尝试直接解析数字
        const num = parseInt(yearStr);
        return isNaN(num) ? 0 : num;
    }
    
    /**
     * 更新年份范围显示
     * @param {number} year - 当前年份
     */
    updateYearRangeDisplay(year) {
        const yearRangeElement = document.getElementById('events-year-range');
        if (yearRangeElement) {
            const startYear = year - 100;
            const endYear = year + 100;
            
            const formatYear = (y) => {
                return y < 0 ? `公元前${Math.abs(y)}年` : `公元${y}年`;
            };
            
            yearRangeElement.textContent = `(${formatYear(startYear)} - ${formatYear(endYear)})`;
        }
    }
    
    /**
     * 显示没有事件的提示信息
     * @param {number} year - 当前年份
     */
    showNoEventsMessage(year) {
        if (!this.eventsListElement) return;
        
        const messageContainer = document.createElement('div');
        messageContainer.className = 'no-events';
        
        const formatYear = (y) => {
            return y < 0 ? `公元前${Math.abs(y)}年` : `公元${y}年`;
        };
        
        messageContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center h-40 text-center">
                <i class="material-icons-round text-gray-400 text-4xl mb-3">search_off</i>
                <p class="text-gray-500">在 ${formatYear(year)} 附近未找到${this.currentCategory !== 'all' ? this.currentCategory : ''}历史事件</p>
                <p class="text-gray-400 text-sm mt-2">尝试调整时间或筛选条件</p>
            </div>
        `;
        
        this.eventsListElement.appendChild(messageContainer);
    }
    
    /**
     * 创建事件卡片
     * @param {Object} event - 事件对象
     * @returns {HTMLElement} 事件卡片元素
     */
    createEventCard(event) {
        const cardElement = document.createElement('div');
        cardElement.className = 'event-card slide-in';
        cardElement.dataset.eventId = event.id;
        
        // 格式化年份
        const formatYear = (year) => {
            if (!year && year !== 0) return '未知';
            return year < 0 ? `公元前${Math.abs(year)}年` : `公元${year}年`;
        };
        
        // 获取年份显示文本
        let yearDisplay = '';
        if (event.year !== undefined && event.endYear !== undefined && event.year !== event.endYear) {
            yearDisplay = `${formatYear(event.year)} - ${formatYear(event.endYear)}`;
        } else if (event.year !== undefined) {
            yearDisplay = formatYear(event.year);
        } else {
            yearDisplay = '未知时间';
        }
        
        // 获取重要性星级
        const importanceStars = '★'.repeat(event.importance || 0);
        
        // 构建卡片内容
        const cardContent = `
            <div class="event-card-inner">
                <div class="flex items-center justify-between">
                    <div class="event-title">
                        <i class="material-icons-round ${this.getCategoryIconClass(event.category || '其他')}">${this.getCategoryIcon(event.category || '其他')}</i>
                        <span>${event.name}</span>
                    </div>
                    <span class="event-category ${event.category || '其他'}">${event.category || '其他'}</span>
                </div>
                
                <div class="event-meta">
                    <div class="event-date">
                        <i class="material-icons-round text-gray-400 text-sm">event</i>
                        <span>${yearDisplay}</span>
                    </div>
                    <div class="event-importance">
                        <i class="material-icons-round text-amber-500 text-sm">star</i>
                        <span>${importanceStars}</span>
                    </div>
                </div>
                
                <div class="event-description">
                    ${event.description || '无详细描述'}
                </div>
                
                <div class="text-right mt-1">
                    <button class="text-xs text-blue-500 hover:text-blue-700 view-details-btn">
                        <i class="material-icons-round align-middle text-sm">info</i>
                        查看详情
                    </button>
                </div>
            </div>
        `;
        
        cardElement.innerHTML = cardContent;
        
        // 添加点击事件
        cardElement.addEventListener('click', () => {
            this.showEventDetails(event);
            
            // 调用回调函数
            if (this.eventSelectedCallback) {
                this.eventSelectedCallback(event.id);
            }
        });
        
        return cardElement;
    }
    
    /**
     * 获取类别图标
     * @param {string} category - 类别名称
     * @returns {string} 图标名称
     */
    getCategoryIcon(category) {
        const icons = {
            '农业': 'grass',
            '技术': 'precision_manufacturing',
            '文明': 'account_balance',
            '征服': 'gavel',
            '疾病': 'coronavirus',
            '迁徙': 'timeline',
            '其他': 'category'
        };
        
        return icons[category] || 'category';
    }
    
    /**
     * 获取类别图标CSS类
     * @param {string} category - 类别名称
     * @returns {string} CSS类名
     */
    getCategoryIconClass(category) {
        const classes = {
            '农业': 'text-green-600',
            '技术': 'text-blue-600',
            '文明': 'text-purple-600',
            '征服': 'text-red-600',
            '疾病': 'text-amber-600',
            '迁徙': 'text-purple-600',
            '其他': 'text-gray-600'
        };
        
        return classes[category] || 'text-gray-600';
    }
    
    /**
     * 显示事件详情
     * @param {Object} event - 事件对象
     */
    showEventDetails(event) {
        if (!this.eventDetailsElement) return;
        
        // 显示详情面板
        this.eventDetailsElement.classList.remove('hidden');
        
        // 格式化年份
        const formatYear = (year) => {
            if (!year && year !== 0) return '未知';
            return year < 0 ? `公元前${Math.abs(year)}年` : `公元${year}年`;
        };
        
        // 获取年份显示文本
        let yearDisplay = '';
        if (event.year !== undefined && event.endYear !== undefined && event.year !== event.endYear) {
            yearDisplay = `${formatYear(event.year)} - ${formatYear(event.endYear)}`;
        } else if (event.year !== undefined) {
            yearDisplay = formatYear(event.year);
        } else {
            yearDisplay = '未知时间';
        }
        
        // 获取重要性星级
        const importanceStars = '★'.repeat(event.importance || 0);
        
        // 构建详情内容
        const detailsContent = document.getElementById('event-details-content');
        if (detailsContent) {
            detailsContent.innerHTML = `
                <div class="bg-gray-50 p-3 rounded-lg mb-4 border border-gray-200">
                    <div class="flex items-center gap-2 mb-2">
                        <i class="material-icons-round ${this.getCategoryIconClass(event.category || '其他')} text-2xl">${this.getCategoryIcon(event.category || '其他')}</i>
                        <h2 class="text-lg font-semibold text-gray-900">${event.name}</h2>
                    </div>
                    <div class="flex justify-between items-center text-sm text-gray-600">
                        <div>
                            <i class="material-icons-round align-middle text-sm">event</i>
                            ${yearDisplay}
                        </div>
                        <div class="text-amber-500">
                            ${importanceStars}
                        </div>
                    </div>
                </div>
                
                <div class="mb-4">
                    <h3 class="text-sm font-medium text-gray-700 mb-1 flex items-center">
                        <i class="material-icons-round text-gray-500 mr-1">description</i>
                        事件描述
                    </h3>
                    <p class="text-sm text-gray-600 border-l-2 border-gray-300 pl-3 py-1">${event.description || '无详细描述'}</p>
                </div>
                
                ${event.historicalSignificance ? `
                <div class="mb-4">
                    <h3 class="text-sm font-medium text-gray-700 mb-1 flex items-center">
                        <i class="material-icons-round text-gray-500 mr-1">history_edu</i>
                        历史意义
                    </h3>
                    <p class="text-sm text-gray-600 border-l-2 border-gray-300 pl-3 py-1">${event.historicalSignificance}</p>
                </div>
                ` : ''}
                
                ${event.location ? `
                <div class="mb-4">
                    <h3 class="text-sm font-medium text-gray-700 mb-1 flex items-center">
                        <i class="material-icons-round text-gray-500 mr-1">place</i>
                        发生地点
                    </h3>
                    <p class="text-sm text-gray-600">${event.location}</p>
                </div>
                ` : ''}
                
                ${event.relatedTechnologies && event.relatedTechnologies.length > 0 ? `
                <div class="mb-4">
                    <h3 class="text-sm font-medium text-gray-700 mb-1 flex items-center">
                        <i class="material-icons-round text-gray-500 mr-1">build</i>
                        相关技术
                    </h3>
                    <div class="flex flex-wrap gap-1">
                        ${event.relatedTechnologies.map(tech => 
                            `<span class="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">${tech}</span>`
                        ).join('')}
                    </div>
                </div>
                ` : ''}
                
                ${event.relatedSpecies && event.relatedSpecies.length > 0 ? `
                <div class="mb-4">
                    <h3 class="text-sm font-medium text-gray-700 mb-1 flex items-center">
                        <i class="material-icons-round text-gray-500 mr-1">pets</i>
                        相关物种
                    </h3>
                    <div class="flex flex-wrap gap-1">
                        ${event.relatedSpecies.map(species => 
                            `<span class="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">${species}</span>`
                        ).join('')}
                    </div>
                </div>
                ` : ''}
                
                <div class="mt-4 pt-3 border-t border-gray-200 text-center">
                    <button class="close-details-btn text-sm text-gray-500 hover:text-gray-700">
                        <i class="material-icons-round align-middle">close</i>
                        关闭详情
                    </button>
                </div>
            `;
            
            // 添加关闭按钮事件
            const closeBtn = detailsContent.querySelector('.close-details-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.eventDetailsElement.classList.add('hidden');
                });
            }
        }
        
        // 添加关闭按钮事件
        const closeBtn = document.getElementById('close-details');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.eventDetailsElement.classList.add('hidden');
            });
        }
    }
    
    /**
     * 高亮指定年份的事件
     * @param {number} year - 年份
     */
    highlightEventsForYear(year) {
        this.currentYear = year;
        this.updateEventsList(this.events, year);
    }
} 