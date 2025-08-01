#!/usr/bin/env python3
"""
雲端部署構建腳本
為 Vercel/Render 等平台準備靜態文件
"""

import os
import json
import shutil
from pathlib import Path
import subprocess
import sys

def check_data_file():
    """檢查是否有真實數據文件"""
    data_files = [
        'complex_ids.csv',
        'data/complex_ids.csv',
        'data_backup/complex_ids.csv'
    ]
    
    for file_path in data_files:
        if Path(file_path).exists():
            print(f"✅ 找到數據文件: {file_path}")
            return file_path
    
    print("❌ 未找到真實數據文件")
    print("請將 complex_ids.csv 放入以下任一位置：")
    for file_path in data_files:
        print(f"  - {file_path}")
    return None

def run_analysis(data_file):
    """運行完整分析"""
    print("🔄 正在運行完整分析...")
    
    try:
        # 運行主分析
        result = subprocess.run([
            sys.executable, 'analyze_complex_changes.py',
            '--input', data_file,
            '--output-format', 'json',
            '--output-dir', 'dashboard/data'
        ], capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"❌ 分析失敗: {result.stderr}")
            return False
            
        print("✅ 主分析完成")
        
        # 運行詳細分析
        result = subprocess.run([
            sys.executable, 'detailed_analysis.py',
            '--input', data_file,
            '--output-json', 'dashboard/data/detailed_stats.json'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ 詳細分析完成")
        else:
            print("⚠️ 詳細分析失敗，但繼續進行")
            
        return True
        
    except Exception as e:
        print(f"❌ 分析過程出錯: {e}")
        return False

def create_static_config():
    """創建靜態部署配置"""
    print("🔧 創建部署配置...")
    
    # Vercel 配置
    vercel_config = {
        "version": 2,
        "name": "housing-complex-analysis",
        "builds": [
            {
                "src": "dashboard/**",
                "use": "@vercel/static"
            }
        ],
        "routes": [
            {
                "src": "/(.*)",
                "dest": "/dashboard/$1"
            },
            {
                "src": "/",
                "dest": "/dashboard/index_modern.html"
            }
        ]
    }
    
    with open('vercel.json', 'w', encoding='utf-8') as f:
        json.dump(vercel_config, f, indent=2)
    
    # Netlify 配置
    netlify_toml = """
[build]
  publish = "dashboard"

[[redirects]]
  from = "/"
  to = "/index_modern.html"
  status = 200

[[headers]]
  for = "/data/*"
  [headers.values]
    Cache-Control = "public, max-age=300"
"""
    
    with open('netlify.toml', 'w') as f:
        f.write(netlify_toml)
    
    print("✅ 部署配置完成")

def optimize_for_static_hosting():
    """為靜態托管優化文件"""
    print("⚡ 優化靜態文件...")
    
    # 確保數據目錄存在
    Path('dashboard/data').mkdir(parents=True, exist_ok=True)
    
    # 檢查必要的 JSON 文件
    required_files = [
        'dashboard/data/complex_changes.json',
        'dashboard/data/county_stats.json',
        'dashboard/data/version_trends.json'
    ]
    
    missing_files = [f for f in required_files if not Path(f).exists()]
    
    if missing_files:
        print("⚠️ 缺少以下數據文件，創建示例數據：")
        for file_path in missing_files:
            print(f"  - {file_path}")
        create_sample_data()
    
    # 創建部署信息文件
    deploy_info = {
        "build_time": "auto-generated",
        "data_source": "real" if Path('dashboard/data/complex_changes.json').stat().st_size > 1000000 else "sample",
        "version": "1.0.0"
    }
    
    with open('dashboard/data/deploy_info.json', 'w', encoding='utf-8') as f:
        json.dump(deploy_info, f, indent=2)
    
    print("✅ 靜態文件優化完成")

def create_sample_data():
    """創建示例數據用於演示"""
    print("📝 創建示例數據...")
    
    # 示例複雜變化數據
    sample_complex_changes = [
        {
            "complex_id": "116144",
            "complex_name": "頤海大院社區",
            "county": "新北",
            "version_count": 6,
            "min_ratio": 1.0109,
            "max_ratio": 1.5000,
            "max_absolute_change": 0.4890,
            "max_relative_change": 0.3260,
            "avg_absolute_change": 0.2670,
            "avg_relative_change": 0.1987,
            "absolute_change": 0.4890,
            "relative_change": 0.3260,
            "std_dev": 0.1946,
            "version_data": [
                {"version": 246, "ratio": 1.2496, "complex_name": "頤海大院社區", "county": "新北"},
                {"version": 247, "ratio": 1.4254, "complex_name": "頤海大院社區", "county": "新北"},
                {"version": 248, "ratio": 1.1276, "complex_name": "頤海大院社區", "county": "新北"},
                {"version": 249, "ratio": 1.4349, "complex_name": "頤海大院社區", "county": "新北"},
                {"version": 250, "ratio": 1.5000, "complex_name": "頤海大院社區", "county": "新北"},
                {"version": 251, "ratio": 1.0109, "complex_name": "頤海大院社區", "county": "新北"}
            ],
            "period_changes": [
                {"from_version": 246, "to_version": 247, "absolute_change": 0.1758, "relative_change": 0.1407},
                {"from_version": 247, "to_version": 248, "absolute_change": 0.2978, "relative_change": 0.2089},
                {"from_version": 248, "to_version": 249, "absolute_change": 0.3073, "relative_change": 0.2726},
                {"from_version": 249, "to_version": 250, "absolute_change": 0.0651, "relative_change": 0.0453},
                {"from_version": 250, "to_version": 251, "absolute_change": 0.4890, "relative_change": 0.3260}
            ]
        }
        # 可以添加更多示例數據...
    ]
    
    # 生成更多示例數據
    counties = ["台北", "新北", "桃園", "台中", "台南", "高雄", "新竹", "苗栗"]
    for i in range(100):
        sample_complex_changes.append({
            "complex_id": f"sample_{i:04d}",
            "complex_name": f"示例社區{i+1}",
            "county": counties[i % len(counties)],
            "version_count": 6,
            "min_ratio": 0.8 + (i % 20) * 0.01,
            "max_ratio": 1.2 + (i % 30) * 0.01,
            "max_absolute_change": 0.1 + (i % 40) * 0.005,
            "max_relative_change": 0.05 + (i % 50) * 0.003,
            "avg_absolute_change": 0.05 + (i % 20) * 0.002,
            "avg_relative_change": 0.03 + (i % 30) * 0.001,
            "absolute_change": 0.1 + (i % 40) * 0.005,
            "relative_change": 0.05 + (i % 50) * 0.003,
            "std_dev": 0.02 + (i % 15) * 0.003,
            "version_data": [
                {"version": v, "ratio": 1.0 + (i % 10) * 0.01 + (v % 3) * 0.005, 
                 "complex_name": f"示例社區{i+1}", "county": counties[i % len(counties)]}
                for v in range(246, 252)
            ],
            "period_changes": [
                {"from_version": v, "to_version": v+1, 
                 "absolute_change": 0.01 + (i % 20) * 0.002,
                 "relative_change": 0.01 + (i % 15) * 0.001}
                for v in range(246, 251)
            ]
        })
    
    # 寫入文件
    with open('dashboard/data/complex_changes.json', 'w', encoding='utf-8') as f:
        json.dump(sample_complex_changes, f, ensure_ascii=False, indent=2)
    
    # 縣市統計
    county_stats = [
        {"county": county, "complexCount": 12 + i, "averageVolatility": 0.05 + i * 0.01}
        for i, county in enumerate(counties)
    ]
    
    with open('dashboard/data/county_stats.json', 'w', encoding='utf-8') as f:
        json.dump(county_stats, f, ensure_ascii=False, indent=2)
    
    # 版本趨勢
    version_trends = [
        {"version": v, "averageRatio": 1.0 + v * 0.001, "complexCount": 30000 + v * 100}
        for v in range(246, 252)
    ]
    
    with open('dashboard/data/version_trends.json', 'w', encoding='utf-8') as f:
        json.dump(version_trends, f, ensure_ascii=False, indent=2)
    
    print("✅ 示例數據創建完成")

def main():
    """主構建流程"""
    print("🚀 雲端部署構建開始...")
    print("=" * 50)
    
    # 檢查是否有真實數據
    data_file = check_data_file()
    
    if data_file:
        # 有真實數據，運行完整分析
        if run_analysis(data_file):
            print("✅ 使用真實數據完成分析")
        else:
            print("❌ 真實數據分析失敗，使用示例數據")
            create_sample_data()
    else:
        # 沒有真實數據，創建示例數據
        print("📝 創建示例數據用於演示")
        create_sample_data()
    
    # 創建部署配置
    create_static_config()
    
    # 優化靜態文件
    optimize_for_static_hosting()
    
    print("\n🎉 構建完成！")
    print("\n📋 部署指令：")
    print("Vercel: vercel --prod")
    print("Netlify: netlify deploy --prod")
    print("Render: 連接 Git 倉庫並設置 Static Site")
    
    print("\n📊 數據狀態：")
    complex_file = Path('dashboard/data/complex_changes.json')
    if complex_file.exists():
        size_mb = complex_file.stat().st_size / (1024 * 1024)
        data_type = "真實數據" if size_mb > 5 else "示例數據"
        print(f"- 分析數據: {data_type} ({size_mb:.1f}MB)")
    
    print("\n🌐 部署後訪問: /index_modern.html")

if __name__ == "__main__":
    main()