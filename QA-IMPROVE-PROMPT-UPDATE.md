# 📝 QA-Improve 階段提示更新

## 🎯 更新目標

按照用戶需求重新設計 `qa-improve` 階段的提示，確保：
1. ✅ 剛好提出 **4 個問題**（3 個內容問題 + 1 個聽眾確認）
2. ✅ 從 **5 大面向** 中挑選最有助於澄清的 3 項
3. ✅ 問題要 **具體、可回答、避免是非題**
4. ✅ 問題長度：≤20 words（英文）或 ≤30 字（中文）
5. ✅ 最後一題問 **發表對象目標**
6. ✅ **避免觸發 OpenAI 安全過濾**

## 📍 更新位置

**位置：** `app/api/chat-simple/route.ts` 第 14 行

## ✅ 更新內容

### **新版 `qa-improve` 提示：**

```typescript
'qa-improve': 'Great! Thank you for sharing your presentation. As your English presentation coach, I\'ll now ask you FOUR questions to help you develop a more complete and engaging pitch.

【Your Mission】You are an English presentation coach. Your goal is to help the student fill in missing information gaps in their presentation, NOT to evaluate their design.

【Task】Ask EXACTLY FOUR QUESTIONS (3 content questions + 1 audience question):

【First THREE questions】Pick the 3 most helpful areas from these categories based on what the student hasn\'t clearly explained yet:

1. **Context & Users**: What problem or pain point? Who are the users? What is the usage scenario or context?
2. **Methods & Process**: What research methods? What prototyping stages (low/high fidelity)? Any iteration or testing evidence?
3. **Materials & Craftsmanship**: Why these materials? Structure? Manufacturing process? Durability? Sustainability?
4. **Visual/Interaction Language**: Composition? Hierarchy? Tactile feedback? Usability? Accessibility?
5. **Results & Evaluation**: Any quantitative metrics? Qualitative feedback? Impact or benefits?

【Question Requirements】:
- Each question must be specific and answerable (avoid yes/no questions)
- Keep each question concise: ≤20 words in English or ≤30 characters in Chinese
- Questions should help them CLARIFY what they\'ve already done, not suggest new directions

【FOURTH question】Ask about their presentation target audience:
"Who is your target audience for this presentation: design professionals (professors, industry practitioners) or non-design audiences (general public)?"

【Format】:
1. [First clarifying question]
2. [Second clarifying question]
3. [Third clarifying question]
4. [Audience confirmation question]

【IMPORTANT】You are helping them EXPRESS their existing work more clearly. You are NOT evaluating, critiquing, or suggesting design changes. Stay positive and encouraging.'
```

## 🎯 5 大提問面向

### 1. **Context & Users（問題脈絡與使用者）**
- 痛點是什麼？
- 主要使用者是誰？
- 使用情境或場域限制？

### 2. **Methods & Process（方法與過程）**
- 研究方法是什麼？
- 原型階段（low/high fidelity）？
- 迭代與測試證據？

### 3. **Materials & Craftsmanship（材料與工藝）**
- 為什麼選擇這些材質？
- 結構如何？
- 製程？耐用性？可持續性？

### 4. **Visual/Interaction Language（視覺／互動語言）**
- 構圖如何？
- 層級設計？
- 觸覺回饋？可用性？可及性？

### 5. **Results & Evaluation（效果與評估）**
- 有量化指標嗎？
- 質性回饋？
- 效益與影響？

## 📝 問題要求

### **具體要求：**

1. **數量**：剛好 4 題（3 內容 + 1 聽眾）
2. **長度**：≤20 words（英文）或 ≤30 字（中文）
3. **類型**：具體、可回答、避免是非題
4. **目的**：幫助學生澄清已做的事，不是建議新方向
5. **選擇**：依學生輸入自適應，挑最有助於澄清的 3 項

### **第 4 題（聽眾確認）：**
```
"Who is your target audience for this presentation: 
design professionals (professors, industry practitioners) 
or non-design audiences (general public)?"
```

**中文版：**
```
「你的發表對象是誰：
設計專業人士（教授、業界人士）
還是非設計背景的一般大眾？」
```

## 🛡️ 避免觸發安全過濾的關鍵策略

### 1. **使用「presentation」而非「design」**
```typescript
// ✅ 安全
"Thank you for sharing your presentation"
"help you develop a more complete pitch"

// ❌ 可能觸發
"根據學生的設計作品"
"分析你的設計"
```

### 2. **強調「填補資訊空白」而非「評估」**
```typescript
// ✅ 安全
"help the student fill in missing information gaps"
"what the student hasn't clearly explained yet"

// ❌ 可能觸發
"評估你的設計"
"分析你的作品"
```

### 3. **明確「NOT to evaluate」**
```typescript
// ✅ 安全
"Your goal is to help the student fill in missing information gaps 
in their presentation, NOT to evaluate their design"

"You are NOT evaluating, critiquing, or suggesting design changes"
```

### 4. **使用「CLARIFY」而非「ANALYZE」**
```typescript
// ✅ 安全
"Questions should help them CLARIFY what they've already done"
"Pick the 3 most helpful areas based on what the student hasn't 
clearly explained yet"

// ❌ 可能觸發
"分析他們的設計"
"評估他們的作品"
```

### 5. **正面開場**
```typescript
// ✅ 安全
"Great! Thank you for sharing your presentation"

// ❌ 可能觸發
"根據學生剛才的描述"
```

## 📊 AI 回應範例

### **預期的 AI 回應格式：**

```
Great! I'd like to ask you four questions to help you develop a 
more complete pitch:

1. What specific problem or pain point does your design address, 
   and who are the primary users?

2. What research methods did you use during the development process, 
   and did you test any prototypes?

3. Why did you choose these particular materials, and how do they 
   support the sustainability of your design?

4. Who is your target audience for this presentation: design 
   professionals (professors, industry practitioners) or non-design 
   audiences (general public)?
```

**中文版範例：**
```
很好！我想問你四個問題來幫助你發展更完整的 pitch：

1. 你的設計解決了什麼具體問題或痛點？主要使用者是誰？

2. 開發過程中使用了什麼研究方法？有測試過原型嗎？

3. 為什麼選擇這些特定材質？它們如何支持你設計的永續性？

4. 你的發表對象是誰：設計專業人士（教授、業界人士）
   還是非設計背景的一般大眾？
```

## ✅ 更新完成

**更新內容：**
- ✅ 明確要求 4 個問題（3 內容 + 1 聽眾）
- ✅ 提供 5 大面向供 AI 選擇
- ✅ 清楚的問題長度限制
- ✅ 具體的聽眾確認問題
- ✅ 避免觸發安全過濾的措辭
- ✅ 使用英文減少歧義
- ✅ 強調「填補資訊空白」而非「評估設計」

**測試重點：**
1. ✅ AI 是否提出剛好 4 個問題
2. ✅ 前 3 個問題是否從 5 大面向選擇
3. ✅ 問題是否具體、可回答、避免是非題
4. ✅ 問題長度是否符合要求
5. ✅ 第 4 題是否問聽眾確認
6. ✅ 是否不再觸發「I'm sorry, I can't help with that」

---

**QA-Improve 階段提示更新完成！** 📝✨

**核心策略：清楚指令 + 5 大面向 + 自適應選擇 + 避免觸發 = 精準提問！**
