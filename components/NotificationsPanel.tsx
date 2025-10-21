import React from 'react';
import { Activity } from '../types';
import { CheckCircleIcon } from './Icons';

interface NotificationsPanelProps {
  notifications: Activity[]; // Should only be unread notifications
  onClose: () => void;
  onNavigate: () => void;
}

const timeAgo = (isoDate: string): string => {
    const date = new Date(isoDate);
    const now = new Date();
    const totalSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (totalSeconds < 0) return 'hace instantes';
    if (totalSeconds < 5) return 'hace instantes';
    if (totalSeconds < 60) return `hace ${totalSeconds} segundos`;

    const totalMinutes = Math.floor(totalSeconds / 60);
    if (totalMinutes < 60) return `hace ${totalMinutes} minuto${totalMinutes > 1 ? 's' : ''}`;

    const totalHours = Math.floor(totalMinutes / 60);
    if (totalHours < 24) return `hace ${totalHours} hora${totalHours > 1 ? 's' : ''}`;

    const totalDays = Math.floor(totalHours / 24);
    if (totalDays < 7) return `hace ${totalDays} día${totalDays > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}


const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ notifications, onClose, onNavigate }) => {

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-light-card dark:bg-dark-card rounded-md shadow-lg border border-light-border dark:border-dark-border animate-fade-in z-50" style={{ animationDuration: '0.2s' }}>
      <div className="flex justify-between items-center p-3 border-b border-light-border dark:border-dark-border">
        <h3 className="font-semibold text-light-text dark:text-dark-text">Notificaciones Nuevas</h3>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications.length > 0 ? (
          notifications.map(activity => (
            <div
              key={activity.id}
              className="group flex items-start p-3 border-b border-light-border dark:border-dark-border last:border-b-0 transition-colors hover:bg-light-bg dark:hover:bg-dark-bg"
            >
              <div className="flex-shrink-0 mr-3">
                {activity.user.avatarUrl ? (
                    <img src={activity.user.avatarUrl} alt={activity.user.name} className="h-8 w-8 rounded-full object-cover" />
                ) : (
                    <div className="h-8 w-8 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary font-bold text-sm">
                        {activity.user.name.charAt(0).toUpperCase()}
                    </div>
                )}
              </div>
              <div className="flex-grow">
                <p className="text-sm text-light-text dark:text-dark-text">
                  <span className="font-bold">{activity.user.name}</span> {activity.action} <span className="font-medium text-brand-primary">{activity.target}</span>
                </p>
                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">
                  {timeAgo(activity.timestamp)}
                </p>
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
            Ver historial de notificaciones
          </button>
        </div>
    </div>
  );
};

export default NotificationsPanel;
