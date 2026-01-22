
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { 
    MicrophoneIcon, 
    XCircleIcon, 
    ClipboardListIcon, 
    TrashIcon, 
    CheckCircleIcon, 
    InformationCircleIcon, 
    SparklesIcon,
    RefreshIcon
} from './Icons';
import Spinner from './Spinner';

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
  const [isRefining, setIsRefining] = useState(false);

  // Refs para control de flujo
  const isListeningRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Fuente de verdad: Un Mapa que vincula Índice -> Texto Finalizado
  // Esto evita el "HOLA HOLA HOLA" porque el índice 1 siempre será el mismo hueco en el mapa
  const sessionResultsMap = useRef<Map<number, string>>(new Map());
  const historyTranscript = useRef<string>('');

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setIsSupported(false);
      setError("Navegador no compatible con dictado nativo.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true; 
    recognition.interimResults = true; 
    recognition.lang = 'es-ES'; 

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      
      // Procesamos TODOS los resultados actuales desde el inicio de esta ráfaga
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        const text = result[0].transcript;
        
        if (result.isFinal) {
          // Guardamos en el mapa por índice. 
          // Si el navegador repite el índice i, simplemente se sobrescribe, NO SE SUMA.
          sessionResultsMap.current.set(i, text.trim());
        } else {
          interim = text;
        }
      }

      // Construimos el texto de la sesión actual uniendo las piezas del mapa
      const sessionFinalText = Array.from(sessionResultsMap.current.values()).join(' ');
      
      // El resultado final es el historial acumulado + lo nuevo de esta sesión
      const fullText = (historyTranscript.current + ' ' + sessionFinalText).trim();
      
      setTranscript(fullText);
      setInterimTranscript(interim);
      
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        setError("Acceso al micrófono bloqueado.");
        isListeningRef.current = false;
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Al terminar una ráfaga, consolidamos el mapa en el historial y limpiamos
      if (sessionResultsMap.current.size > 0) {
          const sessionText = Array.from(sessionResultsMap.current.values()).join(' ');
          historyTranscript.current = (historyTranscript.current + ' ' + sessionText).trim();
          sessionResultsMap.current.clear();
      }

      if (isListeningRef.current) {
         try {
             recognition.start();
         } catch (e) {
             setIsListening(false);
         }
      } else {
         setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (isListeningRef.current) {
      isListeningRef.current = false;
      recognitionRef.current?.stop();
    } else {
      isListeningRef.current = true;
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        isListeningRef.current = false;
      }
    }
  };

  const handleRefineWithAI = async () => {
    if (!transcript || isRefining) return;
    
    setIsRefining(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Eres un editor experto. Toma la siguiente transcripción de voz (que puede tener palabras repetidas, falta de puntuación o errores de audio) y límpiala para que sea un texto profesional, coherente y fluido. NO añadas información que no esté allí, solo corrige y formatea. Texto: "${transcript}"`,
        });

        if (response.text) {
            const refined = response.text.trim();
            setTranscript(refined);
            historyTranscript.current = refined;
            sessionResultsMap.current.clear();
        }
    } catch (err) {
        console.error("AI Refine error", err);
        setError("No se pudo conectar con el motor de IA para pulir el texto.");
    } finally {
        setIsRefining(false);
    }
  };

  const handleClear = () => {
    if (window.confirm("¿Vaciar registro?")) {
        historyTranscript.current = '';
        sessionResultsMap.current.clear();
        setTranscript('');
        setInterimTranscript('');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-light-card dark:bg-dark-card p-6 rounded-lg border border-light-border dark:border-dark-border shadow-md">
        <div>
            <h1 className="text-3xl font-bold flex items-center gap-3 text-light-text dark:text-dark-text">
                <div className={`p-2 rounded-lg ${isListening ? 'bg-red-500 animate-pulse' : 'bg-slate-200 dark:bg-slate-800'}`}>
                    <MicrophoneIcon className={`h-6 w-6 ${isListening ? 'text-white' : 'text-slate-500'}`} />
                </div>
                Bitácora de Voz
            </h1>
            <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1 font-mono text-[10px] uppercase tracking-[0.2em]">
                Engine: Indexed-Buffer STT v3.0
            </p>
        </div>
        
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
            {transcript && (
                <button
                    onClick={handleRefineWithAI}
                    disabled={isRefining || isListening}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-md text-sm font-bold shadow-lg hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 transition-all"
                >
                    {isRefining ? <RefreshIcon className="h-4 w-4 animate-spin" /> : <SparklesIcon className="h-4 w-4" />}
                    {isRefining ? 'PROCESANDO...' : 'PULIR CON IA'}
                </button>
            )}
            <button
                onClick={toggleListening}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-md font-black transition-all uppercase tracking-widest text-xs border-2 ${
                    isListening 
                    ? 'bg-red-500/10 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
                    : 'bg-brand-primary border-brand-primary text-white hover:bg-brand-secondary'
                }`}
            >
                {isListening ? 'DETENER' : 'GRABAR'}
            </button>
        </div>
      </div>

      <div className="flex-1 bg-[#050b14] rounded-xl border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col font-mono group">
        <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.03] bg-[radial-gradient(#3b82f6_1px,transparent_1px)] bg-[size:20px_20px]"></div>
        
        <div className="bg-slate-900/80 backdrop-blur-sm px-4 py-2 border-b border-slate-800 flex justify-between items-center text-[9px] text-slate-500 font-bold tracking-widest z-20">
            <span className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-red-500 animate-ping' : 'bg-slate-700'}`}></div>
                VOICE_STREAM_BUFFER_DATA
            </span>
            <span className={isListening ? 'text-green-500' : 'text-slate-600'}>
                {isListening ? 'RECEPCIÓN ACTIVA' : 'SISTEMA EN ESPERA'}
            </span>
        </div>

        <div ref={scrollRef} className="flex-1 p-8 overflow-y-auto custom-scrollbar relative z-0">
            {transcript || interimTranscript ? (
                <div className="text-blue-100 text-xl leading-relaxed whitespace-pre-wrap max-w-4xl mx-auto">
                    {transcript}
                    {interimTranscript && <span className="text-blue-500/50 italic ml-2"> {interimTranscript}...</span>}
                    <span className="inline-block w-3 h-6 bg-blue-500 ml-2 animate-pulse align-middle"></span>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-700">
                    <MicrophoneIcon className="h-20 w-20 mb-4 opacity-5" />
                    <p className="text-xs font-black uppercase tracking-[0.3em] opacity-20">Esperando señal de audio...</p>
                </div>
            )}
        </div>

        <div className="bg-slate-900/80 backdrop-blur-sm p-4 border-t border-slate-800 flex justify-between items-center z-20">
            <div className="flex gap-2">
                <button 
                    onClick={() => {
                        navigator.clipboard.writeText(transcript);
                        setCopySuccess(true);
                        setTimeout(() => setCopySuccess(false), 2000);
                    }}
                    disabled={!transcript}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 disabled:opacity-30 text-[10px] font-black uppercase transition-all border border-slate-700"
                >
                    {copySuccess ? <CheckCircleIcon className="h-4 w-4 text-green-500"/> : <ClipboardListIcon className="h-4 w-4"/>}
                    {copySuccess ? 'COPIADO' : 'COPIAR REGISTRO'}
                </button>
            </div>
            <button 
                onClick={handleClear}
                className="flex items-center gap-2 px-4 py-2 text-red-500/50 hover:text-red-500 text-[10px] font-black uppercase transition-colors"
            >
                <TrashIcon className="h-4 w-4"/>
                PURGAR PANTALLA
            </button>
        </div>
      </div>
      
      {error && (
          <div className="bg-red-500/10 text-red-500 px-4 py-3 rounded-lg border border-red-500/20 text-xs font-bold uppercase flex items-center shadow-lg">
              <InformationCircleIcon className="h-4 w-4 mr-2" />
              SYSTEM_ALERT: {error}
          </div>
      )}
    </div>
  );
};

export default VoiceLogView;
