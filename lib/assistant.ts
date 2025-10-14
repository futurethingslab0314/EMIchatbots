import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// EMI-DEW 教練的指令
const ASSISTANT_INSTRUCTIONS = `你是「EMI-DEW 設計英語教練」。你的任務是幫助設計系學生掌握專業設計詞彙，並能以英語流暢做約 3 分鐘的口說介紹。你可以存取詞彙表檔案，該文件是常用設計英語詞彙列表。生成任何稿件與問題時，務必優先使用與該文件相符的詞彙；在最終稿末尾，列出實際用到且出自該文件的詞彙與字義，供學生參照與學習。

— 工作語言與輸出：
• 接受中文或英文輸入。預設最終演講稿輸出為英文；若學生明確要求，可提供中文或中英對照版本。
• 追問與互動提示可以學生的語言回覆（學生用中文，你就用中文提問；學生用英文，你就用英文提問）。

— 檔案使用規則（極重要）：
• 使用 file_search 工具搜尋詞彙表，找出貼合主題的術語（例：material, prototype, iteration, ergonomics, sustainability 等）。
• 生成文字時，自然融入詞彙表中的術語，不要生硬堆疊。
• 在最終稿結尾加入「Vocabulary from Design Vocabulary List」區塊：
  – 僅列出實際出現在最終稿中的、且詞彙表中存在的詞彙。
  – 為每個詞提供詞彙表中的定義／字義。
  – 詞彙以字母序排列；數量過多時上限 25 個、優先核心術語。

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
   • 語言層次：
     – 對大眾：避免行話，遇到專業詞彙先用簡語解釋再使用術語。
     – 對教授：允許技術細節與方法學用語，邏輯嚴整，避免浮誇。
     – 對業界：聚焦可行性、材料與製程、成本與尺度、測試與驗證。

6) 錄音練習（可選）：
   • 在最終講稿完成後，詢問學生是否需要錄音版本，以利口說練習。

7) 模擬問答：
   • 當學生確認講稿內容後，你將扮演現場的提問觀眾或評審，提出 3–5 個真實且具挑戰性的英文問題。

— 風格與品質守則：
• 不捏造未提供的數據或研究；若資訊缺，改用質性描述或提出可補充的建議。
• 優先使用主動語態、清楚的主旨句與段落銜接詞（First, Next, As a result…）。
• 保持尊重、中立、支持式回饋；避免奉承或過度推銷。

請嚴格遵循以上流程，逐步引導學生完成設計作品的英語 pitch 練習。`

// 上傳詞彙表 PDF 並創建 Assistant（只需執行一次）
export async function setupAssistant() {
  try {
    // 1. 上傳 PDF 檔案
    const pdfPath = path.join(process.cwd(), 'vocabularylist.pdf')
    
    if (!fs.existsSync(pdfPath)) {
      throw new Error('找不到 vocabularylist.pdf，請確認檔案在專案根目錄')
    }

    const file = await openai.files.create({
      file: fs.createReadStream(pdfPath),
      purpose: 'assistants',
    })

    console.log('✅ PDF 檔案已上傳:', file.id)

    // 2. 創建 Vector Store（用於檔案搜尋）
    const vectorStore = await openai.beta.vectorStores.create({
      name: 'EMI-DEW Design Vocabulary',
      file_ids: [file.id],
    })

    console.log('✅ Vector Store 已創建:', vectorStore.id)

    // 3. 創建 Assistant
    const assistant = await openai.beta.assistants.create({
      name: 'EMI-DEW 設計英語教練',
      instructions: ASSISTANT_INSTRUCTIONS,
      model: 'gpt-4o',
      tools: [{ type: 'file_search' }],
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStore.id],
        },
      },
      temperature: 0.8,
    })

    console.log('✅ Assistant 已創建:', assistant.id)

    return {
      assistantId: assistant.id,
      vectorStoreId: vectorStore.id,
      fileId: file.id,
    }
  } catch (error) {
    console.error('設定 Assistant 時發生錯誤:', error)
    throw error
  }
}

// 取得或創建 Assistant
export async function getOrCreateAssistant() {
  const assistantId = process.env.OPENAI_ASSISTANT_ID

  if (assistantId) {
    try {
      // 驗證 Assistant 是否存在
      const assistant = await openai.beta.assistants.retrieve(assistantId)
      return assistant
    } catch (error) {
      console.log('Assistant 不存在，創建新的...')
    }
  }

  // 如果沒有 ID 或 Assistant 不存在，創建新的
  const { assistantId: newAssistantId } = await setupAssistant()
  console.log('⚠️ 請將以下 ID 加入 .env.local:')
  console.log(`OPENAI_ASSISTANT_ID=${newAssistantId}`)
  
  return await openai.beta.assistants.retrieve(newAssistantId)
}

// 創建對話 Thread
export async function createThread() {
  const thread = await openai.beta.threads.create()
  return thread
}

// 發送訊息並獲得回覆
export async function sendMessage(
  threadId: string,
  message: string,
  assistantId: string
) {
  // 1. 添加使用者訊息到 Thread
  await openai.beta.threads.messages.create(threadId, {
    role: 'user',
    content: message,
  })

  // 2. 執行 Assistant
  const run = await openai.beta.threads.runs.create(threadId, {
    assistant_id: assistantId,
  })

  // 3. 等待執行完成
  let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id)
  
  while (runStatus.status !== 'completed') {
    if (runStatus.status === 'failed' || runStatus.status === 'cancelled' || runStatus.status === 'expired') {
      throw new Error(`Run ${runStatus.status}: ${runStatus.last_error?.message}`)
    }
    
    // 等待 1 秒後再檢查
    await new Promise(resolve => setTimeout(resolve, 1000))
    runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id)
  }

  // 4. 取得 Assistant 的回覆
  const messages = await openai.beta.threads.messages.list(threadId, {
    order: 'desc',
    limit: 1,
  })

  const lastMessage = messages.data[0]
  if (lastMessage.role === 'assistant' && lastMessage.content[0].type === 'text') {
    return lastMessage.content[0].text.value
  }

  throw new Error('無法取得 Assistant 回覆')
}

export { openai }

