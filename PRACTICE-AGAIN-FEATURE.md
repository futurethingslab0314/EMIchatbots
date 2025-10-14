# 🔄 重複練習 Pitch 功能

## 🎯 功能概述

在語音練習 Pitch 階段完成後，學生現在有兩個選擇：
1. **🔄 再次練習 Pitch** - 可以無限制地重複練習
2. **📝 生成關鍵字提點** - 根據最後一次練習生成英文版關鍵字筆記

## 📍 程式位置

### 1. **新增階段類型**
**位置：** `app/page.tsx` 第 13-22 行
```typescript
type ConversationStage = 
  | 'upload' | 'intro' | 'qa-improve' 
  | 'confirm-summary' | 'generate-pitch' | 'practice-pitch' | 'practice-again'
  | 'evaluation' | 'keywords'
```

### 2. **雙按鈕 UI 設計**
**位置：** `app/page.tsx` 第 655-682 行
```typescript
{/* 練習完成後 - 兩個選擇按鈕 */}
{currentStage === 'practice-again' && (
  <>
    <div className="flex space-x-4 justify-center">
      <button
        onClick={() => {
          setCurrentStage('practice-pitch')
          startRecording()
        }}
        className="bg-gradient-to-r from-blue-500 to-cyan-500"
      >
        🔄 再次練習 Pitch
      </button>
      <button
        onClick={async () => {
          await triggerStageAction('evaluation')
        }}
        className="bg-gradient-to-r from-green-500 to-emerald-500"
      >
        📝 生成關鍵字提點
      </button>
    </div>
  </>
)}
```

### 3. **後端階段轉換邏輯**
**位置：** `app/api/chat-simple/route.ts` 第 29-30 行
```typescript
'practice-pitch': 'practice-again', // 練習完成後進入選擇階段
'practice-again': 'practice-again', // 保持選擇階段
```

### 4. **階段轉換觸發條件**
**位置：** `app/api/chat-simple/route.ts` 第 173-176 行
```typescript
} else if (currentStage === 'practice-pitch' && (assistantReply.includes('評分') || assistantReply.includes('rubric'))) {
  // 練習完成後，轉到選擇階段
  nextStage = 'practice-again'
}
```

## 🔄 完整流程

### 📱 **新的練習階段流程：**

```
步驟 5：語音練習 Pitch
├─ 點擊「🎤 開始語音練習 Pitch」
├─ 錄音中：「🔴 停止錄音」
├─ 錄音完成 → AI 評分回饋
└─ 進入選擇階段

步驟 6：練習完成選擇
├─ 🔄 再次練習 Pitch → 回到步驟 5
└─ 📝 生成關鍵字提點 → 進入步驟 7

步驟 7：生成關鍵字筆記
├─ AI 生成英文版關鍵字提點
└─ 進入步驟 8

步驟 8：關鍵字筆記
├─ 📋 複製關鍵字筆記
└─ 🔄 重新上傳新作品
```

## 🎨 UI 設計特點

### 1. **雙按鈕布局**
- **左側**：🔄 再次練習 Pitch（藍青漸層）
- **右側**：📝 生成關鍵字提點（綠色漸層）

### 2. **按鈕功能**
```typescript
// 再次練習按鈕
onClick={() => {
  setCurrentStage('practice-pitch')  // 回到練習階段
  startRecording()                   // 立即開始錄音
}}

// 生成關鍵字按鈕
onClick={async () => {
  await triggerStageAction('evaluation')  // 觸發關鍵字生成
}}
```

### 3. **視覺回饋**
- 水平排列的雙按鈕
- 清楚的顏色區分（藍色 vs 綠色）
- Hover 效果和禁用狀態
- 清楚的提示文字

## 🎯 功能優勢

### 1. **無限制練習** 🔄
- 學生可以反覆練習直到滿意
- 每次練習都有 AI 評分回饋
- 提升口語表達技巧

### 2. **靈活選擇** 🎯
- 想繼續練習就點「再次練習」
- 滿意了就點「生成關鍵字提點」
- 學生完全控制學習節奏

### 3. **英文關鍵字筆記** 📝
- 根據最後一次練習生成
- 英文版本，方便複製使用
- 包含核心訊息、關鍵詞彙、結構提示、記憶點

### 4. **用戶體驗優化** ✨
- 清楚的分階段流程
- 直觀的按鈕選擇
- 完整的學習循環

## 📊 階段狀態管理

### 🔄 **狀態轉換：**
```typescript
practice-pitch (練習中)
    ↓ 錄音完成 + AI 評分
practice-again (選擇階段)
    ↓ 學生選擇
    ├─ 選擇「再次練習」→ practice-pitch
    └─ 選擇「生成關鍵字」→ evaluation
```

### 📝 **標籤定義：**
```typescript
'practice-pitch': '練習 Pitch',
'practice-again': '練習完成選擇',
'evaluation': '評分與回饋',
```

## ✅ 功能完成

**現在學生可以：**
1. ✅ 完成語音練習 Pitch
2. ✅ 查看 AI 評分回饋
3. ✅ 選擇再次練習（無限制）
4. ✅ 選擇生成英文關鍵字筆記
5. ✅ 複製關鍵字筆記或重新開始

**重複練習 Pitch 功能完全實現！** 🔄✨

## 🎉 完整學習循環

```
練習 → 評分 → 選擇 → 練習 → 評分 → 選擇 → ... → 生成筆記 → 完成
```

學生現在可以無限制地練習，直到對自己的 Pitch 表達滿意為止！
