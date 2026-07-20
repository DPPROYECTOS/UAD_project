import React, { useState } from 'react';
import { Project, ProjectStatus, AuditItem, Activity as NotificationItem, ProjectTask } from '../types';
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
    { status: ProjectStatus.EN_PROGRESO, label: 'En Progreso' },
    { status: ProjectStatus.NUEVO, label: 'Nuevos' },
    { status: ProjectStatus.EN_REVISION, label: 'Revisión' },
    { status: ProjectStatus.COMPLETO, label: 'Completos' }
  ];

  const noProjectsMessage: { [key in ProjectStatus]: string } = {
      [ProjectStatus.EN_PROGRESO]: 'Sin procesos activos detectados.',
      [ProjectStatus.NUEVO]: 'No hay nuevas iniciativas en cola.',
      [ProjectStatus.EN_REVISION]: 'Cola de revisión vacía.',
      [ProjectStatus.COMPLETO]: 'Archivo histórico sin entradas recientes.'
  };

  return (
    <div className="relative space-y-6 min-h-full">
      {/* Background Grid for Futuristic Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]" 
           style={{ 
             backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
             backgroundSize: '40px 40px',
             maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)' 
           }}>
      </div>

      <div className="relative z-10 flex justify-between items-end border-b border-light-border/50 dark:border-dark-border/50 pb-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-light-text to-light-text-secondary dark:from-white dark:to-gray-500 drop-shadow-sm">
            Dashboard <span className="text-brand-primary text-xl align-top">v2.5</span>
          </h1>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-brand-primary mt-1">
            Centro de Comando Operativo
          </p>
        </div>
      </div>

      {/* KPIs Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5 gap-4 relative z-10">
        <KPIWidget title="Total Proyectos" value={totalProjectsCount.toString()} trend="neutral" />
        <KPIWidget title="Nuevos" value={newProjectsCount.toString()} trend="neutral" />
        <KPIWidget title="Activos" value={inProgressProjectsCount.toString()} trend="neutral" />
        <KPIWidget title="Revisión" value={inRevisionProjectsCount.toString()} trend="neutral" />
        <KPIWidget title="Finalizados" value={completedProjectsCount.toString()} trend="up" />
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        {/* Left Column: Projects Interface */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-light-card/40 dark:bg-dark-card/40 backdrop-blur-md p-1 rounded-lg border border-light-border dark:border-dark-border">
            
            {/* Futuristic Tab Navigation */}
            <div className="flex space-x-1 mb-4 p-1 bg-light-bg/50 dark:bg-dark-bg/50 rounded-md border border-light-border dark:border-dark-border overflow-x-auto">
                {tabs.map(tab => (
                  <button
                    key={tab.status}
                    onClick={() => setActiveTab(tab.status)}
                    className={`
                        relative flex-1 whitespace-nowrap py-2 px-4 rounded-sm text-xs font-bold uppercase tracking-wide transition-all duration-300
                        ${activeTab === tab.status 
                            ? 'bg-brand-primary text-white shadow-[0_0_15px_rgba(var(--color-brand-primary),0.4)]' 
                            : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-brand-primary hover:bg-brand-primary/10'
                        }
                    `}
                  >
                    {tab.label}
                    {activeTab === tab.status && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full mb-1"></span>}
                  </button>
                ))}
            </div>
            
            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2">
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
                <div className="md:col-span-2 py-12 flex flex-col items-center justify-center opacity-50 border-2 border-dashed border-light-border dark:border-dark-border rounded-lg">
                    <div className="w-12 h-12 mb-3 rounded-full border-2 border-current flex items-center justify-center animate-pulse">
                        <span className="text-2xl">!</span>
                    </div>
                    <p className="text-sm font-mono uppercase">{noProjectsMessage[activeTab]}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Info Panels */}
        <div className="space-y-4">
          <UpcomingAudits audits={audits} />
          <UpcomingDeadlines projects={projects} onSelectProject={onSelectProject} />
          <ActivityFeed activities={activities} />
        </div>
      </div>
    </div>
  );
};

export default DashboardView;