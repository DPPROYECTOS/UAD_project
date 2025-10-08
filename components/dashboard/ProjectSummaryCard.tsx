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
      className="bg-light-card dark:bg-dark-card p-4 rounded-lg border border-light-border dark:border-dark-border cursor-pointer transition-all hover:shadow-md hover:border-brand-primary"
    >
      <h4 className="font-bold truncate">{project.name}</h4>
      <div className="my-3">
        <div className="flex justify-between text-xs text-light-text-secondary dark:text-dark-text-secondary mb-1">
          <span>Progreso</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-light-bg dark:bg-dark-bg rounded-full h-2">
          <div className="bg-brand-primary h-2 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
      <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary flex justify-between items-center">
        <span>Líder: {project.leader}</span>
        <span>Fin: {project.endDate ? new Date(project.endDate + 'T00:00:00').toLocaleDateString('es-ES') : 'N/A'}</span>
      </div>
    </div>
  );
};

export default ProjectSummaryCard;
