import React, { useEffect } from 'react';
import { InformationCircleIcon, XCircleIcon, CheckCircleIcon, XIcon } from './Icons';

type ToastType = 'info' | 'warning' | 'error' | 'success';

interface ToastProps {
  id: string;
  title: string;
  message: string;
  type: ToastType;
  onDismiss: (id: string) => void;
}

const icons: { [key in ToastType]: React.ReactElement } = {
  info: <InformationCircleIcon className="h-6 w-6 text-blue-500" />,
  success: <CheckCircleIcon className="h-6 w-6 text-green-500" />,
  warning: <InformationCircleIcon className="h-6 w-6 text-yellow-500" />,
  error: <XCircleIcon className="h-6 w-6 text-red-500" />,
};

const colors: { [key in ToastType]: string } = {
  info: 'border-blue-500',
  success: 'border-green-500',
  warning: 'border-yellow-500',
  error: 'border-red-500',
};

const Toast: React.FC<ToastProps> = ({ id, title, message, type, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, 8000); // Auto-dismiss after 8 seconds

    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <div className={`max-w-sm w-full bg-light-card dark:bg-dark-card shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden border-l-4 ${colors[type]} animate-fade-in`}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {icons[type]}
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-bold text-light-text dark:text-dark-text">{title}</p>
            <p className="mt-1 text-sm text-light-text-secondary dark:text-dark-text-secondary">{message}</p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={() => onDismiss(id)}
              className="rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary dark:ring-offset-dark-card"
            >
              <span className="sr-only">Cerrar</span>
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toast;