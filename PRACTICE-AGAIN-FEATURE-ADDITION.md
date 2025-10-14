# 🔄 再次練習功能添加

## 🎯 用戶需求

**需求描述**：
> practice-again 可以改到最後 generate 小抄以後。最下面原本有「複製關鍵字」「重新上傳作品」，再多一個按鈕叫做「再次練習pitch」而這個功能會回到 practice your pitch (錄音) 的那個步驟。

## 📋 實現內容

### **1. 新增「再次練習 Pitch」按鈕**

**位置**：`keywords` 階段的最後

**修改前**：
```tsx
<div className="mt-4 flex space-x-4">
  <button className="btn-copy-notes">📋 複製關鍵字筆記</button>
  <button className="btn-restart">🔄 重新上傳新作品</button>
</div>
```

**修改後**：
```tsx
<div className="mt-4 flex flex-wrap gap-3 justify-center">
  <button className="btn-copy-notes">📋 複製關鍵字筆記</button>
  <button className="btn-practice-again">🔄 再次練習 Pitch</button>
  <button className="btn-restart">🔄 重新上傳新作品</button>
</div>
```

### **2. 按鈕功能實現**

**再次練習按鈕邏輯**：
```tsx
<button
  onClick={() => {
    setCurrentStage('practice-pitch')
    // 切換到練習階段，讓用戶可以再次練習
  }}
  disabled={isProcessing || isSpeaking}
  className="btn-practice-again"
>
  🔄 再次練習 Pitch / Practice Pitch Again
</button>
```

**功能說明**：
- ✅ 點擊後直接切換到 `practice-pitch` 階段
- ✅ 用戶可以立即開始錄音練習
- ✅ 不需要重新上傳作品或重新生成 pitch
- ✅ 保持原有的 pitch 內容和對話記錄

### **3. UI 布局優化**

**布局改進**：
- ✅ 使用 `flex-wrap` 適應不同螢幕尺寸
- ✅ 使用 `gap-3` 統一間距
- ✅ 使用 `justify-center` 居中對齊
- ✅ 三個按鈕並排顯示，響應式設計

### **4. 說明文字更新**

**修改前**：
```
完成練習！可以複製筆記或重新開始新的作品練習
```

**修改後**：
```
完成練習！可以複製筆記、再次練習或重新開始新的作品練習
```

**英文版本**：
```
Practice complete! Copy notes, practice again or start new work
```

### **5. 流程說明更新**

**步驟 7 更新**：
```tsx
<span>7. 📝 查看關鍵字筆記 → 複製筆記、再次練習或重新開始</span>
<span className="text-xs opacity-75">7. 📝 View keyword notes → Copy notes, practice again or restart</span>
```

**步驟 8 新增**：
```tsx
<span>8. 三個選項：複製筆記 / 再次練習 Pitch / 重新上傳新作品</span>
<span className="text-xs opacity-75">8. Three options: Copy notes / Practice Pitch again / Upload new work</span>
```

---

## 🎨 用戶體驗

### **新的 Keywords 階段界面**：

```
┌─────────────────────────────────────────┐
│  📝 Pitch 關鍵字提點 / Pitch Keywords    │
├─────────────────────────────────────────┤
│                                         │
│  [關鍵字筆記內容]                        │
│                                         │
├─────────────────────────────────────────┤
│  [📋 複製關鍵字筆記] [🔄 再次練習 Pitch] │
│  [🔄 重新上傳新作品]                     │
│                                         │
│  完成練習！可以複製筆記、再次練習或      │
│  重新開始新的作品練習                    │
└─────────────────────────────────────────┘
```

### **用戶操作流程**：

1. **複製筆記**：📋 複製關鍵字筆記 → 貼到其他地方使用
2. **再次練習**：🔄 再次練習 Pitch → 回到錄音練習階段
3. **重新開始**：🔄 重新上傳新作品 → 從頭開始完整流程

---

## 🔄 功能流程

### **再次練習流程**：

```
keywords (關鍵字筆記)
  ↓ 點擊「再次練習 Pitch」
practice-pitch (錄音練習)
  ↓ 完成錄音
evaluation (評分)
  ↓ 點擊「生成 Pitch 小抄」
keywords (關鍵字筆記)
  ↓ 三個選項
[複製筆記] [再次練習] [重新開始]
```

### **保持的狀態**：

- ✅ **對話記錄**：所有之前的對話都保留
- ✅ **生成內容**：pitch 稿和評分結果都保留
- ✅ **圖片**：上傳的作品照片保留
- ✅ **評分數據**：之前的評分圖表保留

### **重置的狀態**：

- ❌ **當前階段**：從 `keywords` 切換到 `practice-pitch`
- ❌ **錄音狀態**：重新開始錄音流程
- ❌ **新評分**：會生成新的評分結果

---

## 🎯 使用場景

### **場景 1：想要改進發音**
1. 查看評分，發現發音分數較低
2. 點擊「再次練習 Pitch」
3. 重新錄音，專注改善發音
4. 獲得新的評分和改進建議

### **場景 2：想要提升表達**
1. 查看評分，發現表達吸引力分數較低
2. 點擊「再次練習 Pitch」
3. 重新錄音，加入更多語調變化
4. 獲得新的評分和改進建議

### **場景 3：想要練習時間控制**
1. 查看評分，發現時間控制需要改善
2. 點擊「再次練習 Pitch」
3. 重新錄音，注意語速和停頓
4. 獲得新的評分和改進建議

---

## 📊 技術實現

### **狀態管理**：
```typescript
// 簡單的階段切換，不需要複雜的狀態重置
setCurrentStage('practice-pitch')
```

### **按鈕樣式**：
```css
.btn-practice-again {
  @apply btn-small btn-blue-cyan;
}
```

### **響應式設計**：
```css
flex flex-wrap gap-3 justify-center
```

---

## ✅ 優點

### **1. 靈活性提升**
- ✅ 用戶可以隨時回到練習階段
- ✅ 不需要重新上傳作品或重新生成 pitch
- ✅ 保持所有之前的內容和記錄

### **2. 學習效果提升**
- ✅ 可以針對特定弱點進行重複練習
- ✅ 可以比較不同次練習的評分差異
- ✅ 提供持續改進的機會

### **3. 用戶體驗改善**
- ✅ 三個清楚的選項供用戶選擇
- ✅ 響應式設計適應不同螢幕
- ✅ 直觀的按鈕圖標和文字

### **4. 流程完整性**
- ✅ 保持完整的練習循環
- ✅ 不破壞現有的功能
- ✅ 提供多種結束方式

---

## 🎉 總結

**新增功能**：
- ✅ 在 keywords 階段新增「再次練習 Pitch」按鈕
- ✅ 點擊後直接回到 `practice-pitch` 階段
- ✅ 保持所有之前的內容和對話記錄
- ✅ 提供完整的練習循環

**用戶體驗**：
- ✅ 更靈活的練習選擇
- ✅ 更完整的學習循環
- ✅ 更直觀的操作界面
- ✅ 更響應式的設計

**現在用戶可以在完成一次完整練習後，輕鬆地進行多次練習來改進他們的 Pitch 表達技巧！** 🚀

---

**修改日期**：2025-10-14  
**修改者**：AI Assistant  
**狀態**：已完成，待用戶測試確認
