# 📝 確認重點階段 Prompt 優化

## 🎯 用戶需求

**需求描述**：
> 在互動流程3 整理學生表達的重點的部分，想要增加一個規則：只是要快速確認重點(120-180字內)，還不要生成pitch draft喔！

## 📋 問題背景

### **原本的問題**：
在 `confirm-summary` 階段，AI 有時會生成過於完整的 pitch draft，而不是簡單地整理學生說的重點。

### **期望的行為**：
- ✅ 快速整理學生表達的重點（120-180 字內）
- ✅ 簡潔的 2-3 個短段落
- ❌ 不要生成完整的演講稿
- ❌ 不要添加新內容

---

## ✅ 修改內容

### **修改位置**：
`app/api/chat-simple/route.ts` 第 15 行

### **修改前**：
```typescript
'confirm-summary': '根據學生的描述和回答，整理出他們想要「表達的設計重點」（120-180 字英文段落）。這是整理他們「說了什麼」，不是評論設計好壞。使用專業詞彙，邏輯清楚。最後請學生確認這個整理是否準確反映他們的想法。',
```

### **修改後**：
```typescript
'confirm-summary': '根據學生的描述和回答，快速整理出他們想要「表達的設計重點」（120-180 字內）。\n\n【重要規則】：\n• 這只是「快速確認重點」，不是生成完整的 pitch draft！\n• 簡潔地整理學生「說了什麼」，不要添加新內容\n• 不要評論設計好壞\n• 使用專業詞彙，邏輯清楚\n• 最後請學生確認這個整理是否準確反映他們的想法\n\n【格式】：用 2-3 個短段落呈現，不要寫成完整的演講稿。',
```

---

## 🎯 新增規則說明

### **1. 明確定位**：
```
• 這只是「快速確認重點」，不是生成完整的 pitch draft！
```
**目的**：明確告訴 AI 這個階段的任務定位，避免過度發揮。

### **2. 內容限制**：
```
• 簡潔地整理學生「說了什麼」，不要添加新內容
```
**目的**：確保 AI 只是整理，不要擴充或創造新內容。

### **3. 字數限制**：
```
（120-180 字內）
```
**目的**：明確字數範圍，避免過長。

### **4. 格式要求**：
```
【格式】：用 2-3 個短段落呈現，不要寫成完整的演講稿。
```
**目的**：確保輸出格式簡潔，不是完整的演講結構。

---

## 📊 階段對比

### **階段 3: confirm-summary（確認重點）**
**目的**：快速整理學生說的重點
**輸出**：
- 📝 120-180 字的簡短整理
- 📋 2-3 個短段落
- ✅ 只整理學生說的內容
- ❌ 不添加新內容
- ❌ 不是完整演講稿

**範例輸出**：
```
Based on your description, here are the key points:

Your project is a sustainable packaging design that addresses plastic waste. 
You used recycled cardboard and developed a modular structure for easy assembly. 
The design was tested with 20 users and received positive feedback on usability.

Does this accurately reflect what you want to present?
```

### **階段 4: generate-pitch（生成完整 Pitch）**
**目的**：生成完整的 3 分鐘演講稿
**輸出**：
- 📝 200 words 以內的完整 pitch
- 📋 完整的演講結構（Hook → Background → Design Intent → Process → Materials → Outcomes → Impact）
- ✅ 根據目標聽眾調整語言
- ✅ 專業且流暢的演講稿

**範例輸出**：
```
Imagine a world where packaging doesn't end up in landfills. That's the vision 
behind EcoPack, a sustainable packaging solution I designed to tackle the growing 
plastic waste crisis. With over 8 million tons of plastic entering our oceans 
annually, we need alternatives that are both functional and environmentally 
responsible.

EcoPack is made from 100% recycled cardboard, featuring a modular structure 
that requires no tape or glue for assembly. Through iterative prototyping and 
user testing with 20 participants, I refined the design to ensure it's not only 
eco-friendly but also user-friendly...

[完整的演講內容]
```

---

## 🔄 互動流程

### **完整流程**：
```
1. upload (上傳作品)
   ↓
2. intro (介紹作品特徵，引導自由分享)
   ↓
3. qa-improve (提出 4 個問題)
   ↓
4. confirm-summary (快速確認重點) ← 📝 這次修改的階段
   ↓ 學生確認或重新描述
5. generate-pitch (生成完整 3 分鐘 pitch)
   ↓
6. practice-pitch (練習錄音)
   ↓
7. evaluation (評分)
   ↓
8. keywords (生成小抄)
```

### **階段 4 的兩個按鈕**：
1. **🔄 重新描述作品**：回到 `intro` 階段
2. **✅ 確認生成 3 分鐘 Pitch**：進入 `generate-pitch` 階段

---

## ✅ 預期效果

### **修改前的問題**：
- ❌ AI 可能生成過於完整的內容
- ❌ 學生難以判斷是「確認重點」還是「最終 pitch」
- ❌ 內容過長，不適合快速確認

### **修改後的改善**：
- ✅ AI 只會生成簡短的重點整理
- ✅ 學生可以快速確認內容是否正確
- ✅ 明確區分「確認重點」和「生成 pitch」兩個階段
- ✅ 流程更清晰，學生體驗更好

---

## 🎯 使用場景

### **場景 1：學生確認重點正確**
```
AI: Based on your description, here are the key points:
    [簡短的 2-3 段重點整理]
    Does this accurately reflect what you want to present?

學生: 是的，這就是我想表達的重點。

→ 點擊「✅ 確認生成 3 分鐘 Pitch」
→ 進入 generate-pitch 階段
→ AI 生成完整的演講稿
```

### **場景 2：學生發現重點不完整**
```
AI: Based on your description, here are the key points:
    [簡短的 2-3 段重點整理]
    Does this accurately reflect what you want to present?

學生: 不太對，我想重新描述一下。

→ 點擊「🔄 重新描述作品」
→ 回到 intro 階段
→ 學生重新分享作品
```

---

## 📝 總結

**修改內容**：
- ✅ 明確定義 `confirm-summary` 階段的任務：快速確認重點
- ✅ 強調不要生成完整的 pitch draft
- ✅ 限制字數（120-180 字）和格式（2-3 個短段落）
- ✅ 明確區分「確認重點」和「生成 pitch」兩個階段

**預期效果**：
- ✅ AI 輸出更簡潔、更符合階段目的
- ✅ 學生可以快速確認重點是否正確
- ✅ 流程更清晰，體驗更好
- ✅ 避免過早生成完整演講稿

**下一步**：
- 測試 `confirm-summary` 階段的輸出是否符合預期
- 確認學生可以順利進入 `generate-pitch` 階段
- 檢查完整流程是否流暢

---

**修改日期**：2025-10-14  
**修改者**：AI Assistant  
**狀態**：已完成，待用戶測試確認
