# PDF 詞彙表整合設定指南

本文件說明如何將 `vocabularylist.pdf` 整合到 EMI-DEW 教練系統中。

## 📋 概述

系統使用 **OpenAI Assistants API** 搭配 **File Search** 功能，讓 AI 教練能夠：
- 自動搜尋 PDF 中的設計詞彙
- 在生成講稿時優先使用詞彙表中的術語
- 在最終稿末尾列出使用的詞彙及定義

## 🚀 設定步驟

### 步驟 1：確認 PDF 檔案位置

確保 `vocabularylist.pdf` 位於專案根目錄：

```
EMIchatbots/
├── vocabularylist.pdf  ← 應該在這裡
├── app/
├── lib/
└── ...
```

### 步驟 2：啟動開發伺服器

```bash
npm run dev
```

伺服器應在 `http://localhost:3000` 運行。

### 步驟 3：執行設定腳本

開啟新的終端視窗，執行：

```bash
node scripts/setup-assistant.js
```

這個腳本會：
1. 上傳 `vocabularylist.pdf` 到 OpenAI
2. 創建 Vector Store 用於檔案搜尋
3. 創建 EMI-DEW Assistant 並關聯 PDF
4. 顯示需要設定的環境變數

### 步驟 4：設定環境變數

腳本執行完成後，會顯示類似以下資訊：

```
✅ Assistant 設定完成！

請將以下環境變數加入 .env.local：
OPENAI_ASSISTANT_ID=asst_xxxxxxxxxxxxx
```

**在本地開發：**

編輯 `.env.local`，添加：

```env
OPENAI_API_KEY=sk-proj-your-api-key-here
OPENAI_ASSISTANT_ID=asst_xxxxxxxxxxxxx
```

**在 Vercel 部署：**

1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 選擇您的專案
3. 進入 Settings → Environment Variables
4. 添加：
   - Key: `OPENAI_ASSISTANT_ID`
   - Value: `asst_xxxxxxxxxxxxx`
   - Environment: Production, Preview, Development
5. 重新部署專案

### 步驟 5：重新啟動

本地開發：
```bash
# 停止開發伺服器（Ctrl+C）
# 重新啟動
npm run dev
```

Vercel 部署：
- 在 Vercel Dashboard 點擊「Redeploy」

### 步驟 6：測試

1. 開啟網頁應用程式
2. 上傳作品照片並開始對話
3. AI 教練應該會：
   - 自動參考詞彙表中的術語
   - 在講稿中使用專業詞彙
   - 在最終稿末尾列出詞彙定義

## 🔍 驗證 Assistant 是否正常運作

### 測試 1：檢查 Assistant ID

確認環境變數已設定：

```bash
# 在 .env.local 中
cat .env.local | grep OPENAI_ASSISTANT_ID
```

應該顯示：
```
OPENAI_ASSISTANT_ID=asst_xxxxxxxxxxxxx
```

### 測試 2：測試對話

在對話中詢問：
> "請使用詞彙表中的術語來描述一個產品設計流程"

AI 應該會從詞彙表中搜尋相關術語（如 prototype, iteration, user research 等）並在回答中使用。

### 測試 3：檢查詞彙列表

完成完整的 pitch 練習後，最終講稿應該包含類似以下內容：

```
---
Vocabulary from Design Vocabulary List:

1. Prototype - 原型；設計過程中用於測試的初步模型
2. Iteration - 迭代；重複改進的過程
3. User Research - 使用者研究；了解使用者需求的調查方法
...
```

## 🛠️ 手動設定（進階）

如果自動設定腳本無法使用，可以手動設定：

### 方法 1：使用 OpenAI Playground

1. 前往 [OpenAI Assistants](https://platform.openai.com/assistants)
2. 點擊「Create」
3. 設定：
   - **Name**: EMI-DEW 設計英語教練
   - **Model**: gpt-4o
   - **Instructions**: 複製 `lib/assistant.ts` 中的 `ASSISTANT_INSTRUCTIONS`
   - **Tools**: 啟用「File search」
4. 上傳 `vocabularylist.pdf`
5. 儲存並複製 Assistant ID
6. 加入環境變數

### 方法 2：使用 API 直接呼叫

```bash
curl https://api.openai.com/v1/assistants \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "EMI-DEW 設計英語教練",
    "instructions": "...",
    "model": "gpt-4o",
    "tools": [{"type": "file_search"}]
  }'
```

## 📊 架構說明

### 工作原理

```
使用者語音輸入
    ↓
Whisper API（語音轉文字）
    ↓
Assistants API + File Search
    ├─ 搜尋 vocabularylist.pdf
    ├─ 找出相關詞彙
    └─ 生成包含專業術語的回覆
    ↓
TTS API（文字轉語音）
    ↓
播放給使用者
```

### 檔案結構

- **`lib/assistant.ts`**: Assistant 核心邏輯
  - `setupAssistant()`: 上傳 PDF 並創建 Assistant
  - `getOrCreateAssistant()`: 取得或創建 Assistant
  - `sendMessage()`: 發送訊息並取得回覆

- **`app/api/chat/route.ts`**: 主要 API 端點
  - 處理語音識別
  - 呼叫 Assistant
  - 生成語音回覆

- **`app/api/setup-assistant/route.ts`**: 設定 API
  - 僅用於初始化
  - 執行一次即可

## ❓ 常見問題

### Q1: 執行設定腳本時顯示「找不到 vocabularylist.pdf」

**A**: 確認 PDF 檔案在專案根目錄，與 `package.json` 同層。

### Q2: 設定完成但 AI 沒有使用詞彙表

**A**: 檢查：
1. `OPENAI_ASSISTANT_ID` 是否正確設定
2. 是否重新啟動了伺服器
3. 檢查瀏覽器 Console 是否有錯誤

### Q3: 每次重啟都需要重新設定嗎？

**A**: 不需要。設定完成後，Assistant 會永久儲存在 OpenAI 平台上。只要環境變數設定正確，隨時可以使用。

### Q4: 如何更新 PDF 內容？

**A**: 
1. 更新 `vocabularylist.pdf`
2. 刪除 `.env.local` 中的 `OPENAI_ASSISTANT_ID`
3. 重新執行設定腳本

或者在 [OpenAI Assistants](https://platform.openai.com/assistants) 中手動更新檔案。

### Q5: 使用 Assistants API 會額外收費嗎？

**A**: 是的，費用包括：
- **檔案儲存**: $0.10 / GB / day（vocabularylist.pdf 通常 < 1MB，幾乎可忽略）
- **Vector Store 使用**: 包含在檔案儲存費用中
- **API 呼叫**: 與一般 GPT-4o 相同（$0.005 / 1K input tokens）

預估每次對話額外費用 < $0.01。

### Q6: 可以使用其他格式的詞彙表嗎？

**A**: 可以。File Search 支援：
- PDF
- TXT
- DOCX
- MD

建議使用結構化的格式，例如：
```
詞彙: Prototype
定義: A preliminary model of a product used for testing
中文: 原型

詞彙: Iteration
定義: The process of repeating and refining
中文: 迭代
```

## 🎯 最佳實踐

1. **詞彙表格式**：使用清晰的結構，便於 AI 搜尋
2. **定期更新**：根據教學需求更新詞彙表
3. **測試**：每次更新後測試 AI 是否正確引用
4. **監控使用量**：定期檢查 OpenAI 使用情況

## 🔗 相關資源

- [OpenAI Assistants API 文件](https://platform.openai.com/docs/assistants/overview)
- [File Search 功能說明](https://platform.openai.com/docs/assistants/tools/file-search)
- [OpenAI Assistants Dashboard](https://platform.openai.com/assistants)

---

**設定完成後，您的 EMI-DEW 教練就能智慧地使用詞彙表來指導學生了！** 🎉

