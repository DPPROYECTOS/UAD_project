
import React from 'react';

interface StatCardProps {
    title: string;
    value: string;
    // FIX: Changed icon prop type to `React.ReactElement<{ className?: string }>`
    // to ensure the passed element accepts a className prop for styling, resolving
    // the React.cloneElement type error.
    icon: React.ReactElement<{ className?: string }>;
    color: 'blue' | 'yellow' | 'green' | 'red';
}

const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300',
    yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-300',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-300',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300',
};

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => {
    return (
        <div className="bg-card-bg dark:bg-dark-card-bg p-6 rounded-xl shadow-md flex items-center space-x-4 transition-transform hover:scale-105 duration-300">
            <div className={`p-3 rounded-full ${colorClasses[color]}`}>
                {React.cloneElement(icon, { className: 'h-6 w-6' })}
            </div>
            <div>
                <p className="text-sm font-medium text-text-secondary dark:text-dark-text-secondary">{title}</p>
                <p className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">{value}</p>
            </div>
        </div>
    );
};

export default StatCard;