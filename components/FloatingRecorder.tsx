import React, { useState, useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon } from './Icons';
import Spinner from './Spinner';

type RecordingStatus = 'idle' | 'recording' | 'paused';
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface FloatingRecorderProps {
  recordingStatus: RecordingStatus;
  recordingTime: number;
  uploadStatus: UploadStatus;
  uploadMessage: string;
  onStartRecording: () => void;
  onTogglePauseResume: () => void;
  onStopRecording: () => void;
}

const toRoman = (num: number): string => {
  if (num < 0 || num > 59) return String(num).padStart(2, '0');
  if (num === 0) return '00';
  
  const val = [50, 40, 10, 9, 5, 4, 1];
  const syb = ["L", "XL", "X", "IX", "V", "IV", "I"];
  
  let result = '';
  let i = 0;
  while (num > 0) {
    for (let _ = 0; _ < Math.floor(num / val[i]); _++) {
      result += syb[i];
    }
    num %= val[i];
    i++;
  }
  return result;
};


const FloatingRecorder: React.FC<FloatingRecorderProps> = ({
  recordingStatus,
  recordingTime,
  uploadStatus,
  uploadMessage,
  onStartRecording,
  onTogglePauseResume,
  onStopRecording,
}) => {
  const [isControlsVisible, setIsControlsVisible] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Toast effect to show upload status
  useEffect(() => {
    if (uploadStatus !== 'idle') {
      setShowToast(true);
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 4000); // Toast disappears after 4s
      return () => clearTimeout(timer);
    }
  }, [uploadStatus]);

  const handleDoubleClick = () => {
    // Only allow showing controls when idle. Hiding is always allowed.
    if (recordingStatus === 'idle' || isControlsVisible) {
      setIsControlsVisible(prev => !prev);
    }
  };
  
  const handleStopAndSave = () => {
    onStopRecording();
    setIsControlsVisible(false); // Hide controls after stopping
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${toRoman(mins)}:${toRoman(secs)}`;
  };

  const renderToast = () => {
    let icon, bgColor;
    switch (uploadStatus) {
        case 'uploading': icon = <Spinner />; bgColor = 'bg-blue-500'; break;
        case 'success': icon = <CheckCircleIcon className="h-6 w-6" />; bgColor = 'bg-green-500'; break;
        case 'error': icon = <XCircleIcon className="h-6 w-6" />; bgColor = 'bg-red-500'; break;
        default: return null;
    }
    return (
        <div className={`flex items-center gap-3 p-3 rounded-lg shadow-lg text-white ${bgColor}`}>
            {icon}
            <span className="text-sm font-medium">{uploadMessage}</span>
        </div>
    );
  };
  
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-2">
      <div className={`transition-all duration-300 ${showToast ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {renderToast()}
      </div>

      <div className={`flex w-32 h-8 rounded-full overflow-hidden shadow-lg border border-black/20 transition-all duration-300 ${isControlsVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`} role="group">
        <button onClick={onStartRecording} disabled={recordingStatus !== 'idle'} className={`w-1/3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 transition-colors ${recordingStatus === 'recording' ? 'animate-subtle-pulse' : ''}`} title="Grabar" aria-label="Iniciar Grabación"/>
        <button onClick={onTogglePauseResume} disabled={recordingStatus === 'idle'} className="w-1/3 bg-sky-500 hover:bg-sky-600 disabled:bg-gray-400 transition-colors" title="Pausar/Reanudar" aria-label="Pausar o Reanudar Grabación"/>
        <button onClick={handleStopAndSave} disabled={recordingStatus === 'idle'} className="w-1/3 bg-blue-800 hover:bg-blue-900 disabled:bg-gray-400 transition-colors" title="Detener y Guardar" aria-label="Detener y Guardar Grabación"/>
      </div>
      
      {(recordingStatus === 'recording' || recordingStatus === 'paused') && (
        <span className="font-mono text-xs text-black/20 dark:text-white/20 select-none pointer-events-none">
          {formatTime(recordingTime)}
        </span>
      )}

      <button
        onDoubleClick={handleDoubleClick}
        className="w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-colors text-gray-800 bg-white hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary dark:focus:ring-offset-dark-bg"
        aria-label="Doble clic para mostrar/ocultar grabadora"
      >
        {/* Empty: indicator removed for discretion */}
      </button>
    </div>
  );
};

export default FloatingRecorder;