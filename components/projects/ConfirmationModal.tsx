import React from 'react';
import { XIcon, InformationCircleIcon } from '../Icons';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

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
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10">
                <InformationCircleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-bold text-light-text dark:text-dark-text" id="modal-title">
                    {title}
                </h3>
                <div className="mt-2">
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        {message}
                    </p>
                </div>
            </div>
        </div>
        
        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={onConfirm}
            >
                Confirmar
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