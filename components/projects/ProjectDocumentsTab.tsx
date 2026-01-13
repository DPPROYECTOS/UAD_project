
import React, { useState, useEffect, useMemo } from 'react';
import { Project, Document, Folder, UserPermissions, User } from '../../types';
import { getSignedUrlForDocument } from '../../services/supabaseService';
import { 
    UploadIcon, TrashIcon, CollectionIcon, InformationCircleIcon, 
    EyeIcon, DocumentDownloadIcon, DocumentTextIcon, LinkIcon, 
    SearchIcon, XIcon, PlusIcon, FolderIcon, ArrowLeftIcon, ServerIcon 
} from '../Icons';
import Spinner from '../Spinner';
import ConfirmationModal from './ConfirmationModal';
import FileViewerModal from '../FileViewerModal';

// Helper function to format file sizes in bytes to a human-readable string.
const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

interface ProjectDocumentsTabProps {
  project: Project;
  documents: Document[];
  allGlobalDocuments: Document[]; 
  folders: Folder[];
  onAddDocument: (file: File, folderId: string, projectId: string | null) => Promise<void>;
  onDeleteDocument: (doc: Document) => Promise<void>;
  onAttachDocument: (docId: string) => Promise<void>;
  userPermissions: UserPermissions | null;
  user: User;
  isLoading?: boolean;
}

const ProjectDocumentsTab: React.FC<ProjectDocumentsTabProps> = ({ 
    project, documents, allGlobalDocuments, folders, onAddDocument, 
    onDeleteDocument, onAttachDocument, userPermissions, user, isLoading 
}) => {
    // Extract permissions from userPermissions prop.
    const canUpload = userPermissions?.proyectos_documentos?.canUpload ?? false;
    const canView = userPermissions?.proyectos_documentos?.canView ?? false;
    const canDownload = userPermissions?.proyectos_documentos?.canDownload ?? false;
    const canDelete = userPermissions?.proyectos_documentos?.canDelete ?? false;

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedFolderId, setSelectedFolderId] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [docToDelete, setDocToDelete] = useState<Document | null>(null);
    
    // --- Attachment Modal State ---
    const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
    const [attachSearchQuery, setAttachSearchQuery] = useState('');
    const [isAttaching, setIsAttaching] = useState<string | null>(null);
    const [modalCurrentPath, setModalCurrentPath] = useState<Folder[]>([]);

    const [viewerFile, setViewerFile] = useState<{ id: string; url: string; name: string; mimeType: string; } | null>(null);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    
    useEffect(() => {
        const generalFolder = folders.find(f => f.name === 'General');
        if (generalFolder && !selectedFolderId) {
            setSelectedFolderId(generalFolder.id);
        }
    }, [folders, selectedFolderId]);

    // Lógica de navegación del modal
    const currentModalFolderId = modalCurrentPath.length > 0 ? modalCurrentPath[modalCurrentPath.length - 1].id : null;

    const modalContent = useMemo(() => {
        const projectDocIds = new Set(documents.map(d => d.id));
        
        // Si hay búsqueda, mostrar lista plana global
        if (attachSearchQuery.trim()) {
            return {
                folders: [],
                files: allGlobalDocuments.filter(d => 
                    !projectDocIds.has(d.id) && 
                    d.name.toLowerCase().includes(attachSearchQuery.toLowerCase())
                )
            };
        }

        // Si no hay búsqueda, mostrar jerarquía
        const filteredFolders = folders.filter(f => f.parentId === currentModalFolderId);
        const filteredFiles = allGlobalDocuments.filter(d => 
            d.folderId === currentModalFolderId && !projectDocIds.has(d.id)
        );

        return {
            folders: filteredFolders.sort((a, b) => a.name.localeCompare(b.name)),
            files: filteredFiles.sort((a, b) => a.name.localeCompare(b.name))
        };
    }, [allGlobalDocuments, documents, folders, currentModalFolderId, attachSearchQuery]);

    const handleEnterFolder = (folder: Folder) => {
        setModalCurrentPath(prev => [...prev, folder]);
    };

    const handleGoBack = () => {
        setModalCurrentPath(prev => prev.slice(0, -1));
    };

    const handleBreadcrumbClick = (index: number | null) => {
        if (index === null) setModalCurrentPath([]);
        else setModalCurrentPath(prev => prev.slice(0, index + 1));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setError(null);
        }
    };

    const handleUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile || !selectedFolderId) return;

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

    const handleAttach = async (docId: string) => {
        setIsAttaching(docId);
        try {
            await onAttachDocument(docId);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo adjuntar el documento.');
        } finally {
            setIsAttaching(null);
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
            setViewerFile({ id: doc.id, url: signedUrl, name: doc.name, mimeType: doc.mimeType });
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
                {canUpload && (
                    <div className="flex-1 p-4 bg-light-bg dark:bg-dark-bg/50 rounded-lg border border-light-border dark:border-dark-border space-y-4 shadow-sm">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                             <UploadIcon className="h-5 w-5 text-brand-primary" />
                             Subir Nuevo Documento
                        </h3>
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center text-sm">
                                <InformationCircleIcon className="h-5 w-5 mr-3 flex-shrink-0" />
                                <span>{error}</span>
                                <button type="button" onClick={() => setError(null)} className="ml-auto text-lg font-bold">&times;</button>
                            </div>
                        )}
                        <form onSubmit={handleUploadSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Carpeta de Destino</label>
                                    <select
                                        value={selectedFolderId}
                                        onChange={e => setSelectedFolderId(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-brand-accent"
                                    >
                                        <option value="">Selecciona una carpeta</option>
                                        {folders.filter(f => !f.parentId).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Archivo Local</label>
                                    <input
                                        id="project-file-upload"
                                        type="file"
                                        onChange={handleFileChange}
                                        className="w-full text-sm text-light-text-secondary dark:text-dark-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-accent/20 file:text-brand-primary hover:file:bg-brand-accent/30"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button type="submit" disabled={isUploading || !selectedFile || !selectedFolderId} className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary disabled:bg-brand-primary/50">
                                    {isUploading ? <><Spinner /> <span className="ml-2">Subiendo...</span></> : <>Cargar y Vincular</>}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {canUpload && (
                    <div className="flex-1 p-4 bg-light-bg dark:bg-dark-bg/50 rounded-lg border border-light-border dark:border-dark-border flex flex-col shadow-sm">
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                            <LinkIcon className="h-5 w-5 text-brand-primary" />
                            Adjuntar de Repositorio
                        </h3>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-4">
                            Usa archivos que ya fueron subidos al apartado general para este proyecto.
                        </p>
                        <button 
                            onClick={() => setIsAttachModalOpen(true)}
                            className="mt-auto w-full py-4 border-2 border-dashed border-brand-primary/30 rounded-lg text-brand-primary font-bold hover:bg-brand-primary/10 transition-all flex flex-col items-center justify-center gap-2"
                        >
                            <SearchIcon className="h-8 w-8" />
                            EXPLORAR REPOSITORIO
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border p-4 relative min-h-[200px] shadow-sm">
                <h2 className="text-xl font-bold mb-3">Documentos Empleados</h2>
                {isLoading ? (
                    <div className="flex justify-center items-center py-10"><Spinner /></div>
                ) : documents.length > 0 ? (
                    <ul className="divide-y divide-light-border dark:divide-dark-border">
                        {documents.map(doc => {
                            const isDirect = doc.projectId === project.id;
                            return (
                                <li key={doc.id} className="py-3 flex items-center justify-between group">
                                    <div className="flex items-center min-w-0">
                                        <DocumentTextIcon className={`h-6 w-6 ${isDirect ? 'text-brand-primary' : 'text-purple-400'} flex-shrink-0`} />
                                        <div className="ml-3 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium truncate">{doc.name}</p>
                                                {!isDirect && <span className="text-[9px] font-black uppercase bg-purple-500/10 text-purple-500 px-1.5 py-0.5 rounded border border-purple-500/20">Adjunto</span>}
                                            </div>
                                            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">{formatBytes(doc.size)} - {new Date(doc.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-1 flex-shrink-0">
                                        {canView && (
                                            <button disabled={!!actionLoadingId} onClick={() => handlePreview(doc)} className="p-2 rounded-full text-light-text-secondary hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:text-blue-500">
                                                {actionLoadingId === doc.id ? <Spinner/> : <EyeIcon className="h-5 w-5" />}
                                            </button>
                                        )}
                                        {canDownload && (
                                            <button disabled={!!actionLoadingId} onClick={() => handleDownload(doc)} className="p-2 rounded-full text-light-text-secondary hover:bg-green-100 dark:hover:bg-green-900/50 hover:text-green-500">
                                                {actionLoadingId === (doc.id + '-download') ? <Spinner/> : <DocumentDownloadIcon className="h-5 w-5" />}
                                            </button>
                                        )}
                                        {canDelete && (
                                            <button disabled={!!actionLoadingId} onClick={() => setDocToDelete(doc)} className="p-2 rounded-full text-light-text-secondary hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-500" title={isDirect ? "Eliminar permanentemente" : "Quitar del proyecto"}>
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <div className="text-center py-10 border-2 border-dashed border-light-border dark:border-dark-border rounded-lg">
                        <CollectionIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium">No hay documentos</h3>
                        <p className="mt-1 text-sm text-light-text-secondary dark:text-dark-text-secondary">Sube o adjunta archivos para este proyecto.</p>
                    </div>
                )}
            </div>
            
            {/* --- Attach Modal Hierarchical --- */}
            {isAttachModalOpen && (
                <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-light-card dark:bg-dark-card rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <header className="p-4 border-b border-light-border dark:border-dark-border flex justify-between items-center bg-light-bg/50 dark:bg-dark-bg/50">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <LinkIcon className="h-5 w-5 text-brand-primary"/>
                                    Repositorio General
                                </h2>
                                <p className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary uppercase font-bold tracking-widest">Selecciona elementos para vincular</p>
                            </div>
                            <button onClick={() => setIsAttachModalOpen(false)} className="p-2 rounded-full hover:bg-light-bg dark:hover:bg-dark-bg transition-colors"><XIcon/></button>
                        </header>

                        {/* Search & Navigation */}
                        <div className="p-4 border-b border-light-border dark:border-dark-border space-y-3">
                            <div className="relative">
                                <input 
                                    type="text" 
                                    placeholder="Buscar archivos en todo el repositorio..."
                                    value={attachSearchQuery}
                                    onChange={e => setAttachSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border focus:ring-2 focus:ring-brand-primary outline-none"
                                />
                                <SearchIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            </div>

                            {!attachSearchQuery && (
                                <div className="flex items-center gap-1 text-[11px] font-bold uppercase overflow-x-auto whitespace-nowrap pb-1">
                                    <button 
                                        onClick={() => handleBreadcrumbClick(null)}
                                        className={`flex items-center gap-1 hover:text-brand-primary transition-colors ${modalCurrentPath.length === 0 ? 'text-brand-primary font-black' : 'text-gray-500'}`}
                                    >
                                        <ServerIcon className="h-3 w-3"/> RAÍZ
                                    </button>
                                    {modalCurrentPath.map((f, i) => (
                                        <React.Fragment key={f.id}>
                                            <span className="text-gray-400">/</span>
                                            <button 
                                                onClick={() => handleBreadcrumbClick(i)}
                                                className={`hover:text-brand-primary transition-colors ${i === modalCurrentPath.length - 1 ? 'text-brand-primary font-black' : 'text-gray-500'}`}
                                            >
                                                {f.name}
                                            </button>
                                        </React.Fragment>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar bg-light-bg/20 dark:bg-dark-bg/20">
                            {modalContent.folders.length === 0 && modalContent.files.length === 0 ? (
                                <div className="text-center py-16 opacity-50 flex flex-col items-center">
                                    <InformationCircleIcon className="h-12 w-12 mb-3"/>
                                    <p className="text-sm font-bold uppercase tracking-widest">Carpeta vacía o sin coincidencias</p>
                                </div>
                            ) : (
                                <ul className="space-y-1">
                                    {/* Mostrar botón de volver si estamos en subcarpeta y no hay búsqueda */}
                                    {!attachSearchQuery && modalCurrentPath.length > 0 && (
                                        <li 
                                            onClick={handleGoBack}
                                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-brand-primary/5 cursor-pointer text-gray-500 font-bold text-xs uppercase"
                                        >
                                            <ArrowLeftIcon className="h-4 w-4"/>
                                            ../ Regresar
                                        </li>
                                    )}

                                    {/* Renderizar Carpetas */}
                                    {modalContent.folders.map(folder => (
                                        <li 
                                            key={folder.id}
                                            onClick={() => handleEnterFolder(folder)}
                                            className="flex items-center justify-between p-3 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg cursor-pointer group transition-colors"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <FolderIcon className="h-6 w-6 text-yellow-500 flex-shrink-0"/>
                                                <span className="text-sm font-bold truncate uppercase">{folder.name}</span>
                                            </div>
                                            <ChevronRightIcon className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100"/>
                                        </li>
                                    ))}

                                    {/* Renderizar Archivos */}
                                    {modalContent.files.map(doc => (
                                        <li key={doc.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg transition-colors border border-transparent hover:border-light-border dark:hover:border-dark-border">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <DocumentTextIcon className="h-6 w-6 text-gray-400 flex-shrink-0"/>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium truncate" title={doc.name}>{doc.name}</p>
                                                    <p className="text-[9px] uppercase font-black text-gray-500 tracking-tighter">
                                                        {formatBytes(doc.size)} • {new Date(doc.createdAt).toLocaleDateString()}
                                                        {attachSearchQuery && ` • en: ${folders.find(f => f.id === doc.folderId)?.name || 'Raíz'}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleAttach(doc.id)}
                                                disabled={!!isAttaching}
                                                className="ml-4 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded bg-brand-primary text-white hover:bg-brand-secondary disabled:opacity-50 flex items-center gap-2 shadow-sm"
                                            >
                                                {isAttaching === doc.id ? <Spinner size="sm"/> : 'ADJUNTAR'}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <footer className="p-4 bg-light-bg dark:bg-dark-bg/50 border-t border-light-border dark:border-dark-border flex justify-end">
                            <button onClick={() => setIsAttachModalOpen(false)} className="px-6 py-2 text-xs font-black uppercase tracking-widest rounded-md border border-light-border dark:border-dark-border hover:bg-red-500/10 hover:text-red-500 transition-all">Cerrar</button>
                        </footer>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={!!docToDelete}
                onClose={() => setDocToDelete(null)}
                onConfirm={handleDeleteConfirm}
                title={docToDelete?.projectId === project.id ? "Eliminar Documento" : "Quitar del Proyecto"}
                message={docToDelete?.projectId === project.id 
                    ? `¿Estás seguro de que quieres eliminar "${docToDelete?.name}"? Esta acción es permanente.` 
                    : `¿Estás seguro de que quieres quitar "${docToDelete?.name}" de este proyecto? El archivo seguirá existiendo en el repositorio general.`}
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

// Icono auxiliar para navegación
const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
);

export default ProjectDocumentsTab;
