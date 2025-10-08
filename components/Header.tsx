import React, { useState, useRef, useEffect } from 'react';
import { User, Activity } from '../types';
import { BellIcon, LogoutIcon, MenuIcon, XIcon } from './Icons';
import NotificationsPanel from './NotificationsPanel';

interface HeaderProps {
    toggleSidebar: () => void;
    isSidebarOpen: boolean;
    user: User;
    onLogout: () => void;
    unreadNotifications: Activity[];
    onMarkNotificationsAsRead: (ids: string[]) => void;
    onNavigate: (view: string) => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, isSidebarOpen, user, onLogout, unreadNotifications, onMarkNotificationsAsRead, onNavigate }) => {
    const [isProfileOpen, setProfileOpen] = useState(false);
    const [isNotificationsOpen, setNotificationsOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const notificationsRef = useRef<HTMLDivElement>(null);

    const unreadCount = unreadNotifications.length;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setProfileOpen(false);
            }
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                setNotificationsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleNavigateToNotifications = () => {
        setNotificationsOpen(false);
        onNavigate('Notificaciones');
    };

    const getDisplayName = (username: string): string => {
        const email = username.toLowerCase();
        if (email === 'darienperez695@gmail.com') {
            return 'PHOBOS';
        }
        if (email === 'mejoraproyectos0@gmail.com') {
            return 'Zerk Lucio';
        }
        return username.split('@')[0];
    };

    const displayName = getDisplayName(user.username);
    const avatarInitial = displayName.charAt(0).toUpperCase();

    return (
        <header className="flex-shrink-0 flex items-center justify-between p-4 bg-light-card dark:bg-dark-card shadow-sm h-16 border-b border-light-border dark:border-dark-border z-20">
            <div className="flex items-center">
                 <button onClick={toggleSidebar} className="p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-bg dark:hover:bg-dark-bg focus:outline-none">
                    {isSidebarOpen ? <XIcon /> : <MenuIcon />}
                </button>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
                <div className="relative" ref={notificationsRef}>
                    <button onClick={() => setNotificationsOpen(!isNotificationsOpen)} className="relative p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-bg dark:hover:bg-dark-bg">
                        <BellIcon />
                        {unreadCount > 0 && (
                            <span className="absolute top-0 right-0 block h-5 w-5 -translate-y-1/2 translate-x-1/2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            </span>
                        )}
                    </button>
                    {isNotificationsOpen && (
                        <NotificationsPanel
                            notifications={unreadNotifications.slice(0, 10)}
                            onClose={() => setNotificationsOpen(false)}
                            onNavigate={handleNavigateToNotifications}
                            onMarkAsRead={onMarkNotificationsAsRead}
                        />
                    )}
                </div>

                <div className="relative" ref={profileRef}>
                    <button onClick={() => setProfileOpen(!isProfileOpen)} className="flex items-center space-x-3 focus:outline-none">
                         <div className="h-10 w-10 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold text-lg">
                            {avatarInitial}
                        </div>
                        <div className="hidden md:block text-left">
                            <p className="font-semibold text-sm text-light-text dark:text-dark-text">{displayName}</p>
                            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Usuario</p>
                        </div>
                    </button>
                    {isProfileOpen && (
                         <div className="absolute right-0 mt-2 w-56 bg-light-card dark:bg-dark-card rounded-md shadow-lg py-1 border border-light-border dark:border-dark-border animate-fade-in" style={{animationDuration: '0.2s'}}>
                            <div className="px-4 py-2 border-b border-light-border dark:border-dark-border">
                                <p className="text-sm font-medium text-light-text dark:text-dark-text truncate">{displayName}</p>
                                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary truncate">{user.username}</p>
                            </div>
                            <a href="#" onClick={(e) => { e.preventDefault(); onLogout(); }} className="flex items-center w-full px-4 py-2 text-sm text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-bg dark:hover:bg-dark-bg">
                                <LogoutIcon className="mr-2 h-5 w-5"/>
                                Cerrar Sesión
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;