import React from 'react';
import { Activity as NotificationItem } from '../../types';

interface ActivityFeedProps {
  activities: NotificationItem[];
}

const timeAgo = (isoDate: string): string => {
    const date = new Date(isoDate);
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);

    if (seconds < 60) return `hace instantes`;
    if (minutes < 60) return `hace ${minutes} min`;
    if (hours < 24) return `hace ${hours} h`;
    return date.toLocaleDateString('es-ES');
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  return (
    <div className="bg-light-card dark:bg-dark-card p-4 rounded-lg border border-light-border dark:border-dark-border">
      <h3 className="text-sm font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Actividad Reciente</h3>
      <div className="mt-3 space-y-4">
        {activities.length > 0 ? (
            activities.map(activity => (
            <div key={activity.id} className="flex items-start">
                <div className="h-8 w-8 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary font-bold text-sm flex-shrink-0">
                {activity.user.name.charAt(0).toUpperCase()}
                </div>
                <div className="ml-3">
                <p className="text-sm">
                    <span className="font-bold">{activity.user.name}</span> {activity.action} <span className="font-medium text-brand-primary">{activity.target}</span>
                    {activity.projectName && <span className="text-light-text-secondary dark:text-dark-text-secondary"> en {activity.projectName}</span>}
                </p>
                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-0.5">{timeAgo(activity.timestamp)}</p>
                </div>
            </div>
            ))
        ) : (
            <p className="text-sm text-center py-4 text-light-text-secondary dark:text-dark-text-secondary">No hay actividad reciente.</p>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
