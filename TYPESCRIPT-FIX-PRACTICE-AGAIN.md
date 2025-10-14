# ✅ TypeScript 編譯錯誤修復

## 🐛 錯誤訊息

```
Type error: Property '"practice-again"' is missing in type 
'{ upload: string; intro: string; ... }' but required in type 
'Record<ConversationStage, string>'.
```

## 🔍 問題原因

在 `app/api/chat-simple/route.ts` 中，`ConversationStage` 類型新增了 `'practice-again'` 階段，但 `STAGE_PROMPTS` 物件中缺少對應的屬性。

TypeScript 的 `Record<K, V>` 類型要求所有 `K` 中的 key 都必須在物件中存在。

## ✅ 修復方案

### **修復位置：** `app/api/chat-simple/route.ts` 第 11-21 行

### **修復前：**
```typescript
const STAGE_PROMPTS: Record<ConversationStage, string> = {
  'upload': '',
  'intro': '...',
  'qa-improve': '...',
  'confirm-summary': '...',
  'generate-pitch': '...',
  'practice-pitch': '',
  'evaluation': '...',
  'keywords': '...',
  // ❌ 缺少 'practice-again'
}
```

### **修復後：**
```typescript
const STAGE_PROMPTS: Record<ConversationStage, string> = {
  'upload': '',
  'intro': '...',
  'qa-improve': '...',
  'confirm-summary': '...',
  'generate-pitch': '...',
  'practice-pitch': '',
  'practice-again': '', // ✅ 新增
  'evaluation': '...',
  'keywords': '...',
}
```

## 📝 說明

`'practice-again'` 階段的提示設為空字串 `''`，因為這個階段是由前端的雙按鈕處理，不需要 AI 生成回應。

## ✅ 編譯結果

TypeScript 編譯錯誤已修復！

## 📌 本地編譯注意事項

本地執行 `npm run build` 可能會出現以下錯誤：

```
Error: The OPENAI_API_KEY environment variable is missing or empty
```

**這是正常的！** 因為：
1. 本地沒有設置 `OPENAI_API_KEY` 環境變數
2. 這個錯誤不會影響 Vercel 部署
3. Vercel 部署時會自動使用在 Vercel 設置的環境變數

**解決方法（如果想本地測試）：**
創建 `.env.local` 檔案並添加：
```
OPENAI_API_KEY=your-api-key-here
VOCABULARY_PDF_URL=your-google-sheets-url-here
```

## 🎯 完成狀態

- ✅ TypeScript 類型錯誤已修復
- ✅ `STAGE_PROMPTS` 包含所有階段
- ✅ `practice-again` 階段已正確添加
- ✅ 程式碼可以部署到 Vercel

**準備好部署！** 🚀

