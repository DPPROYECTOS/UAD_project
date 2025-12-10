import React from 'react';
import { Project, ProjectTask } from '../../types';

interface ProjectSummaryCardProps {
  project: Project;
  tasks: ProjectTask[];
  onSelectProject: (projectId: string) => void;
}

const ProjectSummaryCard: React.FC<ProjectSummaryCardProps> = ({ project, tasks, onSelectProject }) => {
  const projectTasks = tasks.filter(t => t.projectId === project.id);
  const completedTasks = projectTasks.filter(t => t.completed).length;
  const totalTasks = projectTasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div
      onClick={() => onSelectProject(project.id)}
      className="group relative bg-light-card/80 dark:bg-dark-card/80 backdrop-blur-sm p-5 rounded-sm border border-light-border dark:border-dark-border cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-brand-primary/50"
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-primary/0 group-hover:bg-brand-primary transition-all duration-300"></div>
      
      <div className="flex justify-between items-start mb-2 pl-2">
          <h4 className="font-bold text-sm tracking-wide truncate group-hover:text-brand-primary transition-colors">{project.name}</h4>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text-secondary dark:text-dark-text-secondary">
            ID:{project.id.slice(0,4)}
          </span>
      </div>

      <div className="my-4 pl-2">
        <div className="flex justify-between text-[10px] font-mono text-light-text-secondary dark:text-dark-text-secondary mb-1 uppercase tracking-wider">
          <span>Sincronización</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full h-1.5 bg-light-bg dark:bg-dark-bg/50 rounded-full overflow-hidden border border-light-border/50 dark:border-dark-border/50">
          <div 
            className="h-full bg-brand-primary shadow-[0_0_10px_rgba(var(--color-brand-primary),0.5)] relative" 
            style={{ width: `${progress}%` }}
          >
             <div className="absolute inset-0 bg-white/20 w-full animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]"></div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center text-[10px] uppercase font-bold text-light-text-secondary dark:text-dark-text-secondary pl-2 border-t border-light-border/50 dark:border-dark-border/50 pt-2 mt-2">
        <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary"></span>
            {project.leader || 'N/A'}
        </span>
        <span className="font-mono">
            {project.endDate ? new Date(project.endDate + 'T00:00:00').toLocaleDateString('es-ES') : '--/--/--'}
        </span>
      </div>
    </div>
  );
};

export default ProjectSummaryCard;