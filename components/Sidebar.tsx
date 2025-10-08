import React from 'react';
import { ChartPieIcon, ClipboardListIcon, CogIcon, DocumentTextIcon, FolderOpenIcon, HomeIcon, LinkIcon, PencilAltIcon, SparklesIcon, UsersIcon, BellIcon, DrillIcon } from './Icons';

interface SidebarProps {
    isOpen: boolean;
    activeView: string;
    setActiveView: (view: string) => void;
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
      className={`flex items-center p-3 my-1 rounded-lg transition-colors duration-200 text-white ${isActive ? 'bg-brand-secondary font-semibold' : 'hover:bg-brand-secondary/50'}`}
      title={text}
    >
        {icon}
        <span className={`ml-4 whitespace-nowrap transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>{text}</span>
    </a>
);

const Sidebar: React.FC<SidebarProps> = ({ isOpen, activeView, setActiveView }) => {
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
            <div className="flex items-center justify-center h-16 border-b border-brand-secondary/50 flex-shrink-0">
                <DrillIcon className="h-8 w-8 text-white" />
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
            <div className="p-4 mt-auto flex-shrink-0">
                <p className={`text-xs text-center text-white/70 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    SUAVE Y FACIL S.A. de C.V.
                </p>
            </div>
        </aside>
    );
};

export default Sidebar;