import { useState, useRef, useEffect } from "react";
import {
  Camera,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type PitchStep =
  | "home"
  | "upload"
  | "ai-intro"
  | "free-description"
  | "questions"
  | "confirm-focus"
  | "voice-practice"
  | "view-scores"
  | "view-notes"
  | "final-options";

interface DialogItem {
  type: "ai" | "user";
  text: string;
  timestamp: Date;
}

export default function App() {
  const [currentStep, setCurrentStep] =
    useState<PitchStep>("home");
  const [uploadedImages, setUploadedImages] = useState<
    string[]
  >([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  const [dialogHistory, setDialogHistory] = useState<
    DialogItem[]
  >([]);
  const [pitchScore, setPitchScore] = useState<number | null>(
    null,
  );
  const [keywordNotes, setKeywordNotes] = useState<string[]>(
    [],
  );
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [micPermission, setMicPermission] = useState<
    "granted" | "denied" | "prompt"
  >("prompt");
  const [showPermissionError, setShowPermissionError] =
    useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(
    null,
  );
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (
      "webkitSpeechRecognition" in window ||
      "SpeechRecognition" in window
    ) {
      const SpeechRecognition =
        (window as any).webkitSpeechRecognition ||
        (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (
          let i = event.resultIndex;
          i < event.results.length;
          i++
        ) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " ";
          } else {
            interimTranscript += transcript;
          }
        }

        setCurrentSubtitle(finalTranscript + interimTranscript);

        if (finalTranscript) {
          setDialogHistory((prev) => [
            ...prev,
            {
              type: "user",
              text: finalTranscript.trim(),
              timestamp: new Date(),
            },
          ]);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);

        if (event.error === "not-allowed") {
          setMicPermission("denied");
          setShowPermissionError(true);
          setCurrentSubtitle(
            "Microphone access denied. Please enable microphone permission in your browser settings.",
          );
        } else if (event.error === "no-speech") {
          setCurrentSubtitle(
            "No speech detected. Try speaking again.",
          );
        } else {
          setCurrentSubtitle(`Error: ${event.error}`);
        }
      };
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, []);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);

        // Simulate audio level animation
        if (analyserRef.current) {
          const dataArray = new Uint8Array(
            analyserRef.current.frequencyBinCount,
          );
          analyserRef.current.getByteFrequencyData(dataArray);
          const average =
            dataArray.reduce((a, b) => a + b) /
            dataArray.length;
          setAudioLevel(average / 255);
        } else {
          setAudioLevel(Math.random() * 0.8 + 0.2);
        }
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setRecordingTime(0);
      setAudioLevel(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (files) {
      const imageUrls = Array.from(files).map((file) =>
        URL.createObjectURL(file),
      );
      setUploadedImages((prev) => [...prev, ...imageUrls]);
    }
  };

  const handleStartPitch = () => {
    setCurrentStep("ai-intro");
    speakAI(
      "Hello! I can see your design work. It looks interesting! Could you think out loud and tell me what this project is about?",
    );
  };

  const speakAI = (text: string) => {
    setIsSpeaking(true);
    setCurrentSubtitle(text);

    // Add to dialog history
    setDialogHistory((prev) => [
      ...prev,
      {
        type: "ai",
        text,
        timestamp: new Date(),
      },
    ]);

    // Use setTimeout to move to next step (in case speech synthesis doesn't work)
    const moveToNextStep = () => {
      setIsSpeaking(false);
      setTimeout(() => {
        if (currentStep === "ai-intro") {
          setCurrentStep("free-description");
          setCurrentSubtitle("");
        } else if (currentStep === "questions") {
          // Stay in questions step
        }
      }, 500);
    };

    // Try to use speech synthesis
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.9;

      utterance.onend = moveToNextStep;
      utterance.onerror = moveToNextStep;

      synthesisRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } else {
      // If speech synthesis not available, just wait 3 seconds
      setTimeout(moveToNextStep, 3000);
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      mediaStreamRef.current = stream;

      // Initialize Audio Context for visualization
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      analyserRef.current =
        audioContextRef.current.createAnalyser();
      const source =
        audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      setMicPermission("granted");
      setShowPermissionError(false);
      setCurrentSubtitle(
        "Microphone ready! Tap the button to start recording.",
      );
      return true;
    } catch (err) {
      console.error("Microphone permission error:", err);
      setMicPermission("denied");
      setShowPermissionError(true);
      setCurrentSubtitle(
        "Please allow microphone access to use voice recording.",
      );
      return false;
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      setCurrentSubtitle("");
      setRecordingTime(0);

      // Simulate AI response based on step
      setTimeout(() => {
        if (currentStep === "free-description") {
          setCurrentStep("questions");
          speakAI(
            "Great! Can you tell me more about the design process? What was the main challenge you tried to solve?",
          );
        } else if (currentStep === "questions") {
          // Could ask more questions or move to confirm
          setTimeout(() => {
            setCurrentStep("confirm-focus");
          }, 1000);
        } else if (currentStep === "voice-practice") {
          // Generate score
          const score = Math.floor(Math.random() * 20) + 80;
          setPitchScore(score);
          setCurrentStep("view-scores");
        }
      }, 1000);
    } else {
      // Check if we have microphone permission first
      if (micPermission !== "granted") {
        const granted = await requestMicrophonePermission();
        if (!granted) return;
      }

      try {
        recognitionRef.current?.start();
        setIsRecording(true);
        setRecordingTime(0);
        setShowPermissionError(false);
      } catch (err) {
        console.error("Failed to start recording:", err);
        setCurrentSubtitle(
          "Failed to start recording. Please try again.",
        );
      }
    }
  };

  const handleConfirmGenerate = () => {
    setCurrentSubtitle(
      "Generating your 3-minute pitch structure...",
    );
    setKeywordNotes([
      "Problem Statement: User needs for...",
      "Design Process: Research → Ideation → Prototype",
      "Key Features: Feature A, Feature B, Feature C",
      "User Impact: Improved efficiency by 40%",
      "Technical Approach: Technology stack used",
      "Future Vision: Next steps and improvements",
    ]);
    setTimeout(() => {
      setCurrentStep("voice-practice");
      setCurrentSubtitle(
        "Now, practice your complete 3-minute pitch!",
      );
    }, 2000);
  };

  const handleGenerateCheatSheet = () => {
    setCurrentStep("view-notes");
  };

  const handleCopyNotes = () => {
    const notesText = keywordNotes.join("\n");
    navigator.clipboard.writeText(notesText);
    setCurrentSubtitle("Notes copied to clipboard!");
    setTimeout(() => setCurrentSubtitle(""), 2000);
  };

  const handlePracticeAgain = () => {
    setCurrentStep("voice-practice");
    setCurrentSubtitle("");
  };

  const handleRestart = () => {
    setCurrentStep("home");
    setUploadedImages([]);
    setDialogHistory([]);
    setPitchScore(null);
    setKeywordNotes([]);
    setCurrentSubtitle("");
    setRecordingTime(0);
  };

  const handleStartFromHome = () => {
    setCurrentStep("upload");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getStepColor = () => {
    const colorMap: Record<PitchStep, string> = {
      home: "from-black to-black",
      upload: "from-slate-100 to-slate-200",
      "ai-intro": "from-blue-400 to-blue-500",
      "free-description": "from-orange-400 to-orange-500",
      questions: "from-yellow-400 to-yellow-500",
      "confirm-focus": "from-green-400 to-green-500",
      "voice-practice": "from-purple-400 to-purple-500",
      "view-scores": "from-pink-400 to-pink-500",
      "view-notes": "from-indigo-400 to-indigo-500",
      "final-options": "from-teal-400 to-teal-500",
    };
    return colorMap[currentStep];
  };

  const getStepTitle = () => {
    const titleMap: Record<PitchStep, string> = {
      home: "Pitch Coach",
      upload: "Upload Work",
      "ai-intro": "AI Intro",
      "free-description": "Free Share",
      questions: "Q&A Time",
      "confirm-focus": "Confirm Focus",
      "voice-practice": "Voice Practice",
      "view-scores": "Your Score",
      "view-notes": "Pitch Notes",
      "final-options": "Next Step",
    };
    return titleMap[currentStep];
  };

  const getStepNumber = () => {
    const stepMap: Record<PitchStep, number> = {
      home: 0,
      upload: 1,
      "ai-intro": 1,
      "free-description": 2,
      questions: 3,
      "confirm-focus": 4,
      "voice-practice": 5,
      "view-scores": 6,
      "view-notes": 7,
      "final-options": 8,
    };
    return stepMap[currentStep];
  };

  const renderActionButtons = () => {
    switch (currentStep) {
      case "upload":
        return uploadedImages.length > 0 ? (
          <Button
            onClick={handleStartPitch}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700"
          >
            開始練習 Pitch / Start Practice Pitch
          </Button>
        ) : null;

      case "ai-intro":
        return (
          <Button disabled size="lg" className="opacity-50">
            <Volume2 className="mr-2 h-5 w-5 animate-pulse" />
            AI 正在說話... / AI Speaking...
          </Button>
        );

      case "free-description":
        return (
          <Button
            onClick={toggleRecording}
            size="lg"
            className={
              isRecording
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-600 hover:bg-green-700"
            }
          >
            {isRecording ? (
              <>
                <MicOff className="mr-2 h-5 w-5" />
                停止錄音 / Stop Recording
              </>
            ) : (
              <>
                <Mic className="mr-2 h-5 w-5" />
                自由分享 / Free Description
              </>
            )}
          </Button>
        );

      case "questions":
        return (
          <Button
            onClick={toggleRecording}
            size="lg"
            className={
              isRecording
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-600 hover:bg-green-700"
            }
          >
            {isRecording ? (
              <>
                <MicOff className="mr-2 h-5 w-5" />
                停止回答 / Stop Answer
              </>
            ) : (
              <>
                <Mic className="mr-2 h-5 w-5" />
                回答問題 / Answer Questions
              </>
            )}
          </Button>
        );

      case "confirm-focus":
        return (
          <Button
            onClick={handleConfirmGenerate}
            size="lg"
            className="bg-purple-600 hover:bg-purple-700"
          >
            確認生成 3 分鐘 Pitch / Confirm Generate 3-min Pitch
          </Button>
        );

      case "voice-practice":
        return (
          <Button
            onClick={toggleRecording}
            size="lg"
            className={
              isRecording
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-600 hover:bg-green-700"
            }
          >
            {isRecording ? (
              <>
                <MicOff className="mr-2 h-5 w-5" />
                停止練習 / Stop Practice
              </>
            ) : (
              <>
                <Mic className="mr-2 h-5 w-5" />
                語音練習 Pitch / Voice Practice Pitch
              </>
            )}
          </Button>
        );

      case "view-scores":
        return (
          <Button
            onClick={handleGenerateCheatSheet}
            size="lg"
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            生成 Pitch 小抄 / Generate Pitch Cheat Sheet
          </Button>
        );

      case "view-notes":
        return (
          <div className="flex flex-wrap gap-3 justify-center">
            <Button
              onClick={handleCopyNotes}
              size="lg"
              variant="outline"
            >
              📋 複製筆記 / Copy Notes
            </Button>
            <Button
              onClick={handlePracticeAgain}
              size="lg"
              className="bg-green-600 hover:bg-green-700"
            >
              🔄 再次練習 / Practice Again
            </Button>
            <Button
              onClick={handleRestart}
              size="lg"
              variant="outline"
            >
              🔄 重新開始 / Restart
            </Button>
          </div>
        );

      case "final-options":
        return (
          <div className="flex flex-wrap gap-3 justify-center">
            <Button
              onClick={handleCopyNotes}
              size="lg"
              variant="outline"
            >
              複製筆記 / Copy Notes
            </Button>
            <Button
              onClick={handlePracticeAgain}
              size="lg"
              className="bg-green-600"
            >
              再次練習 Pitch / Practice Pitch Again
            </Button>
            <Button
              onClick={handleRestart}
              size="lg"
              variant="outline"
            >
              重新上傳新作品 / Upload New Work
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepBadge = () => {
    const stepMap: Record<PitchStep, string> = {
      home: "Welcome",
      upload: "步驟 1",
      "ai-intro": "步驟 1",
      "free-description": "步驟 2",
      questions: "步驟 3",
      "confirm-focus": "步驟 4",
      "voice-practice": "步驟 5",
      "view-scores": "步驟 6",
      "view-notes": "步驟 7",
      "final-options": "步驟 8",
    };
    return stepMap[currentStep];
  };

  const getProgress = () => {
    const stepProgress: Record<PitchStep, number> = {
      home: 0,
      upload: 0,
      "ai-intro": 12,
      "free-description": 25,
      questions: 37,
      "confirm-focus": 50,
      "voice-practice": 62,
      "view-scores": 75,
      "view-notes": 87,
      "final-options": 100,
    };
    return stepProgress[currentStep];
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Phone Frame */}
      <div className="relative w-full max-w-[430px] h-[932px] bg-black rounded-[60px] shadow-2xl overflow-hidden border-[14px] border-black">
        {/* Phone Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150px] h-[30px] bg-black rounded-b-3xl z-50"></div>

        {/* Status Bar */}
        <div className="absolute top-0 left-0 right-0 h-[44px] px-6 flex items-center justify-between z-40 text-xs">
          <span className="text-black/70">9:41</span>
          <div className="flex items-center gap-1">
            <span className="text-black/70">100%</span>
          </div>
        </div>

        {/* Content Area with Animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`w-full h-full bg-gradient-to-br ${getStepColor()} pt-[44px]`}
          >
            {/* Header */}
            {currentStep !== "home" && (
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl text-black">
                      {getStepTitle()}
                    </h1>
                    <p className="text-sm text-black/60">
                      Step {getStepNumber()}/8
                    </p>
                  </div>
                  <button className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center">
                    <ChevronRight className="w-5 h-5 text-black" />
                  </button>
                </div>
              </div>
            )}

            {/* Main Content */}
            <div className="px-6 flex-1 flex flex-col justify-between pb-8">
              {/* Home/Landing Page */}
              {currentStep === "home" && (
                <div className="flex-1 flex flex-col justify-between pt-16 pb-12">
                  <div className="flex-1 flex flex-col justify-between">
                    {/* Title Section */}
                    <div className="space-y-3">
                      <h1 className="text-5xl text-white uppercase leading-tight tracking-tight">
                        3-MINUTE
                        <br />
                        DESIGN
                        <br />
                        PITCH
                      </h1>
                      <p className="text-xl text-white/50 uppercase tracking-wide">
                        COACH
                      </p>
                    </div>

                    {/* Dot Pattern Visualization */}
                    <div className="flex items-center justify-center py-8">
                      <div className="grid grid-cols-12 gap-2">
                        {Array.from({ length: 144 }).map((_, i) => {
                          const row = Math.floor(i / 12);
                          const col = i % 12;
                          const distance = Math.sqrt(
                            Math.pow(col - 5.5, 2) + Math.pow(row - 5.5, 2)
                          );
                          const isInCircle = distance < 5.5;
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
                          );
                        })}
                      </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-8 bg-white"></div>
                          <div>
                            <p className="text-sm text-white/60 uppercase tracking-wide">
                              01
                            </p>
                            <p className="text-white">
                              Upload Design Work
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-8 bg-white"></div>
                          <div>
                            <p className="text-sm text-white/60 uppercase tracking-wide">
                              02
                            </p>
                            <p className="text-white">
                              Practice with AI Coach
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-8 bg-white"></div>
                          <div>
                            <p className="text-sm text-white/60 uppercase tracking-wide">
                              03
                            </p>
                            <p className="text-white">
                              Generate Pitch Notes
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Start Button */}
                  <motion.button
                    onClick={handleStartFromHome}
                    className="w-full py-5 bg-white text-black rounded-none text-lg uppercase tracking-widest border-4 border-white hover:bg-white/90 transition-colors"
                    whileTap={{ scale: 0.98 }}
                  >
                    START
                  </motion.button>
                </div>
              )}

              {/* Upload Step */}
              {currentStep === "upload" && (
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
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      className="w-48 h-48 rounded-full bg-black/10 flex items-center justify-center backdrop-blur-sm hover:bg-black/20 transition-all"
                    >
                      <Camera className="w-24 h-24 text-black/40" />
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
                      onClick={handleStartPitch}
                      className="w-full py-4 bg-black text-white rounded-full text-lg uppercase tracking-wide"
                    >
                      Start Practice
                    </button>
                  )}
                </div>
              )}

              {/* Recording Steps */}
              {(currentStep === "ai-intro" ||
                currentStep === "free-description" ||
                currentStep === "questions" ||
                currentStep === "voice-practice") && (
                <div className="flex-1 flex flex-col items-center justify-between">
                  {/* Visual Indicator */}
                  <div className="flex-1 flex items-center justify-center relative">
                    <div className="relative w-64 h-64">
                      {/* Outer ring */}
                      <div className="absolute inset-0 rounded-full bg-black/10"></div>

                      {/* Dot pattern */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        {currentStep === "ai-intro" &&
                        isSpeaking ? (
                          <div className="text-center">
                            <motion.div
                              className="text-4xl text-black uppercase tracking-wider"
                              animate={{
                                opacity: [0.4, 1, 0.4],
                              }}
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                              }}
                            >
                              AI
                            </motion.div>
                            <p className="text-sm text-black/60 mt-2">SPEAKING</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-8 gap-2">
                            {Array.from({ length: 64 }).map(
                              (_, i) => {
                                const distance = Math.sqrt(
                                  Math.pow((i % 8) - 3.5, 2) +
                                    Math.pow(
                                      Math.floor(i / 8) - 3.5,
                                      2,
                                    ),
                                );
                                const isInside = distance < 4;
                                const scale = isRecording
                                  ? 1 +
                                    audioLevel *
                                      0.5 *
                                      Math.random()
                                  : 1;
                                return isInside ? (
                                  <motion.div
                                    key={i}
                                    className="w-2 h-2 rounded-full bg-black"
                                    animate={{
                                      scale: isRecording
                                        ? [1, scale, 1]
                                        : 1,
                                      opacity: isRecording
                                        ? [0.4, 1, 0.4]
                                        : 0.8,
                                    }}
                                    transition={{
                                      duration: 0.5,
                                      repeat: isRecording
                                        ? Infinity
                                        : 0,
                                      delay: i * 0.02,
                                    }}
                                  />
                                ) : (
                                  <div
                                    key={i}
                                    className="w-2 h-2"
                                  />
                                );
                              },
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Timer */}
                  <div className="text-center mb-4">
                    <div className="text-4xl text-black">
                      {formatTime(recordingTime)}
                    </div>
                    {isRecording && (
                      <div className="text-sm text-black/60 mt-1">
                        Recording...
                      </div>
                    )}
                    {currentStep === "ai-intro" &&
                      isSpeaking && (
                        <div className="text-sm text-black/60 mt-1">
                          AI is speaking...
                        </div>
                      )}
                  </div>

                  {/* Subtitle Area */}
                  <div className="w-full min-h-[80px] bg-black/10 rounded-3xl p-4 mb-6">
                    <p className="text-center text-black/80 text-sm leading-relaxed">
                      {currentSubtitle ||
                        "Tap to start speaking..."}
                    </p>
                    {showPermissionError && (
                      <div className="mt-2 text-center">
                        <button
                          onClick={requestMicrophonePermission}
                          className="text-xs bg-black/20 px-3 py-1 rounded-full hover:bg-black/30"
                        >
                          Request Permission
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="w-full flex flex-col items-center gap-3">
                    <button
                      onClick={
                        currentStep === "ai-intro"
                          ? undefined
                          : toggleRecording
                      }
                      disabled={currentStep === "ai-intro"}
                      className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${
                        isRecording
                          ? "bg-black text-white"
                          : currentStep === "ai-intro"
                            ? "bg-black/20 text-black/40 cursor-not-allowed"
                            : "bg-black text-white hover:scale-105"
                      }`}
                    >
                      <div className="w-16 h-16 rounded-full bg-white/20"></div>
                    </button>

                    {/* Skip button for AI Intro */}
                    {currentStep === "ai-intro" && (
                      <button
                        onClick={() => {
                          window.speechSynthesis.cancel();
                          setIsSpeaking(false);
                          setCurrentStep("free-description");
                          setCurrentSubtitle("");
                        }}
                        className="text-black/60 text-sm underline hover:text-black"
                      >
                        Skip & Continue
                      </button>
                    )}

                    {/* Microphone status indicator */}
                    {currentStep !== "ai-intro" &&
                      micPermission !== "granted" && (
                        <div className="text-xs text-black/50 text-center">
                          <p>Microphone permission needed</p>
                          <p>Tap button to enable</p>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* Confirm Focus Step */}
              {currentStep === "confirm-focus" && (
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center space-y-6">
                      <div className="w-24 h-24 mx-auto border-4 border-black rounded-full flex items-center justify-center">
                        <div className="w-12 h-12 bg-black rounded-full"></div>
                      </div>
                      <div>
                        <p className="text-sm text-black/60 uppercase tracking-wide mb-2">READY</p>
                        <p className="text-3xl text-black uppercase tracking-tight leading-tight">
                          GENERATE<br />3-MINUTE<br />PITCH
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmGenerate}
                    className="w-full py-4 bg-black text-white rounded-full text-lg uppercase tracking-wide"
                  >
                    Generate
                  </button>
                </div>
              )}

              {/* View Scores Step */}
              {currentStep === "view-scores" &&
                pitchScore !== null && (
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-8xl text-black mb-4">
                          {pitchScore}
                        </div>
                        <div className="w-48 h-2 bg-black/20 rounded-full mx-auto overflow-hidden">
                          <motion.div
                            className="h-full bg-black"
                            initial={{ width: 0 }}
                            animate={{
                              width: `${pitchScore}%`,
                            }}
                            transition={{
                              duration: 1,
                              delay: 0.5,
                            }}
                          />
                        </div>
                        <p className="mt-4 text-black/60">
                          Great work!
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleGenerateCheatSheet}
                      className="w-full py-4 bg-black text-white rounded-full text-lg uppercase tracking-wide"
                    >
                      View Notes
                    </button>
                  </div>
                )}

              {/* View Notes Step */}
              {currentStep === "view-notes" && (
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex-1 overflow-y-auto space-y-3">
                    {keywordNotes.map((note, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-black/10 rounded-2xl"
                      >
                        <p className="text-sm text-black">
                          {note}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button
                      onClick={handleCopyNotes}
                      className="py-3 bg-black/10 text-black rounded-full uppercase tracking-wide text-sm"
                    >
                      Copy
                    </button>
                    <button
                      onClick={handlePracticeAgain}
                      className="py-3 bg-black text-white rounded-full uppercase tracking-wide text-sm"
                    >
                      Practice
                    </button>
                  </div>
                </div>
              )}

              {/* Final Options Step */}
              {currentStep === "final-options" && (
                <div className="flex-1 flex flex-col justify-center gap-4">
                  <button
                    onClick={handleCopyNotes}
                    className="w-full py-4 bg-black/10 text-black rounded-full uppercase tracking-wide"
                  >
                    Copy Notes
                  </button>
                  <button
                    onClick={handlePracticeAgain}
                    className="w-full py-4 bg-black text-white rounded-full uppercase tracking-wide"
                  >
                    Practice Again
                  </button>
                  <button
                    onClick={handleRestart}
                    className="w-full py-4 bg-black/10 text-black rounded-full uppercase tracking-wide"
                  >
                    Upload New Work
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Home Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full"></div>
      </div>
    </div>
  );
}