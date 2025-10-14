# 🔧 修復部署錯誤指南

## ❌ 錯誤訊息

```
Type error: Property 'vectorStores' does not exist on type 'Beta'.
```

## ✅ 解決方案

這個錯誤是因為 OpenAI SDK 版本過舊。我已經更新了版本，現在需要推送到 GitHub。

### 步驟 1：推送變更到 GitHub

```bash
# 變更已經提交，現在推送
git push
```

如果出現認證問題，請使用以下任一方法：

#### 方法 A：使用 GitHub CLI（推薦）

```bash
# 如果還沒安裝 GitHub CLI
brew install gh

# 登入
gh auth login

# 推送
git push
```

#### 方法 B：使用 Personal Access Token

1. 前往 GitHub → Settings → Developer settings → Personal access tokens
2. 生成新 token（權限：repo）
3. 使用 token 作為密碼推送：

```bash
git push https://YOUR_TOKEN@github.com/username/EMIchatbots.git main
```

#### 方法 C：使用 SSH

```bash
# 檢查是否已設定 SSH
git remote -v

# 如果顯示 https，改為 SSH
git remote set-url origin git@github.com:username/EMIchatbots.git

# 推送
git push
```

### 步驟 2：等待 Vercel 自動部署

推送成功後：
1. Vercel 會自動偵測到新的 commit
2. 開始重新構建
3. 這次應該會成功！

### 步驟 3：驗證部署

部署完成後，檢查：
- ✅ 構建成功（無錯誤）
- ✅ 網站可以訪問
- ✅ 語音功能正常

## 📋 已完成的修復

- ✅ 更新 `openai` 從 4.67.0 → 4.68.1
- ✅ 更新 `package-lock.json`
- ✅ 已提交到本地 Git
- ⏳ 待推送到 GitHub

## 🔍 檢查清單

如果推送後仍然失敗，請檢查：

### 1. 確認 package.json 版本

```json
"dependencies": {
  "openai": "^4.68.1"  // ← 應該是這個版本或更高
}
```

### 2. 確認環境變數已設定

在 Vercel Dashboard → Settings → Environment Variables：
- `OPENAI_API_KEY` ✅
- `OPENAI_ASSISTANT_ID` 或 `VOCABULARY_PDF_URL` ✅

### 3. 清除 Vercel 快取

如果仍然失敗：
1. 前往 Vercel Dashboard
2. Settings → General
3. 滾動到底部
4. 點擊「Clear Build Cache」
5. 重新部署

### 4. 手動觸發重新部署

在 Vercel：
1. 前往 Deployments
2. 點擊最新的部署旁邊的「...」
3. 選擇「Redeploy」
4. 勾選「Use existing Build Cache」→ 取消勾選
5. 點擊「Redeploy」

## 💡 為什麼會發生這個錯誤？

OpenAI SDK 在 4.67.0 以下的版本不支援 `vectorStores` API。

**時間軸：**
- 舊版 SDK (< 4.67.0)：不支援 Vector Stores
- 新版 SDK (≥ 4.67.0)：支援 Vector Stores
- 我們使用的功能需要 Vector Stores，所以必須升級

## 🎯 下一步

推送成功後：

1. **如果使用 Google Sheets 或 GitHub URL**：
   - 在 Vercel 設定 `VOCABULARY_PDF_URL`
   - 首次部署時會自動創建 Assistant
   - 記錄 Assistant ID

2. **如果使用本地設定**：
   - 先在本地執行 `npm run setup-assistant`
   - 取得 `OPENAI_ASSISTANT_ID`
   - 加入 Vercel 環境變數
   - 重新部署

## 📞 如果仍有問題

檢查 Vercel Function Logs：
1. 前往 Vercel Dashboard
2. 點擊失敗的部署
3. 查看「Function Logs」
4. 尋找錯誤訊息

常見問題：
- API Key 無效 → 檢查環境變數
- Assistant ID 不存在 → 重新創建 Assistant
- PDF URL 無法存取 → 檢查權限設定

---

**總結：現在請執行 `git push`，Vercel 會自動重新部署並成功！** 🚀

