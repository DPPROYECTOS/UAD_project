import React, { useState } from 'react';
import { CommentWithAuthor, User } from '../../types';
import { PencilAltIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from '../Icons';

interface CommentItemProps {
  comment: CommentWithAuthor;
  currentUser: User;
  onUpdate: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const timeAgo = (isoDate: string): string => {
    const date = new Date(isoDate);
    const now = new Date();
    const totalSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (totalSeconds < 5) return 'justo ahora';
    if (totalSeconds < 60) return `hace ${totalSeconds} seg`;
    const totalMinutes = Math.floor(totalSeconds / 60);
    if (totalMinutes < 60) return `hace ${totalMinutes} min`;
    const totalHours = Math.floor(totalMinutes / 60);
    if (totalHours < 24) return `hace ${totalHours}h`;
    const totalDays = Math.floor(totalHours / 24);
    return `hace ${totalDays}d`;
};

const CommentItem: React.FC<CommentItemProps> = ({ comment, currentUser, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [isProcessing, setIsProcessing] = useState(false);

  const isAuthor = comment.author.id === currentUser.id;

  const handleUpdate = async () => {
    if (editedContent.trim() && editedContent.trim() !== comment.content) {
      setIsProcessing(true);
      await onUpdate(comment.id, editedContent.trim());
      setIsProcessing(false);
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este comentario?')) {
      setIsProcessing(true);
      await onDelete(comment.id);
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-start space-x-3 group">
      <div className="flex-shrink-0">
        {comment.author.avatarUrl ? (
          <img className="h-8 w-8 rounded-full object-cover" src={comment.author.avatarUrl} alt={comment.author.name} />
        ) : (
          <div className="h-8 w-8 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary font-bold text-sm">
            {comment.author.name?.charAt(0).toUpperCase() || '?'}
          </div>
        )}
      </div>
      <div className="flex-1">
        <div className="bg-light-bg dark:bg-dark-bg p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold">{comment.author.name || 'Usuario'}</span>
            <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">{timeAgo(comment.created_at)}</span>
          </div>
          {isEditing ? (
            <div className="mt-2">
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full p-2 text-sm border rounded-md bg-light-card dark:bg-dark-card"
                rows={3}
                disabled={isProcessing}
              />
              <div className="flex items-center justify-end space-x-2 mt-2">
                <button onClick={() => setIsEditing(false)} disabled={isProcessing} className="p-1 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50"><XCircleIcon className="h-5 w-5"/></button>
                <button onClick={handleUpdate} disabled={isProcessing} className="p-1 rounded-full text-green-500 hover:bg-green-100 dark:hover:bg-green-900/50"><CheckCircleIcon className="h-5 w-5"/></button>
              </div>
            </div>
          ) : (
            <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
          )}
        </div>
        {isAuthor && !isEditing && (
          <div className="flex items-center space-x-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setIsEditing(true)} className="text-xs text-light-text-secondary dark:text-dark-text-secondary hover:underline">Editar</button>
            <button onClick={handleDelete} className="text-xs text-red-500 hover:underline">Eliminar</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentItem;