/**
 * Modern Chart Manager - Handles all chart visualizations
 */
class ModernChartManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.charts = new Map();
        this.chartInstances = new Map();
    }

    /**
     * Initialize all charts
     */
    async initialize() {
        try {
            console.log('Initializing charts...');
            
            // Initialize trend chart
            this.initializeTrendsChart();
            
            // Initialize distribution chart
            this.initializeDistributionChart();
            
            // Initialize scatter chart
            this.initializeScatterChart();
            
            console.log('Charts initialized successfully');
        } catch (error) {
            console.error('Error initializing charts:', error);
        }
    }

    /**
     * Initialize trends chart
     */
    initializeTrendsChart() {
        const container = document.getElementById('trendsChart');
        if (!container) {
            console.warn('Trends chart container not found');
            return;
        }

        // Check if data is available
        if (!this.dataManager.data.complexChanges || this.dataManager.data.complexChanges.length === 0) {
            console.warn('No complex changes data available for trends chart');
            container.innerHTML = '<div class="text-center text-muted py-5"><i class="fas fa-chart-line fa-2x mb-3"></i><p>數據載入中...</p></div>';
            return;
        }

        // Check if Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.error('Chart.js not loaded');
            container.innerHTML = '<div class="text-center text-danger py-5"><i class="fas fa-exclamation-triangle fa-2x mb-3"></i><p>Chart.js 載入失敗</p></div>';
            return;
        }

        // Clear existing content
        container.innerHTML = '';

        // Create canvas element
        const canvas = document.createElement('canvas');
        canvas.id = 'trendsChartCanvas';
        container.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        
        // Get county trends data
        const trendsData = this.dataManager.getVersionTrends();
        const topCounties = trendsData.slice(0, 8); // Show top 8 counties
        
        console.log('Trends data:', topCounties);

        const chartData = {
            labels: ['版本 246', '版本 247', '版本 248', '版本 249', '版本 250', '版本 251'],
            datasets: topCounties.map((county, index) => ({
                label: county.name,
                data: county.data.map(d => d.value),
                borderColor: this.getColorForIndex(index),
                backgroundColor: this.getColorForIndex(index, 0.1),
                borderWidth: 2,
                fill: false,
                tension: 0.1,
                pointRadius: 4,
                pointHoverRadius: 6
            }))
        };

        try {
            const chart = new Chart(ctx, {
                type: 'line',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: '各縣市調整率趨勢',
                            font: {
                                size: 16,
                                weight: 'bold'
                            }
                        },
                        legend: {
                            display: true,
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                padding: 20
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            titleColor: 'white',
                            bodyColor: 'white',
                            borderColor: 'rgba(255,255,255,0.2)',
                            borderWidth: 1,
                            cornerRadius: 8,
                            displayColors: true,
                            callbacks: {
                                label: function(context) {
                                    return `${context.dataset.label}: ${context.parsed.y.toFixed(4)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            title: {
                                display: true,
                                text: '平均調整率'
                            },
                            grid: {
                                color: 'rgba(0,0,0,0.1)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: '模型版本'
                            },
                            grid: {
                                color: 'rgba(0,0,0,0.1)'
                            }
                        }
                    }
                }
            });

            this.chartInstances.set('trends', chart);
            console.log('Trends chart created successfully');
        } catch (error) {
            console.error('Error creating trends chart:', error);
            container.innerHTML = '<div class="text-center text-muted py-5"><p>圖表載入失敗</p></div>';
        }
    }

    /**
     * Initialize distribution chart
     */
    initializeDistributionChart() {
        const container = document.getElementById('distributionChart');
        if (!container) {
            console.warn('Distribution chart container not found');
            return;
        }

        // Check if data is available
        const complexes = this.dataManager.data.complexChanges;
        if (!complexes || complexes.length === 0) {
            console.warn('No complex changes data available for distribution chart');
            container.innerHTML = '<div class="text-center text-muted py-5"><i class="fas fa-chart-bar fa-2x mb-3"></i><p>數據載入中...</p></div>';
            return;
        }

        // Check if Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.error('Chart.js not loaded');
            container.innerHTML = '<div class="text-center text-danger py-5"><i class="fas fa-exclamation-triangle fa-2x mb-3"></i><p>Chart.js 載入失敗</p></div>';
            return;
        }

        // Clear existing content
        container.innerHTML = '';

        const canvas = document.createElement('canvas');
        canvas.id = 'distributionChartCanvas';
        container.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        
        // Prepare histogram data
        const relativeChanges = complexes.map(c => Math.abs(c.relative_change));
        
        console.log('Distribution data sample:', relativeChanges.slice(0, 10));
        
        // Create bins
        const binCount = 20;
        const maxChange = Math.max(...relativeChanges);
        const binSize = maxChange / binCount;
        const bins = Array(binCount).fill(0);
        const binLabels = [];

        for (let i = 0; i < binCount; i++) {
            binLabels.push(`${(i * binSize * 100).toFixed(1)}%-${((i + 1) * binSize * 100).toFixed(1)}%`);
        }

        relativeChanges.forEach(change => {
            const binIndex = Math.min(Math.floor(change / binSize), binCount - 1);
            bins[binIndex]++;
        });

        try {
            const chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: binLabels,
                    datasets: [{
                        label: '社區數量',
                        data: bins,
                        backgroundColor: 'rgba(30, 64, 175, 0.6)',
                        borderColor: 'rgba(30, 64, 175, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                                text: '相對變化分布圖',
                            font: {
                                size: 16,
                                weight: 'bold'
                            }
                        },
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            titleColor: 'white',
                            bodyColor: 'white',
                            borderColor: 'rgba(255,255,255,0.2)',
                            borderWidth: 1,
                            cornerRadius: 8,
                            callbacks: {
                                title: function(context) {
                                    return `變化範圍: ${context[0].label}`;
                                },
                                label: function(context) {
                                    return `社區數量: ${context.parsed.y}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: '社區數量'
                            },
                            grid: {
                                color: 'rgba(0,0,0,0.1)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: '相對變化範圍'
                            },
                            ticks: {
                                maxRotation: 45
                            },
                            grid: {
                                color: 'rgba(0,0,0,0.1)'
                            }
                        }
                    }
                }
            });

            this.chartInstances.set('distribution', chart);
            console.log('Distribution chart created successfully');
        } catch (error) {
            console.error('Error creating distribution chart:', error);
            container.innerHTML = '<div class="text-center text-muted py-5"><p>圖表載入失敗</p></div>';
        }
    }

    /**
     * Initialize scatter chart
     */
    initializeScatterChart() {
        const container = document.getElementById('scatterChart');
        if (!container) {
            console.warn('Scatter chart container not found');
            return;
        }

        // Check if data is available
        const complexes = this.dataManager.data.complexChanges;
        if (!complexes || complexes.length === 0) {
            console.warn('No complex changes data available for scatter chart');
            container.innerHTML = '<div class="text-center text-muted py-5"><i class="fas fa-chart-scatter fa-2x mb-3"></i><p>數據載入中...</p></div>';
            return;
        }

        // Check if Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.error('Chart.js not loaded');
            container.innerHTML = '<div class="text-center text-danger py-5"><i class="fas fa-exclamation-triangle fa-2x mb-3"></i><p>Chart.js 載入失敗</p></div>';
            return;
        }

        // Clear existing content
        container.innerHTML = '';

        const canvas = document.createElement('canvas');
        canvas.id = 'scatterChartCanvas';
        container.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        
        // Prepare scatter data
        const counties = [...new Set(complexes.map(c => c.county))];
        
        console.log('Scatter chart counties:', counties);
        
        const datasets = counties.map((county, index) => {
            const countyComplexes = complexes.filter(c => c.county === county);
            return {
                label: county,
                data: countyComplexes.map(c => ({
                    x: c.absolute_change,
                    y: Math.abs(c.relative_change),
                    complex: c
                })),
                backgroundColor: this.getColorForIndex(index, 0.6),
                borderColor: this.getColorForIndex(index),
                borderWidth: 1,
                pointRadius: 4,
                pointHoverRadius: 6
            };
        });

        try {
            const chart = new Chart(ctx, {
                type: 'scatter',
                data: { datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: '絕對變化 vs 相對變化散點圖',
                            font: {
                                size: 16,
                                weight: 'bold'
                            }
                        },
                        legend: {
                            display: true,
                            position: 'right',
                            labels: {
                                usePointStyle: true,
                                padding: 15
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            titleColor: 'white',
                            bodyColor: 'white',
                            borderColor: 'rgba(255,255,255,0.2)',
                            borderWidth: 1,
                            cornerRadius: 8,
                            callbacks: {
                                title: function(context) {
                                    const point = context[0].raw;
                                    return point.complex.complex_name;
                                },
                                label: function(context) {
                                    const point = context.raw;
                                    return [
                                        `縣市: ${point.complex.county}`,
                                        `絕對變化: ${point.x.toFixed(4)}`,
                                        `相對變化: ${(point.y * 100).toFixed(2)}%`,
                                        `標準差: ${point.complex.std_dev.toFixed(4)}`
                                    ];
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: '絕對變化'
                            },
                            grid: {
                                color: 'rgba(0,0,0,0.1)'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: '相對變化'
                            },
                            grid: {
                                color: 'rgba(0,0,0,0.1)'
                            }
                        }
                    },
                    onClick: (event, elements) => {
                        if (elements.length > 0) {
                            const element = elements[0];
                            const datasetIndex = element.datasetIndex;
                            const dataIndex = element.index;
                            const complex = datasets[datasetIndex].data[dataIndex].complex;
                            
                            if (window.dashboard) {
                                window.dashboard.showComplexDetail(complex.complex_id);
                            }
                        }
                    }
                }
            });

            this.chartInstances.set('scatter', chart);
            console.log('Scatter chart created successfully');
        } catch (error) {
            console.error('Error creating scatter chart:', error);
            container.innerHTML = '<div class="text-center text-muted py-5"><p>圖表載入失敗</p></div>';
        }
    }

    /**
     * Update trends chart based on analysis type
     */
    updateTrendsChart(analysisType) {
        const chart = this.chartInstances.get('trends');
        if (!chart) return;

        let newData;
        let title;

        switch (analysisType) {
            case 'overall':
                newData = this.getOverallTrends();
                title = '整體平均調整率趨勢';
                break;
            case 'county':
                newData = this.getCountyTrends();
                title = '各縣市調整率趨勢';
                break;
            case 'complex':
                newData = this.getTopComplexTrends();
                title = '波動最大社區趨勢';
                break;
            default:
                return;
        }

        chart.data.datasets = newData;
        chart.options.plugins.title.text = title;
        chart.update();
    }

    /**
     * Get overall trends data
     */
    getOverallTrends() {
        const allVersions = [246, 247, 248, 249, 250, 251];
        const complexes = this.dataManager.data.complexChanges;
        
        const overallData = allVersions.map(version => {
            const versionValues = [];
            complexes.forEach(complex => {
                const versionData = complex.version_data.find(v => v.version === version);
                if (versionData) {
                    versionValues.push(versionData.ratio);
                }
            });
            return versionValues.length > 0 ? 
                versionValues.reduce((sum, v) => sum + v, 0) / versionValues.length : 0;
        });

        return [{
            label: '全台平均',
            data: overallData,
            borderColor: '#1e40af',
            backgroundColor: 'rgba(30, 64, 175, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.1,
            pointRadius: 6,
            pointHoverRadius: 8
        }];
    }

    /**
     * Get county trends data
     */
    getCountyTrends() {
        const trendsData = this.dataManager.getVersionTrends();
        return trendsData.slice(0, 8).map((county, index) => ({
            label: county.name,
            data: county.data.map(d => d.value),
            borderColor: this.getColorForIndex(index),
            backgroundColor: this.getColorForIndex(index, 0.1),
            borderWidth: 2,
            fill: false,
            tension: 0.1,
            pointRadius: 4,
            pointHoverRadius: 6
        }));
    }

    /**
     * Get top volatile complexes trends
     */
    getTopComplexTrends() {
        const complexes = this.dataManager.data.complexChanges;
        const topVolatile = complexes
            .sort((a, b) => Math.abs(b.relative_change) - Math.abs(a.relative_change))
            .slice(0, 5);

        return topVolatile.map((complex, index) => ({
            label: `${complex.complex_name} (${complex.county})`,
            data: complex.version_data.map(v => v.ratio),
            borderColor: this.getColorForIndex(index),
            backgroundColor: this.getColorForIndex(index, 0.1),
            borderWidth: 2,
            fill: false,
            tension: 0.1,
            pointRadius: 4,
            pointHoverRadius: 6
        }));
    }

    /**
     * Create box plot for county comparison
     */
    createCountyBoxPlot(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Note: Chart.js doesn't have built-in box plot support
        // This would require a custom implementation or a plugin
        // For now, we'll create a simplified version using error bars

        const canvas = document.createElement('canvas');
        canvas.id = `${containerId}Canvas`;
        container.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        const countyStats = this.dataManager.getCountyRanking();

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: countyStats.slice(0, 10).map(c => c.county),
                datasets: [{
                    label: '平均波動',
                    data: countyStats.slice(0, 10).map(c => c.averageVolatility),
                    backgroundColor: 'rgba(30, 64, 175, 0.6)',
                    borderColor: 'rgba(30, 64, 175, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '各縣市波動性比較',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '平均波動'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '縣市'
                        }
                    }
                }
            }
        });

        return chart;
    }

    /**
     * Get color for chart datasets
     */
    getColorForIndex(index, alpha = 1) {
        const colors = [
            `rgba(30, 64, 175, ${alpha})`,   // Blue
            `rgba(239, 68, 68, ${alpha})`,   // Red
            `rgba(34, 197, 94, ${alpha})`,   // Green
            `rgba(245, 158, 11, ${alpha})`,  // Yellow
            `rgba(168, 85, 247, ${alpha})`,  // Purple
            `rgba(236, 72, 153, ${alpha})`,  // Pink
            `rgba(20, 184, 166, ${alpha})`,  // Teal
            `rgba(251, 146, 60, ${alpha})`,  // Orange
            `rgba(156, 163, 175, ${alpha})`, // Gray
            `rgba(139, 69, 19, ${alpha})`    // Brown
        ];
        return colors[index % colors.length];
    }

    /**
     * Destroy all charts
     */
    destroy() {
        this.chartInstances.forEach(chart => {
            chart.destroy();
        });
        this.chartInstances.clear();
    }

    /**
     * Resize all charts
     */
    resize() {
        this.chartInstances.forEach(chart => {
            chart.resize();
        });
    }

    /**
     * Update chart colors based on theme
     */
    updateTheme(isDark = false) {
        const textColor = isDark ? '#ffffff' : '#374151';
        const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

        this.chartInstances.forEach(chart => {
            chart.options.plugins.title.color = textColor;
            chart.options.plugins.legend.labels.color = textColor;
            chart.options.scales.x.title.color = textColor;
            chart.options.scales.y.title.color = textColor;
            chart.options.scales.x.ticks.color = textColor;
            chart.options.scales.y.ticks.color = textColor;
            chart.options.scales.x.grid.color = gridColor;
            chart.options.scales.y.grid.color = gridColor;
            chart.update();
        });
    }
}