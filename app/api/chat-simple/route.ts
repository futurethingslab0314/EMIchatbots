import { NextRequest, NextResponse } from 'next/server'
import { openai, sendMessageSimple } from '@/lib/vocabulary-simple'

// 簡化版 API：直接使用 Chat Completions，不用 Assistants API
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    const messagesStr = formData.get('messages') as string
    const imagesStr = formData.get('images') as string
    const hasImages = formData.get('hasImages') === 'true'
    const conversationStarted = formData.get('conversationStarted') === 'true'
    const imagesUploaded = formData.get('imagesUploaded') === 'true'
    const triggerIntro = formData.get('triggerIntro') === 'true'

    console.log('📨 收到請求:', { hasImages, conversationStarted, imagesUploaded, triggerIntro })

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

    // 特殊處理：觸發介紹（步驟 1）- 在轉錄音訊之前檢查
    if (triggerIntro && imagesUploaded) {
      console.log('🎬 觸發 Bot 介紹（步驟 1）')
      
      const introMessage = await sendMessageSimple(
        [],
        '學生剛剛上傳了他們的設計作品圖片，現在準備開始 pitch 練習。請你作為設計英語教練，觀察作品的設計特徵並用友善鼓勵的態度開始對話。你可以提到你注意到的設計元素（例如造型、材質、色彩等，使用專業詞彙），然後引導學生進入「think out loud」階段，鼓勵他們自然地分享設計概念。',
        images
      )

      console.log('✅ Bot 介紹生成完成')

      const speech = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'nova',
        input: introMessage,
        speed: 0.95,
      })

      const audioBuffer = Buffer.from(await speech.arrayBuffer())
      const audioBase64 = audioBuffer.toString('base64')
      const audioUrl = `data:audio/mpeg;base64,${audioBase64}`

      console.log('✅ 語音生成完成')

      return NextResponse.json({
        transcription: '',
        reply: introMessage,
        audioUrl,
      })
    }

    // 步驟 1: 使用 Whisper API 轉錄音訊（只有在正常對話時才執行）
    if (!audioFile) {
      throw new Error('缺少音訊檔案')
    }
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'zh',
    })

    const userText = transcription.text

    // 如果是第一次對話且沒有上傳圖片，提醒使用者上傳
    if (!conversationStarted && !hasImages) {
      const reminderMessage = '您好！我是 EMI-DEW 設計英語教練。在我們開始之前，請先上傳 1-3 張您的設計作品照片，並告訴我作品名稱以及 100-200 字的基本說明（中文或英文都可以）。這樣我才能更好地協助您練習英語 pitch！'

      const speech = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'nova',
        input: reminderMessage,
        speed: 0.95,
      })

      const audioBuffer = Buffer.from(await speech.arrayBuffer())
      const audioBase64 = audioBuffer.toString('base64')
      const audioUrl = `data:audio/mpeg;base64,${audioBase64}`

      return NextResponse.json({
        transcription: userText,
        reply: reminderMessage,
        audioUrl,
      })
    }

    // 步驟 2: 使用簡化版對話（直接用 Chat Completions + 詞彙表 + 圖片）
    // 重要：每次都傳送圖片，讓 AI 在整個對話中都能看到作品
    const assistantReply = await sendMessageSimple(
      messages, 
      userText, 
      images.length > 0 ? images : undefined // 如果有圖片就一直傳送
    )

    // 步驟 3: 使用 TTS API 生成語音
    const speech = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: assistantReply,
      speed: 0.95,
    })

    const audioBuffer = Buffer.from(await speech.arrayBuffer())
    const audioBase64 = audioBuffer.toString('base64')
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`

    return NextResponse.json({
      transcription: userText,
      reply: assistantReply,
      audioUrl,
    })
  } catch (error: any) {
    console.error('❌ API 錯誤:', error)
    console.error('錯誤堆疊:', error.stack)
    
    // 根據不同的錯誤提供更友善的訊息
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

