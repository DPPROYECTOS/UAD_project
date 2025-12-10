import React, { useState, useEffect, useRef } from 'react';
import { User, CommentWithAuthor } from '../../types';
import { 
    getCommentsForDocument,
    addComment,
    updateComment,
    deleteComment,
    subscribeToDocumentComments,
    supabase
} from '../../services/supabaseService';
import CommentItem from './CommentItem';
import Spinner from '../Spinner';
import { RealtimeChannel } from '@supabase/supabase-js';

interface CommentThreadProps {
  documentId: string;
  user: User;
}

const CommentThread: React.FC<CommentThreadProps> = ({ documentId, user }) => {
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        setIsLoading(true);
        const fetchedComments = await getCommentsForDocument(documentId);
        setComments(fetchedComments);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los comentarios.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchComments();

    const channel: RealtimeChannel = subscribeToDocumentComments(
      documentId,
      (newComment) => {
        setComments(prev => [...prev, newComment]);
      },
      (updatedComment) => {
        setComments(prev => prev.map(c => c.id === updatedComment.id ? updatedComment : c));
      },
      (deletedId) => {
        setComments(prev => prev.filter(c => c.id !== deletedId));
      }
    );

    return () => {
      supabase.removeChannel(channel);
    };
  }, [documentId]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await addComment(documentId, newComment.trim());
      setNewComment('');
    } catch(err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el comentario.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: string, content: string) => {
    try {
      await updateComment(id, content);
    } catch(err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el comentario.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteComment(id);
    } catch(err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el comentario.');
    }
  };


  return (
    <div className="flex flex-col h-full bg-light-bg dark:bg-dark-bg/50">
      <div className="p-4 border-b border-light-border dark:border-dark-border">
        <h3 className="font-bold">Comentarios</h3>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {isLoading && <div className="flex justify-center pt-8"><Spinner /></div>}
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        {!isLoading && comments.length === 0 && (
          <p className="text-sm text-center text-light-text-secondary dark:text-dark-text-secondary pt-8">
            No hay comentarios. ¡Sé el primero en añadir uno!
          </p>
        )}
        {comments.map(comment => (
          <CommentItem 
            key={comment.id}
            comment={comment}
            currentUser={user}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        ))}
        <div ref={commentsEndRef} />
      </div>

      <div className="p-4 border-t border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card">
        <form onSubmit={handleSubmit} className="flex items-start space-x-3">
          <textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Añadir un comentario..."
            className="w-full p-2 text-sm border rounded-lg bg-light-bg dark:bg-dark-bg focus:ring-brand-primary focus:border-brand-primary"
            rows={2}
            disabled={isSubmitting}
          />
          <button type="submit" disabled={isSubmitting || !newComment.trim()} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary disabled:bg-brand-primary/50">
            {isSubmitting ? <Spinner size="sm" /> : 'Enviar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CommentThread;