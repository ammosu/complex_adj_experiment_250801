/**
 * 遠端數據載入器 - 支援從S3動態載入CSV並進行前端分析
 * 部署時無需包含真實數據文件，直接從遠端獲取
 */

class RemoteDataLoader {
    constructor() {
        // 支援環境變數配置
        this.S3_CSV_URL = this.getDataSourceUrl();
        this.cache = new Map();
        this.isLoading = false;
    }
    
    /**
     * 獲取數據源URL，支援環境變數配置
     */
    getDataSourceUrl() {
        // 優先順序：window環境變數 > localStorage > 預設值
        const sources = [
            window.HOUSING_DATA_URL,                    // 全域變數
            localStorage.getItem('HOUSING_DATA_URL'),   // localStorage
            null // 無預設值，必須透過環境變數設定
        ];
        
        for (const source of sources) {
            if (source && source.trim() !== '') {
                console.log('🔧 使用數據源:', source);
                return source.trim();
            }
        }
        
        return sources[sources.length - 1]; // 回傳預設值
    }

    /**
     * 載入並解析遠端CSV數據
     */
    async loadRemoteCSV() {
        if (this.cache.has('rawData')) {
            console.log('📋 使用快取數據');
            return this.cache.get('rawData');
        }

        if (this.isLoading) {
            console.log('⏳ 數據載入中...');
            return null;
        }

        this.isLoading = true;
        
        try {
            if (!this.S3_CSV_URL) {
                console.warn('⚠️ 未設定數據源URL，使用備案數據');
                return this.loadFallbackData();
            }
            
            console.log('🌐 從S3載入數據:', this.S3_CSV_URL);
            
            // 顯示載入進度
            this.showLoadingProgress('正在載入遠端數據...');
            
            const response = await fetch(this.S3_CSV_URL, {
                method: 'GET',
                headers: {
                    'Accept': 'text/csv',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const csvText = await response.text();
            
            this.showLoadingProgress('正在解析CSV數據...');
            
            // 解析CSV
            const rows = this.parseCSV(csvText);
            
            console.log(`✅ 成功載入 ${rows.length} 筆記錄`);
            
            // 快取數據
            this.cache.set('rawData', rows);
            
            return rows;
            
        } catch (error) {
            console.error('❌ 遠端數據載入失敗:', error);
            
            // 載入失敗時使用本地樣本數據
            console.log('📝 載入本地樣本數據作為備案');
            return this.loadFallbackData();
            
        } finally {
            this.isLoading = false;
            this.hideLoadingProgress();
        }
    }

    /**
     * 解析CSV文本為對象陣列
     */
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    const value = values[index]?.trim();
                    
                    // 數值轉換
                    if (header === 'ratio' || header === 'adj' || header === 'std') {
                        row[header] = value && value !== '' ? parseFloat(value) : null;
                    } else if (header === 'count' || header === 'model_version') {
                        row[header] = value && value !== '' ? parseInt(value) : null;
                    } else {
                        row[header] = value || '';
                    }
                });
                rows.push(row);
            }
        }
        
        return rows;
    }

    /**
     * 解析CSV行，處理逗號和引號
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++; // 跳過下一個引號
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result;
    }

    /**
     * 分析複雜變化 - 前端版本
     */
    async analyzeComplexChanges() {
        if (this.cache.has('complexChanges')) {
            return this.cache.get('complexChanges');
        }

        const rawData = await this.loadRemoteCSV();
        if (!rawData) return [];

        this.showLoadingProgress('正在分析複雜變化...');

        // 按complex_id分組
        const complexGroups = new Map();
        
        rawData.forEach(row => {
            const complexId = row.name || row.complex_id;
            if (!complexId) return;
            
            if (!complexGroups.has(complexId)) {
                complexGroups.set(complexId, []);
            }
            complexGroups.get(complexId).push(row);
        });

        const complexChanges = [];

        // 分析每個complex的變化
        for (const [complexId, records] of complexGroups.entries()) {
            if (records.length < 2) continue; // 需要至少2個版本

            // 排序版本
            records.sort((a, b) => (a.model_version || 0) - (b.model_version || 0));

            // 提取調整率 (優先使用adj，然後ratio)
            const ratios = [];
            const versionData = [];

            records.forEach(record => {
                const ratio = record.adj !== null ? record.adj : record.ratio;
                if (ratio !== null && !isNaN(ratio)) {
                    ratios.push(ratio);
                    versionData.push({
                        version: record.model_version,
                        ratio: ratio,
                        complex_name: record.complex_name || record.name,
                        county: record.county
                    });
                }
            });

            if (ratios.length < 2) continue;

            // 計算統計指標
            const minRatio = Math.min(...ratios);
            const maxRatio = Math.max(...ratios);
            const absoluteChange = maxRatio - minRatio;
            const relativeChange = minRatio > 0 ? absoluteChange / minRatio : 0;
            
            // 標準差
            const mean = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
            const variance = ratios.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / ratios.length;
            const stdDev = Math.sqrt(variance);

            // 週期變化
            const periodChanges = [];
            for (let i = 1; i < versionData.length; i++) {
                const prev = versionData[i - 1];
                const curr = versionData[i];
                const absChange = Math.abs(curr.ratio - prev.ratio);
                const relChange = prev.ratio > 0 ? absChange / prev.ratio : 0;
                
                periodChanges.push({
                    from_version: prev.version,
                    to_version: curr.version,
                    absolute_change: absChange,
                    relative_change: relChange
                });
            }

            complexChanges.push({
                complex_id: complexId,
                complex_name: records[0].complex_name || records[0].name || complexId,
                county: records[0].county || '未知',
                version_count: versionData.length,
                min_ratio: minRatio,
                max_ratio: maxRatio,
                absolute_change: absoluteChange,
                relative_change: relativeChange,
                std_dev: stdDev,
                version_data: versionData,
                period_changes: periodChanges
            });
        }

        // 排序（按相對變化降序）
        complexChanges.sort((a, b) => b.relative_change - a.relative_change);

        console.log(`✅ 分析完成，共 ${complexChanges.length} 個複雜變化`);
        
        // 快取結果
        this.cache.set('complexChanges', complexChanges);
        
        return complexChanges;
    }

    /**
     * 生成縣市統計
     */
    async generateCountyStats() {
        const complexChanges = await this.analyzeComplexChanges();
        
        const countyMap = new Map();
        
        complexChanges.forEach(complex => {
            const county = complex.county;
            if (!countyMap.has(county)) {
                countyMap.set(county, {
                    county: county,
                    complexCount: 0,
                    totalVolatility: 0,
                    maxVolatility: 0
                });
            }
            
            const stats = countyMap.get(county);
            stats.complexCount++;
            stats.totalVolatility += complex.std_dev || 0;
            stats.maxVolatility = Math.max(stats.maxVolatility, complex.std_dev || 0);
        });

        const countyStats = Array.from(countyMap.values()).map(stats => ({
            ...stats,
            averageVolatility: stats.complexCount > 0 ? stats.totalVolatility / stats.complexCount : 0
        }));

        countyStats.sort((a, b) => b.averageVolatility - a.averageVolatility);
        
        return countyStats;
    }

    /**
     * 生成版本趨勢
     */
    async generateVersionTrends() {
        const rawData = await this.loadRemoteCSV();
        if (!rawData) return [];

        const versionMap = new Map();
        
        rawData.forEach(row => {
            const version = row.model_version;
            const ratio = row.adj !== null ? row.adj : row.ratio;
            
            if (version && ratio !== null && !isNaN(ratio)) {
                if (!versionMap.has(version)) {
                    versionMap.set(version, {
                        version: version,
                        ratios: [],
                        complexCount: 0
                    });
                }
                
                const versionData = versionMap.get(version);
                versionData.ratios.push(ratio);
                versionData.complexCount++;
            }
        });

        const versionTrends = Array.from(versionMap.values()).map(data => ({
            version: data.version,
            averageRatio: data.ratios.length > 0 ? 
                data.ratios.reduce((sum, r) => sum + r, 0) / data.ratios.length : 0,
            complexCount: data.complexCount
        }));

        versionTrends.sort((a, b) => a.version - b.version);
        
        return versionTrends;
    }

    /**
     * 載入備案數據（當遠端失敗時）
     */
    async loadFallbackData() {
        try {
            // 嘗試載入主要分析數據
            const response = await fetch('./data/complex_changes.json');
            if (response.ok) {
                const data = await response.json();
                console.log('✅ 載入本地JSON數據成功');
                return data;
            }
        } catch (e) {
            console.log('⚠️ 主要JSON載入失敗:', e.message);
        }

        try {
            // 嘗試載入樣本數據
            const response = await fetch('./data/sample_complex_changes.json');
            if (response.ok) {
                const data = await response.json();
                console.log('✅ 載入樣本JSON數據成功');
                return data;
            }
        } catch (e) {
            console.log('⚠️ 樣本JSON載入失敗:', e.message);
        }

        // 返回最小樣本數據
        console.log('📝 生成內建樣本數據');
        return this.generateMinimalSampleData();
    }

    /**
     * 生成最小樣本數據
     */
    generateMinimalSampleData() {
        const counties = ['台北', '新北', '桃園', '台中', '台南', '高雄', '新竹', '苗栗'];
        const sampleData = [];

        for (let i = 0; i < 20; i++) {
            const versions = [];
            for (let v = 246; v <= 251; v++) {
                versions.push({
                    version: v,
                    ratio: 0.9 + Math.random() * 0.4,
                    complex_name: `樣本社區${i + 1}`,
                    county: counties[i % counties.length]
                });
            }

            const ratios = versions.map(v => v.ratio);
            const minRatio = Math.min(...ratios);
            const maxRatio = Math.max(...ratios);

            sampleData.push({
                complex_id: `sample_${i.toString().padStart(4, '0')}`,
                complex_name: `樣本社區${i + 1}`,
                county: counties[i % counties.length],
                version_count: 6,
                min_ratio: minRatio,
                max_ratio: maxRatio,
                absolute_change: maxRatio - minRatio,
                relative_change: (maxRatio - minRatio) / minRatio,
                std_dev: 0.05 + Math.random() * 0.1,
                version_data: versions,
                period_changes: []
            });
        }

        return sampleData;
    }

    /**
     * 顯示載入進度
     */
    showLoadingProgress(message) {
        const overlay = document.getElementById('loadingOverlay');
        const messageEl = document.querySelector('#loadingOverlay .loading-message');
        
        if (overlay) {
            overlay.style.display = 'flex';
            if (messageEl) {
                messageEl.textContent = message;
            }
        }
    }

    /**
     * 隱藏載入進度
     */
    hideLoadingProgress() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
}

// 導出為全域變數
window.RemoteDataLoader = RemoteDataLoader;