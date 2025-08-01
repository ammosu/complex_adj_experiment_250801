/**
 * Modern Data Manager - Enhanced data management with caching and reactive updates
 */
class ModernDataManager {
    constructor() {
        this.cache = new Map();
        this.subscribers = new Map();
        this.data = {
            complexChanges: [],
            countyStats: [],
            versionTrends: [],
            taiwanMap: null
        };
        this.loadingStates = new Set();
        this.lastUpdated = null;
        
        // Initialize remote data loader
        this.remoteLoader = new RemoteDataLoader();
    }

    /**
     * Load all required data
     */
    async loadAllData() {
        const loadPromises = [
            this.loadComplexChanges(),
            this.loadCountyStats(),
            this.loadVersionTrends(),
            this.loadTaiwanMap()
        ];

        try {
            await Promise.all(loadPromises);
            this.lastUpdated = new Date();
            console.log('All data loaded successfully');
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    /**
     * Load complex changes data
     */
    async loadComplexChanges() {
        if (this.cache.has('complexChanges')) {
            this.data.complexChanges = this.cache.get('complexChanges');
            return this.data.complexChanges;
        }

        this.setLoadingState('complexChanges', true);
        
        try {
            // Try to load from remote data loader first
            let data;
            try {
                console.log('🌐 嘗試從遠端S3載入數據...');
                data = await this.remoteLoader.analyzeComplexChanges();
                console.log('✅ 遠端數據載入成功');
            } catch (remoteError) {
                console.warn('⚠️ 遠端數據載入失敗，嘗試本地JSON:', remoteError);
                // Fallback to local JSON
                const response = await fetch('data/complex_changes.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                data = await response.json();
            }
            
            // Process and enhance data
            const processedData = data.map(complex => ({
                ...complex,
                // Add computed fields
                volatilityScore: this.calculateVolatilityScore(complex),
                stabilityCategory: this.getStabilityCategory(complex.std_dev),
                changeCategory: this.getChangeCategory(complex.relative_change),
                riskLevel: this.calculateRiskLevel(complex)
            }));

            this.data.complexChanges = processedData;
            this.cache.set('complexChanges', processedData);
            this.notifySubscribers('complexChanges', processedData);
            
            return processedData;
        } catch (error) {
            console.error('Error loading complex changes:', error);
            throw error;
        } finally {
            this.setLoadingState('complexChanges', false);
        }
    }

    /**
     * Load county statistics data
     */
    async loadCountyStats() {
        if (this.cache.has('countyStats')) {
            this.data.countyStats = this.cache.get('countyStats');
            return this.data.countyStats;
        }

        this.setLoadingState('countyStats', true);

        try {
            // Try to generate from remote data first
            let data;
            try {
                console.log('🌐 從遠端數據生成縣市統計...');
                data = await this.remoteLoader.generateCountyStats();
                console.log('✅ 縣市統計生成成功');
            } catch (remoteError) {
                console.warn('⚠️ 遠端縣市統計生成失敗，嘗試本地JSON:', remoteError);
                // Fallback to local JSON
                try {
                    const response = await fetch('data/county_stats.json');
                    if (response.ok) {
                        data = await response.json();
                    } else {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                } catch (localError) {
                    console.warn('⚠️ 本地縣市統計載入失敗，嘗試樣本數據:', localError);
                    const sampleResponse = await fetch('data/sample_county_stats.json');
                    if (sampleResponse.ok) {
                        data = await sampleResponse.json();
                        console.log('✅ 載入樣本縣市統計成功');
                    } else {
                        throw new Error('所有縣市統計數據源都失敗');
                    }
                }
            }
            this.data.countyStats = data;
            this.cache.set('countyStats', data);
            this.notifySubscribers('countyStats', data);
            
            return data;
        } catch (error) {
            console.error('Error loading county stats:', error);
            throw error;
        } finally {
            this.setLoadingState('countyStats', false);
        }
    }

    /**
     * Load version trends data
     */
    async loadVersionTrends() {
        if (this.cache.has('versionTrends')) {
            this.data.versionTrends = this.cache.get('versionTrends');
            return this.data.versionTrends;
        }

        this.setLoadingState('versionTrends', true);

        try {
            // Try to generate from remote data first
            let data;
            try {
                console.log('🌐 從遠端數據生成版本趨勢...');
                data = await this.remoteLoader.generateVersionTrends();
                console.log('✅ 版本趨勢生成成功');
            } catch (remoteError) {
                console.warn('⚠️ 遠端版本趨勢生成失敗，嘗試本地JSON:', remoteError);
                // Fallback to local JSON
                try {
                    const response = await fetch('data/version_trends.json');
                    if (response.ok) {
                        data = await response.json();
                    } else {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                } catch (localError) {
                    console.warn('⚠️ 本地版本趨勢載入失敗，嘗試樣本數據:', localError);
                    const sampleResponse = await fetch('data/sample_version_trends.json');
                    if (sampleResponse.ok) {
                        data = await sampleResponse.json();
                        console.log('✅ 載入樣本版本趨勢成功');
                    } else {
                        throw new Error('所有版本趨勢數據源都失敗');
                    }
                }
            }
            this.data.versionTrends = data;
            this.cache.set('versionTrends', data);
            this.notifySubscribers('versionTrends', data);
            
            return data;
        } catch (error) {
            console.error('Error loading version trends:', error);
            throw error;
        } finally {
            this.setLoadingState('versionTrends', false);
        }
    }

    /**
     * Load Taiwan map GeoJSON
     */
    async loadTaiwanMap() {
        if (this.cache.has('taiwanMap')) {
            this.data.taiwanMap = this.cache.get('taiwanMap');
            return this.data.taiwanMap;
        }

        this.setLoadingState('taiwanMap', true);

        try {
            const response = await fetch('data/twCounty2010.geojson');
            if (!response.ok) {
                console.warn(`⚠️ 台灣地圖載入失敗 (${response.status})，使用簡化地圖`);
                // 使用簡化的台灣地圖數據
                const simplifiedMap = this.createSimplifiedTaiwanMap();
                this.data.taiwanMap = simplifiedMap;
                this.cache.set('taiwanMap', simplifiedMap);
                this.notifySubscribers('taiwanMap', simplifiedMap);
                return simplifiedMap;
            }
            
            const data = await response.json();
            this.data.taiwanMap = data;
            this.cache.set('taiwanMap', data);
            this.notifySubscribers('taiwanMap', data);
            
            return data;
        } catch (error) {
            console.warn('⚠️ 台灣地圖載入失敗，使用簡化地圖:', error.message);
            // 降級到簡化地圖
            const simplifiedMap = this.createSimplifiedTaiwanMap();
            this.data.taiwanMap = simplifiedMap;
            this.cache.set('taiwanMap', simplifiedMap);
            this.notifySubscribers('taiwanMap', simplifiedMap);
            return simplifiedMap;
        } finally {
            this.setLoadingState('taiwanMap', false);
        }
    }

    /**
     * 創建簡化的台灣地圖數據
     */
    createSimplifiedTaiwanMap() {
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"name": "台北", "county": "台北"},
                    "geometry": {"type": "Point", "coordinates": [121.5654, 25.0330]}
                },
                {
                    "type": "Feature", 
                    "properties": {"name": "新北", "county": "新北"},
                    "geometry": {"type": "Point", "coordinates": [121.4627, 25.0173]}
                },
                {
                    "type": "Feature",
                    "properties": {"name": "桃園", "county": "桃園"},
                    "geometry": {"type": "Point", "coordinates": [121.3009, 24.9936]}
                },
                {
                    "type": "Feature",
                    "properties": {"name": "台中", "county": "台中"},
                    "geometry": {"type": "Point", "coordinates": [120.6736, 24.1477]}
                },
                {
                    "type": "Feature",
                    "properties": {"name": "台南", "county": "台南"},
                    "geometry": {"type": "Point", "coordinates": [120.2513, 23.1417]}
                },
                {
                    "type": "Feature",
                    "properties": {"name": "高雄", "county": "高雄"},
                    "geometry": {"type": "Point", "coordinates": [120.3014, 22.6273]}
                },
                {
                    "type": "Feature",
                    "properties": {"name": "新竹", "county": "新竹"},
                    "geometry": {"type": "Point", "coordinates": [120.9647, 24.8138]}
                },
                {
                    "type": "Feature",
                    "properties": {"name": "苗栗", "county": "苗栗"},
                    "geometry": {"type": "Point", "coordinates": [120.8214, 24.5602]}
                }
            ]
        };
    }

    /**
     * Subscribe to data updates
     */
    subscribe(dataType, callback) {
        if (!this.subscribers.has(dataType)) {
            this.subscribers.set(dataType, new Set());
        }
        this.subscribers.get(dataType).add(callback);

        // Return unsubscribe function
        return () => {
            const typeSubscribers = this.subscribers.get(dataType);
            if (typeSubscribers) {
                typeSubscribers.delete(callback);
            }
        };
    }

    /**
     * Notify subscribers of data changes
     */
    notifySubscribers(dataType, data) {
        const typeSubscribers = this.subscribers.get(dataType);
        if (typeSubscribers) {
            typeSubscribers.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in subscriber callback:', error);
                }
            });
        }
    }

    /**
     * Get summary statistics
     */
    getSummaryStats() {
        const complexes = this.data.complexChanges;
        if (!complexes || complexes.length === 0) {
            return null;
        }

        const totalComplexes = complexes.length;
        const stableComplexes = complexes.filter(c => c.stabilityCategory === 'stable').length;
        const stableRatio = stableComplexes / totalComplexes;

        // Find max volatility complex
        const maxVolatilityComplex = complexes.reduce((max, current) => 
            Math.abs(current.relative_change) > Math.abs(max.relative_change) ? current : max
        );

        // Calculate average adjustment rate
        const avgAdjustmentRate = complexes.reduce((sum, c) => {
            const avg = c.version_data.reduce((vSum, v) => vSum + v.ratio, 0) / c.version_data.length;
            return sum + avg;
        }, 0) / totalComplexes;

        return {
            totalComplexes,
            stableRatio,
            maxVolatilityComplex,
            avgAdjustmentRate,
            dataLastUpdated: this.lastUpdated
        };
    }

    /**
     * Search complexes by name
     */
    searchComplexes(searchTerm, filters = {}) {
        const {counties = [], volatilityMin = 0, volatilityMax = 1} = filters;
        
        let results = this.data.complexChanges;

        // Text search
        if (searchTerm && searchTerm.trim() !== '') {
            const term = searchTerm.trim().toLowerCase();
            results = results.filter(complex => 
                complex.complex_name.toLowerCase().includes(term) ||
                complex.complex_id.toLowerCase().includes(term)
            );
        }

        // County filter
        if (counties.length > 0) {
            results = results.filter(complex => counties.includes(complex.county));
        }

        // Volatility range filter
        results = results.filter(complex => {
            const volatility = Math.abs(complex.relative_change);
            return volatility >= volatilityMin && volatility <= volatilityMax;
        });

        return results;
    }

    /**
     * Get county ranking by different metrics
     */
    getCountyRanking(metric = 'averageVolatility') {
        const countyData = new Map();

        // Aggregate data by county
        this.data.complexChanges.forEach(complex => {
            const county = complex.county;
            if (!countyData.has(county)) {
                countyData.set(county, {
                    county,
                    complexes: [],
                    totalVolatility: 0,
                    totalChange: 0,
                    stableCount: 0
                });
            }

            const data = countyData.get(county);
            data.complexes.push(complex);
            data.totalVolatility += Math.abs(complex.relative_change);
            data.totalChange += complex.absolute_change;
            if (complex.stabilityCategory === 'stable') {
                data.stableCount++;
            }
        });

        // Calculate metrics and sort
        const ranking = Array.from(countyData.values()).map(data => {
            const complexCount = data.complexes.length;
            return {
                ...data,
                complexCount,
                averageVolatility: data.totalVolatility / complexCount,
                averageChange: data.totalChange / complexCount,
                stabilityRatio: data.stableCount / complexCount,
                volatilityScore: data.totalVolatility / complexCount * complexCount // Weighted by count
            };
        });

        // Sort by selected metric
        const sortKey = {
            'averageVolatility': 'averageVolatility',
            'volatilityScore': 'volatilityScore',
            'complexCount': 'complexCount',
            'stabilityRatio': 'stabilityRatio'
        }[metric] || 'averageVolatility';

        return ranking.sort((a, b) => b[sortKey] - a[sortKey]);
    }

    /**
     * Get version trend data for specific counties or complexes
     */
    getVersionTrends(options = {}) {
        const {counties = [], complexIds = []} = options;

        if (complexIds.length > 0) {
            // Return specific complex trends
            return this.data.complexChanges
                .filter(complex => complexIds.includes(complex.complex_id))
                .map(complex => ({
                    id: complex.complex_id,
                    name: complex.complex_name,
                    county: complex.county,
                    data: complex.version_data.map(v => ({
                        version: v.version,
                        value: v.ratio
                    }))
                }));
        }

        // Return county-level trends
        const countyTrends = new Map();

        this.data.complexChanges.forEach(complex => {
            if (counties.length === 0 || counties.includes(complex.county)) {
                if (!countyTrends.has(complex.county)) {
                    countyTrends.set(complex.county, new Map());
                }

                const countyData = countyTrends.get(complex.county);
                complex.version_data.forEach(v => {
                    if (!countyData.has(v.version)) {
                        countyData.set(v.version, []);
                    }
                    countyData.get(v.version).push(v.ratio);
                });
            }
        });

        return Array.from(countyTrends.entries()).map(([county, versionData]) => ({
            id: county,
            name: county,
            county: county,
            data: Array.from(versionData.entries())
                .sort(([a], [b]) => a - b)
                .map(([version, values]) => ({
                    version,
                    value: values.reduce((sum, v) => sum + v, 0) / values.length,
                    count: values.length
                }))
        }));
    }

    /**
     * Calculate volatility score (0-100)
     */
    calculateVolatilityScore(complex) {
        const relativeWeight = 0.6;
        const stdWeight = 0.4;
        
        const maxRelativeChange = 1.0; // Cap at 100% change
        const maxStdDev = 0.5; // Cap at 0.5 std dev
        
        const relativeScore = Math.min(Math.abs(complex.relative_change) / maxRelativeChange, 1) * 100;
        const stdScore = Math.min(complex.std_dev / maxStdDev, 1) * 100;
        
        return Math.round(relativeScore * relativeWeight + stdScore * stdWeight);
    }

    /**
     * Get stability category
     */
    getStabilityCategory(stdDev) {
        if (stdDev < 0.05) return 'stable';
        if (stdDev < 0.15) return 'moderate';
        return 'volatile';
    }

    /**
     * Get change category
     */
    getChangeCategory(relativeChange) {
        const absChange = Math.abs(relativeChange);
        if (absChange < 0.1) return 'minimal';
        if (absChange < 0.3) return 'moderate';
        if (absChange < 0.5) return 'high';
        return 'extreme';
    }

    /**
     * Calculate risk level
     */
    calculateRiskLevel(complex) {
        const volatilityScore = this.calculateVolatilityScore(complex);
        if (volatilityScore < 20) return 'low';
        if (volatilityScore < 40) return 'medium';
        if (volatilityScore < 70) return 'high';
        return 'extreme';
    }

    /**
     * Set loading state
     */
    setLoadingState(key, loading) {
        if (loading) {
            this.loadingStates.add(key);
        } else {
            this.loadingStates.delete(key);
        }

        // Notify loading state change
        this.notifySubscribers('loadingState', {
            key,
            loading,
            hasLoading: this.loadingStates.size > 0
        });
    }

    /**
     * Check if any data is currently loading
     */
    isLoading() {
        return this.loadingStates.size > 0;
    }

    /**
     * Export data in various formats
     */
    exportData(format = 'json', dataType = 'complexChanges', filters = {}) {
        let data = this.data[dataType];
        
        if (dataType === 'complexChanges' && Object.keys(filters).length > 0) {
            data = this.searchComplexes('', filters);
        }

        switch (format) {
            case 'json':
                return JSON.stringify(data, null, 2);
            
            case 'csv':
                if (dataType === 'complexChanges') {
                    const headers = ['社區ID', '社區名稱', '縣市', '版本數', '最小值', '最大值', '絕對變化', '相對變化', '標準差'];
                    const rows = data.map(complex => [
                        complex.complex_id,
                        complex.complex_name,
                        complex.county,
                        complex.version_count,
                        complex.min_ratio.toFixed(4),
                        complex.max_ratio.toFixed(4),
                        complex.absolute_change.toFixed(4),
                        complex.relative_change.toFixed(4),
                        complex.std_dev.toFixed(4)
                    ]);
                    
                    return [headers, ...rows].map(row => row.join(',')).join('\n');
                }
                break;
        }

        return data;
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('Data cache cleared');
    }
}