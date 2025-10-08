
import React from 'react';
// FIX: Replaced 'Task' with 'OldTask as Task' and 'TaskStatus' with 'OldTaskStatus as TaskStatus'
// to match the exported members from the types file.
import { OldTask as Task, TaskPriority, OldTaskStatus as TaskStatus } from '../types';
import { ClipboardListIcon } from './Icons';

const getPriorityClasses = (priority: TaskPriority) => {
    switch (priority) {
        case TaskPriority.HIGH: return 'border-l-4 border-red-500';
        case TaskPriority.MEDIUM: return 'border-l-4 border-yellow-500';
        case TaskPriority.LOW: return 'border-l-4 border-blue-500';
        default: return 'border-l-4 border-gray-300';
    }
}

const TaskItem: React.FC<{ task: Task; onUpdateStatus: (id: string, newStatus: TaskStatus) => void; }> = ({ task, onUpdateStatus }) => {
    const isCompleted = task.status === TaskStatus.DONE;

    const handleToggle = () => {
        const newStatus = isCompleted ? TaskStatus.IN_PROGRESS : TaskStatus.DONE;
        onUpdateStatus(task.id, newStatus);
    };

    return (
        <div className={`flex items-center justify-between p-3 bg-light-bg dark:bg-dark-bg rounded-lg ${getPriorityClasses(task.priority)}`}>
            <div className="flex items-center">
                <input 
                    type="checkbox" 
                    checked={isCompleted}
                    onChange={handleToggle}
                    className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    aria-label={`Mark task '${task.title}' as ${isCompleted ? 'incomplete' : 'complete'}`}
                />
                <div className="ml-4">
                    <p className={`font-medium ${isCompleted ? 'line-through text-text-secondary dark:text-dark-text-secondary' : 'text-text-primary dark:text-dark-text-primary'}`}>{task.title}</p>
                    <p className="text-sm text-text-secondary dark:text-dark-text-secondary">{task.project}</p>
                </div>
            </div>
            <div className="text-sm text-right text-text-secondary dark:text-dark-text-secondary">
                 <p>{new Date(task.dueDate).toLocaleDateString()}</p>
                 <p className="font-semibold">{task.priority}</p>
            </div>
        </div>
    );
};

interface TaskOverviewProps {
    tasks: Task[];
    onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
}

const TaskOverview: React.FC<TaskOverviewProps> = ({ tasks, onUpdateTaskStatus }) => {
    return (
        <div className="bg-card-bg dark:bg-dark-card-bg p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold mb-4">My Tasks</h2>
            <div className="space-y-3">
                {tasks.length > 0 ? (
                    tasks.map(task => (
                        <TaskItem 
                            key={task.id} 
                            task={task} 
                            onUpdateStatus={onUpdateTaskStatus}
                        />
                    ))
                ) : (
                    <div className="text-center py-8 text-text-secondary dark:text-dark-text-secondary">
                        <ClipboardListIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium">No Tasks Found</h3>
                        <p className="mt-1 text-sm">You're all caught up!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskOverview;