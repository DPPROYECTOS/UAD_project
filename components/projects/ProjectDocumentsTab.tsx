import React, { useState, useEffect } from 'react';
import { Project, Document, Folder } from '../../types';
import { getSignedUrlForDocument } from '../../services/supabaseService';
import { UploadIcon, TrashIcon, CollectionIcon, InformationCircleIcon, EyeIcon, DocumentDownloadIcon, DocumentTextIcon, XIcon } from '../Icons';
import Spinner from '../Spinner';
import ConfirmationModal from './ConfirmationModal';

interface ProjectDocumentsTabProps {
  project: Project;
  documents: Document[];
  folders: Folder[];
  onAddDocument: (file: File, folderId: string, projectId: string | null) => Promise<void>;
  onDeleteDocument: (doc: Document) => Promise<void>;
}

const ProjectDocumentsTab: React.FC<ProjectDocumentsTabProps> = ({ project, documents, folders, onAddDocument, onDeleteDocument }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedFolderId, setSelectedFolderId] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [docToDelete, setDocToDelete] = useState<Document | null>(null);
    
    // State for the embedded previewer
    const [previewingDoc, setPreviewingDoc] = useState<Document | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);
    
    useEffect(() => {
        const generalFolder = folders.find(f => f.name === 'General');
        if (generalFolder && !selectedFolderId) {
            setSelectedFolderId(generalFolder.id);
        }
    }, [folders, selectedFolderId]);

    // Clean up blob URL to prevent memory leaks
    useEffect(() => {
        return () => {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);


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
            if (previewingDoc?.id === docToDelete.id) {
                setPreviewingDoc(null);
                setPreviewUrl(null);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo eliminar el documento.');
        } finally {
            setDocToDelete(null);
        }
    };
    
    const handlePreview = async (doc: Document) => {
        if (previewingDoc?.id === doc.id) {
            setPreviewingDoc(null);
            setPreviewUrl(null);
            return;
        }

        setPreviewingDoc(doc);
        setIsPreviewLoading(true);
        setPreviewError(null);
        if (previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);

        try {
            const officeMimeTypes = [
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ];
            const isOfficeDoc = officeMimeTypes.includes(doc.mimeType);
            const isBrowserViewable = doc.mimeType.startsWith('image/') || doc.mimeType === 'application/pdf';

            const signedUrl = await getSignedUrlForDocument(doc.storagePath);

            if (isBrowserViewable) {
                const response = await fetch(signedUrl);
                if (!response.ok) throw new Error('No se pudo descargar el archivo para la previsualización.');
                const blob = await response.blob();
                const objectUrl = URL.createObjectURL(blob);
                setPreviewUrl(objectUrl);
            } else if (isOfficeDoc) {
                setPreviewUrl(`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`);
            } else {
                setPreviewError(`La previsualización no está disponible para este tipo de archivo (${doc.mimeType}).`);
            }
        } catch (err) {
            setPreviewError(err instanceof Error ? err.message : 'No se pudo cargar la previsualización.');
        } finally {
            setIsPreviewLoading(false);
        }
    };

    const handleDownload = async (doc: Document) => {
        try {
            const signedUrl = await getSignedUrlForDocument(doc.storagePath);
            const link = document.createElement('a');
            link.href = signedUrl;
            link.setAttribute('download', doc.name);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch(err) {
             setError(err instanceof Error ? err.message : `Failed to download file.`);
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

    const renderPreviewPane = () => {
        if (!previewingDoc) return null;

        return (
            <div className="mt-4 border-t-2 border-light-border dark:border-dark-border pt-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-light-text dark:text-dark-text truncate">Previsualización: {previewingDoc.name}</h3>
                    <button onClick={() => setPreviewingDoc(null)} className="p-1 rounded-full hover:bg-light-bg dark:hover:bg-dark-bg">
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>
                <div className="relative w-full h-[600px] bg-gray-200 dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border">
                    {isPreviewLoading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Spinner />
                            <span className="ml-2">Cargando...</span>
                        </div>
                    )}
                    {!isPreviewLoading && (previewUrl || previewError) && (
                        (previewError || !previewUrl) ? (
                             <div className="flex flex-col items-center justify-center h-full text-center p-4">
                                <InformationCircleIcon className="h-12 w-12 text-gray-400" />
                                <h4 className="mt-4 font-semibold text-light-text dark:text-dark-text">Previsualización no disponible</h4>
                                <p className="mt-1 text-sm text-light-text-secondary dark:text-dark-text-secondary">{previewError}</p>
                                <p className="mt-1 text-xs text-light-text-secondary dark:text-dark-text-secondary">Es posible que tu navegador esté bloqueando la previsualización de este archivo por seguridad.</p>
                                <button onClick={() => handleDownload(previewingDoc)} className="mt-4 flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary">
                                    <DocumentDownloadIcon className="h-5 w-5 mr-2" />
                                    Descargar Archivo
                                </button>
                            </div>
                        ) : (
                            <iframe
                                src={previewUrl}
                                title={previewingDoc.name}
                                className="w-full h-full rounded-lg"
                                frameBorder="0"
                            />
                        )
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
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
                                    <button onClick={() => handlePreview(doc)} className="p-2 rounded-full text-light-text-secondary hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:text-blue-500" title="Previsualizar">
                                        <EyeIcon className="h-5 w-5" />
                                    </button>
                                    <button onClick={() => handleDownload(doc)} className="p-2 rounded-full text-light-text-secondary hover:bg-green-100 dark:hover:bg-green-900/50 hover:text-green-500" title="Descargar">
                                        <DocumentDownloadIcon className="h-5 w-5" />
                                    </button>
                                    <button onClick={() => setDocToDelete(doc)} className="p-2 rounded-full text-light-text-secondary hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-500" title={`Eliminar ${doc.name}`}>
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
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
                {renderPreviewPane()}
            </div>
            
            <ConfirmationModal
                isOpen={!!docToDelete}
                onClose={() => setDocToDelete(null)}
                onConfirm={handleDeleteConfirm}
                title="Eliminar Documento"
                message={`¿Estás seguro de que quieres eliminar "${docToDelete?.name}"? Esta acción es permanente.`}
            />
        </div>
    );
};

export default ProjectDocumentsTab;