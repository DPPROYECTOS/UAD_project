
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Project, ProjectTask, ProjectStatus, Document, Folder, UserPermissions, User } from '../../types';
import { ArrowLeftIcon, TrashIcon, PencilAltIcon, SparklesIcon, DocumentTextIcon, RefreshIcon, XIcon, DocumentDownloadIcon, PhotographIcon } from '../Icons';
import ConfirmationModal from './ConfirmationModal';
import ProjectTasksTab from './ProjectTasksTab';
import ProjectDocumentsTab from './ProjectDocumentsTab';
import GanttChart from './GanttChart';
import IshikawaDiagram from './IshikawaDiagram';
import { generateCorporateReport } from '../../services/reportService';
import { getIshikawaDiagram, getGeminiApiKey, getProjectFullDocuments, attachDocumentToProject, detachDocumentFromProject } from '../../services/supabaseService';
import Spinner from '../Spinner';
import FileViewerModal from '../FileViewerModal';
import html2canvas from 'html2canvas';

interface ProjectDetailViewProps {
  project: Project;
  tasks: ProjectTask[];
  documents: Document[];
  folders: Folder[];
  onBackToList: () => void;
  onDeleteProject: (id: string) => void;
  onSaveProject: (project: Project) => void;
  onAddTask: (projectId: string, details: { title: string; startDate: string; duration: number; assignedTo: string }, parentId?: string | null) => void;
  onToggleTask: (id: string) => void;
  onUpdateTask: (task: ProjectTask) => void;
  onDeleteTask: (id: string) => void;
  onAddDocument: (file: File, folderId: string, projectId: string | null) => Promise<void>;
  onDeleteDocument: (doc: Document) => Promise<void>;
  userPermissions: UserPermissions | null;
  user: User;
  deleteLocks?: Record<string, boolean>;
}

const ProjectDetailView: React.FC<ProjectDetailViewProps> = (props) => {
  const { 
      project, tasks, documents, folders, onBackToList, onDeleteProject, 
      onSaveProject, onAddTask, onToggleTask, onUpdateTask, onDeleteTask,
      onAddDocument, onDeleteDocument, userPermissions, user, deleteLocks = {}
  } = props;
  const [activeTab, setActiveTab] = useState('Resumen');
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isIshikawaConfirmOpen, setIsIshikawaConfirmOpen] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [isCapturingGantt, setIsCapturingGantt] = useState(false);
  
  // Ref para capturar el gráfico de Gantt
  const ganttRef = useRef<HTMLDivElement>(null);

  // --- Local Documents Sync (For Attachments Support) ---
  const [syncedDocuments, setSyncedDocuments] = useState<Document[]>([]);
  const [isSyncingDocs, setIsSyncingDocs] = useState(false);

  useEffect(() => {
      const sync = async () => {
          setIsSyncingDocs(true);
          try {
              const fullDocs = await getProjectFullDocuments(project.id);
              setSyncedDocuments(fullDocs);
          } catch (e) {
              console.error("Error syncing project documents:", e);
          } finally {
              setIsSyncingDocs(false);
          }
      };
      sync();
  }, [project.id, documents]); 

  const handleAttachDocument = async (docId: string) => {
      try {
          await attachDocumentToProject(project.id, docId);
          const fullDocs = await getProjectFullDocuments(project.id);
          setSyncedDocuments(fullDocs);
      } catch (e) {
          console.error("Error attaching document:", e);
      }
  };

  const handleDetachDocument = async (doc: Document) => {
      if (doc.projectId === project.id) {
          await onDeleteDocument(doc);
      } else {
          try {
              await detachDocumentFromProject(project.id, doc.id);
              const fullDocs = await getProjectFullDocuments(project.id);
              setSyncedDocuments(fullDocs);
          } catch (e) {
              console.error("Error detaching document:", e);
          }
      }
  };
  
  const [previewFile, setPreviewFile] = useState<{ id: string; url: string; name: string; mimeType: string; } | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editableProject, setEditableProject] = useState<Project>(project);
  
  useEffect(() => {
    setEditableProject(project);
    setIsEditing(false); 
  }, [project]);
  
  const tabs = useMemo(() => {
      const baseTabs = ['Resumen', 'Tareas', 'Documentos', 'Gantt'];
      if (project.ishikawaEnabled) {
          baseTabs.push('Ishikawa');
      }
      return baseTabs;
  }, [project.ishikawaEnabled]);

  const progress = useMemo(() => {
    const total = tasks.length;
    if (total === 0) return 0;
    return Math.round((tasks.filter(t => t.status === 'completed').length / total) * 100);
  }, [tasks]);

  const handleDeleteConfirm = () => {
    onDeleteProject(project.id);
    setDeleteModalOpen(false);
  };

  const handleToggleIshikawa = () => {
      const updatedProject = { ...project, ishikawaEnabled: !project.ishikawaEnabled };
      onSaveProject(updatedProject);
      setIsIshikawaConfirmOpen(false);
      if (!updatedProject.ishikawaEnabled && activeTab === 'Ishikawa') {
          setActiveTab('Resumen');
      }
  };

  const createReportBlob = async () => {
      const apiKey = await getGeminiApiKey();
      const ishikawaData = project.ishikawaEnabled ? await getIshikawaDiagram(project.id) : null;
      
      return await generateCorporateReport({
          project,
          tasks,
          documents: syncedDocuments,
          ishikawa: ishikawaData
      }, apiKey);
  };

  const handleGenerateReport = async () => {
      setIsGeneratingReport(true);
      try {
          const wordBlob = await createReportBlob();
          const url = URL.createObjectURL(wordBlob);
          setPreviewFile({
              id: 'temp-report',
              url: url,
              name: `REPORTE_${project.name.replace(/\s+/g, '_')}.docx`,
              mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          });
      } catch (error) {
          console.error("Report Generation Error:", error);
          alert("Error al generar la vista previa del reporte.");
      } finally {
          setIsGeneratingReport(false);
      }
  };

  const handleDownloadReport = async () => {
      setIsDownloadingReport(true);
      try {
          const wordBlob = await createReportBlob();
          const url = URL.createObjectURL(wordBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `REPORTE_${project.name.replace(/\s+/g, '_')}.docx`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
      } catch (error) {
          console.error("Report Download Error:", error);
          alert("Error al descargar el reporte corporativo.");
      } finally {
          setIsDownloadingReport(false);
      }
  };

  /**
   * Captura el gráfico de Gantt y lo descarga como PNG con fondo blanco.
   */
  const handleDownloadGanttImage = async () => {
      if (!ganttRef.current || isCapturingGantt) return;
      
      setIsCapturingGantt(true);
      try {
          // Buscamos el elemento interno real que tiene el grid (GanttChart lo envuelve en un scroll div)
          const target = ganttRef.current.querySelector('.relative.text-sm') as HTMLElement;
          if (!target) throw new Error("No se encontró el elemento raíz del gráfico.");

          const canvas = await html2canvas(target, {
              scale: 2, // Doble escala para alta calidad
              useCORS: true,
              backgroundColor: '#ffffff', // Fondo blanco para la descarga
              logging: false,
              onclone: (clonedDoc) => {
                  // Forzamos el modo claro en el documento clonado para asegurar legibilidad
                  clonedDoc.documentElement.classList.remove('dark');
                  
                  // Asegurar que el elemento clonado sea visible y tenga fondo blanco para la captura
                  const el = clonedDoc.querySelector('.relative.text-sm') as HTMLElement;
                  if (el) {
                      el.style.overflow = 'visible';
                      el.style.backgroundColor = '#ffffff';
                      el.style.color = '#000000';
                  }
              }
          });

          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `GANTT_${project.name.replace(/\s+/g, '_')}.png`;
          link.href = dataUrl;
          link.click();
      } catch (error) {
          console.error("Gantt Capture Error:", error);
          alert("No se pudo generar la imagen del gráfico de Gantt.");
      } finally {
          setIsCapturingGantt(false);
      }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditableProject(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSaveProject(editableProject);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditableProject(project); 
    setIsEditing(false);
  };

  const canEditProject = userPermissions?.proyectos?.canEdit ?? false;
  const canDeleteProject = userPermissions?.proyectos?.canDelete ?? false;
  const canManageTasks = userPermissions?.proyectos?.canManageTasks ?? false;

  const isDarien = user?.username?.trim().toLowerCase() === 'darienperez695@gmail.com' || user?.email?.trim().toLowerCase() === 'darienperez695@gmail.com';
  const isProjectDeleteLocked = !!deleteLocks?.['proyectos'] && !isDarien;
  const isTaskDeleteLocked = !!deleteLocks?.['tareas'] && !isDarien;

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
                  isEditor={canManageTasks}
                  isDeleteLocked={isTaskDeleteLocked}
                />;
      case 'Resumen':
        return (
          <div className="space-y-6">
            <div className="space-y-4 bg-light-card dark:bg-dark-card p-6 rounded-lg border border-light-border dark:border-dark-border">
              <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-bold">Información del Proyecto</h3>
                  <div className="flex items-center gap-2">
                      <button 
                        onClick={handleGenerateReport}
                        disabled={isGeneratingReport || isDownloadingReport}
                        className={`flex items-center text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded bg-slate-900 dark:bg-slate-800 text-cyan-400 border border-cyan-500/30 hover:border-cyan-500 transition-all disabled:opacity-50`}
                        title="Abrir en el visor de documentos"
                      >
                        {isGeneratingReport ? <Spinner size="sm" /> : <DocumentTextIcon className="h-4 w-4 mr-2" />}
                        VISTA PREVIA
                      </button>

                      <button 
                        onClick={handleDownloadReport}
                        disabled={isGeneratingReport || isDownloadingReport}
                        className={`flex items-center text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded bg-green-950 text-green-400 border border-green-500/30 hover:border-green-400 hover:bg-green-900/50 transition-all disabled:opacity-50`}
                        title="Descargar archivo .docx directamente"
                      >
                        {isDownloadingReport ? <Spinner size="sm" /> : <DocumentDownloadIcon className="h-4 w-4 mr-2" />}
                        DESCARGAR WORD
                      </button>
                      
                      {canEditProject && (
                        <button 
                            onClick={() => setIsIshikawaConfirmOpen(true)}
                            className={`flex items-center text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all ${project.ishikawaEnabled ? 'bg-brand-primary/10 border-brand-primary text-brand-primary' : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500'}`}
                        >
                            <SparklesIcon className="h-3 w-3 mr-1.5" />
                            Ishikawa: {project.ishikawaEnabled ? 'ON' : 'OFF'}
                        </button>
                      )}
                      {canEditProject && !isEditing && (
                          <button 
                              onClick={() => setIsEditing(true)}
                              className="flex items-center text-sm font-medium text-brand-primary hover:text-brand-secondary ml-2"
                          >
                              <PencilAltIcon className="h-4 w-4 mr-1" />
                              Editar
                          </button>
                      )}
                  </div>
              </div>

              {isEditing && canEditProject ? (
                  <div className="space-y-4">
                      <div>
                          <label className="text-sm font-medium">Objetivo del Proyecto</label>
                          <textarea name="objective" rows={2} value={editableProject.objective} onChange={handleEditChange} className="w-full mt-1 p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md focus:ring-brand-accent"/>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium block">Resumen Ejecutivo (Para Reporte)</label>
                            <textarea name="executiveSummary" rows={4} value={editableProject.executiveSummary} onChange={handleEditChange} placeholder="Define el propósito estratégico para la Dirección..." className="w-full mt-1 p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md focus:ring-brand-accent text-sm"/>
                          </div>
                          <div>
                            <label className="text-sm font-medium block">Conclusiones Finales (Para Reporte)</label>
                            <textarea name="finalConclusions" rows={4} value={editableProject.finalConclusions} onChange={handleEditChange} placeholder="Indica los resultados obtenidos y próximos pasos..." className="w-full mt-1 p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md focus:ring-brand-accent text-sm"/>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                        <div>
                            <label className="text-sm font-medium">Líder del Proyecto</label>
                            <input type="text" name="leader" value={editableProject.leader} onChange={handleEditChange} className="w-full mt-1 p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md focus:ring-brand-accent"/>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Fecha de Inicio</label>
                            <input type="date" name="startDate" value={editableProject.startDate} onChange={handleEditChange} className="w-full mt-1 p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md focus:ring-brand-accent"/>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Fecha de Fin</label>
                            <input type="date" name="endDate" value={editableProject.endDate} onChange={handleEditChange} className="w-full mt-1 p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md focus:ring-brand-accent"/>
                        </div>
                      </div>
                      <div className="flex justify-end space-x-3 pt-4">
                          <button type="button" onClick={handleCancel} className="px-4 py-2 text-sm font-medium rounded-md border border-light-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-border">Cancelar</button>
                          <button type="button" onClick={handleSave} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary">Guardar Cambios</button>
                      </div>
                  </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                      <div>
                          <h4 className="text-xs font-black text-brand-primary uppercase tracking-widest mb-1">Objetivo del Proyecto</h4>
                          <p className="text-light-text-secondary dark:text-dark-text-secondary whitespace-pre-wrap leading-relaxed">{project.objective}</p>
                      </div>
                      {project.executiveSummary && (
                          <div>
                              <h4 className="text-xs font-black text-brand-primary uppercase tracking-widest mb-1">Resumen Ejecutivo</h4>
                              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary italic leading-relaxed">"{project.executiveSummary}"</p>
                          </div>
                      )}
                  </div>
                  <div className="space-y-4 lg:border-l lg:pl-6 border-light-border dark:border-dark-border">
                      <h4 className="text-base font-bold mb-2">Detalles Operativos</h4>
                      <div>
                          <p className="text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Estado</p>
                          <p className="font-medium">{project.status}</p>
                      </div>
                      <div>
                          <p className="text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Líder</p>
                          <p className="font-medium">{project.leader || 'No asignado'}</p>
                      </div>
                      <div>
                          <p className="text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Periodo</p>
                          <p className="font-medium text-sm">{new Date(project.startDate).toLocaleDateString()} - {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Activo'}</p>
                      </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg border border-light-border dark:border-dark-border relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <RefreshIcon className="h-24 w-24 animate-spin-slow" />
                </div>
                <h3 className="text-lg font-bold mb-2">Sincronización de Avance Real ({progress}%)</h3>
                <div className="w-full bg-light-bg dark:bg-dark-bg rounded-full h-4 border border-light-border dark:border-dark-border">
                  <div className="bg-brand-primary h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(74,144,226,0.4)]" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-tighter">
                   <div className="flex items-center gap-1 bg-green-500/10 text-green-600 px-2 py-1 rounded">
                       <span className="w-2 h-2 rounded-full bg-green-500"></span>
                       {tasks.filter(t => t.status === 'completed').length} Completadas
                   </div>
                   <div className="flex items-center gap-1 bg-red-500/10 text-red-600 px-2 py-1 rounded">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        {tasks.filter(t => t.status === 'failed').length} Incidencias
                   </div>
                   <div className="flex items-center gap-1 bg-gray-500/10 text-gray-500 px-2 py-1 rounded">
                        <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                        {tasks.filter(t => t.status === 'pending').length} Pendientes
                   </div>
                </div>
            </div>
          </div>
        );
      case 'Documentos':
             return <ProjectDocumentsTab 
                        project={project} 
                        documents={syncedDocuments} 
                        allGlobalDocuments={documents}
                        folders={folders} 
                        onAddDocument={onAddDocument} 
                        onDeleteDocument={handleDetachDocument}
                        onAttachDocument={handleAttachDocument}
                        userPermissions={userPermissions}
                        user={user}
                        isLoading={isSyncingDocs}
                    />;
      case 'Gantt':
             return (
               <div className="bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border w-full flex flex-col overflow-hidden">
                 <div className="flex justify-between items-center p-4 border-b border-light-border dark:border-dark-border">
                    <h3 className="text-xl font-bold">Diagrama de Gantt del Proyecto</h3>
                    <button 
                        onClick={handleDownloadGanttImage}
                        disabled={isCapturingGantt || tasks.length === 0}
                        className="flex items-center text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded bg-amber-500 hover:bg-amber-600 text-white shadow-md disabled:opacity-50 transition-colors"
                    >
                        {isCapturingGantt ? <Spinner size="sm" /> : <PhotographIcon className="h-4 w-4 mr-2" />}
                        DESCARGAR CAPTURA (PNG)
                    </button>
                 </div>
                 <div ref={ganttRef} className="overflow-x-auto p-4 gantt-scrollbar">
                    <GanttChart project={project} tasks={tasks} />
                 </div>
               </div>
             );
      case 'Ishikawa':
            return <IshikawaDiagram project={project} />;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
            <button onClick={onBackToList} className="flex items-center text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary hover:text-brand-primary dark:hover:text-brand-accent mb-2 transition-colors">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Volver a Proyectos
            </button>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">{project.description}</p>
        </div>
        {canDeleteProject && (
            <button 
                onClick={() => {
                    if (isProjectDeleteLocked) {
                        alert("La eliminación de proyectos está bloqueada por el Administrador Maestro (PHOBOS).");
                        return;
                    }
                    setDeleteModalOpen(true);
                }} 
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    isProjectDeleteLocked 
                    ? 'text-gray-400 bg-gray-500/10 cursor-not-allowed opacity-60' 
                    : 'text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20'
                }`}
                title={isProjectDeleteLocked ? "Eliminación bloqueada por Administrador PHOBOS" : "Eliminar"}
            >
                <TrashIcon className="h-5 w-5 mr-2" />
                {isProjectDeleteLocked ? "Bloqueado" : "Eliminar"}
            </button>
        )}
      </div>
      
      <div className="border-b border-light-border dark:border-dark-border mb-6">
        <nav className="-mb-px flex space-x-6">
          {tabs.map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${activeTab === tab ? 'border-brand-primary text-brand-primary' : 'border-transparent text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text'}`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="overflow-hidden">
        {renderActiveTabContent()}
      </div>

      {previewFile && (
          <FileViewerModal
              document={previewFile}
              user={user}
              onClose={() => {
                  URL.revokeObjectURL(previewFile.url);
                  setPreviewFile(null);
              }}
          />
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Proyecto"
        message={`¿Estás seguro de que quieres eliminar el proyecto "${project.name}"? Esta acción no se puede deshacer y borrará toda la información relacionada.`}
      />

      <ConfirmationModal
        isOpen={isIshikawaConfirmOpen}
        onClose={() => setIsIshikawaConfirmOpen(false)}
        onConfirm={handleToggleIshikawa}
        title={project.ishikawaEnabled ? "Deshabilitar Ishikawa" : "Habilitar Ishikawa"}
        message={`¿Estás seguro de que quieres ${project.ishikawaEnabled ? 'deshabilitar' : 'habilitar'} la sección de Ishikawa para este proyecto?`}
      />
    </>
  );
};

export default ProjectDetailView;
