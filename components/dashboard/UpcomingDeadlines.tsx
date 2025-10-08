import React from 'react';
import { Project, ProjectStatus } from '../../types';
import { ClockIcon } from '../Icons';

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
    <div className="bg-light-card dark:bg-dark-card p-4 rounded-lg border border-light-border dark:border-dark-border">
      <h3 className="text-sm font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Próximos Vencimientos</h3>
      <div className="mt-3 space-y-3">
        {upcomingProjects.length > 0 ? (
          upcomingProjects.map(project => {
            const diffTime = project.dateObj.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const isUrgent = diffDays <= 7;

            return (
              <div
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className="flex justify-between items-center cursor-pointer group"
              >
                <p className="text-sm font-medium truncate group-hover:text-brand-primary">{project.name}</p>
                <span className={`text-xs font-bold ${isUrgent ? 'text-red-500' : 'text-light-text-secondary dark:text-dark-text-secondary'}`}>
                  {diffDays === 0 ? 'Hoy' : `${diffDays}d`}
                </span>
              </div>
            );
          })
        ) : (
          <div className="text-center py-4">
            <ClockIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">No hay vencimientos próximos.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingDeadlines;
