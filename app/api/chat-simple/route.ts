import { NextRequest, NextResponse } from 'next/server'
import { openai, sendMessageSimple } from '@/lib/vocabulary-simple'

// 定義對話階段
type ConversationStage = 
  | 'upload' | 'intro' | 'qa-improve' 
  | 'confirm-summary' | 'generate-pitch' | 'practice-pitch' | 'practice-again'
  | 'evaluation' | 'keywords'

// 階段對應的 prompt
const STAGE_PROMPTS: Record<ConversationStage, string> = {
  'upload': '',
  'intro': '學生剛剛上傳了他們的設計作品圖片，現在準備開始 pitch 練習。\n\n【你的任務】：\n1. 觀察並簡短描述你看到的設計特徵（造型、材質、色彩等），展現你的專業能力\n2. 用友善鼓勵的態度引導學生進入「think out loud」階段\n3. 請學生自然地分享設計概念和想法\n\n【重要】：\n• 直接開始對話，不要說「抱歉」或「無法」等消極詞語\n• 你完全有能力觀察和討論設計作品的視覺特徵\n• 你的角色是協助學生「用英語清楚表達」，不是給設計建議\n• 展現專業和自信，讓學生感到被支持',
  'qa-improve': '【重要】你是「英語發表教練」，專門協助學生提升英語表達能力。根據學生剛才的描述，提出四個問題來協助他們改善「口語發表技巧」：\n\n前三個問題的目標是：幫助他們把介紹說得更清楚、更有邏輯、更完整。問題應該針對「他們沒有說清楚的部分」，例如：\n- 背景脈絡：痛點是什麼？為誰設計？\n- 設計過程：如何發展的？做了哪些研究？\n- 材料／功能：為什麼選這個材料？如何運作？\n- 成果驗證：如何測試的？得到什麼回饋？\n\n第四個問題：請學生確認演講目標對象（大眾／教授／業界人士）。\n\n【禁止】不要問「如何改進設計」、「可以加什麼功能」等設計建議問題。重點是幫助他們「說清楚現有的設計」。',
  'confirm-summary': '根據學生的描述和回答，整理出他們想要「表達的設計重點」（120-180 字英文段落）。這是整理他們「說了什麼」，不是評論設計好壞。使用專業詞彙，邏輯清楚。最後請學生確認這個整理是否準確反映他們的想法。',
  'generate-pitch': '根據學生確認的內容和目標聽眾，生成一個 200-300 words 的 3 分鐘英文 pitch 稿（一個段落）。\n\n【重點】這是協助學生「表達他們的設計」，不是重新設計或添加新想法。保持學生原本的設計概念和內容。\n\n結構建議：Hook → Background → Design Intent → Process → Materials & Rationale → Outcomes → Impact\n\n使用適合目標聽眾的語言。',
  'practice-pitch': '', // 學生練習 pitch，不需要特殊 prompt
  'practice-again': '', // 練習完成後的選擇階段，由前端按鈕處理
  'evaluation': '學生剛才練習了 pitch 的口語表達。請根據以下「發表技巧 rubric」評分（每項 20 分，總分 100）：\n\n1. **Originality**（原創性）：是否保持學生原本的設計概念和內容，含有多少%的AI生成內容 \n2.**Pronunciation**（發音清晰度）：英語發音是否清楚、專業術語是否正確\n3. **Engaging Tone**（表達吸引力）：是否有抑揚頓挫、重點是否有停頓、語氣是否吸引人\n4. **Content Delivery**（內容表達）：邏輯是否清楚、資訊是否完整、重點是否突出\n5. **Time Management**（時間掌控）：是否在 3 分鐘內、節奏是否適當\n\n【重要輸出格式】請務必在回應中包含以下格式的評分（以便系統自動生成圖表）：\nOriginality: [分數]/20\n Pronunciation: [分數]/20\nEngaging Tone: [分數]/20\nContent Delivery: [分數]/20\nTime Management: [分數]/20\n\n然後再給予具體的改進建議。評分重點是「口語表達技巧」，不是設計本身。保持正向鼓勵。',
  'keywords': '生成一份簡潔的 Pitch 關鍵字提點筆記in english，格式適合複製到手機做小抄。包含：\n- 核心訊息（3-5 個重點）\n- 關鍵詞彙（中英對照，含詞彙表術語）\n- 結構提示（開場→過程→結果）\n- 記憶點（數字、引言、亮點）\n\n要簡短易記，方便學生快速瀏覽複習。',
}

// 階段轉換邏輯
const STAGE_TRANSITIONS: Record<ConversationStage, ConversationStage> = {
  'upload': 'intro',
  'intro': 'intro', // 保持 intro 階段，直到錄音完成
  'qa-improve': 'confirm-summary',
  'confirm-summary': 'generate-pitch',
  'generate-pitch': 'practice-pitch',
  'practice-pitch': 'practice-again', // 練習完成後進入選擇階段
  'practice-again': 'practice-again', // 保持選擇階段
  'evaluation': 'keywords',
  'keywords': 'keywords', // 最終階段
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    const messagesStr = formData.get('messages') as string
    const imagesStr = formData.get('images') as string
    const currentStage = (formData.get('stage') as ConversationStage) || 'upload'
    const triggerStage = formData.get('triggerStage') === 'true'
    const generatedPitch = formData.get('generatedPitch') as string

    console.log('📨 收到請求:', { currentStage, triggerStage })

    let messages = []
    let images: string[] = []
    
    try {
      messages = JSON.parse(messagesStr || '[]')
    } catch (e) {
      messages = []
    }

    try {
      if (imagesStr) {
        images = JSON.parse(imagesStr)
        console.log(`📸 收到 ${images.length} 張圖片`)
      }
    } catch (e) {
      images = []
    }

    // 處理階段觸發（按鈕點擊）
    if (triggerStage) {
      console.log(`🎬 觸發階段: ${currentStage}`)
      
      const stagePrompt = STAGE_PROMPTS[currentStage]
      if (!stagePrompt) {
        throw new Error(`未定義的階段 prompt: ${currentStage}`)
      }

      // 只有在 intro 階段需要傳送圖片（讓 AI 看到作品）
      const shouldSendImages = currentStage === 'intro'

      const reply = await sendMessageSimple(
        messages,
        stagePrompt,
        shouldSendImages && images.length > 0 ? images : undefined
      )

      console.log(`✅ 階段回應生成完成 ${shouldSendImages ? '（含圖片分析）' : '（純文字）'}`)

      // 生成語音
      const speech = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'nova',
        input: reply,
        speed: 0.95,
      })

      const audioBuffer = Buffer.from(await speech.arrayBuffer())
      const audioBase64 = audioBuffer.toString('base64')
      const audioUrl = `data:audio/mpeg;base64,${audioBase64}`

      // 判斷下一個階段
      const nextStage = STAGE_TRANSITIONS[currentStage]

      // 如果是生成 pitch 階段，提取 pitch 內容
      let pitchContent = ''
      if (currentStage === 'generate-pitch') {
        pitchContent = reply
      }

      return NextResponse.json({
        transcription: '',
        reply,
        audioUrl,
        nextStage,
        pitch: pitchContent || undefined,
      })
    }

    // 處理語音對話（錄音輸入）
    if (!audioFile || audioFile.size === 0) {
      throw new Error('缺少音訊檔案')
    }

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'zh',
    })

    const userText = transcription.text
    console.log('🎤 語音轉文字:', userText)

    // 根據當前階段處理對話
    let contextPrompt = userText
    
    // 在特定階段添加上下文
    if (currentStage === 'practice-pitch' && generatedPitch) {
      contextPrompt = `學生正在練習剛才生成的 pitch。他們說的內容是：「${userText}」\n\n參考 pitch 稿：\n${generatedPitch}\n\n請在他們練習完後，準備進行評分。`
    }

    // 只有在 intro 階段需要圖片（首次介紹時讓 AI 看到作品）
    // 其他階段專注於語言表達，不需要圖片
    const shouldSendImages = currentStage === 'intro'

    const assistantReply = await sendMessageSimple(
      messages,
      contextPrompt,
      shouldSendImages && images.length > 0 ? images : undefined
    )

    console.log(`✅ 對話回應完成 ${shouldSendImages ? '（含圖片）' : '（純文字）'}`)

    // 生成語音
    const speech = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: assistantReply,
      speed: 0.95,
    })

    const audioBuffer = Buffer.from(await speech.arrayBuffer())
    const audioBase64 = audioBuffer.toString('base64')
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`

    // 判斷是否需要轉換階段
    let nextStage: ConversationStage | undefined

    // 根據回應內容判斷是否該進入下一階段
    if (currentStage === 'intro' && assistantReply.includes('問題')) {
      // 學生錄音完成，AI 提出問題，直接轉到 qa-improve 階段
      nextStage = 'qa-improve'
    } else if (currentStage === 'qa-improve' && (assistantReply.toLowerCase().includes('summary') || assistantReply.includes('整理'))) {
      nextStage = 'confirm-summary'
    } else if (currentStage === 'confirm-summary' && assistantReply.includes('Pitch')) {
      // 確認重點後，生成 Pitch，轉到 generate-pitch 階段
      nextStage = 'generate-pitch'
    } else if (currentStage === 'practice-pitch' && (assistantReply.includes('評分') || assistantReply.includes('rubric'))) {
      // 練習完成後，轉到選擇階段
      nextStage = 'practice-again'
    }

    return NextResponse.json({
      transcription: userText,
      reply: assistantReply,
      audioUrl,
      nextStage,
    })
  } catch (error: any) {
    console.error('❌ API 錯誤:', error)
    console.error('錯誤堆疊:', error.stack)
    
    let errorMessage = '處理請求時發生錯誤'
    
    if (error.message?.includes('API key')) {
      errorMessage = 'OpenAI API Key 設定錯誤，請檢查環境變數'
    } else if (error.message?.includes('quota')) {
      errorMessage = 'OpenAI API 配額不足，請檢查帳戶餘額'
    } else if (error.message?.includes('model')) {
      errorMessage = 'AI 模型呼叫失敗，請稍後再試'
    } else if (error.message?.includes('音訊')) {
      errorMessage = '語音處理失敗，請重新錄音'
    }
    
    return NextResponse.json(
      {
        error: errorMessage,
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
