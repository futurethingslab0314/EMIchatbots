# 🚀 Vercel 部署完整指南

本文件說明如何將 EMI-DEW 教練成功部署到 Vercel，包含 PDF 詞彙表整合。

## ⚠️ 重要：部署前必須完成本地設定

在部署到 Vercel 之前，**必須先在本地完成 Assistant 設定**，因為：
- PDF 上傳需要檔案系統存取（Vercel 構建環境不支援）
- Assistant 只需要創建一次，之後可重複使用

## 📋 部署前檢查清單

- [ ] 已安裝 Node.js 和 npm
- [ ] 已取得 OpenAI API Key
- [ ] `vocabularylist.pdf` 在專案根目錄
- [ ] 已在本地執行 `npm run setup-assistant`
- [ ] 已取得 `OPENAI_ASSISTANT_ID`
- [ ] 已將專案推送到 GitHub

## 🎯 部署步驟

### 步驟 1：本地設定 Assistant（必須！）

```bash
# 1. 安裝依賴
npm install

# 2. 設定環境變數
echo "OPENAI_API_KEY=sk-proj-your-key-here" > .env.local

# 3. 啟動開發伺服器
npm run dev

# 4. 在新終端執行設定（重要！）
npm run setup-assistant
```

您會看到類似輸出：
```
✅ Assistant 設定完成！

請將以下環境變數加入 .env.local：
OPENAI_ASSISTANT_ID=asst_xxxxxxxxxxxxx

📊 Assistant 資訊：
- Assistant ID: asst_xxxxxxxxxxxxx
- Vector Store ID: vs_xxxxxxxxxxxxx
- File ID: file-xxxxxxxxxxxxx
```

**複製這個 `asst_xxxxxxxxxxxxx` ID，稍後會用到！**

### 步驟 2：更新本地環境變數

將 Assistant ID 加入 `.env.local`：

```bash
OPENAI_API_KEY=sk-proj-your-key-here
OPENAI_ASSISTANT_ID=asst_xxxxxxxxxxxxx
```

測試本地是否正常運作：
```bash
# 重啟開發伺服器
npm run dev
```

訪問 http://localhost:3000，測試語音對話功能。

### 步驟 3：推送到 GitHub

```bash
# 初始化 Git（如果還沒有）
git init

# 添加所有檔案
git add .

# 提交（注意：.env.local 不會被提交，因為在 .gitignore 中）
git commit -m "feat: EMI-DEW chatbot with PDF vocabulary integration"

# 連結到 GitHub 倉庫
git remote add origin https://github.com/your-username/EMIchatbots.git

# 推送
git branch -M main
git push -u origin main
```

### 步驟 4：在 Vercel 建立專案

1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 點擊「Add New...」→「Project」
3. 選擇「Import Git Repository」
4. 找到您的 `EMIchatbots` 倉庫
5. 點擊「Import」

### 步驟 5：設定環境變數（關鍵！）

在 Vercel 專案設定中：

1. **Build & Development Settings**（保持預設即可）
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`

2. **Environment Variables**（重要！）

   點擊「Environment Variables」，添加：

   **變數 1：**
   - Name: `OPENAI_API_KEY`
   - Value: `sk-proj-your-actual-key-here`
   - Environment: ✅ Production, ✅ Preview, ✅ Development

   **變數 2：**
   - Name: `OPENAI_ASSISTANT_ID`
   - Value: `asst_xxxxxxxxxxxxx` （步驟 1 取得的 ID）
   - Environment: ✅ Production, ✅ Preview, ✅ Development

3. 點擊「Deploy」

### 步驟 6：等待部署完成

部署過程約 2-3 分鐘。您會看到：
```
✅ Build Complete
✅ Deployment Ready
```

### 步驟 7：測試部署

1. 點擊 Vercel 提供的部署網址（例如：`https://emi-chatbots.vercel.app`）
2. 測試功能：
   - ✅ 上傳圖片
   - ✅ 錄音功能
   - ✅ 語音識別
   - ✅ AI 回覆（應使用詞彙表術語）
   - ✅ 語音播放

## 🔍 驗證 PDF 詞彙表是否正常運作

測試對話：

**測試 1：**
> 「請使用設計詞彙來描述產品開發流程」

AI 應該使用如 "prototype", "iteration", "user research" 等術語。

**測試 2：完成完整的 pitch 練習**

最終講稿應包含：
```
---
Vocabulary from Design Vocabulary List:
1. Prototype - ...
2. Iteration - ...
...
```

## 🛠️ 疑難排解

### ❌ 錯誤：未設定 OPENAI_ASSISTANT_ID

**症狀：** 網站顯示「未設定 OPENAI_ASSISTANT_ID 環境變數」

**解決：**
1. 確認 Vercel 環境變數是否已設定
2. 檢查變數名稱是否正確（區分大小寫）
3. 重新部署：Deployments → 最新部署 → Redeploy

### ❌ 錯誤：無法取得 Assistant

**症狀：** 「無法取得 Assistant (ID: asst_xxx)」

**原因：** Assistant ID 不正確或已被刪除

**解決：**
1. 在本地重新執行 `npm run setup-assistant`
2. 取得新的 Assistant ID
3. 更新 Vercel 環境變數
4. 重新部署

### ❌ 錯誤：Type error: Property 'vectorStores' does not exist

**原因：** OpenAI SDK 版本過舊

**解決：**
```bash
# 確認 package.json 中的 openai 版本 >= 4.67.0
npm install openai@latest
git add package.json package-lock.json
git commit -m "chore: update openai sdk"
git push
```

Vercel 會自動重新部署。

### ❌ 麥克風無法使用

**原因：** 瀏覽器權限問題

**解決：**
1. 確認網站使用 HTTPS（Vercel 自動提供）
2. 在瀏覽器設定中允許麥克風權限
3. 使用 Chrome 或 Edge 瀏覽器

### ❌ API 呼叫逾時

**原因：** Vercel Hobby 方案限制 10 秒

**解決方案：**
1. 升級到 Vercel Pro 方案（$20/月，支援 60 秒逾時）
2. 或優化 prompt 以減少回應時間

## 📊 監控與維護

### 查看即時日誌

在 Vercel Dashboard：
- 專案頁面 → Functions → 查看 API 呼叫日誌
- Deployments → 選擇部署 → Function Logs

### 查看 OpenAI 使用量

1. 前往 [OpenAI Usage](https://platform.openai.com/usage)
2. 監控 API 呼叫次數和費用
3. 設定使用限額警報

### 更新詞彙表

如果需要更新 `vocabularylist.pdf`：

```bash
# 1. 在本地更新 PDF 檔案
# 2. 重新執行設定
npm run setup-assistant

# 3. 更新 Vercel 環境變數中的 OPENAI_ASSISTANT_ID
# 4. 重新部署
```

## 💰 成本估算

### Vercel 費用
- **Hobby 方案**：免費
  - 100 GB 頻寬
  - 100 GB-Hrs 執行時間
  - 限制：10 秒 Function 逾時

- **Pro 方案**：$20/月
  - 1 TB 頻寬
  - 1000 GB-Hrs 執行時間
  - 60 秒 Function 逾時

### OpenAI API 費用（每次對話）
- Whisper：$0.03
- GPT-4o：$0.05
- TTS：$0.015
- Assistants（檔案搜尋）：< $0.01
- **總計**：約 $0.10/次對話

**每月估算（100 次對話）**：約 $10

### 檔案儲存費用
- Vector Store：$0.10/GB/day
- `vocabularylist.pdf`（約 1MB）：幾乎可忽略

## 🔐 安全性最佳實踐

- [x] API Key 儲存在環境變數
- [x] `.env.local` 在 `.gitignore` 中
- [x] 使用 HTTPS（Vercel 自動）
- [ ] 實作使用者認證（建議）
- [ ] 設定 API 使用限額
- [ ] 定期輪換 API Key

## 🚀 自訂網域（選用）

1. 在 Vercel Dashboard → Settings → Domains
2. 輸入您的網域（例如：`chatbot.yourschool.edu`）
3. 按照指示設定 DNS 記錄：
   - Type: `CNAME`
   - Name: `chatbot`
   - Value: `cname.vercel-dns.com`
4. 等待 DNS 傳播（5-10 分鐘）

## 📝 持續部署（CD）

設定完成後，每次推送到 GitHub 都會自動部署：

```bash
# 修改程式碼後
git add .
git commit -m "feat: add new feature"
git push

# Vercel 會自動：
# 1. 偵測到新的 commit
# 2. 執行構建
# 3. 部署新版本
# 4. 提供預覽 URL
```

## ✅ 完成檢查清單

部署成功後，確認：

- [ ] 網站可正常訪問
- [ ] 圖片上傳功能正常
- [ ] 麥克風錄音功能正常
- [ ] 語音識別正確（中英文）
- [ ] AI 回覆包含專業術語
- [ ] 語音播放正常
- [ ] 字幕即時顯示
- [ ] 對話歷史正確記錄
- [ ] 在行動裝置上可使用

## 🎉 完成！

恭喜！您已成功部署 EMI-DEW 設計英語教練到 Vercel。

現在您可以：
- 分享網址給學生使用
- 收集使用者回饋
- 根據需求調整 prompt
- 添加新功能

---

有任何問題，請參考 `README.md` 或 `SETUP-PDF.md`。

