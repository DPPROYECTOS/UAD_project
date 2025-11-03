import React from 'react';
import { Activity } from '../types';
import { CheckCircleIcon } from './Icons';

interface NotificationsPanelProps {
  onClose: () => void;
  onNavigate: () => void;
  onMarkAllAsRead: () => void;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ onClose, onNavigate, onMarkAllAsRead }) => {

  const handleMarkAll = () => {
    onMarkAllAsRead();
    onClose(); // Optionally close the panel after marking all as read
  };

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-light-card dark:bg-dark-card rounded-md shadow-lg border border-light-border dark:border-dark-border animate-fade-in z-50" style={{ animationDuration: '0.2s' }}>
      <div className="flex justify-between items-center p-3 border-b border-light-border dark:border-dark-border">
        <h3 className="font-semibold text-light-text dark:text-dark-text">Notificaciones</h3>
        <button onClick={handleMarkAll} className="text-xs font-medium text-brand-primary hover:underline">
          Marcar todo como leído
        </button>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {/* The content is now managed in the full NotificationsView for persistence */}
        <div className="text-center py-10 px-4 text-light-text-secondary dark:text-dark-text-secondary">
          <CheckCircleIcon className="mx-auto h-10 w-10 text-gray-400" />
          <p className="mt-2 text-sm font-medium">Revisa el historial</p>
          <p className="mt-1 text-xs">Todas las notificaciones se cargan en la página de Notificaciones.</p>
        </div>
      </div>
       <div className="p-2 border-t border-light-border dark:border-dark-border">
          <button onClick={onNavigate} className="w-full text-center text-sm font-medium text-brand-primary hover:underline p-2 rounded-md hover:bg-light-bg dark:hover:bg-dark-bg">
            Ver historial de notificaciones
          </button>
        </div>
    </div>
  );
};

export default NotificationsPanel;
