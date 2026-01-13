
import React, { useEffect, useState, useRef } from 'react';
import { XIcon, InformationCircleIcon, DocumentDownloadIcon } from './Icons';
import Spinner from './Spinner';
import { User } from '../types';
import CommentThread from './comments/CommentThread';
// Capturamos el módulo completo para mayor flexibilidad en el acceso a las funciones
import * as docx from 'docx-preview';

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
  const [error, setError] = useState<string | null>(null);
  const wordContainerRef = useRef<HTMLDivElement>(null);

  // Identificar si es un reporte generado que no existe en DB para ocultar comentarios
  const isTempReport = document.id === 'temp-report';

  const officeMimeTypes = [
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];
  
  const isDocx = document.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                 document.name.toLowerCase().endsWith('.docx');
  
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
  
  useEffect(() => {
    const renderLocalWord = async () => {
      if (isDocx && wordContainerRef.current) {
        try {
          setIsLoading(true);
          setError(null);
          
          // Obtener el blob del documento
          const response = await fetch(document.url);
          if (!response.ok) throw new Error("No se pudo descargar el documento para previsualización.");
          const blob = await response.blob();
          
          if (wordContainerRef.current) {
            wordContainerRef.current.innerHTML = '';
            
            // Verificamos múltiples rutas de acceso comunes en los builds de CDN ESM
            const renderer = (docx as any).renderAsync || 
                             (docx as any).default?.renderAsync || 
                             (window as any).docx?.renderAsync;
            
            if (renderer) {
                await renderer(blob, wordContainerRef.current, undefined, {
                    className: "docx",
                    inWrapper: true,
                    ignoreWidth: false,
                    ignoreHeight: false,
                    ignoreFonts: false,
                    breakPages: true,
                    ignoreLastRenderedPageBreak: false,
                    experimental: false,
                    trimXmlDeclaration: true,
                    useBase64URL: false,
                    useAlternateNames: true,
                });
            } else {
                throw new Error("El motor de renderizado de Word no está disponible en este momento.");
            }
          }
        } catch (err) {
          console.error("Docx Preview Error:", err);
          setError(err instanceof Error ? err.message : "No se pudo renderizar el archivo Word localmente.");
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (isDocx) {
        renderLocalWord();
    } else {
        // Para otros formatos, el loading depende de la carga del iframe o la imagen
        setIsLoading(isImage || isPdf || (isOfficeDoc && !document.url.startsWith('blob:')));
    }
  }, [document.url, isDocx]);

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

    if (isDocx) {
      return (
        <div className="w-full h-full overflow-auto bg-gray-100 dark:bg-dark-bg/20">
            {error ? (
                <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                    <InformationCircleIcon className="h-12 w-12 text-red-500 mb-2" />
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
                    <p className="text-xs mt-1 text-light-text-secondary dark:text-dark-text-secondary">Esto suele ocurrir con archivos locales muy grandes o corruptos.</p>
                    <a href={document.url} download={document.name} className="mt-4 px-4 py-2 bg-brand-primary text-white rounded-md text-sm font-bold shadow-sm hover:bg-brand-secondary transition-colors">Descargar para ver en Word</a>
                </div>
            ) : (
                <div ref={wordContainerRef} className="mx-auto max-w-4xl" />
            )}
        </div>
      );
    }
    
    let viewerSrc = '';
    if (isPdf) {
      viewerSrc = document.url.startsWith('blob:') ? document.url : `https://docs.google.com/gview?url=${encodeURIComponent(document.url)}&embedded=true`;
    } else if (isOfficeDoc && !document.url.startsWith('blob:')) {
      viewerSrc = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(document.url)}`;
    }

    if (viewerSrc) {
      return (
        <iframe
          src={viewerSrc}
          className={`w-full h-full border-0 transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          title={document.name}
          onLoad={() => setIsLoading(false)}
        />
      );
    }

    if (isVisio || (isOfficeDoc && document.url.startsWith('blob:'))) {
       return (
          <div className="flex flex-col items-center justify-center h-full text-center text-light-text-secondary dark:text-dark-text-secondary bg-light-bg dark:bg-dark-bg/50 rounded-b-lg p-4">
            <InformationCircleIcon className="h-12 w-12 text-blue-400" />
            <h3 className="mt-4 text-lg font-medium text-light-text dark:text-dark-text">Previsualización no disponible</h3>
            <p className="mt-1 text-sm max-w-md">Por seguridad y privacidad, este tipo de archivo local no puede enviarse a visores en la nube. Por favor, descárgalo para verlo.</p>
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
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-light-card dark:bg-dark-card">
                <Spinner />
                <span className="ml-2">Procesando documento...</span>
              </div>
            )}
            {renderViewer()}
          </main>
          {/* Solo mostrar comentarios si no es un reporte temporal */}
          {!isTempReport && (
            <aside className="w-96 flex-shrink-0 border-l border-light-border dark:border-dark-border flex flex-col">
              <CommentThread documentId={document.id} user={user} />
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileViewerModal;
