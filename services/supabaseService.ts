
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { WhiteboardItem, Project, ProjectStatus, ProjectTask, ContentType, Folder, Document, LinkItem, AuditItem, WhiteboardItemOld, WhiteboardState, SavedWhiteboard, Connector, TextStyle, ThemePreferences, User, Content, UserPermissions, PasswordItem, Comment, CommentWithAuthor, IshikawaDiagramData, AppModule, PublishedProcedure, PublishedFolder, PasswordCategory, TaskStatus } from '../types';

// --- MAIN DATABASE (High Hierarchy - Auth & Main App) ---
const supabaseUrl = 'https://hourctostlvdsshmgorf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvdXJjdG9zdGx2ZHNzaG1nb3JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTQ3MTUsImV4cCI6MjA3NDk5MDcxNX0.8ORfYwoEWxgBmdkCgCKLwDAffpo4Fzzp2Cdk9qDO2_U';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// --- EXTERNAL DATABASE (Low Hierarchy - Documents & Nexus Only) ---
const supabaseExternalUrl = 'https://etjhwybavjcygkllbaye.supabase.co';
const supabaseExternalAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0amh3eWJhdmpjeWdrbGxiYXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNjUwOTUsImV4cCI6MjA3OTc0MTA5NX0.zV3n3CErV3hL6gGDZofETZufFpnfz7d0OgNVyjmvOm4';

export const supabaseExternal: SupabaseClient = createClient(supabaseExternalUrl, supabaseExternalAnonKey);


// Helper function to create a URL-safe file name for storage paths.
const sanitizeFileName = (fileName: string): string => {
  const extension = fileName.lastIndexOf('.') > 0 ? fileName.slice(fileName.lastIndexOf('.')) : '';
  let nameWithoutExt = extension ? fileName.slice(0, fileName.lastIndexOf('.')) : fileName;
  if (nameWithoutExt.length > 50) nameWithoutExt = nameWithoutExt.substring(0, 50);
  const sanitized = nameWithoutExt.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-').replace(/^-+$/g, '');
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
    const { error: removeError = { message: 'Unknown error' } as any } = await supabase.storage.from('user_files').remove([oldAvatarPath]);
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
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        const { data, error } = await supabase.from('user_preferences').select('*').eq('user_id', user.id).single();
        if (error && error.code !== 'PGRST116') {
            console.warn(`Error fetching theme preferences: ${error.message}`);
            return null;
        }
        return data;
    } catch (err) {
        console.warn("Resilient fallback: Failed to fetch theme preferences, returning null.", err);
        return null;
    }
};

export const upsertUserThemePreferences = async (userId: string, themeName: string, customColors?: Record<string, string> | null) => {
    const payload: any = { user_id: userId, theme_name: themeName };
    if (customColors !== undefined) payload.custom_theme_colors = customColors;
    const { data, error } = await supabase.from('user_preferences').upsert(payload, { onConflict: 'user_id' });
    if (error) throw error;
    return data;
};

export const getUserPermissions = async (): Promise<UserPermissions | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const superAdmins = ['darienperez695@gmail.com', 'zerklucio@gmail.com'];
        const isSuperAdmin = user.email && superAdmins.includes(user.email.toLowerCase().trim());

        const defaultPermissions: UserPermissions = {
          sidebar: { dashboard: true, proyectos: true, documentos: true, enlaces: true, auditorias: true, pizarra: true, notificaciones: true, contraseñas: true, apps: true, codex: true, calendario: true, administrador: isSuperAdmin ? true : false },
          proyectos: { canCreate: true, canEdit: true, canDelete: true, canManageTasks: true },
          proyectos_documentos: { canUpload: true, canView: true, canDownload: true, canDelete: true },
          documentos: { canUpload: true, canDownload: true, canDelete: true, canManageFolders: true },
          enlaces: { canCreateEdit: true, canDelete: true },
          auditorias: { canManage: true },
          pizarra: { canEdit: true },
          juegos: { canUnlock: isSuperAdmin ? true : false },
          contraseñas: { canManage: true },
          apps: { canView: true },
          nexus: { canView: true },
          gemini: { canUse: isSuperAdmin ? true : false },
        };

        let data = null;
        try {
            const { data: resData, error } = await supabase.from('user_ui_settings').select('permissions').eq('user_id', user.id).single();
            if (error) {
                if (error.code !== 'PGRST116') {
                    console.warn(`Error fetching user permissions from database: ${error.message}`);
                }
            } else {
                data = resData;
            }
        } catch (dbErr) {
            console.warn("Database error or network failure fetching user permissions, using default fallback permissions:", dbErr);
        }

        if (!data || !data.permissions) {
            if (isSuperAdmin) {
                return {
                    ...defaultPermissions,
                    sidebar: { ...defaultPermissions.sidebar, administrador: true },
                    juegos: { canUnlock: true },
                    gemini: { canUse: true }
                };
            }
            return defaultPermissions;
        }

        const dbPerms = data.permissions;
        return {
            sidebar: { 
                ...defaultPermissions.sidebar, 
                ...(dbPerms.sidebar || {}), 
                codex: dbPerms.sidebar?.codex ?? dbPerms.sidebar?.nexus ?? defaultPermissions.sidebar.codex,
                // Permitir desactivar el panel si se configura explícitamente en la base de datos
                administrador: dbPerms.sidebar?.administrador !== undefined 
                    ? dbPerms.sidebar.administrador 
                    : (isSuperAdmin ? true : defaultPermissions.sidebar.administrador)
            },
            proyectos: { ...defaultPermissions.proyectos, ...(dbPerms.proyectos || {}) },
            proyectos_documentos: { ...defaultPermissions.proyectos_documentos, ...(dbPerms.proyectos_documentos || {}) },
            documentos: { ...defaultPermissions.documentos, ...(dbPerms.documentos || {}) },
            enlaces: { ...defaultPermissions.enlaces, ...(dbPerms.enlaces || {}) },
            auditorias: { ...defaultPermissions.auditorias, ...(dbPerms.auditorias || {}) },
            pizarra: { ...defaultPermissions.pizarra, ...(dbPerms.pizarra || {}) },
            juegos: { ...defaultPermissions.juegos, ...(dbPerms.juegos || {}) },
            contraseñas: dbPerms.contraseñas ? { ...defaultPermissions.contraseñas, ...dbPerms.contraseñas } : defaultPermissions.contraseñas,
            apps: dbPerms.apps ? { ...defaultPermissions.apps, ...dbPerms.apps } : defaultPermissions.apps,
            nexus: dbPerms.nexus ? { ...defaultPermissions.nexus, ...dbPerms.nexus } : defaultPermissions.nexus,
            gemini: { ...defaultPermissions.gemini, ...(dbPerms.gemini || {}) },
        };
    } catch (err) {
        console.warn("Resilient fallback: Critical error in getUserPermissions, returning fallback permissions.", err);
        return {
            sidebar: { dashboard: true, proyectos: true, documentos: true, enlaces: true, auditorias: true, pizarra: true, notificaciones: true, contraseñas: true, apps: true, codex: true, calendario: true, administrador: false },
            proyectos: { canCreate: true, canEdit: true, canDelete: true, canManageTasks: true },
            proyectos_documentos: { canUpload: true, canView: true, canDownload: true, canDelete: true },
            documentos: { canUpload: true, canDownload: true, canDelete: true, canManageFolders: true },
            enlaces: { canCreateEdit: true, canDelete: true },
            auditorias: { canManage: true },
            pizarra: { canEdit: true },
            juegos: { canUnlock: false },
            contraseñas: { canManage: true },
            apps: { canView: true },
            nexus: { canView: true },
            gemini: { canUse: false },
        };
    }
};

export const getAdminData = async (): Promise<any[]> => {
    const { data, error } = await supabase.rpc('get_all_users_and_permissions');
    if (error) throw error;
    return data || [];
};

export const savePermissionsForUser = async (userId: string, permissions: UserPermissions) => {
    try {
        // Intenta guardar usando la función RPC con SECURITY DEFINER (evita errores de políticas RLS)
        const { error: rpcError } = await supabase.rpc('admin_save_user_permissions', {
            target_user_id: userId,
            new_permissions: permissions
        });
        if (!rpcError) return;
        
        // Si el error es PGRST501 (función no encontrada), procedemos con el fallback
        if (rpcError.code !== 'PGRST501' && !rpcError.message?.toLowerCase().includes('does not exist')) {
            throw rpcError;
        }
        console.warn("RPC admin_save_user_permissions no existe, usando fallback directo.");
    } catch (rpcErr) {
        console.warn("Error o falta de RPC, intentando guardado directo:", rpcErr);
    }

    const { error } = await supabase.from('user_ui_settings').upsert({
        user_id: userId,
        permissions: permissions,
        updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    if (error) throw error;
};

export const getAppModules = async (): Promise<AppModule[]> => {
    const { data, error } = await supabase.from('app_modules').select('*');
    if (error) throw error;
    return data.map((m: any) => ({
        id: m.id, 
        label: m.label, 
        subLabel: m.sub_label, 
        url: m.url, 
        x: Number(m.x), 
        y: Number(m.y), 
        status: m.status, 
        connectionSide: m.connection_side, 
        laneOffset: Number(m.lane_offset)
    }));
};

export const upsertAppModule = async (module: AppModule) => {
    const { error } = await supabase.from('app_modules').upsert({
        id: module.id, 
        label: module.label, 
        sub_label: module.subLabel, 
        url: module.url, 
        x: module.x, 
        y: module.y, 
        status: module.status, 
        connection_side: module.connectionSide, 
        lane_offset: module.laneOffset, 
        updated_at: new Date().toISOString()
    });
    if (error) throw error;
};

export const deleteAppModule = async (id: string) => {
    const { error } = await supabase.from('app_modules').delete().eq('id', id);
    if (error) throw error;
};

export const getProjects = async (): Promise<Project[]> => {
    const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data ? data.map(item => ({
        id: item.id, name: item.name || 'Proyecto Sin Título', description: item.description || '', objective: item.objective || '', status: item.status || ProjectStatus.NUEVO, startDate: item.start_date || new Date().toISOString().split('T')[0], endDate: item.end_date || '', team: item.team || [], leader: item.leader || '', ishikawaEnabled: item.ishikawa_enabled ?? true, executiveSummary: item.executive_summary || '', finalConclusions: item.final_conclusions || '',
    })) : [];
};

export const addProject = async (project: Omit<Project, 'id'>): Promise<Project> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('User not authenticated.');
    const { data, error } = await supabase.from('projects').insert({
        user_id: session.user.id, name: project.name, description: project.description, objective: project.objective, status: project.status, start_date: project.startDate, end_date: project.endDate || null, team: project.team, leader: project.leader, ishikawa_enabled: project.ishikawaEnabled, executive_summary: project.executiveSummary, final_conclusions: project.finalConclusions,
    }).select().single();
    if (error) throw error;
    return { id: data.id, name: data.name, description: data.description, objective: data.objective, status: data.status, startDate: data.start_date, endDate: data.end_date || '', team: data.team, leader: data.leader, ishikawaEnabled: data.ishikawa_enabled, executiveSummary: data.executive_summary, finalConclusions: data.final_conclusions };
};

export const updateProject = async (project: Project): Promise<Project | null> => {
    const { id, ...projectData } = project;
    const { data, error = { message: 'Unknown error' } as any } = await supabase.from('projects').update({
        name: projectData.name, description: projectData.description, objective: projectData.objective, status: projectData.status, start_date: projectData.startDate, end_date: projectData.endDate || null, team: projectData.team, leader: projectData.leader, ishikawa_enabled: projectData.ishikawaEnabled, executive_summary: projectData.executiveSummary, final_conclusions: projectData.finalConclusions,
    }).eq('id', id).select().single();
    if (error) return null;
    return { id: data.id, name: data.name, description: data.description, objective: data.objective, status: data.status, startDate: data.start_date, endDate: data.end_date || '', team: data.team, leader: data.leader, ishikawaEnabled: data.ishikawa_enabled, executiveSummary: data.executive_summary, finalConclusions: data.final_conclusions };
};

export const deleteProject = async (projectId: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) throw error;
};

export const getIshikawaDiagram = async (projectId: string): Promise<IshikawaDiagramData | null> => {
  const { data, error } = await supabase.from('ishikawa_diagrams').select('*').eq('project_id', projectId).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const saveIshikawaDiagram = async (projectId: string, causes: any): Promise<void> => {
  const { error } = await supabase.from('ishikawa_diagrams').upsert({ project_id: projectId, causes, updated_at: new Date().toISOString() }, { onConflict: 'project_id' });
  if (error) throw error;
};

export const getTasks = async (): Promise<ProjectTask[]> => {
    const { data, error } = await supabase.from('content').select('*').eq('type', ContentType.TASK);
    if (error) throw error;
    const validTasks: ProjectTask[] = [];
    data?.forEach(item => {
        try {
            const taskData = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
            if (taskData && taskData.projectId) {
                validTasks.push({ 
                    id: item.id, 
                    title: item.title || 'Sin Título', 
                    projectId: taskData.projectId, 
                    status: (item.task_status as TaskStatus) || (taskData.completed ? 'completed' : 'pending'), 
                    startDate: taskData.startDate || '', 
                    duration: taskData.duration || 1, 
                    parentId: taskData.parentId || null,
                    assignedTo: item.assigned_to || '',
                    comments: item.task_comments || ''
                });
            }
        } catch (e) {}
    });
    return validTasks;
};

export const addTask = async (task: Omit<ProjectTask, 'id'>): Promise<ProjectTask> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('User not authenticated.');
    const { data, error } = await supabase.from('content').insert({
        user_id: session.user.id, 
        title: task.title, 
        type: ContentType.TASK, 
        assigned_to: task.assignedTo || null,
        task_status: task.status, 
        task_comments: task.comments || null,
        data: JSON.stringify({ 
            projectId: task.projectId, 
            completed: task.status === 'completed', 
            startDate: task.startDate, 
            duration: task.duration, 
            parentId: task.parentId 
        })
    }).select().single();
    if (error) throw error;
    const taskData = JSON.parse(data.data);
    return { 
        id: data.id, 
        title: data.title, 
        projectId: taskData.projectId, 
        status: data.task_status as TaskStatus, 
        startDate: taskData.startDate, 
        duration: taskData.duration, 
        parentId: data.parentId,
        assignedTo: data.assigned_to || '',
        comments: data.task_comments || ''
    };
};

export const updateTask = async (task: ProjectTask): Promise<ProjectTask> => {
    const { data, error } = await supabase.from('content').update({
        title: task.title, 
        assigned_to: task.assignedTo || null,
        task_status: task.status, 
        task_comments: task.comments || null,
        data: JSON.stringify({ 
            projectId: task.projectId, 
            completed: task.status === 'completed', 
            startDate: task.startDate, 
            duration: task.duration, 
            parentId: task.parentId 
        })
    }).eq('id', task.id).select().single();
    if (error) throw error;
    const taskData = JSON.parse(data.data);
    return { 
        id: data.id, 
        title: data.title, 
        projectId: taskData.projectId, 
        status: data.task_status as TaskStatus, 
        startDate: taskData.startDate, 
        duration: taskData.duration, 
        parentId: taskData.parentId,
        assignedTo: data.assigned_to || '',
        comments: data.task_comments || ''
    };
};

export const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('content').delete().eq('id', taskId);
    if (error) throw error;
};

export const getFolders = async (): Promise<Folder[]> => {
    const { data, error } = await supabase.from('folders').select('id, name, parent_id').order('created_at', { ascending: true });
    if (error) throw error;
    return data ? data.map(f => ({ id: f.id, name: f.name, parentId: f.parent_id })) : [];
};

export const addFolder = async (name: string, parentId: string | null): Promise<Folder> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    const { data, error = { message: 'Unknown error' } as any } = await supabase.from('folders').insert({ name: name.trim(), user_id: user.id, parent_id: parentId }).select('id, name, parent_id').single();
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
    return data ? data.map(doc => ({ id: doc.id, name: doc.name, folderId: doc.folder_id, createdAt: doc.created_at, size: doc.size, mimeType: doc.mime_type, storagePath: doc.storage_path, projectId: doc.project_id })) : [];
};

export const uploadDocument = async (file: File, folderId: string, projectId: string | null): Promise<Document> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    const filePath = `${user.id}/${uuidv4()}-${sanitizeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from('user_files').upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data, error: insertError } = await supabase.from('documents').insert({ user_id: user.id, name: file.name, folder_id: folderId, project_id: projectId || null, mime_type: file.type, size: file.size, storage_path: filePath }).select().single();
    if (insertError) { await supabase.storage.from('user_files').remove([filePath]); throw insertError; }
    return { id: data.id, name: data.name, folderId: data.folder_id, createdAt: data.created_at, size: data.size, mimeType: data.mime_type, storagePath: data.storage_path, projectId: data.project_id };
};

export const deleteDocument = async (doc: Document): Promise<void> => {
    // 1. Intentar borrar el archivo físico primero usando la API de Storage
    const { error: storageError } = await supabase.storage.from('user_files').remove([doc.storagePath]);
    
    // Nota: A veces el archivo ya no existe en storage pero el registro sí. 
    // No bloqueamos el borrado del registro si el archivo no se encuentra.
    if (storageError && storageError.message !== 'Object not found') {
        console.warn('Error al eliminar archivo físico:', storageError);
    }

    // 2. Borrar el registro de la base de datos
    const { error: dbError } = await supabase.from('documents').delete().eq('id', doc.id);
    if (dbError) {
        console.error('Error al eliminar registro de base de datos:', dbError);
        throw dbError;
    }
};

export const moveDocument = async (docId: string, newFolderId: string): Promise<void> => {
    const { error } = await supabase.from('documents').update({ folder_id: newFolderId }).eq('id', docId);
    if (error) throw error;
};

export const getSignedUrlForDocument = async (storagePath: string, options?: { download?: string | boolean }): Promise<string> => {
    const { data, error } = await supabase.storage.from('user_files').createSignedUrl(storagePath, 3600, options);
    if (error) throw error;
    return data.signedUrl;
};

// --- PROJECT ATTACHMENTS (NUEVA LÓGICA JUNCTION TABLE) ---

/**
 * Obtiene todos los documentos vinculados a un proyecto, incluyendo:
 * 1. Documentos con project_id directo.
 * 2. Documentos vinculados a través de la tabla 'project_document_attachments'.
 */
export const getProjectFullDocuments = async (projectId: string): Promise<Document[]> => {
    // 1. Obtener docs directos
    const { data: directDocs, error: directError } = await supabase.from('documents').select('*').eq('project_id', projectId);
    if (directError) throw directError;

    // 2. Obtener IDs de la tabla de cruce
    const { data: attachments, error: attachError } = await supabase.from('project_document_attachments').select('document_id').eq('project_id', projectId);
    if (attachError) throw attachError;

    if (attachments.length === 0) return directDocs.map(doc => ({ id: doc.id, name: doc.name, folderId: doc.folder_id, createdAt: doc.created_at, size: doc.size, mimeType: doc.mime_type, storagePath: doc.storage_path, projectId: doc.project_id }));

    const attachedIds = attachments.map(a => a.document_id);

    // 3. Obtener los documentos físicos correspondientes a esos IDs
    const { data: attachedDocs, error: fetchError } = await supabase.from('documents').select('*').in('id', attachedIds);
    if (fetchError) throw fetchError;

    // Combinar y remover duplicados por si acaso
    const combined = [...directDocs, ...attachedDocs];
    const uniqueMap = new Map<string, any>();
    combined.forEach(d => uniqueMap.set(d.id, d));

    return Array.from(uniqueMap.values()).map(doc => ({ 
        id: doc.id, name: doc.name, folderId: doc.folder_id, createdAt: doc.created_at, size: doc.size, mimeType: doc.mime_type, storagePath: doc.storage_path, projectId: doc.project_id 
    }));
};

/**
 * Vincula un documento existente con un proyecto.
 */
export const attachDocumentToProject = async (projectId: string, documentId: string): Promise<void> => {
    const { error } = await supabase.from('project_document_attachments').insert({ project_id: projectId, document_id: documentId });
    if (error) {
        if (error.code === '23505') return; // Ignorar si ya está vinculado
        throw error;
    }
};

/**
 * Desvincula un documento de un proyecto (borra de la tabla de cruce).
 */
export const detachDocumentFromProject = async (projectId: string, documentId: string): Promise<void> => {
    const { error } = await supabase.from('project_document_attachments').delete().eq('project_id', projectId).eq('document_id', documentId);
    if (error) throw error;
};

// --- EXTERNAL DATABASE FUNCTIONS ---
export const getExternalFolders = async (): Promise<Folder[]> => {
    const { data, error } = await supabaseExternal.from('folders').select('id, name, parent_id').order('created_at', { ascending: true });
    if (error) return [];
    return data ? data.map(f => ({ id: f.id, name: f.name, parentId: f.parent_id })) : [];
};

export const addExternalFolder = async (name: string, parentId: string | null): Promise<Folder> => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabaseExternal.from('folders').insert({ name: name.trim(), user_id: user?.id, parent_id: parentId }).select('id, name, parent_id').single();
    if (error) throw error;
    return { id: data.id, name: data.name, parentId: data.parent_id };
};

export const deleteExternalFolder = async (folderId: string): Promise<void> => {
    const { error } = await supabaseExternal.from('folders').delete().eq('id', folderId);
    if (error) throw error;
};

export const getExternalDocuments = async (): Promise<Document[]> => {
    const { data, error } = await supabaseExternal.from('documents').select('*').order('created_at', { ascending: false });
    if (error) return [];
    return data ? data.map(doc => ({ id: doc.id, name: doc.name, folderId: doc.folder_id, createdAt: doc.created_at, size: doc.size, mimeType: doc.mime_type, storagePath: doc.storage_path, projectId: doc.project_id })) : [];
};

export const uploadExternalDocument = async (file: File, folderId: string, projectId: string | null): Promise<Document> => {
    const { data: { user } } = await supabase.auth.getUser();
    const filePath = `${user?.id || 'anon'}/${uuidv4()}-${sanitizeFileName(file.name)}`;
    const { error: uploadError } = await supabaseExternal.storage.from('user_files').upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data, error: insertError } = await supabaseExternal.from('documents').insert({ user_id: user?.id, name: file.name, folder_id: folderId, project_id: projectId || null, mime_type: file.type, size: file.size, storage_path: filePath }).select().single();
    if (insertError) { await supabaseExternal.storage.from('user_files').remove([filePath]); throw insertError; }
    return { id: data.id, name: data.name, folderId: data.folder_id, createdAt: data.created_at, size: data.size, mimeType: data.mime_type, storagePath: data.storage_path, projectId: data.project_id };
};

export const deleteExternalDocument = async (doc: Document): Promise<void> => {
    const { error: storageError } = await supabaseExternal.storage.from('user_files').remove([doc.storagePath]);
    if (storageError && storageError.message !== 'Object not found') {
        console.warn('Error al eliminar archivo físico externo:', storageError);
    }

    const { error: dbError } = await supabaseExternal.from('documents').delete().eq('id', doc.id);
    if (dbError) throw dbError;
};

export const moveExternalDocument = async (docId: string, newFolderId: string): Promise<void> => {
    const { error } = await supabaseExternal.from('documents').update({ folder_id: newFolderId }).eq('id', docId);
    if (error) throw error;
};

export const getSignedUrlForExternalDocument = async (storagePath: string, options?: { download?: string | boolean }): Promise<string> => {
    const { data, error } = await supabaseExternal.storage.from('user_files').createSignedUrl(storagePath, 3600, options);
    if (error) throw error;
    return data.signedUrl;
};

// --- CODEX PUBLICATION FUNCTIONS (REPLICANDO FUNCIONAMIENTO LOCAL) ---

export interface PublishPayload {
    title: string;
    code: string;
    area: string;
    version: string;
    status: string;
    origin_id: string;
    storage_path: string;
    folder_id: string;
}

export const getLocalPublishedProcedures = async (): Promise<PublishedProcedure[]> => {
    const { data, error } = await supabase.from('procedures').select('*');
    if (error) return [];
    // Mapeamos origin_document_id a uad_origin_id para que la App lo reconozca
    return (data || []).map((p: any) => ({ ...p, uad_origin_id: p.origin_document_id || p.uad_origin_id }));
};

export const publishLocalProcedure = async (payload: PublishPayload): Promise<void> => {
    const { data: urlData } = await supabase.storage.from('user_files').createSignedUrl(payload.storage_path, 31536000);
    if (!urlData?.signedUrl) throw new Error(`No se pudo obtener URL del archivo.`);
    const { error } = await supabase.from('procedures').upsert({
        origin_document_id: payload.origin_id,
        folder_id: payload.folder_id,
        title: payload.title,
        code: payload.code,
        area: payload.area,
        version: payload.version,
        status: payload.status,
        file_url: urlData.signedUrl,
        created_at: new Date().toISOString()
    }, { onConflict: 'origin_document_id' });
    if (error) throw error;
};

export const unpublishLocalProcedure = async (procedureId: string): Promise<void> => {
    const { error } = await supabase.from('procedures').delete().eq('id', procedureId);
    if (error) throw error;
};

export const getExternalPublishedProcedures = async (): Promise<PublishedProcedure[]> => {
    const { data, error } = await supabaseExternal.from('procedures').select('*');
    if (error) return [];
    // Replicamos el mapeo de local para asegurar consistencia
    return (data || []).map((p: any) => ({ ...p, uad_origin_id: p.origin_document_id || p.uad_origin_id }));
};

export const publishExternalProcedure = async (payload: PublishPayload): Promise<void> => {
    const { data: urlData } = await supabaseExternal.storage.from('user_files').createSignedUrl(payload.storage_path, 31536000);
    if (!urlData?.signedUrl) throw new Error(`No se pudo obtener URL externa del archivo.`);
    
    // REPLICA EXACTA DE LOCAL: Usamos 'origin_document_id' y 'created_at'
    const { error } = await supabaseExternal.from('procedures').upsert({
        origin_document_id: payload.origin_id,
        folder_id: payload.folder_id,
        title: payload.title,
        code: payload.code,
        area: payload.area,
        version: payload.version,
        status: payload.status,
        file_url: urlData.signedUrl,
        created_at: new Date().toISOString()
    }, { onConflict: 'origin_document_id' });
    if (error) throw error;
};

export const unpublishExternalProcedure = async (procedureId: string): Promise<void> => {
    const { error } = await supabaseExternal.from('procedures').delete().eq('id', procedureId);
    if (error) throw error;
};

export const getLocalPublishedFolders = async (): Promise<PublishedFolder[]> => {
    const { data, error } = await supabase.from('published_folders').select('*');
    return error ? [] : data;
};

export const publishLocalFolder = async (folderId: string, folderName: string, area: string): Promise<void> => {
    const { error } = await supabase.from('published_folders').upsert({ origin_folder_id: folderId, folder_name: folderName, area: area, created_at: new Date().toISOString() }, { onConflict: 'origin_folder_id' });
    if (error) throw error;
};

export const unpublishLocalFolder = async (folderId: string): Promise<void> => {
    const { error } = await supabase.from('published_folders').delete().eq('origin_folder_id', folderId);
    if (error) throw error;
};

export const getExternalPublishedFolders = async (): Promise<PublishedFolder[]> => {
    const { data, error } = await supabaseExternal.from('published_folders').select('*');
    return error ? [] : data;
};

export const publishExternalFolder = async (folderId: string, folderName: string, area: string): Promise<void> => {
    const { error } = await supabaseExternal.from('published_folders').upsert({ origin_folder_id: folderId, folder_name: folderName, area: area, created_at: new Date().toISOString() }, { onConflict: 'origin_folder_id' });
    if (error) throw error;
};

export const unpublishExternalFolder = async (folderId: string): Promise<void> => {
    const { error } = await supabaseExternal.from('published_folders').delete().eq('origin_folder_id', folderId);
    if (error) throw error;
};

export const getDepartments = async (): Promise<string[]> => {
    const { data, error } = await supabaseExternal.from('departments').select('name').order('name', { ascending: true });
    if (error) return [];
    return data ? data.map(d => d.name) : [];
};

export const getLinks = async (): Promise<LinkItem[]> => {
    const { data, error } = await supabase.from('links').select('id, name, description, url, tags').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const addLink = async (link: Omit<LinkItem, 'id'>): Promise<LinkItem> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    const { data, error = { message: 'Unknown error' } as any } = await supabase.from('links').insert({ user_id: user.id, ...link }).select().single();
    if (error) throw error;
    return data;
};

export const updateLink = async (link: LinkItem): Promise<LinkItem> => {
    const { data, error = { message: 'Unknown error' } as any } = await supabase.from('links').update({ name: link.name, description: link.description, url: link.url, tags: link.tags }).eq('id', link.id).select().single();
    if (error) throw error;
    return data;
};

export const deleteLink = async (linkId: string): Promise<void> => {
    const { error = { message: 'Unknown error' } as any } = await supabase.from('links').delete().eq('id', linkId);
    if (error) throw error;
};

export const getAudits = async (): Promise<AuditItem[]> => {
    const { data, error } = await supabase.from('audits').select('id, title, date, color, recurrence, time_of_audit, audit_type, content_text, content_checklist, note').order('date', { ascending: false });
    if (error) throw error;
    return data ? data.map(item => ({
        id: item.id, title: item.title, date: item.date, color: item.color, recurrence: item.recurrence || { type: 'none' }, timeOfAudit: item.time_of_audit ? item.time_of_audit.substring(0, 5) : undefined, audit_type: item.audit_type || 'text', content_text: item.content_text, content_checklist: item.content_checklist || [], note: item.note,
    })) : [];
};

export const addAudit = async (audit: Omit<AuditItem, 'id'>): Promise<AuditItem> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    const { data, error = { message: 'Unknown error' } as any } = await supabase.from('audits').insert({
        user_id: user.id, title: audit.title, date: audit.date, color: audit.color, recurrence: audit.recurrence, time_of_audit: audit.timeOfAudit || null, audit_type: audit.audit_type, content_text: audit.content_text, content_checklist: audit.content_checklist, note: audit.note,
    }).select().single();
    if (error) throw error;
    return { id: data.id, title: data.title, date: data.date, color: data.color, recurrence: data.recurrence || { type: 'none' }, timeOfAudit: data.time_of_audit ? data.time_of_audit.substring(0, 5) : undefined, audit_type: data.audit_type, content_text: data.content_text, content_checklist: data.content_checklist || [], note: data.note };
};

export const updateAudit = async (audit: AuditItem): Promise<AuditItem> => {
    const { id, ...auditData } = audit;
    const { data, error = { message: 'Unknown error' } as any } = await supabase.from('audits').update({
        title: auditData.title, date: auditData.date, color: auditData.color, recurrence: auditData.recurrence, time_of_audit: auditData.timeOfAudit || null, audit_type: auditData.audit_type, content_text: auditData.content_text, content_checklist: auditData.content_checklist, note: auditData.note,
    }).eq('id', id).select().single();
    if (error) throw error;
    return { id: data.id, title: data.title, date: data.date, color: data.color, recurrence: data.recurrence || { type: 'none' }, timeOfAudit: data.time_of_audit ? data.time_of_audit.substring(0, 5) : undefined, audit_type: data.audit_type, content_text: data.content_text, content_checklist: data.content_checklist || [], note: data.note };
};

export const deleteAudit = async (auditId: string): Promise<void> => {
    const { error } = await supabase.from('audits').delete().eq('id', auditId);
    if (error) throw error;
};

export const getCommentsForDocument = async (documentId: string): Promise<CommentWithAuthor[]> => {
    const { data, error } = await supabase.from('comments').select('id, created_at, content, user_id, document_id, author: profiles (id, username, avatar_url)').eq('document_id', documentId).order('created_at', { ascending: true });
    if (error) throw error;
    return data ? data.map((comment: any) => ({
        id: comment.id, created_at: comment.created_at, content: comment.content, user_id: comment.user_id, document_id: comment.document_id, author: { id: comment.author?.id || comment.user_id, name: comment.author?.username || 'Usuario', avatarUrl: comment.author?.avatar_url || null }
    })) : [];
};

export const addComment = async (documentId: string, content: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    const { error = { message: 'Unknown error' } as any } = await supabase.from('comments').insert({ document_id: documentId, content: content, user_id: user.id });
    if (error) throw error;
};

export const updateComment = async (commentId: string, content: string): Promise<void> => {
    const { error = { message: 'Unknown error' } as any } = await supabase.from('comments').update({ content: content }).eq('id', commentId);
    if (error) throw error;
};

export const deleteComment = async (commentId: string): Promise<void> => {
    const { error = { message: 'Unknown error' } as any } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) throw error;
};

export const subscribeToDocumentComments = (documentId: string, onInsert: (newComment: CommentWithAuthor) => void, onUpdate: (updatedComment: CommentWithAuthor) => void, onDelete: (deletedId: string) => void): RealtimeChannel => {
    const getCommentWithAuthor = async (comment: Comment): Promise<CommentWithAuthor> => {
        const { data: authorData } = await supabase.from('profiles').select('id, username, avatar_url').eq('id', comment.user_id).single();
        return { ...comment, author: { id: authorData?.id || comment.user_id, name: authorData?.username || 'Usuario', avatarUrl: authorData?.avatar_url } };
    };
    const channel = supabase.channel(`document-comments-${documentId}`);
    channel.on<Comment>('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `document_id=eq.${documentId}` }, async (payload) => { onInsert(await getCommentWithAuthor(payload.new)); })
           .on<Comment>('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'comments', filter: `document_id=eq.${documentId}` }, async (payload) => { onUpdate(await getCommentWithAuthor(payload.new)); })
           .on<{ id: string }>('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comments', filter: `document_id=eq.${documentId}` }, (payload) => { onDelete(payload.old.id); })
           .subscribe();
    return channel;
};

export const getWhiteboardsForUser = async (): Promise<Array<{ id: string; name: string; updated_at: string }>> => {
    const { data, error } = await supabase.from('whiteboards').select('id, name, updated_at').order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const getWhiteboardContent = async (id: string): Promise<SavedWhiteboard | null> => {
    const { data, error } = await supabase.from('whiteboards').select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
};

export const addWhiteboard = async (name: string, content: WhiteboardState): Promise<SavedWhiteboard> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    const { data, error = { message: 'Unknown error' } as any } = await supabase.from('whiteboards').insert({ name, content, user_id: user.id }).select().single();
    if (error) throw error;
    return data;
};

export const updateWhiteboard = async (id: string, name: string, content: WhiteboardState): Promise<SavedWhiteboard> => {
    const { data, error = { message: 'Unknown error' } as any } = await supabase.from('whiteboards').update({ content, name, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return data;
};

export const deleteWhiteboard = async (id: string): Promise<void> => {
    const { error = { message: 'Unknown error' } as any } = await supabase.from('whiteboards').delete().eq('id', id);
    if (error) throw error;
};

const getVaultOwnerId = async (): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) throw new Error('User not authenticated');
    const email = user.email.trim().toLowerCase();
    const targetEmail = 'darienperez695@gmail.com';
    if (['darienperez695@gmail.com', 'zerklucio@gmail.com'].includes(email)) {
        if (email === targetEmail) return user.id;
        const { data } = await supabase.rpc('get_all_users_and_permissions');
        const owner = data?.find((u: any) => u.email?.trim().toLowerCase() === targetEmail);
        if (owner) return owner.id;
    }
    return user.id;
};

export const getPasswordCategories = async (): Promise<PasswordCategory[]> => {
    const targetId = await getVaultOwnerId();
    const { data, error } = await supabase.from('password_categories').select('id, name').eq('user_id', targetId).order('name', { ascending: true });
    if (error) throw error;
    return data || [];
};

export const addPasswordCategory = async (name: string): Promise<PasswordCategory> => {
    const targetId = await getVaultOwnerId();
    const { data, error = { message: 'Unknown error' } as any } = await supabase.from('password_categories').insert({ user_id: targetId, name: name.trim() }).select().single();
    if (error) throw error;
    return data;
};

export const deletePasswordCategory = async (categoryName: string): Promise<void> => {
    const targetId = await getVaultOwnerId();
    await supabase.from('passwords').update({ category: 'General' }).eq('user_id', targetId).eq('category', categoryName);
    const { error = { message: 'Unknown error' } as any } = await supabase.from('password_categories').delete().eq('user_id', targetId).eq('name', categoryName);
    if (error) throw error;
};

export const getPasswords = async (): Promise<PasswordItem[]> => {
    const targetId = await getVaultOwnerId();
    const { data, error = { message: 'Unknown error' } as any } = await supabase.from('passwords').select('*').eq('user_id', targetId).neq('service', 'MASTER').order('service', { ascending: true });
    if (error) throw error;
    return data || [];
};

export const addPassword = async (password: Omit<PasswordItem, 'id' | 'user_id'>): Promise<PasswordItem> => {
    const targetId = await getVaultOwnerId();
    const { data, error = { message: 'Unknown error' } as any } = await supabase.from('passwords').insert({ ...password, user_id: targetId }).select().single();
    if (error) throw error;
    return data;
};

export const updatePassword = async (password: Omit<PasswordItem, 'user_id'>): Promise<PasswordItem> => {
    const { id, ...passwordData } = password;
    const { data, error = { message: 'Unknown error' } as any } = await supabase.from('passwords').update(passwordData).eq('id', id).select().single();
    if (error) throw error;
    return data;
};

export const deletePassword = async (passwordId: string): Promise<void> => {
    const { error = { message: 'Unknown error' } as any } = await supabase.from('passwords').delete().eq('id', passwordId);
    if (error) throw error;
};

// --- Global Delete Locks ---
export const getDeleteLocks = async (): Promise<Record<string, boolean>> => {
    try {
        const { data, error } = await supabase.from('global_delete_locks').select('option_name, is_locked');
        if (error) {
            console.warn("Could not fetch delete locks from database, using defaults:", error);
            return {};
        }
        const locks: Record<string, boolean> = {};
        data?.forEach((row: any) => {
            locks[row.option_name] = row.is_locked;
        });
        return locks;
    } catch (e) {
        console.error("Error fetching delete locks:", e);
        return {};
    }
};

export const updateDeleteLock = async (optionName: string, isLocked: boolean): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('global_delete_locks').upsert({
        option_name: optionName,
        is_locked: isLocked,
        updated_at: new Date().toISOString(),
        updated_by: user?.id || null
    }, { onConflict: 'option_name' });
    if (error) throw error;
};

export const getMasterPasswordHash = async (): Promise<string | null> => {
    const targetId = await getVaultOwnerId();
    const { data, error } = await supabase.from('passwords').select('password_ct').eq('user_id', targetId).eq('service', 'MASTER').single();
    if (error && error.code !== 'PGRST116') throw error;
    return data?.password_ct || null;
};

export const setMasterPasswordHash = async (hash: string): Promise<void> => {
    const targetId = await getVaultOwnerId();
    const { data: existing } = await supabase.from('passwords').select('id').eq('user_id', targetId).eq('service', 'MASTER').single();
    if (existing) await supabase.from('passwords').update({ password_ct: hash }).eq('id', existing.id);
    else await supabase.from('passwords').insert({ user_id: targetId, service: 'MASTER', username: 'SYSTEM', password_ct: hash });
};

export const addContentItem = async (content: Omit<Content, 'id'>): Promise<Content> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('User not authenticated.');
    const { data, error = { message: 'Unknown error' } as any } = await supabase.from('content').insert({ user_id: session.user.id, title: content.title, type: content.type, data: content.data }).select().single();
    if (error) throw error;
    return data as Content;
};

const LIVE_WHITEBOARD_TABLE = 'whiteboard_items_live';
export const getWhiteboardItems = async (): Promise<WhiteboardItemOld[]> => {
    const { data, error } = await supabase.from(LIVE_WHITEBOARD_TABLE).select('*');
    if (error) throw error;
    return data || [];
};

export const addWhiteboardItem = async (item: Omit<WhiteboardItemOld, 'id' | 'user_id' | 'created_at'>): Promise<WhiteboardItemOld> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    const { data, error = { message: 'Unknown error' } as any } = await supabase.from(LIVE_WHITEBOARD_TABLE).insert({ ...item, user_id: user.id }).select().single();
    if (error) throw error;
    return data;
};

export const updateWhiteboardItem = async (item: WhiteboardItemOld): Promise<WhiteboardItemOld> => {
    const { id, ...itemData } = item;
    const { data, error = { message: 'Unknown error' } as any } = await supabase.from(LIVE_WHITEBOARD_TABLE).update(itemData).eq('id', id).select().single();
    if (error) throw error;
    return data;
};

export const deleteLiveWhiteboardItem = async (id: string): Promise<void> => {
    const { error = { message: 'Unknown error' } as any } = await supabase.from(LIVE_WHITEBOARD_TABLE).delete().eq('id', id);
    if (error) throw error;
};

export const subscribeToLiveWhiteboardItems = (onInsert: (newItem: WhiteboardItemOld) => void, onUpdate: (updatedItem: WhiteboardItemOld) => void, onDelete: (deletedId: string) => void): RealtimeChannel => {
    const channel = supabase.channel('live-whiteboard-items');
    channel.on<WhiteboardItemOld>('postgres_changes', { event: 'INSERT', schema: 'public', table: LIVE_WHITEBOARD_TABLE }, (payload) => onInsert(payload.new))
           .on<WhiteboardItemOld>('postgres_changes', { event: 'UPDATE', schema: 'public', table: LIVE_WHITEBOARD_TABLE }, (payload) => onUpdate(payload.new))
           .on<{ id: string }>('postgres_changes', { event: 'DELETE', schema: 'public', table: LIVE_WHITEBOARD_TABLE }, (payload) => onDelete(payload.old.id))
           .subscribe();
    return channel;
};

export const uploadFile = async (file: File): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('User not authenticated');
    const filePath = `${session.user.id}/UPLOADS/${uuidv4()}-${sanitizeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from('user_files').upload(filePath, file);
    if (uploadError) throw uploadError;
};

// --- Admin password management (Only for PHOBOS/Darien) ---
export const adminChangeUserPassword = async (userId: string, newPassword: string): Promise<void> => {
    const { error } = await supabase.rpc('admin_change_user_password', {
        target_user_id: userId,
        new_password: newPassword
    });
    if (error) throw error;
};

// --- Admin session management (Only for PHOBOS/Darien) ---
export interface ActiveSession {
    session_id: string;
    user_id: string;
    email: string;
    nickname: string;
    created_at: string;
    updated_at: string;
    user_agent: string;
    ip: string;
}

export const adminGetActiveSessions = async (): Promise<ActiveSession[]> => {
    const { data, error } = await supabase.rpc('admin_get_active_sessions');
    if (error) throw error;
    return data || [];
};

export const checkSessionValid = async (sessionId: string): Promise<boolean> => {
    try {
        const { data, error } = await supabase.rpc('check_session_valid', {
            target_session_id: sessionId
        });
        if (error) {
            console.warn("Could not check session validity:", error);
            return true; // Fallback to avoid logging out if RPC does not exist
        }
        return data === true;
    } catch (err) {
        console.warn("Network error during session validation check:", err);
        return true; // Return true on network error so we do not log out the user
    }
};

export const adminRevokeUserSessions = async (userId: string): Promise<void> => {
    const { error } = await supabase.rpc('admin_revoke_user_sessions', {
        target_user_id: userId
    });
    if (error) throw error;
};

export const adminRevokeSession = async (sessionId: string): Promise<void> => {
    const { error } = await supabase.rpc('admin_revoke_session', {
        target_session_id: sessionId
    });
    if (error) throw error;
};

export const adminRevokeAllSessions = async (): Promise<void> => {
    const { error } = await supabase.rpc('admin_revoke_all_sessions');
    if (error) throw error;
};

export const adminBroadcastSessionRevocation = async (type: 'all' | 'user' | 'session', targetId: string): Promise<void> => {
    const channel = supabase.channel('session-revocations');
    return new Promise<void>((resolve) => {
        let isDone = false;
        const cleanup = () => {
            if (!isDone) {
                isDone = true;
                clearTimeout(safetyTimeout);
                supabase.removeChannel(channel);
                resolve();
            }
        };

        // Safety timeout: Never block for more than 1 second
        const safetyTimeout = setTimeout(() => {
            console.warn("Session revocation broadcast timed out. Resolving to avoid blocking UI.");
            cleanup();
        }, 1000);

        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                channel.send({
                    type: 'broadcast',
                    event: 'revoke',
                    payload: { type, targetId }
                }).then(() => {
                    // Short delay to allow the broadcast to send
                    setTimeout(cleanup, 250);
                }).catch((err) => {
                    console.warn("Failed to send revocation broadcast:", err);
                    cleanup();
                });
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                cleanup();
            }
        });
    });
};


