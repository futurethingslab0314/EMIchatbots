# 🔄 重新上傳新作品功能

## 🎯 功能概述

在完成整個 Pitch 練習流程後（步驟7：關鍵字提點），學生可以點擊「🔄 重新上傳新作品」按鈕，重置所有狀態並重新開始完整的練習流程。

## 📍 程式位置

### 1. **按鈕處理邏輯**
**位置：** `app/page.tsx` 第 328-342 行
```typescript
case 'keywords':
  // 重新開始 - 重置所有狀態
  setCurrentStage('upload')
  setUploadedImages([])
  setMessages([])
  setGeneratedPitch('')
  setIsRecording(false)
  setIsProcessing(false)
  setIsSpeaking(false)
  setUserTranscript('')
  setCurrentSubtitle('')
  // 清除文件輸入
  const fileInput = document.getElementById('file-input') as HTMLInputElement
  if (fileInput) fileInput.value = ''
  break
```

### 2. **按鈕 UI 設計**
**位置：** `app/page.tsx` 第 820-842 行
```typescript
<div className="mt-4 flex space-x-4">
  <button
    onClick={() => {
      navigator.clipboard.writeText(messages[messages.length - 1]?.content || '')
      alert('✅ 已複製到剪貼簿！')
    }}
    className="flex-1 bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-all"
  >
    📋 複製關鍵字筆記
  </button>
  <button
    onClick={handleStageButton}
    disabled={isProcessing || isSpeaking}
    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50"
  >
    🔄 重新上傳新作品
  </button>
</div>
```

### 3. **流程說明更新**
**位置：** `app/page.tsx` 第 872-879 行
```typescript
<div className={`flex items-center ${currentStage === 'keywords' ? 'font-bold text-blue-600' : ''}`}>
  <span className="mr-2">{currentStage === 'keywords' ? '▶️' : '○'}</span>
  <span>7. 📝 查看關鍵字筆記 → 複製筆記或重新開始</span>
</div>
<div className="flex items-center">
  <span className="mr-2">🔄</span>
  <span>8. 點擊「重新上傳新作品」→ 重新開始完整流程</span>
</div>
```

## 🔄 重置狀態列表

### 📊 **完全重置的狀態：**
1. **階段狀態**：`currentStage` → `'upload'`
2. **上傳圖片**：`uploadedImages` → `[]`
3. **對話記錄**：`messages` → `[]`
4. **生成的 Pitch**：`generatedPitch` → `''`
5. **錄音狀態**：`isRecording` → `false`
6. **處理狀態**：`isProcessing` → `false`
7. **說話狀態**：`isSpeaking` → `false`
8. **用戶字幕**：`userTranscript` → `''`
9. **AI 字幕**：`currentSubtitle` → `''`
10. **文件輸入**：清除文件選擇器的值

## 🎨 UI 設計特點

### 1. **雙按鈕布局**
- **左側**：📋 複製關鍵字筆記（藍色）
- **右側**：🔄 重新上傳新作品（綠色漸層）

### 2. **視覺回饋**
- 綠色漸層按鈕，表示「重新開始」
- Hover 效果：顏色變深 + 輕微縮放
- 禁用狀態：處理中或 AI 說話時禁用

### 3. **用戶提示**
```typescript
<p className="text-sm text-gray-500 mt-2 text-center">
  完成練習！可以複製筆記或重新開始新的作品練習
</p>
```

## 🎯 完整用戶流程

### 📱 **新的完整流程（包含重新開始）：**

```
1️⃣ 上傳照片 → 📤 確認上傳作品
2️⃣ Bot 介紹 → 🎤 自由分享 [錄音]
3️⃣ AI 提問 → 🎤 回答問題/增加細節 [錄音]
4️⃣ 確認重點 → ✅ 確認生成 3 分鐘 Pitch
5️⃣ Pitch 生成 → ✅ Pitch 已生成完成
6️⃣ 語音練習 → 🎤 語音練習 Pitch [錄音]
7️⃣ 評分回饋 → 📝 生成關鍵字提點
8️⃣ 關鍵字筆記 → 📋 複製筆記 或 🔄 重新上傳新作品
```

### 🔄 **重新開始流程：**
```
點擊「🔄 重新上傳新作品」
↓
所有狀態重置
↓
回到步驟 1：上傳照片
↓
重新開始完整練習流程
```

## ✅ 功能優勢

### 1. **無縫體驗** 🚀
- 一鍵重置，無需刷新頁面
- 保留所有學習成果（可複製筆記）
- 立即開始新的練習

### 2. **完整重置** 🧹
- 清除所有歷史狀態
- 重置文件選擇器
- 確保新練習的乾淨開始

### 3. **用戶友好** 👥
- 清楚的視覺提示
- 雙按鈕選擇（複製或重新開始）
- 流程說明更新

### 4. **狀態安全** 🔒
- 處理中時禁用按鈕
- 防止意外重複點擊
- 確保狀態一致性

---

## 🎉 功能完成！

**現在學生可以：**
1. ✅ 完成完整的 Pitch 練習流程
2. ✅ 查看和複製關鍵字筆記
3. ✅ 一鍵重新開始新的作品練習
4. ✅ 無限制地練習多個設計作品

**重新上傳新作品功能完全實現！** 🔄✨
