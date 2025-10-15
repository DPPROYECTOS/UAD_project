import React, { useState, useEffect, useRef } from 'react';
import { ChartPieIcon, ClipboardListIcon, CogIcon, DocumentTextIcon, FolderOpenIcon, HomeIcon, LinkIcon, PencilAltIcon, SparklesIcon, UsersIcon, BellIcon, CustomLogoIcon, SunIcon, MoonIcon, ColorSwatchIcon, CheckCircleIcon, XCircleIcon } from './Icons';
import Spinner from './Spinner';

interface SidebarProps {
    isOpen: boolean;
    activeView: string;
    setActiveView: (view: string) => void;
    currentTheme: string;
    onThemeChange: (themeName: string, customColors?: Record<string, string> | null) => void;
    onSecretTrigger: () => void;
    isRecordingEnabled: boolean;
    recordingStatus: 'idle' | 'recording' | 'paused';
    onSetIsRecordingEnabled: (enabled: boolean) => void;
    onSetRecordingStatus: (status: 'idle' | 'recording' | 'paused') => void;
}

type RecordingStatus = 'idle' | 'recording' | 'paused';
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

const NavLink: React.FC<{ 
    icon: React.ReactNode; 
    text: string; 
    isOpen: boolean; 
    isActive: boolean;
    onClick: () => void;
}> = ({ icon, text, isOpen, isActive, onClick }) => (
    <a 
      href="#" 
      onClick={(e) => { e.preventDefault(); onClick(); }}
      className={`flex items-center p-3 my-1 rounded-lg transition-colors duration-200 text-white ${isActive ? 'bg-[var(--color-brand-secondary)] font-semibold' : 'hover:bg-[var(--color-brand-secondary)]/50'}`}
      title={text}
    >
        {icon}
        <span className={`ml-4 whitespace-nowrap transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>{text}</span>
    </a>
);

const Sidebar: React.FC<SidebarProps> = ({ isOpen, activeView, setActiveView, currentTheme, onThemeChange, onSecretTrigger, isRecordingEnabled, recordingStatus, onSetIsRecordingEnabled, onSetRecordingStatus }) => {
    const [isCustomizerOpen, setCustomizerOpen] = useState(false);
    
    // --- Hidden Recorder State ---
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
    const [uploadMessage, setUploadMessage] = useState('');
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const clickCountRef = useRef(0);
    const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Define the default colors for the custom theme editor
    const defaultCustomColors = {
        '--color-brand-primary': '#4a90e2',
        '--color-brand-secondary': '#357abd',
        '--color-light-bg': '#f0f2f5',
        '--color-dark-bg': '#1c1c1e',
        '--color-light-card': '#ffffff',
        '--color-dark-card': '#2c2c2e',
    };
    const [customColors, setCustomColors] = useState(defaultCustomColors);

    // --- Recorder Logic ---

    const handleUpload = () => {
        if (audioChunksRef.current.length === 0) {
            console.warn("No audio chunks to upload.");
            return;
        }

        setUploadStatus('uploading');
        setUploadMessage('Subiendo grabación...');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
            const base64String = (reader.result as string).split(',')[1];
            const fileName = `AudioGeneral_${Date.now()}.webm`;
            const uploadUrl = 'https://script.google.com/macros/s/AKfycbwa8FJi0wRnGAZqevfpJEe4E4OqMgt8U6yzLjhQa2nco8zlBB_Dip9FIIp5tlJkwfWD/exec';

            try {
                const response = await fetch(uploadUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        file: base64String,
                        fileName: fileName,
                        mimeType: 'audio/webm'
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
                console.error("Upload failed:", err);
                setUploadStatus('error');
                setUploadMessage(err instanceof Error ? err.message : 'Fallo en la subida.');
            } finally {
                audioChunksRef.current = [];
            }
        };
    };
    
    const stopRecording = () => {
        if (!mediaRecorderRef.current || recordingStatus === 'idle') return;
        
        mediaRecorderRef.current.stop();
        
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        onSetRecordingStatus('idle');
    };

    useEffect(() => {
        if (!isRecordingEnabled && (recordingStatus !== 'idle' || mediaRecorderRef.current)) {
            stopRecording();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRecordingEnabled]);

    useEffect(() => {
        if (uploadStatus === 'success' || uploadStatus === 'error') {
            const timer = setTimeout(() => {
                setUploadStatus('idle');
                setUploadMessage('');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [uploadStatus]);

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
            onSetRecordingStatus('recording');
        } catch (err) {
            console.error("Error accessing microphone:", err);
            setUploadStatus('error');
            setUploadMessage('No se pudo acceder al micrófono.');
        }
    };

    const togglePauseResume = () => {
        if (!mediaRecorderRef.current) return;

        if (recordingStatus === 'recording') {
            mediaRecorderRef.current.pause();
            onSetRecordingStatus('paused');
        } else if (recordingStatus === 'paused') {
            mediaRecorderRef.current.resume();
            onSetRecordingStatus('recording');
        }
    };
    
    // --- End of Recorder Logic ---

    const handleColorChange = (key: string, value: string) => {
        const newColors = { ...customColors, [key]: value };
        setCustomColors(newColors);
        if (currentTheme === 'custom') {
            onThemeChange('custom', newColors);
        }
    };
    
    const handleSaveCustomTheme = () => {
        onThemeChange('custom', customColors);
        setCustomizerOpen(false);
    };

    const handleRecorderMouseDown = () => {
        if (isRecordingEnabled) return;
        longPressTimerRef.current = setTimeout(() => {
            onSetIsRecordingEnabled(true);
        }, 3000);
    };

    const handleRecorderMouseUp = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const handleRecorderClick = () => {
        if (!isRecordingEnabled) return;

        clickCountRef.current += 1;

        if (clickTimerRef.current) clearTimeout(clickTimerRef.current);

        if (clickCountRef.current === 3) {
            onSetIsRecordingEnabled(false);
            clickCountRef.current = 0;
        } else {
            clickTimerRef.current = setTimeout(() => {
                clickCountRef.current = 0;
            }, 1000);
        }
    };

    const navItems = [
        { name: 'Dashboard', icon: <HomeIcon className="h-6 w-6"/> },
        { name: 'Proyectos', icon: <FolderOpenIcon className="h-6 w-6"/> },
        { name: 'Documentos', icon: <DocumentTextIcon className="h-6 w-6"/> },
        { name: 'Enlaces', icon: <LinkIcon className="h-6 w-6"/> },
        { name: 'Gemini 2.5', icon: <SparklesIcon className="h-6 w-6"/> },
        { name: 'Auditorias', icon: <ClipboardListIcon className="h-6 w-6"/> },
        { name: 'Pizarra', icon: <PencilAltIcon className="h-6 w-6"/> },
        { name: 'Notificaciones', icon: <BellIcon className="h-6 w-6"/> },
    ];
    
    const renderUploadStatus = () => {
        if (uploadStatus === 'idle') return null;

        let icon, bgColor, textColor;
        switch (uploadStatus) {
            case 'uploading':
                icon = <Spinner />;
                bgColor = 'bg-blue-500';
                textColor = 'text-white';
                break;
            case 'success':
                icon = <CheckCircleIcon className="h-6 w-6" />;
                bgColor = 'bg-green-500';
                textColor = 'text-white';
                break;
            case 'error':
                icon = <XCircleIcon className="h-6 w-6" />;
                bgColor = 'bg-red-500';
                textColor = 'text-white';
                break;
        }

        return (
            <div className={`flex items-center gap-3 p-3 rounded-lg shadow-lg ${bgColor} ${textColor}`}>
                {icon}
                <span className="text-sm font-medium">{uploadMessage}</span>
            </div>
        );
    };


    return (
        <aside className={`fixed top-0 left-0 h-full bg-brand-primary shadow-lg z-30 transition-all duration-300 flex flex-col ${isOpen ? 'w-64' : 'w-20'}`}>
            <div className={`relative flex items-center h-16 border-b border-[var(--color-brand-secondary)]/50 flex-shrink-0 ${isOpen ? 'px-4 justify-start' : 'justify-center'}`}>
                <div 
                    className={`absolute top-3 left-3 h-3 w-3 bg-white rounded-full transition-all duration-300 cursor-pointer ${isOpen ? 'opacity-100' : 'opacity-0'} ${isRecordingEnabled ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-brand-primary' : ''}`}
                    onMouseDown={handleRecorderMouseDown}
                    onMouseUp={handleRecorderMouseUp}
                    onMouseLeave={handleRecorderMouseUp}
                    onTouchStart={handleRecorderMouseDown}
                    onTouchEnd={handleRecorderMouseUp}
                    onClick={handleRecorderClick}
                    aria-label="Activar grabadora de voz"
                ></div>
                
                <div className={`flex items-center transition-all duration-300 ${isOpen ? 'ml-6' : 'ml-0'}`}>
                    <div onClick={onSecretTrigger} className="cursor-default" aria-hidden="true">
                        <CustomLogoIcon className="h-8 w-8 text-white" />
                    </div>
                    <h1 className={`text-xl font-bold text-white ml-2 whitespace-nowrap transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>Interfaz M.C</h1>
                </div>
            </div>
            <nav className="flex-1 p-3 overflow-y-auto">
                {navItems.map(item => (
                    <NavLink 
                        key={item.name}
                        icon={item.icon} 
                        text={item.name} 
                        isOpen={isOpen}
                        isActive={activeView === item.name}
                        onClick={() => setActiveView(item.name)}
                    />
                ))}
            </nav>

            <div className={`px-3 pb-3 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                 <div className="flex w-full h-8 rounded-full overflow-hidden" role="toolbar" aria-label="Controles de grabación ocultos">
                    <div
                        role="button"
                        onClick={isRecordingEnabled && recordingStatus === 'idle' ? startRecording : undefined}
                        className={`w-1/3 transition-colors duration-300 ${isRecordingEnabled ? 'bg-green-500' : 'bg-brand-primary'} ${isRecordingEnabled && recordingStatus === 'idle' ? 'cursor-pointer' : 'cursor-default'}`}
                        aria-label="Iniciar Grabación"
                        title={isRecordingEnabled ? "Iniciar Grabación" : "Color primario"}
                        tabIndex={isRecordingEnabled && recordingStatus === 'idle' ? 0 : -1}
                    />
                    <div
                        role="button"
                        onClick={isRecordingEnabled && (recordingStatus === 'recording' || recordingStatus === 'paused') ? togglePauseResume : undefined}
                        className={`w-1/3 bg-brand-secondary ${isRecordingEnabled && (recordingStatus === 'recording' || recordingStatus === 'paused') ? 'cursor-pointer' : 'cursor-default'}`}
                        aria-label="Pausar o Reanudar Grabación"
                        title={isRecordingEnabled ? (recordingStatus === 'paused' ? 'Reanudar' : 'Pausar') : "Color secundario"}
                        tabIndex={isRecordingEnabled && (recordingStatus === 'recording' || recordingStatus === 'paused') ? 0 : -1}
                    />
                    <div
                        role="button"
                        onClick={isRecordingEnabled && (recordingStatus === 'recording' || recordingStatus === 'paused') ? stopRecording : undefined}
                        className={`w-1/3 bg-brand-accent ${isRecordingEnabled && (recordingStatus === 'recording' || recordingStatus === 'paused') ? 'cursor-pointer' : 'cursor-default'}`}
                        aria-label="Detener y Guardar Grabación"
                        title={isRecordingEnabled ? "Detener y Guardar" : "Color de acento"}
                        tabIndex={isRecordingEnabled && (recordingStatus === 'recording' || recordingStatus === 'paused') ? 0 : -1}
                    />
                </div>
            </div>

            <div className="p-3 border-t border-[var(--color-brand-secondary)]/50 relative">
                 <div className="flex items-center justify-around">
                    <button onClick={() => onThemeChange('light')} title="Tema Claro" className={`p-2 rounded-full ${currentTheme === 'light' ? 'bg-white/30' : 'hover:bg-white/20'}`}>
                        <SunIcon className="h-5 w-5 text-white" />
                    </button>
                    <button onClick={() => onThemeChange('dark')} title="Tema Oscuro" className={`p-2 rounded-full ${currentTheme === 'dark' ? 'bg-white/30' : 'hover:bg-white/20'}`}>
                        <MoonIcon className="h-5 w-5 text-white" />
                    </button>
                     <button onClick={() => setCustomizerOpen(!isCustomizerOpen)} title="Personalizar Tema" className={`p-2 rounded-full ${currentTheme === 'custom' ? 'bg-white/30' : 'hover:bg-white/20'}`}>
                        <ColorSwatchIcon className="h-5 w-5 text-white" />
                    </button>
                 </div>
                 {isCustomizerOpen && (
                     <div className={`absolute bottom-full mb-2 p-4 bg-light-card dark:bg-dark-card rounded-lg shadow-2xl border border-light-border dark:border-dark-border ${isOpen ? 'left-4 right-4' : 'left-full ml-2 w-64'}`}>
                         <h4 className="text-sm font-bold text-light-text dark:text-dark-text mb-3">Personalizar Tema</h4>
                         <div className="space-y-2">
                             {Object.entries(customColors).map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                    <label htmlFor={key}>{key.replace('--color-', '').replace(/-/g, ' ')}</label>
                                    <input
                                        type="color"
                                        id={key}
                                        value={value}
                                        onChange={(e) => handleColorChange(key, e.target.value)}
                                        className="w-8 h-6 p-0 border-none rounded cursor-pointer bg-transparent"
                                    />
                                </div>
                             ))}
                         </div>
                         <button onClick={handleSaveCustomTheme} className="w-full mt-4 px-3 py-1.5 text-xs font-semibold text-white bg-brand-primary rounded-md hover:bg-brand-secondary">
                             Aplicar y Guardar
                         </button>
                     </div>
                 )}
            </div>

            <div className="p-4 flex-shrink-0">
                <p className={`text-xs text-center text-white/70 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    SUAVE Y FACIL S.A. de C.V.
                </p>
            </div>
            
            {uploadStatus !== 'idle' && (
                <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
                    {renderUploadStatus()}
                </div>
            )}
        </aside>
    );
};

export default Sidebar;