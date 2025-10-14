# 🚀 Google Sheets 快速設定指南

## 如何讓 OpenAI 使用您的 Google Sheets 詞彙表

### 步驟 1️⃣：準備 Google Sheets

1. **創建詞彙表**
   - 前往 [Google Sheets](https://sheets.google.com)
   - 創建新試算表，命名為「設計詞彙表」

2. **設定表格格式**（建議）

   | Term | Definition | 中文 |
   |------|-----------|------|
   | Prototype | A preliminary model used for testing | 原型 |
   | Iteration | The process of repeating and refining | 迭代 |
   | User Research | Methods to understand user needs | 使用者研究 |
   | Ergonomics | Study of efficiency in working environment | 人體工學 |
   | Sustainability | Meeting needs without compromising future | 永續性 |

3. **設定為公開**
   - 點擊右上角「共用」
   - 改為「知道連結的任何人」
   - 權限選擇：「檢視者」
   - 點擊「複製連結」

   您會得到類似這樣的連結：
   ```
   https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit?usp=sharing
   ```

### 步驟 2️⃣：在 Vercel 設定環境變數

前往 Vercel Dashboard → 您的專案 → Settings → Environment Variables

添加以下環境變數：

```bash
# OpenAI API Key（必須）
OPENAI_API_KEY=sk-proj-your-actual-key-here

# Google Sheets 公開連結（必須）
VOCABULARY_PDF_URL=https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit?usp=sharing
```

**重要**：勾選所有環境（Production、Preview、Development）

### 步驟 3️⃣：部署

```bash
# 提交並推送
git add .
git commit -m "fix: resolve buffer type error"
git push
```

Vercel 會自動：
1. ✅ 偵測到新的 commit
2. ✅ 重新構建
3. ✅ 從 Google Sheets 下載 PDF
4. ✅ 上傳到 OpenAI
5. ✅ 創建 Assistant
6. ✅ 部署完成！

### 步驟 4️⃣：測試

部署完成後，訪問您的網站並測試：

**測試對話：**
> "請使用專業的設計詞彙來描述產品開發流程"

AI 應該會使用您 Google Sheets 中的詞彙，例如：
- "First, we conduct **user research** to understand needs..."
- "We create multiple **prototypes** for testing..."
- "Through several **iterations**, we refine..."

---

## 🔄 更新詞彙表

### 超簡單的更新流程：

```
1. 在 Google Sheets 中編輯（新增/修改詞彙）
         ↓
2. 在 Vercel Dashboard 刪除環境變數：OPENAI_ASSISTANT_ID
   （讓系統重新創建 Assistant）
         ↓
3. 點擊「Redeploy」
         ↓
4. 系統自動下載最新版本 ✅
```

**不需要：**
- ❌ 手動下載 PDF
- ❌ 提交到 Git
- ❌ 本地設定

---

## 🎯 工作原理

### 系統自動處理流程：

```
您提供的 URL:
https://docs.google.com/spreadsheets/d/ABC123/edit?usp=sharing

         ↓ 系統自動偵測

這是 Google Sheets！轉換為 PDF 導出格式：

         ↓ 自動轉換

https://docs.google.com/spreadsheets/d/ABC123/export?format=pdf

         ↓ 自動下載

下載 PDF 檔案

         ↓ 自動上傳

上傳到 OpenAI Files API

         ↓ 自動創建

創建 Vector Store（檔案索引）

         ↓ 自動關聯

創建 Assistant 並關聯 Vector Store

         ↓ 完成！

OpenAI 可以搜尋您的詞彙表 ✅
```

---

## 💡 為什麼不能直接讀取 Google Sheets？

**OpenAI 限制：**
- OpenAI Assistants API 只支援**上傳檔案**（PDF, TXT, DOCX）
- 不支援直接讀取外部 URL 或 API

**我們的解決方案：**
- ✅ 自動將 Google Sheets 導出為 PDF
- ✅ 自動下載並上傳到 OpenAI
- ✅ 您只需要提供 Google Sheets 連結
- ✅ 所有轉換都在背後自動完成

---

## 📋 環境變數說明

### 必要變數：

```bash
# OpenAI API Key
OPENAI_API_KEY=sk-proj-xxxxx

# 詞彙表來源（三選一）：

# 選項 1：Google Sheets（推薦）
VOCABULARY_PDF_URL=https://docs.google.com/spreadsheets/d/ABC123/edit

# 選項 2：GitHub PDF
VOCABULARY_PDF_URL=https://raw.githubusercontent.com/username/repo/main/vocab.pdf

# 選項 3：已創建的 Assistant ID
OPENAI_ASSISTANT_ID=asst_xxxxxxxxxxxxx
```

### 優先順序：

1. 如果設定了 `OPENAI_ASSISTANT_ID` → 直接使用
2. 如果設定了 `VOCABULARY_PDF_URL` → 自動下載並創建 Assistant
3. 都沒有 → 顯示錯誤訊息

---

## 🔍 查看日誌

### 確認系統是否正確下載 Google Sheets：

1. 前往 Vercel Dashboard
2. 點擊您的專案
3. 前往「Deployments」
4. 點擊最新的部署
5. 查看「Function Logs」

您應該會看到：
```
📥 下載 URL: https://docs.google.com/spreadsheets/d/.../export?format=pdf
✅ 檔案下載完成 (45.23 KB)
✅ PDF 檔案已上傳到 OpenAI: file-xxxxx
✅ Vector Store 已創建: vs_xxxxx
✅ Assistant 已創建: asst_xxxxx
```

---

## ⚠️ 常見問題

### ❌ 錯誤：下載檔案失敗 (403)

**原因：** Google Sheets 權限設定錯誤

**解決：**
1. 開啟您的 Google Sheet
2. 點擊「共用」
3. 確認設定為：「知道連結的任何人」→「檢視者」
4. 重新部署

### ❌ 錯誤：Assistant 創建失敗

**原因：** OpenAI API Key 無效或配額不足

**解決：**
1. 確認 `OPENAI_API_KEY` 正確
2. 檢查 [OpenAI Usage](https://platform.openai.com/usage)
3. 確認有足夠的配額

### ❌ AI 沒有使用詞彙表

**原因：** Assistant 可能使用舊版本

**解決：**
1. 在 Vercel 刪除 `OPENAI_ASSISTANT_ID` 環境變數
2. 重新部署（系統會創建新的 Assistant）
3. 測試對話

---

## 🎉 完成！

現在您可以：
- ✅ 直接提供 Google Sheets 公開連結
- ✅ 系統自動處理所有轉換
- ✅ OpenAI 自動搜尋您的詞彙表
- ✅ 在對話中使用專業術語
- ✅ 隨時在 Google Sheets 更新詞彙

**提示：** 建議將 Assistant ID 記錄下來，加入環境變數，避免每次都重新創建。

---

需要幫助？查看其他文件：
- `README.md` - 完整專案說明
- `GOOGLE-SHEETS-SETUP.md` - 詳細設定指南
- `FIX-DEPLOYMENT-ERROR.md` - 錯誤排解

