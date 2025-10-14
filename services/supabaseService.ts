import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { WhiteboardItem, Project, ProjectStatus, ProjectTask, ContentType, Folder, Document, LinkItem, AuditItem, WhiteboardItemOld, WhiteboardState, SavedWhiteboard, Connector, TextStyle, Activity, ThemePreferences } from '../types';

// These credentials are intentionally public for this project.
// In a production environment, they should be stored securely in environment variables.
const supabaseUrl = 'https://hourctostlvdsshmgorf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvdXJjdG9zdGx2ZHNzaG1nb3JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTQ3MTUsImV4cCI6MjA3NDk5MDcxNX0.8ORfYwoEWxgBmdkCgCKLwDAffpo4Fzzp2Cdk9qDO2_U';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to create a URL-safe file name for storage paths.
// This prevents issues with spaces or special characters in filenames and ensures the path is not too long.
const sanitizeFileName = (fileName: string): string => {
  const extension = fileName.lastIndexOf('.') > 0 ? fileName.slice(fileName.lastIndexOf('.')) : '';
  let nameWithoutExt = extension ? fileName.slice(0, fileName.lastIndexOf('.')) : fileName;

  // Truncate the base name to a safe length to avoid potential path length issues in storage.
  if (nameWithoutExt.length > 50) {
    nameWithoutExt = nameWithoutExt.substring(0, 50);
  }

  const sanitized = nameWithoutExt
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^\w-]+/g, '') // Remove all non-word chars except hyphens
    .replace(/--+/g, '-') // Replace multiple hyphens with a single one
    .replace(/^-+|-+$/g, ''); // Trim hyphens from start and end

  // Ensure the final name isn't empty after sanitization
  const finalName = sanitized || 'file';

  return finalName + extension;
};


// --- Auth Functions ---
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// --- User Preferences ---
export const getUserThemePreferences = async (): Promise<ThemePreferences | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
    
    if (error && error.code !== 'PGRST116') { // 'PGRST116' means no rows found, which is fine
        throw error;
    }
    
    return data;
};

export const upsertUserThemePreferences = async (userId: string, themeName: string, customColors?: Record<string, string> | null) => {
    const payload: {
        user_id: string;
        theme_name: string;
        custom_theme_colors?: Record<string, string> | null;
    } = {
        user_id: userId,
        theme_name: themeName,
    };

    // Only include custom_theme_colors in the payload if we are actually setting them.
    // This prevents overwriting stored custom colors with null/undefined when switching to a standard theme.
    if (customColors !== undefined) {
        payload.custom_theme_colors = customColors;
    }

    const { data, error } = await supabase
        .from('user_preferences')
        .upsert(payload, { onConflict: 'user_id' });

    if (error) throw error;
    return data;
};

export const getAvatarBlobUrl = async (path: string): Promise<string | null> => {
  if (!path) return null;
  try {
    const { data, error } = await supabase.storage.from('user_files').download(path);
    if (error) {
        console.error('Supabase download error:', error);
        // Don't throw, just return null so the app doesn't crash if an avatar is missing
        return null;
    }
    return URL.createObjectURL(data);
  } catch (error) {
    console.error('Error downloading avatar blob:', error);
    return null;
  }
};


export const updateAvatar = async (file: File): Promise<string> => { // Returns blob URL
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado.');
  
    const fileExt = file.name.split('.').pop();
    const fileName = `avatar.${fileExt}`;
    const filePath = `public_avatars/${user.id}/${fileName}`;
  
    // 1. Upload file
    const { error: uploadError } = await supabase.storage
      .from('user_files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });
  
    if (uploadError) {
      console.error('Supabase Storage upload error:', uploadError);
      throw new Error(`Error al subir el archivo: ${uploadError.message}`);
    }
  
    // 2. Update user metadata with the FILE PATH
    const { data: updatedUser, error: userUpdateError } = await supabase.auth.updateUser({
      data: { avatar_path: filePath }, 
    });
  
    if (userUpdateError) {
      console.error('Supabase Auth user update error:', userUpdateError);
      throw new Error(`Error al actualizar los metadatos del perfil: ${userUpdateError.message}`);
    }
  
    // 3. Download the blob of the newly uploaded file and create a URL for immediate display
    const blobUrl = await getAvatarBlobUrl(updatedUser.user.user_metadata.avatar_path);
    if (!blobUrl) {
      throw new Error("Se subió el archivo pero no se pudo crear una URL para mostrarlo.");
    }
    
    return blobUrl;
};

// --- Notification Functions ---
export const getNotifications = async (): Promise<Activity[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // 1. Fetch all recent notifications
  const { data: notificationsData, error: notificationsError } = await supabase
    .from('notification_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (notificationsError) throw notificationsError;
  if (!notificationsData) return [];
  
  // 2. Fetch all read statuses for the current user
  const { data: readStatuses, error: readStatusError } = await supabase
    .from('notification_read_status')
    .select('notification_id')
    .eq('user_id', user.id);

  if (readStatusError) throw readStatusError;

  const readIds = new Set(readStatuses.map(s => s.notification_id));

  // 3. Map to Activity[] with correct isRead status
  return notificationsData.map(n => ({
    id: n.id,
    timestamp: n.created_at,
    user: {
      id: n.user_id,
      name: n.user_display_name,
      avatarUrl: n.user_avatar_path || '', // Path for blob conversion in App.tsx
    },
    action: n.action,
    target: n.target,
    importance: n.importance,
    projectId: n.project_id,
    projectName: n.project_name,
    isRead: readIds.has(n.id),
  }));
};


export const addNotification = async (
  action: string, 
  target: string, 
  importance: 'high' | 'medium' | 'low',
  projectId?: string,
  projectName?: string
): Promise<Activity> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const getDisplayName = (username: string): string => {
    const email = (username || '').toLowerCase();
    if (email === 'darienperez695@gmail.com') return 'PHOBOS';
    if (email === 'mejoraproyectos0@gmail.com') return 'Zerk Lucio';
    return email.split('@')[0];
  };

  const notificationToInsert = {
    user_id: user.id,
    user_display_name: getDisplayName(user.email || 'Usuario'),
    user_avatar_path: user.user_metadata?.avatar_path || null,
    action,
    target,
    importance,
    project_id: projectId || null,
    project_name: projectName || null,
  };

  const { data, error } = await supabase
    .from('notification_history')
    .insert(notificationToInsert)
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    timestamp: data.created_at,
    user: {
      id: data.user_id,
      name: data.user_display_name,
      avatarUrl: data.user_avatar_path, // Pass path back
    },
    action: data.action,
    target: data.target,
    importance: data.importance,
    projectId: data.project_id,
    projectName: data.project_name,
    isRead: false, // A new notification is always unread for the creator
  };
};

export const markNotificationReadStatus = async (notificationId: string, read: boolean): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    if (read) {
        // Upsert to mark as read. Avoids errors if already marked.
        const { error } = await supabase
            .from('notification_read_status')
            .upsert({ notification_id: notificationId, user_id: user.id });
        if (error) throw error;
    } else {
        // Delete to mark as unread.
        const { error } = await supabase
            .from('notification_read_status')
            .delete()
            .match({ notification_id: notificationId, user_id: user.id });
        if (error) throw error;
    }
};

export const markAllNotificationsAsRead = async (notificationIds: string[]): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    if (notificationIds.length === 0) return;

    const recordsToInsert = notificationIds.map(id => ({
        notification_id: id,
        user_id: user.id,
    }));

    const { error } = await supabase
        .from('notification_read_status')
        .upsert(recordsToInsert, { onConflict: 'notification_id,user_id' }); // Ignore if already read
    
    if (error) throw error;
};

export const subscribeToNotifications = (
  onNewNotification: (notification: Activity) => void
): RealtimeChannel => {
  const channel = supabase.channel('public:notification_history');
  channel
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notification_history' },
      (payload) => {
        const newRecord = payload.new;
        const notification: Activity = {
          id: newRecord.id,
          timestamp: newRecord.created_at,
          user: {
            id: newRecord.user_id,
            name: newRecord.user_display_name,
            avatarUrl: newRecord.user_avatar_path || '', // This is a path, not a blob URL
          },
          action: newRecord.action,
          target: newRecord.target,
          importance: newRecord.importance,
          projectId: newRecord.project_id,
          projectName: newRecord.project_name,
          isRead: false, // A new notification is always unread initially for the current user.
        };
        onNewNotification(notification);
      }
    )
    .subscribe();

  return channel;
};


// --- Project Functions ---
// All project data is now stored in the dedicated 'projects' table.

export const getProjects = async (): Promise<Project[]> => {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    // Map the database rows directly to the Project type.
    return data.map(item => ({
        id: item.id,
        name: item.name || 'Proyecto Sin Título',
        description: item.description || '',
        objective: item.objective || '',
        status: item.status || ProjectStatus.NUEVO,
        startDate: item.start_date || new Date().toISOString().split('T')[0],
        endDate: item.end_date || '',
        team: item.team || [],
        leader: item.leader || '',
    }));
};

export const addProject = async (project: Omit<Project, 'id'>): Promise<Project> => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) throw new Error(`Authentication error: ${sessionError.message}`);
    if (!session?.user) throw new Error('User not authenticated. Your session may have expired.');

    const projectToInsert = {
        user_id: session.user.id,
        name: project.name,
        description: project.description,
        objective: project.objective,
        status: project.status,
        start_date: project.startDate,
        end_date: project.endDate || null, // FIX: Send null for empty date
        team: project.team,
        leader: project.leader,
    };

    const { data, error } = await supabase
        .from('projects')
        .insert(projectToInsert)
        .select()
        .single();

    if (error) throw error;
    
    // The returned data should match the Project structure more closely now.
    return {
        id: data.id,
        name: data.name,
        description: data.description,
        objective: data.objective,
        status: data.status,
        startDate: data.start_date,
        endDate: data.end_date || '', // Convert null back to empty string for app state
        team: data.team,
        leader: data.leader,
    };
};

export const updateProject = async (project: Project): Promise<Project | null> => {
    const { id, ...projectData } = project;

    const projectToUpdate = {
        name: projectData.name,
        description: projectData.description,
        objective: projectData.objective,
        status: projectData.status,
        start_date: projectData.startDate,
        end_date: projectData.endDate || null,
        team: projectData.team,
        leader: projectData.leader,
    };
    
    const { data, error } = await supabase
        .from('projects')
        .update(projectToUpdate)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            console.warn(`Update on project ${project.id} was ignored, likely due to RLS permissions.`);
            return null;
        }
        throw error;
    }
    
    if (!data) return null;

    return {
        id: data.id,
        name: data.name,
        description: data.description,
        objective: data.objective,
        status: data.status,
        startDate: data.start_date,
        endDate: data.end_date || '',
        team: data.team,
        leader: data.leader,
    };
};

export const deleteProject = async (projectId: string) => {
    // This function now also deletes associated tasks to ensure data integrity.
    // This is not a true transaction, so it's possible for one part to fail,
    // but we execute task deletion first.

    // Step 1: Delete all tasks associated with the project from the 'content' table.
    const { error: taskError } = await supabase
        .from('content')
        .delete()
        .eq('type', ContentType.TASK)
        .like('data', `%"projectId":"${projectId}"%`);

    if (taskError) {
        throw new Error(`Failed to delete associated tasks: ${taskError.message}. The project was not deleted.`);
    }

    // Step 2: Delete the project itself.
    const { error: projectError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

    if (projectError) {
        throw projectError; // Re-throw the original Supabase error for detailed debugging.
    }
};


// --- Task Functions (stored in 'content' table) ---

export const getTasks = async (): Promise<ProjectTask[]> => {
    const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('type', ContentType.TASK);

    if (error) throw error;
    if (!data) return [];

    const validTasks: ProjectTask[] = [];

    data.forEach(item => {
        try {
            if (!item.data) {
                console.warn(`Skipping task with id ${item.id} due to null data field.`);
                return;
            }

            const taskData = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;

            // Basic validation to ensure the parsed data has the required fields
            if (taskData && typeof taskData.projectId === 'string' && typeof taskData.completed === 'boolean') {
                validTasks.push({
                    id: item.id,
                    title: item.title || 'Untitled Task', // Add a fallback for title
                    projectId: taskData.projectId,
                    completed: taskData.completed,
                    startDate: taskData.startDate || new Date().toISOString().split('T')[0],
                    duration: typeof taskData.duration === 'number' ? taskData.duration : 1,
                    parentId: taskData.parentId || null,
                });
            } else {
                console.warn(`Skipping task with id ${item.id} due to malformed data:`, item.data);
            }
        } catch (parseError) {
            console.error(`Failed to parse data for task with id ${item.id}:`, parseError);
        }
    });

    return validTasks;
};

export const addTask = async (task: Omit<ProjectTask, 'id'>): Promise<ProjectTask> => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) throw new Error('User not authenticated.');

    const taskToInsert = {
        user_id: session.user.id,
        title: task.title,
        type: ContentType.TASK,
        data: JSON.stringify({
            projectId: task.projectId,
            completed: task.completed,
            startDate: task.startDate,
            duration: task.duration,
            parentId: task.parentId,
        }),
    };

    const { data, error } = await supabase
        .from('content')
        .insert(taskToInsert)
        .select()
        .single();

    if (error) throw error;

    const taskData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
    return {
        id: data.id,
        title: data.title,
        projectId: taskData.projectId,
        completed: taskData.completed,
        startDate: taskData.startDate,
        duration: taskData.duration,
        parentId: taskData.parentId,
    };
};

export const updateTask = async (task: ProjectTask): Promise<ProjectTask> => {
    const taskToUpdate = {
        title: task.title,
        data: JSON.stringify({
            projectId: task.projectId,
            completed: task.completed,
            startDate: task.startDate,
            duration: task.duration,
            parentId: task.parentId,
        }),
    };

    // Re-introduce `.select().single()` to confirm the update and get the true state from the DB.
    // This is crucial for verifying that the update was not silently blocked by RLS policies.
    const { data, error } = await supabase
        .from('content')
        .update(taskToUpdate)
        .eq('id', task.id)
        .select()
        .single();

    if (error) {
        // Handle the specific error where the row is not found or RLS prevents access.
        if (error.code === 'PGRST116') { 
             throw new Error("La actualización falló: La tarea no se encontró o no tienes permiso para modificarla. Esto suele ser un problema de políticas de seguridad (RLS) en Supabase.");
        }
        throw error; // Re-throw other database errors.
    }
    
    // If we reach here, the update was successful and `data` contains the updated row.
    if (!data) {
        throw new Error("La operación de actualización no devolvió datos. Esto puede indicar un problema de permisos.");
    }

    const taskData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
    return {
        id: data.id,
        title: data.title,
        projectId: taskData.projectId,
        completed: taskData.completed,
        startDate: taskData.startDate,
        duration: taskData.duration,
        parentId: taskData.parentId,
    };
};

export const deleteTask = async (taskId: string) => {
    // Find all children recursively
    const findAllDescendants = async (parentId: string): Promise<string[]> => {
        const { data: children, error } = await supabase
            .from('content')
            .select('id, data')
            .eq('type', ContentType.TASK);
    
        if (error) throw error;
    
        const directChildrenIds = children
            .filter(item => {
                try {
                    const taskData = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
                    return taskData.parentId === parentId;
                } catch {
                    return false;
                }
            })
            .map(item => item.id);
    
        let allDescendants: string[] = [...directChildrenIds];
        for (const childId of directChildrenIds) {
            const grandchildrenIds = await findAllDescendants(childId);
            allDescendants = allDescendants.concat(grandchildrenIds);
        }
        return allDescendants;
    };
    
    const descendantIds = await findAllDescendants(taskId);
    const idsToDelete = [taskId, ...descendantIds];

    const { data, error } = await supabase
        .from('content')
        .delete()
        .in('id', idsToDelete)
        .select();

    if (error) {
        throw error;
    }

    if (!data || data.length === 0) {
        throw new Error(
            "La eliminación falló: La tarea no se encontró o no tienes permiso para eliminarla."
        );
    }
};

// --- Folder Functions ---
export const getFolders = async (): Promise<Folder[]> => {
    const { data, error } = await supabase
        .from('folders')
        .select('id, name, parent_id')
        .order('created_at', { ascending: true });
    
    if (error) throw error;
    if (!data) return [];
    
    return data.map(f => ({
        id: f.id,
        name: f.name,
        parentId: f.parent_id,
    }));
};

export const addFolder = async (name: string, parentId: string | null): Promise<Folder> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('folders')
        .insert({ name: name.trim(), user_id: user.id, parent_id: parentId })
        .select('id, name, parent_id')
        .single();
    
    if (error) throw error;

    return {
        id: data.id,
        name: data.name,
        parentId: data.parent_id,
    };
};

export const deleteFolder = async (folderId: string): Promise<void> => {
    const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId);

    if (error) throw error;
};

// --- Document Functions ---
export const getDocuments = async (): Promise<Document[]> => {
    // Reverted to a direct table query, now that RLS policies have been simplified and corrected.
    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map(doc => ({
        id: doc.id,
        name: doc.name,
        folderId: doc.folder_id,
        createdAt: doc.created_at,
        size: doc.size,
        mimeType: doc.mime_type,
        storagePath: doc.storage_path,
        projectId: doc.project_id,
    }));
};

export const uploadDocument = async (file: File, folderId: string, projectId: string | null): Promise<Document> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const sanitizedName = sanitizeFileName(file.name);
    const filePath = `${user.id}/${uuidv4()}-${sanitizedName}`;

    // 1. Upload to Storage
    const { error: uploadError } = await supabase.storage
        .from('user_files')
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    // 2. Insert metadata into database, storing the original filename for display.
    const { data, error: insertError } = await supabase
        .from('documents')
        .insert({
            user_id: user.id,
            name: file.name, // Store the original, user-facing name
            folder_id: folderId,
            project_id: projectId || null,
            mime_type: file.type,
            size: file.size,
            storage_path: filePath, // Store the sanitized path for storage operations
        })
        .select()
        .single();
    
    if (insertError) {
        // Attempt to clean up storage if DB insert fails
        await supabase.storage.from('user_files').remove([filePath]);
        throw insertError;
    }

    return {
        id: data.id,
        name: data.name,
        folderId: data.folder_id,
        createdAt: data.created_at,
        size: data.size,
        mimeType: data.mime_type,
        storagePath: data.storage_path,
        projectId: data.project_id,
    };
};

export const deleteDocument = async (doc: Document): Promise<void> => {
    // This function now only needs to delete the database record.
    // The database trigger 'on_document_delete' will automatically handle deleting the file from storage.
    const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

    if (dbError) throw dbError;
};


export const getSignedUrlForDocument = async (storagePath: string, options?: { download?: string | boolean }): Promise<string> => {
    const { data, error } = await supabase.storage
        .from('user_files')
        .createSignedUrl(storagePath, 3600, options); // URL valid for 1 hour

    if (error) throw error;
    return data.signedUrl;
};

// --- Link Functions ---
export const getLinks = async (): Promise<LinkItem[]> => {
    const { data, error } = await supabase
        .from('links')
        .select('id, name, description, url')
        .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];
    
    return data;
};

export const addLink = async (link: Omit<LinkItem, 'id'>): Promise<LinkItem> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const linkToInsert = {
        user_id: user.id,
        name: link.name,
        description: link.description,
        url: link.url,
    };

    const { data, error } = await supabase
        .from('links')
        .insert(linkToInsert)
        .select('id, name, description, url')
        .single();

    if (error) throw error;
    
    return data;
};

export const updateLink = async (link: LinkItem): Promise<LinkItem> => {
    const { data, error } = await supabase
        .from('links')
        .update({
            name: link.name,
            description: link.description,
            url: link.url,
        })
        .eq('id', link.id)
        .select('id, name, description, url')
        .single();

    if (error) throw error;

    return data;
};

export const deleteLink = async (linkId: string): Promise<void> => {
    const { error } = await supabase
        .from('links')
        .delete()
        .eq('id', linkId);

    if (error) throw error;
};

// --- Audit Functions ---
export const getAudits = async (): Promise<AuditItem[]> => {
    const { data, error } = await supabase
        .from('audits')
        .select('id, title, date, color, recurrence')
        .order('date', { ascending: false });

    if (error) throw error;
    if (!data) return [];
    
    return data.map(item => ({
        ...item,
        recurrence: item.recurrence || { type: 'none' } // Fallback for safety
    }));
};

export const addAudit = async (audit: Omit<AuditItem, 'id'>): Promise<AuditItem> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const auditToInsert = {
        user_id: user.id,
        title: audit.title,
        date: audit.date,
        color: audit.color,
        recurrence: audit.recurrence,
    };

    const { data, error } = await supabase
        .from('audits')
        .insert(auditToInsert)
        .select('id, title, date, color, recurrence')
        .single();

    if (error) throw error;
    
    return {
        ...data,
        recurrence: data.recurrence || { type: 'none' }
    };
};

export const updateAudit = async (audit: AuditItem): Promise<AuditItem> => {
    const { id, ...auditData } = audit;

    const auditToUpdate = {
        title: auditData.title,
        date: auditData.date,
        color: auditData.color,
        recurrence: auditData.recurrence,
    };
    
    const { data, error } = await supabase
        .from('audits')
        .update(auditToUpdate)
        .eq('id', id)
        .select('id, title, date, color, recurrence')
        .single();

    if (error) throw error;

    return {
        ...data,
        recurrence: data.recurrence || { type: 'none' }
    };
};

export const deleteAudit = async (auditId: string): Promise<void> => {
    const { error } = await supabase
        .from('audits')
        .delete()
        .eq('id', auditId);

    if (error) throw error;
};


// --- Content Functions ---
export const addContentItem = async (item: { title: string; type: string; data: string }) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('User not authenticated');
  const userId = session.user.id;

  const { data, error } = await supabase
    .from('content') // Assuming 'content' is the correct table for generic content
    .insert([{ 
      user_id: userId,
      title: item.title, 
      type: item.type,
      data: item.data 
    }])
    .select();
  
  if (error) throw error;
  return data;
};

// --- File Storage Functions ---
export const uploadFile = async (file: File) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('User not authenticated');
  const userId = session.user.id;

  const filePath = `${userId}/${file.name}`;
  const { data, error } = await supabase.storage
    .from('user_files')
    .upload(filePath, file, { upsert: true }); // Use upsert to allow overwriting

  if (error) throw error;
  return data;
};

export const getSignedFileUrl = async (fileName: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('User not authenticated');
    const userId = session.user.id;
    
    const fullPath = `${userId}/${fileName}`;
    
    const { data, error } = await supabase.storage
        .from('user_files')
        .createSignedUrl(fullPath, 60); // 60 seconds validity
        
    if (error) throw error;
    if (!data) throw new Error('Could not get signed URL.');
    return data.signedUrl;
};

export const deleteFile = async (fileName: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('User not authenticated');
    const userId = session.user.id;
    
    const filePath = `${userId}/${fileName}`;
    const { data, error } = await supabase.storage
        .from('user_files')
        .remove([filePath]);

    if (error) throw error;
    return data;
};

// --- LEGACY Whiteboard Functions ---
// FIX: Changed return type to `WhiteboardItemOld[]` to match the data structure used by the component.
export const getWhiteboardItems = async (): Promise<WhiteboardItemOld[]> => {
  const { data, error } = await supabase.from('whiteboard_items').select('*');
  if (error) throw error;
  return (data as any) || [];
};

export const addWhiteboardItem = async (item: {item_type: 'path' | 'note', data: any}) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('User not authenticated');
  const userId = session.user.id;

  const { data, error } = await supabase
    .from('whiteboard_items')
    .insert([{ ...item, user_id: userId }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// FIX: Changed parameter type from `WhiteboardItem` to `WhiteboardItemOld` to fix property access error.
export const updateWhiteboardItem = async (item: WhiteboardItemOld) => {
  const { data, error } = await supabase
    .from('whiteboard_items')
    .update({ data: item.data })
    .eq('id', item.id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// FIX: Added 'deleteLiveWhiteboardItem' to handle item deletion in the legacy whiteboard.
export const deleteLiveWhiteboardItem = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('whiteboard_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// FIX: Added 'subscribeToLiveWhiteboardItems' to handle real-time updates for the legacy whiteboard.
export const subscribeToLiveWhiteboardItems = (
  onInsert: (item: WhiteboardItemOld) => void,
  onUpdate: (item: WhiteboardItemOld) => void,
  onDelete: (id: string) => void
): RealtimeChannel => {
    const channel = supabase.channel('whiteboard-legacy-channel');
    channel
        .on<WhiteboardItemOld>(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'whiteboard_items' },
            (payload) => onInsert(payload.new)
        )
        .on<WhiteboardItemOld>(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'whiteboard_items' },
            (payload) => onUpdate(payload.new)
        )
        .on<WhiteboardItemOld>(
            'postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'whiteboard_items' },
            (payload) => {
                if (payload.old?.id) {
                    onDelete(payload.old.id);
                }
            }
        )
        .subscribe();
    
    return channel;
};


// --- Whiteboard (Save/Load) Functions ---
export const getWhiteboardsForUser = async (): Promise<Array<{ id: string; name: string; updated_at: string }>> => {
    const { data, error } = await supabase
        .from('whiteboards')
        .select('id, name, updated_at')
        .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
};

export const getWhiteboardContent = async (id: string): Promise<SavedWhiteboard | null> => {
    const { data, error } = await supabase
        .from('whiteboards')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
      // It's common for 'single()' to error if no row is found, which isn't a "real" error.
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
};

export const addWhiteboard = async (name: string, content: WhiteboardState): Promise<SavedWhiteboard> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('whiteboards')
        .insert({
            name,
            content,
            user_id: user.id
        })
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

export const updateWhiteboard = async (id: string, name: string, content: WhiteboardState): Promise<SavedWhiteboard> => {
    const { data, error } = await supabase
        .from('whiteboards')
        .update({ content, name, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

export const deleteWhiteboard = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('whiteboards')
        .delete()
        .eq('id', id);

    if (error) throw error;
};