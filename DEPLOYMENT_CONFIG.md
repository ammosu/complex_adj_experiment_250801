# 部署配置指南

## 環境變數設定

系統支援透過環境變數動態配置數據源，無需修改程式碼。

### 🔧 環境變數

| 變數名稱 | 描述 | 預設值 |
|---------|------|-------|
| `HOUSING_DATA_URL` | 住宅數據CSV檔案的URL | S3預設位置 |

### 🚀 部署平台設定

#### Vercel
```bash
# 在 Vercel Dashboard 設定
vercel env add HOUSING_DATA_URL
# 輸入您的S3 URL
```

或使用 Vercel CLI：
```bash
vercel env add HOUSING_DATA_URL production "https://your-bucket.s3.amazonaws.com/your-file.csv"
```

#### Netlify
在 Netlify Dashboard:
1. Site Settings → Environment Variables
2. 新增變數：
   - Key: `HOUSING_DATA_URL`
   - Value: `https://your-bucket.s3.amazonaws.com/your-file.csv`

#### Render
在 Render Dashboard:
1. Service → Environment
2. 新增環境變數：
   - Name: `HOUSING_DATA_URL`
   - Value: `https://your-bucket.s3.amazonaws.com/your-file.csv`

#### GitHub Actions (如果使用)
在 repository secrets 中設定：
```yaml
env:
  HOUSING_DATA_URL: ${{ secrets.HOUSING_DATA_URL }}
```

### 💻 本地開發

複製 `.env.example` 為 `.env`：
```bash
cp .env.example .env
```

編輯 `.env` 檔案設定您的數據源：
```bash
HOUSING_DATA_URL=https://your-bucket.s3.amazonaws.com/your-file.csv
```

### 🔄 前端動態配置

系統支援多種前端配置方式：

#### 1. 全域變數 (最高優先級)
```html
<script>
window.HOUSING_DATA_URL = 'https://your-custom-url.com/data.csv';
</script>
```

#### 2. localStorage (中等優先級)
```javascript
localStorage.setItem('HOUSING_DATA_URL', 'https://your-custom-url.com/data.csv');
```

#### 3. 環境變數 (透過打包工具)
```javascript
// 使用 Vite、Webpack 等打包工具
const dataUrl = import.meta.env.VITE_HOUSING_DATA_URL;
```

### 🧪 測試不同數據源

設定不同的URL來測試：
```bash
# 測試環境
export HOUSING_DATA_URL="https://test-bucket.s3.amazonaws.com/test_data.csv"

# 正式環境  
export HOUSING_DATA_URL="https://prod-bucket.s3.amazonaws.com/complex_ids.csv"

# 本地文件（開發用）
export HOUSING_DATA_URL="./data_backup/complex_ids.csv"
```

### 🛡️ 安全考量

1. **CORS設定**：確保S3 bucket允許來源網域存取
2. **公開讀取**：CSV檔案需設定為公開可讀
3. **HTTPS**：建議使用HTTPS URL確保傳輸安全
4. **URL驗證**：系統會驗證URL格式避免注入攻擊

### 📊 資料格式要求

CSV檔案必須包含以下欄位：
- `name` (社區ID)
- `complex_name` (社區名稱) 
- `county` (縣市)
- `model_version` (模型版本)
- `adj` 或 `ratio` (調整率)
- `std` (標準差，可選)

### 🔍 除錯模式

啟用除錯日誌：
```bash
export DEBUG=true
python3 build_for_deployment.py
```

前端除錯：
```javascript
localStorage.setItem('DEBUG_DATA_LOADER', 'true');
```

### ✅ 驗證設定

執行驗證腳本：
```bash
python3 -c "
import os
url = os.getenv('HOUSING_DATA_URL', 'default')
print(f'數據源URL: {url}')
"
```