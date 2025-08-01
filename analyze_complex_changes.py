#!/usr/bin/env python3
"""
分析社區在不同模型版本間調整率變化的腳本
"""

import csv
import sys
import json
import argparse
import logging
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
    """分析社區調整率變化"""
    # 按社區分組資料
    complex_data = defaultdict(list)
    
    for row in data:
        # 使用name作為社區識別ID
        complex_id = row['name']
        complex_data[complex_id].append(row)
    
    print(f"=== 資料概況 ===")
    print(f"總資料筆數: {len(data):,}")
    print(f"社區總數: {len(complex_data):,}")
    
    # 統計模型版本
    versions = set(row['model_version'] for row in data)
    print(f"模型版本數: {len(versions)} ({sorted(versions)})")
    
    # 版本分布統計
    version_counts = defaultdict(int)
    for row in data:
        version_counts[row['model_version']] += 1
    
    print("\n=== 各版本資料量 ===")
    for version in sorted(version_counts.keys()):
        print(f"版本 {version}: {version_counts[version]:,} 筆")
    
    # 分析每個社區的變化
    complex_changes = []
    
    for complex_id, records in complex_data.items():
        if len(records) < 2:  # 需要至少2個版本才能計算變化
            continue
            
        # 按版本排序
        records.sort(key=lambda x: x['model_version'])
        
        # 建立完整的版本資料序列 (246-251)
        all_versions = list(range(246, 252))  # 246, 247, 248, 249, 250, 251
        version_map = {record['model_version']: record for record in records}
        
        # 提取調整率資料，缺失版本補1.0
        version_ratios = []
        ratios = []
        
        for version in all_versions:
            if version in version_map:
                record = version_map[version]
                ratio = record['adj'] if record['adj'] is not None else record['ratio']
                if ratio is None:
                    ratio = 1.0  # 缺失值補1.0
                complex_name = record['complex_name']
                county = record['county']
            else:
                ratio = 1.0  # 整個版本缺失，補1.0
                # 使用已知的社區名稱和縣市
                complex_name = records[0]['complex_name'] if records else 'Unknown'
                county = records[0]['county'] if records else 'Unknown'
            
            version_ratios.append({
                'version': version,
                'ratio': ratio,
                'complex_name': complex_name,
                'county': county
            })
            ratios.append(ratio)
        
        # 計算相鄰版本間的變化幅度
        period_changes = []
        for i in range(1, len(ratios)):
            prev_ratio = ratios[i-1]
            curr_ratio = ratios[i]
            
            # 絕對變化
            abs_change = abs(curr_ratio - prev_ratio)
            
            # 相對變化
            rel_change = abs(curr_ratio - prev_ratio) / prev_ratio if prev_ratio != 0 else 0
            
            period_changes.append({
                'from_version': all_versions[i-1],
                'to_version': all_versions[i],
                'absolute_change': abs_change,
                'relative_change': rel_change
            })
        
        # 總體變化指標
        max_absolute_change = max(change['absolute_change'] for change in period_changes)
        max_relative_change = max(change['relative_change'] for change in period_changes)
        avg_absolute_change = sum(change['absolute_change'] for change in period_changes) / len(period_changes)
        avg_relative_change = sum(change['relative_change'] for change in period_changes) / len(period_changes)
        
        # 整體統計
        max_ratio = max(ratios)
        min_ratio = min(ratios)
        std_dev = statistics.stdev(ratios) if len(ratios) > 1 else 0  # 標準差
        
        complex_changes.append({
            'complex_id': complex_id,
            'complex_name': version_ratios[0]['complex_name'],
            'county': version_ratios[0]['county'],
            'version_count': len(version_ratios),
            'min_ratio': min_ratio,
            'max_ratio': max_ratio,
            # 新的變化指標 (基於相鄰期間)
            'max_absolute_change': max_absolute_change,
            'max_relative_change': max_relative_change,
            'avg_absolute_change': avg_absolute_change,
            'avg_relative_change': avg_relative_change,
            # 舊指標保留兼容性
            'absolute_change': max_absolute_change,  # 使用最大期間變化
            'relative_change': max_relative_change,  # 使用最大期間變化
            'std_dev': std_dev,
            'version_data': version_ratios,
            'period_changes': period_changes  # 詳細的期間變化資料
        })
    
    print(f"\n=== 可分析的社區數 ===")
    print(f"有多版本資料的社區: {len(complex_changes):,}")
    
    # 按最大期間絕對變化排序
    complex_changes.sort(key=lambda x: x['max_absolute_change'], reverse=True)
    
    print(f"\n=== 調整率變化最劇烈的前10個社區（按最大期間絕對變化） ===")
    print(f"{'排名':<4} {'社區ID':<8} {'社區名稱':<25} {'縣市':<6} {'最大期間絕對變化':<14} {'最大期間相對變化%':<16} {'平均期間絕對變化':<14} {'標準差':<8}")
    print("-" * 135)
    
    top_10_absolute = complex_changes[:10]
    for i, complex_info in enumerate(top_10_absolute, 1):
        print(f"{i:<4} {complex_info['complex_id']:<8} {complex_info['complex_name'][:23]:<25} "
              f"{complex_info['county']:<6} {complex_info['max_absolute_change']:<14.4f} "
              f"{complex_info['max_relative_change']*100:<15.2f}% "
              f"{complex_info['avg_absolute_change']:<14.4f} {complex_info['std_dev']:<8.4f}")
    
    # 按最大期間相對變化排序
    complex_changes.sort(key=lambda x: x['max_relative_change'], reverse=True)
    
    print(f"\n=== 調整率變化最劇烈的前10個社區（按最大期間相對變化） ===")
    print(f"{'排名':<4} {'社區ID':<8} {'社區名稱':<25} {'縣市':<6} {'最大期間相對變化%':<16} {'最大期間絕對變化':<14} {'平均期間相對變化%':<16} {'標準差':<8}")
    print("-" * 140)
    
    top_10_relative = complex_changes[:10]
    for i, complex_info in enumerate(top_10_relative, 1):
        print(f"{i:<4} {complex_info['complex_id']:<8} {complex_info['complex_name'][:23]:<25} "
              f"{complex_info['county']:<6} {complex_info['max_relative_change']*100:<15.2f}% "
              f"{complex_info['max_absolute_change']:<14.4f} "
              f"{complex_info['avg_relative_change']*100:<15.2f}% {complex_info['std_dev']:<8.4f}")
    
    # 詳細顯示前5名社區的期間變化
    print(f"\n=== 前5名社區的詳細期間變化（按最大期間絕對變化） ===")
    for i, complex_info in enumerate(top_10_absolute[:5], 1):
        print(f"\n{i}. {complex_info['complex_name']} (ID: {complex_info['complex_id']}, {complex_info['county']})")
        print(f"   最大期間絕對變化: {complex_info['max_absolute_change']:.4f}")
        print(f"   最大期間相對變化: {complex_info['max_relative_change']*100:.2f}%")
        print(f"   平均期間絕對變化: {complex_info['avg_absolute_change']:.4f}")
        print(f"   平均期間相對變化: {complex_info['avg_relative_change']*100:.2f}%")
        print("   各版本調整率:")
        for version_info in complex_info['version_data']:
            print(f"     版本 {version_info['version']}: {version_info['ratio']:.4f}")
        print("   期間變化詳情:")
        for change in complex_info['period_changes']:
            print(f"     版本{change['from_version']}→{change['to_version']}: "
                  f"絕對變化={change['absolute_change']:.4f}, "
                  f"相對變化={change['relative_change']*100:.2f}%")
    
    return complex_changes

def export_complex_changes_json(complex_changes, output_path):
    """Export analysis results to JSON for frontend consumption"""
    logging.info(f"Exporting {len(complex_changes)} complex changes to {output_path}")
    
    # Convert complex_changes to JSON-serializable format
    json_data = []
    for complex_info in complex_changes:
        json_record = {
            'complex_id': complex_info['complex_id'],
            'complex_name': complex_info['complex_name'],
            'county': complex_info['county'],
            'version_count': complex_info['version_count'],
            'min_ratio': complex_info['min_ratio'],
            'max_ratio': complex_info['max_ratio'],
            # 新的期間變化指標
            'max_absolute_change': complex_info['max_absolute_change'],
            'max_relative_change': complex_info['max_relative_change'],
            'avg_absolute_change': complex_info['avg_absolute_change'],
            'avg_relative_change': complex_info['avg_relative_change'],
            'period_changes': complex_info['period_changes'],
            # 保留舊指標以維持兼容性
            'absolute_change': complex_info['absolute_change'],
            'relative_change': complex_info['relative_change'],
            'std_dev': complex_info['std_dev'],
            'version_data': complex_info['version_data']
        }
        json_data.append(json_record)
    
    # Ensure output directory exists
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    
    # Write JSON file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(json_data, f, ensure_ascii=False, indent=2)
    
    logging.info(f"Successfully exported to {output_path}")

def generate_recommendations(complex_changes):
    """生成建議的後續分析步驟"""
    print(f"\n=== 建議的後續分析步驟 ===")
    print("1. 深入調查變化最劇烈的社區:")
    print("   - 檢查這些社區的地理位置和周邊環境變化")
    print("   - 分析房價、交通、建設等外部因素")
    print("   - 驗證調整率變化是否合理")
    
    print("\n2. 模型版本間的系統性變化:")
    print("   - 分析整體調整率分布在各版本間的變化趨勢")
    print("   - 檢查是否存在系統性偏差")
    print("   - 比較不同縣市的變化模式")
    
    print("\n3. 異常值檢測:")
    print("   - 識別可能的資料錯誤或異常情況")
    print("   - 檢查極端值的合理性")
    print("   - 建立異常檢測機制")
    
    print("\n4. 穩定性分析:")
    print("   - 識別調整率相對穩定的社區")
    print("   - 分析穩定社區的共同特徵")
    print("   - 建立模型穩定性指標")
    
    print("\n5. 業務影響評估:")
    print("   - 評估調整率變化對業務決策的影響")
    print("   - 制定調整率變化的預警機制")
    print("   - 建立模型版本更新的影響評估流程")

def main():
    parser = argparse.ArgumentParser(description='分析社區在不同模型版本間調整率變化')
    parser.add_argument('--input', default="complex_ids.csv", 
                       help='輸入CSV檔案路徑 (預設: complex_ids.csv)')
    parser.add_argument('--threshold', type=float, default=0.1,
                       help='變化劇烈的閾值 (預設: 0.1)')
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
        
        print("正在分析社區變化...")
        complex_changes = analyze_complex_changes(data)
        
        # Filter by threshold
        filtered_changes = [c for c in complex_changes if c['absolute_change'] >= args.threshold]
        if len(filtered_changes) < len(complex_changes):
            print(f"篩選閾值: {args.threshold}, 符合條件的社區: {len(filtered_changes):,} 個")
        
        # Output results
        if args.output_format in ['console', 'both']:
            print("正在生成建議...")
            generate_recommendations(complex_changes)
        
        if args.output_format in ['json', 'both']:
            output_path = Path(args.output_dir) / 'complex_changes.json'
            export_complex_changes_json(complex_changes, output_path)
            print(f"JSON資料已匯出至: {output_path}")
        
        print(f"\n分析完成！")
        
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