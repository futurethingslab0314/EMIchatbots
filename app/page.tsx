'use client'

import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { motion, AnimatePresence } from 'motion/react'
import { Camera, Image as ImageIcon, Mic, MicOff, Volume2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

// 對話階段定義
type ConversationStage = 
  | 'home'             // 首頁/歡迎頁面
  | 'upload'           // 上傳照片階段
  | 'free-description' // 自由描述作品
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
  const [subtitleHistory, setSubtitleHistory] = useState<string[]>([])
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [currentStage, setCurrentStage] = useState<ConversationStage>('home')
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
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
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const [showAudioModal, setShowAudioModal] = useState(false)
  const [pendingAudioUrl, setPendingAudioUrl] = useState<string | null>(null)
  const [pendingAudioText, setPendingAudioText] = useState<string>('')
  const pendingAudioResolveRef = useRef<(() => void) | null>(null)
  
  // 音訊權限狀態
  const [audioPermissionsGranted, setAudioPermissionsGranted] = useState(false)
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false)

  // 預先請求音訊權限
  const requestAudioPermissions = async () => {
    if (audioPermissionsGranted || isRequestingPermissions) return true
    
    setIsRequestingPermissions(true)
    
    try {
      // 1. 創建 AudioContext 並解鎖
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      
      // 2. 如果 AudioContext 被暫停，嘗試恢復
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }
      
      // 3. 創建一個短暫的無聲音頻來解鎖音訊系統
      const oscillator = audioContextRef.current.createOscillator()
      const gainNode = audioContextRef.current.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContextRef.current.destination)
      
      // 設置音量為 0，避免播放聲音
      gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime)
      
      // 播放很短的時間
      oscillator.frequency.setValueAtTime(440, audioContextRef.current.currentTime)
      oscillator.start()
      oscillator.stop(audioContextRef.current.currentTime + 0.01)
      
      // 4. 測試音訊播放權限
      const testAudio = new Audio()
      testAudio.setAttribute('playsinline', '')
      testAudio.setAttribute('webkit-playsinline', '')
      
      // 創建一個短暫的無聲音頻數據
      const audioBuffer = audioContextRef.current.createBuffer(1, 1, 44100)
      const audioData = audioBuffer.getChannelData(0)
      
      // 創建一個簡單的無聲音頻 blob
      const audioBlob = new Blob([audioData.buffer], { type: 'audio/wav' })
      const audioUrl = URL.createObjectURL(audioBlob)
      
      testAudio.src = audioUrl
      await testAudio.play()
      
      // 清理
      URL.revokeObjectURL(audioUrl)
      testAudio.remove()
      
      console.log('✅ 音訊權限已獲得')
      setAudioPermissionsGranted(true)
      setAudioUnlocked(true)
      return true
      
    } catch (error) {
      console.warn('⚠️ 音訊權限請求失敗:', error)
      // 即使失敗，也標記為已嘗試，避免重複請求
      setAudioPermissionsGranted(false)
      return false
    } finally {
      setIsRequestingPermissions(false)
    }
  }

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

  // 錄音計時器
  useEffect(() => {
    if (isRecording) {
      const timer = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
        // 模擬音頻等級動畫
        setAudioLevel(Math.random() * 0.8 + 0.2)
      }, 100)
      return () => clearInterval(timer)
    } else {
      setRecordingTime(0)
      setAudioLevel(0)
    }
  }, [isRecording])

  // 開始錄音
  const startRecording = async () => {
    try {
      // 解鎖音頻播放（Safari 需要）
      await unlockAudio()
      
      // 同時請求音訊播放權限
      await requestAudioPermissions()
      
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
      // 顯示處理中狀態，直到後端回應完成（processAudio finally 會關閉）
      setIsProcessing(true)
      
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
        // 將用戶的文字和 AI 的回應都添加到歷史記錄中
        if (transcription) {
          setSubtitleHistory(prev => [...prev, transcription])
        }
        setSubtitleHistory(prev => [...prev, reply])
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
  const handleAudioPlayRequest = (audioUrl: string, text: string, resolve?: () => void) => {
    setPendingAudioUrl(audioUrl)
    setPendingAudioText(text)
    pendingAudioResolveRef.current = resolve || null
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
    // 調用保存的 resolve 函數
    if (pendingAudioResolveRef.current) {
      pendingAudioResolveRef.current()
      pendingAudioResolveRef.current = null
    }
  }

  // 直接播放音頻（不需要用戶交互）
  const playAudioDirectly = async (audioUrl: string, text: string) => {
    setIsSpeaking(true)
    setCurrentSubtitle(text)

    return new Promise<void>((resolve) => {
      // 檢查音頻 URL 是否有效
      if (!audioUrl || audioUrl === 'null' || audioUrl === 'undefined') {
        console.warn('⚠️ 音頻 URL 無效:', audioUrl)
        setIsSpeaking(false)
        setCurrentSubtitle('')
        resolve()
        return
      }

      const audio = new Audio()
      audio.setAttribute('playsinline', '')
      audio.setAttribute('webkit-playsinline', '')
      audio.preload = 'auto'
      audio.crossOrigin = 'anonymous'
      
      audio.onended = () => {
        console.log('✅ 音頻播放完成')
        setIsSpeaking(false)
        setCurrentSubtitle('')
        audio.remove()
        resolve()
      }
      
      audio.onerror = (e) => {
        console.error('❌ 音頻播放錯誤:', e)
        console.error('音頻 URL:', audioUrl)
        console.error('音頻格式可能不支援或 URL 無效')
        setIsSpeaking(false)
        setCurrentSubtitle('')
        audio.remove()
        resolve()
      }
      
      audio.oncanplaythrough = () => {
        console.log('✅ 音頻加載完成，準備播放')
      }
      
      audio.onloadstart = () => {
        console.log('🔄 開始加載音頻:', audioUrl)
      }

      audio.onloadeddata = () => {
        console.log('📊 音頻數據加載完成')
      }
      
      console.log('🔊 嘗試播放音頻:', audioUrl)
      audio.src = audioUrl
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
                // 如果已經有音訊權限，直接顯示確認對話框
                if (audioPermissionsGranted) {
                  handleAudioPlayRequest(audioUrl, text, resolve)
                } else {
                  // 如果沒有權限，先嘗試請求權限
                  requestAudioPermissions().then((granted) => {
                    if (granted) {
                      // 權限獲得後，重新嘗試播放
                      setTimeout(() => {
                        const retryPromise = audio.play()
                        if (retryPromise !== undefined) {
                          retryPromise.then(() => {
                            console.log('✅ 重試播放成功')
                          }).catch(() => {
                            handleAudioPlayRequest(audioUrl, text, resolve)
                          })
                        }
                      }, 100)
                    } else {
                      handleAudioPlayRequest(audioUrl, text, resolve)
                    }
                  })
                }
              } else if (error.name === 'NotSupportedError') {
                console.warn('⚠️ 音頻格式不支援，跳過播放')
                    setIsSpeaking(false)
                    setCurrentSubtitle('')
                    audio.remove()
                    resolve()
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
  const triggerStageAction = async (stage: ConversationStage | 'intro', userInput?: string) => {
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
        // 將新的字幕添加到歷史記錄中
        setSubtitleHistory(prev => [...prev, reply])
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
      // 重新描述作品，回到 qa-improve 階段但不觸發 AI 回應，讓用戶可以錄音
      setCurrentStage('qa-improve')
      // 清除相關狀態，準備新的錄音
      setUserTranscript('')
      setCurrentSubtitle('')
      setSubtitleHistory([])
    }
  }

  // 階段按鈕處理
  const handleStageButton = async () => {
    switch (currentStage) {
      case 'home':
        // 從首頁進入上傳階段，同時請求音訊權限
        await requestAudioPermissions()
        setCurrentStage('upload')
        break
      
      case 'upload':
        // 確認上傳作品 → 自動觸發 AI 引導
        if (uploadedImages.length === 0) {
          setPendingAudioUrl('')
          setPendingAudioText('請至少上傳一張作品照片')
          setShowAudioModal(true)
          return
        }
        setCurrentStage('free-description')
        break
      
      case 'free-description':
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
        setCurrentStage('home')
        setMessages([])
        setGeneratedPitch('')
        setEvaluationScores(null)
        setUserTranscript('')
        setCurrentSubtitle('')
        setSubtitleHistory([])
        setUploadedImages([])
        setIsRecording(false)
        setIsProcessing(false)
        setIsSpeaking(false)
        setRecordingTime(0)
        setAudioLevel(0)
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

  // 格式化時間
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 取得階段顏色
  const getStepColor = () => {
    const colorMap: Record<ConversationStage, string> = {
      'home': 'from-black to-black',
      'upload': 'from-slate-100 to-slate-200',
      'free-description': 'from-orange-400 to-orange-500',
      'qa-improve': 'from-yellow-400 to-yellow-500',
      'confirm-summary': 'from-green-400 to-green-500',
      'generate-pitch': 'from-purple-400 to-purple-500',
      'practice-pitch': 'from-purple-400 to-purple-500',
      'evaluation': 'from-pink-400 to-pink-500',
      'keywords': 'from-indigo-400 to-indigo-500',
    }
    return colorMap[currentStage]
  }

  // 取得階段標題
  const getStepTitle = () => {
    const titleMap: Record<ConversationStage, string> = {
      'home': 'Pitch Coach',
      'upload': 'Upload Work',
      'free-description': 'Free Share',
      'qa-improve': 'Q&A Time',
      'confirm-summary': 'Confirm Focus',
      'generate-pitch': 'Generate Pitch',
      'practice-pitch': 'Voice Practice',
      'evaluation': 'Your Score',
      'keywords': 'Pitch Notes',
    }
    return titleMap[currentStage]
  }

  // 取得階段編號
  const getStepNumber = () => {
    const stepMap: Record<ConversationStage, number> = {
      'home': 0,
      'upload': 1,
      'free-description': 2,
      'qa-improve': 3,
      'confirm-summary': 4,
      'generate-pitch': 5,
      'practice-pitch': 6,
      'evaluation': 7,
      'keywords': 8,
    }
    return stepMap[currentStage]
  }

  // 取得階段標籤
  const getStageLabel = (stage: ConversationStage | 'intro'): string => {
    const labels: Record<ConversationStage | 'intro', string> = {
      'home': '首頁 / Home',
      'upload': '上傳作品照片 / Upload Your Design',
      'free-description': '自由描述 / Free Description',
      'qa-improve': '回答問題與細節 / Add Details',
      'confirm-summary': '確認設計重點 / Confirm Summary',
      'generate-pitch': '生成 Pitch 稿 / Generate Pitch',
      'practice-pitch': '練習 Pitch / Practice Pitch',
      'evaluation': '評分與回饋 / Evaluation',
      'keywords': '關鍵字筆記 / Keywords',
      'intro': 'AI 教練介紹 / Introduction',
    }
    return labels[stage] || stage
  }

  // 取得麥克風按鈕提示文字
  const getMicButtonLabel = (): string => {
    const labels: Record<ConversationStage, string> = {
      'home': '點擊開始 Start',
      'upload': '點擊麥克風開始對話 Start Conversation',
      'free-description': '🎤 自由描述作品 Free Description',
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
    <>
      <div className="min-h-screen w-full overflow-hidden">
        {/* Content Area with Animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStage}
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`min-h-screen w-full max-w-screen-lg mx-auto bg-gradient-to-br ${getStepColor()}`}
          >
            {/* Header */}
            {currentStage !== 'home' && (
              <div className="px-6 md:px-8 lg:px-12 py-4 md:py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl md:text-4xl lg:text-5xl text-black">
                      {getStepTitle()}
          </h1>
                    <p className="text-sm md:text-base text-black/60">
                      Step {getStepNumber()}/8
          </p>
        </div>
              </div>
              </div>
            )}

            {/* Main Content */}
            <div className="px-6 md:px-8 lg:px-12 flex-1 flex flex-col justify-between pb-8 md:pb-12">
              {/* Home/Landing Page */}
              {currentStage === 'home' && (
                <div className="flex-1 flex flex-col justify-between pt-16 pb-12">
                  <div className="flex-1 flex flex-col justify-between">
                    {/* Title Section */}
                    <div className="space-y-3">
                      <h1 className="text-5xl md:text-6xl lg:text-7xl text-white uppercase leading-tight tracking-tight">
                        3-MINUTE
                        <br />
                        DESIGN
                        <br />
                        PITCH
                      </h1>
                      <p className="text-xl md:text-2xl lg:text-3xl text-white/50 uppercase tracking-wide">
                        COACH
                      </p>
                    </div>

                    {/* Dot Pattern Visualization */}
                    <div className="flex items-center justify-center py-8">
                      <div className="grid grid-cols-12 gap-2">
                        {Array.from({ length: 144 }).map((_, i) => {
                          const row = Math.floor(i / 12)
                          const col = i % 12
                          const distance = Math.sqrt(
                            Math.pow(col - 5.5, 2) + Math.pow(row - 5.5, 2)
                          )
                          const isInCircle = distance < 5.5
                          return (
                            <motion.div
                              key={i}
                              className={`w-2 h-2 rounded-full ${
                                isInCircle ? "bg-white" : "bg-white/0"
                              }`}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: isInCircle ? 1 : 0 }}
                              transition={{
                                delay: i * 0.005,
                                duration: 0.3,
                              }}
                            />
                          )
                        })}
                </div>
            </div>

                    {/* Features */}
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-8 bg-white"></div>
                          <div>
                            <p className="text-sm md:text-base text-white/60 uppercase tracking-wide">
                              01
                            </p>
                            <p className="text-white text-sm md:text-base">
                              Upload Design Work
                            </p>
                          </div>
                        </div>
              </div>
              
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-8 bg-white"></div>
                          <div>
                            <p className="text-sm md:text-base text-white/60 uppercase tracking-wide">
                              02
                            </p>
                            <p className="text-white text-sm md:text-base">
                              Practice with AI Coach
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-8 bg-white"></div>
                          <div>
                            <p className="text-sm md:text-base text-white/60 uppercase tracking-wide">
                              03
                            </p>
                            <p className="text-white text-sm md:text-base">
                              Generate Pitch Notes
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Start Button */}
                  <motion.button
                    onClick={handleStageButton}
                    className="w-full py-5 md:py-6 bg-white text-black rounded-none text-lg md:text-xl uppercase tracking-widest border-4 border-white hover:bg-white/90 transition-colors"
                    whileTap={{ scale: 0.98 }}
                  >
                    START
                  </motion.button>
                    </div>
              )}

              {/* Upload Step */}
              {currentStage === 'upload' && (
                <div className="flex-1 flex flex-col">
          {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {uploadedImages.map((img, idx) => (
                  <img
                          key={idx}
                    src={img}
                          alt={`Work ${idx}`}
                          className="w-full aspect-square object-cover rounded-2xl"
                        />
              ))}
                    </div>
          )}

                  <div className="flex-1 flex items-center justify-center">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 rounded-full bg-black/10 flex items-center justify-center backdrop-blur-sm hover:bg-black/20 transition-all"
                    >
                      <Camera className="w-24 h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 text-black/40" />
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {uploadedImages.length > 0 && (
                    <button
                      onClick={handleStageButton}
                      className="w-full py-4 md:py-5 bg-black text-white rounded-full text-lg md:text-xl uppercase tracking-wide"
                    >
                      Start Practice
                    </button>
                  )}
                        </div>
              )}

              {/* Recording Steps */}
              {(currentStage === 'free-description' ||
                currentStage === 'qa-improve' ||
                currentStage === 'practice-pitch') && (
                <div className="flex-1 flex flex-col items-center justify-between">
                  {/* Visual Indicator */}
                  <div className="flex-1 flex items-center justify-center relative">
                    <div className="relative w-64 h-64 md:w-80 md:h-80">
                      {/* Outer ring */}
                      <div className="absolute inset-0 rounded-full bg-black/10"></div>

                      {/* Dot pattern */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        {currentStage === 'free-description' && isSpeaking ? (
                          <div className="text-center">
                            {/* Audio Wave Bars */}
                            <div className="flex items-center justify-center gap-2 mb-6" style={{ height: '100px' }}>
                              {Array.from({ length: 7 }).map((_, i) => (
                                <motion.div
                                  key={i}
                                  className="w-2 bg-black rounded-full"
                                  animate={{
                                    height: [
                                      20,
                                      Math.random() * 60 + 20,
                                      Math.random() * 80 + 20,
                                      Math.random() * 60 + 20,
                                      20,
                                    ],
                                  }}
                                  transition={{
                                    duration: 0.8,
                                    repeat: Infinity,
                                    delay: i * 0.1,
                                    ease: "easeInOut",
                                  }}
                                />
                              ))}
                        </div>
                            <p className="text-sm text-black/60 uppercase tracking-wide">
                              AI Speaking
                            </p>
                        </div>
                        ) : isProcessing ? (
                          <div className="text-center">
                            <motion.div
                              className="w-32 h-32 md:w-40 md:h-40 border-4 border-black rounded-full border-t-transparent"
                              animate={{ rotate: 360 }}
                              transition={{
                                duration: 0.8,
                                repeat: Infinity,
                                ease: [0.4, 0, 0.2, 1],
                              }}
                            />
                            <p className="text-sm md:text-base text-black/60 mt-4 uppercase tracking-wide">Thinking...</p>
                      </div>
                        ) : (
                          <div className="grid grid-cols-8 gap-2">
                            {Array.from({ length: 64 }).map((_, i) => {
                              const distance = Math.sqrt(
                                Math.pow((i % 8) - 3.5, 2) +
                                  Math.pow(Math.floor(i / 8) - 3.5, 2)
                              )
                              const isInside = distance < 4
                              const scale = isRecording
                                ? 1 + audioLevel * 0.5 * Math.random()
                                : 1
                              return isInside ? (
                                <motion.div
                                  key={i}
                                  className="w-2 h-2 rounded-full bg-black"
                                  animate={{
                                    scale: isRecording ? [1, scale, 1] : 1,
                                    opacity: isRecording ? [0.4, 1, 0.4] : 0.8,
                                  }}
                                  transition={{
                                    duration: 0.5,
                                    repeat: isRecording ? Infinity : 0,
                                    delay: i * 0.02,
                                  }}
                                />
                              ) : (
                                <div key={i} className="w-2 h-2" />
                              )
                            })}
                            </div>
                        )}
                          </div>
                            </div>
                          </div>

                  {/* Timer */}
                  <div className="text-center mb-4">
                    <div className="text-4xl md:text-5xl lg:text-6xl text-black">
                      {formatTime(recordingTime)}
                            </div>
                    {isRecording && (
                      <div className="text-sm md:text-base text-black/60 mt-1 uppercase tracking-wide">
                        Recording
                            </div>
                    )}
                    {isProcessing && (
                      <div className="text-sm md:text-base text-black/60 mt-1 uppercase tracking-wide">
                        Listening
                          </div>
                    )}
                    {currentStage === 'free-description' && isSpeaking && (
                      <div className="text-sm md:text-base text-black/60 mt-1 uppercase tracking-wide">
                        AI Speaking
                            </div>
                    )}
                          </div>

                  {/* Subtitle Area */}
                  <div className="w-full min-h-[80px] md:min-h-[100px] bg-black/10 rounded-3xl p-4 md:p-6 mb-6">
                    <div className="space-y-2">
                      {/* 當前字幕 - 放在最上面 */}
                          <div>
                        <p className="text-center text-black/80 text-sm md:text-base leading-relaxed">
                          {currentSubtitle || userTranscript || "Tap to start speaking..."}
                        </p>
                            </div>
                      {/* 對話歷史 - 只顯示最近一句話 */}
                      {subtitleHistory.length > 0 && (
                        <div className="border-t border-black/20 pt-2">
                          <p className="text-center text-black/60 text-xs md:text-sm leading-relaxed">
                            {subtitleHistory[subtitleHistory.length - 1]}
                          </p>
                            </div>
                      )}
                          </div>
                        </div>

                  {/* Action Buttons */}
                  <div className="w-full flex flex-col items-center gap-3">
                    <button
                      onClick={
                        (currentStage === 'free-description' && isSpeaking) || isProcessing
                          ? undefined
                          : isRecording
                          ? stopRecording
                          : startRecording
                      }
                      disabled={(currentStage === 'free-description' && isSpeaking) || isProcessing}
                      className={`w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center transition-all ${
                        isRecording
                          ? 'bg-black text-white'
                          : (currentStage === 'free-description' && isSpeaking) || isProcessing
                            ? 'bg-black/20 text-black/40 cursor-not-allowed'
                            : 'bg-black text-white hover:scale-105'
                      }`}
                    >
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/20"></div>
                    </button>

                    {!isProcessing && !(currentStage === 'free-description' && isSpeaking) && (
                        <div className="text-xs md:text-sm text-black/50 text-center uppercase tracking-wide">
                          <p>Microphone permission needed</p>
                          <p>Tap button to enable</p>
                  </div>
                )}
                        </div>
                  </div>
                )}

              {/* Confirm Focus Step */}
              {currentStage === 'confirm-summary' && (
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center space-y-6">
                      <div className="w-24 h-24 md:w-32 md:h-32 mx-auto border-4 border-black rounded-full flex items-center justify-center">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-black rounded-full"></div>
                    </div>
                          <div>
                        <p className="text-sm md:text-base text-black/60 uppercase tracking-wide mb-2">READY</p>
                        <p className="text-3xl md:text-4xl lg:text-5xl text-black uppercase tracking-tight leading-tight">
                          GENERATE<br />3-MINUTE<br />PITCH
                    </p>
                  </div>
              </div>
              </div>

                  {/* Subtitle Area */}
                  <div className="w-full min-h-[80px] md:min-h-[100px] bg-black/10 rounded-3xl p-4 md:p-6 mb-6">
                    <div className="space-y-2">
                      {/* 當前字幕 - 放在最上面 */}
                      <div>
                        <p className="text-center text-black/80 text-sm md:text-base leading-relaxed">
                          {currentSubtitle || "確認設計重點後，點擊 Generate 開始生成 3 分鐘 pitch..."}
                  </p>
                </div>
                      {/* 對話歷史 - 只顯示最近一句話 */}
                      {subtitleHistory.length > 0 && (
                        <div className="border-t border-black/20 pt-2">
                          <p className="text-center text-black/60 text-xs md:text-sm leading-relaxed">
                            {subtitleHistory[subtitleHistory.length - 1]}
                          </p>
            </div>
          )}
                    </div>
        </div>

                  <div className="flex space-x-4 justify-center">
              <button
                      onClick={() => handleConfirmStageButton('redescribe')}
                      disabled={isProcessing || isSpeaking}
                      className="px-6 py-3 md:px-8 md:py-4 bg-black/10 text-black rounded-full text-sm md:text-base uppercase tracking-wide"
              >
                      Redescribe
              </button>
                <button
                      onClick={() => handleConfirmStageButton('confirm')}
                      disabled={isProcessing || isSpeaking}
                      className="px-6 py-3 md:px-8 md:py-4 bg-black text-white rounded-full text-sm md:text-base uppercase tracking-wide"
                >
                      Generate
                </button>
            </div>
          </div>
        )}

              {/* Generate Pitch Step */}
              {currentStage === 'generate-pitch' && (
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center space-y-6">
                      <div className="w-24 h-24 md:w-32 md:h-32 mx-auto border-4 border-black rounded-full flex items-center justify-center">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-black rounded-full"></div>
              </div>
                          <div>
                        <p className="text-sm md:text-base text-black/60 uppercase tracking-wide mb-2">GENERATED</p>
                        <p className="text-3xl md:text-4xl lg:text-5xl text-black uppercase tracking-tight leading-tight">
                          PITCH<br />READY
                        </p>
                            </div>
                            </div>
                          </div>

                    <button
                      onClick={handleStageButton}
                      disabled={isProcessing || isSpeaking}
                    className="w-full py-4 md:py-5 bg-black text-white rounded-full text-lg md:text-xl uppercase tracking-wide"
                    >
                    Start Practice
                    </button>
              </div>
            )}
            
              {/* View Scores Step */}
              {currentStage === 'evaluation' && evaluationScores && (
                <div className="flex-1 flex flex-col justify-between pb-4">
                  {/* 1️⃣ 頂部總分 */}
                  <div className="text-center py-6">
                    <div className="text-7xl md:text-8xl text-black mb-2">
                      {evaluationScores.originality + evaluationScores.pronunciation + evaluationScores.engagingTone + evaluationScores.contentDelivery + evaluationScores.timeManagement}
                    </div>
                    <p className="text-sm text-black/50 uppercase tracking-widest">
                      Total Score
                    </p>
                  </div>

                  {/* 2️⃣ 五個維度的分數卡片 */}
                  <div className="flex-1 overflow-y-auto space-y-4 px-2">
                    {[
                      { key: 'originality', label: 'Originality', score: evaluationScores.originality },
                      { key: 'pronunciation', label: 'Pronunciation', score: evaluationScores.pronunciation },
                      { key: 'engagingTone', label: 'Engaging Tone', score: evaluationScores.engagingTone },
                      { key: 'contentDelivery', label: 'Content Delivery', score: evaluationScores.contentDelivery },
                      { key: 'timeManagement', label: 'Time Management', score: evaluationScores.timeManagement },
                    ].map((item, idx) => (
                      <motion.div
                        key={item.key}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-black/5 rounded-3xl p-6 flex items-center justify-between"
                      >
                        {/* 左側：標籤 + 進度條 */}
                        <div className="flex-1">
                          <p className="text-xs text-black/50 uppercase tracking-widest mb-1">
                            {item.label}
                          </p>
                          <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-black"
                              initial={{ width: 0 }}
                              animate={{ width: `${(item.score / 20) * 100}%` }}
                              transition={{ duration: 0.8, delay: idx * 0.1 + 0.3 }}
                            />
                          </div>
                        </div>
                        
                        {/* 右側：大號分數 */}
                        <div className="ml-6 text-right">
                          <motion.div
                            className="text-5xl text-black"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: idx * 0.1 + 0.2, type: "spring" }}
                          >
                            {item.score}
                          </motion.div>
                          <p className="text-xs text-black/40">/20</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* 3️⃣ 字幕區域 */}
                  <div className="w-full min-h-[80px] md:min-h-[100px] bg-black/10 rounded-3xl p-4 md:p-6 mt-4">
                    <div className="space-y-2">
                      {/* 當前字幕 - 放在最上面 */}
                      <div>
                        <p className="text-center text-black/80 text-sm md:text-base leading-relaxed">
                          {currentSubtitle || "查看您的評分結果和改進建議..."}
                        </p>
                      </div>
                      {/* 對話歷史 - 只顯示最近一句話 */}
                      {subtitleHistory.length > 0 && (
                        <div className="border-t border-black/20 pt-2">
                          <p className="text-center text-black/60 text-xs md:text-sm leading-relaxed">
                            {subtitleHistory[subtitleHistory.length - 1]}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4️⃣ 底部按鈕 */}
                  <button
                    onClick={handleStageButton}
                    className="w-full py-4 mt-4 bg-black text-white rounded-full text-lg uppercase tracking-wide"
                  >
                    Generate Pitch Cheat Sheet
                  </button>
                </div>
                )}

              {/* View Notes Step */}
              {currentStage === 'keywords' && (
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex-1 overflow-y-auto space-y-3">
                    {messages.length > 0 && messages[messages.length - 1]?.content && (
                      <div className="p-4 bg-black/10 rounded-2xl">
                        <p className="text-sm md:text-base text-black whitespace-pre-wrap">
                          {messages[messages.length - 1].content}
                        </p>
            </div>
          )}
        </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(messages[messages.length - 1]?.content || '')
                        setPendingAudioUrl('')
                        setPendingAudioText('✅ 已複製到剪貼簿！')
                        setShowAudioModal(true)
                }}
                      className="py-3 md:py-4 bg-black/10 text-black rounded-full uppercase tracking-wide text-sm md:text-base"
              >
                      Copy
              </button>
              <button
                onClick={() => {
                  setCurrentStage('practice-pitch')
                }}
                disabled={isProcessing || isSpeaking}
                      className="py-3 md:py-4 bg-black text-white rounded-full uppercase tracking-wide text-sm md:text-base"
                    >
                      Practice
              </button>
            </div>
          </div>
        )}

              </div>
          </motion.div>
        </AnimatePresence>
            </div>

      {/* 音頻播放確認模態對話框 */}
      {showAudioModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 md:p-8">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md md:max-w-lg w-full p-6 md:p-8">
            <div className="text-center">
              <div className="mb-4">
                <svg className="w-16 h-16 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </div>

              <h3 className="text-xl md:text-2xl font-semibold text-gray-800 mb-4">
                {pendingAudioUrl ? '音頻播放確認 / Audio Playback Confirmation' : '通知 / Notification'}
              </h3>
              
              <p className="text-gray-600 mb-6 leading-relaxed text-sm md:text-base">
                {pendingAudioText || '請點擊「確定」以播放語音回覆 / Please click "OK" to play audio'}
              </p>
              
              <div className="flex space-x-4 justify-center">
              <button
                onClick={() => {
                    setShowAudioModal(false)
                    setPendingAudioUrl(null)
                    setPendingAudioText('')
                    // 如果用戶取消，也要重置音頻狀態
                    setIsSpeaking(false)
                    setCurrentSubtitle('')
                    // 調用 resolve 函數以完成 Promise
                    if (pendingAudioResolveRef.current) {
                      pendingAudioResolveRef.current()
                      pendingAudioResolveRef.current = null
                    }
                  }}
                  className="px-6 py-3 md:px-8 md:py-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium text-sm md:text-base"
                >
                  取消 / Cancel
              </button>
              <button
                  onClick={confirmAudioPlay}
                  className="px-6 py-3 md:px-8 md:py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm md:text-base"
                >
                  確定 / OK
              </button>
            </div>
              </div>
            </div>
              </div>
      )}
    </>
  )
}

