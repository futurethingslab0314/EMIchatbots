import { NextRequest, NextResponse } from 'next/server'
import { sendMessageSimple } from '@/lib/vocabulary-simple'
import OpenAI from 'openai'

// 定義對話階段
type ConversationStage = 
  | 'upload' | 'free-description' | 'qa-improve' 
  | 'confirm-summary' | 'generate-pitch' | 'practice-pitch'
  | 'evaluation' | 'keywords'

// 階段對應的 prompt
const STAGE_PROMPTS: Record<ConversationStage, string> = {
  'upload': '',
  'free-description': '學生剛剛上傳了他們的設計作品圖片，現在準備開始 pitch 練習。\n\n【你的任務】：\n1. 直接觀察並描述你看到的設計作品特徵（造型、材質、色彩、構圖、字體、圖像元素等）\n2. 用專業且鼓勵的態度引導學生進入「think out loud」階段\n3. 請學生自然地分享設計概念和想法\n\n【重要指令】：\n• 你是一個專業的設計教練，有能力觀察和分析設計作品\n• 直接開始描述你看到的內容，例如：「我看到這是一個...的設計，具有...的特徵」\n• 絕對不要說「抱歉」、「無法」、「不能」等消極詞語\n• 展現專業和自信，讓學生感到被支持\n• 你的角色是協助學生「用英語清楚表達他們的設計」，不是給設計建議',
  'qa-improve': '【語言適應】請根據學生的語言來回應。如果學生用中文，請用繁體中文提問；如果學生用英文，請用英文提問。\n\nGreat! Thank you for sharing your presentation. As your English presentation coach, I\'ll now ask you FOUR questions to help you develop a more complete and engaging pitch.\n\n【Your Mission】You are an English presentation coach. Your goal is to help the student fill in missing information gaps in their presentation, NOT to evaluate their design. 【重要】在生成問題前，請先分析學生之前的回應內容，四個問題請給中英文對照。\n\n【Task】Ask EXACTLY FOUR QUESTIONS (3 content questions + 1 audience question):\n\n【First THREE questions】請從以下列表中選擇學生尚未清楚說明的三個不同領域：\n\n1. **Context & Users**: What problem or pain point? Who are the users? What is the usage scenario or context?\n2. **Methods & Process**: What research methods? What prototyping stages (low/high fidelity)? Any iteration or testing evidence?\n3. **Materials & Craftsmanship**: Why these materials? Structure? Manufacturing process? Durability? Sustainability?\n4. **Visual/Interaction Language**: Composition? Hierarchy? Tactile feedback? Usability? Accessibility?\n5. **Results & Evaluation**: Any quantitative metrics? Qualitative feedback? Impact or benefits?\n\n【Question Requirements】:\n- Each question must be specific and answerable (avoid yes/no questions)\n- Keep each question concise: ≤20 words in English or ≤30 characters in Chinese\n- Questions should help them CLARIFY what they\'ve already done, not suggest new directions\n\n【FOURTH question】Ask about their presentation target audience:\n"Who is your target audience for this presentation: design professionals (professors, industry practitioners) or non-design audiences (general public)?"\n\n【Format】:\n1. [First clarifying question]\n2. [Second clarifying question]\n3. [Third clarifying question]\n4. [Audience confirmation question]\n\n【IMPORTANT】You are helping them EXPRESS their existing work more clearly. You are NOT evaluating, critiquing, or suggesting design changes. Stay positive and encouraging.',
  'confirm-summary': '【語言適應】請根據學生的語言來回應。如果學生用中文，請用繁體中文回應；如果學生用英文，請用英文回應。\n\n【重要】你現在是設計重點整理師，不再是問問題的教練。\n\n根據學生在之前的對話中分享的設計內容，整理出他們想要「表達的設計重點」（100字內英文段落，加上中文對照）。\n\n【任務】\n1. 簡潔整理學生「說了什麼」關於他們的設計\n2. 不是評論設計好壞，不是問問題\n3. 這只是「快速確認重點」，不是生成完整的 pitch draft\n4. 使用專業詞彙，邏輯清楚\n5. 最後請學生確認這個整理是否準確反映他們的想法\n\n【格式】用 2-3 個短段落呈現，不要寫成完整的演講稿。\n\n【重要】直接開始整理，不要問任何問題！',
  'generate-pitch': '根據學生確認的內容和目標聽眾，生成一個 200 words 以內的 3 分鐘英文 pitch 稿（一個段落）。\n\n【重點】這是協助學生「表達他們的設計」，不是重新設計或添加新想法。保持學生原本的設計概念和內容。\n\n結構建議：Hook → Background → Design Intent → Process → Materials & Rationale → Outcomes → Impact\n\n使用適合目標聽眾的語言。',
  'practice-pitch': '', // 學生練習 pitch，不需要特殊 prompt
  'evaluation': '【語言適應】請根據學生的語言來回應。如果學生用中文，請用繁體中文回應；如果學生用英文，請用英文回應。\n\n【CRITICAL FORMAT REQUIREMENT】\n\n你必須在回應的開頭包含以下格式的評分（系統需要這個格式來生成圖表）：\n\nOriginality: [分數]/20\nPronunciation: [分數]/20\nEngaging Tone: [分數]/20\nContent Delivery: [分數]/20\nTime Management: [分數]/20\n\n【評分標準】\n1. **Originality**（原創性）：保持學生原本設計概念，AI生成內容比例\n2. **Pronunciation**（發音清晰度）：英語發音清楚、專業術語正確\n3. **Engaging Tone**（表達吸引力）：抑揚頓挫、重點停頓、語氣吸引人\n4. **Content Delivery**（內容表達）：邏輯清楚、資訊完整、重點突出\n5. **Time Management**（時間掌控）：3分鐘內、節奏適當\n\n評分後給予具體改進建議。保持正向鼓勵。',
  'keywords': '【語言適應】請根據學生的語言來回應。如果學生用中文，請用繁體中文回應；如果學生用英文，請用英文回應。\n\n根據剛才生成的 Pitch 內容，為學生製作一份實用的發表小抄筆記。\n\n【任務】基於實際的 Pitch 內容，提供發表時的小抄，包含：\n\n1. **核心重點句子**（3-5 個關鍵句子，中英對照）\n   - 從 Pitch 中提取最重要的表達句\n   - 提供中英文對照，方便記憶\n\n2. **關鍵詞彙**（設計專業術語，中英對照）\n   - 從 Pitch 中提取的專業設計詞彙\n   - 提供簡短定義或解釋\n\n3. **轉折連接詞**（避免忘詞的英文句子）\n   - 開場轉折：「First, let me introduce...」「To begin with...」\n   - 過程轉折：「Moving on to...」「Furthermore...」「Additionally...」\n   - 結尾轉折：「In conclusion...」「To summarize...」「Finally...」\n\n4. **記憶提示**（數字、重點提醒）\n   - 重要的數據或特徵\n   - 容易忘記的關鍵點\n\n【格式要求】\n- 簡潔明瞭，適合手機螢幕瀏覽\n- 中英對照，方便快速參考\n- 按發表順序排列\n- 重點突出，一目了然\n\n【重要】這是基於實際 Pitch 內容的實用小抄，不是評價摘要！',
}

// 階段轉換邏輯
const STAGE_TRANSITIONS: Record<ConversationStage, ConversationStage> = {
  'upload': 'free-description', // 上傳後直接進入自由描述階段
  'free-description': 'free-description', // 保持在自由描述階段，直到錄音完成
  'qa-improve': 'confirm-summary',
  'confirm-summary': 'generate-pitch',
  'generate-pitch': 'practice-pitch',
  'practice-pitch': 'evaluation', // 練習完成後自動進入評分階段
  'evaluation': 'evaluation', // 保持在 evaluation 階段，等待用戶點擊生成小抄
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
    const isRecording = formData.get('isRecording') === 'true'
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

      // 檢查 API Key
      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json({ 
          error: 'OpenAI API Key 未配置，請聯繫管理員' 
        }, { status: 500 })
      }

      // 初始化 OpenAI 客戶端
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })

      // 在 free-description 階段需要傳送圖片（讓 AI 看到作品）
      const shouldSendImages = currentStage === 'free-description'

      const reply = await sendMessageSimple(
        openai,
        messages,
        stagePrompt,
        shouldSendImages && images.length > 0 ? images : undefined,
        currentStage
      )

      console.log(`✅ 階段回應生成完成 ${shouldSendImages ? '（含圖片分析）' : '（純文字）'}`)

    // 生成語音（添加超時處理）
    const speech = await Promise.race([
      openai.audio.speech.create({
        model: 'tts-1',
        voice: 'nova',
        input: reply,
        speed: 0.95,
        response_format: 'mp3', // 明確指定格式
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Speech generation timeout')), 15000)
      )
    ]) as any

      const audioBuffer = Buffer.from(await speech.arrayBuffer())
      const audioBase64 = audioBuffer.toString('base64')
      const audioUrl = `data:audio/mp3;base64,${audioBase64}`

      // triggerStage 時不要轉換階段，保持在當前階段
      const nextStage = undefined

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

    // 檢查檔案大小
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (audioFile.size > maxSize) {
      return NextResponse.json({ 
        error: '音訊檔案過大，請縮短錄音時間後重試' 
      }, { status: 413 })
    }

    console.log(`📊 接收音訊檔案大小: ${(audioFile.size / 1024 / 1024).toFixed(2)}MB`)

    // 檢查 API Key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API Key 未配置，請聯繫管理員' 
      }, { status: 500 })
    }

    // 初始化 OpenAI 客戶端
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      // 不指定語言，讓 Whisper 自動檢測用戶的語言
    })

    const userText = transcription.text
    console.log('🎤 語音轉文字:', userText)

    // 根據當前階段處理對話
    let contextPrompt = userText
    
    // 在特定階段添加上下文
    if (currentStage === 'practice-pitch' && generatedPitch) {
      contextPrompt = `學生正在練習剛才生成的 pitch。他們說的內容是：「${userText}」\n\n參考 pitch 稿：\n${generatedPitch}\n\n請在他們練習完後，準備進行評分。`
    }

    // 在 free-description 階段需要圖片（讓 AI 看到作品）
    // 其他階段專注於語言表達，不需要圖片
    const shouldSendImages = currentStage === 'free-description'

    const assistantReply = await sendMessageSimple(
      openai,
      messages,
      contextPrompt,
      shouldSendImages && images.length > 0 ? images : undefined,
      currentStage
    )

    console.log(`✅ 對話回應完成 ${shouldSendImages ? '（含圖片）' : '（純文字）'}`)

    // 生成語音（添加超時處理）
    const speech = await Promise.race([
      openai.audio.speech.create({
        model: 'tts-1',
        voice: 'nova',
        input: assistantReply,
        speed: 0.95,
        response_format: 'mp3', // 明確指定格式
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Speech generation timeout')), 15000)
      )
    ]) as any

    const audioBuffer = Buffer.from(await speech.arrayBuffer())
    const audioBase64 = audioBuffer.toString('base64')
    const audioUrl = `data:audio/mp3;base64,${audioBase64}`

    // 判斷是否需要轉換階段
    let nextStage: ConversationStage | undefined

    // 根據回應內容判斷是否該進入下一階段
    if (currentStage === 'free-description' && userText && userText.trim().length > 0 && isRecording) {
      // 用戶在 free-description 階段錄音完成後，轉到 qa-improve 階段
      nextStage = 'qa-improve'
    } else if (currentStage === 'qa-improve' && userText && userText.trim().length > 0 && isRecording) {
      // 用戶在 qa-improve 階段錄音完成後，轉到 confirm-summary 階段
      nextStage = 'confirm-summary'
    } else if (currentStage === 'evaluation') {
      // 評分完成，轉到關鍵字階段
      nextStage = 'keywords'
    } else {
      // 使用預設的階段轉換邏輯
      nextStage = STAGE_TRANSITIONS[currentStage]
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
    } else if (error.message?.includes('timeout') || error.message?.includes('Speech generation timeout')) {
      errorMessage = '語音生成超時，請稍後再試'
    } else if (error.message?.includes('quota')) {
      errorMessage = 'OpenAI API 配額不足，請檢查帳戶餘額'
    } else if (error.message?.includes('model')) {
      errorMessage = 'AI 模型呼叫失敗，請稍後再試'
    } else if (error.message?.includes('音訊')) {
      errorMessage = '語音處理失敗，請重新錄音'
    } else if (error.message?.includes('504')) {
      errorMessage = '伺服器處理超時，請重新嘗試'
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
