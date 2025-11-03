import React, { useState, useEffect } from 'react';
import { LinkItem } from '../types';
import { XIcon, LinkIcon } from './Icons';

interface LinkModalProps {
  onClose: () => void;
  onSave: (linkData: Omit<LinkItem, 'id'> | LinkItem) => void;
  linkToEdit: LinkItem | null;
}

const LinkModal: React.FC<LinkModalProps> = ({ onClose, onSave, linkToEdit }) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (linkToEdit) {
      setName(linkToEdit.name);
      setUrl(linkToEdit.url);
      setDescription(linkToEdit.description);
    } else {
      setName('');
      setUrl('');
      setDescription('');
    }
    setError('');
  }, [linkToEdit]);

  const isValidUrl = (urlString: string) => {
    try {
      new URL(urlString);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) {
      setError('El nombre y la URL son obligatorios.');
      return;
    }
    if (!isValidUrl(url.trim())) {
      setError('Por favor, introduce una URL válida (ej: https://www.google.com).');
      return;
    }
    setError('');
    
    const linkData = {
        name: name.trim(),
        url: url.trim(),
        description: description.trim(),
    };

    if(linkToEdit) {
        onSave({ ...linkToEdit, ...linkData });
    } else {
        onSave(linkData);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in"
      style={{ animationDuration: '0.2s' }}
      onClick={onClose}
    >
      <div
        className="bg-light-card dark:bg-dark-card rounded-lg shadow-xl w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="flex justify-between items-center p-6 border-b border-light-border dark:border-dark-border">
            <h2 className="text-2xl font-bold">{linkToEdit ? 'Editar Enlace' : 'Añadir Nuevo Enlace'}</h2>
            <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-light-bg dark:hover:bg-dark-bg">
                <XIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="link-name" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                Nombre del Enlace
              </label>
              <input
                id="link-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Ej: Portal de Documentación Interna"
                className="w-full mt-1 p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md focus:ring-brand-accent focus:border-brand-accent"
              />
            </div>

            <div>
              <label htmlFor="link-url" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                URL
              </label>
               <div className="relative">
                 <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                   <LinkIcon className="h-5 w-5 text-gray-400" />
                 </div>
                <input
                  id="link-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  placeholder="https://ejemplo.com"
                  className="w-full mt-1 p-2 pl-10 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md focus:ring-brand-accent focus:border-brand-accent"
                />
              </div>
            </div>

             <div>
              <label htmlFor="link-description" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                Descripción (Opcional)
              </label>
              <textarea
                id="link-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe brevemente para qué sirve este enlace."
                className="w-full mt-1 p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md focus:ring-brand-accent focus:border-brand-accent"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          <div className="p-6 bg-light-bg dark:bg-dark-bg/50 border-t border-light-border dark:border-dark-border flex justify-end space-x-3 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-md border border-light-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-border"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary"
            >
              {linkToEdit ? 'Guardar Cambios' : 'Guardar Enlace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LinkModal;