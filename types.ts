import { RealtimeChannel } from '@supabase/supabase-js';

// --- User & Auth ---
export interface User {
  id: string;
  username: string;
}

export interface DisplayUser {
  name: string;
  avatarUrl: string;
}

// --- Projects ---
export enum ProjectStatus {
  NUEVO = 'Nuevo',
  EN_PROGRESO = 'En Progreso',
  EN_REVISION = 'En Revisión',
  COMPLETO = 'Completo',
}

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
}

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  completed: boolean;
  startDate: string; // YYYY-MM-DD
  duration: number; // in days
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
}

// --- Audits ---
export interface RecurrenceRule {
  type: 'none' | 'weekly' | 'monthly' | 'custom';
  interval?: number; // for custom
  unit?: 'days' | 'weeks' | 'months'; // for custom
}

export interface AuditItem {
    id: string;
    title: string;
    date: string; // YYYY-MM-DD (start date for recurring events)
    color: string;
    recurrence: RecurrenceRule;
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

export type WhiteboardItem = Note | FlowchartShape;

export interface Connector {
  id: string;
  from: string;
  to: string;
  fromAnchor: AnchorPosition;
  toAnchor: AnchorPosition;
  fromOffset?: number;
  toOffset?: number;
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
