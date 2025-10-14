# 🔍 除錯指南

如果遇到 500 錯誤，請按照以下步驟排查。

## 📊 查看 Vercel 日誌

### 方法 1：在 Vercel Dashboard

1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 選擇您的專案
3. 點擊「Deployments」
4. 點擊最新的部署
5. 點擊「Function Logs」或「Runtime Logs」

### 方法 2：即時查看日誌

在最新部署頁面，向下滾動到「Real-time Logs」區塊，會即時顯示 API 呼叫的日誌。

## 🔎 應該看到的日誌

### 正常情況（點擊「開始 Pitch 練習」）

```
📨 收到請求: { hasImages: true, conversationStarted: false, imagesUploaded: true, triggerIntro: true }
📸 收到 2 張圖片
🎬 觸發 Bot 介紹（步驟 1）
📥 嘗試下載詞彙表: https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=766073929
✅ 詞彙表下載完成 (XXXX 字元)
✅ Bot 介紹生成完成
✅ 語音生成完成
```

### 如果出現錯誤

日誌會顯示具體的錯誤訊息，例如：

```
❌ API 錯誤: Error: Invalid API key
錯誤堆疊: ...
```

## 🛠️ 常見錯誤與解決方案

### 錯誤 1：API Key 相關

**日誌顯示：**
```
❌ API 錯誤: Invalid API key
```

**解決方案：**
1. 檢查 Vercel 環境變數中的 `OPENAI_API_KEY` 是否正確
2. 確認 API Key 以 `sk-proj-` 開頭
3. 重新部署

### 錯誤 2：詞彙表下載失敗

**日誌顯示：**
```
⚠️ 無法下載詞彙表: 下載失敗 (403)
使用預設 prompt（無詞彙表）
```

**解決方案：**
1. 檢查 Google Sheets 權限是否設為「知道連結的任何人」
2. 測試 URL 是否可訪問：
   ```bash
   curl "https://docs.google.com/spreadsheets/d/YOUR_ID/export?format=csv&gid=766073929"
   ```
3. 如果 403，重新設定 Google Sheets 分享權限

### 錯誤 3：圖片處理失敗

**日誌顯示：**
```
📸 收到 0 張圖片
```

**解決方案：**
- 圖片沒有正確傳送
- 檢查前端的 `formData.append('images', ...)` 是否執行
- 查看瀏覽器 Console 是否有錯誤

### 錯誤 4：OpenAI API 配額不足

**日誌顯示：**
```
❌ API 錯誤: You exceeded your current quota
```

**解決方案：**
1. 前往 [OpenAI Billing](https://platform.openai.com/account/billing)
2. 添加付款方式或增加配額
3. 檢查使用量

## 📋 環境變數檢查清單

確認 Vercel 環境變數：

- [ ] `OPENAI_API_KEY` 已設定且正確
- [ ] `VOCABULARY_PDF_URL` 已設定（如果要使用詞彙表）
- [ ] 兩個變數都勾選了 Production、Preview、Development
- [ ] 設定後已重新部署

## 🧪 手動測試 API

### 測試詞彙表下載

```bash
curl "https://docs.google.com/spreadsheets/d/1qcADIH2VtqNGWdN3BGNxDzSukOJHtgrTr3biUHD-KQU/export?format=csv&gid=766073929"
```

應該返回 CSV 內容，不應該是 HTML 或錯誤訊息。

### 測試 API 端點

使用 Postman 或 curl 測試：

```bash
# 注意：這個測試會失敗因為需要真實的音訊檔案，但可以看到錯誤訊息
curl -X POST https://your-app.vercel.app/api/chat-simple
```

## 🔧 前端除錯

### 在瀏覽器 Console 查看

1. 開啟瀏覽器開發工具（F12）
2. 前往「Console」分頁
3. 點擊「開始 Pitch 練習」
4. 查看是否有錯誤訊息

### 檢查網路請求

1. 開發工具 → Network 分頁
2. 點擊「開始 Pitch 練習」
3. 找到 `chat-simple` 請求
4. 查看：
   - Request Headers
   - Request Payload（是否包含圖片）
   - Response（錯誤訊息）

## 💡 臨時解決方案

如果一直有問題，可以先簡化測試：

### 暫時移除圖片傳送

在 `app/page.tsx` 的 `triggerBotIntroduction` 函數中：

```javascript
// 暫時註解圖片傳送
// formData.append('images', JSON.stringify(uploadedImages))
```

看看是否是圖片 base64 太大導致的問題。

### 使用簡化版介紹

在 `app/api/chat-simple/route.ts` 中：

```javascript
// 簡化測試
const introMessage = "您好！我看到您的作品了。請簡單描述一下您的設計？"
```

## 📞 如果還是無法解決

請提供以下資訊：

1. **Vercel Function Logs 完整內容**
2. **瀏覽器 Console 的錯誤訊息**
3. **Network 分頁中的請求詳情**

這樣我可以更準確地找出問題！

---

**提示：大部分 500 錯誤都與環境變數或 API 配額有關。** 🔑

