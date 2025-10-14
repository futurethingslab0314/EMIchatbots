# ✅ Vercel 部署前檢查清單

在部署到 Vercel 前，請確認以下事項：

## 本地設定（必須完成）

- [ ] 已安裝依賴：`npm install`
- [ ] 已設定 `.env.local` 包含 `OPENAI_API_KEY`
- [ ] `vocabularylist.pdf` 在專案根目錄
- [ ] 已執行：`npm run dev`（在一個終端）
- [ ] 已執行：`npm run setup-assistant`（在另一個終端）
- [ ] 已取得 `OPENAI_ASSISTANT_ID`
- [ ] 已將 `OPENAI_ASSISTANT_ID` 加入 `.env.local`
- [ ] 已在本地測試語音對話功能正常

## Git 提交

- [ ] 專案已推送到 GitHub
- [ ] `.env.local` 沒有被提交（在 `.gitignore` 中）
- [ ] `vocabularylist.pdf` 沒有被提交（非必要）

## Vercel 設定

- [ ] 已在 Vercel 匯入專案
- [ ] 已設定環境變數：`OPENAI_API_KEY`
- [ ] 已設定環境變數：`OPENAI_ASSISTANT_ID`
- [ ] 兩個環境變數都勾選了 Production、Preview、Development

## 部署驗證

- [ ] 構建成功（無錯誤）
- [ ] 網站可訪問
- [ ] 圖片上傳功能正常
- [ ] 語音錄音功能正常
- [ ] AI 回覆正常且包含詞彙表術語

## 常見錯誤

如果遇到以下錯誤：

### ❌ Type error: Property 'vectorStores' does not exist
**解決**：確認 `package.json` 中 openai 版本 >= 4.67.0

### ❌ 未設定 OPENAI_ASSISTANT_ID
**解決**：在 Vercel 環境變數中添加 `OPENAI_ASSISTANT_ID`

### ❌ 找不到 vocabularylist.pdf
**解決**：這是正常的（構建時不需要 PDF）。確保已在本地完成設定。

---

完成所有檢查項目後，即可部署！

