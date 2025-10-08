
import React, { useState } from 'react';
import { XIcon, CheckCircleIcon } from './Icons';

interface SetupGuideProps {
    onDismiss: () => void;
}

const SetupStep: React.FC<{ title: string; description: string; isCompleted: boolean; onToggle: () => void; }> = ({ title, description, isCompleted, onToggle }) => (
    <div className="flex items-start">
        <button onClick={onToggle} className="flex-shrink-0 mt-1">
            {isCompleted ? (
                <CheckCircleIcon className="h-6 w-6 text-green-500" />
            ) : (
                <div className="h-6 w-6 rounded-full border-2 border-gray-400 dark:border-gray-500" />
            )}
        </button>
        <div className="ml-4">
            <h4 className={`font-semibold ${isCompleted ? 'line-through text-text-secondary dark:text-dark-text-secondary' : ''}`}>{title}</h4>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">{description}</p>
        </div>
    </div>
);


const SetupGuide: React.FC<SetupGuideProps> = ({ onDismiss }) => {
    const [steps, setSteps] = useState([
        { id: 1, title: 'Create your first project', description: 'Head over to the Projects page to get started.', completed: true },
        { id: 2, title: 'Invite your team members', description: 'Collaboration is key. Add your team to projects.', completed: false },
        { id: 3, title: 'Assign your first task', description: 'Keep track of what needs to be done.', completed: false },
    ]);

    const handleToggleStep = (id: number) => {
        setSteps(steps.map(step => step.id === id ? { ...step, completed: !step.completed } : step));
    };

    const completedCount = steps.filter(s => s.completed).length;
    const progress = (completedCount / steps.length) * 100;

    return (
        <div className="bg-card-bg dark:bg-dark-card-bg p-6 rounded-xl shadow-md mb-6 relative">
            <button onClick={onDismiss} className="absolute top-4 right-4 text-text-secondary dark:text-dark-text-secondary hover:text-primary">
                <XIcon />
            </button>
            <h3 className="text-lg font-bold mb-2">Let's get you set up</h3>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-4">Complete these steps to get the most out of ProjeX.</p>
            
            <div className="mb-4">
                <div className="flex justify-between text-sm font-medium mb-1">
                    <span>Progress</span>
                    <span>{completedCount} of {steps.length} completed</span>
                </div>
                 <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            <div className="space-y-4">
                {steps.map(step => (
                    <SetupStep 
                        key={step.id} 
                        title={step.title} 
                        description={step.description}
                        isCompleted={step.completed}
                        onToggle={() => handleToggleStep(step.id)}
                    />
                ))}
            </div>
        </div>
    );
};

export default SetupGuide;
