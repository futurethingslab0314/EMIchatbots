# 🌏 AI 回覆語言設定說明

## 📍 語言設定位置

### **主要設定位置：** `lib/vocabulary-simple.ts` 第 68-70 行

```typescript
— 工作語言與輸出：
• 接受中文或英文輸入。預設最終演講稿輸出為英文；若學生明確要求，可提供繁體中文或中英對照版本。
• 追問與互動提示可以學生的語言回覆（學生用中文，你就用繁體中文提問；學生用英文，你就用英文提問）。
```

## 🎯 語言決定規則

### **1. 對話互動階段（intro, qa-improve, confirm-summary）**

**規則：** 跟隨學生的語言

```
學生用中文 → AI 用繁體中文回覆
學生用英文 → AI 用英文回覆
```

**範例：**
```
學生：「這是我設計的一個環保餐具。」
AI：「很棒！我注意到你的設計有很有趣的視覺特徵。現在不用緊張，這是 'think out loud' 階段，請自然地分享你的設計概念和想法。」
```

```
學生："This is my eco-friendly tableware design."
AI: "Great! I can see your design has some interesting visual features. Now don't be nervous, this is the 'think out loud' stage. Please naturally share your design concepts and ideas."
```

### **2. 最終 Pitch 稿（generate-pitch）**

**規則：** 預設英文，除非學生明確要求中文

```typescript
— 工作語言與輸出：
• 預設最終演講稿輸出為英文
• 若學生明確要求，可提供繁體中文或中英對照版本
```

**範例：**
```
預設輸出：
"As urbanization accelerates, sustainable design has become crucial. 
My eco-friendly tableware addresses the growing concern of single-use 
plastics by offering a reusable, biodegradable alternative..."
```

**如果學生要求中文：**
```
學生：「可以給我中文版的 pitch 嗎？」
AI：「當然！以下是繁體中文版本...」
```

### **3. 評分階段（evaluation）**

**規則：** 使用繁體中文（因為評分標準和回饋建議）

```
Originality: 18/20
Pronunciation: 16/20
...

很棒的表現！你的發音整體清晰，專業術語掌握得不錯...
```

### **4. 關鍵字筆記（keywords）**

**規則：** 英文為主，中英對照

```typescript
'keywords': '生成一份簡潔的 Pitch 關鍵字提點筆記in english，格式適合複製到手機做小抄。包含：
- 核心訊息（3-5 個重點）
- 關鍵詞彙（中英對照，含詞彙表術語）
'
```

**範例：**
```
Core Messages:
1. Sustainable design solution
2. Biodegradable materials
3. User-centered approach

Key Vocabulary:
- Sustainability 永續性
- Biodegradable 可生物分解的
- Ergonomic 符合人體工學的
```

## 📊 各階段語言使用總覽

| 階段 | 語言規則 | 原因 |
|------|---------|------|
| `upload` | - | 無 AI 回應 |
| `intro` | 跟隨學生 | 建立舒適的對話環境 |
| `qa-improve` | 跟隨學生 | 保持對話自然流暢 |
| `confirm-summary` | 跟隨學生 | 確保學生理解重點 |
| `generate-pitch` | **英文**（預設） | 訓練英語 pitch 能力 |
| `practice-pitch` | - | 學生朗讀英文稿 |
| `practice-again` | - | 顯示評分圖表 |
| `evaluation` | 繁體中文 | 清楚理解評分回饋 |
| `keywords` | 英文 + 中英對照 | 方便學習和記憶 |

## 🔄 AI 如何判斷學生的語言？

### **自動判斷機制：**

AI 透過 GPT-4o 的語言理解能力自動判斷：

```typescript
// 在 system prompt 中的指示
• 追問與互動提示可以學生的語言回覆
  （學生用中文，你就用繁體中文提問；
   學生用英文，你就用英文提問）
```

**GPT-4o 會自動：**
1. 分析學生輸入的語言
2. 根據語言選擇相應的回覆語言
3. 保持對話的自然流暢

### **範例流程：**

```
學生錄音（中文）："這個設計是為了解決..."
  ↓
Whisper API 轉文字："這個設計是為了解決..."
  ↓
GPT-4o 判斷：中文輸入
  ↓
AI 回應（繁體中文）："很好！那麼這個設計的目標使用者是誰呢？"
```

```
學生錄音（英文）："This design aims to solve..."
  ↓
Whisper API 轉文字："This design aims to solve..."
  ↓
GPT-4o 判斷：英文輸入
  ↓
AI 回應（英文）："Great! Who is the target user for this design?"
```

## 💡 如何修改語言設定？

### **方法 1：修改系統提示**

**位置：** `lib/vocabulary-simple.ts` 第 68-70 行

#### 如果想要**全程中文**：
```typescript
— 工作語言與輸出：
• 接受中文或英文輸入。
• 所有回應和輸出都使用繁體中文。
• 最終 Pitch 稿也提供繁體中文版本。
```

#### 如果想要**全程英文**：
```typescript
— 工作語言與輸出：
• All interactions and outputs should be in English.
• Help students practice English communication throughout the entire process.
• Provide feedback and suggestions in English.
```

#### 如果想要**中英混合**（目前設定）：
```typescript
— 工作語言與輸出：
• 接受中文或英文輸入。預設最終演講稿輸出為英文；若學生明確要求，可提供繁體中文或中英對照版本。
• 追問與互動提示可以學生的語言回覆（學生用中文，你就用繁體中文提問；學生用英文，你就用英文提問）。
```

### **方法 2：修改特定階段的語言**

**位置：** `app/api/chat-simple/route.ts` 的 `STAGE_PROMPTS`

#### 例如：強制 `qa-improve` 使用英文
```typescript
'qa-improve': '【Important】You are an English presentation coach...

【Immediate Task】Based on the student\'s description, now please ask four questions in English to help improve their "presentation skills"...

【Format Requirements】Please ask questions in the following format:
1. [First question]
2. [Second question]
3. [Third question]
4. [Fourth question: Target audience confirmation]
'
```

## 🎯 目前的語言策略

### **設計理念：**

1. **對話階段（intro, qa-improve, confirm-summary）**
   - 跟隨學生語言
   - 減少語言障礙
   - 建立舒適的對話環境

2. **Pitch 生成（generate-pitch）**
   - 預設英文
   - 訓練英語 pitch 能力
   - 符合 EMI（English Medium Instruction）教學目標

3. **評分回饋（evaluation）**
   - 使用中文
   - 確保學生完全理解回饋
   - 提升學習效果

4. **關鍵字筆記（keywords）**
   - 英文為主，中英對照
   - 方便學習和記憶
   - 實用性強

### **平衡考量：**
- ✅ 對話舒適度（跟隨學生語言）
- ✅ 英語訓練目標（Pitch 用英文）
- ✅ 學習效果（評分用中文）
- ✅ 實用性（關鍵字中英對照）

## ✅ 總結

**目前 AI 回覆語言由以下因素決定：**

1. **系統提示**（`lib/vocabulary-simple.ts`）- 全局規則
2. **階段提示**（`app/api/chat-simple/route.ts`）- 階段特定規則
3. **GPT-4o 自動判斷** - 學生輸入語言
4. **階段目標** - 不同階段的教學目標

**語言切換流程：**
```
對話互動 → 跟隨學生（中/英）
  ↓
生成 Pitch → 英文（預設）
  ↓
評分回饋 → 繁體中文
  ↓
關鍵字筆記 → 英文 + 中英對照
```

---

**語言設定靈活且符合教學目標！** 🌏✨
