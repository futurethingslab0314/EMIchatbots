# 📦 從 GitHub 使用 PDF 詞彙表

本文件說明如何將 PDF 放在 GitHub 上，讓系統自動下載並使用，**無需本地設定**！

## 🎯 優點

使用 GitHub 託管 PDF 的好處：

- ✅ **不需要本地設定**：直接在 Vercel 上自動完成
- ✅ **版本控制**：PDF 變更會被 Git 追蹤
- ✅ **團隊協作**：其他人可以更新詞彙表
- ✅ **自動化**：首次部署時自動下載並設定
- ✅ **易於更新**：修改 PDF 後重新部署即可

## 🚀 設定步驟

### 方法 1：將 PDF 放在同一個 GitHub 倉庫（推薦）

#### 步驟 1：提交 PDF 到 GitHub

```bash
# 確保 vocabularylist.pdf 在專案根目錄
git add vocabularylist.pdf
git commit -m "feat: add vocabulary PDF"
git push
```

#### 步驟 2：取得 PDF 的 Raw URL

在 GitHub 上：
1. 打開您的倉庫
2. 點擊 `vocabularylist.pdf`
3. 點擊「Raw」按鈕
4. 複製網址，格式如：

```
https://github.com/username/EMIchatbots/raw/main/vocabularylist.pdf
```

或使用 GitHub Raw Content CDN：
```
https://raw.githubusercontent.com/username/EMIchatbots/main/vocabularylist.pdf
```

#### 步驟 3：在 Vercel 設定環境變數

在 Vercel Dashboard → Settings → Environment Variables：

**方案 A：自動創建 Assistant（簡單）**

只需設定：
- Key: `VOCABULARY_PDF_URL`
- Value: `https://raw.githubusercontent.com/username/EMIchatbots/main/vocabularylist.pdf`
- Environment: Production, Preview, Development

系統會在首次啟動時自動：
1. 從 GitHub 下載 PDF
2. 上傳到 OpenAI
3. 創建 Assistant
4. 在日誌中顯示 Assistant ID（建議記錄下來）

**方案 B：手動創建 Assistant（推薦）**

先設定 PDF URL，再手動創建一次（更可控）：

1. 設定環境變數：
   ```
   OPENAI_API_KEY=sk-proj-your-key
   VOCABULARY_PDF_URL=https://raw.githubusercontent.com/username/EMIchatbots/main/vocabularylist.pdf
   ```

2. 部署後，訪問：
   ```
   https://your-app.vercel.app/api/setup-assistant
   ```
   使用 POST 請求（或在本地執行一次）

3. 將返回的 Assistant ID 加入環境變數：
   ```
   OPENAI_ASSISTANT_ID=asst_xxxxxxxxxxxxx
   ```

4. 重新部署

#### 步驟 4：部署

```bash
git push
```

Vercel 會自動部署，系統會從 GitHub 下載 PDF。

---

### 方法 2：使用單獨的 GitHub 倉庫

如果您想將詞彙表放在單獨的倉庫（例如共用給多個專案）：

#### 步驟 1：創建專用倉庫

```bash
# 創建新倉庫
mkdir vocabulary-repo
cd vocabulary-repo
git init

# 添加 PDF
cp /path/to/vocabularylist.pdf .
git add vocabularylist.pdf
git commit -m "Initial commit: vocabulary list"

# 推送到 GitHub
git remote add origin https://github.com/username/design-vocabulary.git
git push -u origin main
```

#### 步驟 2：取得 Raw URL

格式：
```
https://raw.githubusercontent.com/username/design-vocabulary/main/vocabularylist.pdf
```

#### 步驟 3：在 EMI-DEW 專案設定環境變數

同方法 1 的步驟 3。

---

### 方法 3：使用 GitHub Gist（適合小檔案）

如果 PDF 不大（< 100MB），可以使用 Gist：

1. 前往 https://gist.github.com/
2. 拖曳上傳 `vocabularylist.pdf`
3. 創建 Public Gist
4. 點擊「Raw」取得 URL
5. 設定環境變數

---

## 📝 環境變數設定總覽

### 最簡單的方式（自動創建）

```bash
# Vercel 環境變數
OPENAI_API_KEY=sk-proj-xxxxx
VOCABULARY_PDF_URL=https://raw.githubusercontent.com/username/EMIchatbots/main/vocabularylist.pdf
```

系統會在首次啟動時自動創建 Assistant。

### 推薦方式（手動控制）

```bash
# Vercel 環境變數
OPENAI_API_KEY=sk-proj-xxxxx
OPENAI_ASSISTANT_ID=asst_xxxxxxxxxxxxx  # 手動創建後設定
```

這樣更穩定，不會重複創建 Assistant。

### 混合方式（最彈性）

```bash
# Vercel 環境變數
OPENAI_API_KEY=sk-proj-xxxxx
VOCABULARY_PDF_URL=https://raw.githubusercontent.com/username/EMIchatbots/main/vocabularylist.pdf
OPENAI_ASSISTANT_ID=asst_xxxxxxxxxxxxx  # 有 ID 時優先使用，沒有時自動創建
```

---

## 🔄 更新 PDF 詞彙表

### 如果使用 Assistant ID（推薦）

```bash
# 1. 更新 PDF
git add vocabularylist.pdf
git commit -m "update: vocabulary list"
git push

# 2. 重新創建 Assistant
# 訪問 /api/setup-assistant 或在本地執行：
curl -X POST https://your-app.vercel.app/api/setup-assistant \
  -H "Content-Type: application/json" \
  -d '{"pdfUrl": "https://raw.githubusercontent.com/username/EMIchatbots/main/vocabularylist.pdf"}'

# 3. 更新 Vercel 環境變數中的 OPENAI_ASSISTANT_ID
# 4. 重新部署
```

### 如果使用自動創建

```bash
# 1. 更新 PDF
git add vocabularylist.pdf
git commit -m "update: vocabulary list"
git push

# 2. 刪除 Vercel 環境變數中的 OPENAI_ASSISTANT_ID（如果有）
# 3. 重新部署
# 系統會自動下載新 PDF 並創建新 Assistant
```

---

## 🎨 使用 API 手動觸發設定

### 使用 curl

```bash
# 從 GitHub URL 創建
curl -X POST http://localhost:3000/api/setup-assistant \
  -H "Content-Type: application/json" \
  -d '{
    "pdfUrl": "https://raw.githubusercontent.com/username/EMIchatbots/main/vocabularylist.pdf"
  }'
```

### 使用 Postman 或瀏覽器

訪問：
```
POST https://your-app.vercel.app/api/setup-assistant

Body (JSON):
{
  "pdfUrl": "https://raw.githubusercontent.com/username/EMIchatbots/main/vocabularylist.pdf"
}
```

---

## 📊 方案比較

| 方案 | 優點 | 缺點 | 適合情境 |
|------|------|------|---------|
| **本地設定** | 不依賴網路、快速 | 需要本地檔案 | 開發測試 |
| **GitHub 同倉庫** | 版本控制、自動化 | PDF 在 Git 歷史中 | 單一專案 |
| **GitHub 單獨倉庫** | 可共用、權限分離 | 需管理多個倉庫 | 多專案共用 |
| **GitHub Gist** | 簡單快速 | 檔案大小限制 | 小型 PDF |
| **自動創建** | 零設定、即開即用 | 可能重複創建 | 快速原型 |
| **手動創建** | 穩定可控 | 需手動執行一次 | 生產環境 |

---

## ⚠️ 注意事項

### 1. GitHub URL 必須是 Raw 格式

❌ 錯誤：
```
https://github.com/username/repo/blob/main/vocabularylist.pdf
```

✅ 正確：
```
https://raw.githubusercontent.com/username/repo/main/vocabularylist.pdf
```

或使用「Raw」按鈕取得的 URL。

### 2. 私有倉庫需要 Token

如果 PDF 在私有倉庫：

```bash
# 創建 GitHub Personal Access Token
# Settings → Developer settings → Personal access tokens → Generate new token
# 權限：repo (Full control of private repositories)

# 使用 Token 的 URL 格式：
https://YOUR_TOKEN@raw.githubusercontent.com/username/repo/main/vocabularylist.pdf

# 或設定環境變數：
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
VOCABULARY_PDF_URL=https://raw.githubusercontent.com/username/repo/main/vocabularylist.pdf
```

然後在代碼中處理認證（需要修改 `lib/assistant.ts` 的 `downloadFileFromUrl` 函數）。

### 3. 檔案大小限制

- GitHub 單檔限制：100 MB
- OpenAI Assistants 上傳限制：512 MB
- 建議 PDF 大小：< 10 MB（更快下載和處理）

### 4. 避免重複創建 Assistant

每次創建 Assistant 都會：
- 上傳新的 PDF 副本（佔用 OpenAI 儲存空間）
- 產生費用（雖然很少）

**建議**：創建一次後，將 `OPENAI_ASSISTANT_ID` 加入環境變數，避免重複創建。

---

## 🔍 驗證設定

### 檢查環境變數

```bash
# 在 Vercel Dashboard → Settings → Environment Variables
# 確認已設定：
OPENAI_API_KEY=sk-proj-xxxxx
VOCABULARY_PDF_URL=https://raw.githubusercontent.com/...
# 或
OPENAI_ASSISTANT_ID=asst_xxxxx
```

### 檢查 PDF URL 是否可訪問

```bash
curl -I https://raw.githubusercontent.com/username/EMIchatbots/main/vocabularylist.pdf

# 應該返回：
HTTP/2 200
content-type: application/pdf
```

### 檢查 Assistant 是否正常

在對話中測試：
> "請使用詞彙表中的術語描述產品設計流程"

AI 應該使用 PDF 中的專業術語。

---

## 💡 最佳實踐

1. **使用版本標籤**
   ```
   https://raw.githubusercontent.com/username/repo/v1.0.0/vocabularylist.pdf
   ```
   這樣可以鎖定特定版本，避免意外變更。

2. **記錄 Assistant ID**
   創建 Assistant 後，將 ID 記錄在專案文件或環境變數中。

3. **定期清理舊 Assistants**
   在 [OpenAI Dashboard](https://platform.openai.com/assistants) 刪除不用的 Assistant。

4. **使用 GitHub Actions 自動化**
   當 PDF 更新時，自動觸發重新創建 Assistant（進階）。

---

## 🎉 完成！

現在您可以：
- ✅ 將 PDF 放在 GitHub，無需本地設定
- ✅ 在 Vercel 上自動下載並使用
- ✅ 透過 Git 管理詞彙表版本
- ✅ 輕鬆與團隊協作

有任何問題，請參考 `README.md` 或 `SETUP-PDF.md`。

