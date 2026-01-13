
import React, { useState } from 'react';
import { Project, ProjectTask, TaskStatus } from '../../types';
import { PlusIcon, TrashIcon, PencilAltIcon, CheckCircleIcon, XCircleIcon, UserCircleIcon, InformationCircleIcon } from '../Icons';

interface ProjectTasksTabProps {
  project: Project;
  tasks: ProjectTask[];
  onAddTask: (details: { title: string; startDate: string; duration: number; assignedTo: string; comments?: string }, parentId?: string | null) => void;
  onToggleTask: (id: string) => void;
  onUpdateTask: (task: ProjectTask) => void;
  onDeleteTask: (id: string) => void;
  isEditor: boolean;
}

// Icono dinámico según el estado
const TaskStatusIcon: React.FC<{ status: TaskStatus; className?: string }> = ({ status, className }) => {
    switch (status) {
        case 'completed':
            return <CheckCircleIcon className={`${className} text-green-500`} />;
        case 'failed':
            return <XCircleIcon className={`${className} text-red-500`} />;
        default:
            return <div className={`${className} rounded-full border-2 border-gray-400 dark:border-gray-500`} />;
    }
};

// A single task item component
const TaskItem: React.FC<{
    task: ProjectTask & { level: number };
    onToggleTask: (id: string) => void;
    onDeleteTask: (id: string) => void;
    onUpdateTask: (task: ProjectTask) => void;
    onAddTask: (details: { title: string; startDate: string; duration: number; assignedTo: string; comments?: string }, parentId: string) => void;
    isEditor: boolean;
}> = ({ task, onToggleTask, onDeleteTask, onUpdateTask, onAddTask, isEditor }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(task.title);
    const [editedStartDate, setEditedStartDate] = useState(task.startDate);
    const [editedDuration, setEditedDuration] = useState(task.duration);
    const [editedAssignedTo, setEditedAssignedTo] = useState(task.assignedTo || '');
    const [editedComments, setEditedComments] = useState(task.comments || '');
    
    const [isAddingSubtask, setIsAddingSubtask] = useState(false);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [newSubtaskStartDate, setNewSubtaskStartDate] = useState(task.startDate);
    const [newSubtaskDuration, setNewSubtaskDuration] = useState(1);
    const [newSubtaskAssignedTo, setNewSubtaskAssignedTo] = useState('');
    const [newSubtaskComments, setNewSubtaskComments] = useState('');

    const handleUpdate = () => {
        const hasTitleChanged = editedTitle.trim() && editedTitle !== task.title;
        const hasDateChanged = editedStartDate !== task.startDate;
        const hasDurationChanged = editedDuration !== task.duration;
        const hasAssignedToChanged = editedAssignedTo !== task.assignedTo;
        const hasCommentsChanged = editedComments !== task.comments;

        if (hasTitleChanged || hasDateChanged || hasDurationChanged || hasAssignedToChanged || hasCommentsChanged) {
            onUpdateTask({ 
                ...task, 
                title: editedTitle.trim(),
                startDate: editedStartDate,
                duration: editedDuration,
                assignedTo: editedAssignedTo.trim(),
                comments: editedComments.trim()
            });
        }
        setIsEditing(false);
    };

    const handleAddSubtask = () => {
        if (newSubtaskTitle.trim()) {
            onAddTask({ 
                title: newSubtaskTitle.trim(),
                startDate: newSubtaskStartDate,
                duration: newSubtaskDuration,
                assignedTo: newSubtaskAssignedTo.trim(),
                comments: newSubtaskComments.trim()
            }, task.id);
            setNewSubtaskTitle('');
            setNewSubtaskStartDate(task.startDate);
            setNewSubtaskDuration(1);
            setNewSubtaskAssignedTo('');
            setNewSubtaskComments('');
            setIsAddingSubtask(false);
        }
    };

    const getTaskTextStyle = () => {
        if (task.status === 'completed') return 'line-through text-gray-500';
        if (task.status === 'failed') return 'line-through text-red-500/70';
        return 'text-light-text dark:text-dark-text';
    };
    
    return (
        <div className="py-2">
            <div className="flex items-center group">
                {isEditing && isEditor ? (
                    <div className="flex-grow p-4 bg-light-bg dark:bg-dark-bg/50 rounded-md border border-dashed border-brand-primary/50" style={{ paddingLeft: `${task.level * 20}px` }}>
                        <div className="space-y-3">
                            <input
                                type="text"
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                placeholder="Título de la tarea"
                                autoFocus
                                className="w-full text-sm bg-light-card dark:bg-dark-card p-2 border rounded-md focus:ring-1 focus:ring-brand-accent focus:outline-none"
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    value={editedAssignedTo}
                                    onChange={(e) => setEditedAssignedTo(e.target.value)}
                                    placeholder="Responsable(s)"
                                    className="w-full text-sm bg-light-card dark:bg-dark-card p-2 border rounded-md focus:ring-1 focus:ring-brand-accent focus:outline-none"
                                />
                                <div className="flex items-end gap-2">
                                    <div className="flex-1">
                                        <label className="text-[10px] uppercase font-bold text-light-text-secondary dark:text-dark-text-secondary">Inicio</label>
                                        <input type="date" value={editedStartDate} onChange={e => setEditedStartDate(e.target.value)} className="w-full text-xs p-2 border rounded-md bg-light-card dark:bg-dark-card" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-light-text-secondary dark:text-dark-text-secondary">Días</label>
                                        <input type="number" value={editedDuration} min="1" onChange={e => setEditedDuration(parseInt(e.target.value) || 1)} className="w-16 text-xs p-2 border rounded-md bg-light-card dark:bg-dark-card" placeholder="Días"/>
                                    </div>
                                </div>
                            </div>
                            <textarea
                                value={editedComments}
                                onChange={(e) => setEditedComments(e.target.value)}
                                placeholder="Comentarios u observaciones relevantes sobre la tarea..."
                                rows={2}
                                className="w-full text-xs bg-light-card dark:bg-dark-card p-2 border rounded-md focus:ring-1 focus:ring-brand-accent focus:outline-none resize-none"
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-xs font-bold uppercase text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors">Cancelar</button>
                                <button onClick={handleUpdate} className="px-3 py-1 text-xs font-bold uppercase text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors">Guardar</button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ paddingLeft: `${task.level * 20}px` }} className="flex-grow flex items-start">
                        <button 
                            onClick={() => isEditor && onToggleTask(task.id)} 
                            className={`mt-1 mr-3 flex-shrink-0 transition-transform active:scale-90 ${isEditor ? 'cursor-pointer' : 'cursor-default'}`}
                            title="Alternar estado: Pendiente -> Completado -> Fallido"
                        >
                            <TaskStatusIcon status={task.status} className="h-6 w-6" />
                        </button>
                        <div className="flex-grow">
                            <span className={`text-sm font-medium transition-all ${getTaskTextStyle()}`}>{task.title}</span>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-0.5">
                                <div className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary flex items-center gap-1">
                                    <span className="opacity-70">Inicio:</span> {new Date(task.startDate + 'T00:00:00').toLocaleDateString('es-ES', { timeZone: 'UTC' })}
                                    <span className="ml-1 opacity-70">({task.duration}d)</span>
                                </div>
                                <div className={`text-[10px] uppercase flex items-center gap-1 ${task.assignedTo ? 'text-brand-primary font-bold' : 'text-gray-400 italic'}`}>
                                    <UserCircleIcon className="h-3 w-3" /> {task.assignedTo || 'Responsable no Asignado'}
                                </div>
                                {task.status === 'failed' && (
                                    <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter">[NO COMPLETADO]</span>
                                )}
                            </div>
                            {task.comments && (
                                <div className="mt-1.5 p-2 bg-light-bg/50 dark:bg-dark-bg/30 rounded border-l-2 border-brand-primary/30 flex gap-2">
                                    <InformationCircleIcon className="h-3.5 w-3.5 text-brand-primary/50 mt-0.5 shrink-0" />
                                    <p className="text-[11px] italic text-light-text-secondary dark:text-dark-text-secondary leading-tight whitespace-pre-wrap">{task.comments}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {isEditor && !isEditing && (
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                        <button onClick={() => setIsAddingSubtask(true)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-light-text-secondary" title="Añadir subtarea">
                            <PlusIcon className="h-4 w-4" />
                        </button>
                        <button onClick={() => setIsEditing(true)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-light-text-secondary" title="Editar tarea">
                            <PencilAltIcon className="h-4 w-4" />
                        </button>
                        <button onClick={() => onDeleteTask(task.id)} className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500" title="Eliminar tarea">
                            <TrashIcon className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>
            {isAddingSubtask && isEditor && (
                <div className="mt-2 p-4 rounded-md bg-light-bg dark:bg-dark-bg/50 space-y-3 border border-dashed border-light-border dark:border-dark-border shadow-inner" style={{ marginLeft: `${(task.level + 1) * 20}px` }}>
                    <div className="space-y-3">
                        <input
                            type="text"
                            value={newSubtaskTitle}
                            onChange={e => setNewSubtaskTitle(e.target.value)}
                            placeholder="Título de la subtarea..."
                            autoFocus
                            className="w-full text-sm bg-light-card dark:bg-dark-card p-2 border border-light-border dark:border-dark-border rounded-md focus:ring-1 focus:ring-brand-accent focus:outline-none"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input
                                type="text"
                                value={newSubtaskAssignedTo}
                                onChange={e => setNewSubtaskAssignedTo(e.target.value)}
                                placeholder="Responsable(s)"
                                className="w-full text-sm bg-light-card dark:bg-dark-card p-2 border border-light-border dark:border-dark-border rounded-md focus:ring-1 focus:ring-brand-accent focus:outline-none"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-light-text-secondary dark:text-dark-text-secondary">Inicio</label>
                                    <input type="date" value={newSubtaskStartDate} onChange={e => setNewSubtaskStartDate(e.target.value)} className="w-full text-xs bg-light-card dark:bg-dark-card p-1.5 border border-light-border dark:border-dark-border rounded-md"/>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-light-text-secondary dark:text-dark-text-secondary">Días</label>
                                    <input type="number" value={newSubtaskDuration} min="1" onChange={e => setNewSubtaskDuration(parseInt(e.target.value) || 1)} className="w-full text-xs bg-light-card dark:bg-dark-card p-1.5 border border-light-border dark:border-dark-border rounded-md" placeholder="Días"/>
                                </div>
                            </div>
                        </div>
                        <textarea
                            value={newSubtaskComments}
                            onChange={(e) => setNewSubtaskComments(e.target.value)}
                            placeholder="Comentarios adicionales para esta subtarea..."
                            rows={2}
                            className="w-full text-xs bg-light-card dark:bg-dark-card p-2 border rounded-md focus:ring-1 focus:ring-brand-accent focus:outline-none resize-none"
                        />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                        <button onClick={() => setIsAddingSubtask(false)} className="px-3 py-1 text-xs font-medium rounded-md border border-light-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-border">Cancelar</button>
                        <button onClick={handleAddSubtask} disabled={!newSubtaskTitle.trim()} className="px-3 py-1 text-xs font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary disabled:bg-brand-primary/50">Añadir Subtarea</button>
                    </div>
                </div>
            )}
        </div>
    );
};


const ProjectTasksTab: React.FC<ProjectTasksTabProps> = ({ project, tasks, onAddTask, onToggleTask, onUpdateTask, onDeleteTask, isEditor }) => {
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskStartDate, setNewTaskStartDate] = useState(project.startDate);
    const [newTaskDuration, setNewTaskDuration] = useState(1);
    const [newTaskAssignedTo, setNewTaskAssignedTo] = useState('');
    const [newTaskComments, setNewTaskComments] = useState('');

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTaskTitle.trim()) {
            onAddTask({
                title: newTaskTitle.trim(),
                startDate: newTaskStartDate,
                duration: newTaskDuration,
                assignedTo: newTaskAssignedTo.trim(),
                comments: newTaskComments.trim()
            }, null); // Add as a root task
            setNewTaskTitle('');
            setNewTaskStartDate(project.startDate);
            setNewTaskDuration(1);
            setNewTaskAssignedTo('');
            setNewTaskComments('');
        }
    };

    // Helper to create a hierarchical structure for rendering
    const getHierarchicalTasks = (tasks: ProjectTask[]): (ProjectTask & { level: number })[] => {
        const taskMap = new Map(tasks.map(task => [task.id, { ...task, children: [] as ProjectTask[] }]));
        const rootTasks: (ProjectTask & { children: ProjectTask[] })[] = [];

        tasks.forEach(task => {
            if (task.parentId && taskMap.has(task.parentId)) {
                taskMap.get(task.parentId)?.children.push(taskMap.get(task.id)!);
            } else {
                rootTasks.push(taskMap.get(task.id)!);
            }
        });
        
        // Sort children by start date
        taskMap.forEach(task => task.children.sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));
        rootTasks.sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());


        const flattened: (ProjectTask & { level: number })[] = [];
        const traverse = (task: ProjectTask, level: number) => {
            flattened.push({ ...task, level });
            taskMap.get(task.id)?.children.forEach(child => traverse(child, level + 1));
        };

        rootTasks.forEach(task => traverse(task, 0));
        return flattened;
    };

    const hierarchicalTasks = getHierarchicalTasks(tasks);

    return (
        <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg border border-light-border dark:border-dark-border">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <PlusIcon className="h-5 w-5 text-brand-primary" />
                Gestión de Tareas
            </h3>
            {isEditor && (
                <form onSubmit={handleAddTask} className="p-4 rounded-lg bg-light-bg dark:bg-dark-bg/50 border border-dashed border-brand-primary/30 mb-6 space-y-4 shadow-inner">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            type="text"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Título de la nueva tarea raíz..."
                            className="w-full px-3 py-2 text-sm rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-brand-accent transition-all"
                        />
                        <input
                            type="text"
                            value={newTaskAssignedTo}
                            onChange={(e) => setNewTaskAssignedTo(e.target.value)}
                            placeholder="Responsable(s) (ej: Juan Pérez, María G.)"
                            className="w-full px-3 py-2 text-sm rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-brand-accent transition-all"
                        />
                    </div>
                    <textarea
                        value={newTaskComments}
                        onChange={(e) => setNewTaskComments(e.target.value)}
                        placeholder="Observaciones o notas iniciales..."
                        rows={2}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-brand-accent transition-all resize-none"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                        <div>
                            <label className="text-[10px] uppercase font-black tracking-widest text-light-text-secondary dark:text-dark-text-secondary mb-1 block">Fecha de Inicio</label>
                            <input
                                type="date"
                                value={newTaskStartDate}
                                onChange={e => setNewTaskStartDate(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card focus:ring-1 focus:ring-brand-accent"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-black tracking-widest text-light-text-secondary dark:text-dark-text-secondary mb-1 block">Duración (Días)</label>
                            <input
                                type="number"
                                value={newTaskDuration}
                                min="1"
                                onChange={e => setNewTaskDuration(parseInt(e.target.value, 10) || 1)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card focus:ring-1 focus:ring-brand-accent"
                            />
                        </div>
                        <button type="submit" disabled={!newTaskTitle.trim()} className="flex items-center justify-center h-10 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-md text-white bg-brand-primary hover:bg-brand-secondary disabled:bg-brand-primary/50 transition-all shadow-md">
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Añadir Tarea Raíz
                        </button>
                    </div>
                </form>
            )}
            
            <div className="divide-y divide-light-border dark:divide-dark-border border-t border-light-border dark:border-dark-border">
                {hierarchicalTasks.length > 0 ? (
                    hierarchicalTasks.map(task => (
                        <TaskItem
                            key={task.id}
                            task={task}
                            onToggleTask={onToggleTask}
                            onDeleteTask={onDeleteTask}
                            onUpdateTask={onUpdateTask}
                            onAddTask={(details, parentId) => onAddTask({...details, assignedTo: details.assignedTo}, parentId)}
                            isEditor={isEditor}
                        />
                    ))
                ) : (
                    <div className="py-12 text-center">
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary italic">No se han definido tareas para este proyecto.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectTasksTab;
