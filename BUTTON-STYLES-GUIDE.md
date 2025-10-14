# 按鈕樣式統一管理指南 Button Styles Management Guide

## 📋 概述 Overview

本專案使用 **Tailwind CSS 的 `@apply` 指令**來統一管理所有按鈕樣式，實現：
- ✅ 集中管理樣式，易於維護
- ✅ 保持一致的設計語言
- ✅ 快速修改全局按鈕外觀
- ✅ 減少重複代碼

---

## 📂 檔案結構 File Structure

### 1. **樣式定義檔案：`app/globals.css`**
所有按鈕樣式都定義在這個檔案中，使用 `@layer components` 區塊。

### 2. **使用檔案：`app/page.tsx`**
所有按鈕使用定義好的 CSS class，不再需要長串的 Tailwind class。

---

## 🎨 按鈕樣式分類 Button Style Categories

### **基礎樣式 Base Styles**

#### `.btn-base` - 大尺寸圓角按鈕
- **尺寸**：`px-8 py-4`
- **形狀**：`rounded-full`（完全圓角）
- **效果**：hover 放大、陰影、禁用時半透明
- **用途**：主要操作按鈕（確認上傳、錄音、練習 Pitch）

#### `.btn-small` - 小尺寸圓角按鈕
- **尺寸**：`px-6 py-3`
- **形狀**：`rounded-full`
- **效果**：同 `.btn-base`
- **用途**：次要操作按鈕（重新描述、確認生成、再次練習）

#### `.btn-square` - 方形按鈕
- **尺寸**：`px-6 py-3`
- **形狀**：`rounded-lg`（小圓角）
- **效果**：簡單過渡效果
- **用途**：最終階段按鈕（複製筆記、重新上傳）

---

### **顏色變體 Color Variants**

| Class Name | 顏色 | 用途 |
|-----------|------|------|
| `.btn-blue-purple` | 藍 → 紫漸層 | 確認上傳作品 |
| `.btn-green` | 綠 → 翠綠漸層 | 自由分享、生成關鍵字 |
| `.btn-orange-red` | 橘 → 紅漸層 | 重新描述、練習 Pitch |
| `.btn-purple-pink` | 紫 → 粉漸層 | 確認生成 Pitch |
| `.btn-red-pink` | 紅 → 粉漸層 | 錄音中狀態 |
| `.btn-blue-cyan` | 藍 → 青漸層 | 回答問題、再次練習 |
| `.btn-yellow-amber` | 黃 → 琥珀漸層 | 生成關鍵字（evaluation 階段） |
| `.btn-blue-solid` | 單純藍色 | 複製筆記 |

---

### **組合樣式 Combined Styles**

這些是預先組合好的完整按鈕樣式，可以直接使用：

| Class Name | 組合 | 使用位置 |
|-----------|------|---------|
| `.btn-confirm-upload` | `btn-base` + `btn-blue-purple` | 階段 1：確認上傳 |
| `.btn-record-start` | `btn-base` + `btn-green` | 錄音開始（綠色） |
| `.btn-record-stop` | `btn-base` + `btn-red-pink` + `recording-pulse` | 錄音停止（紅色+脈動） |
| `.btn-redescribe` | `btn-small` + `btn-orange-red` | 重新描述作品 |
| `.btn-confirm-generate` | `btn-small` + `btn-purple-pink` | 確認生成 Pitch |
| `.btn-practice-pitch` | `btn-base` + `btn-orange-red` + `animate-pulse` | 練習 Pitch（脈動） |
| `.btn-practice-again` | `btn-small` + `btn-blue-cyan` | 再次練習 |
| `.btn-generate-keywords` | `btn-small` + `btn-green` | 生成關鍵字提點 |
| `.btn-copy-notes` | `btn-square` + `btn-blue-solid` + `flex-1` | 複製筆記 |
| `.btn-restart` | `btn-square` + `btn-green` + `flex-1` | 重新上傳新作品 |

---

## 💡 使用方式 Usage

### **方式 1：使用預定義的組合樣式（推薦）**

```tsx
// ✅ 簡潔明瞭
<button className="btn-confirm-upload">
  📤 確認上傳作品
</button>
```

### **方式 2：自由組合基礎樣式和顏色**

```tsx
// ✅ 靈活組合
<button className="btn-base btn-blue-purple">
  自定義按鈕
</button>

<button className="btn-small btn-green">
  小按鈕
</button>
```

### **方式 3：條件式樣式切換**

```tsx
// ✅ 根據狀態動態切換
<button className={isRecording ? 'btn-record-stop' : 'btn-record-start'}>
  {isRecording ? '🔴 停止錄音' : '🎤 開始錄音'}
</button>
```

---

## 🔧 如何修改樣式 How to Modify Styles

### **情境 1：修改所有按鈕的尺寸**

在 `app/globals.css` 中修改 `.btn-base`：

```css
.btn-base {
  @apply px-10 py-5 rounded-full font-semibold text-xl text-white;  /* 改大一點 */
  @apply transition-all transform hover:scale-105 shadow-lg;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
}
```

### **情境 2：修改特定顏色**

在 `app/globals.css` 中修改對應的顏色變體：

```css
/* 把藍紫漸層改成藍綠漸層 */
.btn-blue-purple {
  @apply bg-gradient-to-r from-blue-500 to-green-500;  /* 改成綠色 */
  @apply hover:from-blue-600 hover:to-green-600;
}
```

### **情境 3：新增一個新按鈕樣式**

1. 在 `app/globals.css` 中新增顏色變體：

```css
/* 新增紅橘漸層 */
.btn-red-orange {
  @apply bg-gradient-to-r from-red-500 to-orange-500;
  @apply hover:from-red-600 hover:to-orange-600;
}
```

2. 組合成完整樣式：

```css
/* 新增刪除按鈕樣式 */
.btn-delete {
  @apply btn-small btn-red-orange;
}
```

3. 在 `app/page.tsx` 中使用：

```tsx
<button className="btn-delete">
  🗑️ 刪除
</button>
```

### **情境 4：修改 hover 效果**

在 `app/globals.css` 中修改基礎樣式：

```css
.btn-base {
  @apply px-8 py-4 rounded-full font-semibold text-lg text-white;
  @apply transition-all transform hover:scale-110 hover:rotate-1 shadow-lg;  /* 改成更大的放大+旋轉 */
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
}
```

---

## 🎭 特殊動畫 Special Animations

### **錄音脈動效果 Recording Pulse**

```css
.recording-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

**使用方式**：
```tsx
<button className="btn-base btn-red-pink recording-pulse">
  🔴 錄音中...
</button>
```

### **Tailwind 內建動畫**

- `animate-pulse`：緩慢脈動（用於練習 Pitch 按鈕）
- `animate-bounce`：彈跳效果
- `animate-spin`：旋轉效果

---

## 📊 完整按鈕對照表 Complete Button Reference

| 按鈕位置 | 原始 className（長串） | 新 className（簡潔） |
|---------|---------------------|-------------------|
| 階段 1：確認上傳 | `bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-blue-600 hover:to-purple-600 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50` | `btn-confirm-upload` |
| 階段 2：自由分享（開始） | `bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50` | `btn-record-start` |
| 階段 2：自由分享（停止） | `bg-gradient-to-r from-red-500 to-pink-500 text-white px-8 py-4 rounded-full font-semibold text-lg recording-pulse transition-all transform hover:scale-105 shadow-lg disabled:opacity-50` | `btn-record-stop` |
| 階段 3：回答問題（開始） | `bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-8 py-4 rounded-full...` | `btn-base btn-blue-cyan` |
| 階段 4：重新描述 | `bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-full...` | `btn-redescribe` |
| 階段 4：確認生成 | `bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full...` | `btn-confirm-generate` |
| 階段 5-6：練習 Pitch | `bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-4 rounded-full... animate-pulse` | `btn-practice-pitch` |
| 階段 7：再次練習 | `bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-full...` | `btn-practice-again` |
| 階段 7：生成關鍵字 | `bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-full...` | `btn-generate-keywords` |
| 階段 8：複製筆記 | `flex-1 bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-all` | `btn-copy-notes` |
| 階段 8：重新上傳 | `flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-lg...` | `btn-restart` |

---

## ✅ 優點 Advantages

### **Before（舊方式）**：
```tsx
<button className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-blue-600 hover:to-purple-600 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50">
  確認上傳
</button>
```
❌ 冗長難讀
❌ 重複代碼多
❌ 修改困難（需要找到所有使用處）

### **After（新方式）**：
```tsx
<button className="btn-confirm-upload">
  確認上傳
</button>
```
✅ 簡潔易讀
✅ 語義化命名
✅ 統一修改（只需改 `globals.css`）
✅ 易於維護

---

## 🚀 最佳實踐 Best Practices

1. **優先使用預定義的組合樣式**：如 `btn-confirm-upload`、`btn-record-start`
2. **需要自定義時，組合基礎樣式和顏色**：如 `btn-base btn-blue-purple`
3. **修改全局樣式時，只需修改 `globals.css`**
4. **新增按鈕時，先檢查是否有現成樣式可用**
5. **保持命名一致性**：`btn-{功能}-{顏色}` 或 `btn-{動作}`

---

## 📝 注意事項 Notes

1. **CSS Linter 警告**：`@tailwind` 和 `@apply` 會顯示警告，這是正常的，不影響功能。
2. **編譯測試**：修改 `globals.css` 後，建議執行 `npm run build` 測試。
3. **瀏覽器兼容性**：所有樣式都基於 Tailwind CSS，兼容性良好。
4. **動畫性能**：`recording-pulse` 和 `animate-pulse` 使用 CSS 動畫，性能優異。

---

## 🎯 快速參考 Quick Reference

**常用按鈕樣式**：
- 主要操作：`btn-confirm-upload`、`btn-practice-pitch`
- 錄音控制：`btn-record-start`、`btn-record-stop`
- 次要操作：`btn-redescribe`、`btn-confirm-generate`
- 重複操作：`btn-practice-again`、`btn-generate-keywords`
- 最終操作：`btn-copy-notes`、`btn-restart`

**快速組合**：
- 大按鈕 + 藍紫色：`btn-base btn-blue-purple`
- 小按鈕 + 綠色：`btn-small btn-green`
- 方形按鈕 + 藍色：`btn-square btn-blue-solid`

---

**最後更新**：2025-10-14
**維護者**：EMI-DEW Team

