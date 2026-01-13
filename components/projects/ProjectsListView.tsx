
import React, { useState, useMemo } from 'react';
import { Project, ProjectStatus, ProjectTask, UserPermissions } from '../../types';
import { PlusIcon, SearchIcon, FolderOpenIcon } from '../Icons';
import ProjectModal from './ProjectModal';
import StatusSelector from './StatusSelector';
import Spinner from '../Spinner';

interface ProjectsListViewProps {
  projects: Project[];
  tasks: ProjectTask[];
  isLoading: boolean;
  onSelectProject: (project: Project) => void;
  onSaveProject: (project: Omit<Project, 'id'> | Project) => void;
  onUpdateProjectStatus: (projectId: string, status: ProjectStatus) => void;
  onError: (error: unknown, defaultMessage: string) => void;
  geminiApiKey: string | null;
  userPermissions: UserPermissions | null;
}

const ProjectsListView: React.FC<ProjectsListViewProps> = ({ projects, tasks, isLoading, onSelectProject, onSaveProject, onUpdateProjectStatus, onError, geminiApiKey, userPermissions }) => {
  const [isModalOpen, setModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [statusFilter, setStatusFilter] = useState('Todos los Estados');
  const [dateFilter, setDateFilter] = useState('');
  
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesStatus = statusFilter === 'Todos los Estados' || project.status === statusFilter;
      const matchesDate = !dateFilter || project.startDate >= dateFilter;
      return matchesStatus && matchesDate;
    });
  }, [projects, statusFilter, dateFilter]);
  
  const handleOpenCreateModal = () => {
    setProjectToEdit(null); // Ensure modal opens in create mode
    setModalOpen(true);
  };

  const getProgress = (project: Project) => {
    const projectTasks = tasks.filter(t => t.projectId === project.id);
    const totalTasks = projectTasks.length;
    if (totalTasks === 0) return 0;
    // Sincronización: Solo contamos tareas con status 'completed'
    const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
    return Math.round((completedTasks / totalTasks) * 100);
  };
  
  const renderContent = () => {
    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-16">
                <Spinner />
                <span className="ml-2">Cargando proyectos...</span>
            </div>
        );
    }

    if (filteredProjects.length === 0) {
        return (
            <div className="text-center py-16 text-light-text-secondary dark:text-dark-text-secondary">
                <FolderOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium">No se encontraron proyectos</h3>
                <p className="mt-1 text-sm">Intenta ajustar tus filtros o crea un nuevo proyecto.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
         {/* Desktop Table View */}
         <table className="min-w-full divide-y divide-light-border dark:divide-dark-border hidden md:table">
            <thead className="bg-light-bg dark:bg-dark-bg/50">
                <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Nombre del Proyecto</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Estado</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Progreso</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border">
                {filteredProjects.map(project => {
                    const progress = getProgress(project);
                    return (
                        <tr key={project.id} onClick={() => onSelectProject(project)} className="hover:bg-light-bg dark:hover:bg-dark-bg cursor-pointer">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium">{project.name}</div>
                                <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{project.leader}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                <StatusSelector 
                                    currentStatus={project.status} 
                                    onUpdate={(newStatus) => onUpdateProjectStatus(project.id, newStatus)} 
                                    isInteractive={userPermissions?.proyectos.canEdit && project.status === ProjectStatus.EN_REVISION}
                                />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                        <div className="bg-brand-primary h-2.5 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(74,144,226,0.3)]" style={{width: `${progress}%`}}></div>
                                    </div>
                                    <span className="text-sm ml-3 font-bold text-brand-primary min-w-[36px]">{progress}%</span>
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
         </table>

         {/* Mobile Card View */}
         <div className="space-y-4 md:hidden">
            {filteredProjects.map(project => {
                const progress = getProgress(project);
                return (
                    <div key={project.id} onClick={() => onSelectProject(project)} className="p-4 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg/50">
                        <div className="flex justify-between items-start">
                             <div className="font-bold">{project.name}</div>
                             <div onClick={e => e.stopPropagation()}>
                                 <StatusSelector 
                                    currentStatus={project.status} 
                                    onUpdate={(newStatus) => onUpdateProjectStatus(project.id, newStatus)}
                                    isInteractive={userPermissions?.proyectos.canEdit && project.status === ProjectStatus.EN_REVISION}
                                />
                            </div>
                        </div>
                        <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">{project.leader}</div>
                        <div className="mt-4">
                           <div className="flex items-center">
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                    <div className="bg-brand-primary h-2.5 rounded-full shadow-[0_0_8px_rgba(74,144,226,0.3)]" style={{width: `${progress}%`}}></div>
                                </div>
                                <span className="text-sm ml-3 font-bold text-brand-primary min-w-[36px]">{progress}%</span>
                            </div>
                        </div>
                    </div>
                );
            })}
         </div>
       </div>
    );
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Proyectos</h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">
            Gestiona todas tus iniciativas y mejoras.
          </p>
        </div>
        {userPermissions?.proyectos?.canCreate && (
            <div className="flex w-full sm:w-auto">
                <button 
                    onClick={handleOpenCreateModal}
                    className="flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary w-full"
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Nuevo Proyecto
                </button>
            </div>
        )}
      </div>

      <div className="mb-4 bg-light-card dark:bg-dark-card p-4 rounded-lg border border-light-border dark:border-dark-border flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-grow">
          <label htmlFor="status-filter" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Filtrar por Estado</label>
          <select 
            id="status-filter"
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg focus:outline-none focus:ring-2 focus:ring-brand-accent"
          >
            <option>Todos los Estados</option>
            {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex-grow">
          <label htmlFor="date-filter" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Filtrar por Fecha (desde)</label>
          <input
            id="date-filter"
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg focus:outline-none focus:ring-2 focus:ring-brand-accent"
          />
        </div>
        <div className="flex-shrink-0">
          <button 
            onClick={() => { setStatusFilter('Todos los Estados'); setDateFilter(''); }}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-md border border-light-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-border"
          >
            Limpiar Filtros
          </button>
        </div>
      </div>
      
      <div className="bg-light-card dark:bg-dark-card p-4 rounded-lg border border-light-border dark:border-dark-border">
         {renderContent()}
      </div>

      {isModalOpen && (
        <ProjectModal 
            isOpen={isModalOpen} 
            onClose={() => setModalOpen(false)} 
            onSave={onSaveProject}
            projectToEdit={projectToEdit}
            geminiApiKey={geminiApiKey}
        />
      )}
    </>
  );
};

export default ProjectsListView;
