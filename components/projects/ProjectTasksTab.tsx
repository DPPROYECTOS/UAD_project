import React, { useState } from 'react';
import { Project, ProjectTask } from '../../types';
import { PlusIcon, TrashIcon, ClipboardListIcon, CalendarIcon, ClockIcon, PencilAltIcon, InformationCircleIcon } from '../Icons';

interface ProjectTasksTabProps {
  project: Project;
  tasks: ProjectTask[];
  onAddTask: (details: { title: string; startDate: string; duration: number }) => void;
  onToggleTask: (id: string) => void;
  onUpdateTask: (task: ProjectTask) => void;
  onDeleteTask: (id: string) => void;
}

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const ProjectTasksTab: React.FC<ProjectTasksTabProps> = ({ project, tasks, onAddTask, onToggleTask, onUpdateTask, onDeleteTask }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskStartDate, setNewTaskStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTaskDuration, setNewTaskDuration] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskData, setEditingTaskData] = useState<{ startDate: string; duration: number }>({ startDate: '', duration: 1 });

  const validateTaskDates = (startDateStr: string, duration: number): boolean => {
    const projectEndDate = project.endDate ? new Date(project.endDate + 'T23:59:59') : null; // Use end of day for comparison
    if (!projectEndDate) {
      return true; // No project end date, so no validation needed
    }

    const taskStartDate = new Date(startDateStr + 'T00:00:00');
    const taskEndDate = addDays(taskStartDate, duration - 1); // Duration of 1 day ends on the start day

    if (taskEndDate > projectEndDate) {
      setFormError(`La tarea no puede terminar después de la fecha de finalización del proyecto (${projectEndDate.toLocaleDateString()}).`);
      return false;
    }
    
    setFormError(null);
    return true;
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateTaskDates(newTaskStartDate, newTaskDuration) && newTaskTitle.trim() && newTaskDuration > 0) {
      onAddTask({
        title: newTaskTitle.trim(),
        startDate: newTaskStartDate,
        duration: newTaskDuration,
      });
      setNewTaskTitle('');
      setNewTaskStartDate(new Date().toISOString().split('T')[0]);
      setNewTaskDuration(1);
      setFormError(null);
    }
  };

  const handleEditClick = (task: ProjectTask) => {
    setEditingTaskId(task.id);
    setEditingTaskData({ startDate: task.startDate, duration: task.duration });
    setFormError(null);
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setFormError(null);
  };

  const handleSaveEdit = (task: ProjectTask) => {
    if (validateTaskDates(editingTaskData.startDate, editingTaskData.duration) && editingTaskData.duration > 0 && editingTaskData.startDate) {
      onUpdateTask({ ...task, ...editingTaskData });
      setEditingTaskId(null);
      setFormError(null);
    }
  };
  
  const handleEditDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditingTaskData(prev => ({
      ...prev,
      [name]: name === 'duration' ? (parseInt(value, 10) || 1) : value,
    }));
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleAddTask} className="p-4 bg-light-bg dark:bg-dark-bg/50 rounded-lg border border-light-border dark:border-dark-border">
        <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Añadir nueva tarea..."
              className="flex-grow w-full p-2 border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-bg rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none"
            />
            <div className="flex w-full sm:w-auto items-center gap-3">
                 <input
                    type="date"
                    value={newTaskStartDate}
                    onChange={(e) => setNewTaskStartDate(e.target.value)}
                    className="p-2 w-full border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-bg rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none"
                    aria-label="Fecha de inicio"
                 />
                 <input
                    type="number"
                    value={newTaskDuration}
                    onChange={(e) => setNewTaskDuration(parseInt(e.target.value, 10) || 1)}
                    min="1"
                    className="p-2 w-24 border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-bg rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none"
                    aria-label="Duración en días"
                 />
                <button type="submit" className="flex-shrink-0 p-2 rounded-md text-white bg-brand-primary hover:bg-brand-secondary disabled:bg-brand-primary/50" disabled={!newTaskTitle.trim() || newTaskDuration < 1}>
                  <PlusIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
        {formError && (
          <div className="mt-3 flex items-center text-sm text-red-600 dark:text-red-400">
              <InformationCircleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
              <span>{formError}</span>
          </div>
        )}
      </form>

      <div className="space-y-3">
        {tasks.length > 0 ? (
          tasks.map(task => (
            <div key={task.id} className="p-3 bg-light-bg dark:bg-dark-bg/50 rounded-lg border border-light-border dark:border-dark-border">
              {editingTaskId === task.id ? (
                // --- EDITING VIEW ---
                <div>
                  <div className="flex items-start">
                    <input type="checkbox" checked={task.completed} onChange={() => onToggleTask(task.id)} className="h-5 w-5 mt-0.5 rounded border-gray-300 text-brand-primary focus:ring-brand-primary cursor-pointer flex-shrink-0" />
                    <div className="ml-3 flex-grow">
                      <span className={`transition-colors duration-200 ${task.completed ? 'line-through text-light-text-secondary dark:text-dark-text-secondary' : ''}`}>{task.title}</span>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-2 text-sm">
                        <div className="flex items-center gap-2">
                           <label htmlFor={`startDate-${task.id}`} className="flex-shrink-0 text-light-text-secondary dark:text-dark-text-secondary"><CalendarIcon className="h-4 w-4"/></label>
                           <input id={`startDate-${task.id}`} type="date" name="startDate" value={editingTaskData.startDate} onChange={handleEditDataChange} className="p-1 border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-bg rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none text-sm"/>
                        </div>
                        <div className="flex items-center gap-2">
                           <label htmlFor={`duration-${task.id}`} className="flex-shrink-0 text-light-text-secondary dark:text-dark-text-secondary"><ClockIcon className="h-4 w-4"/></label>
                           <input id={`duration-${task.id}`} type="number" name="duration" value={editingTaskData.duration} onChange={handleEditDataChange} min="1" className="p-1 w-20 border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-bg rounded-md focus:ring-2 focus:ring-brand-accent focus:outline-none text-sm"/>
                           <span className="text-light-text-secondary dark:text-dark-text-secondary">días</span>
                        </div>
                      </div>
                    </div>
                  </div>
                   {formError && (
                      <div className="mt-3 flex items-center text-sm text-red-600 dark:text-red-400">
                          <InformationCircleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                          <span>{formError}</span>
                      </div>
                    )}
                  <div className="flex justify-end items-center gap-2 mt-3">
                    <button onClick={handleCancelEdit} className="px-3 py-1 text-sm font-medium rounded-md border border-light-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-border">Cancelar</button>
                    <button onClick={() => handleSaveEdit(task)} className="px-3 py-1 text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary">Guardar</button>
                  </div>
                </div>
              ) : (
                // --- DISPLAY VIEW ---
                <div className="flex items-center justify-between">
                    <div className="flex items-start">
                        <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => onToggleTask(task.id)}
                        className="h-5 w-5 mt-0.5 rounded border-gray-300 text-brand-primary focus:ring-brand-primary cursor-pointer flex-shrink-0"
                        aria-label={`Marcar tarea '${task.title}'`}
                        />
                        <div className="ml-3">
                            <span className={`transition-colors duration-200 ${task.completed ? 'line-through text-light-text-secondary dark:text-dark-text-secondary' : ''}`}>
                                {task.title}
                            </span>
                             <div className="flex items-center gap-4 mt-1 text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                <div className="flex items-center gap-1">
                                    <CalendarIcon className="h-4 w-4"/>
                                    <span>Inicio: {new Date(task.startDate).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <ClockIcon className="h-4 w-4"/>
                                    <span>Duración: {task.duration} día{task.duration !== 1 ? 's' : ''}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center flex-shrink-0 ml-4">
                      <button onClick={() => handleEditClick(task)} className="p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-bg">
                        <PencilAltIcon className="h-5 w-5"/>
                      </button>
                      <button onClick={() => onDeleteTask(task.id)} className="p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:text-red-500 dark:hover:text-red-400">
                          <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-10 border-2 border-dashed border-light-border dark:border-dark-border rounded-lg">
            <ClipboardListIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium">No hay tareas</h3>
            <p className="mt-1 text-sm text-light-text-secondary dark:text-dark-text-secondary">Añade la primera tarea para este proyecto.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectTasksTab;