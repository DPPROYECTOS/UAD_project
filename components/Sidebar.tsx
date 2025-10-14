import React, { useState, useEffect } from 'react';
import { ChartPieIcon, ClipboardListIcon, CogIcon, DocumentTextIcon, FolderOpenIcon, HomeIcon, LinkIcon, PencilAltIcon, SparklesIcon, UsersIcon, BellIcon, CustomLogoIcon, SunIcon, MoonIcon, ColorSwatchIcon } from './Icons';

interface SidebarProps {
    isOpen: boolean;
    activeView: string;
    setActiveView: (view: string) => void;
    currentTheme: string;
    onThemeChange: (themeName: string, customColors?: Record<string, string> | null) => void;
    onSecretTrigger: () => void;
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

const Sidebar: React.FC<SidebarProps> = ({ isOpen, activeView, setActiveView, currentTheme, onThemeChange, onSecretTrigger }) => {
    const [isCustomizerOpen, setCustomizerOpen] = useState(false);
    
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

    const handleColorChange = (key: string, value: string) => {
        const newColors = { ...customColors, [key]: value };
        setCustomColors(newColors);
        // Apply changes live if the custom theme is active
        if (currentTheme === 'custom') {
            onThemeChange('custom', newColors);
        }
    };
    
    const handleSaveCustomTheme = () => {
        onThemeChange('custom', customColors);
        setCustomizerOpen(false);
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

    return (
        <aside className={`fixed top-0 left-0 h-full bg-brand-primary shadow-lg z-30 transition-all duration-300 flex flex-col ${isOpen ? 'w-64' : 'w-20'}`}>
            <div className="flex items-center justify-center h-16 border-b border-[var(--color-brand-secondary)]/50 flex-shrink-0">
                <div onClick={onSecretTrigger} className="cursor-default" aria-hidden="true">
                    <CustomLogoIcon className="h-8 w-8 text-white" />
                </div>
                 <h1 className={`text-xl font-bold text-white ml-2 whitespace-nowrap transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>Interfaz M.C</h1>
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
        </aside>
    );
};

export default Sidebar;