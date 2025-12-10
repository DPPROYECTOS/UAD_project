import React from 'react';
import { Project, ProjectStatus } from '../../types';
import { ClockIcon, ChevronRightIcon } from '../Icons';

interface UpcomingDeadlinesProps {
  projects: Project[];
  onSelectProject: (projectId: string) => void;
}

const UpcomingDeadlines: React.FC<UpcomingDeadlinesProps> = ({ projects, onSelectProject }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingProjects = projects
    .filter(p => p.status !== ProjectStatus.COMPLETO && p.endDate)
    .map(p => ({ ...p, dateObj: new Date(p.endDate + 'T00:00:00Z') }))
    .filter(p => p.dateObj >= today)
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
    .slice(0, 5);

  return (
    <div className="bg-light-card/60 dark:bg-dark-card/60 backdrop-blur-md p-5 rounded-sm border border-light-border/50 dark:border-dark-border/50">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-light-border dark:border-dark-border">
        <ClockIcon className="h-4 w-4 text-brand-primary" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-light-text dark:text-dark-text">Vencimientos Críticos</h3>
      </div>
      
      <div className="space-y-2">
        {upcomingProjects.length > 0 ? (
          upcomingProjects.map(project => {
            const diffTime = project.dateObj.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const isUrgent = diffDays <= 7;

            return (
              <div
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className="group flex justify-between items-center p-2 rounded hover:bg-brand-primary/10 cursor-pointer border border-transparent hover:border-brand-primary/30 transition-all"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                    <ChevronRightIcon className="h-3 w-3 text-light-text-secondary dark:text-dark-text-secondary group-hover:text-brand-primary transition-colors" />
                    <p className="text-sm font-medium truncate group-hover:text-brand-primary transition-colors">{project.name}</p>
                </div>
                <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${isUrgent ? 'bg-red-500/10 text-red-500 border border-red-500/30' : 'bg-light-bg dark:bg-dark-bg text-light-text-secondary dark:text-dark-text-secondary border border-light-border dark:border-dark-border'}`}>
                  {diffDays === 0 ? 'HOY' : `T-${diffDays}d`}
                </span>
              </div>
            );
          })
        ) : (
          <div className="text-center py-6 opacity-50">
            <p className="text-xs font-mono uppercase">Sistema despejado. Sin vencimientos.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingDeadlines;