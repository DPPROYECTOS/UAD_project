import React, { useState, useRef, useEffect } from 'react';
import Spinner from './Spinner';
import { CheckCircleIcon, XCircleIcon } from './Icons';

declare const lamejs: any;

type RecordingStatus = 'idle' | 'recording' | 'paused';
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

/**
 * Converts a WebM audio Blob to MP3 format using lamejs.
 * @param {Blob} webmBlob - The recorded audio Blob in WebM format.
 * @returns {Promise<Blob>} A new Blob in MP3 format.
 */
const convertWebMToMp3 = async (webmBlob: Blob): Promise<Blob> => {
  const audioContext = new AudioContext();
  const arrayBuffer = await webmBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const pcmSamples = audioBuffer.getChannelData(0);

  const samples = new Int16Array(pcmSamples.length);
  for (let i = 0; i < pcmSamples.length; i++) {
    samples[i] = pcmSamples[i] * 32767;
  }

  const mp3Encoder = new lamejs.Mp3Encoder(1, audioBuffer.sampleRate, 128); // 1 channel, 128kbps
  const mp3Data = [];
  const sampleBlockSize = 1152;

  for (let i = 0; i < samples.length; i += sampleBlockSize) {
    const sampleChunk = samples.subarray(i, i + sampleBlockSize);
    const mp3buf = mp3Encoder.encodeBuffer(sampleChunk);
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }
  const mp3buf = mp3Encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(mp3buf);
  }

  return new Blob(mp3Data, { type: 'audio/mpeg' });
};

const LoginRecorder: React.FC = () => {
    // --- Recorder State (Self-Contained) ---
    const [isRecordingEnabled, setIsRecordingEnabled] = useState(false);
    const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
    const [uploadMessage, setUploadMessage] = useState('');

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    
    // --- Activation State ---
    const clickCountRef = useRef(0);
    const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // --- Recorder Logic ---
    const handleUpload = async () => {
        if (audioChunksRef.current.length === 0) {
            console.warn("No audio chunks to upload.");
            return;
        }

        setUploadStatus('uploading');
        setUploadMessage('Procesando y subiendo...');
        const audioBlobWebM = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        try {
            const mp3Blob = await convertWebMToMp3(audioBlobWebM);

            const base64String = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(mp3Blob);
                reader.onloadend = () => {
                    if (reader.result) {
                        resolve((reader.result as string).split(',')[1]);
                    } else {
                        reject(new Error("Failed to read blob as Base64."));
                    }
                };
                reader.onerror = (error) => reject(error);
            });

            const now = new Date();
            const date = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
            const time = `${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}-${now.getSeconds().toString().padStart(2, '0')}`;
            const recordingNumber = Date.now();
            const fileName = `GrabacionGenerica_${recordingNumber}_${date}_${time}.mp3`;
            
            const uploadUrl = 'https://script.google.com/macros/s/AKfycbzvxhlawPZkPIFf7TeAn3I5l38u6y4tee1MEvtaMbsb8V_xcVLofePoc4Dh80pLgxFM/exec';

            const response = await fetch(uploadUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    file: base64String,
                    fileName: fileName,
                    mimeType: 'audio/mpeg'
                })
            });

            if (!response.ok) throw new Error(`Error de red: ${response.statusText}`);

            const result = await response.json();
            
            if (result.status === 'success') {
                setUploadStatus('success');
                setUploadMessage('Grabación subida correctamente.');
            } else {
                throw new Error(result.error || 'Error desconocido en el servidor.');
            }
        } catch (err) {
            console.error("Upload or conversion failed:", err);
            setUploadStatus('error');
            setUploadMessage(err instanceof Error ? err.message : 'Fallo en la subida o conversión.');
        } finally {
            audioChunksRef.current = [];
        }
    };

    const startRecording = async () => {
        if (recordingStatus !== 'idle') return;
        setUploadStatus('idle');
        setUploadMessage('');
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];
            recorder.ondataavailable = (event) => audioChunksRef.current.push(event.data);
            recorder.onstop = handleUpload;
            recorder.start();
            setRecordingStatus('recording');
        } catch (err) {
            console.error("Error accessing microphone:", err);
            setUploadStatus('error');
            setUploadMessage('No se pudo acceder al micrófono.');
        }
    };

    const stopRecording = () => {
        if (!mediaRecorderRef.current || recordingStatus === 'idle') return;
        
        mediaRecorderRef.current.stop();
        
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        setRecordingStatus('idle');
    };

    const togglePauseResume = () => {
        if (!mediaRecorderRef.current) return;

        if (recordingStatus === 'recording') {
            mediaRecorderRef.current.pause();
            setRecordingStatus('paused');
        } else if (recordingStatus === 'paused') {
            mediaRecorderRef.current.resume();
            setRecordingStatus('recording');
        }
    };
    
    // --- Effects ---
    useEffect(() => {
        // Cleanup on disable
        if (!isRecordingEnabled && (recordingStatus !== 'idle' || mediaRecorderRef.current)) {
            stopRecording();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRecordingEnabled]);

    useEffect(() => {
        // Toast message timer
        if (uploadStatus === 'success' || uploadStatus === 'error') {
            const timer = setTimeout(() => {
                setUploadStatus('idle');
                setUploadMessage('');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [uploadStatus]);

    // --- Activation Logic ---
    const handleRecorderClick = () => {
        clickCountRef.current += 1;

        if (clickTimerRef.current) {
            clearTimeout(clickTimerRef.current);
        }

        if (isRecordingEnabled) {
            // Logic to DEACTIVATE (triple-click)
            if (clickCountRef.current === 3) {
                setIsRecordingEnabled(false);
                setRecordingStatus('idle'); // Ensure status is reset
                clickCountRef.current = 0;
            } else {
                // Reset after a delay if not a triple-click
                clickTimerRef.current = setTimeout(() => {
                    clickCountRef.current = 0;
                }, 500);
            }
        } else {
            // Logic to ACTIVATE (double-click)
            if (clickCountRef.current === 2) {
                setIsRecordingEnabled(true);
                clickCountRef.current = 0;
            } else {
                // Reset after a delay if not a double-click
                clickTimerRef.current = setTimeout(() => {
                    clickCountRef.current = 0;
                }, 500);
            }
        }
    };
    
    const renderUploadStatus = () => {
        if (uploadStatus === 'idle') return null;
        let icon, bgColor, textColor;
        switch (uploadStatus) {
            case 'uploading': icon = <Spinner />; bgColor = 'bg-blue-500'; textColor = 'text-white'; break;
            case 'success': icon = <CheckCircleIcon className="h-6 w-6" />; bgColor = 'bg-green-500'; textColor = 'text-white'; break;
            case 'error': icon = <XCircleIcon className="h-6 w-6" />; bgColor = 'bg-red-500'; textColor = 'text-white'; break;
        }
        return (
            <div className={`flex items-center gap-3 p-3 rounded-lg shadow-lg ${bgColor} ${textColor} fixed bottom-24 right-6 z-50 animate-fade-in`}>
                {icon}
                <span className="text-sm font-medium">{uploadMessage}</span>
            </div>
        );
    };

    return (
        <>
            <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
                {isRecordingEnabled && (
                    <div 
                        className="flex w-40 h-10 bg-light-card dark:bg-dark-card rounded-full overflow-hidden shadow-lg border border-light-border dark:border-dark-border animate-fade-in" 
                        style={{ animationDuration: '0.2s' }}
                    >
                        <div
                            role="button"
                            onClick={recordingStatus === 'idle' ? startRecording : undefined}
                            className={`flex-1 transition-colors duration-300 bg-green-500 ${recordingStatus === 'idle' ? 'cursor-pointer hover:bg-green-600' : 'cursor-default opacity-50'}`}
                            aria-label="Iniciar Grabación"
                            title="Iniciar Grabación"
                        />
                        <div
                            role="button"
                            onClick={(recordingStatus === 'recording' || recordingStatus === 'paused') ? togglePauseResume : undefined}
                            className={`flex-1 transition-colors duration-300 bg-brand-secondary ${(recordingStatus === 'recording' || recordingStatus === 'paused') ? 'cursor-pointer hover:bg-brand-secondary/80' : 'cursor-default opacity-50'}`}
                            aria-label="Pausar o Reanudar Grabación"
                            title={recordingStatus === 'paused' ? 'Reanudar' : 'Pausar'}
                        />
                        <div
                            role="button"
                            onClick={(recordingStatus === 'recording' || recordingStatus === 'paused') ? stopRecording : undefined}
                            className={`flex-1 transition-colors duration-300 bg-brand-accent ${(recordingStatus === 'recording' || recordingStatus === 'paused') ? 'cursor-pointer hover:bg-brand-accent/80' : 'cursor-default opacity-50'}`}
                            aria-label="Detener y Guardar Grabación"
                            title="Detener y Guardar"
                        />
                    </div>
                )}
                <div
                    className={`h-14 w-14 bg-white rounded-full transition-all duration-300 cursor-pointer shadow-lg border-2 ${isRecordingEnabled ? 'border-red-500' : 'border-gray-300'}`}
                    onClick={handleRecorderClick}
                    aria-label="Activar grabadora de voz"
                ></div>
            </div>
            {renderUploadStatus()}
        </>
    );
};

export default LoginRecorder;