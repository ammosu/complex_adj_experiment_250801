/**
 * Modern Map Manager - Interactive Taiwan map with housing complex data visualization
 */
class ModernMapManager {
    constructor(containerId, dataManager) {
        this.containerId = containerId;
        this.dataManager = dataManager;
        this.map = null;
        this.geoJsonLayer = null;
        this.currentMode = 'absolute'; // absolute, relative, stability
        this.countyData = new Map();
        this.colorScale = null;
    }

    /**
     * Initialize the map
     */
    async initialize() {
        try {
            console.log('Initializing Taiwan map...');
            
            // Wait for container to be ready
            const container = document.getElementById(this.containerId);
            if (!container) {
                throw new Error(`Map container ${this.containerId} not found`);
            }

            // Initialize Leaflet map
            this.initializeLeafletMap();
            
            // Load and process county data
            await this.processCountyData();
            
            // Load and display Taiwan GeoJSON
            await this.loadTaiwanGeoJSON();
            
            // Force initial color update for default mode
            setTimeout(() => {
                this.forceColorUpdate();
            }, 500);
            
            console.log('Taiwan map initialized successfully');
        } catch (error) {
            console.error('Error initializing map:', error);
            throw error;
        }
    }

    /**
     * Initialize Leaflet map
     */
    initializeLeafletMap() {
        try {
            // Check if Leaflet is loaded
            if (typeof L === 'undefined') {
                throw new Error('Leaflet library not loaded');
            }

            // Taiwan center coordinates
            const taiwanCenter = [23.8, 120.9];

            this.map = L.map(this.containerId, {
                center: taiwanCenter,
                zoom: 7,
                minZoom: 4,  // Allow zooming out more
                maxZoom: 12, // Allow zooming in more
                scrollWheelZoom: true,
                zoomControl: true
            });

            // Add tile layer with error handling
            const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 18,
                errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
            });

            tileLayer.on('tileerror', function(error) {
                console.warn('Tile loading error:', error);
            });

            tileLayer.addTo(this.map);

            // Add custom controls
            this.addMapControls();

            console.log('Map initialized successfully');
        } catch (error) {
            console.error('Failed to initialize map:', error);
            this.createMapErrorDisplay();
        }
    }

    /**
     * Create error display when map initialization fails
     */
    createMapErrorDisplay() {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.innerHTML = `
                <div class="d-flex align-items-center justify-content-center h-100 text-muted">
                    <div class="text-center">
                        <i class="fas fa-map fa-3x mb-3"></i>
                        <p>地圖載入失敗</p>
                        <small>請檢查網路連接或重新整理頁面</small>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Process county data for visualization
     */
    async processCountyData() {
        const complexes = this.dataManager.data.complexChanges;
        if (!complexes || complexes.length === 0) {
            console.warn('No complex data available for map');
            return;
        }

        console.log('Processing county data for', complexes.length, 'complexes');

        // Group data by county
        const countyGroups = new Map();
        
        complexes.forEach(complex => {
            const county = complex.county;
            if (!countyGroups.has(county)) {
                countyGroups.set(county, []);
            }
            countyGroups.get(county).push(complex);
        });

        console.log('Found counties in data:', Array.from(countyGroups.keys()));

        // Calculate county statistics
        countyGroups.forEach((complexes, county) => {
            const volatilities = complexes.map(c => Math.abs(c.relative_change));
            const absoluteChanges = complexes.map(c => c.absolute_change);
            const stdDevs = complexes.map(c => c.std_dev);
            const stableCount = complexes.filter(c => c.stabilityCategory === 'stable').length;

            this.countyData.set(county, {
                county,
                complexCount: complexes.length,
                averageVolatility: volatilities.reduce((sum, v) => sum + v, 0) / volatilities.length,
                maxVolatility: Math.max(...volatilities),
                averageAbsoluteChange: absoluteChanges.reduce((sum, v) => sum + v, 0) / absoluteChanges.length,
                averageStdDev: stdDevs.reduce((sum, v) => sum + v, 0) / stdDevs.length,
                stabilityRatio: stableCount / complexes.length,
                topVolatileComplex: complexes.reduce((max, current) => 
                    Math.abs(current.relative_change) > Math.abs(max.relative_change) ? current : max
                )
            });
        });

        console.log('Processed county statistics for:', Array.from(this.countyData.keys()));

        // Update color scales
        this.updateColorScale();
    }

    /**
     * Preprocess GeoJSON to merge subdivisions into counties
     */
    preprocessGeoJSON(geoJSON) {
        console.log('Preprocessing GeoJSON to merge county subdivisions...');
        
        // Group features by county name
        const countyGroups = new Map();
        
        geoJSON.features.forEach(feature => {
            const countyName = feature.properties.COUNTYNAME;
            if (!countyGroups.has(countyName)) {
                countyGroups.set(countyName, []);
            }
            countyGroups.get(countyName).push(feature);
        });
        
        console.log(`Found ${countyGroups.size} unique counties in GeoJSON`);
        console.log('Counties found:', Array.from(countyGroups.keys()));
        
        // Create new features by merging geometries for each county
        const mergedFeatures = [];
        
        countyGroups.forEach((features, countyName) => {
            if (features.length === 1) {
                // Single feature, use as-is
                mergedFeatures.push(features[0]);
            } else {
                // Multiple features, combine into MultiPolygon
                console.log(`Merging ${features.length} subdivisions for ${countyName}`);
                
                const allCoordinates = [];
                features.forEach(feature => {
                    if (feature.geometry.type === 'Polygon') {
                        allCoordinates.push(feature.geometry.coordinates);
                    } else if (feature.geometry.type === 'MultiPolygon') {
                        allCoordinates.push(...feature.geometry.coordinates);
                    }
                });
                
                const mergedFeature = {
                    type: 'Feature',
                    properties: {
                        COUNTYNAME: countyName,
                        COUNTYSN: features[0].properties.COUNTYSN // Use first one's ID
                    },
                    geometry: {
                        type: 'MultiPolygon',
                        coordinates: allCoordinates
                    }
                };
                
                mergedFeatures.push(mergedFeature);
            }
        });
        
        console.log(`Created ${mergedFeatures.length} merged county features`);
        
        return {
            type: 'FeatureCollection',
            features: mergedFeatures
        };
    }

    /**
     * Load Taiwan GeoJSON and create map layer
     */
    async loadTaiwanGeoJSON() {
        try {
            console.log('Starting Taiwan GeoJSON loading process...');
            
            // Try to load from existing data first
            let taiwanGeoJSON = this.dataManager.data.taiwanMap;
            
            // If not available, try to load from local file
            if (!taiwanGeoJSON) {
                console.log('Loading Taiwan GeoJSON from local file...');
                try {
                    const response = await fetch('data/twCounty2010.geojson');
                    if (response.ok) {
                        taiwanGeoJSON = await response.json();
                        console.log('Successfully loaded Taiwan GeoJSON with', taiwanGeoJSON.features?.length, 'features');
                        
                        // Log first few county names for debugging
                        if (taiwanGeoJSON.features && taiwanGeoJSON.features.length > 0) {
                            const sampleCounty = taiwanGeoJSON.features[0].properties;
                            console.log('Sample county properties:', sampleCounty);
                        }
                    } else {
                        throw new Error(`Failed to fetch GeoJSON file: ${response.status} ${response.statusText}`);
                    }
                } catch (fetchError) {
                    console.warn('Could not load Taiwan GeoJSON:', fetchError);
                    this.createFallbackDisplay();
                    return;
                }
            }

            // Validate GeoJSON structure
            if (!taiwanGeoJSON || !taiwanGeoJSON.features || taiwanGeoJSON.features.length === 0) {
                throw new Error('Invalid or empty GeoJSON data');
            }

            console.log('Creating Leaflet GeoJSON layer...');
            
            // Process the GeoJSON to group by county first
            const processedGeoJSON = this.preprocessGeoJSON(taiwanGeoJSON);
            
            // Create GeoJSON layer with debug logging
            this.geoJsonLayer = L.geoJSON(processedGeoJSON, {
                style: (feature) => {
                    const style = this.getFeatureStyle(feature);
                    console.log(`Applying style to ${feature.properties.COUNTYNAME}:`, style);
                    return style;
                },
                onEachFeature: (feature, layer) => {
                    // Debug: log the actual geometry type
                    console.log(`✓ Processing feature for county: ${feature.properties.COUNTYNAME}, geometry type: ${feature.geometry.type}`);
                    if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
                        const coordCount = feature.geometry.type === 'Polygon' 
                            ? feature.geometry.coordinates[0].length 
                            : feature.geometry.coordinates.reduce((sum, poly) => sum + poly[0].length, 0);
                        console.log(`${feature.geometry.type} has ${coordCount} coordinate points`);
                    }
                    this.onEachFeature(feature, layer);
                }
            });
            
            if (!this.geoJsonLayer) {
                throw new Error('Failed to create GeoJSON layer');
            }
            
            this.geoJsonLayer.addTo(this.map);
            console.log('GeoJSON layer added to map successfully');

            // Fit map to bounds
            const bounds = this.geoJsonLayer.getBounds();
            if (bounds.isValid()) {
                this.map.fitBounds(bounds, { padding: [20, 20] });
                console.log('Map fitted to GeoJSON bounds');
            } else {
                console.warn('Invalid bounds from GeoJSON layer');
            }

        } catch (error) {
            console.error('Error loading Taiwan GeoJSON:', error);
            this.createFallbackDisplay();
        }
    }

    /**
     * Get style for each county feature
     */
    getFeatureStyle(feature) {
        const countyName = this.getCountyName(feature);
        const countyStats = this.countyData.get(countyName);
        
        let fillColor = '#cccccc'; // Default gray
        let fillOpacity = 0.3;

        if (countyStats) {
            const value = this.getCurrentModeValue(countyStats);
            fillColor = this.getColorForValue(value);
            fillOpacity = 0.7;
            console.log(`✓ Styling county ${countyName} with color ${fillColor}, value: ${value.toFixed(3)}`);
        } else {
            console.log(`✗ No data found for county: ${countyName}, using default gray styling`);
        }

        return {
            fillColor,
            weight: 2,
            opacity: 1,
            color: '#333333',
            fillOpacity
        };
    }

    /**
     * Get county name from GeoJSON feature
     */
    getCountyName(feature) {
        // Try different possible property names for county
        const props = feature.properties;
        let countyName = props.COUNTYNAME || props.county || props.name || props.NAME || 'Unknown';
        
        // Mapping from GeoJSON county names to data county names
        const countyMapping = {
            '台北市': '台北',
            '台北縣': '新北',
            '新北市': '新北', 
            '桃園縣': '桃園',
            '桃園市': '桃園',
            '新竹縣': '新竹',
            '新竹市': '新竹',
            '苗栗縣': '苗栗',
            '台中縣': '台中',
            '台中市': '台中',
            '彰化縣': '彰化',
            '南投縣': '南投',
            '雲林縣': '雲林',
            '嘉義縣': '嘉義',
            '嘉義市': '嘉義',
            '台南縣': '台南',
            '台南市': '台南',
            '高雄縣': '高雄',
            '高雄市': '高雄',
            '屏東縣': '屏東',
            '宜蘭縣': '宜蘭',
            '花蓮縣': '花蓮',
            '台東縣': '台東',
            '澎湖縣': '澎湖',
            '基隆市': '基隆',
            '金門縣': '金門',
            '連江縣': '連江'
        };
        
        // Use mapping or fallback to cleaned name
        const mappedName = countyMapping[countyName] || countyName.replace(/[縣市]$/, '');
        
        // Debug logging to help troubleshoot mapping issues
        if (countyName !== 'Unknown') {
            console.log(`GeoJSON county: "${countyName}" -> Mapped to: "${mappedName}"`);
        }
        
        return mappedName;
    }

    /**
     * Create fallback display when GeoJSON fails
     */
    createFallbackDisplay() {
        console.error('🚨 FALLBACK DISPLAY TRIGGERED - GeoJSON failed to load properly!');
        console.log('Creating fallback map display...');
        
        // Remove any existing layers
        if (this.geoJsonLayer) {
            this.map.removeLayer(this.geoJsonLayer);
        }
        
        // Create simplified Taiwan outline
        const taiwanBounds = [[21.5, 119.3], [26.4, 122.0]];
        const simpleTaiwanRect = L.rectangle(taiwanBounds, {
            color: '#666666',
            weight: 2,
            fillColor: '#e6f3ff',
            fillOpacity: 0.3
        }).addTo(this.map);
        
        // Add county markers based on approximate locations
        const countyLocations = {
            '台北': [25.0330, 121.5654],
            '新北': [25.0176, 121.5332],
            '桃園': [24.9937, 121.3010],
            '台中': [24.1477, 120.6736],
            '台南': [22.9999, 120.2269],
            '高雄': [22.6273, 120.3014],
            '新竹': [24.8138, 120.9674],
            '苗栗': [24.5602, 120.8214],
            '彰化': [24.0518, 120.5161],
            '南投': [23.9609, 120.9718],
            '雲林': [23.7093, 120.4313],
            '嘉義': [23.4801, 120.4491],
            '屏東': [22.5519, 120.5487],
            '宜蘭': [24.7021, 121.7377],
            '花蓮': [23.9871, 121.6015],
            '台東': [22.7972, 121.1713],
            '澎湖': [23.5709, 119.5793],
            '基隆': [25.1276, 121.7391],
            '金門': [24.4495, 118.3773],
            '連江': [26.1605, 119.9290]
        };
        
        // Add markers for counties with data
        this.countyData.forEach((stats, county) => {
            const location = countyLocations[county];
            if (location) {
                const value = this.getCurrentModeValue(stats);
                const color = this.getColorForValue(value);
                
                const marker = L.circleMarker(location, {
                    radius: Math.max(8, Math.min(20, stats.complexCount / 200)),
                    fillColor: color,
                    color: '#666666',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                }).addTo(this.map);
                
                // Add popup
                marker.bindPopup(`
                    <div class="map-popup">
                        <h6>${county}</h6>
                        <div class="popup-stats">
                            <div class="popup-stat">
                                <span class="popup-stat-label">社區數量:</span>
                                <span class="popup-stat-value">${stats.complexCount}</span>
                            </div>
                            <div class="popup-stat">
                                <span class="popup-stat-label">平均波動:</span>
                                <span class="popup-stat-value">${(stats.averageVolatility * 100).toFixed(1)}%</span>
                            </div>
                            <div class="popup-stat">
                                <span class="popup-stat-label">穩定比例:</span>
                                <span class="popup-stat-value">${(stats.stabilityRatio * 100).toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>
                `);
            }
        });
        
        // Fit map to Taiwan bounds
        this.map.fitBounds(taiwanBounds, { padding: [20, 20] });
        
        console.log('Fallback map display created');
    }

    /**
     * Get current mode value for coloring
     */
    getCurrentModeValue(countyStats) {
        switch (this.currentMode) {
            case 'absolute':
                return countyStats.averageAbsoluteChange;
            case 'relative':
                return countyStats.averageVolatility;
            case 'stability':
                return 1 - countyStats.stabilityRatio; // Invert so unstable areas are "hotter"
            default:
                return 0;
        }
    }

    /**
     * Get color for value based on current scale
     */
    getColorForValue(value) {
        if (!this.colorScale || value === undefined || value === null) {
            return '#cccccc';
        }

        const { min, max } = this.colorScale;
        const normalizedValue = Math.max(0, Math.min(1, (value - min) / (max - min)));
        
        // Color gradient from blue (low) to red (high)
        const colors = [
            '#f7fbff', // Very light blue
            '#deebf7', // Light blue
            '#c6dbef', // Medium light blue
            '#9ecae1', // Medium blue
            '#6baed6', // Blue
            '#4292c6', // Medium dark blue
            '#2171b5', // Dark blue
            '#08519c', // Very dark blue
            '#08306b'  // Darkest blue
        ];

        // For high volatility, use red scale
        if (normalizedValue > 0.7) {
            const redColors = ['#fee5d9', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#99000d'];
            const redIndex = Math.floor((normalizedValue - 0.7) / 0.3 * (redColors.length - 1));
            return redColors[Math.min(redIndex, redColors.length - 1)];
        }

        const colorIndex = Math.floor(normalizedValue * (colors.length - 1));
        return colors[Math.min(colorIndex, colors.length - 1)];
    }

    /**
     * Update color scale based on current mode
     */
    updateColorScale() {
        if (this.countyData.size === 0) return;

        const values = Array.from(this.countyData.values()).map(stats => this.getCurrentModeValue(stats));
        const validValues = values.filter(v => v !== undefined && v !== null && !isNaN(v));
        
        if (validValues.length > 0) {
            this.colorScale = {
                min: Math.min(...validValues),
                max: Math.max(...validValues)
            };
            console.log(`Color scale updated for mode ${this.currentMode}:`, this.colorScale);
        } else {
            console.warn('No valid values found for color scale update');
        }
    }

    /**
     * Handle feature interactions
     */
    onEachFeature(feature, layer) {
        const countyName = this.getCountyName(feature);
        const countyStats = this.countyData.get(countyName);

        // Create popup content
        let popupContent = `<div class="map-popup"><h6>${countyName}</h6>`;
        
        if (countyStats) {
            popupContent += `
                <div class="popup-stats">
                    <div class="popup-stat">
                        <span class="popup-stat-label">社區數量:</span>
                        <span class="popup-stat-value">${countyStats.complexCount}</span>
                    </div>
                    <div class="popup-stat">
                        <span class="popup-stat-label">平均波動:</span>
                        <span class="popup-stat-value">${(countyStats.averageVolatility * 100).toFixed(1)}%</span>
                    </div>
                    <div class="popup-stat">
                        <span class="popup-stat-label">穩定比例:</span>
                        <span class="popup-stat-value">${(countyStats.stabilityRatio * 100).toFixed(1)}%</span>
                    </div>
                    <div class="popup-stat">
                        <span class="popup-stat-label">最大波動社區:</span>
                        <span class="popup-stat-value">${countyStats.topVolatileComplex.complex_name}</span>
                    </div>
                </div>
                <button class="btn btn-sm btn-primary mt-2" onclick="dashboard.filterByCounty('${countyName}')">
                    查看詳情
                </button>
            `;
        } else {
            popupContent += '<p class="text-muted">暫無數據</p>';
        }
        
        popupContent += '</div>';

        // Bind popup
        layer.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'custom-popup'
        });

        // Add hover effects
        layer.on({
            mouseover: (e) => {
                const layer = e.target;
                layer.setStyle({
                    weight: 3,
                    color: '#333333',
                    fillOpacity: 0.9
                });
                layer.bringToFront();
            },
            mouseout: (e) => {
                this.geoJsonLayer.resetStyle(e.target);
            },
            click: (e) => {
                // 只放大到縣市範圍，不自動跳轉到搜尋頁面
                this.map.fitBounds(e.target.getBounds());
                // 顯示彈出視窗讓用戶選擇是否查看詳情
                e.target.openPopup();
            }
        });
    }

    /**
     * Set display mode (absolute, relative, stability)
     */
    setDisplayMode(mode) {
        console.log(`Setting display mode to: ${mode}`);
        if (this.currentMode === mode) return;
        
        this.currentMode = mode;
        this.updateColorScale();
        
        if (this.geoJsonLayer) {
            this.geoJsonLayer.setStyle((feature) => this.getFeatureStyle(feature));
        }

        // Update legend
        this.updateLegend();
    }
    
    /**
     * Force color update for initial load
     */
    forceColorUpdate() {
        console.log('Force updating colors for initial load...');
        this.updateColorScale();
        
        if (this.geoJsonLayer) {
            this.geoJsonLayer.setStyle((feature) => this.getFeatureStyle(feature));
        }
        
        this.updateLegend();
    }

    /**
     * Add map controls
     */
    addMapControls() {
        // Add legend control
        const legend = L.control({ position: 'bottomright' });
        
        legend.onAdd = () => {
            const div = L.DomUtil.create('div', 'map-legend');
            this.updateLegendContent(div);
            return div;
        };
        
        legend.addTo(this.map);
        this.legendControl = legend;

        // Add "回到台灣" button control
        const homeControl = L.control({ position: 'topleft' });
        
        homeControl.onAdd = () => {
            const div = L.DomUtil.create('div', 'map-home-control');
            div.innerHTML = `
                <button class="map-home-btn" title="回到台灣視圖">
                    <i class="fas fa-home"></i>
                </button>
            `;
            
            // Prevent map events when clicking the button
            L.DomEvent.disableClickPropagation(div);
            
            // Add click handler
            div.querySelector('.map-home-btn').addEventListener('click', () => {
                this.returnToTaiwan();
            });
            
            return div;
        };
        
        homeControl.addTo(this.map);

        // Add info control
        const info = L.control({ position: 'topright' });
        
        info.onAdd = () => {
            const div = L.DomUtil.create('div', 'map-info');
            div.innerHTML = `
                <div class="map-info-content">
                    <h6>社區調整率分析實驗</h6>
                    <p class="text-muted small">點擊縣市查看詳細資訊</p>
                </div>
            `;
            return div;
        };
        
        info.addTo(this.map);
    }
    
    /**
     * Return map view to Taiwan
     */
    returnToTaiwan() {
        const taiwanCenter = [23.8, 120.9];
        this.map.setView(taiwanCenter, 7);
        
        // If geoJsonLayer exists, fit to its bounds
        if (this.geoJsonLayer) {
            const bounds = this.geoJsonLayer.getBounds();
            if (bounds.isValid()) {
                this.map.fitBounds(bounds, { padding: [20, 20] });
            }
        }
    }

    /**
     * Update legend content
     */
    updateLegendContent(div) {
        if (!this.colorScale) {
            console.warn('No color scale available for legend update');
            return;
        }

        const { min, max } = this.colorScale;
        const modeLabels = {
            'absolute': '絕對變化',
            'relative': '相對變化 (%)',
            'stability': '不穩定度'
        };
        
        // Format values based on mode
        let minFormatted, maxFormatted;
        if (this.currentMode === 'relative') {
            minFormatted = (min * 100).toFixed(1) + '%';
            maxFormatted = (max * 100).toFixed(1) + '%';
        } else {
            minFormatted = min.toFixed(3);
            maxFormatted = max.toFixed(3);
        }

        div.innerHTML = `
            <div class="legend-title">${modeLabels[this.currentMode] || '數值'}</div>
            <div class="legend-scale">
                <div class="legend-color-bar"></div>
                <div class="legend-labels">
                    <span class="legend-min">${minFormatted}</span>
                    <span class="legend-max">${maxFormatted}</span>
                </div>
            </div>
        `;
    }

    /**
     * Update legend
     */
    updateLegend() {
        if (this.legendControl && this.legendControl.getContainer()) {
            this.updateLegendContent(this.legendControl.getContainer());
        }
    }

    /**
     * Highlight specific counties
     */
    highlightCounties(countyNames) {
        if (!this.geoJsonLayer) return;

        this.geoJsonLayer.eachLayer(layer => {
            const countyName = this.getCountyName(layer.feature);
            if (countyNames.includes(countyName)) {
                layer.setStyle({
                    weight: 4,
                    color: '#ff6b6b',
                    fillOpacity: 0.9
                });
            } else {
                this.geoJsonLayer.resetStyle(layer);
            }
        });
    }

    /**
     * Reset all highlights
     */
    resetHighlights() {
        if (this.geoJsonLayer) {
            this.geoJsonLayer.setStyle((feature) => this.getFeatureStyle(feature));
        }
    }

    /**
     * Get map bounds
     */
    getBounds() {
        return this.geoJsonLayer ? this.geoJsonLayer.getBounds() : null;
    }

    /**
     * Resize map (call after container size changes)
     */
    resize() {
        if (this.map) {
            setTimeout(() => {
                this.map.invalidateSize();
            }, 100);
        }
    }
}

// Add custom CSS for map components
const mapStyles = `
<style>
.map-popup {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

.popup-stats {
    margin: 10px 0;
}

.popup-stat {
    display: flex;
    justify-content: space-between;
    margin: 5px 0;
    font-size: 0.9em;
}

.popup-stat-label {
    color: #666;
}

.popup-stat-value {
    font-weight: 600;
    color: #333;
}

.map-legend {
    background: white;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    font-size: 0.85em;
    min-width: 180px;
    max-width: 220px;
}

.legend-title {
    font-weight: 600;
    margin-bottom: 10px;
    color: #333;
    text-align: center;
    font-size: 0.9em;
}

.legend-color-bar {
    height: 12px;
    background: linear-gradient(to right, #f7fbff, #08306b, #99000d);
    border-radius: 6px;
    margin-bottom: 8px;
    border: 1px solid rgba(0,0,0,0.1);
}

.legend-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.75em;
    color: #666;
    line-height: 1.2;
}

.legend-labels .legend-min,
.legend-labels .legend-max {
    background: rgba(255,255,255,0.9);
    padding: 2px 4px;
    border-radius: 3px;
    font-weight: 500;
    border: 1px solid rgba(0,0,0,0.08);
    white-space: nowrap;
}

.map-info {
    background: white;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    max-width: 200px;
}

.map-info-content h6 {
    margin: 0 0 5px 0;
    color: #333;
    font-size: 0.9em;
}

.custom-popup .leaflet-popup-content-wrapper {
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}

.custom-popup .leaflet-popup-tip {
    background: white;
}

.map-home-control {
    margin: 10px 10px;
}

.map-home-btn {
    background: white;
    border: 1px solid rgba(0,0,0,0.2);
    border-radius: 6px;
    padding: 8px 10px;
    font-size: 16px;
    color: #333;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
}

.map-home-btn:hover {
    background: #f8f9fa;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    color: #0d6efd;
    transform: translateY(-1px);
}

.map-home-btn:active {
    transform: translateY(0px);
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}
</style>
`;

// Inject styles
if (!document.getElementById('map-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'map-styles';
    styleElement.innerHTML = mapStyles;
    document.head.appendChild(styleElement);
}