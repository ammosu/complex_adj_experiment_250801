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
        // Taiwan center coordinates
        const taiwanCenter = [23.8, 120.9];
        const taiwanBounds = [[21.5, 119.3], [26.4, 122.0]];

        this.map = L.map(this.containerId, {
            center: taiwanCenter,
            zoom: 7,
            minZoom: 6,
            maxZoom: 10,
            maxBounds: taiwanBounds,
            scrollWheelZoom: true,
            zoomControl: true
        });

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(this.map);

        // Add custom controls
        this.addMapControls();
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

        // Group data by county
        const countyGroups = new Map();
        
        complexes.forEach(complex => {
            const county = complex.county;
            if (!countyGroups.has(county)) {
                countyGroups.set(county, []);
            }
            countyGroups.get(county).push(complex);
        });

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

        // Update color scales
        this.updateColorScale();
    }

    /**
     * Load Taiwan GeoJSON and create map layer
     */
    async loadTaiwanGeoJSON() {
        try {
            const taiwanGeoJSON = this.dataManager.data.taiwanMap;
            if (!taiwanGeoJSON) {
                console.warn('Taiwan GeoJSON data not available');
                return;
            }

            // Create GeoJSON layer
            this.geoJsonLayer = L.geoJSON(taiwanGeoJSON, {
                style: (feature) => this.getFeatureStyle(feature),
                onEachFeature: (feature, layer) => this.onEachFeature(feature, layer)
            }).addTo(this.map);

            // Fit map to bounds
            this.map.fitBounds(this.geoJsonLayer.getBounds(), { padding: [20, 20] });

        } catch (error) {
            console.error('Error loading Taiwan GeoJSON:', error);
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
        }

        return {
            fillColor,
            weight: 1,
            opacity: 0.8,
            color: '#666666',
            fillOpacity
        };
    }

    /**
     * Get county name from GeoJSON feature
     */
    getCountyName(feature) {
        // Try different possible property names for county
        const props = feature.properties;
        return props.COUNTYNAME || props.county || props.name || props.NAME || 'Unknown';
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
                this.map.fitBounds(e.target.getBounds());
                if (window.dashboard) {
                    window.dashboard.filterByCounty(countyName);
                }
            }
        });
    }

    /**
     * Set display mode (absolute, relative, stability)
     */
    setDisplayMode(mode) {
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

        // Add info control
        const info = L.control({ position: 'topright' });
        
        info.onAdd = () => {
            const div = L.DomUtil.create('div', 'map-info');
            div.innerHTML = `
                <div class="map-info-content">
                    <h6>台灣住宅社區調整率分析</h6>
                    <p class="text-muted small">點擊縣市查看詳細資訊</p>
                </div>
            `;
            return div;
        };
        
        info.addTo(this.map);
    }

    /**
     * Update legend content
     */
    updateLegendContent(div) {
        if (!this.colorScale) return;

        const { min, max } = this.colorScale;
        const modeLabels = {
            'absolute': '絕對變化',
            'relative': '相對變化 (%)',
            'stability': '不穩定度'
        };

        div.innerHTML = `
            <div class="legend-title">${modeLabels[this.currentMode] || '數值'}</div>
            <div class="legend-scale">
                <div class="legend-color-bar"></div>
                <div class="legend-labels">
                    <span>${min.toFixed(3)}</span>
                    <span>${max.toFixed(3)}</span>
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
}

.legend-title {
    font-weight: 600;
    margin-bottom: 8px;
    color: #333;
}

.legend-color-bar {
    height: 10px;
    background: linear-gradient(to right, #f7fbff, #08306b, #99000d);
    border-radius: 5px;
    margin-bottom: 5px;
}

.legend-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.8em;
    color: #666;
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
</style>
`;

// Inject styles
if (!document.getElementById('map-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'map-styles';
    styleElement.innerHTML = mapStyles;
    document.head.appendChild(styleElement);
}