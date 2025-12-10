
import React, { useState, useEffect, useRef } from 'react';
import { MicrophoneIcon, XCircleIcon, ClipboardListIcon, TrashIcon, CheckCircleIcon, InformationCircleIcon } from './Icons';

// Augment window type for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const VoiceLogView: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  // Refs
  const isListeningRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Store the committed transcript to avoid dependency loops and duplication
  const transcriptRef = useRef(''); 

  useEffect(() => {
    // Check browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setIsSupported(false);
      setError("Tu navegador no soporta la API de reconocimiento de voz nativa (Web Speech API). Intenta usar Google Chrome.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true; // Keep listening even if the user pauses
    recognition.interimResults = true; // Show words as they are being spoken
    recognition.lang = 'es-ES'; // Set language to Spanish

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let newFinal = '';

      // Iterate through results
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          newFinal += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (newFinal) {
          // Append to ref source of truth
          transcriptRef.current += (transcriptRef.current ? ' ' : '') + capitalizeFirstLetter(newFinal.trim());
          setTranscript(transcriptRef.current);
      }
      setInterimTranscript(interim);
      
      // Auto-scroll to bottom
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      if (event.error === 'not-allowed') {
        setError("Permiso de micrófono denegado.");
        isListeningRef.current = false;
        setIsListening(false);
      } else if (event.error === 'no-speech') {
        // Ignore no-speech errors
      } else {
        if (event.error !== 'aborted') {
             setError(`Error: ${event.error}`);
        }
      }
    };

    recognition.onend = () => {
      // Logic: If the user intends to be listening (ref is true), but it stopped, restart it.
      if (isListeningRef.current) {
         try {
             recognition.start();
         } catch (e) {
             console.warn("Failed to restart recognition immediately", e);
             setIsListening(false);
             isListeningRef.current = false;
         }
      } else {
         setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      // Cleanup on unmount
      isListeningRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const capitalizeFirstLetter = (string: string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const toggleListening = () => {
    if (isListeningRef.current) {
      // Stop
      isListeningRef.current = false; // Update ref first to prevent auto-restart in onend
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      // Start
      isListeningRef.current = true;
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        setError(null);
      } catch (err) {
        console.warn("Recognition start failed or already started", err);
        isListeningRef.current = false;
        setIsListening(false);
      }
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(transcript);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleClear = () => {
    if (window.confirm("¿Borrar toda la bitácora actual?")) {
        // We need to abort to clear the recognition engine's internal buffer
        const wasListening = isListeningRef.current;
        isListeningRef.current = false; // Prevent immediate restart loop during abort
        
        recognitionRef.current?.abort();
        
        transcriptRef.current = '';
        setTranscript('');
        setInterimTranscript('');

        // Restart if it was listening
        if (wasListening) {
            setTimeout(() => {
                isListeningRef.current = true;
                try { recognitionRef.current?.start(); } catch(e) {}
            }, 100);
        }
    }
  };

  if (!isSupported) {
    return (
        <div className="flex items-center justify-center h-full text-red-500 bg-light-bg dark:bg-dark-bg p-8 rounded-lg border border-red-500/50">
            <XCircleIcon className="h-12 w-12 mr-4" />
            <div>
                <h2 className="text-xl font-bold">Navegador No Soportado</h2>
                <p>{error}</p>
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-4">
      {/* Header / Control Deck */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-light-card dark:bg-dark-card p-6 rounded-lg border border-light-border dark:border-dark-border shadow-md">
        <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
                <span className={`flex h-4 w-4 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></span>
                Bitácora de Voz
            </h1>
            <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1 font-mono text-sm">
                SISTEMA DE TRANSCRIPCIÓN NATIVO v1.0
            </p>
        </div>
        
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <button
                onClick={toggleListening}
                className={`flex items-center gap-2 px-6 py-3 rounded-md font-bold transition-all uppercase tracking-wider ${
                    isListening 
                    ? 'bg-red-500/10 text-red-500 border border-red-500 hover:bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
                    : 'bg-brand-primary text-white hover:bg-brand-secondary shadow-lg'
                }`}
            >
                <MicrophoneIcon className={`h-5 w-5 ${isListening ? 'animate-bounce' : ''}`} />
                {isListening ? 'DETENER GRABACIÓN' : 'INICIAR GRABACIÓN'}
            </button>
        </div>
      </div>

      {/* Terminal View */}
      <div className="flex-1 bg-black rounded-lg border border-gray-800 shadow-inner relative overflow-hidden flex flex-col font-mono">
        {/* Scanlines Effect */}
        <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.03]" 
             style={{ backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 2px, 3px 100%' }}>
        </div>
        
        {/* Top Bar Terminal */}
        <div className="bg-gray-900 px-4 py-2 border-b border-gray-800 flex justify-between items-center text-xs text-gray-500 select-none">
            <span>TERMINAL_OUTPUT_LOG.txt</span>
            <span className={isListening ? 'text-green-500' : 'text-gray-600'}>{isListening ? '● RECIBIENDO SEÑAL' : '○ EN ESPERA'}</span>
        </div>

        {/* Content Area */}
        <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto custom-scrollbar relative z-0">
            {transcript || interimTranscript ? (
                <p className="text-green-400 text-lg leading-relaxed whitespace-pre-wrap">
                    {transcript}
                    <span className="text-green-200/70">{interimTranscript}</span>
                    <span className="inline-block w-2.5 h-5 bg-green-500 ml-1 animate-pulse align-middle"></span>
                </p>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-700">
                    <MicrophoneIcon className="h-16 w-16 mb-4 opacity-20" />
                    <p>Inicia la grabación para comenzar a transcribir...</p>
                </div>
            )}
        </div>

        {/* Bottom Toolbar */}
        <div className="bg-gray-900 p-3 border-t border-gray-800 flex justify-end gap-3 z-20">
            <button 
                onClick={handleCopy} 
                disabled={!transcript}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 disabled:opacity-50 text-xs font-bold uppercase transition-colors"
            >
                {copySuccess ? <CheckCircleIcon className="h-4 w-4 text-green-500"/> : <ClipboardListIcon className="h-4 w-4"/>}
                {copySuccess ? 'Copiado' : 'Copiar Texto'}
            </button>
            <button 
                onClick={handleClear}
                className="flex items-center gap-2 px-4 py-2 bg-red-900/20 text-red-400 border border-red-900/50 rounded hover:bg-red-900/40 text-xs font-bold uppercase transition-colors"
            >
                <TrashIcon className="h-4 w-4"/>
                Limpiar
            </button>
        </div>
      </div>
      
      {error && (
          <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 rounded border border-red-200 dark:border-red-800 text-sm flex items-center">
              <InformationCircleIcon className="h-5 w-5 mr-2" />
              {error}
          </div>
      )}
    </div>
  );
};

export default VoiceLogView;
    