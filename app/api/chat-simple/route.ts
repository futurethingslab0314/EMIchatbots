import { NextRequest, NextResponse } from 'next/server'
import { openai, sendMessageSimple } from '@/lib/vocabulary-simple'

// 簡化版 API：直接使用 Chat Completions，不用 Assistants API
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const messagesStr = formData.get('messages') as string
    const hasImages = formData.get('hasImages') === 'true'
    const conversationStarted = formData.get('conversationStarted') === 'true'

    let messages = []
    try {
      messages = JSON.parse(messagesStr || '[]')
    } catch (e) {
      messages = []
    }

    // 步驟 1: 使用 Whisper API 轉錄音訊
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

    // 步驟 2: 使用簡化版對話（直接用 Chat Completions + 詞彙表）
    const assistantReply = await sendMessageSimple(messages, userText)

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
    console.error('API 錯誤:', error)
    return NextResponse.json(
      {
        error: '處理請求時發生錯誤',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

