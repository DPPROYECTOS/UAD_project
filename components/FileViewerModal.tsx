import React, { useEffect, useState } from 'react';
import { XIcon, InformationCircleIcon, DocumentDownloadIcon } from './Icons';
import Spinner from './Spinner';
import { User } from '../types';
import CommentThread from './comments/CommentThread';

interface FileViewerModalProps {
  document: {
    id: string;
    url: string;
    name: string;
    mimeType: string;
  };
  user: User;
  onClose: () => void;
}

const FileViewerModal: React.FC<FileViewerModalProps> = ({ document, user, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);

  const officeMimeTypes = [
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];
  const isOfficeDoc = officeMimeTypes.includes(document.mimeType);

  const visioMimeTypes = [
    'application/vnd.visio', 'application/vnd.ms-visio', 'application/vnd.ms-visio.drawing',
    'application/vsd', 'application/x-visio', 'image/vnd.visio',
    'application/vnd.visio.drawing.main+xml',
  ];
  const visioExtensions = ['.vsd', '.vsdx'];
  const isVisio = visioMimeTypes.includes(document.mimeType) || visioExtensions.some(ext => document.name.toLowerCase().endsWith(ext));

  const isPdf = document.mimeType === 'application/pdf';
  const isImage = document.mimeType.startsWith('image/') && !isVisio;
  
  const canPreview = isPdf || isImage || isOfficeDoc;

  useEffect(() => {
    setIsLoading(canPreview);
  }, [document.url, canPreview]);

  const renderViewer = () => {
    if (isImage) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-black/20">
          <img
            src={document.url}
            alt={document.name}
            className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
          />
        </div>
      );
    }
    
    let viewerSrc = '';
    if (isPdf) {
      viewerSrc = `https://docs.google.com/gview?url=${encodeURIComponent(document.url)}&embedded=true`;
    } else if (isOfficeDoc) {
      viewerSrc = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(document.url)}`;
    }

    if (viewerSrc) {
      return (
        <iframe
          src={viewerSrc}
          className={`w-full h-full border-0 transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          title={document.name}
          onLoad={() => setIsLoading(false)}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      );
    }

    if (isVisio) {
       return (
          <div className="flex flex-col items-center justify-center h-full text-center text-light-text-secondary dark:text-dark-text-secondary bg-light-bg dark:bg-dark-bg/50 rounded-b-lg p-4">
            <InformationCircleIcon className="h-12 w-12 text-blue-400" />
            <h3 className="mt-4 text-lg font-medium text-light-text dark:text-dark-text">Previsualización de Visio no Soportada</h3>
            <p className="mt-1 text-sm max-w-md">Los visores web no pueden mostrar archivos de Microsoft Visio (.vsd, .vsdx) directamente. Por favor, descarga el archivo para abrirlo con la aplicación de Visio.</p>
            <a
              href={document.url}
              download={document.name}
              className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
            >
              <DocumentDownloadIcon className="h-5 w-5 mr-2" />
              Descargar Archivo Visio
            </a>
          </div>
       );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-light-text-secondary dark:text-dark-text-secondary bg-light-bg dark:bg-dark-bg/50 rounded-b-lg p-4">
        <InformationCircleIcon className="h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-light-text dark:text-dark-text">Vista Previa no Disponible</h3>
        <p className="mt-1 text-sm max-w-md">La previsualización no es compatible con este tipo de archivo ({document.mimeType}). Puedes descargarlo para verlo en tu dispositivo.</p>
        <a
          href={document.url}
          download={document.name}
          className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
        >
          <DocumentDownloadIcon className="h-5 w-5 mr-2" />
          Descargar Archivo
        </a>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4 animate-fade-in"
      style={{ animationDuration: '0.2s' }}
      onClick={onClose}
    >
      <div
        className="bg-light-card dark:bg-dark-card rounded-lg shadow-xl w-full h-full max-w-7xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-light-border dark:border-dark-border">
          <h2 className="text-lg font-semibold truncate" title={document.name}>{document.name}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-bg dark:hover:bg-dark-bg"
            aria-label="Cerrar visor"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </header>
        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-light-card dark:bg-dark-card">
                <Spinner />
                <span className="ml-2">Cargando previsualización...</span>
              </div>
            )}
            {renderViewer()}
          </main>
          <aside className="w-96 flex-shrink-0 border-l border-light-border dark:border-dark-border flex flex-col">
            <CommentThread documentId={document.id} user={user} />
          </aside>
        </div>
      </div>
    </div>
  );
};

export default FileViewerModal;