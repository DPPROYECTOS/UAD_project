
import React, { useState, useRef, useEffect } from 'react';
import { ProjectStatus } from '../../types';
import { DotsVerticalIcon } from '../Icons';

interface StatusSelectorProps {
  currentStatus: ProjectStatus;
  onUpdate: (newStatus: ProjectStatus) => void;
}

const statusStyles: { [key in ProjectStatus]: string } = {
  [ProjectStatus.NUEVO]: 'bg-status-not-started/20 text-status-not-started border border-status-not-started/50',
  [ProjectStatus.EN_PROGRESO]: 'bg-status-in-progress/20 text-status-in-progress border border-status-in-progress/50',
  [ProjectStatus.EN_REVISION]: 'bg-status-on-hold/20 text-status-on-hold border border-status-on-hold/50',
  [ProjectStatus.COMPLETO]: 'bg-status-completed/20 text-status-completed border border-status-completed/50',
};

const StatusSelector: React.FC<StatusSelectorProps> = ({ currentStatus, onUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (status: ProjectStatus) => {
    onUpdate(status);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <div>
        <button
          type="button"
          className={`inline-flex justify-center items-center w-full rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-150 ${statusStyles[currentStatus]}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {currentStatus}
        </button>
      </div>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-light-card dark:bg-dark-card ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {Object.values(ProjectStatus).map((status) => (
              <a
                href="#"
                key={status}
                onClick={(e) => {
                  e.preventDefault();
                  handleSelect(status);
                }}
                className={`block px-4 py-2 text-sm ${
                  status === currentStatus
                    ? 'font-medium text-brand-primary'
                    : 'text-light-text-secondary dark:text-dark-text-secondary'
                } hover:bg-light-bg dark:hover:bg-dark-bg`}
                role="menuitem"
              >
                {status}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusSelector;
