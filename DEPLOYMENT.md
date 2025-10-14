# 部署指南

本文件詳細說明如何將 EMI-DEW 設計英語教練部署到 Vercel。

## 前置準備

### 1. 取得 OpenAI API Key

1. 前往 [OpenAI Platform](https://platform.openai.com/api-keys)
2. 登入或註冊帳號
3. 點擊「Create new secret key」
4. 命名您的 key（例如：EMI-Chatbot-Production）
5. 複製生成的 API Key（格式：`sk-proj-...`）
6. **重要**：妥善保管此 key，不要分享給任何人

### 2. 準備 Vercel 帳號

1. 前往 [Vercel](https://vercel.com/)
2. 使用 GitHub 帳號登入（推薦）
3. 完成帳號設定

## 部署方式一：GitHub + Vercel（推薦）

### 步驟 1：推送專案到 GitHub

```bash
# 初始化 Git 倉庫（如果還沒有）
git init

# 添加所有檔案
git add .

# 提交變更
git commit -m "Initial commit: EMI-DEW chatbot"

# 在 GitHub 建立新倉庫，然後連結遠端倉庫
git remote add origin https://github.com/your-username/EMIchatbots.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

### 步驟 2：在 Vercel 匯入專案

1. 登入 [Vercel Dashboard](https://vercel.com/dashboard)
2. 點擊「Add New...」→「Project」
3. 選擇「Import Git Repository」
4. 找到您的 `EMIchatbots` 倉庫並點擊「Import」
5. 配置專案設定：
   - **Framework Preset**: Next.js（應自動偵測）
   - **Root Directory**: `./`（預設）
   - **Build Command**: `npm run build`（預設）
   - **Output Directory**: `.next`（預設）

### 步驟 3：設定環境變數

在「Environment Variables」區塊：

1. 點擊「Add」
2. 填入：
   - **Name**: `OPENAI_API_KEY`
   - **Value**: 您的 OpenAI API Key（`sk-proj-...`）
3. 選擇環境：勾選 **Production**、**Preview** 和 **Development**
4. 點擊「Add」

### 步驟 4：部署

1. 確認所有設定正確
2. 點擊「Deploy」
3. 等待部署完成（約 2-3 分鐘）
4. 部署成功後，您會看到：
   - ✅ Production deployment ready
   - 您的網站網址（例如：`emi-chatbots.vercel.app`）

### 步驟 5：測試

1. 點擊生成的網址訪問您的網站
2. 測試功能：
   - ✅ 上傳圖片功能正常
   - ✅ 麥克風錄音功能正常
   - ✅ 語音識別正確
   - ✅ AI 回覆正常
   - ✅ 語音播放正常

## 部署方式二：Vercel CLI

### 步驟 1：安裝 Vercel CLI

```bash
npm install -g vercel
```

### 步驟 2：登入 Vercel

```bash
vercel login
```

選擇您偏好的登入方式（GitHub、GitLab、Email）。

### 步驟 3：初始化專案

在專案根目錄執行：

```bash
vercel
```

按照提示操作：

```
? Set up and deploy "~/Documents/GitHub/EMIchatbots"? [Y/n] y
? Which scope do you want to deploy to? [Your Account]
? Link to existing project? [y/N] n
? What's your project's name? emi-chatbots
? In which directory is your code located? ./
Auto-detected Project Settings (Next.js):
- Build Command: next build
- Development Command: next dev --port $PORT
- Install Command: `yarn install`, `pnpm install`, or `npm install`
- Output Directory: .next
? Want to modify these settings? [y/N] n
```

### 步驟 4：設定環境變數

```bash
# 為 Production 環境設定
vercel env add OPENAI_API_KEY production

# 貼上您的 OpenAI API Key
? What's the value of OPENAI_API_KEY? sk-proj-...

# 為 Preview 環境設定
vercel env add OPENAI_API_KEY preview

# 為 Development 環境設定
vercel env add OPENAI_API_KEY development
```

### 步驟 5：正式部署

```bash
vercel --prod
```

部署成功後會顯示：

```
✅  Production: https://emi-chatbots.vercel.app [2s]
```

## 部署後設定

### 設定自訂網域（選用）

1. 在 Vercel Dashboard 進入您的專案
2. 前往「Settings」→「Domains」
3. 輸入您的網域（例如：`chatbot.yourschool.edu`）
4. 按照指示在您的 DNS 供應商添加記錄
5. 等待 DNS 傳播（通常 5-10 分鐘）

### 調整 Function 設定

預設的 Vercel Serverless Function 有 10 秒逾時限制。語音處理可能需要更長時間。

#### 升級到 Pro 方案（如果需要）

1. Hobby 方案：10 秒逾時（免費）
2. Pro 方案：60 秒逾時（$20/月）

本專案已在 `vercel.json` 設定 60 秒逾時：

```json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 60
    }
  }
}
```

> ⚠️ **注意**：此設定僅在 Pro 方案或更高方案有效。

### 監控與除錯

#### 查看部署日誌

```bash
vercel logs
```

#### 查看即時日誌

```bash
vercel logs --follow
```

#### 在 Dashboard 查看

1. 前往 Vercel Dashboard
2. 選擇您的專案
3. 點擊「Logs」或「Analytics」

## 持續部署

### 自動部署

當您推送程式碼到 GitHub 時，Vercel 會自動觸發部署：

- **Push 到 `main` 分支** → 部署到 Production
- **Push 到其他分支** → 部署到 Preview

### 手動觸發重新部署

#### 方法 1：在 Dashboard

1. 前往您的專案
2. 點擊「Deployments」
3. 選擇最新的部署
4. 點擊「Redeploy」

#### 方法 2：使用 CLI

```bash
vercel --prod --force
```

## 環境變數管理

### 查看所有環境變數

```bash
vercel env ls
```

### 移除環境變數

```bash
vercel env rm OPENAI_API_KEY production
```

### 更新環境變數

環境變數無法直接更新，需要先移除再新增：

```bash
vercel env rm OPENAI_API_KEY production
vercel env add OPENAI_API_KEY production
```

> ⚠️ **重要**：修改環境變數後需要重新部署才會生效。

## 常見問題排解

### 問題 1：部署成功但無法使用語音功能

**原因**：環境變數未正確設定

**解決方案**：
1. 檢查 Vercel Dashboard → Settings → Environment Variables
2. 確認 `OPENAI_API_KEY` 已設定且正確
3. 重新部署專案

### 問題 2：API 呼叫逾時

**原因**：Function 執行時間超過限制

**解決方案**：
1. 檢查 Vercel 方案（Hobby 限制 10 秒）
2. 升級到 Pro 方案以獲得 60 秒逾時
3. 優化程式碼以減少處理時間

### 問題 3：CORS 錯誤

**原因**：跨域請求被封鎖

**解決方案**：
Next.js App Router 預設已處理 CORS。如果仍有問題，檢查：
1. API Route 是否在 `app/api/` 目錄下
2. 前端請求的 URL 是否正確（使用相對路徑 `/api/chat`）

### 問題 4：麥克風權限被拒絕

**原因**：瀏覽器或使用者拒絕麥克風權限

**解決方案**：
1. 確保網站使用 HTTPS（Vercel 自動提供）
2. 引導使用者允許麥克風權限
3. 在瀏覽器設定中檢查網站權限

### 問題 5：OpenAI API 配額不足

**錯誤訊息**：`Error: 429 Too Many Requests` 或 `Error: Insufficient quota`

**解決方案**：
1. 前往 [OpenAI Billing](https://platform.openai.com/account/billing)
2. 檢查使用量和配額
3. 添加付款方式或增加配額限制

## 效能優化建議

### 1. 啟用 Edge Runtime（進階）

修改 `app/api/chat/route.ts`：

```typescript
export const runtime = 'edge'
```

> ⚠️ 注意：某些 Node.js API 在 Edge Runtime 中無法使用。

### 2. 實作快取機制

使用 Vercel KV 或 Redis 快取常見問題的回答。

### 3. 圖片優化

使用 Next.js Image 組件自動優化圖片：

```typescript
import Image from 'next/image'
```

### 4. 限制音訊品質

降低錄音品質以減少上傳時間：

```typescript
const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'audio/webm;codecs=opus',
  audioBitsPerSecond: 64000, // 降低位元率
})
```

## 安全性檢查清單

- [x] API Key 儲存在環境變數，未提交到 Git
- [x] `.env.local` 已加入 `.gitignore`
- [x] 使用 HTTPS（Vercel 自動提供）
- [ ] 實作使用者認證（選用，建議用於正式環境）
- [ ] 實作請求速率限制（選用，防止濫用）
- [ ] 設定 OpenAI API 使用限額警報

## 成本估算

### Vercel 費用

- **Hobby 方案**：$0/月
  - 100 GB 頻寬
  - 100 GB-Hrs Function 執行時間
  - 1000 次映像優化

- **Pro 方案**：$20/月
  - 1 TB 頻寬
  - 1000 GB-Hrs Function 執行時間
  - 5000 次映像優化

### OpenAI API 費用

假設每次對話 10 輪：

- Whisper（每輪 30 秒）：10 × 0.5 × $0.006 = $0.03
- GPT-4o（每輪 500 tokens）：10 × 0.5 × $0.01 = $0.05
- TTS（每輪 100 字元）：10 × 100 × $0.000015 = $0.015

**每次對話總成本**：約 $0.10

**每月成本估算**（100 次對話）：約 $10

## 監控與分析

### 設定 Vercel Analytics

1. 前往專案設定
2. 啟用「Analytics」
3. 查看即時訪問數據和效能指標

### 設定 OpenAI 使用監控

1. 前往 [OpenAI Dashboard](https://platform.openai.com/usage)
2. 查看 API 使用量
3. 設定使用限額警報

### 設定錯誤追蹤（選用）

整合 Sentry 或其他錯誤追蹤服務：

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

## 備份與還原

### 備份環境變數

```bash
# 匯出所有環境變數
vercel env pull .env.production
```

### 備份部署設定

所有設定都在 Git 中，確保定期推送：

```bash
git push origin main
```

## 下一步

專案部署完成後，您可以：

1. ✅ 測試所有功能
2. 📊 監控使用情況和效能
3. 🎨 根據使用者回饋調整 UI/UX
4. 🚀 添加新功能（如對話記錄、學習報告等）
5. 📱 優化行動裝置體驗
6. 🌍 添加更多語言支援

---

**祝您部署順利！** 🚀

