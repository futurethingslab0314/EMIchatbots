# ✅ 步驟4確認階段雙按鈕功能

## 🎯 需求

**用戶要求：**
- 在步驟4（`confirm-summary`）「確認設計重點」階段
- 出現兩個按鈕選項：
  1. **🔄 重新描述作品** - 回到之前的階段重新描述
  2. **✅ 確認生成 3 分鐘 Pitch** - 確認重點後生成 pitch
- 其他流程維持不變

## ✅ 實現方案

### **1. 新增按鈕處理函數**

**位置：** `app/page.tsx` 第 298-307 行

```typescript
// 處理確認階段按鈕（兩個選項）
const handleConfirmStageButton = async (action: 'confirm' | 'redescribe') => {
  if (action === 'confirm') {
    // 確認生成 3 mins pitch
    await triggerStageAction('generate-pitch')
  } else if (action === 'redescribe') {
    // 重新描述作品，回到 qa-improve 階段
    setCurrentStage('qa-improve')
  }
}
```

**功能：**
- `'confirm'`：執行原本的確認生成 pitch 流程
- `'redescribe'`：回到 `qa-improve` 階段，讓學生重新描述作品

---

### **2. 修改步驟4按鈕顯示**

**位置：** `app/page.tsx` 第 647-669 行

```typescript
{/* 階段 5: 確認生成 Pitch */}
{currentStage === 'confirm-summary' && (
  <>
    <div className="flex space-x-4 justify-center">
      <button
        onClick={() => handleConfirmStageButton('redescribe')}
        disabled={isProcessing || isSpeaking}
        className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-full font-semibold text-lg hover:from-orange-600 hover:to-red-600 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50"
      >
        🔄 重新描述作品
      </button>
      <button
        onClick={() => handleConfirmStageButton('confirm')}
        disabled={isProcessing || isSpeaking}
        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full font-semibold text-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50"
      >
        ✅ 確認生成 3 分鐘 Pitch
      </button>
    </div>
    <p className="text-sm text-gray-500 mt-2 text-center">
      如果不滿意重點整理，可以重新描述；確認無誤後生成完整 pitch 稿
    </p>
  </>
)}
```

**設計特點：**
- 🔄 **重新描述按鈕**：橙色到紅色漸變，表示「修改/重做」
- ✅ **確認生成按鈕**：紫色到粉色漸變，表示「確認/繼續」
- 兩個按鈕並排顯示，居中對齊
- 更新說明文字，清楚說明兩個選項的用途

---

## 🔄 流程邏輯

### **選項1：🔄 重新描述作品**

```
步驟4: confirm-summary
  ↓ 點擊「🔄 重新描述作品」
  ↓ setCurrentStage('qa-improve')
  ↓ 回到步驟3: qa-improve
  ↓ 顯示「🎤 回答問題/增加細節」按鈕
  ↓ 學生可以重新錄音回答
  ↓ 完成後重新進入步驟4
```

### **選項2：✅ 確認生成 3 分鐘 Pitch**

```
步驟4: confirm-summary
  ↓ 點擊「✅ 確認生成 3 分鐘 Pitch」
  ↓ await triggerStageAction('generate-pitch')
  ↓ AI 生成 Pitch
  ↓ 自動轉換到步驟5: generate-pitch
  ↓ 顯示「🎤 開始練習 Pitch」按鈕
```

---

## 📊 按鈕對比

| 按鈕 | 顏色 | 功能 | 結果 |
|------|------|------|------|
| 🔄 重新描述作品 | 橙→紅 | 回到 qa-improve | 重新回答問題 |
| ✅ 確認生成 3 分鐘 Pitch | 紫→粉 | 生成 pitch | 進入練習階段 |

---

## 🎯 用戶體驗

### **使用場景：**

**場景1：不滿意重點整理**
- 學生看到 AI 整理的重點
- 覺得不夠準確或遺漏重要資訊
- 點擊「🔄 重新描述作品」
- 回到問題階段，補充更多細節

**場景2：滿意重點整理**
- 學生確認 AI 整理的重點準確
- 點擊「✅ 確認生成 3 分鐘 Pitch」
- 直接進入 pitch 生成階段

### **優點：**
- ✅ 給學生更多控制權
- ✅ 可以修正不滿意的部分
- ✅ 避免重新開始整個流程
- ✅ 保持其他階段不變

---

## 🔧 技術實現

### **修改的檔案：**
1. **`app/page.tsx`**
   - 第 298-307 行：新增 `handleConfirmStageButton` 函數
   - 第 647-669 行：修改 `confirm-summary` 階段按鈕顯示

### **新增的功能：**
- ✅ 雙按鈕選項
- ✅ 重新描述功能
- ✅ 保持原有確認功能
- ✅ 其他階段完全不變

---

## ✅ 完成狀態

**實現內容：**
- ✅ 步驟4顯示兩個按鈕
- ✅ 「🔄 重新描述作品」功能
- ✅ 「✅ 確認生成 3 分鐘 Pitch」功能
- ✅ 其他流程維持不變
- ✅ 用戶體驗優化

**測試重點：**
1. 步驟4是否顯示兩個按鈕
2. 點擊「重新描述」是否回到 qa-improve 階段
3. 點擊「確認生成」是否進入 generate-pitch 階段
4. 其他階段是否正常運作

---

**步驟4雙按鈕功能已實現！** 🎉

**功能特點：**
- 🔄 **靈活性**：可以重新描述不滿意的部分
- ✅ **確認性**：可以確認滿意的內容繼續
- 🎯 **精確性**：只修改步驟4，其他階段不變
- 💡 **用戶友好**：清楚說明兩個選項的用途
