import React from 'react';
import Toast from './Toast';
import { ToastNotification } from '../types';

interface ToastContainerProps {
  notifications: ToastNotification[];
  onDismiss: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ notifications, onDismiss }) => {
  return (
    <div className="fixed inset-0 flex items-end justify-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start sm:justify-end z-[100]">
      <div className="max-w-sm w-full flex flex-col items-end space-y-4">
        {notifications.map((notification) => (
          <Toast
            key={notification.id}
            id={notification.id}
            title={notification.title}
            message={notification.message}
            type={notification.type}
            onDismiss={onDismiss}
          />
        ))}
      </div>
    </div>
  );
};

export default ToastContainer;