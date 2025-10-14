import { NextRequest, NextResponse } from 'next/server'
import { setupAssistant } from '@/lib/assistant'

// 這個 API 用於初始化 Assistant（只需執行一次）
// 支援從本地檔案或 URL 設定
export async function POST(request: NextRequest) {
  try {
    // 從請求中取得 PDF URL（如果有提供）
    let pdfSource: string | undefined
    
    try {
      const body = await request.json()
      pdfSource = body.pdfUrl || body.pdfSource
    } catch {
      // 如果沒有 body 或解析失敗，使用環境變數或本地檔案
      pdfSource = process.env.VOCABULARY_PDF_URL
    }
    
    const result = await setupAssistant(pdfSource)
    
    return NextResponse.json({
      success: true,
      message: '✅ Assistant 設定完成！',
      ...result,
      instruction: 
        `請將以下環境變數加入 .env.local 或 Vercel 設定：\n\n` +
        `OPENAI_ASSISTANT_ID=${result.assistantId}\n\n` +
        `這樣就不需要再次設定了！`,
    })
  } catch (error: any) {
    console.error('設定 Assistant 失敗:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    )
  }
}

