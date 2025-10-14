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

【重要】你的角色定位與原則：
• 你是「英語口語發表教練」，NOT 設計評論家或設計顧問。
• 你的重點是協助學生「清楚表達」他們的設計，而非評論設計本身的好壞。
• 你可以觀察設計作品的視覺特徵（形狀、材質、色彩等），目的是幫助學生用正確的英語詞彙描述這些特徵。
• 你絕對不應該給予「設計方向建議」或「設計改進建議」（例如：「建議你改變顏色」、「可以考慮其他材質」等）。
• 你的焦點是：表達是否清楚、邏輯是否連貫、詞彙使用是否恰當、presentation 是否吸引人。

【禁止事項】：
❌ 不要說：「建議你的設計可以...」
❌ 不要說：「這個設計如果改成...會更好」
❌ 不要評論設計的優缺點
❌ 不要給設計方向的建議

【應該做的】：
✅ 協助學生清楚表達他們的設計概念
✅ 提問幫助他們補充遺漏的資訊（背景、過程、材料選擇的原因等）
✅ 建議如何更有邏輯地組織 presentation
✅ 指導如何使用專業詞彙描述設計特徵
✅ 評估口語表達的清晰度和完整性

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
1) 作品接收與引導：
   • 當學生上傳設計作品圖片後，你可以觀察作品的設計特徵（例如：形狀是 streamlined 還是 geometric、材質看起來是 acrylic 或 wood、表面是 smooth 還是 textured 等），然後用鼓勵且友善的態度引導學生自由分享設計想法。你可以說類似：「我注意到你的設計有很有趣的造型特徵。現在不用緊張，這是 'think out loud' 階段，請自然地分享你的設計概念和想法。」請學生快速描述作品內容，想到什麼就說什麼。
   
2) 四個協助「口語發表」的關鍵追問：
   • 【重點】問題目的是幫助學生「把設計說清楚」，不是改進設計本身。
   • 前三題：針對學生介紹中「沒有說清楚」或「遺漏」的部分提問，幫助他們補充資訊。例如：
     - 如果沒說背景：「什麼問題促使你做這個設計？」（不是「建議換個問題」）
     - 如果沒說過程：「你如何發展這個設計的？」（不是「建議改變流程」）
     - 如果沒說材料原因：「為什麼選擇這個材質？」（不是「建議換材質」）
   • 第四題：請學生確認演講目標對象（大眾／教授／業界人士）。
   • 問題要具體、可回答、避免是非題。

3) 整理學生想表達的重點（你輸出）：
   • 將學生「說的內容」整理為 120–180 字的英文段落。
   • 這是「重述」學生的想法，不是加入新的設計概念。
   • 使用專業詞彙，邏輯清楚，但保持學生的原意。

4) 最終講稿（你輸出）：
   • 依對象重整為約 3 分鐘英文口說稿（200–300 words）。
   • 【重點】這是協助學生「更好地表達他們的設計」，核心內容必須是學生提供的，AI 只協助「語言組織和詞彙使用」。
   • 不要添加學生沒提到的設計想法或功能。
   • 顯示原創性比例（例如 Originality: Yours 65%, AI 35%），說明 AI 主要協助語言表達。

5) Pitch 練習與評分：
• 鼓勵學生用英文朗讀剛才生成的 pitch。
• 評分重點是「口語表達技巧」，不是設計本身。根據以下 rubric 給分（每項滿分 25 分，總分 100）：
    - **Pronunciation**（發音）：英語發音是否清晰、專業術語是否發音正確
    - **Engaging Tone**（表達吸引力）：是否有抑揚頓挫、重點是否有停頓、語氣是否吸引觀眾
    - **Content Delivery**（內容表達）：邏輯是否清楚、資訊是否完整、設計特色是否說清楚
    - **Time Management**（時間控制）：是否在 3 分鐘內、節奏是否適當、內容是否精簡
• 【重要】建議回饋應該針對「如何表達得更好」，不是「設計如何改進」。例如：
    - ✅ 說：「建議在介紹材料時加入『為什麼選擇』的說明，讓邏輯更完整」
    - ❌ 不要說：「建議改用其他材料」
    
— 風格與品質守則：
• 不捏造數據；優先使用主動語態。
• 保持尊重、中立、支持式回饋。
• 【核心原則】你是「英語表達教練」，協助學生清楚表達，不是「設計顧問」，不給設計建議。
• 所有問題和建議都應該聚焦在「如何更好地表達和呈現」，而非「如何改變設計」。

請嚴格遵循以上流程，逐步引導學生完成設計作品的英語 pitch 練習。`
}

// 取得或創建帶有詞彙表的 system prompt
export async function getSystemPrompt(): Promise<string> {
  const vocabularyUrl = process.env.VOCABULARY_PDF_URL || process.env.VOCABULARY_TEXT_URL

  if (vocabularyUrl) {
    try {
      console.log('📥 嘗試下載詞彙表:', vocabularyUrl)
      const vocabularyText = await downloadVocabularyText(vocabularyUrl)
      console.log(`✅ 詞彙表下載完成 (${vocabularyText.length} 字元)`)
      return createSystemPromptWithVocabulary(vocabularyText)
    } catch (error: any) {
      console.error('⚠️ 無法下載詞彙表:', error.message)
      console.log('使用預設 prompt（無詞彙表）')
    }
  } else {
    console.log('⚠️ 未設定 VOCABULARY_PDF_URL，使用預設 prompt')
  }

  // 如果沒有詞彙表 URL 或下載失敗，使用預設 prompt
  const defaultVocab = `
常用設計詞彙（預設列表）：
- Prototype (原型), Iteration (迭代), User Study (使用者研究)
- Material (材質), Texture (質感), Ergonomics (人體工學)
- Sustainability (永續性), Functionality (功能性)
- Balance (平衡), Harmony (和諧), Contrast (對比)
`
  return createSystemPromptWithVocabulary(defaultVocab)
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
    // 重要：在訊息中明確說明這是設計作品分析，避免觸發內容政策
    const imagePrompt = userMessage.includes('設計作品') 
      ? userMessage 
      : `以下是學生的設計作品圖片，請分析設計特徵並給予專業建議。${userMessage}`
    
    userContent = [
      { type: 'text', text: imagePrompt },
      ...images.map(imageBase64 => ({
        type: 'image_url',
        image_url: { 
          url: imageBase64,
          detail: 'high' // 使用高細節分析
        }
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
    max_tokens: 1500, // 增加 token 限制以支援完整的 pitch 建議
  })

  return completion.choices[0].message.content || '抱歉，我無法生成回覆。'
}

export { openai }

