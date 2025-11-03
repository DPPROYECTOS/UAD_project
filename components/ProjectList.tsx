import React from 'react';
// Fix: Import ProjectStatus and ProjectTask types to correctly handle project data.
import { Project, ProjectStatus, ProjectTask } from '../types';
// Fix: Import UserCircleIcon for displaying team members.
import { DotsVerticalIcon, FolderOpenIcon, UserCircleIcon } from './Icons';

// Fix: Updated getStatusColor to work with the ProjectStatus enum from types.ts.
const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
        case ProjectStatus.NUEVO:
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
        case ProjectStatus.EN_PROGRESO:
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
        case ProjectStatus.EN_REVISION:
            return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
        case ProjectStatus.COMPLETO:
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
        default:
             return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
};

const getProgressBarColor = (progress: number) => {
    if (progress < 30) return 'bg-red-500';
    if (progress < 70) return 'bg-yellow-500';
    return 'bg-green-500';
}

// Fix: Add tasks to ProjectCardProps to calculate progress.
interface ProjectCardProps {
    project: Project;
    tasks: ProjectTask[];
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, tasks }) => {
    // Fix: Calculate project progress based on associated tasks.
    const projectTasks = tasks.filter(t => t.projectId === project.id);
    const completedTasks = projectTasks.filter(t => t.completed).length;
    const progress = projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0;
    
    return (
    <div className="bg-card-bg dark:bg-dark-card-bg p-5 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-start">
            <div>
                <h3 className="font-bold text-lg text-text-primary dark:text-dark-text-primary">{project.name}</h3>
                {/* Fix: Use the updated getStatusColor function with the correct project status property. */}
                <span className={`text-xs font-semibold mr-2 px-2.5 py-0.5 rounded ${getStatusColor(project.status)}`}>
                    {project.status}
                </span>
            </div>
            <button className="text-text-secondary dark:text-dark-text-secondary hover:text-primary">
                <DotsVerticalIcon />
            </button>
        </div>

        <div className="my-4">
            <div className="flex justify-between text-sm text-text-secondary dark:text-dark-text-secondary mb-1">
                <span>Progress</span>
                {/* Fix: Display calculated progress instead of a non-existent property. */}
                <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                {/* Fix: Use calculated progress for the progress bar. */}
                <div className={`${getProgressBarColor(progress)} h-2 rounded-full`} style={{ width: `${progress}%` }}></div>
            </div>
        </div>
        
        <div className="flex justify-between items-center">
            <div className="flex -space-x-2">
                {/* Fix: Use project.team (string[]) instead of non-existent project.members. Display generic icons as avatars are not available. */}
                {project.team.slice(0, 3).map((member, index) => (
                    <div key={index} className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300" title={member}>
                        <UserCircleIcon className="h-full w-full" />
                    </div>
                ))}
                {project.team.length > 3 && (
                    <div className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-semibold" title={`${project.team.length - 3} more members`}>
                        +{project.team.length - 3}
                    </div>
                )}
            </div>
            <div className="text-sm text-text-secondary dark:text-dark-text-secondary">
                {/* Fix: Use project.endDate instead of non-existent project.deadline. */}
                <span className="font-medium">Deadline:</span> {new Date(project.endDate).toLocaleDateString()}
            </div>
        </div>
    </div>
)};

// Fix: Add tasks to ProjectListProps to pass down to ProjectCard.
interface ProjectListProps {
    projects: Project[];
    tasks: ProjectTask[];
}


const ProjectList: React.FC<ProjectListProps> = ({ projects, tasks }) => {
    return (
        <div className="bg-card-bg dark:bg-dark-card-bg p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Active Projects</h2>
                <a href="#" className="text-sm font-medium text-primary hover:underline">View All</a>
            </div>
            <div className="space-y-4">
                {projects.length > 0 ? (
                    projects.map(project => (
                        // Fix: Pass tasks to ProjectCard.
                        <ProjectCard key={project.id} project={project} tasks={tasks} />
                    ))
                ) : (
                     <div className="text-center py-8 text-text-secondary dark:text-dark-text-secondary">
                        <FolderOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium">No Projects Found</h3>
                        <p className="mt-1 text-sm">Get started by creating a new project.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectList;
