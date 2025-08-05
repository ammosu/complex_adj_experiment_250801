/**
 * Valuation Analysis Charts - 社區估值分析圖表
 * 專門處理估值vs實際值的視覺化
 */
class ValuationChartsManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.charts = new Map();
    }

    /**
     * 創建社區時間序列對比圖 - 估值vs實際值
     */
    createComplexTimeSeriesChart(complexName, containerId) {
        const data = this.dataManager.getComplexValuationData(complexName);
        if (!data || data.length === 0) {
            console.warn(`沒有找到社區 ${complexName} 的估值數據`);
            return null;
        }

        const ctx = document.getElementById(containerId).getContext('2d');
        
        // 銷毀現有圖表
        if (this.charts.has(containerId)) {
            this.charts.get(containerId).destroy();
        }

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => `${d.交易年月 || d.版本}`),
                datasets: [
                    {
                        label: '實際值',
                        data: data.map(d => d.實際值),
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        yAxisID: 'y',
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: '估值',
                        data: data.map(d => d.估值),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        yAxisID: 'y',
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: '準確度 (%)',
                        data: data.map(d => (d.準確度 || 0) * 100),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.3)',
                        borderWidth: 1,
                        type: 'bar',
                        yAxisID: 'y1',
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    title: {
                        display: true,
                        text: `${complexName} - 估值準確度時間序列`,
                        font: { size: 16 }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                const dataIndex = context.dataIndex;
                                const record = data[dataIndex];
                                return [
                                    `版本: ${record.版本}`,
                                    `差異: ${(record.差異 || 0).toFixed(0)}`,
                                    `差異率: ${((record.差異率 || 0) * 100).toFixed(1)}%`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: '時間/版本'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: '價格'
                        },
                        ticks: {
                            callback: function(value) {
                                return new Intl.NumberFormat('zh-TW').format(value);
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: '準確度 (%)'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                        min: 0,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });

        this.charts.set(containerId, chart);
        return chart;
    }

    /**
     * 創建估值vs實際值散點圖
     */
    createValuationScatterChart(containerId, complexNames = []) {
        let data = [];
        
        if (complexNames.length > 0) {
            // 顯示特定社區
            complexNames.forEach(complexName => {
                const complexData = this.dataManager.getComplexValuationData(complexName);
                data = data.concat(complexData.map(d => ({
                    ...d,
                    社區名稱: complexName
                })));
            });
        } else {
            // 顯示所有樣本數據
            data = this.dataManager.data.valuationData?.sampleData || [];
        }

        if (data.length === 0) {
            console.warn('沒有估值數據可顯示');
            return null;
        }

        const ctx = document.getElementById(containerId).getContext('2d');
        
        // 銷毀現有圖表
        if (this.charts.has(containerId)) {
            this.charts.get(containerId).destroy();
        }

        // 計算完美預測線的範圍
        const minValue = Math.min(...data.map(d => Math.min(d.實際值, d.估值)));
        const maxValue = Math.max(...data.map(d => Math.max(d.實際值, d.估值)));

        const chart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: '估值 vs 實際值',
                        data: data.map(d => ({
                            x: d.實際值,
                            y: d.估值,
                            社區名稱: d.社區名稱,
                            版本: d.版本,
                            準確度: d.準確度
                        })),
                        backgroundColor: data.map(d => {
                            const accuracy = d.準確度 || 0;
                            const alpha = 0.6;
                            if (accuracy > 0.9) return `rgba(16, 185, 129, ${alpha})`; // 綠色 - 高準確度
                            if (accuracy > 0.8) return `rgba(59, 130, 246, ${alpha})`; // 藍色 - 中等準確度
                            return `rgba(239, 68, 68, ${alpha})`; // 紅色 - 低準確度
                        }),
                        borderColor: data.map(d => {
                            const accuracy = d.準確度 || 0;
                            if (accuracy > 0.9) return 'rgba(16, 185, 129, 1)';
                            if (accuracy > 0.8) return 'rgba(59, 130, 246, 1)';
                            return 'rgba(239, 68, 68, 1)';
                        }),
                        pointRadius: 5,
                        pointHoverRadius: 7
                    },
                    {
                        label: '完美預測線 (y=x)',
                        data: [
                            { x: minValue, y: minValue },
                            { x: maxValue, y: maxValue }
                        ],
                        type: 'line',
                        borderColor: 'rgba(107, 114, 128, 0.8)',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 0,
                        pointHoverRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '估值準確度散點圖',
                        font: { size: 16 }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                const point = context[0];
                                return point.raw.社區名稱 || '未知社區';
                            },
                            label: function(context) {
                                const point = context.raw;
                                return [
                                    `實際值: ${new Intl.NumberFormat('zh-TW').format(point.x)}`,
                                    `估值: ${new Intl.NumberFormat('zh-TW').format(point.y)}`,
                                    `版本: ${point.版本}`,
                                    `準確度: ${((point.準確度 || 0) * 100).toFixed(1)}%`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: '實際值'
                        },
                        ticks: {
                            callback: function(value) {
                                return new Intl.NumberFormat('zh-TW', {
                                    notation: 'compact'
                                }).format(value);
                            }
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: '估值'
                        },
                        ticks: {
                            callback: function(value) {
                                return new Intl.NumberFormat('zh-TW', {
                                    notation: 'compact'
                                }).format(value);
                            }
                        }
                    }
                }
            }
        });

        this.charts.set(containerId, chart);
        return chart;
    }

    /**
     * 創建準確度熱力圖 (使用Chart.js matrix)
     */
    createAccuracyHeatmap(containerId) {
        const matrixData = this.dataManager.getValuationAccuracyMatrix();
        
        if (matrixData.length === 0) {
            console.warn('沒有準確度矩陣數據');
            return null;
        }

        const ctx = document.getElementById(containerId).getContext('2d');
        
        // 銷毀現有圖表
        if (this.charts.has(containerId)) {
            this.charts.get(containerId).destroy();
        }

        // 轉換數據格式為Chart.js matrix所需格式
        const chartData = matrixData.map(item => ({
            x: item.版本,
            y: item.社區名稱,
            v: item.準確度
        }));

        const chart = new Chart(ctx, {
            type: 'scatter', // 使用scatter作為基礎，然後自定義繪製
            data: {
                datasets: [{
                    label: '準確度',
                    data: chartData,
                    backgroundColor: chartData.map(d => {
                        const accuracy = d.v || 0;
                        // 使用顏色映射：紅色(低) -> 黃色(中) -> 綠色(高)
                        if (accuracy > 0.9) return 'rgba(16, 185, 129, 0.8)';
                        if (accuracy > 0.8) return 'rgba(59, 130, 246, 0.8)';
                        if (accuracy > 0.7) return 'rgba(245, 158, 11, 0.8)';
                        return 'rgba(239, 68, 68, 0.8)';
                    }),
                    pointRadius: 15,
                    pointHoverRadius: 18
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '社區版本準確度熱力圖',
                        font: { size: 16 }
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                const point = context[0];
                                return `${point.parsed.y} - 版本${point.parsed.x}`;
                            },
                            label: function(context) {
                                const accuracy = context.parsed.v || 0;
                                return `準確度: ${(accuracy * 100).toFixed(1)}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        display: true,
                        title: {
                            display: true,
                            text: '模型版本'
                        },
                        min: 245,
                        max: 252,
                        ticks: {
                            stepSize: 1
                        }
                    },
                    y: {
                        type: 'category',
                        display: true,
                        title: {
                            display: true,
                            text: '社區名稱'
                        },
                        labels: [...new Set(matrixData.map(d => d.社區名稱))].sort()
                    }
                }
            }
        });

        this.charts.set(containerId, chart);
        return chart;
    }

    /**
     * 創建縣市準確度比較圖
     */
    createCountyAccuracyChart(containerId) {
        const countyStats = this.dataManager.data.valuationData?.countyStats || [];
        
        if (countyStats.length === 0) {
            console.warn('沒有縣市準確度統計數據');
            return null;
        }

        const ctx = document.getElementById(containerId).getContext('2d');
        
        // 銷毀現有圖表
        if (this.charts.has(containerId)) {
            this.charts.get(containerId).destroy();
        }

        // 按準確度排序
        const sortedStats = countyStats.sort((a, b) => b.平均準確度 - a.平均準確度);

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedStats.map(s => s.縣市),
                datasets: [{
                    label: '平均準確度 (%)',
                    data: sortedStats.map(s => (s.平均準確度 || 0) * 100),
                    backgroundColor: sortedStats.map(s => {
                        const accuracy = s.平均準確度 || 0;
                        if (accuracy > 0.9) return 'rgba(16, 185, 129, 0.8)';
                        if (accuracy > 0.85) return 'rgba(59, 130, 246, 0.8)';
                        if (accuracy > 0.8) return 'rgba(245, 158, 11, 0.8)';
                        return 'rgba(239, 68, 68, 0.8)';
                    }),
                    borderColor: sortedStats.map(s => {
                        const accuracy = s.平均準確度 || 0;
                        if (accuracy > 0.9) return 'rgba(16, 185, 129, 1)';
                        if (accuracy > 0.85) return 'rgba(59, 130, 246, 1)';
                        if (accuracy > 0.8) return 'rgba(245, 158, 11, 1)';
                        return 'rgba(239, 68, 68, 1)';
                    }),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '各縣市估值準確度比較',
                        font: { size: 16 }
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                const county = sortedStats[context.dataIndex];
                                return [
                                    `標準差: ${((county.準確度標準差 || 0) * 100).toFixed(1)}%`,
                                    `數據筆數: ${county.數據筆數}`,
                                    `社區數量: ${county.社區數量}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: '縣市'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: '平均準確度 (%)'
                        },
                        min: 0,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });

        this.charts.set(containerId, chart);
        return chart;
    }

    /**
     * 銷毀所有圖表
     */
    destroyAllCharts() {
        this.charts.forEach(chart => {
            chart.destroy();
        });
        this.charts.clear();
    }

    /**
     * 銷毀特定圖表
     */
    destroyChart(containerId) {
        if (this.charts.has(containerId)) {
            this.charts.get(containerId).destroy();
            this.charts.delete(containerId);
        }
    }
}

// 導出供其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValuationChartsManager;
}