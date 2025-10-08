import React, { useState, useEffect } from 'react';
import { LinkItem } from '../types';
import { XIcon } from './Icons';

interface LinkModalProps {
  onClose: () => void;
  onSave: (link: Omit<LinkItem, 'id'> | LinkItem) => void;
  linkToEdit?: LinkItem | null;
}

const LinkModal: React.FC<LinkModalProps> = ({ onClose, onSave, linkToEdit }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (linkToEdit) {
      setName(linkToEdit.name);
      setDescription(linkToEdit.description);
      setUrl(linkToEdit.url);
    } else {
      setName('');
      setDescription('');
      setUrl('');
    }
  }, [linkToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && description.trim() && url.trim()) {
      if (linkToEdit) {
        onSave({ id: linkToEdit.id, name, description, url });
      } else {
        onSave({ name, description, url });
      }
      onClose();
    }
  };

  const isEditing = !!linkToEdit;

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
            <h2 className="text-2xl font-bold">{isEditing ? 'Editar Enlace' : 'Registrar Nuevo Enlace'}</h2>
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
                placeholder="Ej: Registro de Extintores"
                className="w-full mt-1 p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md focus:ring-brand-accent focus:border-brand-accent"
              />
            </div>
            <div>
              <label htmlFor="link-description" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                Descripción
              </label>
              <input
                id="link-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder="Una breve descripción de lo que hace el enlace"
                className="w-full mt-1 p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md focus:ring-brand-accent focus:border-brand-accent"
              />
            </div>
            <div>
              <label htmlFor="link-url" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                URL
              </label>
              <input
                id="link-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                placeholder="https://ejemplo.com/recurso"
                className="w-full mt-1 p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md focus:ring-brand-accent focus:border-brand-accent"
              />
            </div>
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
              {isEditing ? 'Guardar Cambios' : 'Guardar Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LinkModal;