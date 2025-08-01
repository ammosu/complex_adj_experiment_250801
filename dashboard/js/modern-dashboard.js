/**
 * Modern Dashboard Controller - Main application controller
 */
class ModernDashboard {
    constructor() {
        this.dataManager = new ModernDataManager();
        this.currentFilters = {
            counties: [],
            volatilityRange: [0, 1.0],
            searchTerm: ''
        };
        this.selectedComplexes = new Set();
        this.components = {};
    }

    /**
     * Initialize the dashboard
     */
    async initialize() {
        try {
            console.log('Initializing Modern Dashboard...');
            
            // Show loading overlay
            this.showLoading();
            
            // Load all data first
            console.log('Loading data...');
            await this.dataManager.loadAllData();
            console.log('Data loaded successfully');
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Render basic views first
            this.renderInitialViews();
            
            // Initialize components after data is loaded
            await this.initializeComponents();
            
            // Hide loading overlay
            this.hideLoading();
            
            console.log('Dashboard initialized successfully');
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            this.showError('載入數據時發生錯誤，請重新整理頁面');
            this.hideLoading();
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('complexSearch');
        const searchButton = document.getElementById('searchButton');
        const volatilityRange = document.getElementById('volatilityRange');
        const volatilityValue = document.getElementById('volatilityValue');
        
        if (searchInput && searchButton) {
            searchInput.addEventListener('input', this.debounce(this.handleSearch.bind(this), 300));
            searchButton.addEventListener('click', this.handleSearch.bind(this));
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearch();
                }
            });
        }

        if (volatilityRange && volatilityValue) {
            volatilityRange.addEventListener('input', (e) => {
                volatilityValue.textContent = e.target.value;
                this.currentFilters.volatilityRange = [0, parseFloat(e.target.value)];
                this.debounce(this.handleSearch.bind(this), 300)();
            });
        }

        // County filter
        const countyFilter = document.getElementById('countyFilter');
        if (countyFilter) {
            countyFilter.addEventListener('change', this.handleCountyFilter.bind(this));
        }

        // Map mode toggle
        const mapModeRadios = document.querySelectorAll('input[name="mapMode"]');
        mapModeRadios.forEach(radio => {
            radio.addEventListener('change', this.handleMapModeChange.bind(this));
        });

        // Trend analysis type
        const trendAnalysisType = document.getElementById('trendAnalysisType');
        if (trendAnalysisType) {
            trendAnalysisType.addEventListener('change', this.handleTrendAnalysisChange.bind(this));
        }

        // Export functionality
        const exportButton = document.getElementById('exportResults');
        if (exportButton) {
            exportButton.addEventListener('click', this.handleExport.bind(this));
        }

        // Subscribe to data updates
        this.dataManager.subscribe('loadingState', this.handleLoadingStateChange.bind(this));
    }

    /**
     * Initialize components
     */
    async initializeComponents() {
        console.log('Initializing components...');
        
        // Initialize smart navigation
        this.components.smartNav = new SmartNavigation();
        
        // Initialize map component (if ModernMapManager exists)
        if (typeof ModernMapManager !== 'undefined') {
            console.log('Initializing map component...');
            this.components.map = new ModernMapManager('taiwanMap', this.dataManager);
            await this.components.map.initialize();
        } else {
            console.warn('ModernMapManager not found');
        }

        // Initialize charts component (if ModernChartManager exists)
        if (typeof ModernChartManager !== 'undefined') {
            console.log('Initializing charts component...');
            this.components.charts = new ModernChartManager(this.dataManager);
            await this.components.charts.initialize();
        } else {
            console.warn('ModernChartManager not found');
        }
        
        console.log('Components initialization completed');
    }

    /**
     * Render initial views
     */
    renderInitialViews() {
        this.renderKPICards();
        this.renderCountyRanking();
        this.populateCountyFilter();
        this.renderSearchResults([]);
    }

    /**
     * Render KPI Cards
     */
    renderKPICards() {
        const summaryStats = this.dataManager.getSummaryStats();
        if (!summaryStats) return;

        const kpiContainer = document.getElementById('kpiCards');
        if (!kpiContainer) return;

        const kpiData = [
            {
                icon: 'fas fa-building',
                value: summaryStats.totalComplexes.toLocaleString(),
                label: '總社區數',
                trend: null,
                color: 'primary'
            },
            {
                icon: 'fas fa-chart-line',
                value: `${(summaryStats.stableRatio * 100).toFixed(1)}%`,
                label: '穩定社區比例',
                trend: 'stable',
                color: 'success'
            },
            {
                icon: 'fas fa-exclamation-triangle',
                value: `${(Math.abs(summaryStats.maxVolatilityComplex.relative_change) * 100).toFixed(1)}%`,
                label: '最大波動幅度',
                trend: summaryStats.maxVolatilityComplex.complex_name,
                color: 'warning'
            },
            {
                icon: 'fas fa-calculator',
                value: summaryStats.avgAdjustmentRate.toFixed(3),
                label: '平均調整率',
                trend: '<a href="calculation-info.html" target="_blank" class="text-decoration-none small">查看計算方法 <i class="fas fa-external-link-alt"></i></a>',
                color: 'info'
            }
        ];

        kpiContainer.innerHTML = kpiData.map(kpi => `
            <div class="col-lg-3 col-md-6 mb-3">
                <div class="kpi-card fade-in-up h-100">
                    <div class="kpi-card-icon">
                        <i class="${kpi.icon}"></i>
                    </div>
                    <div class="kpi-card-value">${kpi.value}</div>
                    <div class="kpi-card-label">${kpi.label}</div>
                    ${kpi.trend ? `<div class="kpi-card-trend">${kpi.trend}</div>` : ''}
                </div>
            </div>
        `).join('');
    }

    /**
     * Render county ranking
     */
    renderCountyRanking() {
        const ranking = this.dataManager.getCountyRanking('averageVolatility');
        const container = document.getElementById('countyRanking');
        if (!container) return;

        const maxVolatility = Math.max(...ranking.map(c => c.averageVolatility));

        container.innerHTML = ranking.slice(0, 10).map((county, index) => {
            const barWidth = (county.averageVolatility / maxVolatility) * 100;
            return `
                <div class="county-item">
                    <div>
                        <div class="county-name">${index + 1}. ${county.county}</div>
                        <div class="county-bar" style="width: ${barWidth}%"></div>
                        <small class="text-muted">${county.complexCount} 個社區</small>
                    </div>
                    <div class="county-value">${(county.averageVolatility * 100).toFixed(1)}%</div>
                </div>
            `;
        }).join('');
    }

    /**
     * Populate county filter dropdown
     */
    populateCountyFilter() {
        const countyFilter = document.getElementById('countyFilter');
        if (!countyFilter) return;

        const counties = [...new Set(this.dataManager.data.complexChanges.map(c => c.county))].sort();
        
        countyFilter.innerHTML = counties.map(county => 
            `<option value="${county}">${county}</option>`
        ).join('');
    }

    /**
     * Handle search functionality
     */
    handleSearch() {
        const searchInput = document.getElementById('complexSearch');
        const countyFilter = document.getElementById('countyFilter');
        const volatilityRange = document.getElementById('volatilityRange');

        if (!searchInput) return;

        const searchTerm = searchInput.value.trim();
        const selectedCounties = countyFilter ? Array.from(countyFilter.selectedOptions).map(opt => opt.value) : [];
        const maxVolatility = volatilityRange ? parseFloat(volatilityRange.value) : 1;

        const filters = {
            counties: selectedCounties,
            volatilityMin: 0,
            volatilityMax: maxVolatility
        };

        const results = this.dataManager.searchComplexes(searchTerm, filters);
        this.renderSearchResults(results);
    }

    /**
     * Render search results
     */
    renderSearchResults(results) {
        const container = document.getElementById('searchResults');
        if (!container) return;

        if (results.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i class="fas fa-search fa-3x mb-3"></i>
                    <p>沒有找到符合條件的社區</p>
                </div>
            `;
            return;
        }

        // Sort by volatility (highest first)
        const sortedResults = results.sort((a, b) => Math.abs(b.relative_change) - Math.abs(a.relative_change));

        container.innerHTML = sortedResults.slice(0, 50).map(complex => `
            <div class="search-result-item" onclick="dashboard.showComplexDetail('${complex.complex_id}')">
                <div class="search-result-header">
                    <div>
                        <div class="search-result-name">${complex.complex_name}</div>
                        <div class="search-result-county">
                            <i class="fas fa-map-marker-alt me-1"></i>
                            ${complex.county}
                        </div>
                    </div>
                    <div class="badge bg-${this.getRiskBadgeColor(complex.riskLevel)}">${this.getRiskLevelText(complex.riskLevel)}</div>
                </div>
                <div class="search-result-stats">
                    <div class="search-result-stat">
                        <span class="search-result-stat-value">${(Math.abs(complex.relative_change) * 100).toFixed(1)}%</span>
                        <div class="search-result-stat-label">相對變化</div>
                    </div>
                    <div class="search-result-stat">
                        <span class="search-result-stat-value">${complex.absolute_change.toFixed(3)}</span>
                        <div class="search-result-stat-label">絕對變化</div>
                    </div>
                    <div class="search-result-stat">
                        <span class="search-result-stat-value">${complex.std_dev.toFixed(3)}</span>
                        <div class="search-result-stat-label">標準差</div>
                    </div>
                    <div class="search-result-stat">
                        <span class="search-result-stat-value">${complex.version_count}</span>
                        <div class="search-result-stat-label">版本數</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Show complex detail modal
     */
    showComplexDetail(complexId) {
        const complex = this.dataManager.data.complexChanges.find(c => c.complex_id === complexId);
        if (!complex) return;

        const modal = new bootstrap.Modal(document.getElementById('complexDetailModal'));
        const modalTitle = document.getElementById('complexDetailModalLabel');
        const modalContent = document.getElementById('complexDetailContent');

        modalTitle.textContent = `${complex.complex_name} - 詳細資訊`;

        // Create trend chart data
        const trendData = complex.version_data.map(v => ({
            version: v.version,
            ratio: v.ratio
        }));

        modalContent.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>基本資訊</h6>
                    <table class="table table-sm">
                        <tr><td>社區ID</td><td>${complex.complex_id}</td></tr>
                        <tr><td>縣市</td><td>${complex.county}</td></tr>
                        <tr><td>版本數</td><td>${complex.version_count}</td></tr>
                        <tr><td>風險等級</td><td><span class="badge bg-${this.getRiskBadgeColor(complex.riskLevel)}">${this.getRiskLevelText(complex.riskLevel)}</span></td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6>統計數據</h6>
                    <table class="table table-sm">
                        <tr><td>最小值</td><td>${complex.min_ratio.toFixed(4)}</td></tr>
                        <tr><td>最大值</td><td>${complex.max_ratio.toFixed(4)}</td></tr>
                        <tr><td>絕對變化</td><td>${complex.absolute_change.toFixed(4)}</td></tr>
                        <tr><td>相對變化</td><td>${(complex.relative_change * 100).toFixed(2)}%</td></tr>
                        <tr><td>標準差</td><td>${complex.std_dev.toFixed(4)}</td></tr>
                    </table>
                </div>
            </div>
            <div class="row mt-3">
                <div class="col-12">
                    <h6>版本變化趨勢</h6>
                    <canvas id="complexTrendChart" width="400" height="200"></canvas>
                </div>
            </div>
        `;

        modal.show();

        // Create trend chart after modal is shown
        setTimeout(() => {
            this.createComplexTrendChart(trendData);
        }, 300);
    }

    /**
     * Create complex trend chart
     */
    createComplexTrendChart(data) {
        const canvas = document.getElementById('complexTrendChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => `版本 ${d.version}`),
                datasets: [{
                    label: '調整率',
                    data: data.map(d => d.ratio),
                    borderColor: '#1e40af',
                    backgroundColor: 'rgba(30, 64, 175, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: {
                            color: '#e5e7eb'
                        }
                    },
                    x: {
                        grid: {
                            color: '#e5e7eb'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    /**
     * Handle county filter change
     */
    handleCountyFilter() {
        this.handleSearch();
    }

    /**
     * Handle map mode change
     */
    handleMapModeChange(event) {
        const mode = event.target.id.replace('mapMode', '').toLowerCase();
        if (this.components.map) {
            this.components.map.setDisplayMode(mode);
        }
    }

    /**
     * Handle trend analysis type change
     */
    handleTrendAnalysisChange(event) {
        const type = event.target.value;
        if (this.components.charts) {
            this.components.charts.updateTrendsChart(type);
        }
    }

    /**
     * Handle export functionality
     */
    handleExport() {
        const searchTerm = document.getElementById('complexSearch')?.value || '';
        const selectedCounties = Array.from(document.getElementById('countyFilter')?.selectedOptions || []).map(opt => opt.value);
        const maxVolatility = parseFloat(document.getElementById('volatilityRange')?.value || 1);

        const filters = {
            counties: selectedCounties,
            volatilityMin: 0,
            volatilityMax: maxVolatility
        };

        const results = this.dataManager.searchComplexes(searchTerm, filters);
        const csvData = this.dataManager.exportData('csv', 'complexChanges', filters);

        // Download CSV file
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `housing_complex_analysis_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }

    /**
     * Handle loading state changes
     */
    handleLoadingStateChange(loadingState) {
        if (loadingState.hasLoading) {
            this.showLoading();
        } else {
            this.hideLoading();
        }
    }

    /**
     * Show loading overlay
     */
    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        // Create error toast or modal
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed';
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 10000; max-width: 400px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    /**
     * Get risk badge color
     */
    getRiskBadgeColor(riskLevel) {
        const colors = {
            'low': 'success',
            'medium': 'warning',
            'high': 'danger',
            'extreme': 'dark'
        };
        return colors[riskLevel] || 'secondary';
    }

    /**
     * Get risk level text
     */
    getRiskLevelText(riskLevel) {
        const texts = {
            'low': '低風險',
            'medium': '中風險',
            'high': '高風險',
            'extreme': '極高風險'
        };
        return texts[riskLevel] || '未知';
    }

    /**
     * Filter by county (called from map clicks)
     */
    filterByCounty(countyName) {
        // 設置縣市篩選
        const countyFilter = document.getElementById('countyFilter');
        if (countyFilter) {
            // Clear existing selections
            Array.from(countyFilter.options).forEach(option => {
                option.selected = option.value === countyName;
            });
        }
        
        // 確保波動範圍設置為預設值 1.0
        const volatilityRange = document.getElementById('volatilityRange');
        const volatilityValue = document.getElementById('volatilityValue');
        if (volatilityRange && volatilityValue) {
            volatilityRange.value = '1.0';
            volatilityValue.textContent = '1.0';
        }
        
        // 清空搜尋框
        const searchInput = document.getElementById('complexSearch');
        if (searchInput) {
            searchInput.value = '';
        }
        
        // 滾動到搜尋區域
        const searchSection = document.getElementById('search-section');
        if (searchSection) {
            searchSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        // 延遲執行搜尋以確保DOM元素都已準備好
        setTimeout(() => {
            this.handleSearch();
        }, 100);
    }

    /**
     * Debounce utility
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

/**
 * Smart Navigation - Handles intelligent sticky navbar with scroll behavior
 */
class SmartNavigation {
    constructor() {
        this.navbar = document.querySelector('.navbar');
        this.navLinks = document.querySelectorAll('.scroll-link');
        this.sections = Array.from(this.navLinks).map(link => 
            document.querySelector(link.getAttribute('href'))
        );
        this.lastScrollTop = 0;
        this.isScrollingDown = false;
        
        this.init();
    }
    
    init() {
        this.createProgressBar();
        this.attachScrollListener();
        this.attachResizeListener();
    }
    
    createProgressBar() {
        const progressBar = document.createElement('div');
        progressBar.className = 'scroll-progress';
        document.body.appendChild(progressBar);
        this.progressBar = progressBar;
    }
    
    attachScrollListener() {
        let ticking = false;
        
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    this.handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        });
    }
    
    attachResizeListener() {
        window.addEventListener('resize', () => {
            this.updateSectionPositions();
        });
    }
    
    handleScroll() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const isScrollingDown = scrollTop > this.lastScrollTop;
        const scrollThreshold = 100;
        
        // Update scroll direction
        if (Math.abs(scrollTop - this.lastScrollTop) > 5) {
            this.isScrollingDown = isScrollingDown;
        }
        
        // Handle navbar visibility
        if (scrollTop > scrollThreshold) {
            this.navbar.classList.add('navbar-compact');
            
            if (this.isScrollingDown && scrollTop > this.lastScrollTop + 10) {
                this.navbar.classList.add('navbar-hidden');
            } else if (!this.isScrollingDown && scrollTop < this.lastScrollTop - 10) {
                this.navbar.classList.remove('navbar-hidden');
            }
        } else {
            this.navbar.classList.remove('navbar-compact', 'navbar-hidden');
        }
        
        // Update progress bar
        this.updateProgressBar();
        
        // Update active section
        this.updateActiveSection();
        
        this.lastScrollTop = scrollTop;
    }
    
    updateProgressBar() {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight - windowHeight;
        const scrolled = (window.pageYOffset / documentHeight) * 100;
        this.progressBar.style.width = `${Math.min(scrolled, 100)}%`;
    }
    
    updateActiveSection() {
        const scrollPosition = window.pageYOffset + this.navbar.offsetHeight + 50;
        
        let activeSection = null;
        this.sections.forEach((section, index) => {
            if (section && section.offsetTop <= scrollPosition) {
                activeSection = index;
            }
        });
        
        // Update active nav link
        this.navLinks.forEach((link, index) => {
            link.classList.toggle('active', index === activeSection);
        });
    }
    
    updateSectionPositions() {
        // Recalculate section positions after resize
        this.updateActiveSection();
    }
}

// Make dashboard available globally
window.dashboard = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.dashboard = new ModernDashboard();
});