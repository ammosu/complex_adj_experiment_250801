# Housing Complex Adjustment Rate Analysis Dashboard

A comprehensive system for analyzing housing complex adjustment rate changes across model versions (246-251) with an interactive web-based visualization dashboard.

## 📊 Overview

This system analyzes 196,733 records covering 33,208 Taiwan housing complexes across 6 model versions. It identifies communities with dramatic adjustment rate changes and provides multi-dimensional analysis through geographic, temporal, and statistical visualizations.

### Key Features

- **Volatility Analysis**: Identifies the top 1% most volatile housing complexes
- **Geographic Mapping**: Interactive Taiwan map showing regional volatility patterns  
- **Time Series Analysis**: Tracks adjustment rate changes across model versions
- **Statistical Insights**: Comprehensive statistical analysis with multiple chart types
- **Interactive Filtering**: Filter by county, threshold, version range, and search
- **Data Export**: Export filtered results to CSV format
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## 🏗️ Architecture

### Backend (Python 3.11+)
- **analyze_complex_changes.py**: Main analysis engine with CLI parameters
- **detailed_analysis.py**: Statistical deep-dive and county analysis
- **generate_dashboard_data.py**: Unified data export pipeline for frontend

### Frontend (Web Technologies)
- **HTML5/CSS3/JavaScript**: Modern responsive web interface
- **Bootstrap 5**: Professional UI framework
- **D3.js**: Interactive time series and advanced visualizations  
- **Chart.js**: Statistical charts and graphs
- **Leaflet.js**: Interactive Taiwan geographic mapping

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Create virtual environment with uv
uv venv

# Activate virtual environment
source .venv/bin/activate  # Linux/Mac
# or .venv\Scripts\activate  # Windows

# Install Python dependencies
uv pip install pandas numpy scipy matplotlib seaborn
```

### 2. Generate Dashboard Data

```bash
# Generate all visualization data
python generate_dashboard_data.py --verbose

# This creates:
# - dashboard/data/complex_changes.json (33,108 complex analysis results)
# - dashboard/data/county_stats.json (17 county statistics)
# - dashboard/data/version_trends.json (6 version trend analyses)
# - dashboard/data/taiwan_map.geojson (Taiwan geographic boundaries)
```

### 3. Launch Dashboard

```bash
# Start web server
cd dashboard
python -m http.server 8000

# Open browser to http://localhost:8000
```

## 📈 Key Findings

### Most Volatile Complexes
1. **友圓知築** (New Taipei): 71.28% relative change
2. **頤海大院社區** (New Taipei): 48.37% relative change  
3. **星都心** (Hsinchu): 38.84% relative change
4. **好萊塢大廈** (Taichung): 38.25% relative change
5. **龍寶拾穗臻邸(第二期)** (Taichung): 41.99% relative change

### System Stability
- **96.4%** of complexes are stable (standard deviation < 0.05)
- **331 complexes** (top 1%) show extreme volatility
- **Geographic concentration**: Hsinchu (22.1%), Taichung (15.4%), Kaohsiung (15.4%)
- **Version changes**: System-wide changes are minimal (< 0.01% between versions)

## 💻 Usage Guide

### Command Line Analysis

#### Basic Analysis
```bash
# Run main analysis
python analyze_complex_changes.py

# With JSON export
python analyze_complex_changes.py --output-format json

# Filter by region and threshold
python analyze_complex_changes.py --region 新竹 --threshold 0.2 --verbose
```

#### Detailed Analysis
```bash
# County and version analysis
python detailed_analysis.py --output-format both

# Regional focus with custom threshold
python detailed_analysis.py --region 台中 --threshold 0.05 --verbose
```

#### Available Parameters
- `--input`: Input CSV file path (default: complex_ids.csv)
- `--threshold`: Volatility threshold (default: 0.1)
- `--region`: Filter by specific county (optional)
- `--model-versions`: Version range (e.g., --model-versions 248 251)
- `--output-format`: Output format (console, json, both)
- `--output-dir`: JSON output directory (default: dashboard/data)
- `--verbose`: Show detailed logging

### Web Dashboard

#### Navigation Tabs
- **概覽分析**: Top volatile complexes, county distribution, scatter plots
- **地理分析**: Interactive Taiwan map with volatility markers
- **時間序列**: Model version trends and selected complex time series
- **統計分析**: Histograms, box plots, and heatmaps

#### Interactive Features
- **Filtering**: By county, threshold, version range, and complex name search
- **Chart Interactions**: Hover for details, click for selections
- **Data Export**: Download filtered results as CSV
- **Responsive**: Works on mobile devices

#### Filter Controls
- **County Multi-select**: Filter by specific counties
- **Threshold Slider**: Adjust volatility threshold (0.0 - 0.5)
- **Version Range**: Select model version comparison range
- **Search Box**: Find complexes by name or ID

## 📁 Project Structure

```
/
├── analyze_complex_changes.py      # Main analysis script
├── detailed_analysis.py           # Statistical analysis
├── generate_dashboard_data.py      # Data export pipeline
├── complex_ids.csv                 # Source data (196,733 records)
├── dashboard/                      # Web visualization
│   ├── index.html                 # Main dashboard page
│   ├── js/
│   │   ├── main.js               # Dashboard controller
│   │   ├── data-manager.js       # Data loading/filtering
│   │   ├── charts.js             # Chart implementations
│   │   └── map.js                # Geographic mapping
│   ├── css/
│   │   ├── styles.css            # General styling
│   │   └── dashboard.css         # Dashboard-specific styles
│   └── data/                     # Generated JSON data
│       ├── complex_changes.json  # Analysis results
│       ├── county_stats.json     # Geographic statistics  
│       ├── version_trends.json   # Temporal analysis
│       └── taiwan_map.geojson    # Geographic boundaries
├── tests/                        # Unit tests
├── CLAUDE.md                     # Claude Code guidance
├── INITIAL.md                    # Project specification
└── README.md                     # This file
```

## 🔍 Data Structure

### Source Data (`complex_ids.csv`)
- **name**: Complex ID (primary identifier)
- **ratio**: Adjustment rate
- **adj**: Primary adjustment rate (preferred over ratio)
- **count**: Complex count
- **std**: Standard deviation
- **county**: Geographic location (17 Taiwan counties)
- **model_version**: Model version (246-251)
- **complex_name**: Human-readable complex name

### Analysis Output
- **Absolute Change**: Maximum - minimum adjustment rate across versions
- **Relative Change**: Percentage change relative to minimum value
- **Standard Deviation**: Measure of volatility across versions
- **Version Count**: Number of model versions with data for each complex

## 🎯 Analysis Methodology

### Volatility Detection
1. **Data Grouping**: Group records by complex ID (`name` field)
2. **Rate Extraction**: Use `adj` field (preferred) or `ratio` field
3. **Change Calculation**: Compute absolute and relative changes across versions
4. **Stability Scoring**: Calculate standard deviation as volatility measure
5. **Threshold Filtering**: Identify complexes exceeding volatility thresholds

### Geographic Analysis
1. **County Aggregation**: Group complexes by geographic location
2. **Regional Statistics**: Calculate mean, median, range by county
3. **Hotspot Identification**: Identify counties with high volatility concentration
4. **Mapping**: Visualize geographic patterns on Taiwan map

### Temporal Analysis
1. **Version Comparison**: Track changes between model versions 246-251
2. **Trend Detection**: Identify systematic changes across versions
3. **Pattern Analysis**: Classify change patterns (increasing, decreasing, volatile)

## 🛠️ Advanced Usage

### Custom Data Export
```bash
# Export specific region data
python generate_dashboard_data.py --input custom_data.csv --output-dir custom_output

# Export with specific threshold
python detailed_analysis.py --threshold 0.15 --output-format json --output-dir exports
```

### Development Server
```bash
# For development with auto-reload (requires Node.js)
cd dashboard
npx serve . --port 8000

# Or use Python with specific binding
python -m http.server 8000 --bind 127.0.0.1
```

## 📊 Visualization Types

### Chart Types
- **Bar Charts**: Top volatile complexes, county comparisons
- **Line Charts**: Time series trends, version progression
- **Scatter Plots**: Absolute vs relative change relationships
- **Pie Charts**: County distribution, category breakdowns
- **Histograms**: Change distribution analysis
- **Box Plots**: Statistical distribution by region
- **Heatmaps**: County-version volatility patterns

### Map Features
- **Circle Markers**: Sized by volatility magnitude
- **Color Coding**: Red (high), orange (medium), green (low volatility)
- **Interactive Popups**: Detailed complex information
- **County Boundaries**: Administrative region overlay
- **Zoom/Pan**: Detailed regional exploration

## 🔧 Troubleshooting

### Common Issues

**Data Loading Errors**
```bash
# Ensure data files exist
ls -la dashboard/data/

# Regenerate if missing
python generate_dashboard_data.py --verbose
```

**Web Server Issues**
```bash
# Check if port is available
netstat -an | grep :8000

# Use alternative port
python -m http.server 8080
```

**Analysis Errors**
```bash
# Check data format
head -5 complex_ids.csv

# Validate with verbose logging
python analyze_complex_changes.py --verbose
```

### Performance Optimization
- Large datasets (>100k records): Use filtering to reduce data size
- Slow map rendering: Reduce marker count with clustering
- Memory issues: Process data in chunks using `--region` parameter

## 📋 Requirements

### System Requirements
- **Python**: 3.11 or higher
- **Memory**: 4GB RAM minimum (8GB recommended for large datasets)
- **Storage**: 1GB free space for data and exports
- **Browser**: Chrome, Firefox, Safari, or Edge (modern versions)

### Python Dependencies
- pandas (data manipulation)
- numpy (numerical operations)  
- scipy (statistical analysis)
- matplotlib, seaborn (optional: for additional visualizations)

### Web Dependencies (CDN-loaded)
- Bootstrap 5 (UI framework)
- D3.js v7+ (interactive visualizations)
- Chart.js v4+ (statistical charts)
- Leaflet.js v1.9+ (geographic mapping)

## 🤝 Contributing

This system is designed for housing market analysis and real estate research. For modifications:

1. **Backend**: Extend analysis scripts in the main directory
2. **Frontend**: Modify JavaScript files in `dashboard/js/`
3. **Styling**: Update CSS files in `dashboard/css/`
4. **Testing**: Add tests to the `tests/` directory

## 📄 License

This project is designed for housing market analysis and research purposes.

---

**Dashboard URL**: http://localhost:8000  
**Documentation**: See `CLAUDE.md` for development guidance  
**Analysis Results**: Available in `analysis_summary.txt`