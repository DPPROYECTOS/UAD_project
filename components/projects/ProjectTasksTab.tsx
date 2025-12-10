import React, { useState } from 'react';
import { Project, ProjectTask } from '../../types';
import { PlusIcon, TrashIcon, PencilAltIcon, CheckCircleIcon, XCircleIcon } from '../Icons';

interface ProjectTasksTabProps {
  project: Project;
  tasks: ProjectTask[];
  onAddTask: (details: { title: string; startDate: string; duration: number }, parentId?: string | null) => void;
  onToggleTask: (id: string) => void;
  onUpdateTask: (task: ProjectTask) => void;
  onDeleteTask: (id: string) => void;
  isEditor: boolean;
}

// A single task item component
const TaskItem: React.FC<{
    task: ProjectTask & { level: number };
    onToggleTask: (id: string) => void;
    onDeleteTask: (id: string) => void;
    onUpdateTask: (task: ProjectTask) => void;
    onAddTask: (details: { title: string; startDate: string; duration: number }, parentId: string) => void;
    isEditor: boolean;
}> = ({ task, onToggleTask, onDeleteTask, onUpdateTask, onAddTask, isEditor }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(task.title);
    const [editedStartDate, setEditedStartDate] = useState(task.startDate);
    const [editedDuration, setEditedDuration] = useState(task.duration);
    
    const [isAddingSubtask, setIsAddingSubtask] = useState(false);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [newSubtaskStartDate, setNewSubtaskStartDate] = useState(task.startDate);
    const [newSubtaskDuration, setNewSubtaskDuration] = useState(1);

    const handleUpdate = () => {
        const hasTitleChanged = editedTitle.trim() && editedTitle !== task.title;
        const hasDateChanged = editedStartDate !== task.startDate;
        const hasDurationChanged = editedDuration !== task.duration;

        if (hasTitleChanged || hasDateChanged || hasDurationChanged) {
            onUpdateTask({ 
                ...task, 
                title: editedTitle.trim(),
                startDate: editedStartDate,
                duration: editedDuration,
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
            }, task.id);
            setNewSubtaskTitle('');
            setNewSubtaskStartDate(task.startDate);
            setNewSubtaskDuration(1);
            setIsAddingSubtask(false);
        }
    };
    
    return (
        <div className="py-2">
            <div className="flex items-center group">
                {isEditing && isEditor ? (
                    <div className="flex-grow p-2 bg-light-bg dark:bg-dark-bg/50 rounded-md border border-dashed" style={{ paddingLeft: `${task.level * 20}px` }}>
                        <div className="space-y-2">
                            <input
                                type="text"
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                autoFocus
                                className="w-full text-sm bg-light-card dark:bg-dark-card p-1 border rounded-md focus:ring-1 focus:ring-brand-accent focus:outline-none"
                            />
                            <div className="flex items-end gap-2">
                                <div>
                                    <label className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Inicio</label>
                                    <input type="date" value={editedStartDate} onChange={e => setEditedStartDate(e.target.value)} className="w-full text-xs p-1 border rounded-md bg-light-card dark:bg-dark-card" />
                                </div>
                                <div>
                                    <label className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Duración</label>
                                    <input type="number" value={editedDuration} min="1" onChange={e => setEditedDuration(parseInt(e.target.value) || 1)} className="w-20 text-xs p-1 border rounded-md bg-light-card dark:bg-dark-card" placeholder="Días"/>
                                </div>
                                <button onClick={handleUpdate} className="p-1 rounded-full text-green-500 hover:bg-green-100"><CheckCircleIcon className="h-6 w-6"/></button>
                                <button onClick={() => setIsEditing(false)} className="p-1 rounded-full text-red-500 hover:bg-red-100"><XCircleIcon className="h-6 w-6"/></button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ paddingLeft: `${task.level * 20}px` }} className="flex-grow flex items-center">
                        <button onClick={() => isEditor && onToggleTask(task.id)} className={`mr-3 flex-shrink-0 ${isEditor ? 'cursor-pointer' : 'cursor-default'}`}>
                            {task.completed ? <CheckCircleIcon className="h-6 w-6 text-green-500" /> : <div className="h-6 w-6 rounded-full border-2 border-gray-400 dark:border-gray-500 group-hover:border-brand-primary" />}
                        </button>
                        <div className="flex-grow">
                            <span className={`text-sm ${task.completed ? 'line-through text-gray-500' : ''}`}>{task.title}</span>
                            <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                <span>Inicio: {new Date(task.startDate + 'T00:00:00').toLocaleDateString('es-ES', { timeZone: 'UTC' })}</span>
                                <span className="ml-2">Duración: {task.duration} día(s)</span>
                            </div>
                        </div>
                    </div>
                )}
                {isEditor && !isEditing && (
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setIsAddingSubtask(true)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Añadir subtarea">
                            <PlusIcon className="h-4 w-4" />
                        </button>
                        <button onClick={() => setIsEditing(true)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Editar tarea">
                            <PencilAltIcon className="h-4 w-4" />
                        </button>
                        <button onClick={() => onDeleteTask(task.id)} className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50" title="Eliminar tarea">
                            <TrashIcon className="h-4 w-4 text-red-500" />
                        </button>
                    </div>
                )}
            </div>
            {isAddingSubtask && isEditor && (
                <div className="mt-2 p-3 rounded-md bg-light-bg dark:bg-dark-bg/50 space-y-2 border border-dashed border-light-border dark:border-dark-border" style={{ marginLeft: `${(task.level + 1) * 20}px` }}>
                    <input
                        type="text"
                        value={newSubtaskTitle}
                        onChange={e => setNewSubtaskTitle(e.target.value)}
                        placeholder="Título de la subtarea..."
                        autoFocus
                        className="w-full text-sm bg-light-card dark:bg-dark-card p-2 border border-light-border dark:border-dark-border rounded-md focus:ring-1 focus:ring-brand-accent focus:outline-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Fecha Inicio</label>
                            <input type="date" value={newSubtaskStartDate} onChange={e => setNewSubtaskStartDate(e.target.value)} className="w-full text-sm bg-light-card dark:bg-dark-card p-1.5 border border-light-border dark:border-dark-border rounded-md"/>
                        </div>
                        <div>
                            <label className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Duración</label>
                            <input type="number" value={newSubtaskDuration} min="1" onChange={e => setNewSubtaskDuration(parseInt(e.target.value) || 1)} className="w-full text-sm bg-light-card dark:bg-dark-card p-1.5 border border-light-border dark:border-dark-border rounded-md" placeholder="Días"/>
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                        <button onClick={() => setIsAddingSubtask(false)} className="px-3 py-1 text-xs font-medium rounded-md border border-light-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-border">Cancelar</button>
                        <button onClick={handleAddSubtask} disabled={!newSubtaskTitle.trim()} className="px-3 py-1 text-xs font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary disabled:bg-brand-primary/50">Añadir</button>
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

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTaskTitle.trim()) {
            onAddTask({
                title: newTaskTitle.trim(),
                startDate: newTaskStartDate,
                duration: newTaskDuration,
            }, null); // Add as a root task
            setNewTaskTitle('');
            setNewTaskStartDate(project.startDate);
            setNewTaskDuration(1);
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
            <h3 className="text-lg font-bold mb-4">Lista de Tareas</h3>
            {isEditor && (
                <form onSubmit={handleAddTask} className="p-4 rounded-lg bg-light-bg dark:bg-dark-bg/50 border border-dashed border-light-border dark:border-dark-border mb-4 space-y-3">
                    <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Título de la nueva tarea raíz..."
                        className="w-full px-3 py-2 text-sm rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Fecha de Inicio</label>
                            <input
                                type="date"
                                value={newTaskStartDate}
                                onChange={e => setNewTaskStartDate(e.target.value)}
                                className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Duración (días hábiles)</label>
                            <input
                                type="number"
                                value={newTaskDuration}
                                min="1"
                                onChange={e => setNewTaskDuration(parseInt(e.target.value, 10) || 1)}
                                className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
                            />
                        </div>
                        <button type="submit" disabled={!newTaskTitle.trim()} className="flex items-center justify-center self-end px-4 py-2 text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary disabled:bg-brand-primary/50">
                            <PlusIcon className="h-5 w-5 mr-2" />
                            Añadir Tarea
                        </button>
                    </div>
                </form>
            )}
            
            <div className="divide-y divide-light-border dark:divide-dark-border">
                {hierarchicalTasks.length > 0 ? (
                    hierarchicalTasks.map(task => (
                        <TaskItem
                            key={task.id}
                            task={task}
                            onToggleTask={onToggleTask}
                            onDeleteTask={onDeleteTask}
                            onUpdateTask={onUpdateTask}
                            onAddTask={(details, parentId) => onAddTask(details, parentId)}
                            isEditor={isEditor}
                        />
                    ))
                ) : (
                    <p className="text-center py-8 text-sm text-gray-500">No hay tareas en este proyecto.</p>
                )}
            </div>
        </div>
    );
};

export default ProjectTasksTab;