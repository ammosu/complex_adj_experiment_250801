# 部署環境變數設置指南

## 概述

為了讓系統能夠自動下載和處理分析數據，您需要在部署平台設置以下環境變數。這些環境變數指向存放在 S3 的數據文件。

## 必要環境變數

### 1. HOUSING_DATA_URL
- **用途**: 主要的社區調整率數據源
- **格式**: S3 URL
- **範例**: `https://your-bucket.s3.region.amazonaws.com/path/to/complex_ids.csv`

### 2. VALUATION_DATA_URL  
- **用途**: 社區原始估價比較數據源（用於誤差分析）
- **格式**: S3 URL  
- **範例**: `https://your-bucket.s3.region.amazonaws.com/path/to/社區原始估價比較.csv`

## 各平台設置方式

### Docker 環境
```bash
docker run -e HOUSING_DATA_URL="your-s3-url" -e VALUATION_DATA_URL="your-valuation-s3-url" your-image
```

### Vercel
1. 進入 Vercel Dashboard
2. 選擇您的專案
3. 前往 Settings → Environment Variables
4. 添加以下變數：
   - `HOUSING_DATA_URL`: 您的主數據 S3 URL
   - `VALUATION_DATA_URL`: 您的估值數據 S3 URL

### Netlify
1. 進入 Netlify Dashboard
2. 選擇您的網站
3. 前往 Site Settings → Environment Variables  
4. 添加以下變數：
   - `HOUSING_DATA_URL`: 您的主數據 S3 URL
   - `VALUATION_DATA_URL`: 您的估值數據 S3 URL

### Render
1. 進入 Render Dashboard
2. 選擇您的服務
3. 前往 Environment 設定
4. 添加以下變數：
   - `HOUSING_DATA_URL`: 您的主數據 S3 URL
   - `VALUATION_DATA_URL`: 您的估值數據 S3 URL

### Railway/其他平台
類似地在環境變數設定區域添加上述兩個變數。

## 資料安全注意事項

⚠️ **重要安全提醒**：

1. **不要將真實的 S3 URL 寫入程式碼**
2. **僅透過環境變數設定**
3. **確保 S3 bucket 有適當的訪問控制**
4. **定期檢查和更新訪問權限**

## 構建流程

設置環境變數後，系統將自動：

1. **檢查本地數據文件**（開發模式）
2. **下載遠端 S3 數據**（生產模式）
3. **運行完整分析**：
   - 主分析（complex changes）
   - 詳細分析（county stats, version trends）
   - 估值誤差分析（如果有估值數據）
4. **生成前端 JSON 文件**
5. **啟動 Web 服務**

## 故障排除

### 如果數據下載失敗
- 檢查環境變數是否正確設定
- 確認 S3 URL 可公開訪問
- 檢查網路連線

### 如果估值分析未執行
- 確認 `VALUATION_DATA_URL` 環境變數已設定
- 檢查估值 CSV 文件格式是否正確
- 查看構建日誌中的錯誤訊息

### 如果部署失敗
- 檢查所有環境變數是否都已設定
- 確認 S3 文件存在且可下載
- 查看完整的部署日誌

## 測試環境變數

可以使用以下腳本測試環境變數和數據下載：

```bash
# 測試主數據
curl -I "$HOUSING_DATA_URL"

# 測試估值數據  
curl -I "$VALUATION_DATA_URL"
```

## 本地開發

在本地開發時，您可以：

1. 創建 `.env` 文件（請不要提交到 Git）
2. 設定環境變數：
   ```
   HOUSING_DATA_URL=https://your-s3-url/complex_ids.csv
   VALUATION_DATA_URL=https://your-s3-url/社區原始估價比較.csv
   ```
3. 或直接將 CSV 文件放在專案根目錄

---

📝 **提醒**: 此文檔包含部署配置信息，但不包含實際的 S3 URL，請根據您的實際情況設置環境變數。