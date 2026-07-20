
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChartPieIcon, ClipboardListIcon, CogIcon, DocumentTextIcon, FolderOpenIcon, HomeIcon, LinkIcon, PencilAltIcon, SparklesIcon, UsersIcon, BellIcon, CustomLogoIcon, SunIcon, MoonIcon, ColorSwatchIcon, CheckCircleIcon, XCircleIcon, GameControllerIcon, KeyIcon, ViewGridIcon, AcademicCapIcon, ChevronRightIcon, CalendarIcon } from './Icons';
import Spinner from './Spinner';
import { User, UserPermissions } from '../types';

interface SidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    activeView: string;
    setActiveView: (view: string) => void;
    currentTheme: string;
    onThemeChange: (themeName: string, customColors?: Record<string, string> | null) => void;
    customThemeColors: Record<string, string> | null;
    onSecretTrigger: () => void;
    onSecretSequenceStep: (step: string) => void;
    onHideGamesTrigger: () => void;
    isGamesSectionUnlocked: boolean;
    user: User;
    userPermissions: UserPermissions | null;
    setIsMasterBypassActive: (isActive: boolean) => void;
}

const NavLink: React.FC<{ 
    icon: React.ReactNode; 
    text: string; 
    isOpen: boolean; 
    isActive: boolean;
    onClick: () => void;
    onMouseDown?: () => void;
    onMouseUp?: () => void;
    onMouseLeave?: () => void;
    onTouchStart?: () => void;
    onTouchEnd?: () => void;
}> = ({ icon, text, isOpen, isActive, onClick, ...longPressProps }) => (
    <a 
      href="#" 
      onClick={(e) => { e.preventDefault(); onClick(); }}
      className={`flex items-center p-3 my-1 rounded-lg transition-colors duration-200 text-white ${isActive ? 'bg-[var(--color-brand-secondary)] font-semibold' : 'hover:bg-[var(--color-brand-secondary)]/50'}`}
      title={text}
      {...longPressProps}
    >
        {icon}
        <span className={`ml-4 whitespace-nowrap transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>{text}</span>
    </a>
);

const Sidebar: React.FC<SidebarProps> = ({ 
    isOpen, onToggle, activeView, setActiveView, currentTheme, onThemeChange, customThemeColors, onSecretTrigger,
    onSecretSequenceStep, onHideGamesTrigger, isGamesSectionUnlocked,
    user, userPermissions, setIsMasterBypassActive
}) => {
    const [isCustomizerOpen, setCustomizerOpen] = useState(false);
    const longPressTimer = useRef<ReturnType<typeof setTimeout>>();

    const handlePasswordLongPressStart = () => {
        longPressTimer.current = window.setTimeout(() => {
            setIsMasterBypassActive(true);
            setActiveView('Contraseñas');
        }, 6000); // 6 seconds
    };

    const handlePasswordLongPressEnd = () => {
        clearTimeout(longPressTimer.current);
    };


    const defaultCustomColors = {
        '--color-brand-primary': '#4a90e2',
        '--color-brand-secondary': '#357abd',
        '--color-light-bg': '#f0f2f5',
        '--color-dark-bg': '#1c1c1e',
        '--color-light-card': '#ffffff',
        '--color-dark-card': '#2c2c2e',
        '--color-light-text': '#111827',
        '--color-light-text-secondary': '#6b7280',
        '--color-dark-text': '#c9d1d9',
        '--color-dark-text-secondary': '#8b949e',
    };
    const [customColors, setCustomColors] = useState(defaultCustomColors);

    // Sync internal customization state with global theme preferences
    useEffect(() => {
        if (customThemeColors) {
            // Si el usuario tiene colores guardados, aplicarlos al panel
            setCustomColors(prev => ({ ...prev, ...customThemeColors }));
        } else {
            // CRÍTICO: Si no hay colores (nuevo usuario o cambio de sesión), resetear al valor por defecto
            setCustomColors(defaultCustomColors);
        }
    }, [customThemeColors, user?.id]); // Escuchar cambios de usuario para limpiar rastro

    const interfaceColorKeys = [
        '--color-brand-primary', '--color-brand-secondary', '--color-light-bg', 
        '--color-dark-bg', '--color-light-card', '--color-dark-card'
    ];
    const textColorKeys = [
        '--color-light-text', '--color-light-text-secondary', 
        '--color-dark-text', '--color-dark-text-secondary'
    ];

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

    const navItems = [
        { name: 'Dashboard', icon: <HomeIcon className="h-6 w-6"/>, id: 'dashboard' },
        { name: 'Proyectos', icon: <FolderOpenIcon className="h-6 w-6"/>, id: 'proyectos' },
        { name: 'Documentos', icon: <DocumentTextIcon className="h-6 w-6"/>, id: 'documentos' },
        { name: 'Enlaces', icon: <LinkIcon className="h-6 w-6"/>, id: 'enlaces' },
        { name: 'Apps', icon: <ViewGridIcon className="h-6 w-6"/>, id: 'apps' },
        { name: 'CODEX', icon: <AcademicCapIcon className="h-6 w-6"/>, id: 'codex' }, // RENAMED FROM NEXUS
        { name: 'Calendario', icon: <CalendarIcon className="h-6 w-6"/>, id: 'calendario' },
        { name: 'Auditorias', icon: <ClipboardListIcon className="h-6 w-6"/>, id: 'auditorias' },
        { name: 'Pizarra', icon: <PencilAltIcon className="h-6 w-6"/>, id: 'pizarra' },
        { name: 'Notificaciones', icon: <BellIcon className="h-6 w-6"/>, id: 'notificaciones' },
        { name: 'Contraseñas', icon: <KeyIcon className="h-6 w-6"/>, id: 'contraseñas' },
    ];
    
    const visibleNavItems = useMemo(() => {
        const sidebarPermissions = userPermissions?.sidebar;
        if (!sidebarPermissions) {
            return navItems; 
        }
        return navItems.filter(item => {
            const permKey = item.id as keyof typeof sidebarPermissions;
            return sidebarPermissions[permKey];
        });
    }, [userPermissions, navItems]);


    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity duration-300" 
                    onClick={onToggle}
                />
            )}

            <aside className={`fixed top-0 left-0 h-full bg-brand-primary shadow-lg z-30 transition-all duration-300 flex flex-col ${isOpen ? 'w-64 translate-x-0' : 'w-20 lg:w-20 -translate-x-full lg:translate-x-0'}`}>
                <div className={`relative flex items-center h-16 border-b border-[var(--color-brand-secondary)]/50 flex-shrink-0 ${isOpen ? 'px-4 justify-start' : 'justify-center'}`}>
                    <button 
                        onClick={onToggle}
                        className="absolute -right-3 top-20 bg-brand-primary text-white p-1 rounded-full border border-[var(--color-brand-secondary)] shadow-md hover:bg-brand-secondary z-50 transition-transform duration-300"
                        style={{ transform: `translateX(${isOpen ? '0' : '0'}px)` }}
                    >
                        {isOpen ? <XCircleIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                    </button>
                    <div className={`flex items-center transition-all duration-300`}>
                        <div onClick={onSecretTrigger} className="cursor-default" aria-hidden="true">
                            <CustomLogoIcon className="h-8 w-8 text-white" />
                        </div>
                        <h1 className={`text-xl font-bold text-white ml-2 whitespace-nowrap transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>Interfaz M.C</h1>
                    </div>
                </div>
                <nav className="flex-1 p-3 overflow-y-auto">
                    {visibleNavItems.map(item => {
                        const isPasswords = item.name === 'Contraseñas';
                        return (
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
                                onMouseDown={isPasswords ? handlePasswordLongPressStart : undefined}
                                onMouseUp={isPasswords ? handlePasswordLongPressEnd : undefined}
                                onMouseLeave={isPasswords ? handlePasswordLongPressEnd : undefined}
                                onTouchStart={isPasswords ? handlePasswordLongPressStart : undefined}
                                onTouchEnd={isPasswords ? handlePasswordLongPressEnd : undefined}
                            />
                        );
                    })}
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
                    {['darienperez695@gmail.com', 'zerklucio@gmail.com'].includes((user.username || '').toLowerCase().trim()) && (userPermissions?.sidebar?.administrador ?? true) && (
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
                        <div className={`absolute bottom-full mb-2 p-4 bg-light-card dark:bg-dark-card rounded-lg shadow-2xl border border-light-border dark:border-dark-border ${isOpen ? 'left-4 right-4' : 'left-full ml-2 w-72'}`}>
                            <h4 className="text-sm font-bold text-light-text dark:text-dark-text mb-3">Personalizar Tema</h4>
                            
                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary mb-2 uppercase tracking-wider">Colores de Interfaz</p>
                                    <div className="space-y-2">
                                        {interfaceColorKeys.map(key => (
                                            <div key={key} className="flex items-center justify-between text-xs text-light-text-secondary dark:text-dark-text-secondary capitalize">
                                                <label htmlFor={key}>{key.replace('--color-', '').replace(/-/g, ' ')}</label>
                                                <input
                                                    type="color"
                                                    id={key}
                                                    value={customColors[key as keyof typeof customColors]}
                                                    onChange={(e) => handleColorChange(key, e.target.value)}
                                                    className="w-8 h-6 p-0 border-none rounded cursor-pointer bg-transparent"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary mb-2 uppercase tracking-wider">Colores de Texto</p>
                                    <div className="space-y-2">
                                        {textColorKeys.map(key => (
                                            <div key={key} className="flex items-center justify-between text-xs text-light-text-secondary dark:text-dark-text-secondary capitalize">
                                                <label htmlFor={key}>{key.replace('--color-', '').replace(/-/g, ' ')}</label>
                                                <input
                                                    type="color"
                                                    id={key}
                                                    value={customColors[key as keyof typeof customColors]}
                                                    onChange={(e) => handleColorChange(key, e.target.value)}
                                                    className="w-8 h-6 p-0 border-none rounded cursor-pointer bg-transparent"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            <button onClick={handleSaveCustomTheme} className="w-full mt-4 px-3 py-1.5 text-xs font-semibold text-white bg-brand-primary rounded-md hover:bg-brand-secondary">
                                Aplicar y Guardar
                            </button>
                        </div>
                    )}
                </div>

                <div className="p-4 flex-shrink-0">
                    <p 
                      onClick={() => {
                        onSecretSequenceStep('footer');
                        onHideGamesTrigger();
                      }} 
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
