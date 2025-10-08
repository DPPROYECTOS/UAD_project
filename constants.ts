

import { Project, ProjectStatus, ProjectTask, DisplayUser, Activity, TaskPriority, OldTaskStatus as TaskStatus } from './types';

// --- NEW MOCK DATA FOR PROJECT MANAGEMENT MODULE ---

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj-001',
    name: 'Plataforma E-commerce 2.0',
    description: 'Actualización completa de la plataforma de comercio electrónico para mejorar la experiencia del usuario y el rendimiento.',
    objective: 'Aumentar la tasa de conversión en un 15% y reducir el tiempo de carga de la página en un 30% para Q4.',
    status: ProjectStatus.EN_PROGRESO,
    startDate: '2024-06-01',
    endDate: '2024-12-15',
    team: ['Ana Torres', 'Carlos Vega', 'Luisa Méndez'],
    leader: 'Ana Torres',
  },
  {
    id: 'proj-002',
    name: 'Sistema de Gestión de Almacén (SGA)',
    description: 'Implementar un nuevo SGA para optimizar el inventario y la logística de empaque.',
    objective: 'Reducir los errores de envío en un 95% y mejorar la eficiencia del picking en un 20%.',
    status: ProjectStatus.NUEVO,
    startDate: '2024-08-01',
    endDate: '2025-02-28',
    team: ['Pedro Jiménez', 'Sofía Navarro'],
    leader: 'Pedro Jiménez',
  },
  {
    id: 'proj-003',
    name: 'Campaña de Marketing Digital Q3',
    description: 'Lanzamiento de una campaña multicanal para promocionar la nueva línea de productos de verano.',
    objective: 'Generar 5,000 leads calificados y alcanzar 1 millón de impresiones en redes sociales.',
    status: ProjectStatus.COMPLETO,
    startDate: '2024-07-01',
    endDate: '2024-09-30',
    team: ['Isabel Romero', 'Jorge Gil'],
    leader: 'Isabel Romero',
  },
  {
    id: 'proj-004',
    name: 'Auditoría de Seguridad Interna',
    description: 'Realizar una auditoría completa de los sistemas informáticos para identificar y mitigar vulnerabilidades.',
    objective: 'Cumplir con el 100% de los estándares de seguridad ISO 27001 y presentar el informe final antes de fin de año.',
    status: ProjectStatus.EN_REVISION,
    startDate: '2024-05-15',
    endDate: '2024-11-20',
    team: ['David Soler', 'Ana Torres'],
    leader: 'David Soler',
  },
];

export const MOCK_TASKS: ProjectTask[] = [
  // Tasks for Project 1
  // FIX: Added missing startDate and duration properties to conform to ProjectTask type.
  { id: 'task-01', projectId: 'proj-001', title: 'Definir la arquitectura del frontend', completed: true, startDate: '2024-06-05', duration: 5 },
  // FIX: Added missing startDate and duration properties to conform to ProjectTask type.
  { id: 'task-02', projectId: 'proj-001', title: 'Diseñar mockups de la nueva interfaz de usuario', completed: true, startDate: '2024-06-10', duration: 10 },
  // FIX: Added missing startDate and duration properties to conform to ProjectTask type.
  { id: 'task-03', projectId: 'proj-001', title: 'Desarrollar el módulo de carrito de compras', completed: false, startDate: '2024-06-20', duration: 15 },
  // FIX: Added missing startDate and duration properties to conform to ProjectTask type.
  { id: 'task-04', projectId: 'proj-001', title: 'Integrar pasarela de pago', completed: false, startDate: '2024-07-05', duration: 10 },
  // Tasks for Project 2
  // FIX: Added missing startDate and duration properties to conform to ProjectTask type.
  { id: 'task-05', projectId: 'proj-002', title: 'Analizar requerimientos con el equipo de logística', completed: true, startDate: '2024-08-02', duration: 7 },
  // FIX: Added missing startDate and duration properties to conform to ProjectTask type.
  { id: 'task-06', projectId: 'proj-002', title: 'Seleccionar proveedor de software SGA', completed: false, startDate: '2024-08-10', duration: 10 },
  // Tasks for Project 3 (All completed)
  // FIX: Added missing startDate and duration properties to conform to ProjectTask type.
  { id: 'task-07', projectId: 'proj-003', title: 'Crear contenido para redes sociales', completed: true, startDate: '2024-07-01', duration: 10 },
  // FIX: Added missing startDate and duration properties to conform to ProjectTask type.
  { id: 'task-08', projectId: 'proj-003', title: 'Configurar campañas de Google Ads', completed: true, startDate: '2024-07-05', duration: 5 },
  // FIX: Added missing startDate and duration properties to conform to ProjectTask type.
  { id: 'task-09', projectId: 'proj-003', title: 'Enviar newsletter de lanzamiento', completed: true, startDate: '2024-07-15', duration: 2 },
  // Tasks for Project 4
  // FIX: Added missing startDate and duration properties to conform to ProjectTask type.
  { id: 'task-10', projectId: 'proj-004', title: 'Realizar escaneo de vulnerabilidades de red', completed: true, startDate: '2024-05-20', duration: 7 },
  // FIX: Added missing startDate and duration properties to conform to ProjectTask type.
  { id: 'task-11', projectId: 'proj-004', title: 'Revisar políticas de control de acceso', completed: true, startDate: '2024-05-28', duration: 14 },
  // FIX: Added missing startDate and duration properties to conform to ProjectTask type.
  { id: 'task-12', projectId: 'proj-004', title: 'Redactar informe preliminar de hallazgos', completed: false, startDate: '2024-06-15', duration: 10 },
];


// --- OLD MOCK DATA ---
export const MOCK_USER: DisplayUser = {
  name: 'Maria Garcia',
  avatarUrl: 'https://picsum.photos/seed/user1/100/100',
};

export const MOCK_USERS: DisplayUser[] = [
  { name: 'John Doe', avatarUrl: 'https://picsum.photos/seed/user2/100/100' },
  { name: 'Jane Smith', avatarUrl: 'https://picsum.photos/seed/user3/100/100' },
  { name: 'Carlos Ray', avatarUrl: 'https://picsum.photos/seed/user4/100/100' },
  { name: 'Aisha Khan', avatarUrl: 'https://picsum.photos/seed/user5/100/100' },
];

export const MOCK_ACTIVITIES: Activity[] = [
    {
        id: 'act1',
        user: MOCK_USERS[1],
        action: 'completed task',
        target: '\'Initial UI/UX Research\'',
        timestamp: '2 hours ago',
        // FIX: Added missing 'importance' property to conform to Activity type.
        importance: 'low',
    },
    {
        id: 'act2',
        user: MOCK_USERS[0],
        action: 'added a new project',
        target: '\'Q4 Financial Planning\'',
        timestamp: '8 hours ago',
        // FIX: Added missing 'importance' property to conform to Activity type.
        importance: 'medium',
    },
    {
        id: 'act3',
        user: MOCK_USERS[2],
        action: 'commented on task',
        target: '\'Develop user authentication flow\'',
        timestamp: '1 day ago',
        // FIX: Added missing 'importance' property to conform to Activity type.
        importance: 'low',
    },
    {
        id: 'act4',
        user: MOCK_USERS[3],
        action: 'pushed a commit to',
        target: '\'Website Redesign\'',
        timestamp: '2 days ago',
        // FIX: Added missing 'importance' property to conform to Activity type.
        importance: 'low',
    },
];