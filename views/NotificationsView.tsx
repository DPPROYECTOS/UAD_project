import React, { useState, useMemo } from 'react';
import { Activity } from '../types';
import { BellIcon, CheckCircleIcon } from '../components/Icons';

interface NotificationsViewProps {
  notifications: Activity[];
  onNavigate: (view: string) => void;
  onMarkAsRead: (activityId: string, read: boolean) => void;
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
};

const importanceBorderClasses = {
  high: 'border-red-500',
  medium: 'border-yellow-500',
  low: 'border-blue-500',
};

const importanceBgClasses = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
}


const NotificationsView: React.FC<NotificationsViewProps> = ({ notifications, onNavigate, onMarkAsRead }) => {
  const [dateFilter, setDateFilter] = useState('all');
  const [importanceFilter, setImportanceFilter] = useState('all');
  const [readFilter, setReadFilter] = useState('all');


  const filteredNotifications = useMemo(() => {
    const now = new Date();
    return notifications.filter(activity => {
      // Date filter
      const activityDate = new Date(activity.timestamp);
      let dateMatch = false;
      if (dateFilter === 'all') {
        dateMatch = true;
      } else {
        const diffDays = (now.getTime() - activityDate.getTime()) / (1000 * 3600 * 24);
        if (dateFilter === 'today' && diffDays < 1) dateMatch = true;
        if (dateFilter === '7days' && diffDays < 7) dateMatch = true;
        if (dateFilter === '30days' && diffDays < 30) dateMatch = true;
      }

      // Importance filter
      const importanceMatch = importanceFilter === 'all' || activity.importance === importanceFilter;

      // Read status filter
      const readMatch = readFilter === 'all' 
        || (readFilter === 'read' && activity.isRead)
        || (readFilter === 'unread' && !activity.isRead);

      return dateMatch && importanceMatch && readMatch;
    });
  }, [notifications, dateFilter, importanceFilter, readFilter]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Historial de Notificaciones</h1>
        <button onClick={() => onNavigate('Dashboard')} className="text-sm font-medium text-brand-primary hover:underline">
          Volver al Dashboard
        </button>
      </div>

      <div className="mb-4 bg-light-card dark:bg-dark-card p-4 rounded-lg border border-light-border dark:border-dark-border flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-grow">
          <label htmlFor="date-filter" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Filtrar por Fecha</label>
          <select 
            id="date-filter" 
            value={dateFilter} 
            onChange={e => setDateFilter(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg focus:outline-none focus:ring-2 focus:ring-brand-accent"
          >
            <option value="all">Toda la historia</option>
            <option value="today">Hoy</option>
            <option value="7days">Últimos 7 días</option>
            <option value="30days">Últimos 30 días</option>
          </select>
        </div>
        <div className="flex-grow">
          <label htmlFor="importance-filter" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Filtrar por Importancia</label>
          <select 
            id="importance-filter" 
            value={importanceFilter} 
            onChange={e => setImportanceFilter(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg focus:outline-none focus:ring-2 focus:ring-brand-accent"
          >
            <option value="all">Toda la importancia</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
        </div>
        <div className="flex-grow">
          <label htmlFor="read-filter" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Filtrar por Estado</label>
          <select 
            id="read-filter" 
            value={readFilter} 
            onChange={e => setReadFilter(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg focus:outline-none focus:ring-2 focus:ring-brand-accent"
          >
            <option value="all">Todas</option>
            <option value="read">Leídas</option>
            <option value="unread">No Leídas</option>
          </select>
        </div>
      </div>

      <div className="bg-light-card dark:bg-dark-card p-4 rounded-lg border border-light-border dark:border-dark-border">
        {filteredNotifications.length > 0 ? (
          <ul className="divide-y divide-light-border dark:divide-dark-border">
            {filteredNotifications.map(activity => (
              <li key={activity.id} className={`py-4 flex items-center group transition-opacity ${activity.isRead ? 'opacity-60' : ''}`}>
                <div className="flex-shrink-0 mr-4">
                    {activity.user.avatarUrl ? (
                        <img
                            src={activity.user.avatarUrl}
                            alt={activity.user.name}
                            className={`h-10 w-10 rounded-full object-cover border-2 ${importanceBorderClasses[activity.importance] || 'border-gray-400'}`}
                        />
                    ) : (
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold ${importanceBgClasses[activity.importance] || 'bg-gray-400'}`}>
                            {activity.user.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                <div className="flex-grow">
                  <p className="text-sm">
                    <span className="font-bold">{activity.user.name}</span> {activity.action} <span className="font-medium text-brand-primary">{activity.target}</span>.
                  </p>
                  <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1 flex items-center space-x-4">
                    <span>{new Date(activity.timestamp).toLocaleString('es-ES')}</span>
                    <span>({timeAgo(activity.timestamp)})</span>
                    {activity.projectName && <span className="font-semibold">{activity.projectName}</span>}
                  </div>
                </div>
                 <button 
                    onClick={() => onMarkAsRead(activity.id, !activity.isRead)} 
                    title={activity.isRead ? "Marcar como no leído" : "Marcar como leído"}
                    className={`ml-4 flex-shrink-0 p-2 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all ${activity.isRead ? 'text-gray-500 hover:text-brand-primary' : 'text-brand-primary hover:text-gray-500'}`}
                >
                    <CheckCircleIcon className="h-6 w-6"/>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-16 text-light-text-secondary dark:text-dark-text-secondary">
            <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium">No se encontraron notificaciones</h3>
            <p className="mt-1 text-sm">Prueba a cambiar los filtros o a realizar alguna acción en la app.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsView;