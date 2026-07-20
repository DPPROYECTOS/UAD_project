import React, { useState, useEffect, useRef } from 'react';
// FIX: Removed non-exported 'LiveSession' type from import.
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAI_Blob } from '@google/genai';
import { XIcon, SparklesIcon, UserCircleIcon } from './Icons';
import Spinner from './Spinner';

interface LiveAssistantProps {
  onClose: () => void;
  geminiApiKey: string | null;
}

type Transcription = {
  role: 'user' | 'model';
  text: string;
};

type SessionStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

// --- Audio Encoding & Decoding Functions (from guidelines) ---
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): GenAI_Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const LiveAssistant: React.FC<LiveAssistantProps> = ({ onClose, geminiApiKey }) => {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [transcriptionHistory, setTranscriptionHistory] = useState<Transcription[]>([]);

  // FIX: Changed 'LiveSession' to 'any' as it is not an exported type.
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const transcriptionContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptionContainerRef.current?.scrollTo({ top: transcriptionContainerRef.current.scrollHeight, behavior: 'smooth' });
  }, [transcriptionHistory]);

  const cleanup = () => {
    console.log('Cleaning up Live Assistant resources...');
    if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => session.close());
        sessionPromiseRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if(mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
        outputAudioContextRef.current.close();
        outputAudioContextRef.current = null;
    }
    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();
  };
  
  const handleClose = () => {
    cleanup();
    onClose();
  };

  useEffect(() => {
    const startSession = async () => {
      if (!geminiApiKey) {
        setError('La clave API de Gemini no está configurada.');
        setStatus('error');
        return;
      }

      setStatus('connecting');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

        sessionPromiseRef.current = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          callbacks: {
            onopen: () => {
              setStatus('listening');
              const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
              mediaStreamSourceRef.current = source;
              const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
              scriptProcessorRef.current = scriptProcessor;

              scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                sessionPromiseRef.current?.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              };
              source.connect(scriptProcessor);
              scriptProcessor.connect(inputAudioContextRef.current!.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
              if (message.serverContent?.outputTranscription) {
                currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                setTranscriptionHistory(prev => {
                    const last = prev[prev.length - 1];
                    if(last?.role === 'model') {
                        return [...prev.slice(0, -1), {role: 'model', text: currentOutputTranscriptionRef.current}];
                    }
                    return [...prev, {role: 'model', text: currentOutputTranscriptionRef.current}];
                });
              }
              if (message.serverContent?.inputTranscription) {
                currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
                setTranscriptionHistory(prev => {
                    const last = prev[prev.length - 1];
                    if(last?.role === 'user') {
                        return [...prev.slice(0, -1), {role: 'user', text: currentInputTranscriptionRef.current}];
                    }
                    return [...prev, {role: 'user', text: currentInputTranscriptionRef.current}];
                });
              }

              if (message.serverContent?.turnComplete) {
                currentInputTranscriptionRef.current = '';
                currentOutputTranscriptionRef.current = '';
              }
              
              const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (base64Audio && outputAudioContextRef.current) {
                setStatus('speaking');
                const outputCtx = outputAudioContextRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                const source = outputCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputCtx.destination);
                source.addEventListener('ended', () => {
                    audioSourcesRef.current.delete(source);
                    if(audioSourcesRef.current.size === 0) {
                        setStatus('listening');
                    }
                });
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                audioSourcesRef.current.add(source);
              }

              if (message.serverContent?.interrupted) {
                audioSourcesRef.current.forEach(source => source.stop());
                audioSourcesRef.current.clear();
                nextStartTimeRef.current = 0;
              }
            },
            onerror: (e: ErrorEvent) => {
              console.error('Live session error:', e);
              setError(`Error de conexión: ${e.message}`);
              setStatus('error');
              cleanup();
            },
            onclose: (e: CloseEvent) => {
              console.log('Live session closed');
              setStatus('idle');
              cleanup();
              onClose(); // Auto-close on successful session end
            },
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
            systemInstruction: 'Eres un asistente de IA conversacional para una aplicación de gestión de proyectos. Sé conciso, amigable y servicial. Hablas español.',
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        });
      } catch (err) {
        console.error('Failed to start session:', err);
        setError(err instanceof Error && err.name === 'NotAllowedError' ? 'Se necesita permiso para el micrófono.' : 'No se pudo iniciar la sesión de audio.');
        setStatus('error');
      }
    };
    startSession();
    return () => cleanup();
  }, [geminiApiKey]);

  const statusInfo = {
    idle: { text: "Iniciando...", icon: <Spinner/> },
    connecting: { text: "Conectando...", icon: <Spinner/> },
    listening: { text: "Escuchando...", icon: <SparklesIcon className="text-green-500 animate-pulse" /> },
    speaking: { text: "Hablando...", icon: <SparklesIcon className="text-blue-500 animate-pulse" /> },
    error: { text: "Error", icon: <XIcon className="text-red-500"/> },
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center animate-fade-in" style={{ animationDuration: '0.3s' }}>
      <div className="bg-light-card dark:bg-dark-card rounded-lg shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col">
        <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-light-border dark:border-dark-border">
          <h2 className="text-lg font-bold flex items-center gap-2"><SparklesIcon className="text-brand-primary"/>Asistente de Voz Gemini</h2>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-light-bg dark:hover:bg-dark-bg"><XIcon /></button>
        </header>
        
        <main ref={transcriptionContainerRef} className="flex-1 p-6 space-y-4 overflow-y-auto">
          {transcriptionHistory.map((item, index) => (
            <div key={index} className={`flex items-start gap-3 ${item.role === 'user' ? 'justify-end' : ''}`}>
              {item.role === 'model' && <div className="flex-shrink-0 h-8 w-8 rounded-full bg-brand-primary/20 flex items-center justify-center"><SparklesIcon className="h-5 w-5 text-brand-primary" /></div>}
              <p className={`max-w-lg p-3 rounded-xl ${item.role === 'user' ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-light-bg dark:bg-dark-bg'}`}>{item.text}</p>
              {item.role === 'user' && <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"><UserCircleIcon className="h-5 w-5 text-gray-500 dark:text-gray-400"/></div>}
            </div>
          ))}
        </main>

        <footer className="flex-shrink-0 p-4 border-t border-light-border dark:border-dark-border">
            {error ? (
                 <div className="text-center text-red-600 dark:text-red-400">
                    <p className="font-semibold">Ocurrió un Error</p>
                    <p className="text-sm">{error}</p>
                 </div>
            ) : (
                <div className="flex items-center justify-center gap-2">
                    {statusInfo[status].icon}
                    <span className="font-medium text-light-text-secondary dark:text-dark-text-secondary">{statusInfo[status].text}</span>
                </div>
            )}
        </footer>
      </div>
    </div>
  );
};

export default LiveAssistant;