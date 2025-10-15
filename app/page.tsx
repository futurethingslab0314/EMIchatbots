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
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const [showAudioModal, setShowAudioModal] = useState(false)
  const [pendingAudioUrl, setPendingAudioUrl] = useState<string | null>(null)
  const [pendingAudioText, setPendingAudioText] = useState<string>('')

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
      // 解鎖音頻播放（Safari 需要）
      await unlockAudio()
      
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
      setPendingAudioUrl('')
      setPendingAudioText('無法存取麥克風，請確認權限設定')
      setShowAudioModal(true)
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

      // 提取評分數據（當進入 evaluation 階段時）
      if (currentStage === 'evaluation' || nextStage === 'evaluation') {
        extractScoresFromResponse(reply)
      }

      // 播放語音回覆並顯示字幕
      if (audioUrl) {
        await playAudioWithSubtitles(audioUrl, reply)
      }
    } catch (error) {
      console.error('處理音訊時發生錯誤:', error)
      setPendingAudioUrl('')
      setPendingAudioText('處理語音時發生錯誤，請稍後再試')
      setShowAudioModal(true)
    } finally {
      setIsProcessing(false)
    }
  }

  // 處理音頻播放請求（當需要用戶交互時）
  const handleAudioPlayRequest = (audioUrl: string, text: string) => {
    setPendingAudioUrl(audioUrl)
    setPendingAudioText(text)
    setShowAudioModal(true)
  }

  // 用戶確認播放音頻
  const confirmAudioPlay = async () => {
    setShowAudioModal(false)
    if (pendingAudioUrl && pendingAudioText) {
      await playAudioDirectly(pendingAudioUrl, pendingAudioText)
      setPendingAudioUrl(null)
      setPendingAudioText('')
    }
  }

  // 直接播放音頻（不需要用戶交互）
  const playAudioDirectly = async (audioUrl: string, text: string) => {
    setIsSpeaking(true)
    setCurrentSubtitle(text)

    return new Promise<void>((resolve) => {
      const audio = new Audio()
      audio.setAttribute('playsinline', '')
      audio.setAttribute('webkit-playsinline', '')
      audio.preload = 'auto'
      audio.crossOrigin = 'anonymous'
      audio.src = audioUrl
      
      audio.onended = () => {
        console.log('✅ 音頻播放完成')
        setIsSpeaking(false)
        setCurrentSubtitle('')
        audio.remove()
        resolve()
      }
      
      audio.onerror = (e) => {
        console.error('❌ 音頻播放錯誤:', e)
        setIsSpeaking(false)
        setCurrentSubtitle('')
        audio.remove()
        resolve()
      }
      
      audio.oncanplaythrough = () => {
        console.log('✅ 音頻加載完成，準備播放')
      }
      
      console.log('🔊 嘗試播放音頻:', audioUrl)
      audio.load()
      
      setTimeout(() => {
        const playPromise = audio.play()
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('✅ 音頻播放成功')
            })
            .catch((error) => {
              console.error('❌ 播放音頻失敗:', error.name, error.message)
              if (error.name === 'NotAllowedError') {
                console.warn('⚠️ 音頻播放被阻擋，需要用戶交互')
                handleAudioPlayRequest(audioUrl, text)
              } else {
                setIsSpeaking(false)
                setCurrentSubtitle('')
                audio.remove()
                resolve()
              }
            })
        }
      }, 100)
    })
  }

  // 解鎖音頻播放（用於 Safari）
  const unlockAudio = async () => {
    if (audioUnlocked) return
    
    try {
      // 創建一個靜音音頻並播放，以解鎖 Safari 的音頻限制
      const silentAudio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAA4T/vSKKAAAAAAAAAAAAAAAAAAAA//sQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sQZDwP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV')
      silentAudio.setAttribute('playsinline', '')
      await silentAudio.play()
      setAudioUnlocked(true)
      console.log('✅ 音頻已解鎖')
    } catch (error) {
      console.warn('⚠️ 音頻解鎖失敗:', error)
    }
  }

  // 播放音訊並顯示字幕
  const playAudioWithSubtitles = async (audioUrl: string, text: string) => {
    await playAudioDirectly(audioUrl, text)
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

      // 提取評分數據（當進入 evaluation 階段時）
      if (stage === 'evaluation' || nextStage === 'evaluation') {
        extractScoresFromResponse(reply)
      }

      // 播放語音
      if (audioUrl) {
        await playAudioWithSubtitles(audioUrl, reply)
      }
    } catch (error) {
      console.error('觸發階段動作時發生錯誤:', error)
      setPendingAudioUrl('')
      setPendingAudioText('處理時發生錯誤，請稍後再試')
      setShowAudioModal(true)
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
          setPendingAudioUrl('')
          setPendingAudioText('請至少上傳一張作品照片')
          setShowAudioModal(true)
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
      
      
      case 'evaluation':
        // 生成關鍵字提點
        await triggerStageAction('keywords')
        break
      
      case 'keywords':
        // 重新開始 - 重置所有狀態
        setCurrentStage('upload')
        setMessages([])
        setGeneratedPitch('')
        setEvaluationScores(null)
        setUserTranscript('')
        setCurrentSubtitle('')
        setUploadedImages([])
        setIsRecording(false)
        setIsProcessing(false)
        setIsSpeaking(false)
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
      setPendingAudioUrl('')
      setPendingAudioText('無法開啟相機，請確認權限設定或使用「從相簿選擇」功能')
      setShowAudioModal(true)
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
      'evaluation': '等待評分... Evaluation',
      'keywords': '查看關鍵字筆記 Keywords',
    }
    return labels[currentStage] || '點擊麥克風說話'
  }

  // 從 AI 回應中提取評分數據
  const extractScoresFromResponse = (response: string) => {
    try {
      console.log('🔍 開始解析評分數據...')
      console.log('📝 AI 回應內容:', response)
      
      // 嘗試解析評分（尋找數字格式）
      const originalityMatch = response.match(/Originality[：:]\s*(\d+)/i) || response.match(/原創性[）：]*\s*(\d+)/)
      const pronunciationMatch = response.match(/Pronunciation[：:]\s*(\d+)/i) || response.match(/發音[清晰度）：]*\s*(\d+)/)
      const engagingMatch = response.match(/Engaging Tone[：:]\s*(\d+)/i) || response.match(/表達吸引力[）：]*\s*(\d+)/)
      const contentMatch = response.match(/Content Delivery[：:]\s*(\d+)/i) || response.match(/內容表達[）：]*\s*(\d+)/)
      const timeMatch = response.match(/Time Management[：:]\s*(\d+)/i) || response.match(/時間[掌控）：]*\s*(\d+)/)

      console.log('🎯 匹配結果:', {
        originality: originalityMatch?.[1],
        pronunciation: pronunciationMatch?.[1],
        engaging: engagingMatch?.[1],
        content: contentMatch?.[1],
        time: timeMatch?.[1]
      })

      if (originalityMatch && pronunciationMatch && engagingMatch && contentMatch && timeMatch) {
        const scores = {
          originality: parseInt(originalityMatch[1]),
          pronunciation: parseInt(pronunciationMatch[1]),
          engagingTone: parseInt(engagingMatch[1]),
          contentDelivery: parseInt(contentMatch[1]),
          timeManagement: parseInt(timeMatch[1]),
        }
        console.log('✅ 成功解析評分:', scores)
        setEvaluationScores(scores)
      } else {
        console.warn('⚠️ 無法解析完整的評分數據')
      }
    } catch (error) {
      console.error('❌ 解析評分時發生錯誤:', error)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 標題 */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            3-Minute Design Pitch Coach
          </h1>
          <p className="text-gray-600">
            語音對話式設計作品 Pitch 練習平台
          </p>
        </div>

        {/* 圖片上傳區域 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            📸 上傳作品照片 Upload Your Design
          </h2>
          
          {/* 上傳方式選擇 - 只在 upload 階段顯示 */}
          {currentStage === 'upload' && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* 從相簿選擇 */}
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
                  <svg className="w-10 h-10 mb-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm font-semibold text-gray-700">從相簿選擇 from album</p>
                  <p className="text-xs text-gray-500">選擇現有照片 choose existing photos</p>
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
                  <p className="text-sm font-semibold text-gray-700">拍照 take photo</p>
                  <p className="text-xs text-gray-500">使用相機拍攝 use camera</p>
                </button>
              </div>
              
              <p className="text-xs text-gray-500 text-center">
                💡 建議上傳 1-3 張清晰的作品照片（不同角度更佳） recommend 1-3 clear photos (different angles are better)
              </p>
            </>
          )}

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
                      className="btn-confirm-upload"
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
                      className={isRecording ? 'btn-record-stop' : 'btn-record-start'}
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
                      className={isRecording ? 'btn-record-stop' : 'btn-base btn-blue-cyan'}
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
                        className="btn-redescribe"
                      >
                        🔄 重新描述作品 / Redescribe
                      </button>
                      <button
                        onClick={() => handleConfirmStageButton('confirm')}
                        disabled={isProcessing || isSpeaking}
                        className="btn-confirm-generate"
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
                      className="btn-practice-pitch"
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
                      className="btn-practice-pitch"
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
                      className="btn-record-stop"
                    >
                      🔴 停止錄音 / Stop Recording
                    </button>
                    <p className="text-sm text-gray-500 mt-2">
                      正在錄音中... 說完後點擊按鈕停止錄音 / Recording... Click to stop after speaking
                    </p>
                  </>
                )}

                {/* 評分圖表顯示在 evaluation 階段 */}
                {currentStage === 'evaluation' && evaluationScores && (
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

                {/* 階段 8: 生成關鍵字 */}
                {currentStage === 'evaluation' && (
                  <>
                    <button
                      onClick={handleStageButton}
                      disabled={isProcessing || isSpeaking}
                      className="btn-base btn-yellow-amber"
                    >
                      📝 生成 Pitch 小抄 / Generate Pitch Cheat Sheet
                    </button>
                    <p className="text-sm text-gray-500 mt-2">
                      點擊生成可複製的 Pitch 小抄筆記 / Click to generate copyable pitch cheat sheet
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
                    <p className="text-gray-600 font-medium">I'm processing your ideas...</p>
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

        {/* 音頻播放確認模態對話框 */}
        {showAudioModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="text-center">
                <div className="mb-4">
                  <svg className="w-16 h-16 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </div>
                
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  {pendingAudioUrl ? '音頻播放確認 / Audio Playback Confirmation' : '通知 / Notification'}
                </h3>
                
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {pendingAudioText || '請點擊「確定」以播放語音回覆 / Please click "OK" to play audio'}
                </p>
                
                <div className="flex space-x-4 justify-center">
                  <button
                    onClick={() => {
                      setShowAudioModal(false)
                      setPendingAudioUrl(null)
                      setPendingAudioText('')
                    }}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                  >
                    取消 / Cancel
                  </button>
                  <button
                    onClick={confirmAudioPlay}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                  >
                    確定 / OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
            <div className="mt-4 flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(messages[messages.length - 1]?.content || '')
                  setPendingAudioUrl('')
                  setPendingAudioText('✅ 已複製到剪貼簿！')
                  setShowAudioModal(true)
                }}
                className="btn-copy-notes"
              >
                📋 複製關鍵字筆記 / Copy Keywords
              </button>
              <button
                onClick={() => {
                  setCurrentStage('practice-pitch')
                  // 切換到練習階段，讓用戶可以再次練習
                }}
                disabled={isProcessing || isSpeaking}
                className="btn-practice-again"
              >
                🔄 再次練習 Pitch / Practice Pitch Again
              </button>
              <button
                onClick={handleStageButton}
                disabled={isProcessing || isSpeaking}
                className="btn-restart"
              >
                🔄 重新上傳新作品 / Upload New Work
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2 text-center">
              完成練習！可以複製筆記、再次練習或重新開始新的作品練習 / Practice complete! Copy notes, practice again or start new work
            </p>
          </div>
        )}

        {/* 流程說明 */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">📚 Pitch 練習流程 / Pitch Practice Flow</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <div className={`flex items-start ${currentStage === 'upload' ? 'font-bold text-blue-600' : ''}`}>
              <span className="mr-2 mt-1">{currentStage === 'upload' ? '▶️' : '✓'}</span>
              <div className="flex flex-col">
                <span>1. 上傳作品照片 → 點擊「開始練習 Pitch」</span>
                <span className="text-xs opacity-75">1. Upload photos → Click "Start Practice Pitch"</span>
              </div>
            </div>
            <div className="flex items-start">
              <span className="mr-2 mt-1">{currentStage !== 'upload' ? '✓' : '○'}</span>
              <div className="flex flex-col">
                <span>2. 🎤 自由描述作品（想到什麼說什麼）</span>
                <span className="text-xs opacity-75">2. 🎤 Free description (say what comes to mind)</span>
              </div>
            </div>
            <div className={`flex items-start ${currentStage === 'qa-improve' ? 'font-bold text-blue-600' : ''}`}>
              <span className="mr-2 mt-1">{currentStage === 'qa-improve' ? '▶️' : ['confirm-summary', 'generate-pitch', 'practice-pitch', 'evaluation', 'keywords'].includes(currentStage) ? '✓' : '○'}</span>
              <div className="flex flex-col">
                <span>3. 🎤 回答問題 / 增加細節</span>
                <span className="text-xs opacity-75">3. 🎤 Answer questions / Add details</span>
              </div>
            </div>
            <div className={`flex items-start ${currentStage === 'confirm-summary' ? 'font-bold text-blue-600' : ''}`}>
              <span className="mr-2 mt-1">{currentStage === 'confirm-summary' ? '▶️' : ['generate-pitch', 'practice-pitch', 'evaluation', 'keywords'].includes(currentStage) ? '✓' : '○'}</span>
              <div className="flex flex-col">
                <span>4. 確認設計重點 → 點擊「確認生成 3 分鐘 Pitch」</span>
                <span className="text-xs opacity-75">4. Confirm design focus → Click "Confirm Generate 3-min Pitch"</span>
              </div>
            </div>
            <div className={`flex items-start ${currentStage === 'practice-pitch' ? 'font-bold text-blue-600' : ''}`}>
              <span className="mr-2 mt-1">{currentStage === 'practice-pitch' ? '▶️' : ['evaluation', 'keywords'].includes(currentStage) ? '✓' : '○'}</span>
              <div className="flex flex-col">
                <span>5. 🎤 語音練習 Pitch</span>
                <span className="text-xs opacity-75">5. 🎤 Voice practice Pitch</span>
              </div>
            </div>
            <div className={`flex items-start ${currentStage === 'evaluation' ? 'font-bold text-blue-600' : ''}`}>
              <span className="mr-2 mt-1">{currentStage === 'evaluation' ? '▶️' : currentStage === 'keywords' ? '✓' : '○'}</span>
              <div className="flex flex-col">
                <span>6. 查看評分 → 點擊「生成 Pitch 小抄」</span>
                <span className="text-xs opacity-75">6. View scores → Click "Generate Pitch Cheat Sheet"</span>
              </div>
            </div>
            <div className={`flex items-start ${currentStage === 'keywords' ? 'font-bold text-blue-600' : ''}`}>
              <span className="mr-2 mt-1">{currentStage === 'keywords' ? '▶️' : '○'}</span>
              <div className="flex flex-col">
                <span>7. 📝 查看關鍵字筆記 → 複製筆記、再次練習或重新開始</span>
                <span className="text-xs opacity-75">7. 📝 View keyword notes → Copy notes, practice again or restart</span>
              </div>
            </div>
            <div className="flex items-start">
              <span className="mr-2 mt-1">🔄</span>
              <div className="flex flex-col">
                <span>8. 三個選項：複製筆記 / 再次練習 Pitch / 重新上傳新作品</span>
                <span className="text-xs opacity-75">8. Three options: Copy notes / Practice Pitch again / Upload new work</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

