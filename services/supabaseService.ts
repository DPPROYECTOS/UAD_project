import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
// Fix: Added 'Content' to import list to support addContentItem.
import { WhiteboardItem, Project, ProjectStatus, ProjectTask, ContentType, Folder, Document, LinkItem, AuditItem, WhiteboardItemOld, WhiteboardState, SavedWhiteboard, Connector, TextStyle, Activity, ThemePreferences, User, Content, UserPermissions } from '../types';

// These credentials are intentionally public for this project.
// In a production environment, they should be stored securely in environment variables.
const supabaseUrl = 'https://hourctostlvdsshmgorf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvdXJjdG9zdGx2ZHNzaG1nb3JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTQ3MTUsImV4cCI6MjA3NDk5MDcxNX0.8ORfYwoEWxgBmdkCgCKLwDAffpo4Fzzp2Cdk9qDO2_U';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to create a URL-safe file name for storage paths.
const sanitizeFileName = (fileName: string): string => {
  const extension = fileName.lastIndexOf('.') > 0 ? fileName.slice(fileName.lastIndexOf('.')) : '';
  let nameWithoutExt = extension ? fileName.slice(0, fileName.lastIndexOf('.')) : fileName;
  if (nameWithoutExt.length > 50) nameWithoutExt = nameWithoutExt.substring(0, 50);
  const sanitized = nameWithoutExt.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-').replace(/^-+|-+$/g, '');
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

export const updateAvatar = async (file: File): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");
  const oldAvatarPath = user.user_metadata?.avatar_path;
  const fileExt = file.name.split('.').pop();
  const fileName = `${uuidv4()}.${fileExt}`;
  const filePath = `${user.id}/PUBLIC_AVATARS/${fileName}`;
  const { error: uploadError } = await supabase.storage.from('user_files').upload(filePath, file, { upsert: false });
  if (uploadError) throw new Error(`Avatar upload failed: ${uploadError.message}`);
  const { error: updateUserError } = await supabase.auth.updateUser({ data: { avatar_path: filePath } });
  if (updateUserError) {
    await supabase.storage.from('user_files').remove([filePath]);
    throw new Error(`Failed to update user metadata with new avatar: ${updateUserError.message}`);
  }
  if (oldAvatarPath) {
    const { error: removeError } = await supabase.storage.from('user_files').remove([oldAvatarPath]);
    if (removeError) console.warn(`Could not remove old avatar: ${removeError.message}`);
  }
  const { data } = supabase.storage.from('user_files').getPublicUrl(filePath);
  return data.publicUrl;
};

// --- Gemini API Key Function ---
export const getGeminiApiKey = async (): Promise<string> => {
    const { data, error } = await supabase.from('api_keys').select('api_key').eq('service_name', 'gemini').single();
    if (error) {
      if (error.code === 'PGRST116') throw new Error('No se encontró la clave de API de Gemini en la base de datos.');
      throw new Error(`Error al obtener la clave de API: ${error.message}`);
    }
    if (!data || !data.api_key) throw new Error('La clave de API de Gemini está vacía en la base de datos.');
    return data.api_key;
};

// --- User Preferences & Permissions ---
export const getUserThemePreferences = async (): Promise<ThemePreferences | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase.from('user_preferences').select('*').eq('user_id', user.id).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
};

export const upsertUserThemePreferences = async (userId: string, themeName: string, customColors?: Record<string, string> | null) => {
    const payload: any = { user_id: userId, theme_name: themeName };
    if (customColors !== undefined) payload.custom_theme_colors = customColors;
    const { data, error } = await supabase.from('user_preferences').upsert(payload, { onConflict: 'user_id' });
    if (error) throw error;
    return data;
};

export const getUserPermissions = async (): Promise<UserPermissions | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase.from('user_ui_settings').select('permissions').eq('user_id', user.id).single();
    if (error && error.code !== 'PGRST116') throw new Error(`Error fetching permissions: ${error.message}`);

    const defaultPermissions: UserPermissions = {
      sidebar: { dashboard: true, proyectos: true, documentos: true, enlaces: true, gemini: true, auditorias: true, pizarra: true, notificaciones: true },
      proyectos: { canCreate: true, canEdit: true, canDelete: true, canManageTasks: true },
      proyectos_documentos: { canUpload: true, canView: true, canDownload: true, canDelete: true },
      documentos: { canUpload: true, canDownload: true, canDelete: true, canManageFolders: true },
      enlaces: { canCreateEdit: true, canDelete: true },
      auditorias: { canManage: true },
      pizarra: { canEdit: true },
      gemini: { canUse: true },
    };
    if (!data || !data.permissions) return defaultPermissions;
    return {
        sidebar: { ...defaultPermissions.sidebar, ...(data.permissions.sidebar || {}) },
        proyectos: { ...defaultPermissions.proyectos, ...(data.permissions.proyectos || {}) },
        proyectos_documentos: { ...defaultPermissions.proyectos_documentos, ...(data.permissions.proyectos_documentos || {}) },
        documentos: { ...defaultPermissions.documentos, ...(data.permissions.documentos || {}) },
        enlaces: { ...defaultPermissions.enlaces, ...(data.permissions.enlaces || {}) },
        auditorias: { ...defaultPermissions.auditorias, ...(data.permissions.auditorias || {}) },
        pizarra: { ...defaultPermissions.pizarra, ...(data.permissions.pizarra || {}) },
        gemini: { ...defaultPermissions.gemini, ...(data.permissions.gemini || {}) },
    };
};

// --- ADMIN-ONLY FUNCTIONS (using RPC) ---
export const getAdminData = async (): Promise<{id: string, email: string, permissions: UserPermissions}[]> => {
    const { data, error } = await supabase.rpc('get_all_users_and_permissions');
    if (error) {
        console.error("Admin fetch data failed:", error.message);
        throw new Error(`No se pudieron cargar los datos de administrador. Error: ${error.message}`);
    }
    return data || [];
};

export const savePermissionsForUser = async (userId: string, permissions: UserPermissions): Promise<void> => {
    const { error } = await supabase.rpc('update_user_permissions', {
        target_user_id: userId,
        new_permissions: permissions
    });
    if (error) {
        console.error(`Failed to save permissions for user ${userId}:`, error.message);
        throw new Error(`Error al guardar permisos: ${error.message}`);
    }
};

// --- Project Functions ---
export const getProjects = async (): Promise<Project[]> => {
    const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    if (!data) return [];
    return data.map(item => ({
        id: item.id, name: item.name || 'Proyecto Sin Título', description: item.description || '',
        objective: item.objective || '', status: item.status || ProjectStatus.NUEVO,
        startDate: item.start_date || new Date().toISOString().split('T')[0], endDate: item.end_date || '',
        team: item.team || [], leader: item.leader || '',
    }));
};

export const addProject = async (project: Omit<Project, 'id'>): Promise<Project> => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) throw new Error('User not authenticated.');
    const projectToInsert = {
        user_id: session.user.id, name: project.name, description: project.description, objective: project.objective,
        status: project.status, start_date: project.startDate, end_date: project.endDate || null,
        team: project.team, leader: project.leader,
    };
    const { data, error } = await supabase.from('projects').insert(projectToInsert).select().single();
    if (error) throw error;
    return {
        id: data.id, name: data.name, description: data.description, objective: data.objective,
        status: data.status, startDate: data.start_date, endDate: data.end_date || '',
        team: data.team, leader: data.leader,
    };
};

export const updateProject = async (project: Project): Promise<Project | null> => {
    const { id, ...projectData } = project;
    const projectToUpdate = {
        name: projectData.name, description: projectData.description, objective: projectData.objective,
        status: projectData.status, start_date: projectData.startDate, end_date: projectData.endDate || null,
        team: projectData.team, leader: projectData.leader,
    };
    const { data, error } = await supabase.from('projects').update(projectToUpdate).eq('id', id).select().single();
    if (error) {
        if (error.code === 'PGRST116') {
            console.warn(`Update on project ${project.id} ignored, likely due to RLS.`);
            return null;
        }
        throw error;
    }
    if (!data) return null;
    return {
        id: data.id, name: data.name, description: data.description, objective: data.objective,
        status: data.status, startDate: data.start_date, endDate: data.end_date || '',
        team: data.team, leader: data.leader,
    };
};

export const deleteProject = async (projectId: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) throw error;
};

// --- Task Functions ---
export const getTasks = async (): Promise<ProjectTask[]> => {
    const { data, error } = await supabase.from('content').select('*').eq('type', ContentType.TASK);
    if (error) throw error;
    if (!data) return [];
    const validTasks: ProjectTask[] = [];
    data.forEach(item => {
        try {
            if (!item.data) return;
            const taskData = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
            if (taskData && typeof taskData.projectId === 'string' && typeof taskData.completed === 'boolean') {
                validTasks.push({
                    id: item.id, title: item.title || 'Untitled Task', projectId: taskData.projectId,
                    completed: taskData.completed, startDate: taskData.startDate || new Date().toISOString().split('T')[0],
                    duration: typeof taskData.duration === 'number' ? taskData.duration : 1,
                    parentId: taskData.parentId || null,
                });
            }
        } catch (parseError) { console.error(`Failed to parse task data for id ${item.id}:`, parseError); }
    });
    return validTasks;
};

export const addTask = async (task: Omit<ProjectTask, 'id'>): Promise<ProjectTask> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('User not authenticated.');
    const taskToInsert = {
        user_id: session.user.id, title: task.title, type: ContentType.TASK,
        data: JSON.stringify({
            projectId: task.projectId, completed: task.completed, startDate: task.startDate,
            duration: task.duration, parentId: task.parentId,
        }),
    };
    const { data, error } = await supabase.from('content').insert(taskToInsert).select().single();
    if (error) throw error;
    const taskData = JSON.parse(data.data);
    return {
        id: data.id, title: data.title, projectId: taskData.projectId, completed: taskData.completed,
        startDate: taskData.startDate, duration: taskData.duration, parentId: taskData.parentId,
    };
};

export const updateTask = async (task: ProjectTask): Promise<ProjectTask> => {
    const taskToUpdate = {
        title: task.title,
        data: JSON.stringify({
            projectId: task.projectId, completed: task.completed, startDate: task.startDate,
            duration: task.duration, parentId: task.parentId,
        }),
    };
    const { data, error } = await supabase.from('content').update(taskToUpdate).eq('id', task.id).select().single();
    if (error) throw error;
    const taskData = JSON.parse(data.data);
    return {
        id: data.id, title: data.title, projectId: taskData.projectId, completed: taskData.completed,
        startDate: taskData.startDate, duration: taskData.duration, parentId: taskData.parentId,
    };
};

export const deleteTask = async (taskId: string) => {
    const findAllDescendants = async (parentId: string): Promise<string[]> => {
        const { data: children, error } = await supabase.from('content').select('id, data').eq('type', ContentType.TASK);
        if (error) throw error;
        const directChildrenIds = children.filter(item => {
            try { const taskData = JSON.parse(item.data); return taskData.parentId === parentId; }
            catch { return false; }
        }).map(item => item.id);
        let allDescendants: string[] = [...directChildrenIds];
        for (const childId of directChildrenIds) {
            allDescendants = allDescendants.concat(await findAllDescendants(childId));
        }
        return allDescendants;
    };
    const descendantIds = await findAllDescendants(taskId);
    const idsToDelete = [taskId, ...descendantIds];
    const { error } = await supabase.from('content').delete().in('id', idsToDelete);
    if (error) throw error;
};

// --- Folder & Document Functions ---
export const getFolders = async (): Promise<Folder[]> => {
    const { data, error } = await supabase.from('folders').select('id, name, parent_id').order('created_at', { ascending: true });
    if (error) throw error;
    return data ? data.map(f => ({ id: f.id, name: f.name, parentId: f.parent_id })) : [];
};

export const addFolder = async (name: string, parentId: string | null): Promise<Folder> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    const { data, error } = await supabase.from('folders').insert({ name: name.trim(), user_id: user.id, parent_id: parentId }).select('id, name, parent_id').single();
    if (error) throw error;
    return { id: data.id, name: data.name, parentId: data.parent_id };
};

export const deleteFolder = async (folderId: string): Promise<void> => {
    const { error } = await supabase.from('folders').delete().eq('id', folderId);
    if (error) throw error;
};

export const getDocuments = async (): Promise<Document[]> => {
    const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data ? data.map(doc => ({
        id: doc.id, name: doc.name, folderId: doc.folder_id, createdAt: doc.created_at,
        size: doc.size, mimeType: doc.mime_type, storagePath: doc.storage_path, projectId: doc.project_id
    })) : [];
};

export const uploadDocument = async (file: File, folderId: string, projectId: string | null): Promise<Document> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    const sanitizedName = sanitizeFileName(file.name);
    const filePath = `${user.id}/${uuidv4()}-${sanitizedName}`;
    const { error: uploadError } = await supabase.storage.from('user_files').upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data, error: insertError } = await supabase.from('documents').insert({
        user_id: user.id, name: file.name, folder_id: folderId, project_id: projectId || null,
        mime_type: file.type, size: file.size, storage_path: filePath,
    }).select().single();
    if (insertError) {
        await supabase.storage.from('user_files').remove([filePath]);
        throw insertError;
    }
    return {
        id: data.id, name: data.name, folderId: data.folder_id, createdAt: data.created_at,
        size: data.size, mimeType: data.mime_type, storagePath: data.storage_path, projectId: data.project_id,
    };
};

export const deleteDocument = async (doc: Document): Promise<void> => {
    const { error: storageError } = await supabase.storage.from('user_files').remove([doc.storagePath]);
    if (storageError) {
        // Log the error but don't block deletion of the database record.
        // This handles cases where the file might already be gone from storage.
        console.warn(`Could not delete file from storage: ${storageError.message}`);
    }
    const { error } = await supabase.from('documents').delete().eq('id', doc.id);
    if (error) throw error;
};

export const getSignedUrlForDocument = async (storagePath: string, options?: { download?: string | boolean }): Promise<string> => {
    const { data, error } = await supabase.storage.from('user_files').createSignedUrl(storagePath, 3600, options);
    if (error) throw error;
    return data.signedUrl;
};

// --- Link Functions ---
export const getLinks = async (): Promise<LinkItem[]> => {
    const { data, error } = await supabase.from('links').select('id, name, description, url').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const addLink = async (link: Omit<LinkItem, 'id'>): Promise<LinkItem> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    const { data, error } = await supabase.from('links').insert({ user_id: user.id, ...link }).select().single();
    if (error) throw error;
    return data;
};

export const updateLink = async (link: LinkItem): Promise<LinkItem> => {
    const { data, error } = await supabase.from('links').update({ name: link.name, description: link.description, url: link.url }).eq('id', link.id).select().single();
    if (error) throw error;
    return data;
};

export const deleteLink = async (linkId: string): Promise<void> => {
    const { error } = await supabase.from('links').delete().eq('id', linkId);
    if (error) throw error;
};

// --- Audit Functions ---
export const getAudits = async (): Promise<AuditItem[]> => {
    const { data, error } = await supabase.from('audits').select('id, title, date, color, recurrence, time_of_audit').order('date', { ascending: false });
    if (error) throw error;
    return data ? data.map(item => ({
        id: item.id, title: item.title, date: item.date, color: item.color,
        recurrence: item.recurrence || { type: 'none' },
        timeOfAudit: item.time_of_audit ? item.time_of_audit.substring(0, 5) : undefined,
    })) : [];
};

export const addAudit = async (audit: Omit<AuditItem, 'id'>): Promise<AuditItem> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    const { data, error } = await supabase.from('audits').insert({ user_id: user.id, ...audit, time_of_audit: audit.timeOfAudit || null }).select().single();
    if (error) throw error;
    return {
        id: data.id, title: data.title, date: data.date, color: data.color, recurrence: data.recurrence || { type: 'none' },
        timeOfAudit: data.time_of_audit ? data.time_of_audit.substring(0, 5) : undefined,
    };
};

export const updateAudit = async (audit: AuditItem): Promise<AuditItem> => {
    const { id, ...auditData } = audit;
    const { data, error } = await supabase.from('audits').update({ ...auditData, time_of_audit: auditData.timeOfAudit || null }).eq('id', id).select().single();
    if (error) throw error;
    return {
        id: data.id, title: data.title, date: data.date, color: data.color, recurrence: data.recurrence || { type: 'none' },
        timeOfAudit: data.time_of_audit ? data.time_of_audit.substring(0, 5) : undefined,
    };
};

export const deleteAudit = async (auditId: string): Promise<void> => {
    const { error } = await supabase.from('audits').delete().eq('id', auditId);
    if (error) throw error;
};


// --- Whiteboard (Save/Load) Functions ---
export const getWhiteboardsForUser = async (): Promise<Array<{ id: string; name: string; updated_at: string }>> => {
    const { data, error } = await supabase.from('whiteboards').select('id, name, updated_at').order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const getWhiteboardContent = async (id: string): Promise<SavedWhiteboard | null> => {
    const { data, error } = await supabase.from('whiteboards').select('*').eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
};

export const addWhiteboard = async (name: string, content: WhiteboardState): Promise<SavedWhiteboard> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    const { data, error } = await supabase.from('whiteboards').insert({ name, content, user_id: user.id }).select().single();
    if (error) throw error;
    return data;
};

export const updateWhiteboard = async (id: string, name: string, content: WhiteboardState): Promise<SavedWhiteboard> => {
    const { data, error } = await supabase.from('whiteboards').update({ content, name, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return data;
};

export const deleteWhiteboard = async (id: string): Promise<void> => {
    const { error } = await supabase.from('whiteboards').delete().eq('id', id);
    if (error) throw error;
};

// --- FIXES START HERE ---

// Fix for CreateContentModal.tsx
export const addContentItem = async (content: Omit<Content, 'id'>): Promise<Content> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('User not authenticated.');

    const contentToInsert = {
        user_id: session.user.id,
        title: content.title,
        type: content.type,
        data: content.data, // data is a string, which is a valid jsonb value
    };

    const { data, error } = await supabase.from('content').insert(contentToInsert).select().single();
    if (error) throw error;
    
    // The data is returned as-is from supabase, which should be a string for these types
    return data as Content;
};


// Fixes for legacy Whiteboard.tsx component
const LIVE_WHITEBOARD_TABLE = 'whiteboard_items_live';

export const getWhiteboardItems = async (): Promise<WhiteboardItemOld[]> => {
    const { data, error } = await supabase.from(LIVE_WHITEBOARD_TABLE).select('*');
    if (error) throw error;
    return data || [];
};

export const addWhiteboardItem = async (item: Omit<WhiteboardItemOld, 'id' | 'user_id' | 'created_at'>): Promise<WhiteboardItemOld> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    const itemToInsert = { ...item, user_id: user.id };
    const { data, error } = await supabase.from(LIVE_WHITEBOARD_TABLE).insert(itemToInsert).select().single();
    if (error) throw error;
    return data;
};

export const updateWhiteboardItem = async (item: WhiteboardItemOld): Promise<WhiteboardItemOld> => {
    const { id, ...itemData } = item;
    const { data, error } = await supabase.from(LIVE_WHITEBOARD_TABLE).update(itemData).eq('id', id).select().single();
    if (error) throw error;
    return data;
};

export const deleteLiveWhiteboardItem = async (id: string): Promise<void> => {
    const { error } = await supabase.from(LIVE_WHITEBOARD_TABLE).delete().eq('id', id);
    if (error) throw error;
};

export const subscribeToLiveWhiteboardItems = (
    onInsert: (newItem: WhiteboardItemOld) => void,
    onUpdate: (updatedItem: WhiteboardItemOld) => void,
    onDelete: (deletedId: string) => void
): RealtimeChannel => {
    const channel = supabase.channel('live-whiteboard-items');
    channel
        .on<WhiteboardItemOld>(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: LIVE_WHITEBOARD_TABLE },
            (payload) => onInsert(payload.new)
        )
        .on<WhiteboardItemOld>(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: LIVE_WHITEBOARD_TABLE },
            (payload) => onUpdate(payload.new)
        )
        .on<{ id: string }>(
            'postgres_changes',
            { event: 'DELETE', schema: 'public', table: LIVE_WHITEBOARD_TABLE },
            (payload) => onDelete(payload.old.id)
        )
        .subscribe();
    return channel;
};

// Fix for FileUploadCard.tsx
export const uploadFile = async (file: File): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    const sanitizedName = sanitizeFileName(file.name);
    const filePath = `${user.id}/UPLOADS/${uuidv4()}-${sanitizedName}`; // A generic folder
    const { error: uploadError } = await supabase.storage.from('user_files').upload(filePath, file);
    if (uploadError) throw uploadError;
};

// Fixes for FileList.tsx
export const getSignedFileUrl = async (fileName: string): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    // This logic is based on what was in FileList.tsx component
    const filePath = `${user.id}/${fileName}`;
    
    const { data, error } = await supabase.storage.from('user_files').createSignedUrl(filePath, 3600);
    if (error) throw error;
    return data.signedUrl;
};

export const deleteFile = async (fileName: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    // This logic is based on what was in FileList.tsx component
    const filePath = `${user.id}/${fileName}`;

    const { data, error } = await supabase.storage.from('user_files').remove([filePath]);
    if (error) throw error;

    if (!data || data.length === 0) {
        // This can happen with RLS policies if the user doesn't have permission,
        // as Supabase storage remove doesn't throw an error in that case.
        throw new Error('Permiso denegado o el archivo no existe.');
    }
};