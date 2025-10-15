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
import { User, Project, ProjectTask, ProjectStatus, Activity, Folder, Document, DisplayUser, LinkItem, AuditItem, RecurrenceRule, ThemePreferences } from './types';
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
  getAvatarBlobUrl,
  updateAvatar,
  getNotifications,
  addNotification,
  getUserThemePreferences,
  upsertUserThemePreferences,
  markNotificationReadStatus,
  markAllNotificationsAsRead,
  subscribeToNotifications,
  getGeminiApiKey,
} from './services/supabaseService';
import Spinner from './components/Spinner';
import { DoomPlayer } from './components/DoomPlayer';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAvatarLoading, setIsAvatarLoading] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState('Dashboard');

  // --- Gemini API Key State ---
  const [geminiApiKey, setGeminiApiKey] = useState<string | null>(null);
  const [isApiKeyLoading, setIsApiKeyLoading] = useState<boolean>(true);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);


  // --- Easter Egg State ---
  const [isDoomMode, setIsDoomMode] = useState(false);
  const [secretClickCount, setSecretClickCount] = useState(0);

  // --- Theme State ---
  const [theme, setTheme] = useState('dark'); // 'light', 'dark', 'custom'
  const [customThemeColors, setCustomThemeColors] = useState<Record<string, string> | null>(null);

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

  // --- Easter Egg Handlers ---
  const handleSecretTrigger = () => {
    const newCount = secretClickCount + 1;
    if (newCount >= 9) {
      setIsDoomMode(true);
      setSecretClickCount(0);
    } else {
      setSecretClickCount(newCount);
    }
  };

  const handleDoomExit = () => {
    setIsDoomMode(false);
  };

  // Effect to clean up blob URLs to prevent memory leaks
  useEffect(() => {
    let currentUrl = user?.avatarUrl;
    return () => {
        if (currentUrl && currentUrl.startsWith('blob:')) {
            URL.revokeObjectURL(currentUrl);
        }
    };
  }, [user?.avatarUrl]);

  // Effect to apply the current theme to the document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark', 'theme-custom');
    root.classList.add(`theme-${theme}`);
    
    // Manage custom theme style tag
    const customStyleTagId = 'custom-theme-style';
    let styleTag = document.getElementById(customStyleTagId);

    if (theme === 'custom' && customThemeColors) {
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = customStyleTagId;
        document.head.appendChild(styleTag);
      }
      const customCss = `
        html.theme-custom {
          ${Object.entries(customThemeColors).map(([key, value]) => `${key}: ${value};`).join('\n')}
        }
      `;
      styleTag.innerHTML = customCss;
    } else if (styleTag) {
      // Clean up if not in custom theme
      styleTag.innerHTML = '';
    }
    
  }, [theme, customThemeColors]);

  // Effect to manage auth state changes from Supabase
  useEffect(() => {
    setAuthLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        const currentUser = session?.user;
        
        if (currentUser) {
            (async () => {
                let avatarBlobUrl: string | undefined = undefined;
                try {
                    const [avatarPath, themePrefs] = await Promise.all([
                        currentUser.user_metadata?.avatar_path,
                        getUserThemePreferences()
                    ]);
                    
                    if (avatarPath) {
                        const blobUrl = await getAvatarBlobUrl(avatarPath);
                        if (blobUrl) avatarBlobUrl = blobUrl;
                    }
                    if (themePrefs) {
                        setTheme(themePrefs.theme_name);
                        if (themePrefs.theme_name === 'custom' && themePrefs.custom_theme_colors) {
                            setCustomThemeColors(themePrefs.custom_theme_colors as Record<string, string>);
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch user data on auth change, proceeding without it.", e);
                } finally {
                    setUser({ 
                        id: currentUser.id, 
                        username: currentUser.email || 'Usuario',
                        avatarUrl: avatarBlobUrl,
                        avatarPath: currentUser.user_metadata?.avatar_path,
                    });
                }
            })();
        } else {
            setUser(null);
            setAuthLoading(false); 
        }
    });

    return () => {
        subscription.unsubscribe();
    };
  }, []);

  // Effect to fetch data when a user logs in, or clear data on logout.
  useEffect(() => {
    if (user) {
        // User is logged in, fetch all data in parallel.
        const fetchData = async () => {
            try {
              await Promise.all([
                  fetchProjects(),
                  fetchTasks(),
                  fetchFolders(),
                  fetchDocuments(),
                  fetchLinks(),
                  fetchAudits(),
                  fetchNotifications(),
              ]);
            } catch (err) {
              console.error("Failed to fetch primary data", err);
            }
        };

        const fetchApiKey = async () => {
            setIsApiKeyLoading(true);
            setApiKeyError(null);
            try {
                const key = await getGeminiApiKey();
                setGeminiApiKey(key);
            } catch (err) {
                setApiKeyError(err instanceof Error ? err.message : 'Error desconocido al obtener la clave de IA.');
            } finally {
                setIsApiKeyLoading(false);
            }
        };

        Promise.all([fetchData(), fetchApiKey()]).finally(() => {
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
        setActivities([]);
        setSelectedProject(null);
        setActiveView('Dashboard');
        setGeminiApiKey(null);
        setApiKeyError(null);
    }
  }, [user]); // This effect runs whenever the user object changes.

  // Effect for real-time notifications
  useEffect(() => {
    if (!user) return;

    const handleNewNotification = async (notification: Activity) => {
        // Don't show a notification for an action the current user just took.
        // The `addActivity` function which triggers notifications already refreshes the list via `fetchNotifications`,
        // so this real-time handler would cause a duplicate.
        if (notification.user.id === user.id) {
            return;
        }

        let avatarBlobUrl = '';
        if (notification.user.avatarUrl) { // This is the path from the payload
            avatarBlobUrl = await getAvatarBlobUrl(notification.user.avatarUrl) || '';
        }

        const notificationWithAvatar: Activity = {
            ...notification,
            user: {
                ...notification.user,
                avatarUrl: avatarBlobUrl,
            },
        };

        // Add to the top of the list
        setActivities(prev => [notificationWithAvatar, ...prev]);
    };

    const channel = subscribeToNotifications(handleNewNotification);

    return () => {
        supabase.removeChannel(channel);
    };
  }, [user]);
  
  // This effect synchronizes project status based on task progress and start date.
  useEffect(() => {
    const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const projectsToUpdate: { project: Project; newStatus: ProjectStatus }[] = [];

    projects.forEach(project => {
      const projectTasks = tasks.filter(t => t.projectId === project.id);
      const totalTasks = projectTasks.length;
      const completedTasks = projectTasks.filter(t => t.completed).length;
      const allTasksCompleted = totalTasks > 0 && totalTasks === completedTasks;
      
      const startDate = new Date(project.startDate + 'T00:00:00');
      const timeSinceStart = today.getTime() - startDate.getTime();

      let computedStatus: ProjectStatus;

      if (allTasksCompleted) {
        if (project.status !== ProjectStatus.COMPLETO) {
            computedStatus = ProjectStatus.EN_REVISION;
        } else {
            computedStatus = project.status;
        }
      } else {
          if (completedTasks === 0 && timeSinceStart < oneWeekInMs) {
              computedStatus = ProjectStatus.NUEVO;
          } else {
              computedStatus = ProjectStatus.EN_PROGRESO;
          }
      }
      
      if (project.status !== computedStatus) {
        projectsToUpdate.push({ project, newStatus: computedStatus });
      }
    });

    if (projectsToUpdate.length > 0) {
      const updatePromises = projectsToUpdate.map(({ project, newStatus }) =>
        updateProject({ ...project, status: newStatus })
      );

      Promise.all(updatePromises)
        .then(updatedProjectsFromDb => {
            const successfulUpdates = updatedProjectsFromDb.filter((p): p is Project => p !== null);

            if (successfulUpdates.length > 0) {
                setProjects(currentProjects => {
                    const projectsMap = new Map(currentProjects.map(p => [p.id, p]));
                    successfulUpdates.forEach(up => projectsMap.set(up.id, up));
                    return Array.from(projectsMap.values()).sort((a: Project, b: Project) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
                });

                successfulUpdates.forEach(p => {
                    const originalProject = projects.find(op => op.id === p.id);
                    if (originalProject && originalProject.status !== p.status) {
                        addActivity(`cambió el estado a "${p.status}"`, `en el proyecto "${p.name}"`, 'medium', p.id);
                    }
                });
            }
        })
        .catch(err => {
            handleDatabaseError(err, 'Failed to batch update project statuses.');
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, projects]);

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
  
  const fetchNotifications = async () => {
    try {
        const notificationsFromDb = await getNotifications();
        
        const avatarUrlMap = new Map<string, string>();
        const uniqueAvatarPaths = [...new Set(notificationsFromDb.map(n => n.user.avatarUrl).filter(Boolean))];

        await Promise.all(uniqueAvatarPaths.map(async (path) => {
            if (path && !avatarUrlMap.has(path)) {
              const blobUrl = await getAvatarBlobUrl(path);
              if (blobUrl) {
                  avatarUrlMap.set(path, blobUrl);
              }
            }
        }));

        const notificationsWithAvatars = notificationsFromDb.map(n => ({
            ...n,
            user: {
                ...n.user,
                avatarUrl: avatarUrlMap.get(n.user.avatarUrl) || '',
            },
        }));
        
        setActivities(notificationsWithAvatars);
    } catch (err) {
        handleDatabaseError(err, 'Failed to fetch notifications.');
    }
  };


  const handleDatabaseError = (err: unknown, defaultMessage: string) => {
    console.error("A database operation failed. Raw error object:", err);
    let finalMessage = defaultMessage;
    // ... (error handling logic remains the same)
    setError(finalMessage);
  }

  const handleRefreshData = async () => {
    setError(null);
    try {
      // The individual fetch functions will set their own loading states,
      // which will be displayed in their respective views.
      await Promise.all([
        fetchProjects(),
        fetchTasks(),
        fetchFolders(),
        fetchDocuments(),
        fetchLinks(),
        fetchAudits(),
        fetchNotifications(),
      ]);
    } catch (err) {
      handleDatabaseError(err, 'Ocurrió un error al refrescar los datos.');
    }
  };

  // --- Theme Handler ---
  const handleThemeChange = async (newTheme: string, customColors?: Record<string, string> | null) => {
      if (!user) return;
      try {
          const oldTheme = theme;
          const oldCustomColors = customThemeColors;
          
          setTheme(newTheme);
          if (newTheme === 'custom' && customColors) {
              setCustomThemeColors(customColors);
          }

          await upsertUserThemePreferences(user.id, newTheme, customColors);
      } catch (err) {
          handleDatabaseError(err, 'Failed to save theme preferences.');
          // Revert on failure
          setTheme(theme);
          setCustomThemeColors(customThemeColors);
      }
  };

  // --- Notification Handlers ---
  const addActivity = async (
    action: string, 
    target: string, 
    importance: 'high' | 'medium' | 'low',
    projectId?: string
  ) => {
    if (!user) return;

    try {
      const projectName = projectId ? projects.find(p => p.id === projectId)?.name : undefined;
      
      await addNotification(
        action,
        target,
        importance,
        projectId,
        projectName
      );

      // Re-fetch the entire notification list to ensure perfect consistency
      // This solves potential race conditions and state mismatches.
      await fetchNotifications();
    } catch (err) {
      handleDatabaseError(err, 'Failed to save activity.');
    }
  };

  const handleMarkActivityAsRead = async (activityId: string, read: boolean) => {
    const originalActivities = activities;
    // Optimistic update
    setActivities(prev => 
        prev.map(act => act.id === activityId ? { ...act, isRead: read } : act)
    );
    try {
        await markNotificationReadStatus(activityId, read);
    } catch (err) {
        handleDatabaseError(err, 'Failed to update notification status.');
        // Revert on error
        setActivities(originalActivities);
    }
  };

  const handleMarkAllAsRead = async () => {
    const originalActivities = activities;
    const unreadIds = activities.filter(a => !a.isRead).map(a => a.id);
    if (unreadIds.length === 0) return;

    // Optimistic update
    setActivities(prev => prev.map(act => ({ ...act, isRead: true })));
    
    try {
        await markAllNotificationsAsRead(unreadIds);
    } catch (err) {
        handleDatabaseError(err, 'Failed to mark all notifications as read.');
        // Revert on error
        setActivities(originalActivities);
    }
  };

  // --- Project Handlers ---
  const handleSaveProject = async (projectToSave: Omit<Project, 'id'> | Project) => {
    try {
        setError(null);
        if ('id' in projectToSave) {
          const updated = await updateProject(projectToSave);
          if (updated) { // Check if update was successful
            setProjects(projects.map(p => p.id === updated.id ? updated : p));
            if (selectedProject?.id === updated.id) {
              setSelectedProject(updated);
            }
            await addActivity('actualizó el proyecto', `"${updated.name}"`, 'low', updated.id);
          }
        } else {
          const newProject = await addProject(projectToSave);
          setProjects([newProject, ...projects]);
          setSelectedProject(newProject);
          setActiveView('Proyectos');
          await addActivity('creó un nuevo proyecto', `"${newProject.name}"`, 'medium', newProject.id);
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
            await addActivity('eliminó el proyecto', `"${projectToDelete.name}"`, 'high');
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
            if (updated) { // Check if update was successful
              setProjects(projects.map(p => p.id === updated.id ? updated : p));
              await addActivity(`cambió el estado a "${status}"`, `en el proyecto "${updated.name}"`, 'medium', updated.id);
            }
        } catch (err) {
            handleDatabaseError(err, 'Failed to update status.');
        }
     }
  };

  // --- Task Handlers ---
  const handleAddTask = async (projectId: string, taskDetails: { title: string; startDate: string; duration: number }, parentId: string | null = null) => {
    if (!taskDetails.title.trim()) return;
    const newTaskData: Omit<ProjectTask, 'id'> = {
      projectId,
      title: taskDetails.title.trim(),
      completed: false,
      startDate: taskDetails.startDate,
      duration: taskDetails.duration,
      parentId,
    };
    try {
      setError(null);
      const savedTask = await addTask(newTaskData);
      setTasks([savedTask, ...tasks]);
      const projectName = projects.find(p => p.id === projectId)?.name || 'un proyecto';
      await addActivity('añadió la tarea', `"${savedTask.title}" a ${projectName}`, 'low', projectId);
    } catch (err) {
      handleDatabaseError(err, 'Failed to add task.');
    }
  };

  const handleToggleTask = async (taskId: string) => {
    const originalTasks = tasks;
    const taskToToggle = tasks.find(t => t.id === taskId);
    if (!taskToToggle) return;

    const newCompletedStatus = !taskToToggle.completed;

    // Find all descendant IDs recursively
    const descendantIds = new Set<string>();
    const findDescendants = (parentId: string) => {
        tasks.forEach(task => {
            if (task.parentId === parentId) {
                descendantIds.add(task.id);
                findDescendants(task.id);
            }
        });
    };
    findDescendants(taskId);

    const idsToUpdate = new Set([taskId, ...descendantIds]);
    
    // Prepare updated tasks for state and DB
    const tasksToUpdateInDb: ProjectTask[] = [];
    const newTasksState = tasks.map(t => {
        if (idsToUpdate.has(t.id)) {
            const updated = { ...t, completed: newCompletedStatus };
            tasksToUpdateInDb.push(updated);
            return updated;
        }
        return t;
    });

    try {
        setError(null);
        // Update local state immediately for responsiveness
        setTasks(newTasksState);

        // Update all affected tasks in the database
        await Promise.all(tasksToUpdateInDb.map(task => updateTask(task)));

        // Add activity log for the primary toggled task
        const actionText = newCompletedStatus ? 'completó la tarea' : 'marcó la tarea como pendiente';
        await addActivity(actionText, `"${taskToToggle.title}"`, 'low', taskToToggle.projectId);
        
        // Add a summary activity if sub-tasks were also changed
        if (tasksToUpdateInDb.length > 1) {
            await addActivity(`actualizó el estado de ${tasksToUpdateInDb.length - 1} sub-tarea(s)`, `asociada(s) a "${taskToToggle.title}"`, 'low', taskToToggle.projectId);
        }
    } catch (err) {
        handleDatabaseError(err, 'Failed to update task(s).');
        // Revert state on error to maintain consistency
        setTasks(originalTasks);
    }
  };

  const handleUpdateTask = async (taskToUpdate: ProjectTask) => {
    try {
      setError(null);
      const savedTask = await updateTask(taskToUpdate);
      setTasks(tasks.map(t => (t.id === savedTask.id ? savedTask : t)));
      await addActivity('actualizó la tarea', `"${savedTask.title}"`, 'low', savedTask.projectId);
    } catch (err) {
      handleDatabaseError(err, 'Failed to update task.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) return;

    try {
        setError(null);
        await deleteTask(taskId); // The service now handles recursive deletion

        // Update local state to remove the task and all its descendants
        const descendantIds = new Set<string>();
        const findDescendants = (parentId: string) => {
            tasks.forEach(task => {
                if (task.parentId === parentId) {
                    descendantIds.add(task.id);
                    findDescendants(task.id);
                }
            });
        };
        findDescendants(taskId);
        
        const idsToDelete = new Set([taskId, ...descendantIds]);
        setTasks(prevTasks => prevTasks.filter(t => !idsToDelete.has(t.id)));

        await addActivity('eliminó la tarea', `"${taskToDelete.title}"`, 'medium', taskToDelete.projectId);
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
      await addActivity('subió un nuevo documento', `"${newDocument.name}"`, 'low', newDocument.projectId ?? undefined);
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
      await addActivity('eliminó el documento', `"${doc.name}"`, 'high', doc.projectId ?? undefined);
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
      await addActivity('creó la carpeta', `"${newFolder.name}"`, 'low');
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
        await addActivity('eliminó la carpeta', `"${folderName}" y todo su contenido`, 'high');
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
        await addActivity('actualizó el enlace', `"${updatedLink.name}"`, 'low');
      } else {
        // Adding new link
        const savedLink = await addLink(linkData);
        setLinks(prev => [savedLink, ...prev]);
        await addActivity('registró un nuevo enlace', `"${savedLink.name}"`, 'low');
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
        await addActivity('eliminó el enlace', `"${linkToDelete.name}"`, 'medium');
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
          await addActivity('actualizó la auditoría', `"${savedAudit.title}"`, 'low');
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
          await addActivity('programó una nueva auditoría', `"${savedAudit.title}"`, 'medium');
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
        await addActivity('eliminó la auditoría', `"${auditToDelete.title}"`, 'high');
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

  const handleUpdateAvatar = async (file: File) => {
    if (!user) return;
    
    if (user.avatarUrl && user.avatarUrl.startsWith('blob:')) {
        URL.revokeObjectURL(user.avatarUrl);
    }

    setIsAvatarLoading(true);
    setError(null);
    try {
      const newAvatarBlobUrl = await updateAvatar(file);
      setUser(prevUser => prevUser ? { ...prevUser, avatarUrl: newAvatarBlobUrl } : null);
      await addActivity('actualizó su foto de perfil', '', 'low');
    } catch (err) {
      handleDatabaseError(err, 'No se pudo actualizar la foto de perfil.');
    } finally {
      setIsAvatarLoading(false);
    }
  };
  
  const changeView = (view: string) => {
    setSelectedProject(null);
    setActiveView(view);
    // Trigger a full data refresh every time the main view changes.
    handleRefreshData();
  };

  const unreadActivities = useMemo(() => activities.filter(a => !a.isRead), [activities]);

  if (isDoomMode) {
    return <DoomPlayer onExit={handleDoomExit} />;
  }

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
                  geminiApiKey={geminiApiKey}
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
        return <>{globalErrorDisplay}<GeminiView 
                  geminiApiKey={geminiApiKey}
                  isApiKeyLoading={isApiKeyLoading}
                  apiKeyError={apiKeyError}
                /></>;
      case 'Notificaciones':
        return <>{globalErrorDisplay}<NotificationsView 
                  notifications={activities} 
                  onNavigate={changeView} 
                  onMarkAsRead={handleMarkActivityAsRead}
                /></>;
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
        isOpen={true} 
        activeView={activeView}
        setActiveView={changeView}
        currentTheme={theme}
        onThemeChange={handleThemeChange}
        onSecretTrigger={handleSecretTrigger}
      />
      <div className={`flex-1 flex flex-col transition-all duration-300 ml-64 overflow-x-hidden`}>
        <Header 
          user={user}
          onLogout={handleLogout}
          notifications={unreadActivities}
          onNavigate={changeView}
          onUpdateAvatar={handleUpdateAvatar}
          isAvatarLoading={isAvatarLoading}
          onMarkAsRead={(id) => handleMarkActivityAsRead(id, true)}
          onMarkAllAsRead={handleMarkAllAsRead}
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