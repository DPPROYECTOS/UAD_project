import React, { useState, useEffect } from 'react';
import { Project, Document, Folder, UserPermissions, User } from '../../types';
import { getSignedUrlForDocument } from '../../services/supabaseService';
import { UploadIcon, TrashIcon, CollectionIcon, InformationCircleIcon, EyeIcon, DocumentDownloadIcon, DocumentTextIcon } from '../Icons';
import Spinner from '../Spinner';
import ConfirmationModal from './ConfirmationModal';
import FileViewerModal from '../FileViewerModal';

interface ProjectDocumentsTabProps {
  project: Project;
  documents: Document[];
  folders: Folder[];
  onAddDocument: (file: File, folderId: string, projectId: string | null) => Promise<void>;
  onDeleteDocument: (doc: Document) => Promise<void>;
  userPermissions: UserPermissions | null;
  user: User;
}

const ProjectDocumentsTab: React.FC<ProjectDocumentsTabProps> = ({ project, documents, folders, onAddDocument, onDeleteDocument, userPermissions, user }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedFolderId, setSelectedFolderId] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [docToDelete, setDocToDelete] = useState<Document | null>(null);
    
    const [viewerFile, setViewerFile] = useState<{ id: string; url: string; name: string; mimeType: string; } | null>(null);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    
    useEffect(() => {
        const generalFolder = folders.find(f => f.name === 'General');
        if (generalFolder && !selectedFolderId) {
            setSelectedFolderId(generalFolder.id);
        }
    }, [folders, selectedFolderId]);
    
    const canUpload = userPermissions?.proyectos_documentos?.canUpload ?? false;
    const canView = userPermissions?.proyectos_documentos?.canView ?? false;
    const canDownload = userPermissions?.proyectos_documentos?.canDownload ?? false;
    const canDelete = userPermissions?.proyectos_documentos?.canDelete ?? false;


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setError(null);
        }
    };

    const handleUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) {
            setError('Por favor, selecciona un archivo.');
            return;
        }
        if (!selectedFolderId) {
            setError('Por favor, selecciona una carpeta de destino.');
            return;
        }

        setIsUploading(true);
        setError(null);
        
        try {
            await onAddDocument(selectedFile, selectedFolderId, project.id);
            setSelectedFile(null);
            const fileInput = document.getElementById('project-file-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo subir el archivo.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!docToDelete) return;
        try {
            await onDeleteDocument(docToDelete);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo eliminar el documento.');
        } finally {
            setDocToDelete(null);
        }
    };
    
    const handlePreview = async (doc: Document) => {
        setActionLoadingId(doc.id);
        setError(null);
        try {
            const signedUrl = await getSignedUrlForDocument(doc.storagePath);
            setViewerFile({
                id: doc.id,
                url: signedUrl,
                name: doc.name,
                mimeType: doc.mimeType,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo cargar la previsualización.');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleDownload = async (doc: Document) => {
        setActionLoadingId(doc.id + '-download');
        try {
            const signedUrl = await getSignedUrlForDocument(doc.storagePath, { download: doc.name });
            const link = document.createElement('a');
            link.href = signedUrl;
            link.setAttribute('download', doc.name);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch(err) {
             setError(err instanceof Error ? err.message : `Failed to download file.`);
        } finally {
            setActionLoadingId(null);
        }
    }


    const formatBytes = (bytes: number, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-6">
            {canUpload && (
                <form onSubmit={handleUploadSubmit} className="p-4 bg-light-bg dark:bg-dark-bg/50 rounded-lg border border-light-border dark:border-dark-border space-y-4">
                    <h3 className="text-lg font-semibold">Subir Nuevo Documento</h3>
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center text-sm" role="alert">
                            <InformationCircleIcon className="h-5 w-5 mr-3 flex-shrink-0" />
                            <span>{error}</span>
                            <button type="button" onClick={() => setError(null)} className="ml-auto text-lg font-bold">&times;</button>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="folder-select" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Carpeta de Destino</label>
                            <select
                                id="folder-select"
                                value={selectedFolderId}
                                onChange={e => setSelectedFolderId(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-brand-accent"
                            >
                                <option value="">Selecciona una carpeta</option>
                                {folders.filter(f => !f.parentId).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="project-file-upload" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Archivo</label>
                            <input
                                id="project-file-upload"
                                type="file"
                                onChange={handleFileChange}
                                className="w-full text-sm text-light-text-secondary dark:text-dark-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-accent/20 file:text-brand-primary hover:file:bg-brand-accent/30"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" disabled={isUploading || !selectedFile || !selectedFolderId} className="flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary disabled:bg-brand-primary/50">
                            {isUploading ? <><Spinner /> <span className="ml-2">Subiendo...</span></> : <><UploadIcon className="h-5 w-5 mr-2" /> Subir a '{project.name}'</>}
                        </button>
                    </div>
                </form>
            )}

            <div className="bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border p-4">
                <h2 className="text-xl font-bold mb-3">Archivos del Proyecto</h2>
                {documents.length > 0 ? (
                    <ul className="divide-y divide-light-border dark:divide-dark-border">
                        {documents.map(doc => (
                            <li key={doc.id} className="py-3 flex items-center justify-between">
                                <div className="flex items-center min-w-0">
                                    <DocumentTextIcon className="h-6 w-6 text-light-text-secondary dark:text-dark-text-secondary flex-shrink-0" />
                                    <div className="ml-3 min-w-0">
                                        <p className="text-sm font-medium truncate">{doc.name}</p>
                                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">{formatBytes(doc.size)} - {new Date(doc.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-1 flex-shrink-0">
                                    {canView && (
                                        <button disabled={!!actionLoadingId} onClick={() => handlePreview(doc)} className="p-2 rounded-full text-light-text-secondary hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:text-blue-500" title="Previsualizar">
                                            {actionLoadingId === doc.id ? <Spinner/> : <EyeIcon className="h-5 w-5" />}
                                        </button>
                                    )}
                                    {canDownload && (
                                        <button disabled={!!actionLoadingId} onClick={() => handleDownload(doc)} className="p-2 rounded-full text-light-text-secondary hover:bg-green-100 dark:hover:bg-green-900/50 hover:text-green-500" title="Descargar">
                                            {actionLoadingId === (doc.id + '-download') ? <Spinner/> : <DocumentDownloadIcon className="h-5 w-5" />}
                                        </button>
                                    )}
                                    {canDelete && (
                                        <button disabled={!!actionLoadingId} onClick={() => setDocToDelete(doc)} className="p-2 rounded-full text-light-text-secondary hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-500" title={`Eliminar ${doc.name}`}>
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-10 border-2 border-dashed border-light-border dark:border-dark-border rounded-lg">
                        <CollectionIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium">No hay documentos</h3>
                        <p className="mt-1 text-sm text-light-text-secondary dark:text-dark-text-secondary">Sube un archivo para asociarlo a este proyecto.</p>
                    </div>
                )}
            </div>
            
            <ConfirmationModal
                isOpen={!!docToDelete}
                onClose={() => setDocToDelete(null)}
                onConfirm={handleDeleteConfirm}
                title="Eliminar Documento"
                message={`¿Estás seguro de que quieres eliminar "${docToDelete?.name}"? Esta acción es permanente.`}
            />

            {viewerFile && (
                <FileViewerModal
                    document={viewerFile}
                    user={user}
                    onClose={() => setViewerFile(null)}
                />
            )}
        </div>
    );
};

export default ProjectDocumentsTab;