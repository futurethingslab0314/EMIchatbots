/**
 * 此腳本用於初始化 OpenAI Assistant 並上傳詞彙表 PDF
 * 只需執行一次
 * 
 * 使用方式：
 * node scripts/setup-assistant.js
 */

const axios = require('axios')

async function setupAssistant() {
  try {
    console.log('🚀 開始設定 EMI-DEW Assistant...\n')

    // 呼叫設定 API
    const response = await axios.post('http://localhost:3000/api/setup-assistant')
    
    if (response.data.success) {
      console.log('✅ Assistant 設定完成！\n')
      console.log('📋 請按照以下步驟操作：\n')
      console.log('1. 將以下環境變數加入 .env.local：')
      console.log(`   OPENAI_ASSISTANT_ID=${response.data.assistantId}\n`)
      console.log('2. 如果要部署到 Vercel，也要在 Vercel 設定中添加此環境變數')
      console.log('3. 重新啟動開發伺服器：npm run dev\n')
      console.log('📊 Assistant 資訊：')
      console.log(`   - Assistant ID: ${response.data.assistantId}`)
      console.log(`   - Vector Store ID: ${response.data.vectorStoreId}`)
      console.log(`   - File ID: ${response.data.fileId}\n`)
    } else {
      console.error('❌ 設定失敗:', response.data.error)
    }
  } catch (error) {
    console.error('❌ 發生錯誤:')
    if (error.response) {
      console.error(error.response.data)
    } else if (error.code === 'ECONNREFUSED') {
      console.error('無法連接到開發伺服器。請確認：')
      console.error('1. 開發伺服器正在運行（npm run dev）')
      console.error('2. 伺服器在 http://localhost:3000 上運行')
    } else {
      console.error(error.message)
    }
  }
}

setupAssistant()

