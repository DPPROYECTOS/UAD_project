import React, { useState, useEffect } from 'react';
import { Activity } from '../types';
import { BellIcon, CheckCircleIcon } from './Icons';

interface NotificationsPanelProps {
  notifications: Activity[];
  onClose: () => void;
  onNavigate: () => void;
  onMarkAsRead: (ids: string[]) => void;
}

const timeAgo = (isoDate: string): string => {
    const date = new Date(isoDate);
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) return `hace ${seconds}s`;
    if (minutes < 60) return `hace ${minutes}m`;
    if (hours < 24) return `hace ${hours}h`;
    if (days < 7) return `hace ${days}d`;
    
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}


const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ notifications, onClose, onNavigate, onMarkAsRead }) => {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // On unmount (when the panel closes), mark the checked items as read.
    return () => {
      if (checkedIds.size > 0) {
        onMarkAsRead(Array.from(checkedIds));
      }
    };
  }, [checkedIds, onMarkAsRead]);

  const handleCheckChange = (id: string, isChecked: boolean) => {
    setCheckedIds(prev => {
      const newSet = new Set(prev);
      if (isChecked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-light-card dark:bg-dark-card rounded-md shadow-lg border border-light-border dark:border-dark-border animate-fade-in z-50" style={{ animationDuration: '0.2s' }}>
      <div className="flex justify-between items-center p-3 border-b border-light-border dark:border-dark-border">
        <h3 className="font-semibold text-light-text dark:text-dark-text">Notificaciones Recientes</h3>
        {checkedIds.size > 0 && (
          <button onClick={onClose} className="text-sm font-medium text-brand-primary hover:underline">
            Marcar {checkedIds.size} como leída(s)
          </button>
        )}
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications.length > 0 ? (
          notifications.map(activity => (
            <div
              key={activity.id}
              className="flex items-start p-3 border-b border-light-border dark:border-dark-border last:border-b-0 transition-colors hover:bg-light-bg dark:hover:bg-dark-bg"
            >
              <div className="flex-grow">
                <p className="text-sm text-light-text dark:text-dark-text">
                  <span className="font-bold">{activity.user.name}</span> {activity.action} <span className="font-medium text-brand-primary">{activity.target}</span>
                </p>
                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">
                  {timeAgo(activity.timestamp)}
                </p>
              </div>
              <div className="ml-2 flex-shrink-0">
                  <input
                    type="checkbox"
                    title="Marcar como leída"
                    className="h-5 w-5 rounded border-gray-300 text-brand-primary focus:ring-brand-primary cursor-pointer"
                    onChange={(e) => handleCheckChange(activity.id, e.target.checked)}
                  />
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 px-4 text-light-text-secondary dark:text-dark-text-secondary">
            <CheckCircleIcon className="mx-auto h-10 w-10 text-green-500" />
            <p className="mt-2 text-sm font-medium">Estás al día</p>
            <p className="mt-1 text-xs">No tienes notificaciones nuevas.</p>
          </div>
        )}
      </div>
       <div className="p-2 border-t border-light-border dark:border-dark-border">
          <button onClick={onNavigate} className="w-full text-center text-sm font-medium text-brand-primary hover:underline p-2 rounded-md hover:bg-light-bg dark:hover:bg-dark-bg">
            Ver todas
          </button>
        </div>
    </div>
  );
};

export default NotificationsPanel;