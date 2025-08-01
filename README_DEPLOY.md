# 🏠 住宅社區調整率分析系統

一個用於分析台灣住宅社區在不同模型版本間調整率變化的現代化Web系統。

![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)
![Frontend](https://img.shields.io/badge/Frontend-Vanilla%20JS-yellow.svg)
![Deployment](https://img.shields.io/badge/Deploy-Vercel%20%7C%20Netlify%20%7C%20Render-green.svg)

## ✨ 功能特色

- 🗺️ **互動式台灣地圖** - 地理分布視覺化
- 📊 **多維度圖表分析** - 時間序列、統計分布、散點圖
- 🔍 **智能搜尋篩選** - 支援中文搜尋和多條件過濾
- 📱 **響應式設計** - 支援桌面、平板、手機
- ⚡ **現代化前端** - Bootstrap 5 + 原生JavaScript
- 🚀 **一鍵部署** - 支援主流雲端平台

## 🎯 演算法特點

- **期間變化分析** - 分析相鄰版本間的調整率變化（非最大最小值差異）
- **缺值處理** - 自動將缺失調整率補為1.0
- **多指標評估** - 最大/平均期間變化、相對/絕對變化、標準差
- **穩定性分類** - 基於標準差閾值的穩定性評估

## 🚀 快速部署

### Vercel (推薦)
```bash
git clone <this-repo>
cd housing-complex-analysis
vercel --prod
```

### Netlify
```bash
git clone <this-repo>
cd housing-complex-analysis
netlify deploy --prod --dir=dashboard
```

### Render
1. 連接此Git倉庫
2. 選擇 Static Site
3. Build Command: `python build_for_deployment.py`
4. Publish Directory: `dashboard`

## 📊 使用真實數據

```bash
# 1. 準備數據文件
cp your_complex_ids.csv ./complex_ids.csv

# 2. 運行分析並構建
python build_for_deployment.py

# 3. 推送更新
git add dashboard/data/
git commit -m "Update with real data"
git push
```

## 🏗️ 本地開發

```bash
# 1. 克隆項目
git clone <this-repo>
cd housing-complex-analysis

# 2. 安裝依賴
pip install -r requirements.txt

# 3. 運行分析（需要 complex_ids.csv）
python analyze_complex_changes.py --output-format both

# 4. 啟動前端
cd dashboard
python -m http.server 8000
```

## 📁 專案結構

```
📁 住宅社區調整率分析系統/
├── 🐍 Python 分析工具
│   ├── analyze_complex_changes.py     # 主分析腳本（改進算法）
│   ├── detailed_analysis.py           # 詳細統計分析
│   └── generate_dashboard_data.py     # 數據導出工具
├── 🌐 現代化Web前端
│   ├── dashboard/index_modern.html    # 主介面
│   ├── dashboard/js/modern-*.js       # JavaScript模組
│   ├── dashboard/css/modern-*.css     # 現代化樣式
│   └── dashboard/data/                # 分析結果（部署時生成）
├── 🚀 部署配置
│   ├── build_for_deployment.py        # 部署構建腳本
│   ├── vercel.json                    # Vercel配置
│   ├── netlify.toml                   # Netlify配置
│   └── docker-compose.yml             # Docker配置
└── 📚 文檔
    ├── README.md                      # 本文件
    ├── CLAUDE.md                      # 技術文檔
    └── deploy_instructions.md         # 詳細部署指南
```

## 🔧 技術棧

- **後端分析**: Python 3.11+, pandas, numpy, scipy
- **前端**: HTML5/CSS3/JavaScript ES6+, Bootstrap 5
- **圖表**: Chart.js v4+, D3.js v7+ (互動式)
- **地圖**: Leaflet.js v1.9+
- **部署**: Docker, Vercel, Netlify, Render

## 📈 分析範圍

- **數據量**: ~200K 記錄，33K+ 社區
- **模型版本**: 246-251（6個版本）
- **地理範圍**: 台灣各縣市
- **核心發現**: 96.4%社區穩定，4%極端波動

## 🤝 貢獻

歡迎提交Issue和Pull Request來改進這個項目！

## 📄 授權

MIT License - 詳見LICENSE文件

---

**立即體驗**: [Live Demo](your-deployed-url) | **技術文檔**: [CLAUDE.md](CLAUDE.md) | **部署指南**: [deploy_instructions.md](deploy_instructions.md)