#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
社區估值與實際值差異分析（純Python版本）
分析各個社區在不同版本和時間的估值準確度
"""

import csv
import json
import statistics
from collections import defaultdict
from datetime import datetime

def convert_time_format(time_code):
    """轉換時間格式從10308到2014-08"""
    try:
        time_str = str(int(float(time_code)))
        if len(time_str) == 5:
            year = int(time_str[:3]) + 1911  # 民國年轉西元年
            month = int(time_str[3:])
            return f"{year}-{month:02d}"
        return None
    except:
        return None

def load_and_process_data(csv_file):
    """載入並處理社區估價比較數據"""
    print(f"正在載入數據: {csv_file}")
    
    data = []
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                actual_value = float(row['y'])
                estimated_value = float(row['yhat'])
                
                # 計算差異相關指標
                difference = estimated_value - actual_value
                difference_ratio = difference / actual_value if actual_value != 0 else 0
                abs_difference_ratio = abs(difference_ratio)
                accuracy = max(0, 1 - abs_difference_ratio)  # 確保準確度不為負數
                
                processed_row = {
                    '縣市': row['county'],
                    '交易時間': row['TIME'],
                    '版本': int(row['version']),
                    '社區名稱': row['complex_name'],
                    '實際值': actual_value,
                    '估值': estimated_value,
                    '差異': difference,
                    '差異率': difference_ratio,
                    '絕對差異率': abs_difference_ratio,
                    '準確度': accuracy,
                    '交易年月': convert_time_format(row['TIME'])
                }
                data.append(processed_row)
            except (ValueError, KeyError) as e:
                print(f"跳過無效資料行: {e}")
                continue
    
    print(f"成功載入 {len(data):,} 筆有效數據")
    return data

def analyze_complex_performance(data):
    """分析各社區的估值表現"""
    print("正在分析各社區估值表現...")
    
    complex_groups = defaultdict(list)
    for record in data:
        complex_groups[record['社區名稱']].append(record)
    
    performance_data = []
    
    for complex_name, records in complex_groups.items():
        if len(records) < 2:  # 需要至少2筆數據
            continue
            
        # 按時間排序
        records.sort(key=lambda x: x['交易年月'] or '0000-00')
        
        # 計算統計指標
        accuracies = [r['準確度'] for r in records]
        difference_ratios = [r['差異率'] for r in records]
        differences = [r['差異'] for r in records]
        versions = [r['版本'] for r in records]
        
        high_estimate_count = sum(1 for d in differences if d > 0)
        
        stats = {
            '社區名稱': complex_name,
            '縣市': records[0]['縣市'],
            '數據筆數': len(records),
            '版本範圍': f"{min(versions)}-{max(versions)}",
            '平均準確度': statistics.mean(accuracies),
            '準確度標準差': statistics.stdev(accuracies) if len(accuracies) > 1 else 0,
            '最佳準確度': max(accuracies),
            '最差準確度': min(accuracies),
            '平均差異率': statistics.mean(difference_ratios),
            '差異率標準差': statistics.stdev(difference_ratios) if len(difference_ratios) > 1 else 0,
            '高估傾向': high_estimate_count / len(records),
            '時間跨度': f"{records[0]['交易年月']} 到 {records[-1]['交易年月']}"
        }
        
        performance_data.append(stats)
    
    return performance_data


def analyze_county_performance(data):
    """分析各縣市的估值表現"""
    county_groups = defaultdict(list)
    for record in data:
        county_groups[record['縣市']].append(record)
    
    county_stats = []
    for county, records in county_groups.items():
        accuracies = [r['準確度'] for r in records]
        difference_ratios = [r['差異率'] for r in records]
        complex_names = set(r['社區名稱'] for r in records)
        
        stats = {
            '縣市': county,
            '平均準確度': statistics.mean(accuracies),
            '準確度標準差': statistics.stdev(accuracies) if len(accuracies) > 1 else 0,
            '數據筆數': len(records),
            '平均差異率': statistics.mean(difference_ratios),
            '差異率標準差': statistics.stdev(difference_ratios) if len(difference_ratios) > 1 else 0,
            '社區數量': len(complex_names)
        }
        county_stats.append(stats)
    
    return sorted(county_stats, key=lambda x: x['平均準確度'], reverse=True)

def analyze_version_performance(data):
    """分析各版本的估值表現"""
    version_groups = defaultdict(list)
    for record in data:
        version_groups[record['版本']].append(record)
    
    version_stats = []
    for version, records in version_groups.items():
        accuracies = [r['準確度'] for r in records]
        difference_ratios = [r['差異率'] for r in records]
        
        stats = {
            '版本': version,
            '平均準確度': statistics.mean(accuracies),
            '準確度標準差': statistics.stdev(accuracies) if len(accuracies) > 1 else 0,
            '數據筆數': len(records),
            '平均差異率': statistics.mean(difference_ratios),
            '差異率標準差': statistics.stdev(difference_ratios) if len(difference_ratios) > 1 else 0
        }
        version_stats.append(stats)
    
    return sorted(version_stats, key=lambda x: x['版本'])

def generate_visualization_recommendations():
    """生成視覺化建議"""
    return {
        "資料結構分析": {
            "欄位說明": {
                "county": "縣市",
                "TIME": "交易時間 (民國年月，如10308=2014年8月)",
                "version": "模型版本 (246-251)",
                "complex_name": "社區名稱",
                "y": "實際交易價格",
                "yhat": "模型估計價格"
            },
            "計算指標": {
                "差異": "估值 - 實際值",
                "差異率": "(估值 - 實際值) / 實際值",
                "準確度": "1 - |差異率|",
                "高估傾向": "估值 > 實際值的比例"
            }
        },
        "建議視覺化方案": {
            "1. 社區時間序列圖": {
                "描述": "顯示特定社區的估值vs實際值隨時間變化",
                "X軸": "交易時間",
                "Y軸": "價格（左軸）+ 準確度（右軸）",
                "圖表類型": "雙軸折線圖 + 柱狀圖",
                "實現方式": "Chart.js 或 D3.js",
                "互動功能": "社區選擇器、版本篩選器、時間區間選擇"
            },
            "2. 版本-社區準確度熱力圖": {
                "描述": "矩陣視圖顯示各社區在不同版本的準確度",
                "X軸": "模型版本 (246-251)",
                "Y軸": "社區名稱",
                "顏色": "準確度（綠色=高，紅色=低）",
                "圖表類型": "熱力圖",
                "實現方式": "D3.js heatmap",
                "互動功能": "hover顯示詳細數據、點擊查看趨勢"
            },
            "3. 縣市準確度比較": {
                "描述": "各縣市估值準確度的統計分布",
                "圖表類型": "箱線圖 或 小提琴圖",
                "實現方式": "Chart.js boxplot plugin 或 D3.js",
                "顯示內容": "中位數、四分位數、異常值"
            },
            "4. 估值散點圖": {
                "描述": "實際值 vs 估值的散點圖",
                "X軸": "實際值",
                "Y軸": "估值",
                "參考線": "y=x 對角線（完美估值線）",
                "顏色分組": "依縣市或版本著色",
                "實現方式": "Chart.js scatter plot"
            },
            "5. 社區排名儀表板": {
                "描述": "按準確度排序的社區表現",
                "顯示內容": "社區名稱、縣市、平均準確度、數據筆數",
                "圖表類型": "水平條形圖 + 表格",
                "篩選功能": "按縣市、版本、準確度範圍篩選"
            }
        },
        "Dashboard整合建議": {
            "擴展現有功能": "在current dashboard基礎上新增估值分析模組",
            "數據載入": "將分析結果JSON載入到ModernDataManager",
            "UI組件": "新增社區估值分析面板到index_modern.html",
            "互動連結": "地圖點擊社區時顯示估值分析",
            "導出功能": "支援估值分析報告PDF/CSV導出"
        }
    }

def main():
    csv_file = "社區原始估價比較.csv"
    
    try:
        # 載入並處理數據
        data = load_and_process_data(csv_file)
        
        print(f"\\n基本統計:")
        print(f"- 社區數量: {len(set(r['社區名稱'] for r in data))}")
        print(f"- 縣市數量: {len(set(r['縣市'] for r in data))}")
        print(f"- 版本範圍: {min(r['版本'] for r in data)} - {max(r['版本'] for r in data)}")
        print(f"- 時間範圍: {min(r['交易年月'] for r in data if r['交易年月'])} - {max(r['交易年月'] for r in data if r['交易年月'])}")
        
        # 分析社區表現
        performance_data = analyze_complex_performance(data)
        
        print("\\n=== 估值準確度最高的前10個社區 ===")
        top_performers = sorted(performance_data, key=lambda x: x['平均準確度'], reverse=True)[:10]
        for i, row in enumerate(top_performers, 1):
            print(f"{i:2d}. {row['社區名稱']:20} ({row['縣市']:6}) - 準確度: {row['平均準確度']:.1%} (±{row['準確度標準差']:.1%})")
        
        print("\\n=== 估值準確度較低的前10個社區 ===")
        low_performers = sorted(performance_data, key=lambda x: x['平均準確度'])[:10]
        for i, row in enumerate(low_performers, 1):
            print(f"{i:2d}. {row['社區名稱']:20} ({row['縣市']:6}) - 準確度: {row['平均準確度']:.1%} (±{row['準確度標準差']:.1%})")
        
        # 縣市分析
        county_stats = analyze_county_performance(data)
        print("\\n=== 各縣市估值準確度統計 ===")
        print(f"{'縣市':8} {'平均準確度':>10} {'標準差':>8} {'數據筆數':>8} {'社區數量':>8}")
        print("-" * 50)
        for county in county_stats:
            print(f"{county['縣市']:8} {county['平均準確度']:>9.1%} {county['準確度標準差']:>7.1%} {county['數據筆數']:>8} {county['社區數量']:>8}")
        
        # 版本分析
        version_stats = analyze_version_performance(data)
        print("\\n=== 各版本估值準確度統計 ===")
        print(f"{'版本':6} {'平均準確度':>10} {'標準差':>8} {'數據筆數':>8}")
        print("-" * 40)
        for version in version_stats:
            print(f"{version['版本']:6} {version['平均準確度']:>9.1%} {version['準確度標準差']:>7.1%} {version['數據筆數']:>8}")
        
        # 輸出JSON數據
        print("\\n正在生成JSON數據...")
        output_data = {
            'metadata': {
                'total_records': len(data),
                'unique_complexes': len(set(r['社區名稱'] for r in data)),
                'unique_counties': len(set(r['縣市'] for r in data)),
                'version_range': f"{min(r['版本'] for r in data)}-{max(r['版本'] for r in data)}",
                'time_range': f"{min(r['交易年月'] for r in data if r['交易年月'])} - {max(r['交易年月'] for r in data if r['交易年月'])}"
            },
            'complex_performance': performance_data,
            'county_stats': county_stats,
            'version_stats': version_stats,
            'sample_data': data[:50]  # 樣本數據
        }
        
        with open('complex_valuation_analysis.json', 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
        
        print("✅ 分析結果已輸出到: complex_valuation_analysis.json")
        
        # 生成視覺化建議
        recommendations = generate_visualization_recommendations()
        
        with open('visualization_recommendations.json', 'w', encoding='utf-8') as f:
            json.dump(recommendations, f, ensure_ascii=False, indent=2)
        
        print("✅ 視覺化建議已輸出到: visualization_recommendations.json")
        
        print("\\n" + "="*60)
        print("📊 視覺化實作建議")
        print("="*60)
        print("1. 時間序列圖：適合分析個別社區的估值準確度變化趨勢")
        print("2. 熱力圖：適合比較不同版本在各社區的表現差異") 
        print("3. 散點圖：適合整體評估模型估值準確度")
        print("4. 箱線圖：適合比較不同縣市的估值準確度分布")  
        print("5. 排名圖：適合識別表現最佳/最差的社區")
        
        print("\\n" + "="*60)
        print("🔧 技術實作步驟")
        print("="*60)
        print("1. 將 complex_valuation_analysis.json 複製到 dashboard/data/")
        print("2. 擴展 ModernDataManager 加載估值數據")
        print("3. 在 modern-charts.js 添加估值分析圖表類")
        print("4. 在 index_modern.html 添加估值分析面板")
        print("5. 實現社區搜尋時的估值詳細分析功能")
        
    except FileNotFoundError:
        print(f"錯誤：找不到檔案 {csv_file}")
        print("請確認檔案路徑正確")
    except Exception as e:
        print(f"分析過程中發生錯誤: {e}")

if __name__ == "__main__":
    main()