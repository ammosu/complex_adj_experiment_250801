#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
社區估值誤差分析系統
專門針對各社區在不同版本的MPE(平均百分比誤差)分析
"""

import csv
import json
import statistics
from collections import defaultdict
from datetime import datetime

def convert_time_to_year(time_code):
    """將時間代碼轉換為西元年
    例：10308 -> 2014 (民國103年 = 西元2014年)
    """
    try:
        time_str = str(int(float(time_code)))
        if len(time_str) == 5:
            roc_year = int(time_str[:3])  # 民國年
            year = roc_year + 1911  # 轉為西元年
            return year
        elif len(time_str) == 4:
            roc_year = int(time_str[:2])
            year = roc_year + 1911
            return year
        return None
    except:
        return None

def calculate_percentage_error(actual, predicted):
    """計算百分比誤差 PE = ((predicted - actual) / actual) × 100%"""
    if actual == 0:
        return None  # 避免除以零
    return ((predicted - actual) / actual) * 100

def load_and_process_csv(csv_file):
    """載入並處理CSV數據"""
    print(f"正在載入數據: {csv_file}")
    
    # 組織數據結構: 縣市 -> 社區 -> 版本 -> 年度 -> 交易列表
    data_structure = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(list))))
    
    error_count = 0
    total_count = 0
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            total_count += 1
            
            try:
                # 提取基本資訊
                county = row['county'].strip()
                complex_name = row['complex_name'].strip()
                version = int(row['version'])
                time_code = row['TIME']
                
                # 提取數值
                actual_value = float(row['y'])
                predicted_value = float(row['yhat'])
                
                # 轉換時間
                year = convert_time_to_year(time_code)
                if year is None:
                    error_count += 1
                    continue
                
                # 計算百分比誤差
                pe = calculate_percentage_error(actual_value, predicted_value)
                if pe is None:
                    error_count += 1
                    continue
                
                # 建立交易記錄
                transaction = {
                    'time_code': time_code,
                    'actual_value': actual_value,
                    'predicted_value': predicted_value,
                    'pe': round(pe, 2)
                }
                
                # 存入數據結構
                data_structure[county][complex_name][version][year].append(transaction)
                
            except (ValueError, KeyError) as e:
                error_count += 1
                continue
    
    print(f"數據載入完成:")
    print(f"  總筆數: {total_count:,}")
    print(f"  有效筆數: {total_count - error_count:,}")
    print(f"  錯誤筆數: {error_count:,}")
    print(f"  縣市數量: {len(data_structure)}")
    
    # 統計各縣市的社區數量
    for county, complexes in data_structure.items():
        print(f"  {county}: {len(complexes)} 個社區")
    
    return data_structure

def calculate_mpe_statistics(data_structure):
    """計算MPE統計數據"""
    print("正在計算MPE統計...")
    
    result = {}
    
    for county, complexes in data_structure.items():
        result[county] = {}
        
        for complex_name, versions in complexes.items():
            result[county][complex_name] = {
                'versions': {},
                'summary': {
                    'total_years': set(),
                    'total_versions': list(versions.keys()),
                    'data_coverage': {}
                }
            }
            
            # 處理每個版本
            for version, years in versions.items():
                version_data = {
                    'yearly_mpe': {},
                    'overall_mpe': None,
                    'transaction_count': 0,
                    'year_range': [],
                    'detailed_transactions': {}
                }
                
                all_pes = []  # 收集所有PE值計算整體MPE
                
                # 處理每年的數據
                for year, transactions in years.items():
                    if not transactions:
                        continue
                        
                    # 計算該年的PE值
                    year_pes = [t['pe'] for t in transactions]
                    yearly_mpe = statistics.mean(year_pes)
                    
                    version_data['yearly_mpe'][year] = round(yearly_mpe, 2)
                    version_data['transaction_count'] += len(transactions)
                    version_data['detailed_transactions'][year] = transactions
                    
                    all_pes.extend(year_pes)
                    result[county][complex_name]['summary']['total_years'].add(year)
                
                # 計算整體MPE
                if all_pes:
                    version_data['overall_mpe'] = round(statistics.mean(all_pes), 2)
                    version_data['year_range'] = [min(years.keys()), max(years.keys())]
                
                result[county][complex_name]['versions'][version] = version_data
            
            # 更新摘要資訊
            summary = result[county][complex_name]['summary']
            summary['total_years'] = sorted(list(summary['total_years']))
            summary['total_versions'] = sorted(summary['total_versions'])
            
            # 統計數據覆蓋情況
            for version in summary['total_versions']:
                coverage = len(result[county][complex_name]['versions'][version]['yearly_mpe'])
                total_years = len(summary['total_years'])
                summary['data_coverage'][version] = {
                    'covered_years': coverage,
                    'total_years': total_years,
                    'coverage_ratio': round(coverage / total_years if total_years > 0 else 0, 2)
                }
    
    return result

def generate_summary_report(result):
    """生成摘要報告"""
    print("\n" + "="*60)
    print("📊 估值誤差分析摘要報告")
    print("="*60)
    
    total_counties = len(result)
    total_complexes = sum(len(complexes) for complexes in result.values())
    
    print(f"總縣市數: {total_counties}")
    print(f"總社區數: {total_complexes}")
    
    # 按縣市統計
    print(f"\n{'縣市':<8} {'社區數':<8} {'版本覆蓋':<15} {'最佳MPE社區':<20}")
    print("-" * 70)
    
    county_stats = []
    
    for county, complexes in result.items():
        complex_count = len(complexes)
        
        # 找出該縣市最佳MPE的社區
        best_mpe = float('inf')
        best_complex = ""
        best_version = ""
        
        for complex_name, data in complexes.items():
            for version, version_data in data['versions'].items():
                if version_data['overall_mpe'] is not None:
                    abs_mpe = abs(version_data['overall_mpe'])
                    if abs_mpe < abs(best_mpe):
                        best_mpe = version_data['overall_mpe']
                        best_complex = complex_name[:15] + "..." if len(complex_name) > 15 else complex_name
                        best_version = f"v{version}"
        
        # 統計版本覆蓋情況
        all_versions = set()
        for complex_data in complexes.values():
            all_versions.update(complex_data['versions'].keys())
        
        version_coverage = f"{len(all_versions)}/6版本"
        best_info = f"{best_complex}({best_version})"
        
        print(f"{county:<8} {complex_count:<8} {version_coverage:<15} {best_info:<20}")
        
        county_stats.append({
            'county': county,
            'complex_count': complex_count,
            'version_coverage': len(all_versions),
            'best_mpe': best_mpe if best_mpe != float('inf') else None
        })
    
    return county_stats

def export_data_for_frontend(result, output_file):
    """匯出前端所需的JSON數據"""
    print(f"\n正在匯出前端數據到: {output_file}")
    
    # 準備前端友好的數據格式
    frontend_data = {
        'counties': {},
        'metadata': {
            'total_counties': len(result),
            'total_complexes': sum(len(complexes) for complexes in result.values()),
            'versions': [246, 247, 248, 249, 250, 251],
            'export_time': datetime.now().isoformat()
        }
    }
    
    for county, complexes in result.items():
        frontend_data['counties'][county] = {
            'complexes': {},
            'summary': {
                'complex_count': len(complexes),
                'total_transactions': 0
            }
        }
        
        for complex_name, data in complexes.items():
            complex_data = {
                'versions': {},
                'summary': data['summary']
            }
            
            total_transactions = 0
            
            for version, version_data in data['versions'].items():
                # 只保留前端需要的數據，移除詳細交易記錄以減少檔案大小
                simplified_version_data = {
                    'yearly_mpe': version_data['yearly_mpe'],
                    'overall_mpe': version_data['overall_mpe'],
                    'transaction_count': version_data['transaction_count'],
                    'year_range': version_data['year_range'],
                    # 保留詳細交易記錄供展開功能使用
                    'detailed_transactions': version_data['detailed_transactions']
                }
                
                complex_data['versions'][str(version)] = simplified_version_data
                total_transactions += version_data['transaction_count']
            
            frontend_data['counties'][county]['complexes'][complex_name] = complex_data
            frontend_data['counties'][county]['summary']['total_transactions'] += total_transactions
    
    # 寫入JSON檔案
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(frontend_data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 前端數據匯出完成")
    
    # 顯示檔案大小
    import os
    file_size = os.path.getsize(output_file)
    print(f"📁 檔案大小: {file_size:,} bytes ({file_size/1024/1024:.1f} MB)")

def main():
    import sys
    
    # 支持命令列參數
    if len(sys.argv) > 1:
        csv_file = sys.argv[1]
    else:
        csv_file = "社區原始估價比較.csv"
    
    output_file = "dashboard/data/complex_error_analysis.json"
    
    try:
        # Step 1: 載入並處理CSV數據
        data_structure = load_and_process_csv(csv_file)
        
        # Step 2: 計算MPE統計
        result = calculate_mpe_statistics(data_structure)
        
        # Step 3: 生成摘要報告
        county_stats = generate_summary_report(result)
        
        # Step 4: 匯出前端數據
        export_data_for_frontend(result, output_file)
        
        print(f"\n🎉 估值誤差分析完成！")
        print(f"📊 前端數據已準備就緒: {output_file}")
        
    except FileNotFoundError:
        print(f"❌ 錯誤：找不到檔案 {csv_file}")
        print("請確認CSV檔案路徑正確")
    except Exception as e:
        print(f"❌ 分析過程中發生錯誤: {e}")
        raise

if __name__ == "__main__":
    main()