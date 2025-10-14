# 🚀 快速開始指南

這是最精簡的設定步驟，讓您快速啟動 EMI-DEW 語音教練。

## 📋 前置準備

1. ✅ Node.js 18+ 已安裝
2. ✅ OpenAI API Key（[在這裡取得](https://platform.openai.com/api-keys)）
3. ✅ `vocabularylist.pdf` 檔案準備好

## ⚡ 5 步驟快速設定

### 1️⃣ 安裝依賴

```bash
npm install
```

### 2️⃣ 設定 API Key

創建 `.env.local` 檔案：

```bash
echo "OPENAI_API_KEY=sk-proj-your-actual-key-here" > .env.local
```

> 將 `sk-proj-your-actual-key-here` 替換為您的真實 API Key

### 3️⃣ 放置 PDF 檔案

確保 `vocabularylist.pdf` 在專案根目錄：

```
EMIchatbots/
├── vocabularylist.pdf  ← 在這裡
├── app/
├── package.json
└── ...
```

### 4️⃣ 啟動並設定 Assistant

**終端 1 - 啟動開發伺服器：**
```bash
npm run dev
```

**終端 2 - 設定 Assistant：**
```bash
npm run setup-assistant
```

複製顯示的 `OPENAI_ASSISTANT_ID`，加入 `.env.local`：

```bash
# 在 .env.local 檔案中添加（保持原有的 OPENAI_API_KEY）
OPENAI_ASSISTANT_ID=asst_xxxxxxxxxxxxx
```

### 5️⃣ 重啟並測試

```bash
# 停止開發伺服器（Ctrl+C），然後重新啟動
npm run dev
```

開啟瀏覽器訪問 [http://localhost:3000](http://localhost:3000)

## ✅ 測試功能

1. 點擊上傳按鈕，選擇 1-3 張設計作品照片
2. 點擊藍色麥克風按鈕開始錄音
3. 說：「這是我的畢業作品，名稱是智慧水瓶，它能提醒使用者喝水...」
4. 再次點擊麥克風停止錄音
5. AI 教練會：
   - 顯示您的語音文字
   - 以語音和文字回覆您
   - 使用詞彙表中的專業術語

## 🎯 常見問題

### ❌ 錯誤：找不到 vocabularylist.pdf

**解決**：確認 PDF 在專案根目錄（與 `package.json` 同層）

### ❌ 錯誤：Invalid API Key

**解決**：檢查 `.env.local` 中的 `OPENAI_API_KEY` 是否正確

### ❌ 麥克風沒反應

**解決**：
1. 檢查瀏覽器是否允許麥克風權限
2. 使用 Chrome 或 Edge 瀏覽器
3. 確保使用 HTTPS 或 localhost

### ❌ Assistant 設定失敗

**解決**：
1. 確認開發伺服器正在運行（終端 1）
2. 確認 OpenAI API Key 有效
3. 檢查網路連線

## 📚 更多資訊

- **完整文件**：查看 `README.md`
- **PDF 設定詳解**：查看 `SETUP-PDF.md`
- **部署指南**：查看 `DEPLOYMENT.md`

## 🆘 需要幫助？

遇到問題？檢查：
1. 開發伺服器是否正常運行
2. 瀏覽器 Console 是否有錯誤訊息
3. `.env.local` 檔案是否正確設定
4. `vocabularylist.pdf` 是否在正確位置

---

**完成設定後，您就可以開始使用 EMI-DEW 語音教練了！** 🎉

