import React, { useState } from 'react';
import { Document } from '../types';
// FIX: Replaced non-existent 'getPublicUrl' with 'getSignedUrlForDocument'
import { deleteDocument as deleteFileService, getSignedUrlForDocument } from '../services/supabaseService';
import { DocumentTextIcon, TableIcon, DocumentDownloadIcon, TrashIcon, CollectionIcon, EyeIcon, InformationCircleIcon } from './Icons';
import Spinner from './Spinner';

interface FileListProps {
    files: Document[];
    onFileDeleted: (fileId: string) => void;
    isLoading: boolean;
    userPermissions: any; // Simplified for now
}

const FileIcon: React.FC<{ mimeType: string }> = ({ mimeType }) => {
    if (mimeType.includes('pdf')) {
        return <DocumentTextIcon className="h-6 w-6 text-red-500" />;
    }
    if (mimeType.includes('word')) {
        return <DocumentTextIcon className="h-6 w-6 text-blue-500" />;
    }
    if (mimeType.includes('sheet') || mimeType.includes('excel')) {
        return <TableIcon className="h-6 w-6 text-green-500" />;
    }
    return <DocumentTextIcon className="h-6 w-6 text-gray-500" />;
};

const FileList: React.FC<FileListProps> = ({ files, onFileDeleted, isLoading, userPermissions }) => {
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [actionError, setActionError] = useState<{ fileId: string; message: string } | null>(null);

    // FIX: Updated handleAction to use getSignedUrlForDocument and simplified download logic.
    const handleAction = async (file: Document, action: 'preview' | 'download') => {
        setLoadingAction(`${file.id}-${action}`);
        setActionError(null);
        try {
            if (action === 'preview') {
                const url = await getSignedUrlForDocument(file.storagePath);
                if (!url) {
                    throw new Error('No se pudo obtener la URL del archivo.');
                }
                window.open(url, '_blank', 'noopener,noreferrer');
            } else {
                const signedUrl = await getSignedUrlForDocument(file.storagePath, { download: file.name });
                const link = document.createElement('a');
                link.href = signedUrl;
                link.setAttribute('download', file.name);
                document.body.appendChild(link);
                link.click();
                link.parentNode?.removeChild(link);
            }
        } catch (error) {
            console.error(`Error during file ${action}:`, error);
            const message = error instanceof Error ? error.message : `Falló la ${action === 'preview' ? 'previsualización' : 'descarga'}.`;
            setActionError({ fileId: file.id, message });
        } finally {
            setLoadingAction(null);
        }
    };

    const handleDelete = async (fileToDelete: Document) => {
        setActionError(null);
        if (window.confirm(`¿Estás seguro de que quieres eliminar "${fileToDelete.name}"? Esta acción no se puede deshacer.`)) {
            setLoadingAction(`${fileToDelete.id}-delete`);
            try {
                await deleteFileService(fileToDelete);
                onFileDeleted(fileToDelete.id);
            } catch (err) {
                console.error("Fallo al eliminar el archivo:", err);
                const message = err instanceof Error ? err.message : 'Ocurrió un error inesperado.';
                setActionError({ fileId: fileToDelete.id, message });
            } finally {
                setLoadingAction(null);
            }
        }
    };
    
    const formatBytes = (bytes: number, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-8">
                <Spinner />
                <span className="ml-2">Cargando Archivos...</span>
            </div>
        );
    }
    
    if (files.length === 0) {
        return (
             <div className="text-center py-8 text-text-secondary dark:text-dark-text-secondary border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <CollectionIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium">No hay archivos</h3>
                <p className="mt-1 text-sm">Los archivos de este proyecto aparecerán aquí.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
                {files.map(file => (
                    <li key={file.id} className="p-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center min-w-0">
                                <div className="flex-shrink-0">
                                    <FileIcon mimeType={file.mimeType} />
                                </div>
                                <div className="ml-4 min-w-0">
                                    <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary truncate">{file.name}</p>
                                    <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
                                        {formatBytes(file.size)} - {new Date(file.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-1 flex-shrink-0">
                                {userPermissions?.canView && (
                                <button
                                    onClick={() => handleAction(file, 'preview')}
                                    disabled={loadingAction !== null}
                                    className="p-2 rounded-full text-text-secondary dark:text-dark-text-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:text-blue-600 dark:hover:text-blue-400"
                                    title={`Previsualizar ${file.name}`}
                                >
                                    {/* FIX: Changed spinner size to 'md' to match the icon size for UI consistency. */}
                                    {loadingAction === `${file.id}-preview` ? <Spinner size="md"/> : <EyeIcon className="h-5 w-5" />}
                                </button>
                                )}
                                 {userPermissions?.canDownload && (
                                <button
                                    onClick={() => handleAction(file, 'download')}
                                    disabled={loadingAction !== null}
                                    className="p-2 rounded-full text-text-secondary dark:text-dark-text-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-100 dark:hover:bg-green-900/50 hover:text-green-600 dark:hover:text-green-400"
                                    title={`Descargar ${file.name}`}
                                >
                                    {/* FIX: Changed spinner size to 'md' to match the icon size for UI consistency. */}
                                    {loadingAction === `${file.id}-download` ? <Spinner size="md" /> : <DocumentDownloadIcon className="h-5 w-5" />}
                                </button>
                                )}
                                {userPermissions?.canDelete && (
                                <button
                                    onClick={() => handleDelete(file)}
                                    disabled={loadingAction !== null}
                                    className="p-2 rounded-full text-text-secondary dark:text-dark-text-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400"
                                    title={`Eliminar ${file.name}`}
                                >
                                    {/* FIX: Changed spinner size to 'md' to match the icon size for UI consistency. */}
                                    {loadingAction === `${file.id}-delete` ? <Spinner size="md" /> : <TrashIcon className="h-5 w-5" />}
                                </button>
                                )}
                            </div>
                        </div>
                        {actionError && actionError.fileId === file.id && (
                            <div className="flex justify-end items-center mt-2 text-right">
                               <InformationCircleIcon className="h-4 w-4 text-red-500 mr-1 flex-shrink-0" />
                               <p className="text-xs text-red-500">{actionError.message}</p>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default FileList;
