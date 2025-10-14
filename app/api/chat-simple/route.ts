import { NextRequest, NextResponse } from 'next/server'
import { openai, sendMessageSimple } from '@/lib/vocabulary-simple'

// 定義對話階段
type ConversationStage = 
  | 'upload' | 'intro' | 'free-describe' | 'qa-improve' 
  | 'confirm-summary' | 'generate-pitch' | 'practice-pitch' 
  | 'evaluation' | 'keywords'

// 階段對應的 prompt
const STAGE_PROMPTS: Record<ConversationStage, string> = {
  'upload': '',
  'intro': '學生剛剛上傳了他們的設計作品圖片，現在準備開始 pitch 練習。請你作為設計英語教練，觀察作品的設計特徵並用友善鼓勵的態度開始對話。你可以提到你注意到的設計元素（例如造型、材質、色彩等，使用專業詞彙），然後引導學生進入「think out loud」階段，鼓勵他們自然地分享設計概念。',
  'free-describe': '', // 學生自由描述，不需要特殊 prompt
  'qa-improve': '根據學生剛才的作品描述，提出三個具體的問題來協助他們改善 presentation（不要給設計建議）。重點在於：幫助他們把介紹說得更清楚、更有邏輯、更吸引人。問題可以從：背景脈絡、設計過程、材料選擇、使用者需求、成果展示等面向挑選。然後第四個問題：請學生確認演講目標對象（大眾／教授／業界人士）。',
  'confirm-summary': '根據學生的自由描述和剛才的回答，整理出他們想要表達的設計重點（120-180字的英文段落）。重點要清楚、有邏輯、使用專業詞彙。最後請學生確認這個整理是否正確，或需要補充修改。',
  'generate-pitch': '根據學生確認的設計重點和目標聽眾，生成一個 200-300 words 的 3 分鐘英文 pitch 稿。結構要清楚（問題→解決方案→過程→成果），使用適合目標聽眾的語言層次。在 pitch 最後顯示原創性比例（例如 "Originality: Yours 60%, AI 40%"）。',
  'practice-pitch': '', // 學生練習 pitch，不需要特殊 prompt
  'evaluation': '學生剛才練習了 pitch。請根據以下 rubric 給予評分（每項 25 分，總分 100）：1) Pronunciation（發音）、2) Engaging Tone（互動性與抑揚頓挫）、3) Content Delivery（內容邏輯與完整性）、4) Time Management（時間控制）。給予具體的分數和建議回饋，保持正向鼓勵。',
  'keywords': '生成一份簡潔的 Pitch 關鍵字提點筆記，格式適合複製到手機做小抄。包含：核心訊息、關鍵詞彙（中英對照）、結構提示、記憶點。要簡短易記，適合快速瀏覽。',
}

// 階段轉換邏輯
const STAGE_TRANSITIONS: Record<ConversationStage, ConversationStage> = {
  'upload': 'intro',
  'intro': 'free-describe',
  'free-describe': 'qa-improve',
  'qa-improve': 'confirm-summary',
  'confirm-summary': 'generate-pitch',
  'generate-pitch': 'practice-pitch',
  'practice-pitch': 'evaluation',
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

    // 只有在 free-describe 階段需要圖片（首次描述時讓 AI 看到作品）
    // 其他階段專注於語言表達，不需要圖片
    const shouldSendImages = currentStage === 'free-describe'

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
    if (currentStage === 'free-describe' && assistantReply.includes('問題')) {
      nextStage = 'qa-improve'
    } else if (currentStage === 'qa-improve' && assistantReply.toLowerCase().includes('summary') || assistantReply.includes('整理')) {
      nextStage = 'confirm-summary'
    } else if (currentStage === 'practice-pitch' && assistantReply.includes('評分')) {
      nextStage = 'evaluation'
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
