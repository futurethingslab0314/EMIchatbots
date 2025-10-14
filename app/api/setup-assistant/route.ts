import { NextResponse } from 'next/server'
import { setupAssistant } from '@/lib/assistant'

// 這個 API 用於初始化 Assistant（只需執行一次）
export async function POST() {
  try {
    const result = await setupAssistant()
    
    return NextResponse.json({
      success: true,
      message: '✅ Assistant 設定完成！請將以下 ID 加入環境變數：',
      ...result,
      instruction: `請在 Vercel 設定中添加環境變數：\nOPENAI_ASSISTANT_ID=${result.assistantId}`,
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

