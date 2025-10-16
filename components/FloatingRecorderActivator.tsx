import React, { useRef } from 'react';

interface FloatingRecorderActivatorProps {
    isRecordingEnabled: boolean;
    recordingStatus: 'idle' | 'recording' | 'paused';
    onSetIsRecordingEnabled: (enabled: boolean) => void;
    onStartRecording: () => void;
    onTogglePauseResume: () => void;
    onStopRecording: () => void;
}

const FloatingRecorderActivator: React.FC<FloatingRecorderActivatorProps> = ({
    isRecordingEnabled,
    recordingStatus,
    onSetIsRecordingEnabled,
    onStartRecording,
    onTogglePauseResume,
    onStopRecording
}) => {
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const clickCountRef = useRef(0);
    const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
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

    return (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
            {isRecordingEnabled && (
                <div 
                    className="flex w-40 h-10 bg-light-card dark:bg-dark-card rounded-full overflow-hidden shadow-lg border border-light-border dark:border-dark-border animate-fade-in" 
                    role="toolbar" 
                    aria-label="Controles de grabación flotantes"
                    style={{ animationDuration: '0.2s' }}
                >
                    <div
                        role="button"
                        onClick={recordingStatus === 'idle' ? onStartRecording : undefined}
                        className={`flex-1 transition-colors duration-300 ${isRecordingEnabled ? 'bg-green-500' : 'bg-brand-primary'} ${recordingStatus === 'idle' ? 'cursor-pointer hover:bg-green-600' : 'cursor-default opacity-50'}`}
                        aria-label="Iniciar Grabación"
                        title="Iniciar Grabación"
                    />
                    <div
                        role="button"
                        onClick={(recordingStatus === 'recording' || recordingStatus === 'paused') ? onTogglePauseResume : undefined}
                        className={`flex-1 transition-colors duration-300 bg-brand-secondary ${(recordingStatus === 'recording' || recordingStatus === 'paused') ? 'cursor-pointer hover:bg-brand-secondary/80' : 'cursor-default opacity-50'}`}
                        aria-label="Pausar o Reanudar Grabación"
                        title={recordingStatus === 'paused' ? 'Reanudar' : 'Pausar'}
                    />
                    <div
                        role="button"
                        onClick={(recordingStatus === 'recording' || recordingStatus === 'paused') ? onStopRecording : undefined}
                        className={`flex-1 transition-colors duration-300 bg-brand-accent ${(recordingStatus === 'recording' || recordingStatus === 'paused') ? 'cursor-pointer hover:bg-brand-accent/80' : 'cursor-default opacity-50'}`}
                        aria-label="Detener y Guardar Grabación"
                        title="Detener y Guardar"
                    />
                </div>
            )}
            
            <div
                className={`h-14 w-14 bg-white rounded-full transition-all duration-300 cursor-pointer shadow-lg border-2 ${isRecordingEnabled ? 'border-red-500' : 'border-gray-300'}`}
                onMouseDown={handleRecorderMouseDown}
                onMouseUp={handleRecorderMouseUp}
                onMouseLeave={handleRecorderMouseUp}
                onTouchStart={handleRecorderMouseDown}
                onTouchEnd={handleRecorderMouseUp}
                onClick={handleRecorderClick}
                aria-label="Activar grabadora de voz"
            ></div>
        </div>
    );
};

export default FloatingRecorderActivator;
