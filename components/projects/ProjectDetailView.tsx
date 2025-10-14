import React, { useState, useEffect, useMemo } from 'react';
import { Project, ProjectTask, ProjectStatus, Document, Folder } from '../../types';
import { ArrowLeftIcon, TrashIcon, PencilAltIcon } from '../Icons';
import ConfirmationModal from './ConfirmationModal';
import ProjectTasksTab from './ProjectTasksTab';
import ProjectDocumentsTab from './ProjectDocumentsTab';
import GanttChart from './GanttChart';

interface ProjectDetailViewProps {
  project: Project;
  tasks: ProjectTask[];
  documents: Document[];
  folders: Folder[];
  onBackToList: () => void;
  onDeleteProject: (id: string) => void;
  onSaveProject: (project: Project) => void;
  onAddTask: (projectId: string, details: { title: string; startDate: string; duration: number }, parentId?: string | null) => void;
  onToggleTask: (id: string) => void;
  onUpdateTask: (task: ProjectTask) => void;
  onDeleteTask: (id: string) => void;
  onAddDocument: (file: File, folderId: string, projectId: string | null) => Promise<void>;
  onDeleteDocument: (doc: Document) => Promise<void>;
}

const ProjectDetailView: React.FC<ProjectDetailViewProps> = (props) => {
  const { 
      project, tasks, documents, folders, onBackToList, onDeleteProject, 
      onSaveProject, onAddTask, onToggleTask, onUpdateTask, onDeleteTask,
      onAddDocument, onDeleteDocument
  } = props;
  const [activeTab, setActiveTab] = useState('Resumen');
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

  // --- Inline editing state ---
  const [isEditing, setIsEditing] = useState(false);
  const [editableProject, setEditableProject] = useState<Project>(project);
  
  useEffect(() => {
    setEditableProject(project);
    setIsEditing(false); // Close edit mode if project changes
  }, [project]);
  
  const tabs = ['Resumen', 'Tareas', 'Documentos', 'Gantt'];

  const projectDocuments = useMemo(() => documents.filter(doc => doc.projectId === project.id), [documents, project.id]);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleDeleteConfirm = () => {
    onDeleteProject(project.id);
    setDeleteModalOpen(false); // The view will unmount, but this is good practice
  };

  // --- Inline editing handlers ---
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditableProject(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSaveProject(editableProject);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditableProject(project); // Revert changes
    setIsEditing(false);
  };


  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'Tareas':
        return <ProjectTasksTab 
                  project={project}
                  tasks={tasks} 
                  onAddTask={(details, parentId) => onAddTask(project.id, details, parentId)}
                  onToggleTask={onToggleTask}
                  onUpdateTask={onUpdateTask}
                  onDeleteTask={onDeleteTask}
                />;
      case 'Resumen':
        return (
          <div className="space-y-6">
            {/* Combined Info Card */}
            <div className="space-y-4 bg-light-card dark:bg-dark-card p-6 rounded-lg border border-light-border dark:border-dark-border">
              <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-bold">Información del Proyecto</h3>
                  {!isEditing && (
                      <button 
                          onClick={() => setIsEditing(true)}
                          className="flex items-center text-sm font-medium text-brand-primary hover:text-brand-secondary"
                      >
                          <PencilAltIcon className="h-4 w-4 mr-1" />
                          Editar
                      </button>
                  )}
              </div>

              {isEditing ? (
                  <div className="space-y-4">
                      <div>
                          <label className="text-sm font-medium">Objetivo del Proyecto</label>
                          <textarea name="objective" rows={3} value={editableProject.objective} onChange={handleEditChange} className="w-full mt-1 p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md focus:ring-brand-accent"/>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                        <div>
                            <label className="text-sm font-medium">Estado</label>
                            <select 
                                name="status" 
                                value={editableProject.status} 
                                onChange={handleEditChange} 
                                className="w-full mt-1 p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md focus:ring-brand-accent disabled:opacity-75 disabled:cursor-not-allowed"
                                disabled={editableProject.status !== ProjectStatus.EN_REVISION}
                            >
                                {editableProject.status === ProjectStatus.EN_REVISION ? (
                                    <>
                                        <option value={ProjectStatus.EN_REVISION}>En Revisión</option>
                                        <option value={ProjectStatus.COMPLETO}>Completo</option>
                                    </>
                                ) : (
                                    <option value={editableProject.status}>{editableProject.status}</option>
                                )}
                            </select>
                            {editableProject.status !== ProjectStatus.EN_REVISION && <p className="text-xs mt-1 text-light-text-secondary dark:text-dark-text-secondary">El estado se actualiza automáticamente.</p>}
                        </div>
                        <div>
                            <label className="text-sm font-medium">Líder del Proyecto</label>
                            <input type="text" name="leader" value={editableProject.leader} onChange={handleEditChange} className="w-full mt-1 p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md focus:ring-brand-accent"/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium">Fecha de Inicio</label>
                                <input type="date" name="startDate" value={editableProject.startDate} onChange={handleEditChange} className="w-full mt-1 p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md focus:ring-brand-accent"/>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Fecha de Fin</label>
                                <input type="date" name="endDate" value={editableProject.endDate} onChange={handleEditChange} className="w-full mt-1 p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md focus:ring-brand-accent"/>
                            </div>
                        </div>
                      </div>
                      <div className="flex justify-end space-x-3 pt-4">
                          <button type="button" onClick={handleCancel} className="px-4 py-2 text-sm font-medium rounded-md border border-light-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-border">Cancelar</button>
                          <button type="button" onClick={handleSave} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary">Guardar Cambios</button>
                      </div>
                  </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                      <h4 className="text-base font-bold mb-2">Objetivo del Proyecto</h4>
                      <p className="text-light-text-secondary dark:text-dark-text-secondary whitespace-pre-wrap">{project.objective}</p>
                  </div>
                  <div className="space-y-4 lg:border-l lg:pl-6 border-light-border dark:border-dark-border">
                      <h4 className="text-base font-bold mb-2">Detalles</h4>
                      <div>
                          <p className="text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Estado</p>
                          <p className="font-medium">{project.status}</p>
                      </div>
                      <div>
                          <p className="text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Líder</p>
                          <p className="font-medium">{project.leader || 'No asignado'}</p>
                      </div>
                      <div>
                          <p className="text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Fechas</p>
                          {/* FIX: Corrected typo from toLocaleDateDateString to toLocaleDateString. */}
                          <p className="font-medium">{new Date(project.startDate).toLocaleDateString()} - {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Sin definir'}</p>
                      </div>
                  </div>
                </div>
              )}
            </div>

            {/* Progress Card */}
            <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg border border-light-border dark:border-dark-border">
                <h3 className="text-lg font-bold mb-2">Progreso ({progress}%)</h3>
                <div className="w-full bg-light-bg dark:bg-dark-bg rounded-full h-4">
                  <div className="bg-brand-primary h-4 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
          </div>
        );
      case 'Documentos':
             return <ProjectDocumentsTab 
                        project={project} 
                        documents={projectDocuments} 
                        folders={folders} 
                        onAddDocument={onAddDocument} 
                        onDeleteDocument={onDeleteDocument}
                    />;
      case 'Gantt':
             return (
               <div className="bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border w-full">
                 <h3 className="text-xl font-bold p-4 pb-2">Diagrama de Gantt del Proyecto</h3>
                 <div className="overflow-x-auto p-4 gantt-scrollbar">
                    <GanttChart project={project} tasks={tasks} />
                 </div>
               </div>
             );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
            <button onClick={onBackToList} className="flex items-center text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary hover:text-brand-primary dark:hover:text-brand-accent mb-2">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Volver a Proyectos
            </button>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">{project.description}</p>
        </div>
        <button onClick={() => setDeleteModalOpen(true)} className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20">
            <TrashIcon className="h-5 w-5 mr-2" />
            Eliminar
        </button>
      </div>
      
      <div className="border-b border-light-border dark:border-dark-border mb-6">
        <nav className="-mb-px flex space-x-6">
          {tabs.map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab ? 'border-brand-primary text-brand-primary' : 'border-transparent text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text'}`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="overflow-hidden">
        {renderActiveTabContent()}
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Proyecto"
        message={`¿Estás seguro de que quieres eliminar el proyecto "${project.name}"? Esta acción no se puede deshacer.`}
      />
    </>
  );
};

export default ProjectDetailView;