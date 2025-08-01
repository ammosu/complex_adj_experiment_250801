#!/usr/bin/env python3
"""
詳細分析社區調整率變化，包括統計摘要和縣市分析
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

def analyze_by_county(data):
    """按縣市分析調整率變化"""
    print("=== 按縣市分析調整率變化 ===")
    
    # 按縣市分組
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
    
    print(f"{'縣市':<8} {'筆數':<8} {'平均值':<8} {'中位數':<8} {'標準差':<8} {'最小值':<8} {'最大值':<8} {'範圍':<8}")
    print("-" * 80)
    
    for stat in county_stats:
        print(f"{stat['county']:<8} {stat['count']:<8} {stat['mean']:<8.4f} "
              f"{stat['median']:<8.4f} {stat['std']:<8.4f} {stat['min']:<8.4f} "
              f"{stat['max']:<8.4f} {stat['range']:<8.4f}")
    
    return county_stats

def analyze_version_trends(data):
    """分析各版本間的整體趨勢"""
    print("\n=== 各模型版本整體調整率趨勢 ===")
    
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
    
    print(f"{'版本':<6} {'筆數':<8} {'平均值':<8} {'中位數':<8} {'標準差':<8} {'Q25':<8} {'Q75':<8}")
    print("-" * 70)
    
    for trend in trend_data:
        print(f"{trend['version']:<6} {trend['count']:<8} {trend['mean']:<8.4f} "
              f"{trend['median']:<8.4f} {trend['std']:<8.4f} {trend['q25']:<8.4f} "
              f"{trend['q75']:<8.4f}")
    
    # 計算版本間變化
    print("\n=== 版本間平均調整率變化 ===")
    for i in range(1, len(trend_data)):
        prev_mean = trend_data[i-1]['mean']
        curr_mean = trend_data[i]['mean']
        change = curr_mean - prev_mean
        change_pct = (change / prev_mean) * 100
        print(f"版本 {trend_data[i-1]['version']} -> {trend_data[i]['version']}: "
              f"{change:+.4f} ({change_pct:+.2f}%)")
    
    return trend_data

def find_stable_complexes(complex_changes, stability_threshold=0.05):
    """找出相對穩定的社區"""
    print(f"\n=== 調整率相對穩定的社區 (標準差 < {stability_threshold}) ===")
    
    stable_complexes = [c for c in complex_changes if c['std_dev'] < stability_threshold and c['version_count'] >= 4]
    stable_complexes.sort(key=lambda x: x['std_dev'])
    
    print(f"找到 {len(stable_complexes)} 個穩定社區")
    print(f"{'排名':<4} {'社區ID':<8} {'社區名稱':<25} {'縣市':<6} {'版本數':<6} {'平均值':<8} {'標準差':<8}")
    print("-" * 90)
    
    for i, complex_info in enumerate(stable_complexes[:20], 1):  # 顯示前20個
        avg_ratio = statistics.mean([v['ratio'] for v in complex_info['version_data']])
        print(f"{i:<4} {complex_info['complex_id']:<8} {complex_info['complex_name'][:23]:<25} "
              f"{complex_info['county']:<6} {complex_info['version_count']:<6} "
              f"{avg_ratio:<8.4f} {complex_info['std_dev']:<8.4f}")
    
    return stable_complexes

def analyze_extreme_changes(complex_changes):
    """分析極端變化的特徵"""
    print(f"\n=== 極端變化社區特徵分析 ===")
    
    # 取前1%的變化最劇烈社區
    top_1_percent = int(len(complex_changes) * 0.01)
    extreme_changes = complex_changes[:top_1_percent]
    
    print(f"分析最劇烈的 {len(extreme_changes)} 個社區 (前1%)")
    
    # 按縣市統計
    county_extreme = defaultdict(int)
    for complex_info in extreme_changes:
        county_extreme[complex_info['county']] += 1
    
    print("\n極端變化社區的縣市分布:")
    for county, count in sorted(county_extreme.items(), key=lambda x: x[1], reverse=True):
        percentage = (count / len(extreme_changes)) * 100
        print(f"  {county}: {count} 個 ({percentage:.1f}%)")
    
    # 分析變化模式
    change_patterns = defaultdict(int)
    for complex_info in extreme_changes:
        ratios = [v['ratio'] for v in complex_info['version_data']]
        
        # 判斷變化模式
        if ratios[0] < ratios[-1]:
            if max(ratios) == ratios[-1]:
                change_patterns['持續上升'] += 1
            else:
                change_patterns['先升後降'] += 1
        elif ratios[0] > ratios[-1]:
            if min(ratios) == ratios[-1]:
                change_patterns['持續下降'] += 1
            else:
                change_patterns['先降後升'] += 1
        else:
            change_patterns['波動'] += 1
    
    print("\n變化模式分析:")
    for pattern, count in change_patterns.items():
        percentage = (count / len(extreme_changes)) * 100
        print(f"  {pattern}: {count} 個 ({percentage:.1f}%)")

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

def main():
    parser = argparse.ArgumentParser(description='詳細分析社區調整率變化，包括統計摘要和縣市分析')
    parser.add_argument('--input', default="complex_ids.csv", 
                       help='輸入CSV檔案路徑 (預設: complex_ids.csv)')
    parser.add_argument('--threshold', type=float, default=0.05,
                       help='穩定性閾值 (預設: 0.05)')
    parser.add_argument('--region', 
                       help='指定分析的縣市 (可選)')
    parser.add_argument('--model-versions', nargs=2, type=int, 
                       help='指定要比較的模型版本範圍 (例如: --model-versions 246 251)')
    parser.add_argument('--output-format', choices=['console', 'json', 'both'], 
                       default='console', help='輸出格式 (預設: console)')
    parser.add_argument('--output-dir', default='dashboard/data',
                       help='JSON輸出目錄 (預設: dashboard/data)')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='顯示詳細日誌')
    
    args = parser.parse_args()
    
    # Setup logging
    log_level = logging.INFO if args.verbose else logging.WARNING
    logging.basicConfig(level=log_level, format='%(asctime)s - %(levelname)s - %(message)s')
    
    try:
        print("正在載入資料...")
        data = load_data(args.input)
        
        # Filter by region if specified
        if args.region:
            data = [row for row in data if row['county'] == args.region]
            print(f"篩選縣市: {args.region}, 剩餘資料: {len(data):,} 筆")
        
        # Filter by model versions if specified
        if args.model_versions:
            min_version, max_version = args.model_versions
            data = [row for row in data if min_version <= row['model_version'] <= max_version]
            print(f"篩選模型版本: {min_version}-{max_version}, 剩餘資料: {len(data):,} 筆")
        
        # 縣市分析
        county_stats = analyze_by_county(data)
        
        # 版本趨勢分析
        version_trends = analyze_version_trends(data)
        
        # 重新計算社區變化（簡化版）
        print("\n正在計算社區變化...")
        complex_data = defaultdict(list)
        for row in data:
            complex_data[row['name']].append(row)
        
        complex_changes = []
        for complex_id, records in complex_data.items():
            if len(records) < 2:
                continue
                
            records.sort(key=lambda x: x['model_version'])
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
                
            ratios = [x['ratio'] for x in version_ratios]
            max_ratio = max(ratios)
            min_ratio = min(ratios)
            absolute_change = max_ratio - min_ratio
            std_dev = statistics.stdev(ratios) if len(ratios) > 1 else 0
            
            complex_changes.append({
                'complex_id': complex_id,
                'complex_name': version_ratios[0]['complex_name'],
                'county': version_ratios[0]['county'],
                'version_count': len(version_ratios),
                'absolute_change': absolute_change,
                'std_dev': std_dev,
                'version_data': version_ratios
            })
        
        complex_changes.sort(key=lambda x: x['absolute_change'], reverse=True)
        
        # Output console results
        if args.output_format in ['console', 'both']:
            # 穩定社區分析
            stable_complexes = find_stable_complexes(complex_changes, args.threshold)
            
            # 極端變化分析
            analyze_extreme_changes(complex_changes)
        
        # Export JSON results
        if args.output_format in ['json', 'both']:
            output_dir = Path(args.output_dir)
            export_county_statistics(county_stats, output_dir / 'county_stats.json')
            export_version_trends(version_trends, output_dir / 'version_trends.json')
            print(f"JSON資料已匯出至: {output_dir}")
        
        print(f"\n詳細分析完成！")
        
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