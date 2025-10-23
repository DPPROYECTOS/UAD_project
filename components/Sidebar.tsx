import React, { useState, useEffect, useMemo } from 'react';
import { ChartPieIcon, ClipboardListIcon, CogIcon, DocumentTextIcon, FolderOpenIcon, HomeIcon, LinkIcon, PencilAltIcon, SparklesIcon, UsersIcon, BellIcon, CustomLogoIcon, SunIcon, MoonIcon, ColorSwatchIcon, CheckCircleIcon, XCircleIcon, GameControllerIcon } from './Icons';
import Spinner from './Spinner';
import { User, UserPermissions } from '../types';

type RecordingStatus = 'idle' | 'recording' | 'paused';
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface SidebarProps {
    isOpen: boolean;
    activeView: string;
    setActiveView: (view: string) => void;
    currentTheme: string;
    onThemeChange: (themeName: string, customColors?: Record<string, string> | null) => void;
    onSecretTrigger: () => void;
    onSecretSequenceStep: (step: string) => void;
    isGamesSectionUnlocked: boolean;
    recordingStatus: RecordingStatus;
    recordingTime: number;
    uploadStatus: UploadStatus;
    uploadMessage: string;
    onStartRecording: () => void;
    onTogglePauseResume: () => void;
    onStopRecording: () => void;
    user: User;
    userPermissions: UserPermissions | null;
}

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

const Sidebar: React.FC<SidebarProps> = ({ 
    isOpen, activeView, setActiveView, currentTheme, onThemeChange, onSecretTrigger,
    onSecretSequenceStep, isGamesSectionUnlocked,
    recordingStatus, recordingTime, uploadStatus, uploadMessage,
    onStartRecording, onTogglePauseResume, onStopRecording,
    user, userPermissions
}) => {
    const [isCustomizerOpen, setCustomizerOpen] = useState(false);

    const defaultCustomColors = {
        '--color-brand-primary': '#4a90e2',
        '--color-brand-secondary': '#357abd',
        '--color-light-bg': '#f0f2f5',
        '--color-dark-bg': '#1c1c1e',
        '--color-light-card': '#ffffff',
        '--color-dark-card': '#2c2c2e',
    };
    const [customColors, setCustomColors] = useState(defaultCustomColors);

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

    // --- Recorder Logic ---
    const [isControlsVisible, setIsControlsVisible] = useState(false);
    const [showToast, setShowToast] = useState(false);

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
        if (recordingStatus === 'idle' || isControlsVisible) {
        setIsControlsVisible(prev => !prev);
        }
    };
    
    const handleStopAndSave = () => {
        onStopRecording();
        setIsControlsVisible(false); // Hide controls after stopping
    };

    const renderToast = () => {
        let icon, bgColor, textColor;
        switch (uploadStatus) {
            case 'uploading': icon = <Spinner />; bgColor = 'bg-blue-500'; textColor = 'text-white'; break;
            case 'success': icon = <CheckCircleIcon className="h-6 w-6" />; bgColor = 'bg-green-500'; textColor = 'text-white'; break;
            case 'error': icon = <XCircleIcon className="h-6 w-6" />; bgColor = 'bg-red-500'; textColor = 'text-white'; break;
            default: return null;
        }
        return (
            <div className={`flex items-center gap-3 p-3 rounded-lg shadow-lg ${bgColor} ${textColor}`}>
                {icon}
                <span className="text-sm font-medium">{uploadMessage}</span>
            </div>
        );
    };

    const navItems = [
        { name: 'Dashboard', icon: <HomeIcon className="h-6 w-6"/>, id: 'dashboard' },
        { name: 'Proyectos', icon: <FolderOpenIcon className="h-6 w-6"/>, id: 'proyectos' },
        { name: 'Documentos', icon: <DocumentTextIcon className="h-6 w-6"/>, id: 'documentos' },
        { name: 'Enlaces', icon: <LinkIcon className="h-6 w-6"/>, id: 'enlaces' },
        { name: 'Gemini 2.5', icon: <SparklesIcon className="h-6 w-6"/>, id: 'gemini' },
        { name: 'Auditorias', icon: <ClipboardListIcon className="h-6 w-6"/>, id: 'auditorias' },
        { name: 'Pizarra', icon: <PencilAltIcon className="h-6 w-6"/>, id: 'pizarra' },
        { name: 'Notificaciones', icon: <BellIcon className="h-6 w-6"/>, id: 'notificaciones' },
    ];
    
    const visibleNavItems = useMemo(() => {
        const sidebarPermissions = userPermissions?.sidebar;
        if (!sidebarPermissions) {
            return navItems; // Fallback to show all if permissions are not loaded
        }
        return navItems.filter(item => sidebarPermissions[item.id]);
    }, [userPermissions]);


    return (
        <>
            <aside className={`fixed top-0 left-0 h-full bg-brand-primary shadow-lg z-30 transition-all duration-300 flex flex-col ${isOpen ? 'w-64' : 'w-20'}`}>
                <div className={`relative flex items-center h-16 border-b border-[var(--color-brand-secondary)]/50 flex-shrink-0 ${isOpen ? 'px-4 justify-start' : 'justify-center'}`}>
                    <div className={`flex items-center transition-all duration-300`}>
                        <div onClick={onSecretTrigger} className="cursor-default" aria-hidden="true">
                            <CustomLogoIcon className="h-8 w-8 text-white" />
                        </div>
                        <h1 className={`text-xl font-bold text-white ml-2 whitespace-nowrap transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>Interfaz M.C</h1>
                    </div>
                </div>
                <nav className="flex-1 p-3 overflow-y-auto">
                    {visibleNavItems.map(item => (
                        <NavLink 
                            key={item.name}
                            icon={item.icon} 
                            text={item.name} 
                            isOpen={isOpen}
                            isActive={activeView === item.name}
                            onClick={() => {
                                setActiveView(item.name);
                                if (item.name === 'Pizarra') onSecretSequenceStep('pizarra');
                                if (item.name === 'Notificaciones') onSecretSequenceStep('notificaciones');
                            }}
                        />
                    ))}
                    {isGamesSectionUnlocked && (
                        <NavLink 
                            key="Juegos"
                            icon={<GameControllerIcon className="h-6 w-6"/>}
                            text="Juegos"
                            isOpen={isOpen}
                            isActive={activeView === 'Juegos'}
                            onClick={() => setActiveView('Juegos')}
                        />
                    )}
                    {user.username === 'darienperez695@gmail.com' && (
                        <NavLink 
                            key="Administrador"
                            icon={<CogIcon className="h-6 w-6"/>}
                            text="Administrador"
                            isOpen={isOpen}
                            isActive={activeView === 'Administrador'}
                            onClick={() => setActiveView('Administrador')}
                        />
                    )}
                </nav>

                <div className="p-3 mb-2">
                    <div className="flex flex-col items-center gap-2">
                        <div className={`transition-all duration-300 ${showToast ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            {renderToast()}
                        </div>

                        <div className={`flex w-48 h-8 rounded-full overflow-hidden shadow-lg border border-black/20 transition-all duration-300 ${isControlsVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`} role="group">
                            <button onClick={onStartRecording} disabled={recordingStatus !== 'idle'} className={`w-1/3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 transition-colors ${recordingStatus === 'recording' ? 'animate-subtle-pulse' : ''}`} title="Grabar" aria-label="Iniciar Grabación"/>
                            <button onClick={onTogglePauseResume} disabled={recordingStatus === 'idle'} className="w-1/3 bg-sky-500 hover:bg-sky-600 disabled:bg-gray-400 transition-colors" title="Pausar/Reanudar" aria-label="Pausar o Reanudar Grabación"/>
                            <button onClick={handleStopAndSave} disabled={recordingStatus === 'idle'} className="w-1/3 bg-blue-800 hover:bg-blue-900 disabled:bg-gray-400 transition-colors" title="Detener y Guardar" aria-label="Detener y Guardar Grabación"/>
                        </div>
                        
                        <button
                            onDoubleClick={handleDoubleClick}
                            className="w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors text-gray-800 bg-white hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary dark:focus:ring-offset-dark-card"
                            aria-label="Doble clic para mostrar/ocultar grabadora"
                        >
                           {/* Empty: indicator removed for discretion */}
                        </button>
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
                    <p 
                      onClick={() => onSecretSequenceStep('footer')} 
                      className={`text-xs text-center text-white/70 transition-opacity duration-300 cursor-pointer ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    >
                        SUAVE Y FACIL S.A. de C.V.
                    </p>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;