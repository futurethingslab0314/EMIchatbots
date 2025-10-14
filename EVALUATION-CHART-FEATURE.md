# 📊 評分圖表視覺化功能

## 🎯 功能概述

在步驟 5「語音練習 Pitch」完成後，系統會自動提取 AI 的評分數據，並在 `practice-again` 階段以美觀的長條圖形式呈現四大評分面向。

## 📍 實現位置

### 1. **前端狀態管理**
**位置：** `app/page.tsx` 第 37-42 行

```typescript
const [evaluationScores, setEvaluationScores] = useState<{
  pronunciation: number
  engagingTone: number
  contentDelivery: number
  timeManagement: number
} | null>(null)
```

### 2. **評分提取函數**
**位置：** `app/page.tsx` 第 460-480 行

```typescript
const extractScoresFromResponse = (response: string) => {
  try {
    // 使用正則表達式從 AI 回應中提取分數
    const pronunciationMatch = response.match(/Pronunciation[：:]\s*(\d+)/i)
    const engagingMatch = response.match(/Engaging Tone[：:]\s*(\d+)/i)
    const contentMatch = response.match(/Content Delivery[：:]\s*(\d+)/i)
    const timeMatch = response.match(/Time Management[：:]\s*(\d+)/i)

    if (pronunciationMatch && engagingMatch && contentMatch && timeMatch) {
      setEvaluationScores({
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

### 3. **自動提取邏輯**
**位置：** `app/page.tsx` 第 177-180 行

```typescript
// 如果是 practice-pitch 階段，嘗試提取評分
if (currentStage === 'practice-pitch' && nextStage === 'practice-again') {
  extractScoresFromResponse(reply)
}
```

### 4. **視覺化圖表組件**
**位置：** `app/page.tsx` 第 693-767 行

```typescript
{evaluationScores && (
  <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
    <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">
      📊 Pitch 表達技巧評分
    </h3>
    <div className="space-y-4">
      {/* 四個評分項目的長條圖 */}
      {/* 總分顯示 */}
    </div>
  </div>
)}
```

## 🎨 圖表設計特點

### **四大評分面向：**

1. **Pronunciation (發音清晰度)** - 藍色長條
   - 滿分：25 分
   - 漸層：from-blue-400 to-blue-600

2. **Engaging Tone (表達吸引力)** - 綠色長條
   - 滿分：25 分
   - 漸層：from-green-400 to-green-600

3. **Content Delivery (內容表達)** - 紫色長條
   - 滿分：25 分
   - 漸層：from-purple-400 to-purple-600

4. **Time Management (時間掌控)** - 橙色長條
   - 滿分：25 分
   - 漸層：from-orange-400 to-orange-600

### **視覺化特點：**

```typescript
<div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
  <div 
    className="bg-gradient-to-r from-blue-400 to-blue-600 h-4 rounded-full transition-all duration-1000 ease-out"
    style={{ width: `${(score / 25) * 100}%` }}
  ></div>
</div>
```

- **動畫效果**：`transition-all duration-1000 ease-out`（1 秒緩入緩出）
- **圓角設計**：`rounded-full`
- **漸層背景**：每個評分項目使用不同顏色漸層
- **百分比寬度**：根據分數動態計算長條寬度

### **總分顯示：**

```typescript
<div className="pt-4 mt-4 border-t-2 border-gray-200">
  <div className="flex justify-between items-center">
    <span className="text-lg font-bold text-gray-800">總分 Total Score</span>
    <span className="text-2xl font-bold text-indigo-600">
      {pronunciation + engagingTone + contentDelivery + timeManagement}/100
    </span>
  </div>
</div>
```

## 🔄 完整流程

```
步驟 5：🎤 語音練習 Pitch
  ↓
學生錄音練習
  ↓
AI 評分並返回 rubric（包含明確的分數格式）
  ↓
前端自動提取評分數據
  ↓
進入 practice-again 階段
  ↓
📊 顯示評分圖表
  ├─ Pronunciation: XX/25 (藍色)
  ├─ Engaging Tone: XX/25 (綠色)
  ├─ Content Delivery: XX/25 (紫色)
  ├─ Time Management: XX/25 (橙色)
  └─ Total Score: XX/100
  ↓
學生選擇：🔄 再次練習 or 📝 生成關鍵字提點
```

## 📊 後端評分格式要求

**位置：** `app/api/chat-simple/route.ts` 第 19 行

```typescript
'evaluation': '...
【重要輸出格式】請務必在回應中包含以下格式的評分（以便系統自動生成圖表）：
Pronunciation: [分數]/25
Engaging Tone: [分數]/25
Content Delivery: [分數]/25
Time Management: [分數]/25

然後再給予具體的改進建議。...'
```

### **AI 回應範例：**

```
Great job on your pitch practice! Here's your evaluation:

Pronunciation: 22/25
Your English pronunciation is quite clear, and you handled most technical terms well.

Engaging Tone: 20/25
Good use of pauses and emphasis on key points. Try to vary your tone more.

Content Delivery: 23/25
Your logical flow was excellent, and you covered all the main points clearly.

Time Management: 21/25
You completed the pitch in about 3 minutes, which is perfect timing.

[具體改進建議...]
```

## 🎯 技術亮點

### 1. **正則表達式解析**
```typescript
const pronunciationMatch = response.match(/Pronunciation[：:]\s*(\d+)/i)
```
- 支援中英文冒號
- 不區分大小寫
- 靈活提取數字

### 2. **動態寬度計算**
```typescript
style={{ width: `${(score / 25) * 100}%` }}
```
- 根據分數自動計算長條寬度
- 滿分時顯示 100% 寬度

### 3. **漸入動畫**
```css
transition-all duration-1000 ease-out
```
- 長條圖從 0 開始動畫展開到實際分數
- 視覺效果更吸引人

### 4. **顏色編碼**
每個評分面向使用不同顏色，方便快速識別：
- 🔵 藍色 = 發音
- 🟢 綠色 = 表達
- 🟣 紫色 = 內容
- 🟠 橙色 = 時間

## ✅ 功能完成

**現在學生可以：**
- ✅ 完成語音練習 Pitch
- ✅ 自動獲得 AI 評分
- ✅ 查看美觀的評分圖表（長條圖）
- ✅ 快速識別四大評分面向的表現
- ✅ 查看總分（滿分 100）
- ✅ 選擇再次練習或生成關鍵字筆記

**評分圖表視覺化功能完成！** 📊✨

---

**特色：直觀、美觀、自動化的評分視覺化系統！**
