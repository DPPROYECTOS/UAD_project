import React from 'react';
import { Activity } from '../types';
import { BellIcon } from './Icons';

interface NotificationsPanelProps {
  notifications: Activity[];
  readNotificationIds: Set<string>;
  onMarkAsRead: (id: string) => void;
  onClose: () => void;
  onNavigate: () => void;
  onMarkAllAsRead: () => void;
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
    if (totalDays > 0) return `hace ${totalDays} día${totalDays > 1 ? 's' : ''}`;

    return date.toLocaleDateString('es-ES');
};


const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ notifications, readNotificationIds, onMarkAsRead, onClose, onNavigate, onMarkAllAsRead }) => {
  const recentNotifications = notifications.slice(0, 7);

  const handleNotificationClick = (notification: Activity) => {
    if (!readNotificationIds.has(notification.id)) {
        onMarkAsRead(notification.id);
    }
    // Future enhancement: navigate to the related project/item
  };

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-light-card dark:bg-dark-card rounded-md shadow-lg border border-light-border dark:border-dark-border animate-fade-in z-50" style={{ animationDuration: '0.2s' }}>
      <div className="flex justify-between items-center p-3 border-b border-light-border dark:border-dark-border">
        <h3 className="font-semibold text-light-text dark:text-dark-text">Notificaciones</h3>
        <button onClick={onMarkAllAsRead} className="text-xs font-medium text-brand-primary hover:underline">
          Marcar todo como leído
        </button>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {recentNotifications.length > 0 ? (
          <ul className="divide-y divide-light-border dark:divide-dark-border">
            {recentNotifications.map(activity => {
              const isRead = readNotificationIds.has(activity.id);
              return (
                <li
                  key={activity.id}
                  onClick={() => handleNotificationClick(activity)}
                  className={`p-3 hover:bg-light-bg dark:hover:bg-dark-bg cursor-pointer ${!isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {activity.user.avatarUrl ? (
                          <img src={activity.user.avatarUrl} alt={activity.user.name} className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                          <div className="h-8 w-8 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary font-bold text-sm">
                              {activity.user.name.charAt(0).toUpperCase()}
                          </div>
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-sm">
                        <span className="font-bold">{activity.user.name}</span> {activity.action} <span className="font-medium text-brand-primary">{activity.target}</span>.
                      </p>
                      <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">{timeAgo(activity.timestamp)}</p>
                    </div>
                    {!isRead && (
                      <div className="flex-shrink-0 mt-1">
                          <div className="h-2 w-2 rounded-full bg-brand-primary animate-pulse"></div>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-center py-10 px-4 text-light-text-secondary dark:text-dark-text-secondary">
            <BellIcon className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-2 text-sm font-medium">No hay notificaciones nuevas</p>
            <p className="mt-1 text-xs">Las nuevas actividades aparecerán aquí.</p>
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