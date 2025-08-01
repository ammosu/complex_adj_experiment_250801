#!/usr/bin/env python3
"""
住宅社區調整率分析系統 - 環境設置腳本
"""

import sys
import subprocess
from pathlib import Path

def create_directories():
    """創建必要的目錄結構"""
    dirs = ['dashboard/data']
    
    for dir_path in dirs:
        Path(dir_path).mkdir(parents=True, exist_ok=True)
        print(f"✓ 創建目錄: {dir_path}")

def install_dependencies():
    """安裝 Python 依賴"""
    try:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'])
        print("✓ Python 依賴安裝完成")
    except subprocess.CalledProcessError:
        print("❌ Python 依賴安裝失敗")
        return False
    return True

def main():
    """主設置流程"""
    print("🏠 住宅社區調整率分析系統 - 環境設置")
    print("=" * 50)
    
    create_directories()
    
    if len(sys.argv) > 1 and sys.argv[1] == '--install-deps':
        install_dependencies()
    
    print("\n🎉 設置完成！")
    print("\n📋 使用方式：")
    print("1. 本地開發: python setup.py --install-deps")
    print("2. 部署構建: python build_for_deployment.py")
    print("3. 啟動前端: cd dashboard && python -m http.server 8000")

if __name__ == "__main__":
    main()