import { NextRequest, NextResponse } from 'next/server'
import { openai, getOrCreateAssistant, createThread, sendMessage } from '@/lib/assistant'

// 用於儲存每個對話的 Thread ID（實際應用中應使用資料庫）
const threadStore = new Map<string, string>()

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const threadId = formData.get('threadId') as string | null
    const hasImages = formData.get('hasImages') === 'true'
    const conversationStarted = formData.get('conversationStarted') === 'true'

    // 步驟 1: 使用 Whisper API 轉錄音訊
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'zh', // 支援中文和英文
    })

    const userText = transcription.text

    // 如果是第一次對話且沒有上傳圖片，提醒使用者上傳
    if (!conversationStarted && !hasImages) {
      const reminderMessage = '您好！我是 EMI-DEW 設計英語教練。在我們開始之前，請先上傳 1-3 張您的設計作品照片，並告訴我作品名稱以及 100-200 字的基本說明（中文或英文都可以）。這樣我才能更好地協助您練習英語 pitch！'

      // 生成語音
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
        threadId: null,
      })
    }

    // 步驟 2: 取得或創建 Assistant
    const assistant = await getOrCreateAssistant()

    // 步驟 3: 取得或創建 Thread
    let currentThreadId = threadId
    if (!currentThreadId) {
      const thread = await createThread()
      currentThreadId = thread.id
    }

    // 步驟 4: 發送訊息並取得回覆
    const assistantReply = await sendMessage(
      currentThreadId,
      userText,
      assistant.id
    )

    // 步驟 5: 使用 TTS API 生成語音
    const speech = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: assistantReply,
      speed: 0.95,
    })

    // 將音訊轉換為 base64
    const audioBuffer = Buffer.from(await speech.arrayBuffer())
    const audioBase64 = audioBuffer.toString('base64')
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`

    return NextResponse.json({
      transcription: userText,
      reply: assistantReply,
      audioUrl,
      threadId: currentThreadId,
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

