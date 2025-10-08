import React, { useState } from 'react';
import { UploadedFile } from '../types';
import { deleteFile, getSignedFileUrl, supabase } from '../services/supabaseService';
import { DocumentTextIcon, TableIcon, DocumentDownloadIcon, TrashIcon, CollectionIcon, EyeIcon, InformationCircleIcon } from './Icons';
import Spinner from './Spinner';

interface FileListProps {
    files: UploadedFile[];
    onFileDeleted: (fileId: string) => void;
    isLoading: boolean;
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

const FileList: React.FC<FileListProps> = ({ files, onFileDeleted, isLoading }) => {
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [actionError, setActionError] = useState<{ fileId: string; message: string } | null>(null);

    const handlePreview = async (file: UploadedFile) => {
        setLoadingAction(`${file.id}-preview`);
        setActionError(null);
        try {
            const url = await getSignedFileUrl(file.name);
            if (url) {
                window.open(url, '_blank', 'noopener,noreferrer');
            } else {
                throw new Error('No se pudo obtener la URL del archivo.');
            }
        } catch (error) {
            console.error('Error getting preview URL:', error);
            const message = error instanceof Error ? error.message : 'Falló la obtención de la URL de previsualización.';
            setActionError({ fileId: file.id, message });
        } finally {
            setLoadingAction(null);
        }
    };
    
    const handleDownload = async (file: UploadedFile) => {
        setLoadingAction(`${file.id}-download`);
        setActionError(null);
        try {
            const url = await getSignedFileUrl(file.name);
            if (url) {
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', file.name);
                document.body.appendChild(link);
                link.click();
                link.parentNode?.removeChild(link);
            } else {
                 throw new Error('No se pudo obtener la URL del archivo.');
            }
        } catch (error) {
            console.error('Error getting download URL:', error);
            const message = error instanceof Error ? error.message : 'Falló la obtención de la URL de descarga.';
            setActionError({ fileId: file.id, message });
        } finally {
            setLoadingAction(null);
        }
    };

    const handleDelete = async (fileToDelete: UploadedFile) => {
        setActionError(null);
        setLoadingAction(`${fileToDelete.id}-delete`);
    
        try {
            // Paso 1: Verificar explícitamente la sesión del usuario primero para evitar errores silenciosos.
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) {
                throw new Error(`Error de sesión: ${sessionError.message}`);
            }
            if (!session?.user) {
                throw new Error('Sesión no válida o expirada. Por favor, inicie sesión de nuevo.');
            }
            const userId = session.user.id;
    
            // Paso 2: Realizar la eliminación con el ID de usuario verificado.
            const filePath = `${userId}/${fileToDelete.name}`;
            const { data, error: deleteError } = await supabase.storage
                .from('user_files')
                .remove([filePath]);
    
            if (deleteError) {
                // Error explícito de la API de Supabase.
                throw new Error(`Error de Supabase: ${deleteError.message}`);
            }
    
            if (!data || data.length === 0) {
                // Falla clásica "silenciosa" de RLS (la API no devuelve error, pero no borra nada).
                throw new Error('Permiso denegado. No tienes autorización para eliminar este archivo.');
            }
    
            // Paso 3: Si llegamos aquí, fue un éxito.
            onFileDeleted(fileToDelete.id);
    
        } catch (err) {
            // Paso 4: Capturar CUALQUIER error de los pasos anteriores y mostrarlo.
            console.error("Fallo al eliminar el archivo:", err);
            const message = err instanceof Error ? err.message : 'Ocurrió un error inesperado.';
            setActionError({ fileId: fileToDelete.id, message });
        } finally {
            setLoadingAction(null);
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

    return (
        <div className="bg-card-bg dark:bg-dark-card-bg p-6 rounded-xl shadow-md h-full">
            <h2 className="text-xl font-bold mb-4">Archivos Subidos</h2>
            <div className="space-y-3">
                {isLoading ? (
                    <div className="flex justify-center items-center py-8">
                        <Spinner />
                        <span className="ml-2">Cargando Archivos...</span>
                    </div>
                ) : files.length > 0 ? (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {files.map(file => (
                            <li key={file.id} className="py-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center min-w-0">
                                        <div className="flex-shrink-0">
                                            <FileIcon mimeType={file.metadata.mimetype} />
                                        </div>
                                        <div className="ml-4 min-w-0">
                                            <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary truncate">{file.name}</p>
                                            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
                                                {formatBytes(file.metadata.size)} - {new Date(file.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-1 flex-shrink-0">
                                        <button
                                            onClick={() => handlePreview(file)}
                                            disabled={loadingAction !== null}
                                            className="p-2 rounded-full text-text-secondary dark:text-dark-text-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:text-blue-600 dark:hover:text-blue-400"
                                            title={`Previsualizar ${file.name}`}
                                        >
                                            {loadingAction === `${file.id}-preview` ? <Spinner /> : <EyeIcon className="h-5 w-5" />}
                                        </button>
                                        <button
                                            onClick={() => handleDownload(file)}
                                            disabled={loadingAction !== null}
                                            className="p-2 rounded-full text-text-secondary dark:text-dark-text-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-100 dark:hover:bg-green-900/50 hover:text-green-600 dark:hover:text-green-400"
                                            title={`Descargar ${file.name}`}
                                        >
                                            {loadingAction === `${file.id}-download` ? <Spinner /> : <DocumentDownloadIcon className="h-5 w-5" />}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(file)}
                                            disabled={loadingAction !== null}
                                            className="p-2 rounded-full text-text-secondary dark:text-dark-text-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400"
                                            title={`Eliminar ${file.name}`}
                                        >
                                            {loadingAction === `${file.id}-delete` ? <Spinner /> : <TrashIcon className="h-5 w-5" />}
                                        </button>
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
                ) : (
                    <div className="text-center py-8 text-text-secondary dark:text-dark-text-secondary">
                        <CollectionIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium">No hay archivos subidos</h3>
                        <p className="mt-1 text-sm">Sube algunos archivos para verlos aquí.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileList;
