import React from 'react';
import { Activity } from '../types';
import { BellIcon } from './Icons';

const ActivityFeed: React.FC<{ activities: Activity[] }> = ({ activities }) => {
    return (
        <div className="bg-card-bg dark:bg-dark-card-bg p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
            <div className="space-y-6">
                {activities.length > 0 ? (
                    activities.map((activity, index) => (
                        <div key={activity.id} className="relative flex items-start">
                            {index !== activities.length -1 && (
                                <div className="absolute left-4 top-5 h-full w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true"></div>
                            )}
                            <div className="relative flex-shrink-0">
                                {activity.user.avatarUrl ? (
                                    <img className="h-8 w-8 rounded-full object-cover" src={activity.user.avatarUrl} alt={activity.user.name} />
                                ) : (
                                    <div className="h-8 w-8 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary font-bold text-sm">
                                        {activity.user.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="ml-4">
                                <p className="text-sm">
                                    <span className="font-bold text-text-primary dark:text-dark-text-primary">{activity.user.name}</span>
                                    <span className="text-text-secondary dark:text-dark-text-secondary"> {activity.action} </span>
                                    <span className="font-medium text-primary">{activity.target}</span>
                                </p>
                                <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1">{activity.timestamp}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 text-text-secondary dark:text-dark-text-secondary">
                        <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium">No Recent Activity</h3>
                        <p className="mt-1 text-sm">Activity from your projects will show up here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityFeed;