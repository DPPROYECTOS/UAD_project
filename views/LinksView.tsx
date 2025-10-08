import React from 'react';
import { LinkItem } from '../types';
import { PlusIcon, TrashIcon, ExternalLinkIcon, PencilAltIcon, LinkIcon as PageIcon } from '../components/Icons';
import Spinner from '../components/Spinner';

interface LinksViewProps {
  links: LinkItem[];
  isLoading: boolean;
  onOpenLinkModal: () => void;
  onOpenEditLinkModal: (link: LinkItem) => void;
  onDeleteLink: (linkId: string) => void;
}

const LinksView: React.FC<LinksViewProps> = ({ links, isLoading, onOpenLinkModal, onOpenEditLinkModal, onDeleteLink }) => {
  
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-16">
          <Spinner />
          <span className="ml-2">Cargando enlaces...</span>
        </div>
      );
    }

    if (links.length === 0) {
      return (
        <div className="text-center py-16 text-light-text-secondary dark:text-dark-text-secondary border-2 border-dashed border-light-border dark:border-dark-border rounded-lg">
          <PageIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium">No hay enlaces registrados</h3>
          <p className="mt-1 text-sm">Empieza añadiendo tu primer enlace de interés.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {links.map(link => (
          <div key={link.id} className="group relative flex flex-col bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border shadow-sm transition-all hover:shadow-lg hover:border-brand-accent">
            <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex-grow p-6 block">
              <h3 className="font-bold text-lg text-light-text dark:text-dark-text group-hover:text-brand-primary">{link.name}</h3>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-2">{link.description}</p>
            </a>
            <div className="p-4 bg-light-bg dark:bg-dark-bg/50 border-t border-light-border dark:border-dark-border flex justify-end items-center space-x-2 rounded-b-lg">
              <a 
                href={link.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                title="Abrir en nueva pestaña"
                className="p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-bg"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLinkIcon className="h-5 w-5" />
              </a>
              <button 
                onClick={(e) => {
                  e.stopPropagation(); 
                  onOpenEditLinkModal(link);
                }}
                title="Editar enlace"
                className="p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:text-blue-500"
              >
                <PencilAltIcon className="h-5 w-5" />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation(); 
                  onDeleteLink(link.id);
                }}
                title="Eliminar enlace"
                className="p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-500"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Enlaces de Interés</h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">
            Recursos y herramientas importantes para el equipo.
          </p>
        </div>
        <button 
          onClick={onOpenLinkModal}
          className="flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary w-full sm:w-auto"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Registrar Nuevo Link
        </button>
      </div>

      {renderContent()}
    </>
  );
};

export default LinksView;