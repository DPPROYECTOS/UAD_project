import React, { useState } from 'react';
import { User, Project, ProjectStatus, AuditItem, Activity as NotificationItem, ProjectTask } from '../types';
import KPIWidget from './dashboard/KPIWidget';
import ProjectSummaryCard from './dashboard/ProjectSummaryCard';
import UpcomingAudits from './dashboard/UpcomingAudits';
import UpcomingDeadlines from './dashboard/UpcomingDeadlines';
import ActivityFeed from './dashboard/ActivityFeed';

interface DashboardViewProps {
  projects: Project[];
  audits: AuditItem[];
  activities: NotificationItem[];
  tasks: ProjectTask[];
  onSelectProject: (projectId: string) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ projects, audits, activities, tasks, onSelectProject }) => {

  const [activeTab, setActiveTab] = useState<ProjectStatus>(ProjectStatus.EN_PROGRESO);

  // KPI Calculations
  const totalProjectsCount = projects.length;
  const newProjectsCount = projects.filter(p => p.status === ProjectStatus.NUEVO).length;
  const inProgressProjectsCount = projects.filter(p => p.status === ProjectStatus.EN_PROGRESO).length;
  const inRevisionProjectsCount = projects.filter(p => p.status === ProjectStatus.EN_REVISION).length;
  const completedProjectsCount = projects.filter(p => p.status === ProjectStatus.COMPLETO).length;

  // Filter projects for the active tab
  const filteredProjects = projects.filter(p => p.status === activeTab);
  
  const tabs = [
    { status: ProjectStatus.EN_PROGRESO, label: 'Proyectos Activos' },
    { status: ProjectStatus.NUEVO, label: 'Nuevos Proyectos' },
    { status: ProjectStatus.EN_REVISION, label: 'En Revisión' },
    { status: ProjectStatus.COMPLETO, label: 'Proyectos Completos' }
  ];

  const noProjectsMessage: { [key in ProjectStatus]: string } = {
      [ProjectStatus.EN_PROGRESO]: 'No hay proyectos en progreso actualmente.',
      [ProjectStatus.NUEVO]: 'No hay nuevos proyectos para mostrar.',
      [ProjectStatus.EN_REVISION]: 'No hay proyectos en revisión en este momento.',
      [ProjectStatus.COMPLETO]: 'Aún no se ha completado ningún proyecto.'
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-light-text dark:text-dark-text">
          Dashboard de Mejora Continua
        </h1>
        <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">
          Un resumen visual de tus proyectos, fechas importantes y actividad reciente.
        </p>
      </div>

      {/* KPIs Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <KPIWidget title="Proyectos Totales" value={totalProjectsCount.toString()} trend="neutral" />
        <KPIWidget title="Nuevos Proyectos" value={newProjectsCount.toString()} trend="neutral" />
        <KPIWidget title="En Progreso" value={inProgressProjectsCount.toString()} trend="neutral" />
        <KPIWidget title="En Revisión" value={inRevisionProjectsCount.toString()} trend="neutral" />
        <KPIWidget title="Proyectos Completos" value={completedProjectsCount.toString()} trend="up" />
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-light-card dark:bg-dark-card p-4 sm:p-6 rounded-lg border border-light-border dark:border-dark-border">
            <div className="border-b border-light-border dark:border-dark-border mb-4">
              <nav className="-mb-px flex space-x-6 overflow-x-auto">
                {tabs.map(tab => (
                  <button
                    key={tab.status}
                    onClick={() => setActiveTab(tab.status)}
                    className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.status ? 'border-brand-primary text-brand-primary' : 'border-transparent text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProjects.length > 0 ? (
                filteredProjects.map(project => (
                  <ProjectSummaryCard 
                    key={project.id} 
                    project={project}
                    tasks={tasks} 
                    onSelectProject={onSelectProject}
                  />
                ))
              ) : (
                <p className="md:col-span-2 text-center py-8 text-light-text-secondary dark:text-dark-text-secondary">
                  {noProjectsMessage[activeTab]}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <UpcomingAudits audits={audits} />
          <UpcomingDeadlines projects={projects} onSelectProject={onSelectProject} />
          <ActivityFeed activities={activities} />
        </div>
      </div>
    </div>
  );
};

export default DashboardView;