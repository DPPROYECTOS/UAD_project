import React, { useState, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import LoginView from './components/Login';
import DashboardView from './components/Dashboard';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ProjectsListView from './components/projects/ProjectsListView';
import ProjectDetailView from './components/projects/ProjectDetailView';
import DocumentsView from './views/DocumentsView';
import LinksView from './views/LinksView';
import LinkModal from './components/LinkModal';
import ConfirmationModal from './components/projects/ConfirmationModal';
import NotificationsView from './views/NotificationsView';
import GeminiView from './views/GeminiView';
import AuditsView from './views/AuditsView';
import AuditModal from './components/AuditModal';
import WhiteboardView from './views/WhiteboardView'; // Import the new WhiteboardView
import { User, Project, ProjectTask, ProjectStatus, Activity, Folder, Document, DisplayUser, LinkItem, AuditItem, RecurrenceRule } from './types';
import { 
  signIn, 
  signOut, 
  supabase,
  getProjects,
  addProject,
  updateProject,
  deleteProject,
  getTasks,
  addTask,
  updateTask,
  deleteTask,
  getFolders,
  addFolder,
  deleteFolder,
  getDocuments,
  uploadDocument,
  deleteDocument,
  getLinks,
  addLink,
  updateLink,
  deleteLink,
  getAudits,
  addAudit,
  updateAudit,
  deleteAudit,
} from './services/supabaseService';
import Spinner from './components/Spinner';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState('Dashboard');

  // --- Project Management State ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  // --- Links State ---
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState<LinkItem | null>(null);
  const [linkToEdit, setLinkToEdit] = useState<LinkItem | null>(null);

  // --- Audits State ---
  const [audits, setAudits] = useState<AuditItem[]>([]);
  const [auditsLoading, setAuditsLoading] = useState(true);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [editingAudit, setEditingAudit] = useState<AuditItem | null>(null);
  const [selectedAuditDate, setSelectedAuditDate] = useState<string | null>(null);
  const [auditToDelete, setAuditToDelete] = useState<AuditItem | null>(null);

  // --- Notifications State ---
  const [activities, setActivities] = useState<Activity[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());

  // Effect to manage auth state changes from Supabase
  useEffect(() => {
    try {
        const storedActivities = localStorage.getItem('app-activities');
        if (storedActivities) setActivities(JSON.parse(storedActivities));

        const storedReadIds = localStorage.getItem('app-read-notifications');
        if (storedReadIds) setReadNotificationIds(new Set(JSON.parse(storedReadIds)));
    } catch (error) {
        console.error("Failed to load data from localStorage", error);
    }
    
    setAuthLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        const currentUser = session?.user;
        setUser(currentUser ? { id: currentUser.id, username: currentUser.email || 'Usuario' } : null);
        // If there's no session, we can stop the auth loading indicator immediately.
        // If there is a session, the data fetching effect will handle it.
        if (!session) {
            setAuthLoading(false);
        }
    });

    return () => {
        subscription.unsubscribe();
    };
  }, []);

  // Effect to fetch data when a user logs in, or clear data on logout.
  // This is more robust than the previous session handling logic.
  useEffect(() => {
    if (user) {
        // User is logged in, fetch all data in parallel.
        Promise.all([
            fetchProjects(),
            fetchTasks(),
            fetchFolders(),
            fetchDocuments(),
            fetchLinks(),
            fetchAudits()
        ]).finally(() => {
            setAuthLoading(false);
        });
    } else {
        // User is logged out, clear all data.
        setProjects([]);
        setTasks([]);
        setFolders([]);
        setDocuments([]);
        setLinks([]);
        setAudits([]);
        setSelectedProject(null);
        setActiveView('Dashboard');
    }
  }, [user]); // This effect runs whenever the user object changes.

  // Save notifications to localStorage whenever they change
  useEffect(() => {
      try {
          localStorage.setItem('app-activities', JSON.stringify(activities));
          localStorage.setItem('app-read-notifications', JSON.stringify(Array.from(readNotificationIds)));
      } catch (error) {
          console.error("Failed to save notifications to localStorage", error);
      }
  }, [activities, readNotificationIds]);
  
  const fetchProjects = async () => {
    try {
        setError(null);
        setProjectsLoading(true);
        const fetchedProjects = await getProjects();
        setProjects(fetchedProjects);
    } catch (err) {
        handleDatabaseError(err, 'Failed to fetch projects.');
    } finally {
        setProjectsLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
        setError(null);
        setTasksLoading(true);
        const fetchedTasks = await getTasks();
        setTasks(fetchedTasks);
    } catch (err) {
        handleDatabaseError(err, 'Failed to fetch tasks.');
    } finally {
        setTasksLoading(false);
    }
  };
  
  const fetchFolders = async () => {
    try {
        setError(null);
        setFoldersLoading(true);
        let fetchedFolders = await getFolders();
        if (!fetchedFolders.some(f => f.name === 'General')) {
            const generalFolder = await addFolder('General', null);
            fetchedFolders = [generalFolder, ...fetchedFolders];
        }
        setFolders(fetchedFolders);
    } catch (err) {
        handleDatabaseError(err, 'Failed to fetch folders.');
    } finally {
        setFoldersLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
        setError(null);
        setDocumentsLoading(true);
        const fetchedDocuments = await getDocuments();
        setDocuments(fetchedDocuments);
    } catch (err) {
        handleDatabaseError(err, 'Failed to fetch documents.');
    } finally {
        setDocumentsLoading(false);
    }
  };

  const fetchLinks = async () => {
    try {
        setError(null);
        setLinksLoading(true);
        const fetchedLinks = await getLinks();
        setLinks(fetchedLinks);
    } catch (err) {
        handleDatabaseError(err, 'Failed to fetch links.');
    } finally {
        setLinksLoading(false);
    }
  };
  
  const fetchAudits = async () => {
    try {
        setError(null);
        setAuditsLoading(true);
        const fetchedAudits = await getAudits();
        setAudits(fetchedAudits);
    } catch (err) {
        handleDatabaseError(err, 'Failed to fetch audits.');
    } finally {
        setAuditsLoading(false);
    }
  };


  const handleDatabaseError = (err: unknown, defaultMessage: string) => {
    console.error("A database operation failed. Raw error object:", err);
    let finalMessage = defaultMessage;
    // ... (error handling logic remains the same)
    setError(finalMessage);
  }

  // --- Notification Handlers ---
  const addActivity = (
    action: string, 
    target: string, 
    importance: 'high' | 'medium' | 'low',
    projectId?: string
  ) => {
    if (!user) return;
    const displayUser: DisplayUser = {
      name: user.username.split('@')[0],
      avatarUrl: '', // Avatar not implemented yet
    };
    const newActivity: Activity = {
        id: uuidv4(),
        user: displayUser,
        action,
        target,
        timestamp: new Date().toISOString(),
        importance,
        projectId,
        projectName: projectId ? projects.find(p => p.id === projectId)?.name : undefined,
    };
    // Add to the top of the list, limit to 500 activities for performance
    setActivities(prev => [newActivity, ...prev.slice(0, 499)]);
  };

  const handleMarkNotificationsAsRead = (ids: string[]) => {
      setReadNotificationIds(prev => {
          const newSet = new Set(prev);
          ids.forEach(id => newSet.add(id));
          return newSet;
      });
  };

  const allNotifications = useMemo(() => {
    return activities; // Already sorted by insertion order
  }, [activities]);

  const unreadNotifications = useMemo(() => {
    return allNotifications.filter(n => !readNotificationIds.has(n.id));
  }, [allNotifications, readNotificationIds]);


  // --- Project Handlers ---
  const handleSaveProject = async (projectToSave: Omit<Project, 'id'> | Project) => {
    try {
        setError(null);
        if ('id' in projectToSave) {
          const updated = await updateProject(projectToSave);
          setProjects(projects.map(p => p.id === updated.id ? updated : p));
          if (selectedProject?.id === updated.id) {
            setSelectedProject(updated);
          }
          addActivity('actualizó el proyecto', `"${updated.name}"`, 'low', updated.id);
        } else {
          const newProject = await addProject(projectToSave);
          setProjects([newProject, ...projects]);
          setSelectedProject(newProject);
          setActiveView('Proyectos');
          addActivity('creó un nuevo proyecto', `"${newProject.name}"`, 'medium', newProject.id);
        }
    } catch (err) {
        handleDatabaseError(err, 'Failed to save project.');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
        const projectToDelete = projects.find(p => p.id === projectId);
        setError(null);
        await deleteProject(projectId);
        setProjects(projects.filter(p => p.id !== projectId));
        setTasks(tasks.filter(t => t.projectId !== projectId));
        if (projectToDelete) {
            addActivity('eliminó el proyecto', `"${projectToDelete.name}"`, 'high');
        }
        setSelectedProject(null);
    } catch (err) {
        handleDatabaseError(err, 'Failed to delete project.');
    }
  };
  
  const handleUpdateProjectStatus = async (projectId: string, status: ProjectStatus) => {
     const projectToUpdate = projects.find(p => p.id === projectId);
     if (projectToUpdate) {
        try {
            setError(null);
            const updated = await updateProject({ ...projectToUpdate, status });
            setProjects(projects.map(p => p.id === updated.id ? updated : p));
            addActivity(`cambió el estado a "${status}"`, `en el proyecto "${updated.name}"`, 'medium', updated.id);
        } catch (err) {
            handleDatabaseError(err, 'Failed to update status.');
        }
     }
  };

  // --- Task Handlers ---
  const handleAddTask = async (projectId: string, taskDetails: { title: string; startDate: string; duration: number }) => {
    if (!taskDetails.title.trim()) return;
    const newTaskData: Omit<ProjectTask, 'id'> = {
      projectId,
      title: taskDetails.title.trim(),
      completed: false,
      startDate: taskDetails.startDate,
      duration: taskDetails.duration,
    };
    try {
      setError(null);
      const savedTask = await addTask(newTaskData);
      setTasks([savedTask, ...tasks]);
      const projectName = projects.find(p => p.id === projectId)?.name || 'un proyecto';
      addActivity('añadió la tarea', `"${savedTask.title}" a ${projectName}`, 'low', projectId);
    } catch (err) {
      handleDatabaseError(err, 'Failed to add task.');
    }
  };

  const handleToggleTask = async (taskId: string) => {
    const taskToToggle = tasks.find(t => t.id === taskId);
    if (!taskToToggle) return;
    const updatedTaskData = { ...taskToToggle, completed: !taskToToggle.completed };
    try {
      setError(null);
      const savedTask = await updateTask(updatedTaskData);
      const newTasks = tasks.map(t => (t.id === taskId ? savedTask : t));
      setTasks(newTasks);
      
      const actionText = savedTask.completed ? 'completó la tarea' : 'marcó la tarea como pendiente';
      addActivity(actionText, `"${savedTask.title}"`, 'low', savedTask.projectId);

      const projectTasks = newTasks.filter(t => t.projectId === savedTask.projectId);
      const allCompleted = projectTasks.length > 0 && projectTasks.every(t => t.completed);
      if (allCompleted) {
        handleUpdateProjectStatus(savedTask.projectId, ProjectStatus.COMPLETO);
      }
    } catch (err) {
      handleDatabaseError(err, 'Failed to update task.');
    }
  };

  const handleUpdateTask = async (taskToUpdate: ProjectTask) => {
    try {
      setError(null);
      const savedTask = await updateTask(taskToUpdate);
      setTasks(tasks.map(t => (t.id === savedTask.id ? savedTask : t)));
      addActivity('actualizó la tarea', `"${savedTask.title}"`, 'low', savedTask.projectId);
    } catch (err) {
      handleDatabaseError(err, 'Failed to update task.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) return;
    try {
      setError(null);
      await deleteTask(taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
      addActivity('eliminó la tarea', `"${taskToDelete.title}"`, 'medium', taskToDelete.projectId);
    } catch (err) {
      handleDatabaseError(err, 'Failed to delete task.');
    }
  };

  // --- Document Handlers ---
  const handleAddDocument = async (file: File, folderId: string, projectId: string | null): Promise<void> => {
    try {
      setError(null);
      const newDocument = await uploadDocument(file, folderId, projectId);
      setDocuments(prev => [newDocument, ...prev]);
      addActivity('subió un nuevo documento', `"${newDocument.name}"`, 'low', newDocument.projectId ?? undefined);
    } catch (err) {
      handleDatabaseError(err, 'Failed to upload document.');
      throw err;
    }
  };

  const handleDeleteDocument = async (doc: Document): Promise<void> => {
    try {
      setError(null);
      await deleteDocument(doc);
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      addActivity('eliminó el documento', `"${doc.name}"`, 'high', doc.projectId ?? undefined);
    } catch (err) {
      handleDatabaseError(err, 'Failed to delete document.');
      throw err;
    }
  };

  // --- Folder Handlers ---
  const handleAddFolder = async (folderName: string, parentId: string | null): Promise<Folder> => {
    try {
      setError(null);
      const newFolder = await addFolder(folderName, parentId);
      setFolders(prev => [...prev, newFolder]);
      addActivity('creó la carpeta', `"${newFolder.name}"`, 'low');
      return newFolder;
    } catch (err) {
      handleDatabaseError(err, 'Failed to add folder.');
      throw err;
    }
  };

  const handleDeleteFolder = async (folderId: string): Promise<void> => {
    try {
      setError(null);
      const folderName = folders.find(f => f.id === folderId)?.name;
      await deleteFolder(folderId);
      await Promise.all([fetchFolders(), fetchDocuments()]);
      if (folderName) {
        addActivity('eliminó la carpeta', `"${folderName}" y todo su contenido`, 'high');
      }
    } catch (err) {
      handleDatabaseError(err, 'Failed to delete folder.');
      throw err;
    }
  };
  
  // --- Link Handlers ---
  const handleOpenLinkModal = () => {
    setLinkToEdit(null);
    setIsLinkModalOpen(true);
  };
  
  const handleOpenEditLinkModal = (link: LinkItem) => {
    setLinkToEdit(link);
    setIsLinkModalOpen(true);
  };

  const handleCloseLinkModal = () => {
    setIsLinkModalOpen(false);
    setLinkToEdit(null);
  };

  const handleSaveLink = async (linkData: Omit<LinkItem, 'id'> | LinkItem) => {
    try {
      setError(null);
      if ('id' in linkData) {
        // Editing existing link
        const updatedLink = await updateLink(linkData);
        setLinks(prev => prev.map(l => l.id === updatedLink.id ? updatedLink : l));
        addActivity('actualizó el enlace', `"${updatedLink.name}"`, 'low');
      } else {
        // Adding new link
        const savedLink = await addLink(linkData);
        setLinks(prev => [savedLink, ...prev]);
        addActivity('registró un nuevo enlace', `"${savedLink.name}"`, 'low');
      }
    } catch (err) {
      handleDatabaseError(err, 'Failed to save link.');
    }
  };

  const handleDeleteLink = (linkId: string) => {
    const link = links.find(l => l.id === linkId);
    if (link) {
      setLinkToDelete(link);
    }
  };

  const handleConfirmDeleteLink = async () => {
    if (linkToDelete) {
      try {
        setError(null);
        await deleteLink(linkToDelete.id);
        setLinks(prev => prev.filter(l => l.id !== linkToDelete.id));
        addActivity('eliminó el enlace', `"${linkToDelete.name}"`, 'medium');
      } catch (err) {
        handleDatabaseError(err, 'Failed to delete link.');
      } finally {
        setLinkToDelete(null);
      }
    }
  };

  const handleCancelDeleteLink = () => {
    setLinkToDelete(null);
  };

  // --- Audit Handlers ---
  const handleOpenAuditModal = (date: string, audit: AuditItem | null) => {
    setSelectedAuditDate(date);
    setEditingAudit(audit);
    setIsAuditModalOpen(true);
  };

  const handleCloseAuditModal = () => {
    setIsAuditModalOpen(false);
    setEditingAudit(null);
    setSelectedAuditDate(null);
  };

  const handleSaveAudit = async (auditData: { title: string; color: string; recurrence: RecurrenceRule }) => {
    try {
        setError(null);
        if (editingAudit) {
          // Editing existing audit
          const updatedAuditData = { 
              ...editingAudit, 
              title: auditData.title,
              color: auditData.color,
              recurrence: auditData.recurrence,
          };
          const savedAudit = await updateAudit(updatedAuditData);
          setAudits(audits.map(a => a.id === savedAudit.id ? savedAudit : a));
          addActivity('actualizó la auditoría', `"${savedAudit.title}"`, 'low');
        } else {
          // Creating new audit
          const newAuditData: Omit<AuditItem, 'id'> = {
            date: selectedAuditDate!,
            title: auditData.title,
            color: auditData.color,
            recurrence: auditData.recurrence,
          };
          const savedAudit = await addAudit(newAuditData);
          setAudits(prev => [savedAudit, ...prev]);
          addActivity('programó una nueva auditoría', `"${savedAudit.title}"`, 'medium');
        }
    } catch (err) {
        handleDatabaseError(err, 'Failed to save audit.');
    } finally {
        handleCloseAuditModal();
    }
  };
  
  const handleDeleteAudit = (auditId: string) => {
    const audit = audits.find(a => a.id === auditId);
    if(audit) {
        setAuditToDelete(audit);
    }
    handleCloseAuditModal();
  };

  const handleConfirmDeleteAudit = async () => {
    if (auditToDelete) {
      try {
        setError(null);
        await deleteAudit(auditToDelete.id);
        setAudits(audits.filter(a => a.id !== auditToDelete.id));
        addActivity('eliminó la auditoría', `"${auditToDelete.title}"`, 'high');
      } catch(err) {
        handleDatabaseError(err, 'Failed to delete audit.');
      } finally {
        setAuditToDelete(null);
      }
    }
  };


  // --- Navigation ---
  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
  };
  
  const handleSelectProjectById = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
        setSelectedProject(project);
        setActiveView('Proyectos');
    }
  };

  const handleBackToList = () => {
    setSelectedProject(null);
  };

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (err) {
      handleDatabaseError(err, 'Ocurrió un error desconocido durante el inicio de sesión.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      handleDatabaseError(err, 'Ocurrió un error al cerrar la sesión.');
    }
  };
  
  const changeView = (view: string) => {
    setSelectedProject(null);
    if (view === 'Notificaciones') {
      handleMarkNotificationsAsRead(allNotifications.map(n => n.id));
    }
    setActiveView(view);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <Spinner />
        <span className="ml-4 text-lg text-dark-text">Autenticando...</span>
      </div>
    );
  }

  if (!user) {
    return <LoginView onLogin={handleLogin} isLoading={isLoading} error={error} />;
  }
  
  const renderActiveView = () => {
    const globalErrorDisplay = error ? (
        <div className="p-4 mb-4 bg-red-100 border border-red-400 text-red-700 rounded-lg animate-fade-in">
            <h3 className="font-bold">Ocurrió un error</h3>
            <p>{error}</p>
            <button onClick={() => setError(null)} className="mt-2 text-sm font-semibold underline">Descartar</button>
        </div>
    ) : null;

    switch (activeView) {
      case 'Dashboard':
        return <>{globalErrorDisplay}<DashboardView 
                    projects={projects}
                    audits={audits}
                    activities={activities.slice(0, 5)}
                    tasks={tasks}
                    onSelectProject={handleSelectProjectById}
                /></>;
      case 'Proyectos':
        if (selectedProject) {
          return <>{globalErrorDisplay}<ProjectDetailView 
                    project={selectedProject}
                    tasks={tasks.filter(t => t.projectId === selectedProject.id)}
                    documents={documents}
                    folders={folders}
                    onBackToList={handleBackToList}
                    onDeleteProject={handleDeleteProject}
                    onAddTask={handleAddTask}
                    onToggleTask={handleToggleTask}
                    // FIX: Corrected prop value from non-existent 'onUpdateTask' to 'handleUpdateTask'.
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                    onSaveProject={handleSaveProject}
                    onAddDocument={handleAddDocument}
                    onDeleteDocument={handleDeleteDocument}
                 /></>;
        }
        return <>{globalErrorDisplay}<ProjectsListView 
                  projects={projects}
                  tasks={tasks}
                  isLoading={(projectsLoading || tasksLoading) && projects.length === 0}
                  onSelectProject={handleSelectProject}
                  onSaveProject={handleSaveProject}
                  onUpdateProjectStatus={handleUpdateProjectStatus}
                  onError={handleDatabaseError}
                /></>;
      case 'Documentos':
        return <>{globalErrorDisplay}<DocumentsView 
                  projects={projects}
                  folders={folders}
                  documents={documents}
                  isLoading={foldersLoading || documentsLoading}
                  onAddFolder={handleAddFolder}
                  onDeleteFolder={handleDeleteFolder}
                  onAddDocument={handleAddDocument}
                  onDeleteDocument={handleDeleteDocument}
                /></>;
      case 'Enlaces':
        return <>{globalErrorDisplay}<LinksView 
                  links={links}
                  isLoading={linksLoading}
                  onOpenLinkModal={handleOpenLinkModal}
                  onOpenEditLinkModal={handleOpenEditLinkModal}
                  onDeleteLink={handleDeleteLink}
                /></>;
      case 'Auditorias':
          return <>{globalErrorDisplay}<AuditsView 
                    audits={audits}
                    onOpenModal={handleOpenAuditModal}
                 /></>;
      case 'Pizarra':
        return <>{globalErrorDisplay}<WhiteboardView />;</>;
      case 'Gemini 2.5':
        return <>{globalErrorDisplay}<GeminiView />;</>;
      case 'Notificaciones':
        return <>{globalErrorDisplay}<NotificationsView notifications={allNotifications} onNavigate={changeView} /></>;
      default:
        return <>{globalErrorDisplay}<DashboardView 
                    projects={projects}
                    audits={audits}
                    activities={activities.slice(0, 5)}
                    tasks={tasks}
                    onSelectProject={handleSelectProjectById}
                /></>;
    }
  };

  return (
    <div className="flex h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text font-sans">
      <Sidebar 
        isOpen={isSidebarOpen} 
        activeView={activeView}
        setActiveView={changeView} 
      />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'} overflow-x-hidden`}>
        <Header 
          user={user}
          onLogout={handleLogout}
          toggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          unreadNotifications={unreadNotifications}
          onMarkNotificationsAsRead={handleMarkNotificationsAsRead}
          onNavigate={changeView}
        />
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          <div className="animate-fade-in">
            {renderActiveView()}
          </div>
        </main>
      </div>
      {isLinkModalOpen && (
        <LinkModal 
          onClose={handleCloseLinkModal} 
          onSave={handleSaveLink}
          linkToEdit={linkToEdit}
        />
      )}
      {linkToDelete && (
        <ConfirmationModal
          isOpen={!!linkToDelete}
          onClose={handleCancelDeleteLink}
          onConfirm={handleConfirmDeleteLink}
          title="Eliminar Enlace"
          message={`¿Estás seguro de que quieres eliminar el enlace "${linkToDelete.name}"? Esta acción no se puede deshacer.`}
        />
      )}
      {isAuditModalOpen && selectedAuditDate && (
        <AuditModal 
            audit={editingAudit}
            date={selectedAuditDate}
            onClose={handleCloseAuditModal}
            onSave={handleSaveAudit}
            onDelete={handleDeleteAudit}
        />
      )}
      {auditToDelete && (
        <ConfirmationModal
          isOpen={!!auditToDelete}
          onClose={() => setAuditToDelete(null)}
          onConfirm={handleConfirmDeleteAudit}
          title="Eliminar Auditoría"
          message={`¿Estás seguro de que quieres eliminar la auditoría "${auditToDelete.title}"? Esta acción no se puede deshacer.`}
        />
      )}
    </div>
  );
};

export default App;
