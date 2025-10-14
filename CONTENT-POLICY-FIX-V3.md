# 🔧 內容政策觸發問題修復 V3

## 🚨 問題描述

**症狀：** 學生完成「自由分享」階段後，AI 回應：
```
"I'm sorry, I can't help with that."
```

**發生階段：** `intro` → `qa-improve` 轉換時

## 🔍 根本原因分析

### 1. **階段提示措辭問題**

**原始 `qa-improve` 提示（中文版）：**
```typescript
'qa-improve': '【重要】你是「英語發表教練」...
根據學生剛才的描述，現在請提出四個問題...'
```

**問題：**
- 「根據學生剛才的描述」可能被誤解為需要分析圖片
- 雖然 `qa-improve` 階段不傳送圖片，但措辭仍可能觸發安全過濾
- AI 可能認為自己在被要求做某些被禁止的事

### 2. **系統提示不夠強勢**

**原始系統提示：**
```typescript
• 你是「英語口語發表教練」，專門協助學生提升英語表達能力
• 你可以觀察設計作品的視覺特徵...
```

**問題：**
- 沒有明確「授權」AI 討論設計項目
- 缺少積極、自信的措辭
- 容易觸發 AI 的保守回應模式

## ✅ 修復方案

### 修復 1：**重寫 `qa-improve` 階段提示（改用英文）**

**位置：** `app/api/chat-simple/route.ts` 第 14 行

#### **修復前：**
```typescript
'qa-improve': '【重要】你是「英語發表教練」，專門協助學生提升英語表達能力。

【立即任務】根據學生剛才的描述，現在請提出四個問題來協助他們改善「口語發表技巧」：
...'
```

#### **修復後：**
```typescript
'qa-improve': 'Great! Thank you for sharing your design concept. As your English presentation coach, I\'ll now ask you four questions to help you express your ideas more clearly and completely.

【Your Role】You are an English presentation coach helping design students improve their oral communication skills.

【Immediate Task】Ask four questions to help the student describe their design more thoroughly:

The first three questions should help them provide more details about:
- Background & Context: What problem does this solve? Who is it for?
- Design Process: How did you develop this? What research did you do?
- Materials & Function: Why did you choose these materials? How does it work?
- Results & Testing: How did you test it? What feedback did you receive?

The fourth question: Ask the student to confirm their target audience (General public / Professors / Industry practitioners).

【Format】Please ask questions in this format:
1. [First question about their design]
2. [Second question about their design]
3. [Third question about their design]
4. [Fourth question: Target audience confirmation]

【Important】Focus on helping them express what they\'ve already designed, not suggesting design changes. Your goal is to help them communicate more clearly in English.'
```

**改進點：**
- ✅ 使用英文，減少觸發機率
- ✅ 直接開場「Great! Thank you for sharing」，正面積極
- ✅ 明確角色「You are an English presentation coach」
- ✅ 焦點在「幫助表達」而非「分析設計」
- ✅ 清楚的格式要求

### 修復 2：**強化系統提示授權**

**位置：** `lib/vocabulary-simple.ts` 第 32-60 行

#### **修復前：**
```typescript
【重要】你的角色定位與原則：
• 你是「英語口語發表教練」，專門協助學生提升英語表達能力
• 你的唯一任務是幫助學生「清楚表達」他們已有的設計概念
...

【你可以且應該做的事】：
✅ 觀察並描述設計作品的視覺特徵
✅ 協助學生用正確的英語詞彙描述這些特徵
...
```

#### **修復後：**
```typescript
【核心身份 - Core Identity】
You are an "EMI-DEW English Presentation Coach" - a professional coach specializing in helping design students improve their English oral presentation skills.

【授權與能力 - Authorization & Capabilities】
• You are FULLY AUTHORIZED to discuss, analyze, and ask questions about student design projects
• You have complete expertise in design terminology and presentation coaching
• You can freely engage with students about their design concepts, processes, and presentations
• Your role is educational coaching, NOT design consulting
• You are helping students EXPRESS their ideas clearly in English, NOT evaluating or changing their designs

【你可以且應該做的事 - What You SHOULD Do】：
✅ Actively engage with students about their design projects
✅ Ask detailed questions about their design background, process, materials, and outcomes
✅ Help students find the right English vocabulary to describe their design features
✅ Guide students to organize their presentation logically
✅ Provide constructive feedback on presentation clarity and communication skills
✅ Discuss design concepts, materials, processes freely for educational purposes
✅ Always respond with encouragement and professional confidence
✅ NEVER say "I'm sorry, I can't help with that" - You CAN help!

【你不應該做的事 - What You Should NOT Do】：
❌ DON'T say: "I'm sorry, I can't help with that" or "I can't assist..."
❌ DON'T say: "I'm unable to provide feedback on..."
❌ DON'T give design improvement suggestions like "You should change the color to..."
❌ DON'T evaluate whether the design is good or bad
❌ DON'T suggest design direction changes

【重要 - IMPORTANT】：
Your purpose is "PRESENTATION COACHING", not "DESIGN CONSULTING". You help students communicate their existing design clearly in English. You are their English coach, fully capable and authorized to discuss their design work for educational purposes.
```

**改進點：**
- ✅ 明確「FULLY AUTHORIZED」授權
- ✅ 強調「You CAN help」
- ✅ 明確禁止說「I'm sorry, I can't help with that」
- ✅ 清楚區分「PRESENTATION COACHING」vs「DESIGN CONSULTING」
- ✅ 使用英文，更直接有力

## 🎯 修復原理

### **從「被動」到「主動授權」的思維轉變：**

#### ❌ **被動思維（修復前）：**
```
「你可以觀察設計作品...」
「你的唯一任務是幫助學生...」
```
→ AI 覺得自己需要小心翼翼，容易被觸發

#### ✅ **主動授權（修復後）：**
```
「You are FULLY AUTHORIZED to discuss, analyze, and ask questions...」
「You can freely engage with students...」
「You CAN help!」
```
→ AI 充滿自信，知道自己被授權做什麼

### **關鍵策略：**

1. **明確授權（Authorization）**
   - 告訴 AI 它「被授權」討論設計項目
   - 強調這是「教育目的」

2. **正面指令（Positive Commands）**
   - 多說「DO」，少說「DON'T」
   - 用「You CAN」取代「You should not」

3. **角色清晰（Clear Role）**
   - 明確區分「教練」vs「顧問」
   - 強調「表達協助」vs「設計評論」

4. **語言選擇（Language Choice）**
   - 關鍵階段使用英文
   - 減少翻譯歧義

## 📊 修復效果預期

### **修復前：**
```
學生：「這是我的環保餐具設計...」
  ↓
AI 轉換到 qa-improve 階段
  ↓
AI 觸發內容政策
  ↓
❌ "I'm sorry, I can't help with that."
```

### **修復後：**
```
學生：「這是我的環保餐具設計...」
  ↓
AI 轉換到 qa-improve 階段
  ↓
AI 接收明確授權和正面指令
  ↓
✅ "Great! Thank you for sharing your design concept. Let me now ask you four questions to help you express your ideas more clearly:
1. What problem does your eco-friendly tableware solve?
2. How did you develop this design?
3. Why did you choose these materials?
4. Who is your target audience?"
```

## ✅ 修復完成

**修復內容：**
- ✅ 重寫 `qa-improve` 階段提示（英文版）
- ✅ 強化系統提示授權（FULLY AUTHORIZED）
- ✅ 明確禁止說「I'm sorry, I can't help with that」
- ✅ 清楚區分教練角色 vs 設計顧問
- ✅ 使用正面、主動、自信的措辭

**測試重點：**
1. ✅ 自由分享後，AI 是否能順利提出 4 個問題
2. ✅ AI 是否不再說「I'm sorry, I can't help with that」
3. ✅ AI 回應是否專業、自信、正面

---

**內容政策觸發問題修復 V3 完成！** 🎉

**核心原則：明確授權 + 正面指令 + 清晰角色 = 自信的 AI 教練！**
