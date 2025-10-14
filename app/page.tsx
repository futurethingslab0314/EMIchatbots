'use client'

import { useState, useRef, useEffect } from 'react'
import axios from 'axios'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

// 對話階段定義
type ConversationStage = 
  | 'upload'           // 上傳照片階段
  | 'intro'            // Bot 介紹並鼓勵
  | 'qa-improve'       // Bot 追問細節
  | 'confirm-summary'  // 確認設計重點
  | 'generate-pitch'   // 生成 3 分鐘 pitch
  | 'practice-pitch'   // 學生練習 pitch
  | 'practice-again'   // 練習完成後的選擇
  | 'evaluation'       // Bot 評分
  | 'keywords'         // 生成關鍵字筆記

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentSubtitle, setCurrentSubtitle] = useState('')
  const [userTranscript, setUserTranscript] = useState('')
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [currentStage, setCurrentStage] = useState<ConversationStage>('upload')
  const [threadId, setThreadId] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [generatedPitch, setGeneratedPitch] = useState('')
  const [evaluationScores, setEvaluationScores] = useState<{
    originality: number
    pronunciation: number
    engagingTone: number
    contentDelivery: number
    timeManagement: number
  } | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recognitionRef = useRef<any>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    // 初始化 Web Speech API（用於即時顯示使用者語音字幕）
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'zh-TW'

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }

        setUserTranscript(interimTranscript || finalTranscript)
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('語音識別錯誤:', event.error)
      }
    }
  }, [])

  // 開始錄音
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await processAudio(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      
      // 同時啟動即時字幕
      if (recognitionRef.current) {
        recognitionRef.current.start()
      }
    } catch (error) {
      console.error('無法啟動錄音:', error)
      alert('無法存取麥克風，請確認權限設定')
    }
  }

  // 停止錄音
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setUserTranscript('')
      
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }

  // 處理音訊並發送到後端
  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true)
    
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('messages', JSON.stringify(messages))
      formData.append('images', JSON.stringify(uploadedImages))
      formData.append('stage', currentStage)
      formData.append('triggerStage', 'false')
      
      // 如果有生成的 pitch，也傳送（用於評分）
      if (generatedPitch) {
        formData.append('generatedPitch', generatedPitch)
      }

      // 使用簡化版 API（避免 Buffer 類型問題）
      const response = await axios.post('/api/chat-simple', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      const { transcription, reply, audioUrl, nextStage, pitch } = response.data

      // 添加使用者訊息
      const userMessage: Message = {
        role: 'user',
        content: transcription,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, userMessage])

      // 添加助理回覆
      const assistantMessage: Message = {
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMessage])

      // 更新階段
      if (nextStage) {
        setCurrentStage(nextStage)
      }

      // 儲存生成的 pitch
      if (pitch) {
        setGeneratedPitch(pitch)
      }

      // 自動觸發評分階段
      if (currentStage === 'practice-pitch' && nextStage === 'evaluation') {
        // 自動觸發 evaluation 階段
        await triggerStageAction('evaluation')
      } else if (currentStage === 'evaluation' && nextStage === 'practice-again') {
        // 提取評分數據
        extractScoresFromResponse(reply)
      }

      // 播放語音回覆並顯示字幕
      if (audioUrl) {
        await playAudioWithSubtitles(audioUrl, reply)
      }
    } catch (error) {
      console.error('處理音訊時發生錯誤:', error)
      alert('處理語音時發生錯誤，請稍後再試')
    } finally {
      setIsProcessing(false)
    }
  }

  // 播放音訊並顯示字幕
  const playAudioWithSubtitles = async (audioUrl: string, text: string) => {
    setIsSpeaking(true)
    setCurrentSubtitle(text)

    const audio = new Audio(audioUrl)
    
    return new Promise<void>((resolve) => {
      audio.onended = () => {
        setIsSpeaking(false)
        setCurrentSubtitle('')
        resolve()
      }
      
      audio.onerror = () => {
        setIsSpeaking(false)
        setCurrentSubtitle('')
        resolve()
      }
      
      audio.play()
    })
  }

  // 處理圖片上傳
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const newImages: string[] = []
      
      Array.from(files).forEach((file) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          newImages.push(reader.result as string)
          if (newImages.length === files.length) {
            setUploadedImages(prev => [...prev, ...newImages])
          }
        }
        reader.readAsDataURL(file)
      })
    }
  }

  // 移除圖片
  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
  }

  // 觸發不同階段的 Bot 回應
  const triggerStageAction = async (stage: ConversationStage, userInput?: string) => {
    setIsProcessing(true)
    
    try {
      const formData = new FormData()
      const emptyAudio = new Blob([new Uint8Array(0)], { type: 'audio/webm' })
      formData.append('audio', emptyAudio, 'empty.webm')
      formData.append('messages', JSON.stringify(messages))
      formData.append('images', JSON.stringify(uploadedImages))
      formData.append('stage', stage)
      formData.append('triggerStage', 'true')
      
      if (userInput) {
        formData.append('userInput', userInput)
      }

      const response = await axios.post('/api/chat-simple', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      const { reply, audioUrl, nextStage, pitch } = response.data

      // 添加助理訊息
      const assistantMessage: Message = {
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMessage])

      // 更新階段
      if (nextStage) {
        setCurrentStage(nextStage)
      }

      // 儲存生成的 pitch
      if (pitch) {
        setGeneratedPitch(pitch)
      }

      // 播放語音
      if (audioUrl) {
        await playAudioWithSubtitles(audioUrl, reply)
      }
    } catch (error) {
      console.error('觸發階段動作時發生錯誤:', error)
      alert('處理時發生錯誤，請稍後再試')
    } finally {
      setIsProcessing(false)
    }
  }

  // 處理確認階段按鈕（兩個選項）
  const handleConfirmStageButton = async (action: 'confirm' | 'redescribe') => {
    if (action === 'confirm') {
      // 確認生成 3 mins pitch
      await triggerStageAction('generate-pitch')
    } else if (action === 'redescribe') {
      // 重新描述作品，回到 qa-improve 階段
      setCurrentStage('qa-improve')
    }
  }

  // 階段按鈕處理
  const handleStageButton = async () => {
    switch (currentStage) {
      case 'upload':
        // 確認上傳作品 → Bot 介紹
        if (uploadedImages.length === 0) {
          alert('請至少上傳一張作品照片')
          return
        }
        await triggerStageAction('intro')
        break
      
      case 'intro':
        // 開始自由描述作品 → 啟動錄音
        startRecording()
        break
      
      
      case 'qa-improve':
        // 開始回答問題 → 啟動錄音
        startRecording()
        break
      
      case 'confirm-summary':
        // 確認生成 3 mins pitch
        await triggerStageAction('generate-pitch')
        break
      
      case 'generate-pitch':
        // Pitch 已生成，準備練習 → 切換到 practice-pitch 階段
        setCurrentStage('practice-pitch')
        break
      
      case 'practice-pitch':
        // 開始語音練習 pitch → 啟動錄音
        startRecording()
        break
      
      case 'practice-again':
        // 重新練習 pitch → 啟動錄音
        startRecording()
        break
      
      case 'evaluation':
        // 生成關鍵字提點
        await triggerStageAction('keywords')
        break
      
      case 'keywords':
        // 重新開始 - 重置所有狀態
        setCurrentStage('upload')
        setUploadedImages([])
        setMessages([])
        setGeneratedPitch('')
        setIsRecording(false)
        setIsProcessing(false)
        setIsSpeaking(false)
        setUserTranscript('')
        setCurrentSubtitle('')
        // 清除文件輸入
        const fileInput = document.getElementById('file-input') as HTMLInputElement
        if (fileInput) fileInput.value = ''
        break
      
      default:
        break
    }
  }

  // 開啟相機
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // 優先使用後鏡頭
        audio: false,
      })
      setCameraStream(stream)
      setShowCamera(true)
      
      // 等待 video 元素載入後設定串流
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      }, 100)
    } catch (error) {
      console.error('無法存取相機:', error)
      alert('無法開啟相機，請確認權限設定或使用「從相簿選擇」功能')
    }
  }

  // 關閉相機
  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
    setShowCamera(false)
  }

  // 拍照
  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      
      // 設定 canvas 尺寸與 video 相同
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      // 將當前畫面繪製到 canvas
      const context = canvas.getContext('2d')
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        // 轉換為 base64
        const imageData = canvas.toDataURL('image/jpeg', 0.8)
        
        // 添加到已上傳的圖片
        setUploadedImages(prev => [...prev, imageData])
        
        // 關閉相機
        closeCamera()
      }
    }
  }

  // 清理：組件卸載時關閉相機
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [cameraStream])

  // 取得階段標籤
  const getStageLabel = (stage: ConversationStage): string => {
    const labels: Record<ConversationStage, string> = {
      'upload': '上傳作品照片 / Upload Your Design',
      'intro': 'AI 教練介紹 / Introduction',
      'qa-improve': '回答問題與細節 / Add Details',
      'confirm-summary': '確認設計重點 / Confirm Summary',
      'generate-pitch': '生成 Pitch 稿 / Generate Pitch',
      'practice-pitch': '練習 Pitch / Practice Pitch',
      'practice-again': '練習完成選擇 / Practice Again',
      'evaluation': '評分與回饋 / Evaluation',
      'keywords': '關鍵字筆記 / Keywords',
    }
    return labels[stage] || stage
  }

  // 取得麥克風按鈕提示文字
  const getMicButtonLabel = (): string => {
    const labels: Record<ConversationStage, string> = {
      'upload': '點擊麥克風開始對話 Start Conversation',
      'intro': '等待 AI 教練介紹...',
      'qa-improve': '🎤 回答問題 / 增加細節 Add Details',
      'confirm-summary': '確認後點擊上方按鈕 Confirm Summary',
      'generate-pitch': '等待 Pitch 生成... Generate Pitch',
      'practice-pitch': '🎤 語音練習 Practice Pitch',
      'practice-again': '選擇再次練習或生成筆記 Practice Again',
      'evaluation': '等待評分... Evaluation',
      'keywords': '查看關鍵字筆記 Keywords',
    }
    return labels[currentStage] || '點擊麥克風說話'
  }

  // 從 AI 回應中提取評分數據
  const extractScoresFromResponse = (response: string) => {
    try {
      // 嘗試解析評分（尋找數字格式）
      const originalityMatch = response.match(/Originality[：:]\s*(\d+)/i) || response.match(/原創性[）：]*\s*(\d+)/)
      const pronunciationMatch = response.match(/Pronunciation[：:]\s*(\d+)/i) || response.match(/發音[清晰度）：]*\s*(\d+)/)
      const engagingMatch = response.match(/Engaging Tone[：:]\s*(\d+)/i) || response.match(/表達吸引力[）：]*\s*(\d+)/)
      const contentMatch = response.match(/Content Delivery[：:]\s*(\d+)/i) || response.match(/內容表達[）：]*\s*(\d+)/)
      const timeMatch = response.match(/Time Management[：:]\s*(\d+)/i) || response.match(/時間[掌控）：]*\s*(\d+)/)

      if (originalityMatch && pronunciationMatch && engagingMatch && contentMatch && timeMatch) {
        setEvaluationScores({
          originality: parseInt(originalityMatch[1]),
          pronunciation: parseInt(pronunciationMatch[1]),
          engagingTone: parseInt(engagingMatch[1]),
          contentDelivery: parseInt(contentMatch[1]),
          timeManagement: parseInt(timeMatch[1]),
        })
      }
    } catch (error) {
      console.error('解析評分時發生錯誤:', error)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 標題 */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            EMI-DEW 設計英語教練
          </h1>
          <p className="text-gray-600">
            語音對話式設計作品 Pitch 練習平台
          </p>
        </div>

        {/* 圖片上傳區域 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            📸 上傳作品照片
          </h2>
          
          {/* 上傳方式選擇 */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* 從相簿選擇 */}
            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
              <svg className="w-10 h-10 mb-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm font-semibold text-gray-700">從相簿選擇</p>
              <p className="text-xs text-gray-500">選擇現有照片</p>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
              />
            </label>

            {/* 使用相機拍照 */}
            <button
              onClick={openCamera}
              className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all"
            >
              <svg className="w-10 h-10 mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm font-semibold text-gray-700">拍照</p>
              <p className="text-xs text-gray-500">使用相機拍攝</p>
            </button>
          </div>
          
          <p className="text-xs text-gray-500 text-center">
            💡 建議上傳 1-3 張清晰的作品照片（不同角度更佳）
          </p>

          {/* 已上傳的圖片預覽 */}
          {uploadedImages.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mt-4">
              {uploadedImages.map((img, index) => (
                <div key={index} className="relative group">
                  <img
                    src={img}
                    alt={`上傳的作品 ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 主要操作按鈕 - 根據階段動態顯示 */}
          {uploadedImages.length > 0 && (
            <div className="mt-6">
              <div className="text-center">
                {/* 階段 1: 確認上傳作品 */}
                {currentStage === 'upload' && (
                  <>
                    <button
                      onClick={handleStageButton}
                      disabled={isProcessing || isSpeaking}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-blue-600 hover:to-purple-600 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50"
                    >
                      📤 確認上傳作品 / Confirm Upload
                    </button>
                    <p className="text-sm text-gray-500 mt-2">
                      AI 教練會先觀察您的作品並開始引導 / AI coach will observe your work and guide you
                    </p>
                  </>
                )}

                {/* 階段 2: 自由分享 */}
                {currentStage === 'intro' && (
                  <>
                    <button
                      onClick={isRecording ? stopRecording : handleStageButton}
                      disabled={isProcessing || isSpeaking}
                      className={`px-8 py-4 rounded-full font-semibold text-lg transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 ${
                        isRecording 
                          ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white recording-pulse' 
                          : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
                      }`}
                    >
                      {isRecording ? '🔴 停止錄音 / Stop Recording' : '🎤 自由分享 / Free Sharing'}
                    </button>
                    <p className="text-sm text-gray-500 mt-2">
                      {isRecording 
                        ? '正在錄音中... 說完後點擊按鈕停止錄音 / Recording... Click to stop after speaking' 
                        : '點擊後開始錄音，自由分享您的設計想法 / Click to start recording and share your design ideas'
                      }
                    </p>
                  </>
                )}


                {/* 階段 4: 回答問題/增加細節 */}
                {currentStage === 'qa-improve' && (
                  <>
                    <button
                      onClick={isRecording ? stopRecording : handleStageButton}
                      disabled={isProcessing || isSpeaking}
                      className={`px-8 py-4 rounded-full font-semibold text-lg transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 ${
                        isRecording 
                          ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white recording-pulse' 
                          : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600'
                      }`}
                    >
                      {isRecording ? '🔴 停止錄音 / Stop Recording' : '🎤 回答問題/增加細節 / Answer Questions'}
                    </button>
                    <p className="text-sm text-gray-500 mt-2">
                      {isRecording 
                        ? '正在錄音中... 說完後點擊按鈕停止錄音 / Recording... Click to stop after speaking' 
                        : '點擊後開始錄音，回答 AI 提出的問題 / Click to start recording and answer AI questions'
                      }
                    </p>
                  </>
                )}

                {/* 階段 5: 確認生成 Pitch */}
                {currentStage === 'confirm-summary' && (
                  <>
                    <div className="flex space-x-4 justify-center">
                      <button
                        onClick={() => handleConfirmStageButton('redescribe')}
                        disabled={isProcessing || isSpeaking}
                        className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-full font-semibold text-lg hover:from-orange-600 hover:to-red-600 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50"
                      >
                        🔄 重新描述作品 / Redescribe
                      </button>
                      <button
                        onClick={() => handleConfirmStageButton('confirm')}
                        disabled={isProcessing || isSpeaking}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full font-semibold text-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50"
                      >
                        ✅ 確認生成 3 分鐘 Pitch / Confirm Generate 3-min Pitch
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-2 text-center">
                      如果不滿意重點整理，可以重新描述；確認無誤後生成完整 pitch 稿 / Redescribe if unsatisfied; Generate pitch after confirmation
                    </p>
                  </>
                )}

                {/* 階段 6: Pitch 已生成 */}
                {currentStage === 'generate-pitch' && (
                  <>
                    <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 mb-4">
                      <p className="text-green-600 font-medium">✅ Pitch 已生成完成 / Pitch Generated Successfully</p>
                      <p className="text-sm text-gray-500 mt-1">請先閱讀上方對話記錄中的 pitch 稿，準備好後開始練習 / Read the pitch above and prepare to practice</p>
                    </div>
                    <button
                      onClick={handleStageButton}
                      disabled={isProcessing || isSpeaking}
                      className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-orange-600 hover:to-red-600 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 animate-pulse"
                    >
                      🎤 開始練習 Pitch / Start Practice
                    </button>
                    <p className="text-sm text-gray-500 mt-2">
                      閱讀完 pitch 稿後，點擊開始練習 / Click to start practice after reading
                    </p>
                  </>
                )}

                {/* 階段 7: 語音練習 Pitch */}
                {currentStage === 'practice-pitch' && !isRecording && (
                  <>
                    <button
                      onClick={handleStageButton}
                      disabled={isProcessing || isSpeaking}
                      className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-orange-600 hover:to-red-600 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 animate-pulse"
                    >
                      🎤 開始語音練習 Pitch / Start Voice Practice
                    </button>
                    <p className="text-sm text-gray-500 mt-2">
                      準備好後，點擊開始朗讀剛才生成的 pitch / Click to start reading the generated pitch
                    </p>
                  </>
                )}

                {/* 練習 Pitch 錄音中狀態 */}
                {currentStage === 'practice-pitch' && isRecording && (
                  <>
                    <button
                      onClick={stopRecording}
                      disabled={isProcessing || isSpeaking}
                      className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-8 py-4 rounded-full font-semibold text-lg recording-pulse transition-all transform hover:scale-105 shadow-lg disabled:opacity-50"
                    >
                      🔴 停止錄音 / Stop Recording
                    </button>
                    <p className="text-sm text-gray-500 mt-2">
                      正在錄音中... 說完後點擊按鈕停止錄音 / Recording... Click to stop after speaking
                    </p>
                  </>
                )}

                {/* 練習完成後 - 評分圖表與兩個選擇按鈕 */}
                {currentStage === 'practice-again' && (
                  <>
                    {/* 評分圖表 */}
                    {evaluationScores && (
                      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                        <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">
                          📊 Pitch 表達技巧評分 / Pitch Presentation Skills Evaluation
                        </h3>
                        <div className="space-y-4">
                          {/* Originality */}
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-gray-700">Originality (內容原創性)</span>
                              <span className="text-lg font-bold text-indigo-600">{evaluationScores.originality}/20</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-indigo-400 to-indigo-600 h-4 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${(evaluationScores.originality / 20) * 100}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Pronunciation */}
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-gray-700">Pronunciation (發音清晰度)</span>
                              <span className="text-lg font-bold text-blue-600">{evaluationScores.pronunciation}/20</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-blue-400 to-blue-600 h-4 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${(evaluationScores.pronunciation / 20) * 100}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Engaging Tone */}
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-gray-700">Engaging Tone (表達吸引力)</span>
                              <span className="text-lg font-bold text-green-600">{evaluationScores.engagingTone}/20</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-green-400 to-green-600 h-4 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${(evaluationScores.engagingTone / 20) * 100}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Content Delivery */}
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-gray-700">Content Delivery (內容表達)</span>
                              <span className="text-lg font-bold text-purple-600">{evaluationScores.contentDelivery}/20</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-purple-400 to-purple-600 h-4 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${(evaluationScores.contentDelivery / 20) * 100}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Time Management */}
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-gray-700">Time Management (時間掌控)</span>
                              <span className="text-lg font-bold text-orange-600">{evaluationScores.timeManagement}/20</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-orange-400 to-orange-600 h-4 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${(evaluationScores.timeManagement / 20) * 100}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* 總分 */}
                          <div className="pt-4 mt-4 border-t-2 border-gray-200">
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-bold text-gray-800">總分 Total Score</span>
                              <span className="text-2xl font-bold text-indigo-600">
                                {evaluationScores.originality + evaluationScores.pronunciation + evaluationScores.engagingTone + evaluationScores.contentDelivery + evaluationScores.timeManagement}/100
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 雙按鈕選擇 */}
                    <div className="flex space-x-4 justify-center">
                      <button
                        onClick={() => {
                          setCurrentStage('practice-pitch')
                          // 只切換階段，讓學生在 practice-pitch 階段手動點擊開始錄音
                        }}
                        disabled={isProcessing || isSpeaking}
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-full font-semibold text-lg hover:from-blue-600 hover:to-cyan-600 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50"
                      >
                        🔄 再次練習 Pitch / Practice Again
                      </button>
                      <button
                        onClick={async () => {
                          await triggerStageAction('evaluation')
                        }}
                        disabled={isProcessing || isSpeaking}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-full font-semibold text-lg hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50"
                      >
                        📝 生成關鍵字提點 / Generate Keywords
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-2 text-center">
                      可以再次練習或直接生成關鍵字筆記 / Practice again or generate keywords
                    </p>
                  </>
                )}

                {/* 階段 8: 生成關鍵字 */}
                {currentStage === 'evaluation' && (
                  <>
                    <button
                      onClick={handleStageButton}
                      disabled={isProcessing || isSpeaking}
                      className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-yellow-600 hover:to-amber-600 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50"
                    >
                      📝 生成關鍵字提點 / Generate Keywords
                    </button>
                    <p className="text-sm text-gray-500 mt-2">
                      點擊生成可複製的關鍵字筆記 / Click to generate copyable keyword notes
                    </p>
                  </>
                )}

                {/* 錄音中的狀態顯示 */}
                {isRecording && (
                  <div className="bg-red-50 border-2 border-red-500 rounded-xl p-4">
                    <div className="flex items-center justify-center space-x-3">
                      <div className="w-4 h-4 bg-red-500 rounded-full recording-pulse"></div>
                      <p className="text-red-600 font-semibold text-lg">🎙️ 錄音中... / Recording...</p>
                    </div>
                    <p className="text-sm text-gray-600 text-center mt-2">
                      說完後點擊下方麥克風停止錄音 / Click microphone below to stop after speaking
                    </p>
                  </div>
                )}

                {/* 處理中的狀態 */}
                {isProcessing && (
                  <div className="flex items-center justify-center space-x-3 py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <p className="text-gray-600 font-medium">AI 處理中... / AI Processing...</p>
                  </div>
                )}

                {/* AI 說話中的狀態 */}
                {isSpeaking && (
                  <div className="bg-purple-50 border-2 border-purple-500 rounded-xl p-4">
                    <div className="flex items-center justify-center space-x-3">
                      <svg className="w-6 h-6 text-purple-500 animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                      <p className="text-purple-600 font-semibold text-lg">🔊 AI 教練說話中... / AI Coach Speaking...</p>
                    </div>
                    <p className="text-sm text-gray-600 text-center mt-2">
                      請仔細聆聽 / Please listen carefully
                    </p>
                  </div>
                )}
              </div>

              {/* 當前階段提示 */}
              {currentStage !== 'upload' && !isRecording && !isProcessing && !isSpeaking && (
                <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <p className="text-sm text-blue-700">
                    <strong>當前階段 / Current Stage：</strong> {getStageLabel(currentStage)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 相機模態視窗 */}
        {showCamera && (
          <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
            <div className="relative w-full h-full max-w-4xl max-h-screen p-4">
              {/* 關閉按鈕 */}
              <button
                onClick={closeCamera}
                className="absolute top-8 right-8 z-10 bg-red-500 text-white rounded-full p-3 hover:bg-red-600 transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* 相機預覽 */}
              <div className="flex flex-col items-center justify-center h-full">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="max-w-full max-h-[70vh] rounded-lg shadow-2xl"
                />
                
                {/* 拍照按鈕 */}
                <button
                  onClick={takePhoto}
                  className="mt-6 bg-white text-gray-800 rounded-full p-6 hover:bg-gray-100 transition-all shadow-lg"
                >
                  <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </button>
                
                <p className="mt-4 text-white text-sm">點擊圓形按鈕拍照 / Click circle button to take photo</p>
              </div>

              {/* 隱藏的 canvas 用於捕捉畫面 */}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          </div>
        )}


        {/* 即時字幕顯示 */}
        <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl shadow-lg p-6 mb-6 min-h-[120px]">
          <div className="text-white">
            {userTranscript && isRecording && (
              <div className="subtitle-display">
                <p className="text-sm opacity-80 mb-2">你正在說 / You are saying：</p>
                <p className="text-lg font-medium">{userTranscript}</p>
              </div>
            )}
            
            {currentSubtitle && isSpeaking && (
              <div className="subtitle-display">
                <p className="text-sm opacity-80 mb-2">教練說 / Coach says：</p>
                <p className="text-lg font-medium">{currentSubtitle}</p>
              </div>
            )}
            
            {!userTranscript && !currentSubtitle && (
              <div className="text-center py-8">
                <p className="text-xl opacity-80">字幕會在這裡即時顯示 / Subtitles will appear here in real-time</p>
              </div>
            )}
          </div>
        </div>


        {/* 對話歷史 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 min-h-[300px] max-h-[400px] overflow-y-auto">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">💬 對話記錄 History</h2>
          
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <p>上傳作品照片後點擊按鈕開始 / Upload photos and click button to start</p>
              <p className="text-sm mt-2">AI 教練會引導您完成英語 pitch 練習 / AI coach will guide you through English pitch practice</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {msg.timestamp.toLocaleTimeString('zh-TW', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>



        {/* 關鍵字筆記顯示區域 */}
        {currentStage === 'keywords' && generatedPitch && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">📝 Pitch 關鍵字提點 / Pitch Keywords</h2>
            <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap font-mono text-sm">
              {messages[messages.length - 1]?.content || ''}
            </div>
            <div className="mt-4 flex space-x-4">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(messages[messages.length - 1]?.content || '')
                  alert('✅ 已複製到剪貼簿！')
                }}
                className="flex-1 bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-all"
              >
                📋 複製關鍵字筆記 / Copy Keywords
              </button>
              <button
                onClick={handleStageButton}
                disabled={isProcessing || isSpeaking}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50"
              >
                🔄 重新上傳新作品 / Upload New Work
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2 text-center">
              完成練習！可以複製筆記或重新開始新的作品練習 / Practice complete! Copy notes or start new work practice
            </p>
          </div>
        )}

        {/* 流程說明 */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">📚 Pitch 練習流程 / Pitch Practice Flow</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <div className={`flex items-center ${currentStage === 'upload' ? 'font-bold text-blue-600' : ''}`}>
              <span className="mr-2">{currentStage === 'upload' ? '▶️' : '✓'}</span>
              <span>1. 上傳作品照片 → 點擊「開始練習 Pitch」/ Upload photos → Click "Start Practice Pitch"</span>
            </div>
            <div className="flex items-center">
              <span className="mr-2">{currentStage !== 'upload' ? '✓' : '○'}</span>
              <span>2. 🎤 自由描述作品（想到什麼說什麼）/ Free description (say what comes to mind)</span>
            </div>
            <div className={`flex items-center ${currentStage === 'qa-improve' ? 'font-bold text-blue-600' : ''}`}>
              <span className="mr-2">{currentStage === 'qa-improve' ? '▶️' : ['confirm-summary', 'generate-pitch', 'practice-pitch', 'evaluation', 'keywords'].includes(currentStage) ? '✓' : '○'}</span>
              <span>3. 🎤 回答問題 / 增加細節 / Answer questions / Add details</span>
            </div>
            <div className={`flex items-center ${currentStage === 'confirm-summary' ? 'font-bold text-blue-600' : ''}`}>
              <span className="mr-2">{currentStage === 'confirm-summary' ? '▶️' : ['generate-pitch', 'practice-pitch', 'evaluation', 'keywords'].includes(currentStage) ? '✓' : '○'}</span>
              <span>4. 確認設計重點 → 點擊「確認生成 3 分鐘 Pitch」/ Confirm design focus → Click "Confirm Generate 3-min Pitch"</span>
            </div>
            <div className={`flex items-center ${currentStage === 'practice-pitch' ? 'font-bold text-blue-600' : ''}`}>
              <span className="mr-2">{currentStage === 'practice-pitch' ? '▶️' : ['practice-again', 'evaluation', 'keywords'].includes(currentStage) ? '✓' : '○'}</span>
              <span>5. 🎤 語音練習 Pitch / Voice practice Pitch</span>
            </div>
            <div className={`flex items-center ${currentStage === 'practice-again' ? 'font-bold text-blue-600' : ''}`}>
              <span className="mr-2">{currentStage === 'practice-again' ? '▶️' : ['evaluation', 'keywords'].includes(currentStage) ? '✓' : '○'}</span>
              <span>6. 查看評分 → 選擇「再次練習」或「生成關鍵字提點」/ View scores → Choose "Practice Again" or "Generate Keywords"</span>
            </div>
            <div className={`flex items-center ${currentStage === 'evaluation' ? 'font-bold text-blue-600' : ''}`}>
              <span className="mr-2">{currentStage === 'evaluation' ? '▶️' : currentStage === 'keywords' ? '✓' : '○'}</span>
              <span>7. 生成關鍵字筆記 / Generate keyword notes</span>
            </div>
            <div className={`flex items-center ${currentStage === 'keywords' ? 'font-bold text-blue-600' : ''}`}>
              <span className="mr-2">{currentStage === 'keywords' ? '▶️' : '○'}</span>
              <span>8. 📝 查看關鍵字筆記 → 複製筆記或重新開始 / View keyword notes → Copy notes or restart</span>
            </div>
            <div className="flex items-center">
              <span className="mr-2">🔄</span>
              <span>9. 點擊「重新上傳新作品」→ 重新開始完整流程 / Click "Upload New Work" → Restart complete flow</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

