
import React, { useState, useMemo } from 'react';
import { LinkItem, UserPermissions } from '../types';
import { PlusIcon, TrashIcon, ExternalLinkIcon, PencilAltIcon, LinkIcon as PageIcon, SparklesIcon } from '../components/Icons';
import Spinner from '../components/Spinner';

interface LinksViewProps {
  links: LinkItem[];
  isLoading: boolean;
  onOpenLinkModal: () => void;
  onOpenEditLinkModal: (link: LinkItem) => void;
  onDeleteLink: (linkId: string) => void;
  userPermissions: UserPermissions | null;
}

const LinksView: React.FC<LinksViewProps> = ({ links, isLoading, onOpenLinkModal, onOpenEditLinkModal, onDeleteLink, userPermissions }) => {
  const [selectedTag, setSelectedTag] = useState<string>('Todas');
  
  const canCreateEdit = userPermissions?.enlaces?.canCreateEdit ?? false;
  const canDelete = userPermissions?.enlaces?.canDelete ?? false;

  // Extract all unique tags from links
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    links.forEach(link => {
        if (link.tags) {
            link.tags.forEach(tag => tags.add(tag));
        }
    });
    return Array.from(tags).sort();
  }, [links]);

  const filteredLinks = useMemo(() => {
    if (selectedTag === 'Todas') return links;
    return links.filter(link => link.tags?.includes(selectedTag));
  }, [links, selectedTag]);

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

    if (filteredLinks.length === 0 && selectedTag !== 'Todas') {
        return (
            <div className="text-center py-16 opacity-50">
                <InformationIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium uppercase tracking-widest">Sin coincidencias</h3>
                <p className="mt-1 text-xs">No hay enlaces marcados con la etiqueta "{selectedTag}".</p>
                <button onClick={() => setSelectedTag('Todas')} className="mt-4 text-brand-primary text-sm font-bold underline">Limpiar filtro</button>
            </div>
        );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLinks.map(link => (
          <div key={link.id} className="group relative flex flex-col bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border shadow-sm transition-all hover:shadow-lg hover:border-brand-accent">
            <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex-grow p-6 block">
              <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg text-light-text dark:text-dark-text group-hover:text-brand-primary">{link.name}</h3>
                  <div className="p-1 rounded bg-brand-primary/5 text-brand-primary">
                    <ExternalLinkIcon className="h-4 w-4" />
                  </div>
              </div>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-2">{link.description}</p>
              
              {/* Tags display on card */}
              {link.tags && link.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1">
                      {link.tags.map(tag => (
                          <span key={tag} className="text-[9px] font-black uppercase tracking-tighter bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                              {tag}
                          </span>
                      ))}
                  </div>
              )}
            </a>
            <div className="p-4 bg-light-bg/50 dark:bg-dark-bg/20 border-t border-light-border dark:border-dark-border flex justify-end items-center space-x-2 rounded-b-lg">
              {canCreateEdit && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation(); 
                    onOpenEditLinkModal(link);
                  }}
                  title="Editar enlace"
                  className="p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:text-blue-500 transition-colors"
                >
                  <PencilAltIcon className="h-5 w-5" />
                </button>
              )}
              {canDelete && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation(); 
                    onDeleteLink(link.id);
                  }}
                  title="Eliminar enlace"
                  className="p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-500 transition-colors"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              )}
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
        {canCreateEdit && (
          <button 
            onClick={onOpenLinkModal}
            className="flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary w-full sm:w-auto shadow-md"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Registrar Nuevo Link
          </button>
        )}
      </div>

      {/* Tags Filter bar */}
      {links.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8 items-center bg-light-card dark:bg-dark-card p-3 rounded-lg border border-light-border dark:border-dark-border">
              <span className="text-xs font-bold uppercase text-light-text-secondary dark:text-dark-text-secondary flex items-center gap-1 mr-2">
                <SparklesIcon className="h-3 w-3" /> Filtrar por:
              </span>
              <button
                  onClick={() => setSelectedTag('Todas')}
                  className={`px-3 py-1 text-xs font-black uppercase tracking-widest rounded-full border transition-all ${
                      selectedTag === 'Todas' 
                      ? 'bg-brand-primary text-white border-brand-primary shadow-sm' 
                      : 'border-light-border dark:border-dark-border text-light-text-secondary dark:text-dark-text-secondary hover:border-brand-primary/50'
                  }`}
              >
                  Todas
              </button>
              {allTags.map(tag => (
                  <button
                      key={tag}
                      onClick={() => setSelectedTag(tag)}
                      className={`px-3 py-1 text-xs font-black uppercase tracking-widest rounded-full border transition-all ${
                          selectedTag === tag 
                          ? 'bg-brand-primary text-white border-brand-primary shadow-sm' 
                          : 'border-light-border dark:border-dark-border text-light-text-secondary dark:text-dark-text-secondary hover:border-brand-primary/50'
                      }`}
                  >
                      {tag}
                  </button>
              ))}
          </div>
      )}

      {renderContent()}
    </>
  );
};

// Auxiliary Icon for empty state
const InformationIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export default LinksView;
