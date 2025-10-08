import React from 'react';
import { XIcon, InformationCircleIcon, DocumentDownloadIcon } from './Icons';
import Spinner from './Spinner';

interface FileViewerModalProps {
  file: {
    url: string;
    name: string;
    mimeType: string;
  };
  onClose: () => void;
}

const FileViewerModal: React.FC<FileViewerModalProps> = ({ file, onClose }) => {
  const [isLoading, setIsLoading] = React.useState(true);

  const renderViewer = () => {
    const { url, name, mimeType } = file;

    const officeMimeTypes = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    ];

    const isOfficeDoc = officeMimeTypes.includes(mimeType);
    const isViewableInBrowser = mimeType.startsWith('image/') || mimeType === 'application/pdf' || mimeType.startsWith('text/');

    let viewerSrc = '';
    if (isViewableInBrowser) {
      viewerSrc = url;
    } else if (isOfficeDoc) {
      viewerSrc = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    }

    if (viewerSrc) {
      return (
        <iframe
          src={viewerSrc}
          className="w-full h-full"
          title={name}
          onLoad={() => setIsLoading(false)}
        />
      );
    }

    // Fallback for unsupported types
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-light-text-secondary dark:text-dark-text-secondary bg-light-bg dark:bg-dark-bg/50 rounded-b-lg">
        <InformationCircleIcon className="h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-light-text dark:text-dark-text">Vista Previa no Disponible</h3>
        <p className="mt-1 text-sm">No se puede previsualizar este tipo de archivo ({mimeType}).</p>
        <a
          href={url}
          download={name}
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
        className="bg-light-card dark:bg-dark-card rounded-lg shadow-xl w-full h-full max-w-6xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-light-border dark:border-dark-border">
          <h2 className="text-lg font-semibold truncate" title={file.name}>{file.name}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-bg dark:hover:bg-dark-bg"
            aria-label="Cerrar visor"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </header>
        <main className="flex-1 relative">
            {isLoading && !renderViewer().props.src.startsWith('https://view.officeapps.live.com') && (
                <div className="absolute inset-0 flex items-center justify-center bg-light-card dark:bg-dark-card">
                    <Spinner />
                    <span className="ml-2">Cargando previsualización...</span>
                </div>
            )}
            {renderViewer()}
        </main>
      </div>
    </div>
  );
};

export default FileViewerModal;
