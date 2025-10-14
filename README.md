# EMI-DEW 設計英語教練

一個基於 OpenAI API 的語音對話網頁應用程式，專為設計系學生練習英語作品 pitch 而設計。

## 功能特色

- 🎙️ **語音對話**：使用 OpenAI Whisper 進行語音識別
- 🔊 **語音回饋**：使用 OpenAI TTS 生成自然的語音回覆
- 📝 **即時字幕**：即時顯示使用者和 AI 教練的對話內容
- 📸 **作品上傳**：支援上傳 1-3 張設計作品照片
- 🎯 **專業引導**：遵循 EMI-DEW 教練系統，逐步引導學生完成 pitch 練習
- 🌐 **雙語支援**：支援中文和英文輸入，智慧判斷回應語言

## 技術架構

- **前端框架**：Next.js 14 + React 18 + TypeScript
- **樣式設計**：Tailwind CSS
- **語音識別**：OpenAI Whisper API + Web Speech API
- **語音合成**：OpenAI TTS API
- **對話模型**：GPT-4o
- **部署平台**：Vercel

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

創建 `.env.local` 檔案並填入您的 OpenAI API Key：

```bash
# 創建 .env.local 檔案
touch .env.local
```

編輯 `.env.local`：

```
OPENAI_API_KEY=sk-your-api-key-here
```

> 💡 **如何取得 OpenAI API Key**：
> 1. 前往 [OpenAI Platform](https://platform.openai.com/api-keys)
> 2. 登入您的帳號（如果沒有帳號，請先註冊）
> 3. 點擊「Create new secret key」
> 4. 複製生成的 API Key（請妥善保管，不要分享給他人）

### 3. 設定詞彙表 PDF（重要！）

將您的 `vocabularylist.pdf` 放在專案根目錄，然後執行設定腳本：

```bash
# 確保 vocabularylist.pdf 在專案根目錄
# 先啟動開發伺服器
npm run dev

# 開啟新的終端視窗，執行設定腳本
npm run setup-assistant
```

設定完成後，將顯示的 `OPENAI_ASSISTANT_ID` 加入 `.env.local`：

```
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_ASSISTANT_ID=asst_xxxxxxxxxxxxx
```

> 📖 **詳細的 PDF 設定說明請參考 `SETUP-PDF.md`**

### 4. 本地開發

```bash
npm run dev
```

開啟瀏覽器訪問 [http://localhost:3000](http://localhost:3000)

## 部署到 Vercel

### 方法一：使用 Vercel CLI（推薦）

1. 安裝 Vercel CLI：

```bash
npm install -g vercel
```

2. 登入 Vercel：

```bash
vercel login
```

3. 部署專案：

```bash
vercel
```

4. 設定環境變數：

```bash
vercel env add OPENAI_API_KEY
```

輸入您的 OpenAI API Key，選擇適用於 Production、Preview 和 Development 環境。

5. 正式部署：

```bash
vercel --prod
```

### 方法二：使用 Vercel 網頁介面

1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 點擊「Add New Project」
3. 從 GitHub 匯入您的專案
4. 在「Environment Variables」區塊添加：
   - Key: `OPENAI_API_KEY`
   - Value: 您的 OpenAI API Key
5. 點擊「Deploy」

## 使用說明

### 開始對話

1. **上傳作品照片**：點擊上傳區域，選擇 1-3 張您的設計作品照片
2. **開始錄音**：點擊藍色麥克風按鈕開始說話
3. **即時字幕**：您說話時，字幕會即時顯示在螢幕上
4. **停止錄音**：再次點擊麥克風按鈕（變成紅色方塊）停止錄音
5. **AI 回覆**：系統會處理您的語音，AI 教練會以語音和文字回覆您

### 對話流程

AI 教練會按照以下流程引導您：

1. **作品接收**：請您提供作品名稱和 100-200 字的基本說明
2. **三個關鍵追問**：針對您的作品提出三個深入問題
3. **融合草稿**：根據您的回答生成初步的介紹稿
4. **受眾確認**：詢問您的目標聽眾（大眾/教授/業界）
5. **最終講稿**：生成完整的 3 分鐘英語 pitch 稿
6. **錄音練習**：提供語音版本供您練習
7. **模擬問答**：模擬真實的提問情境

## 瀏覽器支援

- Chrome 80+ ✅（推薦）
- Edge 80+ ✅
- Safari 14+ ✅
- Firefox 75+ ⚠️（部分語音功能可能受限）

> ⚠️ **注意**：使用語音功能需要授予瀏覽器麥克風權限。建議使用 Chrome 或 Edge 以獲得最佳體驗。

## 常見問題

### Q: 為什麼麥克風沒有反應？

A: 請確認：
1. 瀏覽器已授予麥克風權限
2. 系統麥克風設定正常
3. 使用 HTTPS 連線（本地開發使用 localhost 即可）

### Q: 語音識別不準確怎麼辦？

A: 建議：
1. 在安靜的環境中使用
2. 麥克風距離適中（約 15-30 公分）
3. 說話速度適中，發音清晰
4. 可以中英文混用，系統會自動識別

### Q: API 呼叫失敗？

A: 請檢查：
1. OpenAI API Key 是否正確設定
2. OpenAI 帳戶是否有足夠的額度
3. 網路連線是否正常

### Q: 部署到 Vercel 後無法使用？

A: 確認：
1. Vercel 專案的環境變數已正確設定
2. 重新部署專案以套用環境變數變更
3. 檢查 Vercel Function Logs 是否有錯誤訊息

## API 費用說明

使用此應用程式會呼叫以下 OpenAI API：

- **Whisper API**：語音轉文字（約 $0.006 / 分鐘）
- **GPT-4o API**：對話生成（約 $0.005 / 1K tokens）
- **TTS API**：文字轉語音（約 $0.015 / 1K 字元）

預估每次完整對話（約 10 輪）的費用約 $0.1 - $0.3 美元。

> 💡 **節省費用小技巧**：
> - 開發測試時可以使用 GPT-3.5 替代 GPT-4o（修改 `app/api/chat/route.ts` 中的 model 參數）
> - 調整 TTS 語速可以減少字元數
> - 限制對話歷史的長度（目前設定為 10 輪）

## 專案結構

```
EMIchatbots/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # OpenAI API 整合
│   ├── globals.css                # 全域樣式
│   ├── layout.tsx                 # 根佈局
│   └── page.tsx                   # 主頁面（語音對話界面）
├── public/                        # 靜態資源
├── .env.local                     # 環境變數（不要提交到 Git）
├── .gitignore                     # Git 忽略檔案
├── next.config.js                 # Next.js 設定
├── package.json                   # 專案依賴
├── postcss.config.js              # PostCSS 設定
├── tailwind.config.js             # Tailwind CSS 設定
├── tsconfig.json                  # TypeScript 設定
├── vercel.json                    # Vercel 部署設定
└── README.md                      # 專案說明
```

## 自訂設定

### 修改語音模型

編輯 `app/api/chat/route.ts`：

```typescript
// 語音識別語言
language: 'zh', // 可改為 'en' 只識別英文

// TTS 語音角色
voice: 'nova', // 可選：alloy, echo, fable, onyx, nova, shimmer

// TTS 語速
speed: 0.95, // 範圍 0.25 - 4.0
```

### 修改對話模型

編輯 `app/api/chat/route.ts`：

```typescript
const completion = await openai.chat.completions.create({
  model: 'gpt-4o', // 可改為 'gpt-3.5-turbo' 節省費用
  temperature: 0.8, // 創意度 0-2
  max_tokens: 800, // 最大回覆長度
})
```

### 修改教練 Prompt

編輯 `app/api/chat/route.ts` 中的 `SYSTEM_PROMPT` 常數，依照您的需求調整教練的行為和指導流程。

## 進階功能建議

如果您想進一步擴展此專案，以下是一些建議：

1. **檔案上傳支援**：整合 PDF 上傳，讓學生可以上傳詞彙表
2. **對話歷史保存**：使用資料庫（如 Vercel Postgres）儲存對話記錄
3. **多使用者支援**：加入身份驗證系統（如 NextAuth.js）
4. **練習報告**：生成學習報告，分析詞彙使用情況
5. **語音評分**：整合語音評估 API，提供發音回饋
6. **響應式設計**：優化行動裝置體驗

## 授權

MIT License

## 支援

如有問題或建議，請開啟 GitHub Issue 或聯繫開發團隊。

---

**祝您的設計作品 pitch 練習順利！** 🎨🎤

