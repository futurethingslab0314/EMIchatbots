import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// 從 Google Sheets 或 URL 下載詞彙表（純文字）
async function downloadVocabularyText(url: string): Promise<string> {
  // 如果是 Google Sheets，轉換為 CSV 導出
  let processedUrl = url
  const sheetsMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (sheetsMatch) {
    const sheetId = sheetsMatch[1]
    const gidMatch = url.match(/[#&]gid=([0-9]+)/)
    const gid = gidMatch ? gidMatch[1] : '0'
    // 導出為 CSV（純文字格式）
    processedUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
  }

  const response = await fetch(processedUrl, { redirect: 'follow' })
  if (!response.ok) {
    throw new Error(`下載失敗: ${response.statusText}`)
  }

  return await response.text()
}

// 將詞彙表整合到 system prompt 中
function createSystemPromptWithVocabulary(vocabularyText: string): string {
  return `你是「EMI-DEW 設計英語教練」。你的任務是幫助設計系學生掌握專業設計詞彙，並能以英語流暢做約 3 分鐘的口說介紹。

【設計詞彙表】
以下是常用設計英語詞彙列表，生成任何稿件與問題時，務必優先使用這些詞彙：

${vocabularyText}

— 詞彙使用規則（極重要）：
• 生成文字時，自然融入上述詞彙表中的術語，不要生硬堆疊。
• 在最終稿結尾加入「Key Design Vocabulary Used」區塊，列出實際使用的詞彙。

— 工作語言與輸出：
• 接受中文或英文輸入。預設最終演講稿輸出為英文；若學生明確要求，可提供中文或中英對照版本。
• 追問與互動提示可以學生的語言回覆（學生用中文，你就用中文提問；學生用英文，你就用英文提問）。

— 互動流程（逐步執行，不可省略）：
1) 作品接收（學生輸入）：
   • 請學生上傳 1–3 張作品圖，並提供作品名稱與 100–200 字的基本說明（中或英皆可）。

2) 三個關鍵追問（你提出，剛好三題）：
   • 從問題脈絡、方法過程、材料工藝、視覺互動、效果評估等面向挑選。
   • 問題要具體、可回答、避免是非題。

3) 融合草稿（你輸出）：
   • 將「基本說明 + 回答」融合為 120–180 字的短文。
   • 優先採用詞彙表中的術語。

4) 受眾確認（你詢問）：
   • 請學生確認演講目標對象：大眾／教授／業界人士。

5) 最終講稿（你輸出）：
   • 依對象重整為約 3 分鐘英文口說稿（400–500 words）。

6) 模擬問答：
   • 扮演現場評審，提出 3–5 個英文問題。

— 風格與品質守則：
• 不捏造數據；優先使用主動語態。
• 保持尊重、中立、支持式回饋。

請嚴格遵循以上流程，逐步引導學生完成設計作品的英語 pitch 練習。`
}

// 取得或創建帶有詞彙表的 system prompt
export async function getSystemPrompt(): Promise<string> {
  const vocabularyUrl = process.env.VOCABULARY_PDF_URL || process.env.VOCABULARY_TEXT_URL

  if (vocabularyUrl) {
    try {
      console.log('📥 下載詞彙表:', vocabularyUrl)
      const vocabularyText = await downloadVocabularyText(vocabularyUrl)
      console.log(`✅ 詞彙表下載完成 (${vocabularyText.length} 字元)`)
      return createSystemPromptWithVocabulary(vocabularyText)
    } catch (error) {
      console.warn('⚠️ 無法下載詞彙表，使用預設 prompt:', error)
    }
  }

  // 如果沒有詞彙表 URL，使用預設 prompt
  return createSystemPromptWithVocabulary('(詞彙表未設定)')
}

// 創建對話 Thread（不使用 Assistants API）
export async function sendMessageSimple(
  messages: any[],
  userMessage: string
): Promise<string> {
  const systemPrompt = await getSystemPrompt()

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
      { role: 'user', content: userMessage },
    ],
    temperature: 0.8,
    max_tokens: 800,
  })

  return completion.choices[0].message.content || '抱歉，我無法生成回覆。'
}

export { openai }

