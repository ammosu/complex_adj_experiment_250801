# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a housing complex adjustment rate analysis system that analyzes volatility in property adjustment rates across 6 model versions (246-251) covering 33,208 Taiwan housing complexes. The system identifies complexes with dramatic rate changes and provides both Python-based analysis and web-based visualization.

## Key Data Architecture

### Primary Dataset
- **Source**: `complex_ids.csv` (196,733 records)
- **Key identifier**: `name` field (complex ID)
- **Primary metric**: `adj` field (preferred over `ratio`)
- **Geographic**: `county` field for regional analysis
- **Temporal**: `model_version` field (246-251)

### Data Processing Pattern
All Python scripts follow this data loading pattern:
```python
def load_data(filename):
    # Convert string fields to appropriate types
    # Handle missing values gracefully
    # Skip invalid records
```

The `adj` field is preferred over `ratio` when both are present. Missing values are common and must be handled with null checks.

## Core Analysis Architecture

### Two-Layer Analysis System
1. **Basic Analysis** (`analyze_complex_changes.py`): Identifies volatile complexes, calculates absolute/relative changes
2. **Detailed Analysis** (`detailed_analysis.py`): Provides county-level statistics, stability analysis, trend analysis

### Change Detection Logic
- **Absolute Change**: `max_ratio - min_ratio` across versions
- **Relative Change**: `(max_ratio - min_ratio) / min_ratio`
- **Stability Threshold**: Standard deviation < 0.05 considered stable
- **Extreme Volatility**: Top 1% of complexes by change magnitude

### Key Findings (Built into Analysis)
- 96.4% of complexes are stable (std dev < 0.05)
- Geographic concentration of volatility: Hsinchu (22.1%), Taichung (15.4%), Kaohsiung (15.4%)
- Top volatile complex: 友圓知築 (71.28% relative change)

## Development Commands

### Environment Setup
```bash
# Use uv for dependency management (Python 3.11+)
uv venv
source .venv/bin/activate  # Linux/Mac
uv pip install pandas numpy scipy matplotlib seaborn jupyter
```

### Analysis Execution
```bash
# Basic analysis (identifies top volatile complexes)
python analyze_complex_changes.py

# Detailed analysis with county breakdowns
python detailed_analysis.py

# With parameters (when implemented)
python detailed_analysis.py --threshold 0.1 --region 新竹
```

### Dashboard Development (Planned)
```bash
# Generate JSON data for frontend
python generate_dashboard_data.py

# Start web server
cd dashboard
python -m http.server 8000
```

## Planned Architecture (from PRP)

### Backend Extensions
- `generate_dashboard_data.py`: Export analysis results to JSON for web consumption
- Enhanced CLI with `--threshold`, `--region`, `--model_versions` parameters
- JSON exports: `complex_changes.json`, `county_stats.json`, `version_trends.json`

### Frontend Dashboard Structure
```
dashboard/
├── index.html              # Bootstrap 5 responsive layout
├── js/
│   ├── main.js            # DashboardController class
│   ├── charts.js          # D3.js/Chart.js implementations
│   ├── map.js             # Leaflet.js Taiwan mapping
│   └── data-manager.js    # Data loading/filtering
├── css/                   # Custom styling
├── data/                  # Generated JSON files
└── lib/                   # External libraries (D3, Chart.js, Leaflet)
```

### Visualization Requirements
- **Time Series**: Complex adjustment rates over model versions (D3.js)
- **Geographic**: Taiwan map with volatility heatmap (Leaflet.js)
- **Statistical**: Distribution charts, scatter plots (Chart.js)
- **Interactive**: Cross-chart selection, filtering, brushing

## Data Quality Considerations

### Known Data Issues
- Missing values in `ratio`, `adj`, `std` fields are common
- Some complexes have data for only single model versions (excluded from change analysis)
- Complex names contain Chinese characters requiring UTF-8 encoding

### Validation Patterns
- Always check for null values before mathematical operations
- Use `complex_id` grouping to aggregate across model versions
- Minimum 2 model versions required for change calculation
- Standard deviation calculation requires len(values) > 1

## Analysis Patterns

### Complex Grouping
```python
complex_data = defaultdict(list)
for row in data:
    complex_data[row['name']].append(row)
```

### Change Calculation Template
```python
# Sort by model version first
records.sort(key=lambda x: x['model_version'])

# Extract preferred adjustment rate
ratios = []
for record in records:
    ratio = record['adj'] if record['adj'] is not None else record['ratio']
    if ratio is not None:
        ratios.append(ratio)
```

### Geographic Analysis Pattern
County-level aggregation is critical for regional volatility assessment. Use `county` field for grouping and statistical analysis.

## Important Constants

- **Stability Threshold**: 0.05 (standard deviation)
- **Model Version Range**: 246-251
- **Total Expected Complexes**: ~33,000
- **Expected Data Volume**: ~200k records
- **Encoding**: UTF-8 for Chinese characters

## Technology Stack

### Current (Python)
- Python 3.11+ with uv package manager
- pandas, numpy, scipy for analysis
- CSV-based data processing
- UTF-8 text output

### Planned (Web Dashboard)
- Frontend: HTML5/CSS3/JavaScript (ES6+)
- Charting: D3.js v7+ (interactive), Chart.js v4+ (rapid)
- Mapping: Leaflet.js v1.9+ for Taiwan geographic visualization
- Layout: Bootstrap 5 responsive framework
- No build process required (pure web technologies)

## Critical Analysis Insights

The analysis reveals that while 96.4% of housing complexes maintain stable adjustment rates across model versions, a small subset (331 complexes, 1%) shows extreme volatility. This volatility is geographically concentrated in specific regions and follows distinct temporal patterns that must be preserved in any dashboard implementation.

The two-tier analysis system (basic + detailed) allows for both high-level overview and deep-dive investigation, which should be maintained in future development.

## Serena Coding Tool Guidelines

When working with this codebase, Claude should use Serena's semantic coding tools for efficient code analysis and editing:

### Code Reading Strategy
- **Avoid reading entire files** unless absolutely necessary
- Use `get_symbols_overview` to understand file structure before detailed reading
- Use `find_symbol` with targeted `name_path` parameters for specific code elements
- Only use `include_body=True` when you need to see implementation details
- Prefer symbolic tools over full file reads for token efficiency

### Symbol-Based Analysis
- Symbols are identified by `name_path` (symbol hierarchy) and `relative_path` (file location)
- Use `find_symbol` with `depth=1` to see class methods without reading bodies
- Use `find_referencing_symbols` to understand code relationships and dependencies
- Search patterns: `/class/method` (absolute), `class/method` (relative), `method` (any parent)

### Code Editing Approaches
1. **Symbol-based editing**: Use `replace_symbol_body`, `insert_after_symbol`, `insert_before_symbol`
   - Best for replacing entire functions, classes, or methods
   - Automatically handles indentation and formatting

2. **Regex-based editing**: Use `replace_regex` with wildcards
   - Best for small changes within symbols (few lines)
   - Use `.*?` for non-greedy matching in larger replacements
   - Always escape special regex characters appropriately
   - Manually handle indentation when inserting code

### Search and Discovery
- Use `search_for_pattern` for flexible content search across files
- Use `list_dir` and `find_file` for basic repository navigation
- Restrict searches with `relative_path` and file type filters when possible
- Use `substring_matching=True` in `find_symbol` for partial name matches

### Memory Usage
- Read available memories with `list_memories` before starting complex tasks
- Use relevant memories to understand codebase architecture and patterns
- Write important discoveries to memory for future reference

### Interactive Mode Guidelines
- Break complex tasks into smaller steps
- Ask for clarification when requirements are ambiguous
- Present options when multiple approaches are viable
- Provide informative progress updates during multi-step operations

These guidelines ensure efficient, targeted code analysis and editing while minimizing token usage and maximizing precision.