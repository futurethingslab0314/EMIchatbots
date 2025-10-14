# 📊 評分圖表顯示時機說明

## 🎯 評分圖表何時出現？

### **顯示條件：**

評分圖表會在以下條件**同時滿足**時出現：

1. **當前階段 = `practice-again`**
2. **`evaluationScores` 狀態有數據**

---

## 🔄 完整觸發流程

### **步驟1：學生練習 Pitch**
```
步驟6: practice-pitch
  ↓ 點擊「🎤 開始語音練習 Pitch」
  ↓ 開始錄音 → 學生朗讀 pitch
  ↓ 點擊「🔴 停止錄音」
  ↓ 音頻發送到後端處理
```

### **步驟2：AI 評分與回應**
```
後端處理：
  ↓ 使用 Whisper 轉文字
  ↓ AI 根據 evaluation prompt 評分
  ↓ 生成評分回應（包含 5 項分數）
  ↓ 檢測關鍵字：'評分' || 'rubric' || 'Pronunciation' || 'Originality'
  ↓ 設定 nextStage = 'practice-again'
```

### **步驟3：前端解析評分**
```
前端處理：
  ↓ 收到後端回應
  ↓ 檢查：currentStage === 'practice-pitch' && nextStage === 'practice-again'
  ↓ 調用：extractScoresFromResponse(reply)
  ↓ 解析 AI 回應中的分數
  ↓ 設定 evaluationScores 狀態
  ↓ 切換到 practice-again 階段
```

### **步驟4：顯示評分圖表**
```
步驟7: practice-again
  ↓ currentStage === 'practice-again'
  ↓ evaluationScores 有數據
  ↓ ✅ 顯示評分圖表
  ↓ 同時顯示兩個選擇按鈕：
    • 🔄 再次練習 Pitch
    • 📝 生成關鍵字提點
```

---

## 📊 評分圖表內容

### **顯示的5個評分項目：**

1. **Originality (內容原創性)** - 紫色條
2. **Pronunciation (發音清晰度)** - 藍色條  
3. **Engaging Tone (表達吸引力)** - 綠色條
4. **Content Delivery (內容表達)** - 紫色條
5. **Time Management (時間掌控)** - 橙色條

### **評分格式：**
- 每項滿分：**20分**
- 總分：**100分**
- 顯示格式：`分數/20`
- 總分顯示：`總分/100`

---

## 🔍 關鍵程式碼位置

### **1. 評分解析函數**
**位置：** `app/page.tsx` 第 478-499 行

```typescript
const extractScoresFromResponse = (response: string) => {
  try {
    // 解析 AI 回應中的評分格式
    const originalityMatch = response.match(/Originality[：:]\s*(\d+)/i)
    const pronunciationMatch = response.match(/Pronunciation[：:]\s*(\d+)/i)
    const engagingMatch = response.match(/Engaging Tone[：:]\s*(\d+)/i)
    const contentMatch = response.match(/Content Delivery[：:]\s*(\d+)/i)
    const timeMatch = response.match(/Time Management[：:]\s*(\d+)/i)

    if (originalityMatch && pronunciationMatch && engagingMatch && contentMatch && timeMatch) {
      setEvaluationScores({
        originality: parseInt(originalityMatch[1]),
        pronunciation: parseInt(pronunciationMatch[1]),
        engagingTone: parseInt(engagingMatch[1]),
        contentDelivery: parseInt(contentMatch[1]),
        timeManagement: parseInt(timeMatch[1]),
      })
    }
  } catch (error) {
    console.error('解析評分時發生錯誤:', error)
  }
}
```

### **2. 觸發解析的時機**
**位置：** `app/page.tsx` 第 179-181 行

```typescript
// 如果是 practice-pitch 階段，嘗試提取評分
if (currentStage === 'practice-pitch' && nextStage === 'practice-again') {
  extractScoresFromResponse(reply)
}
```

### **3. 後端階段轉換邏輯**
**位置：** `app/api/chat-simple/route.ts` 第 176-178 行

```typescript
} else if (currentStage === 'practice-pitch' && (assistantReply.includes('評分') || assistantReply.includes('rubric') || assistantReply.includes('Pronunciation') || assistantReply.includes('Originality'))) {
  // 練習完成後，轉到選擇階段
  nextStage = 'practice-again'
}
```

### **4. 評分圖表顯示條件**
**位置：** `app/page.tsx` 第 724-727 行

```typescript
{/* 練習完成後 - 評分圖表與兩個選擇按鈕 */}
{currentStage === 'practice-again' && (
  <>
    {/* 評分圖表 */}
    {evaluationScores && (
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">
          📊 Pitch 表達技巧評分
        </h3>
        {/* 5個評分項目... */}
      </div>
    )}
  </>
)}
```

---

## ⚠️ 可能不出現評分圖表的情況

### **1. AI 回應格式不正確**
- AI 沒有按照指定格式輸出評分
- 缺少關鍵字：`Originality: X/20`、`Pronunciation: X/20` 等
- 解析失敗，`evaluationScores` 保持 `null`

### **2. 階段轉換失敗**
- AI 回應中沒有包含觸發關鍵字
- 沒有觸發 `nextStage = 'practice-again'`
- 停留在 `practice-pitch` 階段

### **3. 評分解析錯誤**
- 正則表達式匹配失敗
- 分數格式不符合預期
- JavaScript 解析錯誤

---

## 🎯 總結

**評分圖表出現的完整時機：**

1. ✅ 學生完成 pitch 語音練習
2. ✅ AI 生成評分回應（包含5項分數）
3. ✅ 後端檢測到評分關鍵字，轉換到 `practice-again` 階段
4. ✅ 前端解析 AI 回應，提取評分數據
5. ✅ 設定 `evaluationScores` 狀態
6. ✅ 顯示評分圖表 + 兩個選擇按鈕

**顯示位置：**
- 階段：`practice-again`
- 條件：`evaluationScores` 有數據
- 內容：5個評分項目的長條圖 + 總分

**評分圖表會在學生完成 pitch 練習後立即出現！** 📊
