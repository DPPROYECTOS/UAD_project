
import { RealtimeChannel } from '@supabase/supabase-js';

// --- User & Auth ---
export interface User {
  id: string;
  username: string;
  avatarUrl?: string | null;
}

export interface DisplayUser {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface ThemePreferences {
  id: string;
  user_id: string;
  theme_name: 'light' | 'dark' | 'custom';
  custom_theme_colors?: Record<string, string> | null;
}

export interface UserPermissions {
  sidebar: {
    dashboard: boolean;
    proyectos: boolean;
    documentos: boolean;
    enlaces: boolean;
    auditorias: boolean;
    pizarra: boolean;
    notificaciones: boolean;
    contraseñas: boolean;
    apps: boolean;
    codex: boolean; // RENAMED FROM NEXUS
    calendario: boolean;
    administrador?: boolean;
  };
  proyectos: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canManageTasks: boolean;
  };
  proyectos_documentos: {
    canUpload: boolean;
    canView: boolean;
    canDownload: boolean;
    canDelete: boolean;
  };
  documentos: {
    canUpload: boolean;
    canDownload: boolean;
    canDelete: boolean;
    canManageFolders: boolean;
  };
  enlaces: {
    canCreateEdit: boolean;
    canDelete: boolean;
  };
  auditorias: {
    canManage: boolean;
  };
  pizarra: {
    canEdit: boolean;
  };
  juegos: {
    canUnlock: boolean;
  };
  contraseñas: {
    canManage: boolean;
  };
  apps: {
    canView: boolean;
  };
  nexus: { // Keeping the logic group but renaming label in UI
    canView: boolean;
  };
  gemini: {
    canUse: boolean;
  };
}


// --- Projects ---
export enum ProjectStatus {
  NUEVO = 'Nuevo',
  EN_PROGRESO = 'En Progreso',
  EN_REVISION = 'En Revisión',
  COMPLETO = 'Completo',
}

export type TaskStatus = 'pending' | 'completed' | 'failed';

export interface Project {
  id: string;
  name: string;
  description: string;
  objective: string;
  status: ProjectStatus;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  team: string[];
  leader: string;
  ishikawaEnabled: boolean; // NUEVO: Control de visibilidad de pestaña
  executiveSummary?: string; // NUEVO: Resumen para reporte
  finalConclusions?: string; // NUEVO: Conclusiones para reporte
}

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  status: TaskStatus; // Actualizado de completed: boolean
  startDate: string; // YYYY-MM-DD
  duration: number; // in days
  parentId: string | null;
  assignedTo?: string; // Nuevo: Responsables
  comments?: string; // Nuevo: Notas/Comentarios sobre la tarea
}

// --- Ishikawa Diagram ---
export interface IshikawaDiagramData {
  id: string;
  project_id: string;
  causes: { [category: string]: string[] };
  created_at?: string;
  updated_at?: string;
}

// --- Apps / Modules ---
export interface AppModule {
    id: string;
    label: string;
    subLabel: string;
    x: number; // Percentage 0-100
    y: number; // Percentage 0-100
    status: 'active' | 'standby' | 'offline';
    connectionSide: 'top' | 'right' | 'bottom' | 'left';
    laneOffset: number; // Pixel offset
    url?: string;
}

// --- Documents & Folders ---
export interface Folder {
    id: string;
    name: string;
    parentId: string | null;
    children?: Folder[];
}

export interface Document {
    id: string;
    name:string;
    folderId: string;
    createdAt: string;
    size: number;
    mimeType: string;
    storagePath: string;
    projectId: string | null;
}

// --- Codex Publishing (Renamed from Nexus) ---
export interface PublishedProcedure {
    id: string; // ID in External DB
    title: string;
    code: string;
    area: string;
    version: string;
    status: string;
    file_url: string;
    uad_origin_id: string; // Link to Document.id in Local DB
}

export interface PublishedFolder {
    id: string;
    origin_folder_id: string;
    area: string;
    created_at: string;
}

// Supabase Storage file type
export interface UploadedFile {
  id: string;
  name: string;
  created_at: string;
  metadata: {
    size: number;
    mimetype: string;
    [key: string]: any;
  };
}

// --- Links ---
export interface LinkItem {
    id: string;
    name: string;
    description: string;
    url: string;
    tags?: string[];
}

// --- Passwords ---
export interface PasswordItem {
  id: string;
  user_id: string;
  service: string;
  username: string;
  password_ct: string; // Ciphertext
  category: string;
}

export interface PasswordCategory {
  id: string;
  name: string;
}


// --- Audits ---
export interface RecurrenceRule {
  type: 'none' | 'weekly' | 'monthly' | 'custom';
  interval?: number; // for custom
  unit?: 'days' | 'weeks' | 'months'; // for custom
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface AuditItem {
    id: string;
    title: string;
    date: string; // YYYY-MM-DD (start date for recurring events)
    timeOfAudit?: string; // HH:MM
    color: string;
    recurrence: RecurrenceRule;
    audit_type: 'text' | 'checklist';
    content_text: string | null;
    content_checklist: ChecklistItem[] | null;
    note?: string | null;
}

// --- Notifications / Activity ---
export interface Activity {
  id: string;
  user: DisplayUser;
  action: string;
  target: string;
  timestamp: string;
  importance: 'high' | 'medium' | 'low';
  projectId?: string;
  projectName?: string;
  isRead: boolean;
}

// --- Comments ---
export interface Comment {
  id: string;
  created_at: string;
  content: string;
  user_id: string;
  document_id: string;
}

export interface CommentWithAuthor extends Comment {
  author: DisplayUser;
}


// --- UI Components ---
export interface ToastNotification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
}


// --- Content (Generic, from AI) ---
export enum ContentType {
    TEXT = 'text',
    IMAGE = 'image',
    LINK = 'link',
    TASK = 'task',
}

export interface Content {
    id: string;
    title: string;
    type: ContentType;
    data: string;
}

// --- Whiteboard (Legacy) ---
export type WhiteboardTool = 'pencil' | 'eraser' | 'note' | 'shape' | 'text';

export interface Point {
    x: number;
    y: number;
}

export interface DrawPath {
    points: Point[];
    color: string;
    strokeWidth: number;
}

export interface StickyNote {
    x: number;
    y: number;
    text: string;
    width: number;
    height: number;
}

export interface WhiteboardItemOld {
    id: string;
    item_type: 'path' | 'note';
    data: DrawPath | StickyNote;
    user_id?: string;
    created_at?: string;
}

// --- Whiteboard (New Interactive Version) ---
export type AnchorPosition = 'top' | 'right' | 'bottom' | 'left';

export interface TextStyle {
  fontFamily: 'Arial' | 'Verdana' | 'Courier New';
  fontSize: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string; // hex color for text
  listStyle?: 'none' | 'bullet' | 'number';
}

export interface WhiteboardItemBase {
  id: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  zIndex: number;
  text: string;
  style: TextStyle;
  rotation?: number; // in degrees
}

export interface TextItem extends WhiteboardItemBase {
  type: 'text';
}

export interface Note extends WhiteboardItemBase {
  type: 'note';
  color: string; // Tailwind bg color class e.g., 'bg-yellow-200'
}

export type FlowchartShapeType =
  | 'rectangle'
  | 'oval'
  | 'diamond'
  | 'parallelogram'
  | 'predefined-process'
  | 'document'
  | 'database'
  | 'connector-circle';


export interface FlowchartShape extends WhiteboardItemBase {
  type: FlowchartShapeType;
  fillColor: string; // hex color for shape fill
}

export type WhiteboardItem = Note | FlowchartShape | TextItem;

export interface Connector {
  id: string;
  from: string;
  to: string;
  fromAnchor: AnchorPosition;
  toAnchor: AnchorPosition;
  fromOffset?: number;
  toOffset?: number;
  midpointRatio?: number;
  text: string;
  style: TextStyle;
}

export interface WhiteboardState {
  items: WhiteboardItem[];
  connectors: Connector[];
}

export interface SavedWhiteboard {
  id: string;
  name: string;
  content: WhiteboardState;
  user_id: string;
  updated_at: string;
}


// --- OLD MOCK TYPES (For components/TaskOverview.tsx) ---
export enum TaskPriority {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
}

export enum OldTaskStatus {
  TODO = 'To Do',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done',
}

export interface OldTask {
  id: string;
  title: string;
  project: string;
  dueDate: string;
  priority: TaskPriority;
  status: OldTaskStatus;
}

// --- AI Studio for Video Generation ---
declare global {
    interface AIStudio {
        hasSelectedApiKey: () => Promise<boolean>;
        openSelectKey: () => Promise<void>;
    }
    interface Window {
        aistudio?: AIStudio;
    }
}
