import React, { useState, useMemo } from 'react';
import { Activity } from '../types';
import { BellIcon } from '../components/Icons';

interface NotificationsViewProps {
  notifications: Activity[];
  onNavigate: (view: string) => void;
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
};

const importanceClasses = {
  high: 'bg-red-500 border-red-600',
  medium: 'bg-yellow-500 border-yellow-600',
  low: 'bg-blue-500 border-blue-600',
};


const NotificationsView: React.FC<NotificationsViewProps> = ({ notifications, onNavigate }) => {
  const [dateFilter, setDateFilter] = useState('all');
  const [importanceFilter, setImportanceFilter] = useState('all');

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

      return dateMatch && importanceMatch;
    });
  }, [notifications, dateFilter, importanceFilter]);

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
      </div>

      <div className="bg-light-card dark:bg-dark-card p-4 rounded-lg border border-light-border dark:border-dark-border">
        {filteredNotifications.length > 0 ? (
          <ul className="divide-y divide-light-border dark:divide-dark-border">
            {filteredNotifications.map(activity => (
              <li key={activity.id} className="py-4 flex items-start">
                <div className="flex-shrink-0 mt-1 mr-4">
                  <span className={`h-3 w-3 rounded-full inline-block border-2 ${importanceClasses[activity.importance || 'low'] || 'bg-gray-400 border-gray-500'}`} title={`Importancia: ${activity.importance || 'baja'}`}></span>
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