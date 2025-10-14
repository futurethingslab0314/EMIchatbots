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
  | 'free-describe'    // 學生自由描述作品
  | 'qa-improve'       // Bot 追問細節
  | 'confirm-summary'  // 確認設計重點
  | 'generate-pitch'   // 生成 3 分鐘 pitch
  | 'practice-pitch'   // 學生練習 pitch
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
      
      case 'free-describe':
        // 描述完畢，等待 bot 提問
        // 不需要按鈕動作，錄音完成後自動處理
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
        // Pitch 已生成，準備練習
        // 等待學生準備好
        break
      
      case 'practice-pitch':
        // 開始語音練習 pitch → 啟動錄音
        startRecording()
        break
      
      case 'evaluation':
        // 生成關鍵字提點
        await triggerStageAction('keywords')
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
      'upload': '上傳作品照片',
      'intro': 'AI 教練介紹',
      'free-describe': '自由描述作品',
      'qa-improve': '回答問題與細節',
      'confirm-summary': '確認設計重點',
      'generate-pitch': '生成 Pitch 稿',
      'practice-pitch': '練習 Pitch',
      'evaluation': '評分與回饋',
      'keywords': '關鍵字筆記',
    }
    return labels[stage] || stage
  }

  // 取得麥克風按鈕提示文字
  const getMicButtonLabel = (): string => {
    const labels: Record<ConversationStage, string> = {
      'upload': '點擊麥克風開始對話',
      'intro': '等待 AI 教練介紹...',
      'free-describe': '🎤 自由描述作品',
      'qa-improve': '🎤 回答問題 / 增加細節',
      'confirm-summary': '確認後點擊上方按鈕',
      'generate-pitch': '等待 Pitch 生成...',
      'practice-pitch': '🎤 語音練習 Pitch',
      'evaluation': '等待評分...',
      'keywords': '查看關鍵字筆記',
    }
    return labels[currentStage] || '點擊麥克風說話'
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
                      📤 確認上傳作品
                    </button>
                    <p className="text-sm text-gray-500 mt-2">
                      AI 教練會先觀察您的作品並開始引導
                    </p>
                  </>
                )}

                {/* 階段 2: 自由分享 */}
                {currentStage === 'intro' && (
                  <>
                    <button
                      onClick={handleStageButton}
                      disabled={isProcessing || isSpeaking || isRecording}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50"
                    >
                      🎤 自由分享
                    </button>
                    <p className="text-sm text-gray-500 mt-2">
                      點擊後開始錄音，自由分享您的設計想法
                    </p>
                  </>
                )}

                {/* 階段 3: 自由描述完成後 */}
                {currentStage === 'free-describe' && (
                  <>
                    <div className="bg-gray-50 border-2 border-gray-300 rounded-xl p-4">
                      <p className="text-gray-600 font-medium">🎤 自由分享已完成</p>
                      <p className="text-sm text-gray-500 mt-1">等待 AI 處理並提出問題...</p>
                    </div>
                  </>
                )}

                {/* 階段 4: 回答問題/增加細節 */}
                {currentStage === 'qa-improve' && (
                  <>
                    <button
                      onClick={handleStageButton}
                      disabled={isProcessing || isSpeaking || isRecording}
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-blue-600 hover:to-cyan-600 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50"
                    >
                      🎤 回答問題/增加細節
                    </button>
                    <p className="text-sm text-gray-500 mt-2">
                      點擊後開始錄音，回答 AI 提出的問題
                    </p>
                  </>
                )}

                {/* 階段 5: 確認生成 Pitch */}
                {currentStage === 'confirm-summary' && (
                  <>
                    <button
                      onClick={handleStageButton}
                      disabled={isProcessing || isSpeaking}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50"
                    >
                      ✅ 確認生成 3 分鐘 Pitch
                    </button>
                    <p className="text-sm text-gray-500 mt-2">
                      確認設計重點無誤後，AI 會為您生成完整 pitch 稿
                    </p>
                  </>
                )}

                {/* 階段 6: Pitch 已生成 */}
                {currentStage === 'generate-pitch' && (
                  <>
                    <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4">
                      <p className="text-green-600 font-medium">✅ Pitch 已生成完成</p>
                      <p className="text-sm text-gray-500 mt-1">準備開始語音練習...</p>
                    </div>
                  </>
                )}

                {/* 階段 7: 語音練習 Pitch */}
                {currentStage === 'practice-pitch' && (
                  <>
                    <button
                      onClick={handleStageButton}
                      disabled={isProcessing || isSpeaking || isRecording}
                      className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-orange-600 hover:to-red-600 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 animate-pulse"
                    >
                      🎤 語音練習 Pitch
                    </button>
                    <p className="text-sm text-gray-500 mt-2">
                      準備好後，點擊開始朗讀剛才生成的 pitch
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
                      📝 生成關鍵字提點
                    </button>
                    <p className="text-sm text-gray-500 mt-2">
                      查看評分後，生成可複製的關鍵字筆記
                    </p>
                  </>
                )}

                {/* 錄音中的狀態顯示 */}
                {isRecording && (
                  <div className="bg-red-50 border-2 border-red-500 rounded-xl p-4">
                    <div className="flex items-center justify-center space-x-3">
                      <div className="w-4 h-4 bg-red-500 rounded-full recording-pulse"></div>
                      <p className="text-red-600 font-semibold text-lg">🎙️ 錄音中...</p>
                    </div>
                    <p className="text-sm text-gray-600 text-center mt-2">
                      說完後點擊下方麥克風停止錄音
                    </p>
                  </div>
                )}

                {/* 處理中的狀態 */}
                {isProcessing && (
                  <div className="flex items-center justify-center space-x-3 py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <p className="text-gray-600 font-medium">AI 處理中...</p>
                  </div>
                )}

                {/* AI 說話中的狀態 */}
                {isSpeaking && (
                  <div className="bg-purple-50 border-2 border-purple-500 rounded-xl p-4">
                    <div className="flex items-center justify-center space-x-3">
                      <svg className="w-6 h-6 text-purple-500 animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                      <p className="text-purple-600 font-semibold text-lg">🔊 AI 教練說話中...</p>
                    </div>
                    <p className="text-sm text-gray-600 text-center mt-2">
                      請仔細聆聽
                    </p>
                  </div>
                )}
              </div>

              {/* 當前階段提示 */}
              {currentStage !== 'upload' && !isRecording && !isProcessing && !isSpeaking && (
                <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <p className="text-sm text-blue-700">
                    <strong>當前階段：</strong> {getStageLabel(currentStage)}
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
                
                <p className="mt-4 text-white text-sm">點擊圓形按鈕拍照</p>
              </div>

              {/* 隱藏的 canvas 用於捕捉畫面 */}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          </div>
        )}

        {/* 對話歷史 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 min-h-[300px] max-h-[400px] overflow-y-auto">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">💬 對話記錄</h2>
          
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <p>上傳作品照片後點擊按鈕開始</p>
              <p className="text-sm mt-2">AI 教練會引導您完成英語 pitch 練習</p>
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

        {/* 即時字幕顯示 */}
        <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl shadow-lg p-6 mb-6 min-h-[120px]">
          <div className="text-white">
            {userTranscript && isRecording && (
              <div className="subtitle-display">
                <p className="text-sm opacity-80 mb-2">你正在說：</p>
                <p className="text-lg font-medium">{userTranscript}</p>
              </div>
            )}
            
            {currentSubtitle && isSpeaking && (
              <div className="subtitle-display">
                <p className="text-sm opacity-80 mb-2">教練說：</p>
                <p className="text-lg font-medium">{currentSubtitle}</p>
              </div>
            )}
            
            {!userTranscript && !currentSubtitle && (
              <div className="text-center py-8">
                <p className="text-xl opacity-80">字幕會在這裡即時顯示</p>
              </div>
            )}
          </div>
        </div>

        {/* 停止錄音按鈕（錄音時顯示） */}
        {isRecording && (
          <div className="flex justify-center items-center mb-6">
            <button
              onClick={stopRecording}
              className="relative w-20 h-20 rounded-full flex items-center justify-center transition-all transform hover:scale-110 bg-red-500 recording-pulse shadow-lg"
            >
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          </div>
        )}

        {/* 關鍵字筆記顯示區域 */}
        {currentStage === 'keywords' && generatedPitch && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">📝 Pitch 關鍵字提點</h2>
            <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap font-mono text-sm">
              {messages[messages.length - 1]?.content || ''}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(messages[messages.length - 1]?.content || '')
                alert('✅ 已複製到剪貼簿！')
              }}
              className="mt-4 w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-all"
            >
              📋 複製關鍵字筆記
            </button>
          </div>
        )}

        {/* 流程說明 */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">📚 Pitch 練習流程</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <div className={`flex items-center ${currentStage === 'upload' ? 'font-bold text-blue-600' : ''}`}>
              <span className="mr-2">{currentStage === 'upload' ? '▶️' : '✓'}</span>
              <span>1. 上傳作品照片 → 點擊「開始練習 Pitch」</span>
            </div>
            <div className={`flex items-center ${currentStage === 'free-describe' ? 'font-bold text-blue-600' : ''}`}>
              <span className="mr-2">{currentStage === 'free-describe' ? '▶️' : currentStage !== 'upload' ? '✓' : '○'}</span>
              <span>2. 🎤 自由描述作品（想到什麼說什麼）</span>
            </div>
            <div className={`flex items-center ${currentStage === 'qa-improve' ? 'font-bold text-blue-600' : ''}`}>
              <span className="mr-2">{currentStage === 'qa-improve' ? '▶️' : ['confirm-summary', 'generate-pitch', 'practice-pitch', 'evaluation', 'keywords'].includes(currentStage) ? '✓' : '○'}</span>
              <span>3. 🎤 回答問題 / 增加細節</span>
            </div>
            <div className={`flex items-center ${currentStage === 'confirm-summary' ? 'font-bold text-blue-600' : ''}`}>
              <span className="mr-2">{currentStage === 'confirm-summary' ? '▶️' : ['generate-pitch', 'practice-pitch', 'evaluation', 'keywords'].includes(currentStage) ? '✓' : '○'}</span>
              <span>4. 確認設計重點 → 點擊「確認生成 3 分鐘 Pitch」</span>
            </div>
            <div className={`flex items-center ${currentStage === 'practice-pitch' ? 'font-bold text-blue-600' : ''}`}>
              <span className="mr-2">{currentStage === 'practice-pitch' ? '▶️' : ['evaluation', 'keywords'].includes(currentStage) ? '✓' : '○'}</span>
              <span>5. 🎤 語音練習 Pitch</span>
            </div>
            <div className={`flex items-center ${currentStage === 'evaluation' ? 'font-bold text-blue-600' : ''}`}>
              <span className="mr-2">{currentStage === 'evaluation' ? '▶️' : currentStage === 'keywords' ? '✓' : '○'}</span>
              <span>6. 查看評分 → 點擊「生成關鍵字提點」</span>
            </div>
            <div className={`flex items-center ${currentStage === 'keywords' ? 'font-bold text-blue-600' : ''}`}>
              <span className="mr-2">{currentStage === 'keywords' ? '▶️' : '○'}</span>
              <span>7. 📝 複製關鍵字筆記</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

