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
    const [isAddingSubtask, setIsAddingSubtask] = useState(false);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

    const handleUpdate = () => {
        if (editedTitle.trim() && editedTitle !== task.title) {
            onUpdateTask({ ...task, title: editedTitle.trim() });
        }
        setIsEditing(false);
    };

    const handleAddSubtask = () => {
        if (newSubtaskTitle.trim()) {
            onAddTask({ title: newSubtaskTitle.trim(), startDate: task.startDate, duration: 1 }, task.id);
            setNewSubtaskTitle('');
            setIsAddingSubtask(false);
        }
    };
    
    return (
        <div className="py-2">
            <div className="flex items-center group">
                <div style={{ paddingLeft: `${task.level * 20}px` }} className="flex-grow flex items-center">
                    <button onClick={() => isEditor && onToggleTask(task.id)} className={`mr-3 flex-shrink-0 ${isEditor ? 'cursor-pointer' : 'cursor-default'}`}>
                        {task.completed ? <CheckCircleIcon className="h-6 w-6 text-green-500" /> : <div className="h-6 w-6 rounded-full border-2 border-gray-400 dark:border-gray-500 group-hover:border-brand-primary" />}
                    </button>
                    {isEditing && isEditor ? (
                        <input
                            type="text"
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            onBlur={handleUpdate}
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                            autoFocus
                            className="w-full bg-transparent p-1 border-b-2 border-brand-primary focus:outline-none"
                        />
                    ) : (
                        <span className={`text-sm ${task.completed ? 'line-through text-gray-500' : ''}`}>{task.title}</span>
                    )}
                </div>
                {isEditor && (
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
                <div className="flex items-center mt-1" style={{ paddingLeft: `${(task.level + 1) * 20}px` }}>
                     <input
                        type="text"
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                        placeholder="Nueva subtarea..."
                        autoFocus
                        className="w-full text-sm bg-transparent p-1 border-b-2 border-brand-primary focus:outline-none"
                    />
                    <button onClick={handleAddSubtask} className="p-1 rounded-full text-green-500"><CheckCircleIcon className="h-5 w-5"/></button>
                    <button onClick={() => setIsAddingSubtask(false)} className="p-1 rounded-full text-red-500"><XCircleIcon className="h-5 w-5"/></button>
                </div>
            )}
        </div>
    );
};


const ProjectTasksTab: React.FC<ProjectTasksTabProps> = ({ project, tasks, onAddTask, onToggleTask, onUpdateTask, onDeleteTask, isEditor }) => {
    const [newTaskTitle, setNewTaskTitle] = useState('');

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTaskTitle.trim()) {
            onAddTask({
                title: newTaskTitle.trim(),
                startDate: project.startDate, // Default to project start date
                duration: 1, // Default duration
            }, null); // Add as a root task
            setNewTaskTitle('');
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
                <form onSubmit={handleAddTask} className="flex items-center gap-2 mb-4">
                    <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Añadir una nueva tarea raíz..."
                        className="w-full px-3 py-2 text-sm rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    />
                    <button type="submit" className="flex-shrink-0 p-2 rounded-lg text-white bg-brand-primary hover:bg-brand-secondary disabled:bg-brand-primary/50" disabled={!newTaskTitle.trim()}>
                        <PlusIcon className="h-5 w-5" />
                    </button>
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
