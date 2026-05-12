import { useState, useRef } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";

interface VoiceSearchButtonProps {
  onTranscript: (text: string) => void;
}

const VoiceSearchButton = ({ onTranscript }: VoiceSearchButtonProps) => {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-NG"; // Nigerian English, supports Pidgin accent
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
      setListening(false);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  // Check if browser supports Speech Recognition
  const supported = !!(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={listening ? stopListening : startListening}
      className={`p-2 rounded-xl transition-all ${
        listening
          ? "bg-destructive/10 text-destructive animate-pulse"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/20"
      }`}
      title={listening ? "Stop listening" : "Voice search"}
    >
      {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </button>
  );
};

export default VoiceSearchButton;
