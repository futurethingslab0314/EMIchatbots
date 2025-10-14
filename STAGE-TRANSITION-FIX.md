# 🔧 階段轉換流程修復

## 🚨 問題分析

### ❌ **問題描述：**
學生在「自由分享」階段錄音完成後，無法進入下一個「回答問題」階段，流程卡住。

### 🔍 **根本原因：**

**位置：** `app/api/chat-simple/route.ts` 第 166 行（修復前）

```typescript
// ❌ 問題程式碼
if (currentStage === 'intro' && assistantReply.includes('問題')) {
  nextStage = 'qa-improve'
}
```

**問題分析：**
1. **判斷條件過於嚴格**：要求 AI 回應中必須包含「問題」這個詞
2. **AI 不一定說「問題」**：AI 可能用英文 "question"，或直接提問而不說「問題」
3. **導致階段轉換失敗**：因為判斷條件不成立，`nextStage` 保持 `undefined`，前端無法轉換階段

## ✅ 修復方案

### 1. **簡化階段轉換邏輯**

**位置：** `app/api/chat-simple/route.ts` 第 166-178 行

#### **修復前：**
```typescript
if (currentStage === 'intro' && assistantReply.includes('問題')) {
  // ❌ 要求 AI 必須說「問題」才能轉換
  nextStage = 'qa-improve'
}
```

#### **修復後：**
```typescript
if (currentStage === 'intro') {
  // ✅ 學生錄音完成後，直接轉到 qa-improve 階段
  // AI 會在這個階段提出問題
  nextStage = 'qa-improve'
}
```

**改進理由：**
- `intro` 階段的目的是學生自由描述
- 一旦學生完成錄音，就應該進入 `qa-improve` 階段
- AI 會根據 `qa-improve` 階段的提示自動提出問題
- **不需要依賴 AI 回應內容來判斷**

### 2. **增強其他階段的判斷條件**

#### **`qa-improve` → `confirm-summary`**
```typescript
// 修復前
else if (currentStage === 'qa-improve' && assistantReply.includes('整理')) {

// 修復後
else if (currentStage === 'qa-improve' && 
         (assistantReply.toLowerCase().includes('summary') || 
          assistantReply.includes('整理') || 
          assistantReply.includes('重點'))) {
```

**改進：** 增加多個關鍵詞判斷，支援中英文

#### **`confirm-summary` → `generate-pitch`**
```typescript
// 修復前
else if (currentStage === 'confirm-summary' && assistantReply.includes('Pitch')) {

// 修復後
else if (currentStage === 'confirm-summary' && 
         (assistantReply.includes('Pitch') || 
          assistantReply.includes('pitch'))) {
```

**改進：** 支援大小寫

#### **`practice-pitch` → `practice-again`**
```typescript
// 修復前
else if (currentStage === 'practice-pitch' && 
         (assistantReply.includes('評分') || 
          assistantReply.includes('rubric'))) {

// 修復後
else if (currentStage === 'practice-pitch' && 
         (assistantReply.includes('評分') || 
          assistantReply.includes('rubric') || 
          assistantReply.includes('Pronunciation') || 
          assistantReply.includes('Originality'))) {
```

**改進：** 增加評分項目關鍵詞，確保能檢測到評分回應

### 3. **強化 QA-Improve 階段提示**

**位置：** `app/api/chat-simple/route.ts` 第 14 行

#### **修復前：**
```typescript
'qa-improve': '【重要】你是「英語發表教練」，根據學生剛才的描述，提出四個問題...'
```

#### **修復後：**
```typescript
'qa-improve': '【重要】你是「英語發表教練」，專門協助學生提升英語表達能力。

【立即任務】根據學生剛才的描述，現在請提出四個問題來協助他們改善「口語發表技巧」：

前三個問題的目標是：...

【格式要求】請按照以下格式提出問題：
1. [第一個問題]
2. [第二個問題]
3. [第三個問題]
4. [第四個問題：目標對象確認]

【禁止】不要問「如何改進設計」...'
```

**改進：**
- 明確指示「立即任務」
- 添加「格式要求」確保 AI 提出問題
- 更清楚的結構化指引

## 🔄 完整流程（修復後）

### **步驟 1-2：Upload → Intro**
```
學生上傳照片
  ↓
點擊「確認上傳作品」
  ↓
AI 介紹並引導（intro stage）
  ↓
學生點擊「🎤 自由分享」
  ↓
學生錄音描述作品
  ↓
學生點擊「🔴 停止錄音」
  ↓
【關鍵轉換】自動轉到 qa-improve 階段 ✅
```

### **步驟 3：QA-Improve**
```
AI 根據 qa-improve 提示提出 4 個問題
  ↓
學生點擊「🎤 回答問題/增加細節」
  ↓
學生錄音回答
  ↓
AI 整理重點（包含「整理」或「重點」關鍵詞）
  ↓
【自動轉換】轉到 confirm-summary 階段 ✅
```

### **步驟 4-9：後續階段**
```
confirm-summary → generate-pitch
  ↓
generate-pitch → practice-pitch
  ↓
practice-pitch → practice-again（包含評分）
  ↓
practice-again：學生選擇
  ├─ 🔄 再次練習 → 回到 practice-pitch
  └─ 📝 生成關鍵字 → evaluation → keywords
```

## 📊 階段轉換邏輯對比

| 階段 | 修復前判斷條件 | 修復後判斷條件 | 改進 |
|------|---------------|---------------|------|
| `intro` | AI 回應包含「問題」 | 學生完成錄音即轉換 | ✅ 更可靠 |
| `qa-improve` | AI 回應包含「整理」 | 包含「summary/整理/重點」 | ✅ 更靈活 |
| `confirm-summary` | AI 回應包含「Pitch」 | 包含「Pitch/pitch」 | ✅ 大小寫 |
| `practice-pitch` | 包含「評分/rubric」 | 包含「評分/rubric/Pronunciation/Originality」 | ✅ 更準確 |

## ✅ 修復完成

**修復內容：**
- ✅ `intro` 階段轉換不再依賴 AI 回應內容
- ✅ 增強所有階段的判斷條件（支援中英文、大小寫）
- ✅ 強化 `qa-improve` 階段提示，確保 AI 提出問題
- ✅ 增加格式要求，確保 AI 輸出符合預期

**測試重點：**
1. ✅ 自由分享後能否順利進入回答問題階段
2. ✅ 回答問題後能否進入確認重點階段
3. ✅ 確認重點後能否生成 Pitch
4. ✅ 練習 Pitch 後能否顯示評分圖表

---

**階段轉換流程修復完成！** 🎉

現在流程應該能順暢地從「自由分享」進入「回答問題」階段了！
