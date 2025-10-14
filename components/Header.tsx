import React, { useState, useRef, useEffect } from 'react';
import { User, Activity } from '../types';
import { BellIcon, LogoutIcon, PencilAltIcon } from './Icons';
import NotificationsPanel from './NotificationsPanel';
import Spinner from './Spinner';

interface HeaderProps {
    user: User;
    onLogout: () => void;
    notifications: Activity[]; // Should be unread notifications
    onNavigate: (view: string) => void;
    onUpdateAvatar: (file: File) => void;
    isAvatarLoading: boolean;
    onMarkAsRead: (activityId: string) => void;
    onMarkAllAsRead: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
    user, onLogout, notifications, 
    onNavigate, onUpdateAvatar, isAvatarLoading, onMarkAsRead, onMarkAllAsRead
}) => {
    const [isProfileOpen, setProfileOpen] = useState(false);
    const [isNotificationsOpen, setNotificationsOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

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

    const handleAvatarClick = (e: React.MouseEvent) => {
        e.preventDefault();
        avatarInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onUpdateAvatar(e.target.files[0]);
            setProfileOpen(false); // Close dropdown after selection
        }
    };


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
    const unreadCount = notifications.length;

    return (
        <header className="flex-shrink-0 flex items-center justify-between p-4 bg-light-card dark:bg-dark-card shadow-sm h-16 border-b border-light-border dark:border-dark-border z-20">
            <div className="flex items-center">
                 {/* This space is intentionally left blank after removing the refresh button */}
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
                <div className="relative" ref={notificationsRef}>
                    <button onClick={() => setNotificationsOpen(!isNotificationsOpen)} className="relative p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-bg dark:hover:bg-dark-bg">
                        <BellIcon />
                        {unreadCount > 0 && (
                            <span className="absolute top-0 right-0 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center border-2 border-light-card dark:border-dark-card">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>
                    {isNotificationsOpen && (
                        <NotificationsPanel
                            notifications={notifications}
                            onClose={() => setNotificationsOpen(false)}
                            onNavigate={handleNavigateToNotifications}
                            onMarkAsRead={onMarkAsRead}
                            onMarkAllAsRead={onMarkAllAsRead}
                        />
                    )}
                </div>

                <div className="relative" ref={profileRef}>
                    <button onClick={() => setProfileOpen(!isProfileOpen)} className="flex items-center space-x-3 focus:outline-none">
                         <div className="relative h-10 w-10">
                            {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt="Foto de perfil" className="h-10 w-10 rounded-full object-cover" />
                            ) : (
                                <div className="h-10 w-10 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold text-lg">
                                    {avatarInitial}
                                </div>
                            )}
                            {isAvatarLoading && (
                                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                                    <Spinner />
                                </div>
                            )}
                        </div>
                        <div className="hidden md:block text-left">
                            <p className="font-semibold text-sm text-light-text dark:text-dark-text">{displayName}</p>
                            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Usuario</p>
                        </div>
                    </button>
                    {isProfileOpen && (
                         <div className="absolute right-0 mt-2 w-64 bg-light-card dark:bg-dark-card rounded-md shadow-lg border border-light-border dark:border-dark-border animate-fade-in overflow-hidden" style={{animationDuration: '0.2s'}}>
                            <div className="flex items-center p-4 border-b border-light-border dark:border-dark-border">
                                <div className="flex-shrink-0 mr-3">
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt="Foto de perfil" className="h-14 w-14 rounded-full object-cover" />
                                    ) : (
                                        <div className="h-14 w-14 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold text-xl">
                                            {avatarInitial}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-light-text dark:text-dark-text truncate" title={displayName}>{displayName}</p>
                                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary truncate" title={user.username}>{user.username}</p>
                                </div>
                            </div>
                            <div className="py-1">
                                <input type="file" ref={avatarInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg" />
                                <a href="#" onClick={handleAvatarClick} className="flex items-center w-full px-4 py-2 text-sm text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-bg dark:hover:bg-dark-bg">
                                    <PencilAltIcon className="mr-3 h-5 w-5"/>
                                    Cambiar foto
                                </a>
                                <a href="#" onClick={(e) => { e.preventDefault(); onLogout(); }} className="flex items-center w-full px-4 py-2 text-sm text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-bg dark:hover:bg-dark-bg">
                                    <LogoutIcon className="mr-3 h-5 w-5"/>
                                    Cerrar Sesión
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;