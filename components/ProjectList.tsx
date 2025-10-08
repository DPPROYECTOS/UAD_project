
import React from 'react';
import { Project } from '../types';
import { DotsVerticalIcon, FolderOpenIcon } from './Icons';

const getStatusColor = (status: 'On Track' | 'At Risk' | 'Off Track') => {
    switch (status) {
        case 'On Track': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
        case 'At Risk': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
        case 'Off Track': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    }
};

const getProgressBarColor = (progress: number) => {
    if (progress < 30) return 'bg-red-500';
    if (progress < 70) return 'bg-yellow-500';
    return 'bg-green-500';
}

const ProjectCard: React.FC<{ project: Project }> = ({ project }) => (
    <div className="bg-card-bg dark:bg-dark-card-bg p-5 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-start">
            <div>
                <h3 className="font-bold text-lg text-text-primary dark:text-dark-text-primary">{project.name}</h3>
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
                <span>{project.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className={`${getProgressBarColor(project.progress)} h-2 rounded-full`} style={{ width: `${project.progress}%` }}></div>
            </div>
        </div>
        
        <div className="flex justify-between items-center">
            <div className="flex -space-x-2">
                {project.members.map((member, index) => (
                    <img key={index} className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 object-cover" src={member.avatarUrl} alt={member.name} title={member.name} />
                ))}
            </div>
            <div className="text-sm text-text-secondary dark:text-dark-text-secondary">
                <span className="font-medium">Deadline:</span> {new Date(project.deadline).toLocaleDateString()}
            </div>
        </div>
    </div>
);


const ProjectList: React.FC<{ projects: Project[] }> = ({ projects }) => {
    return (
        <div className="bg-card-bg dark:bg-dark-card-bg p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Active Projects</h2>
                <a href="#" className="text-sm font-medium text-primary hover:underline">View All</a>
            </div>
            <div className="space-y-4">
                {projects.length > 0 ? (
                    projects.map(project => (
                        <ProjectCard key={project.id} project={project} />
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
