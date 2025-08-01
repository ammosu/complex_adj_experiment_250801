#!/usr/bin/env python3
"""
主要資料匯出管道 - 協調分析結果並匯出所有前端需要的JSON檔案
"""

import csv
import json
import argparse
import logging
import sys
from collections import defaultdict
import statistics
from pathlib import Path

def load_data(filename):
    """載入CSV資料"""
    data = []
    with open(filename, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # 轉換數值欄位
            try:
                row['ratio'] = float(row['ratio']) if row['ratio'] else None
                row['adj'] = float(row['adj']) if row['adj'] else None
                row['count'] = int(row['count']) if row['count'] else None
                row['std'] = float(row['std']) if row['std'] else None
                row['model_version'] = int(row['model_version'])
            except (ValueError, TypeError):
                continue
            data.append(row)
    return data

def analyze_complex_changes(data):
    """分析社區調整率變化 - 核心分析邏輯"""
    complex_data = defaultdict(list)
    
    for row in data:
        complex_id = row['name']
        complex_data[complex_id].append(row)
    
    complex_changes = []
    
    for complex_id, records in complex_data.items():
        if len(records) < 2:  # 需要至少2個版本才能計算變化
            continue
            
        # 按版本排序
        records.sort(key=lambda x: x['model_version'])
        
        # 提取調整率資料 (優先使用adj，其次ratio)
        version_ratios = []
        for record in records:
            ratio = record['adj'] if record['adj'] is not None else record['ratio']
            if ratio is not None:
                version_ratios.append({
                    'version': record['model_version'],
                    'ratio': ratio,
                    'complex_name': record['complex_name'],
                    'county': record['county']
                })
        
        if len(version_ratios) < 2:
            continue
            
        # 計算變化幅度
        ratios = [x['ratio'] for x in version_ratios]
        max_ratio = max(ratios)
        min_ratio = min(ratios)
        
        # 計算變化幅度的不同指標
        absolute_change = max_ratio - min_ratio  # 絕對變化
        relative_change = (max_ratio - min_ratio) / min_ratio if min_ratio != 0 else 0  # 相對變化
        std_dev = statistics.stdev(ratios) if len(ratios) > 1 else 0  # 標準差
        
        complex_changes.append({
            'complex_id': complex_id,
            'complex_name': version_ratios[0]['complex_name'],
            'county': version_ratios[0]['county'],
            'version_count': len(version_ratios),
            'min_ratio': min_ratio,
            'max_ratio': max_ratio,
            'absolute_change': absolute_change,
            'relative_change': relative_change,
            'std_dev': std_dev,
            'version_data': version_ratios
        })
    
    # 按絕對變化幅度排序
    complex_changes.sort(key=lambda x: x['absolute_change'], reverse=True)
    return complex_changes

def analyze_by_county(data):
    """按縣市分析調整率變化"""
    county_data = defaultdict(list)
    for row in data:
        county_data[row['county']].append(row)
    
    county_stats = []
    for county, records in county_data.items():
        # 計算該縣市的調整率統計
        adj_values = [r['adj'] for r in records if r['adj'] is not None]
        if not adj_values:
            continue
            
        county_stats.append({
            'county': county,
            'count': len(adj_values),
            'mean': statistics.mean(adj_values),
            'median': statistics.median(adj_values),
            'std': statistics.stdev(adj_values) if len(adj_values) > 1 else 0,
            'min': min(adj_values),
            'max': max(adj_values),
            'range': max(adj_values) - min(adj_values)
        })
    
    # 按資料筆數排序
    county_stats.sort(key=lambda x: x['count'], reverse=True)
    return county_stats

def analyze_version_trends(data):
    """分析各版本間的整體趨勢"""
    version_stats = defaultdict(list)
    for row in data:
        adj_value = row['adj'] if row['adj'] is not None else row['ratio']
        if adj_value is not None:
            version_stats[row['model_version']].append(adj_value)
    
    trend_data = []
    for version in sorted(version_stats.keys()):
        values = version_stats[version]
        trend_data.append({
            'version': version,
            'count': len(values),
            'mean': statistics.mean(values),
            'median': statistics.median(values),
            'std': statistics.stdev(values) if len(values) > 1 else 0,
            'q25': sorted(values)[len(values)//4],
            'q75': sorted(values)[3*len(values)//4]
        })
    
    return trend_data

def export_complex_changes_json(complex_changes, output_path):
    """Export analysis results to JSON for frontend consumption"""
    logging.info(f"Exporting {len(complex_changes)} complex changes to {output_path}")
    
    # Ensure output directory exists
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    
    # Write JSON file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(complex_changes, f, ensure_ascii=False, indent=2)
    
    logging.info(f"Successfully exported to {output_path}")

def export_county_statistics(county_stats, output_path):
    """Export geographic analysis to JSON"""
    logging.info(f"Exporting county statistics to {output_path}")
    
    # Ensure output directory exists
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    
    # Write JSON file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(county_stats, f, ensure_ascii=False, indent=2)
    
    logging.info(f"Successfully exported county statistics to {output_path}")

def export_version_trends(version_data, output_path):
    """Export temporal analysis to JSON"""
    logging.info(f"Exporting version trends to {output_path}")
    
    # Ensure output directory exists
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    
    # Write JSON file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(version_data, f, ensure_ascii=False, indent=2)
    
    logging.info(f"Successfully exported version trends to {output_path}")

def create_taiwan_map_geojson(output_path):
    """Create a simple Taiwan map GeoJSON for geographic visualization"""
    logging.info(f"Creating basic Taiwan map GeoJSON at {output_path}")
    
    # Create a simplified Taiwan GeoJSON structure
    # Note: This is a placeholder - for production, use actual Taiwan administrative boundaries
    taiwan_geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "name": "台北",
                    "county": "台北"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[121.4, 25.1], [121.7, 25.1], [121.7, 25.3], [121.4, 25.3], [121.4, 25.1]]]
                }
            },
            {
                "type": "Feature", 
                "properties": {
                    "name": "新北",
                    "county": "新北"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[121.3, 24.9], [121.8, 24.9], [121.8, 25.4], [121.3, 25.4], [121.3, 24.9]]]
                }
            },
            {
                "type": "Feature",
                "properties": {
                    "name": "台中",
                    "county": "台中"
                },
                "geometry": {
                    "type": "Polygon", 
                    "coordinates": [[[120.5, 24.0], [120.9, 24.0], [120.9, 24.4], [120.5, 24.4], [120.5, 24.0]]]
                }
            },
            {
                "type": "Feature",
                "properties": {
                    "name": "高雄",
                    "county": "高雄"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[120.2, 22.5], [120.5, 22.5], [120.5, 22.8], [120.2, 22.8], [120.2, 22.5]]]
                }
            },
            {
                "type": "Feature",
                "properties": {
                    "name": "新竹",
                    "county": "新竹"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[120.8, 24.6], [121.2, 24.6], [121.2, 24.9], [120.8, 24.9], [120.8, 24.6]]]
                }
            }
        ]
    }
    
    # Ensure output directory exists
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    
    # Write GeoJSON file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(taiwan_geojson, f, ensure_ascii=False, indent=2)
    
    logging.info(f"Successfully created Taiwan map GeoJSON at {output_path}")

def main():
    parser = argparse.ArgumentParser(description='生成儀表板所需的所有JSON資料檔案')
    parser.add_argument('--input', default="complex_ids.csv", 
                       help='輸入CSV檔案路徑 (預設: complex_ids.csv)')
    parser.add_argument('--output-dir', default='dashboard/data',
                       help='JSON輸出目錄 (預設: dashboard/data)')
    parser.add_argument('--threshold', type=float, default=0.1,
                       help='變化劇烈的閾值 (預設: 0.1)')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='顯示詳細日誌')
    
    args = parser.parse_args()
    
    # Setup logging
    log_level = logging.INFO if args.verbose else logging.WARNING
    logging.basicConfig(level=log_level, format='%(asctime)s - %(levelname)s - %(message)s')
    
    try:
        print("正在載入資料...")
        data = load_data(args.input)
        print(f"載入 {len(data):,} 筆資料")
        
        output_dir = Path(args.output_dir)
        
        print("正在分析社區變化...")
        complex_changes = analyze_complex_changes(data)
        export_complex_changes_json(complex_changes, output_dir / 'complex_changes.json')
        print(f"匯出 {len(complex_changes):,} 個社區變化記錄")
        
        print("正在分析縣市統計...")
        county_stats = analyze_by_county(data)
        export_county_statistics(county_stats, output_dir / 'county_stats.json')
        print(f"匯出 {len(county_stats)} 個縣市統計")
        
        print("正在分析版本趨勢...")
        version_trends = analyze_version_trends(data)
        export_version_trends(version_trends, output_dir / 'version_trends.json')
        print(f"匯出 {len(version_trends)} 個版本趨勢")
        
        print("正在創建台灣地圖GeoJSON...")
        create_taiwan_map_geojson(output_dir / 'taiwan_map.geojson')
        print("台灣地圖GeoJSON創建完成")
        
        print(f"\n所有資料匯出完成！")
        print(f"輸出目錄: {output_dir}")
        print("生成的檔案:")
        print("  - complex_changes.json: 社區變化分析結果")
        print("  - county_stats.json: 縣市統計資料")
        print("  - version_trends.json: 版本趨勢分析")
        print("  - taiwan_map.geojson: 台灣地圖資料")
        
    except FileNotFoundError:
        print(f"錯誤: 找不到檔案 {args.input}")
        sys.exit(1)
    except Exception as e:
        print(f"錯誤: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()