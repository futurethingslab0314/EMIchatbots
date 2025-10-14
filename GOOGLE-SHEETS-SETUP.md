# 📊 使用 Google Sheets 作為詞彙表

本文件說明如何使用 Google Sheets 管理詞彙表，讓更新變得超級簡單！

## 🎯 為什麼使用 Google Sheets？

- ✅ **線上編輯**：隨時隨地更新詞彙表
- ✅ **協作友善**：多人同時編輯
- ✅ **版本歷史**：Google Sheets 自動保存版本
- ✅ **即時生效**：更新後重新部署即可
- ✅ **視覺化管理**：比 PDF 更容易編輯
- ✅ **權限控制**：可以設定誰能編輯

## 🚀 設定步驟

### 步驟 1：準備 Google Sheets 詞彙表

#### 1.1 創建新的 Google Sheet

1. 前往 [Google Sheets](https://sheets.google.com)
2. 創建新的試算表
3. 命名為「EMI-DEW Design Vocabulary」

#### 1.2 設定詞彙表格式

建議使用以下欄位結構：

| 欄位 A | 欄位 B | 欄位 C | 欄位 D |
|--------|--------|--------|--------|
| **Term** | **Definition (English)** | **中文** | **Category** |
| Prototype | A preliminary model used for testing | 原型 | Process |
| Iteration | The process of repeating and refining | 迭代 | Process |
| User Research | Methods to understand user needs | 使用者研究 | Research |
| Ergonomics | Study of people's efficiency in their working environment | 人體工學 | Design |
| Sustainability | Meeting present needs without compromising future generations | 永續性 | Concept |

**提示：**
- 第一列是標題
- Term（術語）：英文詞彙
- Definition：英文定義
- 中文：中文翻譯
- Category：分類（選填）

範例 Google Sheet：
```
https://docs.google.com/spreadsheets/d/1234567890abcdefghij/edit
```

### 步驟 2：設定共享權限

1. 點擊右上角「共用」按鈕
2. 在「一般存取權」設定：
   - 選擇「知道連結的任何人」
   - 權限：「檢視者」（避免被他人修改）
3. 點擊「複製連結」

您會得到類似這樣的 URL：
```
https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit?usp=sharing
```

### 步驟 3：取得 Sheet ID（可選）

如果您的詞彙表有多個工作表（tabs），需要指定特定的工作表：

1. 開啟該工作表
2. 查看瀏覽器網址列
3. 找到 `gid=` 後面的數字

範例：
```
https://docs.google.com/spreadsheets/d/1AbCd.../edit#gid=123456789
                                                      ^^^^^^^^^ 這是 gid
```

### 步驟 4：在 Vercel 設定環境變數

在 Vercel Dashboard → Settings → Environment Variables：

**方案 A：自動創建（簡單）**

```
OPENAI_API_KEY=sk-proj-xxxxx
VOCABULARY_PDF_URL=https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit?usp=sharing
```

系統會自動：
1. 偵測這是 Google Sheets URL
2. 轉換為 PDF 導出格式
3. 下載並上傳到 OpenAI
4. 創建 Assistant

**方案 B：手動創建（推薦）**

先用 API 創建一次 Assistant：

```bash
curl -X POST https://your-app.vercel.app/api/setup-assistant \
  -H "Content-Type: application/json" \
  -d '{
    "pdfUrl": "https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit?usp=sharing"
  }'
```

然後將返回的 Assistant ID 加入環境變數：

```
OPENAI_API_KEY=sk-proj-xxxxx
OPENAI_ASSISTANT_ID=asst_xxxxxxxxxxxxx
```

### 步驟 5：部署或重新部署

```bash
git push
```

Vercel 會自動部署，系統會從 Google Sheets 下載 PDF。

---

## 📝 支援的 URL 格式

系統會自動偵測並處理以下格式：

### 格式 1：編輯連結（最常見）
```
https://docs.google.com/spreadsheets/d/SHEET_ID/edit?usp=sharing
```
自動轉換為：
```
https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=pdf
```

### 格式 2：指定工作表
```
https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=123456
```
自動轉換為：
```
https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=pdf&gid=123456
```

### 格式 3：直接使用導出連結
```
https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=pdf
```
直接使用，不轉換。

---

## 🔄 更新詞彙表

### 更新流程（超簡單！）

```
1. 在 Google Sheets 中編輯詞彙表
   ↓
2. 在 Vercel 刪除 OPENAI_ASSISTANT_ID（如果有）
   ↓
3. 點擊 Vercel "Redeploy"
   ↓
4. 系統自動下載最新版本並創建新 Assistant
   ↓
5. 記錄新的 Assistant ID（可選，避免重複創建）
```

**不需要：**
- ❌ 下載 PDF
- ❌ 提交到 Git
- ❌ 本地設定

**只需要：**
- ✅ 在 Google Sheets 編輯
- ✅ 在 Vercel 重新部署

---

## 🎨 詞彙表設計建議

### 基本格式

```
| Term        | Definition                           | 中文     | Example                    |
|-------------|--------------------------------------|----------|----------------------------|
| Prototype   | A preliminary model for testing      | 原型     | We built 5 prototypes      |
| Iteration   | Repeated refinement process          | 迭代     | After 3 iterations...      |
```

### 進階格式（含分類）

```
| Category  | Term        | Definition                    | 中文     | Usage Context |
|-----------|-------------|-------------------------------|----------|---------------|
| Process   | Prototype   | Preliminary testing model     | 原型     | Development   |
| Process   | Iteration   | Refinement cycle              | 迭代     | Development   |
| Research  | User Study  | Understanding user needs      | 使用者研究 | Research      |
| Material  | Sustainability | Environmental responsibility | 永續性   | Concept       |
```

### 詞彙分類建議

- **Process**：研發流程（prototype, iteration, testing）
- **Research**：研究方法（user research, survey, interview）
- **Material**：材料工藝（texture, durability, recyclable）
- **Design**：設計概念（ergonomics, aesthetics, functionality）
- **Evaluation**：評估指標（usability, accessibility, efficiency）

---

## 🔍 疑難排解

### ❌ 錯誤：下載檔案失敗 (403)

**原因：** Google Sheets 權限未設定為公開

**解決：**
1. 開啟 Google Sheet
2. 點擊「共用」
3. 改為「知道連結的任何人」→「檢視者」

### ❌ 錯誤：檔案格式不正確

**原因：** URL 格式錯誤或指向錯誤的資源

**解決：**
1. 確認 URL 包含 `/spreadsheets/d/`
2. 複製整個分享連結（包含 `?usp=sharing`）
3. 或直接使用導出連結格式

### ❌ AI 沒有使用詞彙表

**原因：** Assistant 尚未更新或 PDF 內容格式不適合

**解決：**
1. 確認 Google Sheets 內容清晰易讀
2. 刪除舊的 OPENAI_ASSISTANT_ID
3. 重新部署，創建新 Assistant
4. 確認表格有明確的標題和欄位

### ❌ 下載的 PDF 不完整

**原因：** Google Sheets 過大或格式複雜

**解決：**
1. 限制詞彙數量（建議 < 200 個）
2. 簡化格式（避免過多合併儲存格）
3. 分成多個工作表，指定特定 gid

---

## 💡 最佳實踐

### 1. 版本管理

使用 Google Sheets 的版本歷史功能：
- 檔案 → 版本記錄 → 查看版本記錄
- 可以還原到任何歷史版本

### 2. 權限管理

**公開但防止編輯：**
- 一般存取權：知道連結的任何人
- 權限：檢視者

**團隊協作：**
- 邀請特定成員：編輯者
- 其他人：檢視者

### 3. 備份策略

定期匯出備份：
- 檔案 → 下載 → PDF
- 檔案 → 下載 → Excel (.xlsx)

### 4. 更新頻率

建議更新後：
1. 立即測試（在 Google Sheets 預覽 PDF 導出）
2. 重新部署一次（創建新 Assistant）
3. 測試 AI 是否正確使用新詞彙

---

## 📊 範例 Google Sheet

### 完整範例

您可以複製這個範例開始：

```
https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit
```

欄位結構：
```
A: Term (英文術語)
B: Definition (英文定義)
C: 中文翻譯
D: Example Sentence (例句)
E: Category (分類)
```

範例內容：
```
Term         | Definition                                      | 中文      | Example                           | Category
-------------|------------------------------------------------|-----------|-----------------------------------|----------
Prototype    | A preliminary model used for testing and...    | 原型      | We created three prototypes...    | Process
Iteration    | The process of repeating and refining a design | 迭代      | After five iterations, we...      | Process
User Research| Methods used to understand user needs...       | 使用者研究 | Our user research revealed...     | Research
```

---

## 🎯 工作流程圖

```
團隊編輯 Google Sheets
         ↓
     點擊「共用」
         ↓
   複製公開連結
         ↓
   加入 Vercel 環境變數
   (VOCABULARY_PDF_URL)
         ↓
      部署應用
         ↓
   系統自動下載 PDF
         ↓
  上傳到 OpenAI 並創建 Assistant
         ↓
   AI 可以使用詞彙表 ✅

=== 更新時 ===

  在 Google Sheets 編輯
         ↓
   Vercel 重新部署
         ↓
   系統下載最新版本
         ↓
    創建新 Assistant
         ↓
     更新完成 ✅
```

---

## 📋 快速設定檢查清單

- [ ] Google Sheet 已創建
- [ ] 詞彙表格式正確（有標題列）
- [ ] 分享權限設為「知道連結的任何人」
- [ ] 已複製分享連結
- [ ] Vercel 已設定 `VOCABULARY_PDF_URL`
- [ ] Vercel 已設定 `OPENAI_API_KEY`
- [ ] 已部署到 Vercel
- [ ] 已測試 AI 是否正確使用詞彙

---

## 🆚 比較：Google Sheets vs GitHub PDF

| 特性 | Google Sheets | GitHub PDF |
|------|--------------|------------|
| **編輯方便** | ✅ 線上即時編輯 | ❌ 需要 PDF 編輯工具 |
| **協作** | ✅ 多人同時編輯 | ⚠️ 需要 PR 流程 |
| **版本控制** | ✅ Google 自動保存 | ✅ Git 歷史記錄 |
| **權限管理** | ✅ 精細控制 | ⚠️ 倉庫層級 |
| **更新速度** | ✅ 即時 | ⚠️ 需要 commit/push |
| **離線使用** | ❌ 需要網路 | ✅ 本地可用 |
| **適合情境** | 頻繁更新、團隊協作 | 穩定版本、程式碼管理 |

---

## 🎉 完成！

現在您可以：
- ✅ 用 Google Sheets 管理詞彙表
- ✅ 線上編輯，即時更新
- ✅ 團隊協作更容易
- ✅ 無需本地工具
- ✅ 權限控制更彈性

有任何問題，請參考 `README.md` 或其他文件！

