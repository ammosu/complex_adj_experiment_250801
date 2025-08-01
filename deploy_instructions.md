# 🌐 雲端部署完整指南

## 🎯 部署策略

由於雲端平台通常不支援運行時數據處理，我們採用**構建時數據處理**策略：

### 方案 1: 本地構建 + 靜態部署 (推薦)
```bash
# 1. 準備真實數據
cp /path/to/your/complex_ids.csv ./

# 2. 運行構建腳本
python build_for_deployment.py

# 3. 推送到 Git
git add .
git commit -m "Add generated data for deployment"
git push

# 4. 部署到雲端平台
```

### 方案 2: 示例數據演示
```bash
# 1. 直接構建示例數據
python build_for_deployment.py

# 2. 推送和部署
git add dashboard/data/
git commit -m "Add sample data for demo"
git push
```

## 🚀 具體平台部署

### Vercel 部署

1. **推送代碼**
```bash
git push origin main
```

2. **Vercel 設置**
- 連接 GitHub 倉庫
- Framework Preset: `Other`
- Root Directory: `./`
- Build Command: `python build_for_deployment.py`
- Output Directory: `dashboard`

3. **環境變量** (可選)
```bash
PYTHON_VERSION=3.11
```

### Render 部署

1. **創建 Static Site**
- Repository: 您的 GitHub 倉庫
- Branch: `main`
- Build Command: `python build_for_deployment.py`
- Publish Directory: `dashboard`

### Netlify 部署

1. **本地設置**
```bash
npm install -g netlify-cli
netlify login
```

2. **部署**
```bash
python build_for_deployment.py
netlify deploy --prod --dir=dashboard
```

## 📊 數據處理流程

### 真實數據流程
```mermaid
graph LR
    A[上傳 CSV] --> B[運行分析]
    B --> C[生成 JSON]
    C --> D[推送到 Git]
    D --> E[雲端部署]
```

### 示例數據流程
```mermaid
graph LR
    A[運行構建腳本] --> B[生成示例數據]
    B --> C[創建 JSON]
    C --> D[推送到 Git]
    D --> E[雲端部署]
```

## 🔧 自動化構建

### GitHub Actions (推薦)

創建 `.github/workflows/deploy.yml`：

```yaml
name: Build and Deploy

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      run: |
        pip install -r requirements.txt
    
    - name: Build for deployment
      run: |
        python build_for_deployment.py
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.ORG_ID }}
        vercel-project-id: ${{ secrets.PROJECT_ID }}
        working-directory: dashboard
```

## 📁 部署後的文件結構

```
雲端部署/
├── index_modern.html        # 主頁面
├── js/                      # JavaScript 模組  
├── css/                     # 樣式文件
└── data/                    # 分析數據
    ├── complex_changes.json # 主要分析結果
    ├── county_stats.json    # 縣市統計
    ├── version_trends.json  # 版本趨勢
    ├── taiwan_map.geojson   # 台灣地圖
    └── deploy_info.json     # 部署信息
```

## 🔄 更新數據流程

### 定期更新 (推薦)
```bash
# 1. 準備新數據
cp new_complex_ids.csv ./complex_ids.csv

# 2. 重新構建
python build_for_deployment.py

# 3. 提交更新
git add dashboard/data/
git commit -m "Update data: $(date +%Y-%m-%d)"
git push

# 4. 自動重新部署 (通過 webhook)
```

### 手動更新
- 下載新的 CSV 數據
- 本地運行 `build_for_deployment.py`
- 推送更新的 JSON 文件

## 💡 最佳實踐

### 數據管理
- ✅ 真實數據放在本地，不推送到 Git
- ✅ 只推送生成的 JSON 結果 (壓縮後)
- ✅ 定期備份重要分析結果
- ✅ 使用版本標記追蹤數據更新

### 性能優化
- ✅ 壓縮大型 JSON 文件
- ✅ 使用 CDN 加速靜態資源
- ✅ 啟用 Gzip 壓縮
- ✅ 設置適當的快取標頭

### 安全考量
- ✅ 不在 Git 中包含原始 CSV 數據
- ✅ 清理任何敏感信息
- ✅ 使用環境變量管理密鑰
- ✅ 定期更新依賴項

## 🎯 部署檢查清單

部署前確認：
- [ ] 運行 `python pre-commit-check.py` ✅
- [ ] 運行 `python build_for_deployment.py` ✅ 
- [ ] 檢查 `dashboard/data/` 中有必要的 JSON 文件
- [ ] 測試本地前端頁面載入正常
- [ ] 確認沒有推送大型文件 (<10MB)

部署後驗證：
- [ ] 前端頁面正常載入
- [ ] 圖表和地圖顯示正常
- [ ] 搜尋和篩選功能正常
- [ ] 數據統計正確顯示
- [ ] 響應式設計在手機上正常

## 🚨 常見問題

**Q: 部署後圖表不顯示？**
A: 檢查 `dashboard/data/*.json` 文件是否存在且格式正確。

**Q: 如何使用真實數據？**
A: 將 `complex_ids.csv` 放在專案根目錄，運行 `build_for_deployment.py`。

**Q: 如何更新線上數據？**
A: 重新運行構建腳本，提交新的 JSON 文件並推送。

**Q: 部署的應用程式大小？**
A: 通常 < 50MB，主要是 JSON 數據文件。

## 🎉 完成部署！

現在您的住宅社區調整率分析系統可以部署到任何靜態托管平台，並且具備：

- ✅ **真實數據支援** - 本地構建，雲端展示
- ✅ **示例數據演示** - 無需真實數據即可展示功能  
- ✅ **自動化部署** - 一鍵更新數據和代碼
- ✅ **多平台支援** - Vercel/Render/Netlify 等
- ✅ **完整功能** - 圖表、地圖、搜尋、統計全部正常