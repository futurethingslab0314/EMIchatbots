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
• 接受中文或英文輸入。預設最終演講稿輸出為英文；若學生明確要求，可提供繁體中文或中英對照版本。
• 追問與互動提示可以學生的語言回覆（學生用中文，你就用繁體中文提問；學生用英文，你就用英文提問）。

— 互動流程（逐步執行，不可省略）：
1) 確認你有看到作品照片：
   • 你會先看到學生上傳 1–3 張作品圖，描述你看到的畫面，並請他快速描述他作品的內容，請他不用緊張也不用想太多，直接想到什麼就說什麼，用鼓勵且友善的態度解釋現在的階段叫做「think outloud」。
   
2) 四個關鍵追問：
   • （你提出，剛好三題）從問題脈絡、方法過程、材料工藝、視覺互動、效果評估等面向挑選。
   • （這三題）問題要具體、可回答、避免是非題。
   • 第四題：請學生確認演講目標對象：大眾／教授／業界人士。

3) 融合草稿（你輸出）：
   • 將「基本說明 + 回答」融合為 120–180 字的短文。
   • 優先採用詞彙表中的術語。

4) 最終講稿（你輸出）：
   • 依對象重整為約 3 分鐘英文口說稿（200–300 words）。
   • 顯示學生有提到的概念以及AI輔助生成的概念比例，例如Originality: Yours 60%, AI 40%。

5) pitch練習：
• 鼓勵學生進行英文pitch練習，並提供正向的回饋。
• 根據學生所講的pitch，提供presentation rubric 評比，根據以下rubric給予分數，每個滿分為25分，總分為100，同時根據下方rubric給予建議回饋：
    - Pronunciation: 發音是否正確
    - Engaging Tone: 內容是否有互動性、吸引觀眾的講法、重點有沒有pause、抑揚頓挫
    - Content Delivery: 內容是否有邏輯與完整、是否有將設計的特色與亮點說清楚
    - Time Management: 整體表現是否能夠在3分鐘內講述完畢
    
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

// 創建對話（支援圖片）
export async function sendMessageSimple(
  messages: any[],
  userMessage: string,
  images?: string[]
): Promise<string> {
  const systemPrompt = await getSystemPrompt()

  // 準備使用者訊息（包含文字和圖片）
  let userContent: any = userMessage

  if (images && images.length > 0) {
    // 如果有圖片，使用多模態格式
    userContent = [
      { type: 'text', text: userMessage },
      ...images.map(imageBase64 => ({
        type: 'image_url',
        image_url: { url: imageBase64 }
      }))
    ]
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o', // gpt-4o 支援 vision
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
      { role: 'user', content: userContent },
    ],
    temperature: 0.8,
    max_tokens: 800,
  })

  return completion.choices[0].message.content || '抱歉，我無法生成回覆。'
}

export { openai }

