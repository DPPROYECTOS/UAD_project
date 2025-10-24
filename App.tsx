import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import WhiteboardView from './views/WhiteboardView';
import AdminView from './views/AdminView';
import GamesView from './views/GamesView';
import SecretCodeModal from './components/SecretCodeModal';
import { User, Project, ProjectTask, ProjectStatus, Activity, Folder, Document, LinkItem, AuditItem, RecurrenceRule, ToastNotification, UserPermissions } from './types';
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
  updateAvatar,
  getUserThemePreferences,
  upsertUserThemePreferences,
  getGeminiApiKey,
  getUserPermissions,
} from './services/supabaseService';
import Spinner from './components/Spinner';
import { GamePlayer } from './components/GamePlayer';
import { CheckCircleIcon, XCircleIcon } from './components/Icons';
import FloatingRecorder from './components/FloatingRecorder';
import ToastContainer from './components/ToastContainer';

declare const lamejs: any;

type RecordingStatus = 'idle' | 'recording' | 'paused';
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

/**
 * Converts a WebM audio Blob to MP3 format using lamejs.
 * @param {Blob} webmBlob - The recorded audio Blob in WebM format.
 * @returns {Promise<Blob>} A new Blob in MP3 format.
 */
const convertWebMToMp3 = async (webmBlob: Blob): Promise<Blob> => {
  const audioContext = new AudioContext();
  const arrayBuffer = await webmBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const pcmSamples = audioBuffer.getChannelData(0);

  const samples = new Int16Array(pcmSamples.length);
  for (let i = 0; i < pcmSamples.length; i++) {
    samples[i] = pcmSamples[i] * 32767;
  }

  const mp3Encoder = new lamejs.Mp3Encoder(1, audioBuffer.sampleRate, 128); // 1 channel, 128kbps
  const mp3Data = [];
  const sampleBlockSize = 1152;

  for (let i = 0; i < samples.length; i += sampleBlockSize) {
    const sampleChunk = samples.subarray(i, i + sampleBlockSize);
    const mp3buf = mp3Encoder.encodeBuffer(sampleChunk);
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }
  const mp3buf = mp3Encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(mp3buf);
  }

  return new Blob(mp3Data, { type: 'audio/mpeg' });
};

// --- Audit Notification Helpers ---
const toYMDString = (date: Date) => {
  return date.toISOString().split('T')[0];
};

const generateOccurrences = (
  audit: AuditItem,
  viewStart: Date,
  viewEnd: Date
): { date: Date; audit: AuditItem }[] => {
  const results: { date: Date; audit: AuditItem }[] = [];
  const startDate = new Date(audit.date + 'T00:00:00Z');

  if (audit.recurrence.type === 'none') {
    if (startDate >= viewStart && startDate <= viewEnd) {
      results.push({ date: startDate, audit });
    }
    return results;
  }

  let current = new Date(startDate.getTime());

  if (current < viewStart) {
      const { type, interval = 1, unit = 'days' } = audit.recurrence;
      if (type === 'weekly') {
          const diffWeeks = Math.floor((viewStart.getTime() - current.getTime()) / (1000 * 60 * 60 * 24 * 7));
          current.setUTCDate(current.getUTCDate() + Math.max(0, diffWeeks -1) * 7);
      } else if (type === 'monthly') {
           const diffMonths = (viewStart.getUTCFullYear() - current.getUTCFullYear()) * 12 + (viewStart.getUTCMonth() - current.getUTCMonth());
           current.setUTCMonth(current.getUTCMonth() + Math.max(0, diffMonths -1));
      }
  }

  while (current <= viewEnd) {
    if (current >= viewStart) {
      results.push({ date: current, audit });
    }
    
    if (results.length > 50) break; 

    const { type, interval = 1, unit = 'days' } = audit.recurrence;
    let nextDate = new Date(current.getTime());
    switch (type) {
      case 'weekly': nextDate.setUTCDate(nextDate.getUTCDate() + 7); break;
      case 'monthly': nextDate.setUTCMonth(nextDate.getUTCMonth() + 1); break;
      case 'custom':
        switch (unit) {
          case 'days': nextDate.setUTCDate(nextDate.getUTCDate() + interval); break;
          case 'weeks': nextDate.setUTCDate(nextDate.getUTCDate() + interval * 7); break;
          case 'months': nextDate.setUTCMonth(nextDate.getUTCMonth() + interval); break;
        }
        break;
      default: return results;
    }
    
    if(nextDate.getTime() === current.getTime()) break;
    current = nextDate;
  }
  return results;
};

const games = {
  doom: {
    title: 'DOOM',
    url: 'https://silentspacemarine.com/',
  },
  ctr: {
    title: 'Crash Team Racing',
    url: 'https://www.minijuegos.com/embed/crash-team-racing',
  },
  cb1: {
    title: 'Crash Bandicoot',
    url: 'https://www.minijuegos.com/embed/crash-bandicoot',
  },
  bc: {
    title: 'Battle City',
    url: 'https://www.minijuegos.com/embed/battle-city',
  },
  msx: {
    title: 'Metal Slug X',
    url: 'https://www.minijuegos.com/embed/metal-slug-x',
  },
};


const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAvatarLoading, setIsAvatarLoading] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState('Dashboard');

  // --- NEW: User Permissions State ---
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);

  // --- Gemini API Key State ---
  const [geminiApiKey, setGeminiApiKey] = useState<string | null>(null);
  const [isApiKeyLoading, setIsApiKeyLoading] = useState<boolean>(true);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);


  // --- Game & Easter Egg State ---
  const [activeGame, setActiveGame] = useState<keyof typeof games | null>(null);
  const [secretClickCount, setSecretClickCount] = useState(0);

  // --- NEW Secret Games Section State ---
  const [secretSequence, setSecretSequence] = useState<string[]>([]);
  const [isCodeModalVisible, setIsCodeModalVisible] = useState(false);
  const [isGamesSectionUnlocked, setIsGamesSectionUnlocked] = useState(false);
  const [hideGamesClickCount, setHideGamesClickCount] = useState(0);


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
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());

  // --- Recorder State (Centralized) ---
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadMessage, setUploadMessage] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  
  // --- Toast Notification State ---
  const [toastNotifications, setToastNotifications] = useState<ToastNotification[]>([]);

  const addToast = (title: string, message: string, type: ToastNotification['type'] = 'warning') => {
      const id = uuidv4();
      setToastNotifications(prev => [...prev, { id, title, message, type }]);
  };

  const removeToast = (id: string) => {
      setToastNotifications(prev => prev.filter(n => n.id !== id));
  };


  // --- Game & Easter Egg Handlers ---
  const handleSecretTrigger = () => {
    // New sequence logic
    handleSecretSequenceStep('logo');

    // Original Doom logic
    const newCount = secretClickCount + 1;
    if (newCount >= 9) {
      handleGameEnter('doom');
      setSecretClickCount(0);
    } else {
      setSecretClickCount(newCount);
    }
  };

  const handleGameEnter = (gameId: keyof typeof games) => {
    setActiveGame(gameId);
  };
  
  const handleGameExit = () => {
    setActiveGame(null);
  };

  const handleHideGamesTrigger = () => {
    if (isGamesSectionUnlocked) {
      const newCount = hideGamesClickCount + 1;
      setHideGamesClickCount(newCount);
      if (newCount >= 3) {
        setIsGamesSectionUnlocked(false);
        setHideGamesClickCount(0); // Reset the count
        addToast("Secreto", "Sala de juegos oculta.", "info");
      }
    }
  };
  
  // --- New Secret Section Handlers ---
  const handleSecretSequenceStep = (step: string) => {
    if (isGamesSectionUnlocked) return; // Already unlocked, do nothing

    const correctSequence = ['logo', 'footer', 'pizarra', 'notificaciones'];
    const currentSequenceLength = secretSequence.length;

    if (correctSequence[currentSequenceLength] === step) {
        const newSequence = [...secretSequence, step];
        setSecretSequence(newSequence);
        if (newSequence.length === correctSequence.length) {
            if (userPermissions?.juegos?.canUnlock) {
                setIsCodeModalVisible(true);
            } else {
                addToast("Acceso Denegado", "No tienes permiso para acceder a esta sección.", "error");
                setSecretSequence([]);
            }
        }
    } else {
        setSecretSequence(step === 'logo' ? ['logo'] : []);
    }
  };

  const handleCodeSubmit = (code: string): boolean => {
    if (code === '4815162342') {
        setIsGamesSectionUnlocked(true);
        setHideGamesClickCount(0);
        setIsCodeModalVisible(false);
        setSecretSequence([]);
        addToast("Éxito", "Sala de juegos desbloqueada.", "success");
        return true;
    } else {
        setSecretSequence([]); // Reset on failure
        return false;
    }
  };


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

  // --- NEW AUTHENTICATION & USER DETAILS FLOW ---

  // Effect to set the basic user object as soon as auth state is known.
  useEffect(() => {
    setAuthLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        const currentUser = session?.user;
        if (currentUser) {
            setUser(prevUser => {
                if (prevUser && prevUser.id === currentUser.id && prevUser.avatarUrl) {
                    return { ...prevUser, id: currentUser.id, username: currentUser.email || 'Usuario' };
                }
                return { id: currentUser.id, username: currentUser.email || 'Usuario', avatarUrl: null };
            });
        } else {
            setUser(null);
            setAuthLoading(false); 
        }
    });

    return () => {
        subscription.unsubscribe();
    };
  }, []);

  // Effect to fetch user-specific details (theme, avatar, permissions) after the user object is created.
  useEffect(() => {
    if (!user) return; 

    // Load read notification IDs from localStorage
    const savedReadIds = localStorage.getItem('readNotificationIds');
    if (savedReadIds) {
        setReadNotificationIds(new Set(JSON.parse(savedReadIds)));
    }


    const fetchUserDetails = async () => {
        try {
            const { data: { user: supabaseUser } } = await supabase.auth.getUser();
            if (!supabaseUser) return;
            
            // Fetch permissions first as they might control other parts of the UI
            const permissions = await getUserPermissions();
            setUserPermissions(permissions);

            // Fetch theme
            const themePrefs = await getUserThemePreferences();
            if (themePrefs) {
                setTheme(themePrefs.theme_name);
                if (themePrefs.theme_name === 'custom' && themePrefs.custom_theme_colors) {
                    setCustomThemeColors(themePrefs.custom_theme_colors as Record<string, string>);
                }
            }
            
            // Fetch avatar
            let finalAvatarUrl: string | null = null;
            const avatarPath = supabaseUser.user_metadata?.avatar_path;
            if (avatarPath) {
                const { data } = supabase.storage.from('user_files').getPublicUrl(avatarPath);
                finalAvatarUrl = data.publicUrl;
            }
            
            setUser(currentUser => {
                if (!currentUser || currentUser.id !== user.id) return currentUser;
                return { ...currentUser, avatarUrl: finalAvatarUrl };
            });
        } catch (e) {
            console.error("Failed to fetch user details (permissions/theme/avatar).", e);
        }
    };

    fetchUserDetails();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // This effect runs when the user ID changes.


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
        setReadNotificationIds(new Set()); // Clear read IDs
        setSelectedProject(null);
        setActiveView('Dashboard');
        setGeminiApiKey(null);
        setApiKeyError(null);
        setUserPermissions(null); // Clear permissions on logout
        setIsGamesSectionUnlocked(false);
        setHideGamesClickCount(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // This effect runs whenever the user object changes.
  
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

  // --- NEW: Effect for audit notifications ---
  useEffect(() => {
    if (!user || audits.length === 0) {
        return;
    }

    const checkUpcomingAudits = () => {
        const now = new Date();
        const notificationIntervals = [
            { minutes: 15, id: '15m' },
            { minutes: 30, id: '30m' },
            { minutes: 60, id: '1h' },
            { minutes: 24 * 60, id: '1d' },
        ];
        
        const viewStart = now;
        const viewEnd = new Date(now.getTime() + (25 * 60 * 60 * 1000));

        audits.forEach(audit => {
            const occurrences = generateOccurrences(audit, viewStart, viewEnd);

            occurrences.forEach(({ date: occurrenceDate, audit: a }) => {
                // Combine date with time for precise calculation
                const occurrenceDateTime = new Date(`${toYMDString(occurrenceDate)}T${a.timeOfAudit || '00:00:00'}`);

                const diffMinutes = (occurrenceDateTime.getTime() - now.getTime()) / (1000 * 60);

                notificationIntervals.forEach(interval => {
                    if (diffMinutes > interval.minutes - 1 && diffMinutes <= interval.minutes) {
                        if (interval.id === '1d') {
                            const occurrenceDay = occurrenceDateTime.getUTCDay();
                            if (occurrenceDay === 0 || occurrenceDay === 6) { // 0=Sun, 6=Sat
                                return;
                            }
                        }

                        const notificationId = `audit_notification_${a.id}_${occurrenceDateTime.toISOString()}_${interval.id}`;
                        if (!localStorage.getItem(notificationId)) {
                            const timeText = interval.id === '1d' ? 'mañana' : `en ${interval.minutes} minutos`;
                            
                            addActivity(
                                `comienza ${timeText}`,
                                `La auditoría "${a.title}"`,
                                'high'
                            );
                            localStorage.setItem(notificationId, 'true');
                        }
                    }
                });
            });
        });
    };
    
    checkUpcomingAudits();
    const intervalId = setInterval(checkUpcomingAudits, 60 * 1000);

    return () => {
        clearInterval(intervalId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, audits]);
  
  // --- Start of Recorder Effects ---
  // Effect to manage recording timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (recordingStatus === 'recording') {
        interval = setInterval(() => {
            setRecordingTime(prevTime => prevTime + 1);
        }, 1000);
    } else if (recordingStatus === 'idle' && recordingTime !== 0) {
        setRecordingTime(0);
    }
    return () => {
        if (interval) {
            clearInterval(interval);
        }
    };
  }, [recordingStatus, recordingTime]);

  const stopRecording = () => {
    if (!mediaRecorderRef.current || recordingStatus === 'idle') return;
    
    mediaRecorderRef.current.stop();
    
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }

    setRecordingStatus('idle');
  };

  useEffect(() => {
    if (uploadStatus === 'success' || uploadStatus === 'error') {
        const timer = setTimeout(() => {
            setUploadStatus('idle');
            setUploadMessage('');
        }, 5000);
        return () => clearTimeout(timer);
    }
  }, [uploadStatus]);
  // --- End of Recorder Effects ---

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

  // --- Recorder Logic (Centralized) ---
  const handleUpload = async () => {
    if (audioChunksRef.current.length === 0) {
      console.warn("No audio chunks to upload.");
      return;
    }

    setUploadStatus('uploading');
    setUploadMessage('Procesando y subiendo...');
    const audioBlobWebM = new Blob(audioChunksRef.current, { type: 'audio/webm' });

    try {
      const mp3Blob = await convertWebMToMp3(audioBlobWebM);

      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(mp3Blob);
        reader.onloadend = () => {
          if (reader.result) {
            resolve((reader.result as string).split(',')[1]);
          } else {
            reject(new Error("Failed to read blob as Base64."));
          }
        };
        reader.onerror = (error) => reject(error);
      });
      
      const now = new Date();
      const date = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
      const time = `${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}-${now.getSeconds().toString().padStart(2, '0')}`;
      
      const uploadUrl = user
        ? 'https://script.google.com/macros/s/AKfycbzCdJDu6zoxwKVKNUNL_-Fj6rM6dc6C1o_gYIUjLwUULolGD8Y1Paq1VWf1S67XPYu2/exec' // Logged-in URL
        : 'https://script.google.com/macros/s/AKfycbzvxhlawPZkPIFf7TeAn3I5l38u6y4tee1MEvtaMbsb8V_xcVLofePoc4Dh80pLgxFM/exec'; // Logged-out URL

      let fileName = '';
      if (user) {
        const recordingNumber = Date.now();
        fileName = `GrabacionPMC_${recordingNumber}_${date}_${time}.mp3`;
      } else {
        let counter = parseInt(localStorage.getItem('genericRecordingCounter') || '0', 10) + 1;
        localStorage.setItem('genericRecordingCounter', String(counter));
        fileName = `GrabacionGenerica_${counter}_${date}_${time}.mp3`;
      }

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          file: base64String,
          fileName: fileName,
          mimeType: 'audio/mpeg'
        })
      });

      if (!response.ok) throw new Error(`Error de red: ${response.statusText}`);

      const result = await response.json();
      
      if (result.status === 'success') {
        setUploadStatus('success');
        setUploadMessage('Grabación subida correctamente.');
      } else {
        throw new Error(result.error || 'Error desconocido en el servidor.');
      }
    } catch (err) {
      console.error("Upload or conversion failed:", err);
      setUploadStatus('error');
      setUploadMessage(err instanceof Error ? err.message : 'Fallo en la subida o conversión.');
    } finally {
      audioChunksRef.current = [];
    }
  };

  const startRecording = async () => {
    setUploadStatus('idle');
    setUploadMessage('');
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];
        recorder.ondataavailable = (event) => audioChunksRef.current.push(event.data);
        recorder.onstop = handleUpload;
        recorder.start();
        setRecordingStatus('recording');
    } catch (err) {
        console.error("Error accessing microphone:", err);
        setUploadStatus('error');
        setUploadMessage('No se pudo acceder al micrófono.');
    }
  };

  const togglePauseResume = () => {
    if (!mediaRecorderRef.current) return;

    if (recordingStatus === 'recording') {
        mediaRecorderRef.current.pause();
        setRecordingStatus('paused');
    } else if (recordingStatus === 'paused') {
        mediaRecorderRef.current.resume();
        setRecordingStatus('recording');
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

    const projectName = projectId ? projects.find(p => p.id === projectId)?.name : undefined;
    
    const getDisplayName = (username: string): string => {
        const email = (username || '').toLowerCase();
        if (email === 'darienperez695@gmail.com') return 'PHOBOS';
        if (email === 'mejoraproyectos0@gmail.com') return 'Zerk Lucio';
        return username.split('@')[0];
    };
    
    const newActivity: Activity = {
        id: uuidv4(), // Use a temporary local unique ID
        user: {
            id: user.id,
            name: getDisplayName(user.username),
            avatarUrl: user.avatarUrl || undefined,
        },
        action,
        target,
        timestamp: new Date().toISOString(),
        importance,
        projectId,
        projectName,
        isRead: false,
    };
    setActivities(prev => [newActivity, ...prev]);
  };

  const unreadCount = useMemo(() => {
    return activities.filter(a => !readNotificationIds.has(a.id)).length;
  }, [activities, readNotificationIds]);

  const markAsRead = (id: string) => {
    setReadNotificationIds(prev => {
        const newSet = new Set(prev);
        newSet.add(id);
        localStorage.setItem('readNotificationIds', JSON.stringify(Array.from(newSet)));
        return newSet;
    });
  };

  const markAllAsRead = () => {
      const allIds = activities.map(a => a.id);
      const newSet = new Set(readNotificationIds);
      allIds.forEach(id => newSet.add(id));
      localStorage.setItem('readNotificationIds', JSON.stringify(Array.from(newSet)));
      setReadNotificationIds(newSet);
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

  const handleSaveAudit = async (auditData: { title: string; color: string; recurrence: RecurrenceRule; timeOfAudit: string }) => {
    try {
        setError(null);
        if (editingAudit) {
          // Editing existing audit
          const updatedAuditData = { 
              ...editingAudit, 
              title: auditData.title,
              color: auditData.color,
              recurrence: auditData.recurrence,
              timeOfAudit: auditData.timeOfAudit,
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
            timeOfAudit: auditData.timeOfAudit,
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
    
    setIsAvatarLoading(true);
    setError(null);
    try {
      const newAvatarUrl = await updateAvatar(file);
      setUser(prevUser => {
        if (!prevUser) return null;
        return { ...prevUser, avatarUrl: newAvatarUrl };
      });
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
  };

  if (activeGame) {
    const game = games[activeGame];
    return <GamePlayer onExit={handleGameExit} gameTitle={game.title} gameUrl={game.url} />;
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
    return (
      <>
        <LoginView onLogin={handleLogin} isLoading={isLoading} error={error} />
        <FloatingRecorder 
          recordingStatus={recordingStatus}
          recordingTime={recordingTime}
          uploadStatus={uploadStatus}
          uploadMessage={uploadMessage}
          onStartRecording={startRecording}
          onTogglePauseResume={togglePauseResume}
          onStopRecording={stopRecording}
        />
      </>
    );
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
                    onSaveProject={handleSaveProject}
                    onAddTask={handleAddTask}
                    onToggleTask={handleToggleTask}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                    onAddDocument={handleAddDocument}
                    onDeleteDocument={handleDeleteDocument}
                    userPermissions={userPermissions}
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
                  userPermissions={userPermissions}
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
                  userPermissions={userPermissions}
                /></>;
      case 'Enlaces':
        return <>{globalErrorDisplay}<LinksView 
                  links={links}
                  isLoading={linksLoading}
                  onOpenLinkModal={handleOpenLinkModal}
                  onOpenEditLinkModal={handleOpenEditLinkModal}
                  onDeleteLink={handleDeleteLink}
                  userPermissions={userPermissions}
                /></>;
      case 'Auditorias':
          return <>{globalErrorDisplay}<AuditsView 
                    audits={audits}
                    onOpenModal={handleOpenAuditModal}
                    userPermissions={userPermissions}
                 /></>;
      case 'Pizarra':
        return <>{globalErrorDisplay}<WhiteboardView userPermissions={userPermissions} />;</>;
      case 'Gemini 2.5':
        return <>{globalErrorDisplay}<GeminiView 
                  geminiApiKey={geminiApiKey}
                  isApiKeyLoading={isApiKeyLoading}
                  apiKeyError={apiKeyError}
                  userPermissions={userPermissions}
                /></>;
      case 'Notificaciones':
        return <>{globalErrorDisplay}<NotificationsView 
                  notifications={activities}
                  readNotificationIds={readNotificationIds}
                  onMarkAsRead={markAsRead}
                  onMarkAllAsRead={markAllAsRead}
                  onNavigate={changeView} 
                /></>;
      case 'Juegos':
          return <>{globalErrorDisplay}<GamesView onEnterGame={handleGameEnter} /></>;
      case 'Administrador':
        if (user?.username !== 'darienperez695@gmail.com') {
          // If a non-admin somehow gets here, redirect to dashboard.
          return <>{globalErrorDisplay}<DashboardView 
                      projects={projects}
                      audits={audits}
                      activities={activities.slice(0, 5)}
                      tasks={tasks}
                      onSelectProject={handleSelectProjectById}
                  /></>;
        }
        return <>{globalErrorDisplay}<AdminView /> </>;
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
      <ToastContainer notifications={toastNotifications} onDismiss={removeToast} />
      <Sidebar 
        isOpen={true} 
        activeView={activeView}
        setActiveView={changeView}
        currentTheme={theme}
        onThemeChange={handleThemeChange}
        onSecretTrigger={handleSecretTrigger}
        onSecretSequenceStep={handleSecretSequenceStep}
        onHideGamesTrigger={handleHideGamesTrigger}
        isGamesSectionUnlocked={isGamesSectionUnlocked}
        recordingStatus={recordingStatus}
        recordingTime={recordingTime}
        uploadStatus={uploadStatus}
        uploadMessage={uploadMessage}
        onStartRecording={startRecording}
        onTogglePauseResume={togglePauseResume}
        onStopRecording={stopRecording}
        user={user}
        userPermissions={userPermissions}
      />
      <div className={`flex-1 flex flex-col transition-all duration-300 ml-64 overflow-x-hidden`}>
        <Header 
          user={user!}
          onUpdateAvatar={handleUpdateAvatar}
          isAvatarLoading={isAvatarLoading}
          onLogout={handleLogout}
          unreadCount={unreadCount}
          onNavigate={changeView}
          onMarkAllAsRead={markAllAsRead}
          recordingStatus={recordingStatus}
          recordingTime={recordingTime}
          isEditor={true}
        />
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          <div className="animate-fade-in">
            {renderActiveView()}
          </div>
        </main>
      </div>

      {isCodeModalVisible && (
          <SecretCodeModal
              onClose={() => {
                  setIsCodeModalVisible(false);
                  setSecretSequence([]);
              }}
              onSubmit={handleCodeSubmit}
          />
      )}

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
            isReadOnly={!userPermissions?.auditorias.canManage}
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
