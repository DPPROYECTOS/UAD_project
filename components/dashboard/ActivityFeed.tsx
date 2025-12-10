import React from 'react';
import { Activity as NotificationItem } from '../../types';
import { TerminalIcon } from '../Icons';

interface ActivityFeedProps {
  activities: NotificationItem[];
}

const timeAgo = (isoDate: string): string => {
    const date = new Date(isoDate);
    const now = new Date();
    const totalSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (totalSeconds < 60) return `${totalSeconds}s`;
    const totalMinutes = Math.floor(totalSeconds / 60);
    if (totalMinutes < 60) return `${totalMinutes}m`;
    const totalHours = Math.floor(totalMinutes / 60);
    if (totalHours < 24) return `${totalHours}h`;
    const totalDays = Math.floor(totalHours / 24);
    return `${totalDays}d`;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  return (
    <div className="bg-light-card/60 dark:bg-dark-card/60 backdrop-blur-md p-5 rounded-sm border border-light-border/50 dark:border-dark-border/50 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-light-border dark:border-dark-border">
        <TerminalIcon className="h-4 w-4 text-brand-primary" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-light-text dark:text-dark-text">Registro de Sistema</h3>
      </div>

      <div className="mt-1 space-y-4 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
        {activities.length > 0 ? (
            activities.map((activity, index) => (
            <div key={activity.id} className="flex items-start group relative">
                {index !== activities.length - 1 && (
                    <div className="absolute left-[15px] top-[24px] bottom-[-16px] w-px bg-light-border dark:bg-dark-border group-hover:bg-brand-primary/50 transition-colors"></div>
                )}
                
                <div className="relative z-10 flex-shrink-0 mr-3">
                    {activity.user.avatarUrl ? (
                        <img src={activity.user.avatarUrl} alt={activity.user.name} className="h-8 w-8 rounded-sm object-cover border border-light-border dark:border-dark-border group-hover:border-brand-primary transition-colors" />
                    ) : (
                        <div className="h-8 w-8 rounded-sm bg-brand-primary/10 border border-brand-primary/30 flex items-center justify-center text-brand-primary font-mono text-xs font-bold">
                            {activity.user.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                        <span className="text-xs font-bold text-brand-primary font-mono truncate">{activity.user.name}</span>
                        <span className="text-[10px] font-mono text-light-text-secondary dark:text-dark-text-secondary opacity-70 whitespace-nowrap">{timeAgo(activity.timestamp)}</span>
                    </div>
                    <p className="text-xs text-light-text dark:text-dark-text mt-0.5 leading-relaxed">
                        <span className="opacity-80">{activity.action}</span> <span className="font-bold text-brand-secondary">{activity.target}</span>
                    </p>
                </div>
            </div>
            ))
        ) : (
            <p className="text-xs font-mono text-center py-4 text-light-text-secondary dark:text-dark-text-secondary"> [NO DATA] Esperando actividad...</p>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;