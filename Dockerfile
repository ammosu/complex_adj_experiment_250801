# 住宅社區調整率分析系統 - Docker 配置
FROM python:3.11-slim

# 設置工作目錄
WORKDIR /app

# 安裝系統依賴
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 複製依賴文件
COPY requirements.txt .

# 安裝 Python 依賴
RUN pip install --no-cache-dir -r requirements.txt

# 複製專案文件
COPY . .

# 運行設置腳本
RUN python setup.py

# 暴露端口
EXPOSE 8000

# 創建啟動腳本
RUN echo '#!/bin/bash\n\
echo "🏠 住宅社區調整率分析系統"\n\
echo "正在啟動前端服務..."\n\
cd dashboard\n\
python -m http.server 8000 --bind 0.0.0.0\n\
' > /app/start.sh && chmod +x /app/start.sh

# 默認命令
CMD ["/app/start.sh"]