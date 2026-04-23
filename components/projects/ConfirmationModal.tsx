import React from 'react';
import { XIcon, InformationCircleIcon } from '../Icons';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  variant?: 'danger' | 'primary' | 'warning';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmar', variant = 'danger' 
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
        iconBg: 'bg-red-100 dark:bg-red-900/50',
        iconColor: 'text-red-600 dark:text-red-400',
        btnBg: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    },
    primary: {
        iconBg: 'bg-blue-100 dark:bg-blue-900/50',
        iconColor: 'text-blue-600 dark:text-blue-400',
        btnBg: 'bg-brand-primary hover:bg-brand-secondary focus:ring-brand-primary',
    },
    warning: {
        iconBg: 'bg-yellow-100 dark:bg-yellow-900/50',
        iconColor: 'text-yellow-600 dark:text-yellow-400',
        btnBg: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    }
  }[variant];

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center animate-fade-in"
      style={{ animationDuration: '0.2s' }}
      onClick={onClose}
    >
      <div 
        className="bg-light-card dark:bg-dark-card rounded-lg shadow-xl w-full max-w-md p-6 relative mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start">
            <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${variantStyles.iconBg} sm:mx-0 sm:h-10 sm:w-10`}>
                <InformationCircleIcon className={`h-6 w-6 ${variantStyles.iconColor}`} />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-bold text-light-text dark:text-dark-text" id="modal-title">
                    {title}
                </h3>
                <div className="mt-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    {typeof message === 'string' ? (
                        <p>{message}</p>
                    ) : (
                        message
                    )}
                </div>
            </div>
        </div>
        
        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
                type="button"
                className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 ${variantStyles.btnBg} text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm`}
                onClick={onConfirm}
            >
                {confirmText}
            </button>
            <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-light-border dark:border-dark-border shadow-sm px-4 py-2 bg-light-card dark:bg-dark-card text-base font-medium text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary sm:mt-0 sm:w-auto sm:text-sm"
                onClick={onClose}
            >
                Cancelar
            </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;