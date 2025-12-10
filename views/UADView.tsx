import React from 'react';
import { AcademicCapIcon } from '../components/Icons';

const UADView: React.FC = () => {
    return (
        <div>
            <h1 className="text-3xl font-bold text-light-text dark:text-dark-text">UAD</h1>
            <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">
                Sección dedicada a UAD.
            </p>

            <div className="mt-8 text-center py-16 border-2 border-dashed border-light-border dark:border-dark-border rounded-lg bg-light-card dark:bg-dark-card">
                <AcademicCapIcon className="mx-auto h-16 w-16 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-light-text dark:text-dark-text">Próximamente</h3>
                <p className="mt-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    Este apartado está en construcción.
                </p>
            </div>
        </div>
    );
};

export default UADView;