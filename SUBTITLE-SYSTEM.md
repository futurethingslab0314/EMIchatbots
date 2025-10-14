# 📺 即時字幕系統說明

## 📍 字幕相關程式碼位置

### **主要檔案：** `app/page.tsx`

## 🎯 兩種字幕類型

### 1. **使用者字幕（userTranscript）** - 即時語音辨識

**技術：** Web Speech API（`webkitSpeechRecognition`）

**位置：** `app/page.tsx` 第 54-81 行

```typescript
// 初始化 Web Speech API
if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
  const SpeechRecognition = (window as any).webkitSpeechRecognition
  recognitionRef.current = new SpeechRecognition()
  recognitionRef.current.continuous = true      // 持續辨識
  recognitionRef.current.interimResults = true  // 即時結果
  recognitionRef.current.lang = 'zh-TW'         // 語言設定

  recognitionRef.current.onresult = (event: any) => {
    let interimTranscript = ''
    let finalTranscript = ''

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript
      if (event.results[i].isFinal) {
        finalTranscript += transcript
      } else {
        interimTranscript += transcript
      }
    }

    setUserTranscript(interimTranscript || finalTranscript)
  }
}
```

### 2. **AI 教練字幕（currentSubtitle）** - 完整文字顯示

**技術：** 直接顯示 AI 回應的文字

**位置：** `app/page.tsx` 第 196-217 行

```typescript
// 播放音訊並顯示字幕
const playAudioWithSubtitles = async (audioUrl: string, text: string) => {
  setIsSpeaking(true)
  setCurrentSubtitle(text)  // 設定 AI 字幕為完整回應文字

  const audio = new Audio(audioUrl)
  
  return new Promise<void>((resolve) => {
    audio.onended = () => {
      setIsSpeaking(false)
      setCurrentSubtitle('')  // 音訊播放完畢清除字幕
      resolve()
    }
    
    audio.onerror = () => {
      setIsSpeaking(false)
      setCurrentSubtitle('')
      resolve()
    }
    
    audio.play()
  })
}
```

## 📊 字幕顯示邏輯

### **UI 位置：** `app/page.tsx` 第 922-945 行

```typescript
{/* 即時字幕顯示 */}
<div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl shadow-lg p-6 mb-6 min-h-[120px]">
  <div className="text-white">
    {/* 使用者字幕 - 錄音時顯示 */}
    {userTranscript && isRecording && (
      <div className="subtitle-display">
        <p className="text-sm opacity-80 mb-2">你正在說：</p>
        <p className="text-lg font-medium">{userTranscript}</p>
      </div>
    )}
    
    {/* AI 字幕 - AI 說話時顯示 */}
    {currentSubtitle && isSpeaking && (
      <div className="subtitle-display">
        <p className="text-sm opacity-80 mb-2">教練說：</p>
        <p className="text-lg font-medium">{currentSubtitle}</p>
      </div>
    )}
    
    {/* 空白狀態 */}
    {!userTranscript && !currentSubtitle && (
      <div className="text-center py-8">
        <p className="text-xl opacity-80">字幕會在這裡即時顯示</p>
      </div>
    )}
  </div>
</div>
```

## 🔍 字幕限制與特性

### **1. 使用者字幕（userTranscript）**

#### ✅ **優點：**
- 即時顯示（邊說邊顯示）
- 支援中文和英文
- 自動更新

#### ⚠️ **限制：**

1. **瀏覽器支援限制**
   - 只支援 Chrome、Edge、Safari 等 Webkit 瀏覽器
   - Firefox 不支援

2. **語言設定**
   ```typescript
   recognitionRef.current.lang = 'zh-TW'  // 目前設定為繁體中文
   ```
   - 可改為 `'en-US'`（英文）或 `'zh-CN'`（簡體中文）

3. **準確度限制**
   - 取決於瀏覽器的語音辨識引擎
   - 受環境噪音影響
   - 專業術語可能辨識不準

4. **長度限制**
   - 無固定長度限制
   - 但過長的句子可能被分段處理
   - 顯示區域有最小高度 `min-h-[120px]`

5. **隱私考量**
   - 需要麥克風權限
   - 資料可能傳送到 Google 伺服器處理

### **2. AI 教練字幕（currentSubtitle）**

#### ✅ **優點：**
- 顯示完整的 AI 回應
- 100% 準確
- 支援所有文字（中英文、標點符號、特殊字元）

#### ⚠️ **限制：**

1. **長度限制**
   - **理論上無限制**，可以顯示完整的 AI 回應
   - 但顯示區域有最小高度限制 `min-h-[120px]`
   - 超過區域高度會自動捲動

2. **顯示時機**
   ```typescript
   {currentSubtitle && isSpeaking && (
     // 只在 AI 說話時顯示
   )}
   ```
   - 只在 `isSpeaking === true` 時顯示
   - 音訊播放完畢後自動清除

3. **同步性**
   - 字幕是「完整顯示」，不是逐字顯示
   - 與音訊同時開始，音訊結束時字幕消失

## 📏 顯示區域設定

### **CSS 設定：** `app/page.tsx` 第 923 行

```typescript
<div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl shadow-lg p-6 mb-6 min-h-[120px]">
```

**樣式說明：**
- `min-h-[120px]`：最小高度 120px
- `p-6`：內距 1.5rem（24px）
- `mb-6`：下方間距 1.5rem
- 漸層背景：紫色到藍色
- 圓角：`rounded-2xl`
- 陰影：`shadow-lg`

**字幕文字樣式：**
```typescript
<p className="text-lg font-medium">{currentSubtitle}</p>
```
- `text-lg`：字體大小 18px
- `font-medium`：中等字重
- 白色文字（繼承自父元素）

## 🔧 如何修改字幕限制

### **1. 調整顯示區域高度**

```typescript
// 修改前
<div className="... min-h-[120px]">

// 修改後（增加高度）
<div className="... min-h-[200px]">

// 或設定最大高度並允許捲動
<div className="... min-h-[120px] max-h-[300px] overflow-y-auto">
```

### **2. 調整字體大小**

```typescript
// 修改前
<p className="text-lg font-medium">{currentSubtitle}</p>

// 修改後（更大字體）
<p className="text-xl font-semibold">{currentSubtitle}</p>

// 或更小字體
<p className="text-base font-normal">{currentSubtitle}</p>
```

### **3. 改變使用者字幕語言**

```typescript
// 位置：app/page.tsx 第 59 行

// 繁體中文（目前）
recognitionRef.current.lang = 'zh-TW'

// 英文
recognitionRef.current.lang = 'en-US'

// 簡體中文
recognitionRef.current.lang = 'zh-CN'

// 日文
recognitionRef.current.lang = 'ja-JP'
```

### **4. 增加字幕持續時間**

目前 AI 字幕會在音訊播放完畢後立即消失。如果想要延長顯示：

```typescript
// 修改位置：app/page.tsx 第 203-207 行

audio.onended = () => {
  // 延遲 3 秒後清除字幕
  setTimeout(() => {
    setIsSpeaking(false)
    setCurrentSubtitle('')
  }, 3000)
  resolve()
}
```

### **5. 實現逐字顯示效果**

如果想要字幕逐字顯示（打字機效果）：

```typescript
const playAudioWithSubtitles = async (audioUrl: string, text: string) => {
  setIsSpeaking(true)
  
  // 逐字顯示
  let displayedText = ''
  const words = text.split('')
  for (let i = 0; i < words.length; i++) {
    displayedText += words[i]
    setCurrentSubtitle(displayedText)
    await new Promise(resolve => setTimeout(resolve, 50)) // 每個字延遲 50ms
  }

  const audio = new Audio(audioUrl)
  // ... 其他邏輯
}
```

## 📊 字幕系統流程圖

### **使用者字幕流程：**
```
使用者開始錄音
  ↓
啟動 Web Speech API
  ↓
即時語音辨識
  ↓
更新 userTranscript
  ↓
顯示在字幕區
  ↓
錄音停止
  ↓
清除字幕
```

### **AI 字幕流程：**
```
AI 生成回應文字
  ↓
TTS 生成語音
  ↓
playAudioWithSubtitles(audioUrl, text)
  ↓
設定 currentSubtitle = text
  ↓
同時播放音訊 + 顯示字幕
  ↓
音訊播放完畢
  ↓
清除字幕
```

## ✅ 總結

### **字幕限制：**

| 項目 | 使用者字幕 | AI 字幕 |
|------|-----------|---------|
| **長度限制** | 無固定限制 | 無固定限制 |
| **顯示方式** | 即時逐字 | 完整顯示 |
| **準確度** | 取決於語音辨識 | 100% |
| **瀏覽器支援** | 僅 Webkit | 全部 |
| **語言** | 可設定（目前 zh-TW） | 跟隨 AI 回應 |
| **顯示區域** | `min-h-[120px]` | `min-h-[120px]` |
| **字體大小** | `text-lg` | `text-lg` |

### **主要限制來源：**
1. ✅ **沒有文字長度限制** - 可以顯示完整的 AI 回應
2. ⚠️ **顯示區域高度** - 目前最小 120px，超過會需要捲動
3. ⚠️ **Web Speech API 語言** - 目前設定為繁體中文
4. ⚠️ **瀏覽器兼容性** - 使用者即時字幕只支援 Webkit 瀏覽器

---

**字幕系統技術文件完成！** 📺✨
