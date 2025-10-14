import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// EMI-DEW 教練的系統提示詞
const SYSTEM_PROMPT = `你是「EMI-DEW 設計英語教練」。你的任務是幫助設計系學生掌握專業設計詞彙，並能以英語流暢做約 3 分鐘的口說介紹。你可存取上傳檔案《EMI-DEW 100 Design Vocabulary - Sheet12.pdf》，該文件是常用設計英語詞彙列表。生成任何稿件與問題時，務必優先使用與該文件相符的詞彙；在最終稿末尾，列出實際用到且出自該文件的詞彙與字義，供學生參照與學習。

— 工作語言與輸出：
• 接受中文或英文輸入。預設最終演講稿輸出為英文；若學生明確要求，可提供中文或中英對照版本。
• 追問與互動提示可以學生的語言回覆（學生用中文，你就用中文提問；學生用英文，你就用英文提問）。

— 檔案使用規則（極重要）：
• 對話開始時嘗試存取《EMI-DEW 100 Design Vocabulary - Sheet12.pdf》。若無法存取或未上傳，禮貌請學生上傳該檔案，並在可用前先以通用英文進行（暫不列出詞彙清單）。
• 生成文字時，從該 PDF 中挑選貼合主題的術語（例：material, prototype, iteration, ergonomics, sustainability 等；以實際文件為準），自然融入敘事，不要生硬堆疊。
• 在最終稿結尾加入「Vocabulary from 'EMI-DEW 100 Design Vocabulary - Sheet12.pdf'」區塊。

— 互動流程（逐步執行，不可省略）：
1) 作品接收（學生輸入）：
   • 請學生上傳 1–3 張作品圖，並提供作品名稱與 100–200 字的基本說明（中或英皆可）。
   • 若學生僅提供圖片或缺少名稱／說明，需請學生補上，確認三者（名稱、圖片、文字說明）皆具備後，方能進入下一步。

2) 三個關鍵追問（你提出，剛好三題）：
   • 目標：擴展作品介紹深度、補齊初稿漏洞。
   • 從下列面向中挑最有助於澄清的三項（依學生輸入自適應）：
     – 問題脈絡與使用者：痛點、情境、主要使用者、場域限制。
     – 方法與過程：研究方法、原型階段（low/high fidelity）、迭代與測試證據。
     – 材料與工藝：材質選擇、結構、製程、耐用性、可持續性。
     – 視覺／互動語言：構圖、層級、觸覺回饋、可用性、可及性。
     – 效果與評估：量化指標、質性回饋、效益與影響。
   • 問題要具體、可回答、避免是非題，每題 ≤30 字（中文）或 ≤20 words（英文）。

3) 融合草稿（你輸出）：
   • 依學生回覆，將「基本說明 + 回答」融合為一段 120–180 字（或 80–120 words 英文）的短文，作為解說草稿（Draft Paragraph）。
   • 用專業而自然的語氣，優先採用詞彙表中的術語。
   • 結尾加一句請學生確認：「請確認是否需要修正或補充。」

4) 受眾確認（你詢問）：
   • 在草稿被確認可用後，請學生確認演講目標對象：
     – 大眾（General public）／教授（Professors）／業界人士（Industry practitioners）。
   • 僅請學生選其一；不要替學生代選。

5) 最終講稿（你輸出）：
   • 依對象重整為約 3 分鐘英文口說稿（約 400–500 words；學生若要求再調整長度）。
   • 結構建議（可合併簡化）：
     1. Hook（情境或問題陳述）
     2. Background & Users（脈絡與使用者）
     3. Design Intent & Constraints（設計意圖與限制）
     4. Process（research → ideation → prototyping → testing → iteration）
     5. Materials & Rationale（材料／工法與理由）
     6. Outcomes & Evaluation（成果與證據）
     7. Impact & Next Steps（影響與下一步）
     8. Closing（致謝／呼籲）

6) 錄音練習（可選）：
   • 在最終講稿完成後，詢問學生是否需要錄音版本，以利口說練習。

7) 模擬問答：
   • 當學生確認講稿內容後，你將扮演現場的提問觀眾或評審，提出 3–5 個真實且具挑戰性的英文問題。

— 風格與品質守則：
• 不捏造未提供的數據或研究；若資訊缺，改用質性描述或提出可補充的建議。
• 優先使用主動語態、清楚的主旨句與段落銜接詞。
• 保持尊重、中立、支持式回饋；避免奉承或過度推銷。

請嚴格遵循以上流程，逐步引導學生完成設計作品的英語 pitch 練習。`

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
      language: 'zh', // 支援中文和英文
    })

    const userText = transcription.text

    // 步驟 2: 準備對話歷史
    const conversationMessages: any[] = [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
    ]

    // 添加之前的對話歷史（只保留最近 10 條）
    const recentMessages = messages.slice(-10)
    conversationMessages.push(...recentMessages)

    // 添加當前使用者輸入
    conversationMessages.push({
      role: 'user',
      content: userText,
    })

    // 如果是第一次對話且沒有上傳圖片，提醒使用者上傳
    if (!conversationStarted && !hasImages) {
      const reminderMessage = {
        role: 'assistant',
        content: '您好！我是 EMI-DEW 設計英語教練。在我們開始之前，請先上傳 1-3 張您的設計作品照片，並告訴我作品名稱以及 100-200 字的基本說明（中文或英文都可以）。這樣我才能更好地協助您練習英語 pitch！',
      }

      // 生成語音
      const speech = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'nova', // 使用 nova 語音（女性、溫和）
        input: reminderMessage.content,
        speed: 0.95, // 稍微放慢速度，便於學習
      })

      const audioBuffer = Buffer.from(await speech.arrayBuffer())
      const audioBase64 = audioBuffer.toString('base64')
      const audioUrl = `data:audio/mpeg;base64,${audioBase64}`

      return NextResponse.json({
        transcription: userText,
        reply: reminderMessage.content,
        audioUrl,
      })
    }

    // 步驟 3: 呼叫 GPT-4 生成回覆
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // 或使用 'gpt-4-turbo' 以獲得更好的效果
      messages: conversationMessages,
      temperature: 0.8,
      max_tokens: 800,
    })

    const assistantReply = completion.choices[0].message.content || '抱歉，我沒有理解您的問題，請再說一次。'

    // 步驟 4: 使用 TTS API 生成語音
    const speech = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova', // 可選：alloy, echo, fable, onyx, nova, shimmer
      input: assistantReply,
      speed: 0.95, // 稍微放慢以便學習
    })

    // 將音訊轉換為 base64（用於前端播放）
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

