
import React, { useState, useMemo, useEffect } from 'react';
import { Project, Document, Folder, UserPermissions, User } from '../types';
import { FolderIcon, DocumentTextIcon, UploadIcon, TrashIcon, CollectionIcon, InformationCircleIcon, PlusIcon, EyeIcon, DocumentDownloadIcon, SearchIcon, GlobeAltIcon, ServerIcon, ArrowRightIcon, CheckCircleIcon } from '../components/Icons';
import Spinner from '../components/Spinner';
import ConfirmationModal from '../components/projects/ConfirmationModal';
import { getSignedUrlForDocument, getSignedUrlForExternalDocument } from '../services/supabaseService';
import FileViewerModal from '../components/FileViewerModal';

const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

interface DocumentsViewProps {
  projects: Project[];
  folders: Folder[];
  documents: Document[];
  externalFolders: Folder[];
  externalDocuments: Document[];
  isLoading: boolean;
  onAddFolder: (name: string, parentId: string | null) => Promise<Folder>;
  onDeleteFolder: (id: string) => Promise<void>;
  onAddDocument: (file: File, folderId: string, projectId: string | null) => Promise<void>;
  onDeleteDocument: (doc: Document) => Promise<void>;
  onMoveDocument: (docId: string, newFolderId: string) => Promise<void>;
  onAddExternalFolder: (name: string, parentId: string | null) => Promise<Folder>;
  onDeleteExternalFolder: (id: string) => Promise<void>;
  onAddExternalDocument: (file: File, folderId: string, projectId: string | null) => Promise<void>;
  onDeleteExternalDocument: (doc: Document) => Promise<void>;
  onMoveExternalDocument: (docId: string, newFolderId: string) => Promise<void>;
  userPermissions: UserPermissions | null;
  user: User;
  deleteLocks?: Record<string, boolean>;
}

const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
);

const buildFolderTree = (folders: Folder[]): Folder[] => {
    if (!folders || folders.length === 0) return [];
    const folderMap = new Map<string, Folder & { children: Folder[] }>();
    folders.forEach(folder => {
        folderMap.set(folder.id, { ...folder, children: [] });
    });
    const rootNodes: (Folder & { children: Folder[] })[] = [];
    folderMap.forEach(node => {
        if (node.parentId && folderMap.has(node.parentId)) {
            const parent = folderMap.get(node.parentId)!;
            parent.children.push(node);
        } else {
            rootNodes.push(node);
        }
    });
    const sortChildrenRecursively = (node: Folder & { children: Folder[] }) => {
        if (node.children && node.children.length > 0) {
            node.children.sort((a, b) => a.name.localeCompare(b.name));
            node.children.forEach(sortChildrenRecursively);
        }
    };
    rootNodes.sort((a, b) => {
        if (a.name === 'General') return -1;
        if (b.name === 'General') return 1;
        return a.name.localeCompare(b.name);
    });
    rootNodes.forEach(sortChildrenRecursively);
    return rootNodes;
};

const DocumentsView: React.FC<DocumentsViewProps> = ({ 
    projects, folders, documents, externalFolders, externalDocuments, isLoading, 
    onAddFolder, onDeleteFolder, onAddDocument, onDeleteDocument, onMoveDocument,
    onAddExternalFolder, onDeleteExternalFolder, onAddExternalDocument, onDeleteExternalDocument, onMoveExternalDocument,
    userPermissions, user, deleteLocks = {}
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{current: number, total: number} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [addingToParentId, setAddingToParentId] = useState<string | null>(null);
  const [isAddingRoot, setIsAddingRoot] = useState(false); // Estabilizador de scroll
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [viewerFile, setViewerFile] = useState<{ id: string; url: string; name: string; mimeType: string; } | null>(null);

  const [selectedFolderIdExt, setSelectedFolderIdExt] = useState<string>('');
  const [selectedFilesExt, setSelectedFilesExt] = useState<File[]>([]);
  const [isUploadingExt, setIsUploadingExt] = useState(false);
  const [uploadProgressExt, setUploadProgressExt] = useState<{current: number, total: number} | null>(null);
  const [errorExt, setErrorExt] = useState<string | null>(null);
  const [docToDeleteExt, setDocToDeleteExt] = useState<Document | null>(null);
  const [folderToDeleteExt, setFolderToDeleteExt] = useState<Folder | null>(null);
  const [newFolderNameExt, setNewFolderNameExt] = useState('');
  const [addingToParentIdExt, setAddingToParentIdExt] = useState<string | null>(null);
  const [isAddingRootExt, setIsAddingRootExt] = useState(false); // Estabilizador de scroll
  const [expandedFoldersExt, setExpandedFoldersExt] = useState<Set<string>>(new Set());
  const [searchQueryExt, setSearchQueryExt] = useState('');

  const [docToMove, setDocToMove] = useState<{ doc: Document, isExternal: boolean } | null>(null);
  const [movingToFolderId, setMovingToFolderId] = useState<string>('');

  const isDarien = user?.username?.trim().toLowerCase() === 'darienperez695@gmail.com' || user?.email?.trim().toLowerCase() === 'darienperez695@gmail.com';
  const isDocumentDeleteLocked = !!deleteLocks?.['documentos'] && !isDarien;

  const canUpload = userPermissions?.documentos?.canUpload ?? false;
  const canDownload = userPermissions?.documentos?.canDownload ?? false;
  const canDelete = userPermissions?.documentos?.canDelete ?? false;
  const canManageFolders = userPermissions?.documentos?.canManageFolders ?? false;

  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);
  useEffect(() => {
    if (!selectedFolderId && folders.length > 0) {
      const generalFolder = folders.find(f => f.name === 'General');
      const firstFolderId = generalFolder?.id || folders[0]?.id || '';
      setSelectedFolderId(firstFolderId);
      setExpandedFolders(prev => new Set(prev).add(firstFolderId));
    }
  }, [folders, selectedFolderId]);

  const filteredDocuments = useMemo(() => documents.filter(doc => doc.folderId === selectedFolderId), [documents, selectedFolderId]);
  const searchResults = useMemo(() => !searchQuery.trim() ? [] : documents.filter(doc => doc.name.toLowerCase().includes(searchQuery.toLowerCase())), [documents, searchQuery]);
  const folderNameMap = useMemo(() => {
    const map = new Map<string, string>();
    folders.forEach(f => map.set(f.id, f.name));
    return map;
  }, [folders]);

  const folderTreeExt = useMemo(() => buildFolderTree(externalFolders), [externalFolders]);
  useEffect(() => {
      if (!selectedFolderIdExt && externalFolders.length > 0) {
          const generalExt = externalFolders.find(f => f.name === 'General');
          const firstExtId = generalExt ? generalExt.id : externalFolders[0].id;
          setSelectedFolderIdExt(firstExtId);
          setExpandedFoldersExt(new Set([firstExtId]));
      }
  }, [externalFolders, selectedFolderIdExt]);

  const filteredDocumentsExt = useMemo(() => externalDocuments.filter(doc => doc.folderId === selectedFolderIdExt), [externalDocuments, selectedFolderIdExt]);
  const searchResultsExt = useMemo(() => !searchQueryExt.trim() ? [] : externalDocuments.filter(doc => doc.name.toLowerCase().includes(searchQueryExt.toLowerCase())), [externalDocuments, searchQueryExt]);
  const folderNameMapExt = useMemo(() => {
      const map = new Map<string, string>();
      externalFolders.forEach(f => map.set(f.id, f.name));
      return map;
  }, [externalFolders]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
        setSelectedFiles(prev => {
            const newList = [...prev, ...files];
            return newList.slice(0, 15); // Límite de 15 archivos
        });
        setError(null);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    if (selectedFiles.length <= 1) {
        const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    }
  };

  const handleAddDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0 || !selectedFolderId) return;
    setIsUploading(true);
    setUploadProgress({ current: 0, total: selectedFiles.length });
    
    let hasError = false;
    for (let i = 0; i < selectedFiles.length; i++) {
        setUploadProgress({ current: i + 1, total: selectedFiles.length });
        try {
            await onAddDocument(selectedFiles[i], selectedFolderId, selectedProjectId || null);
        } catch (err) {
            setError(err instanceof Error ? err.message : `Error al subir ${selectedFiles[i].name}`);
            hasError = true;
            break;
        }
    }
    
    if (!hasError) {
        setSelectedFiles([]);
        setSelectedProjectId('');
        const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    }
    setIsUploading(false);
    setUploadProgress(null);
  };

  const handleAddNewFolder = async (e: React.FormEvent, parentId: string | null) => {
      e.preventDefault();
      const trimmedName = newFolderName.trim();
      if (!trimmedName) return;
      try {
        const newFolder = await onAddFolder(trimmedName, parentId);
        setNewFolderName('');
        setAddingToParentId(null);
        setIsAddingRoot(false);
        setSelectedFolderId(newFolder.id);
        if (newFolder.parentId) setExpandedFolders(prev => new Set(prev).add(newFolder.parentId!));
      } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo crear la carpeta.'); }
  };

  const handleAction = async (e: React.MouseEvent, doc: Document, action: 'preview' | 'download') => {
      e.preventDefault();
      setLoadingAction(`${doc.id}-${action}`);
      try {
          if (action === 'preview') {
              const signedUrl = await getSignedUrlForDocument(doc.storagePath);
              setViewerFile({ id: doc.id, url: signedUrl, name: doc.name, mimeType: doc.mimeType });
          } else {
              const signedUrl = await getSignedUrlForDocument(doc.storagePath, { download: doc.name });
              const link = window.document.createElement('a');
              link.href = signedUrl;
              link.setAttribute('download', doc.name);
              window.document.body.appendChild(link);
              link.click();
              link.parentNode?.removeChild(link);
          }
      } catch (err) { setError(err instanceof Error ? err.message : `Falló la acción de ${action}.`); } finally { setLoadingAction(null); }
  };

  const toggleFolder = (e: React.MouseEvent, folderId: string) => {
    e.preventDefault();
    setExpandedFolders(prev => {
        const newSet = new Set(prev);
        if (newSet.has(folderId)) newSet.delete(folderId); else newSet.add(folderId);
        return newSet;
    });
  };

  const handleFolderSelect = (e: React.MouseEvent, folderId: string, hasChildren: boolean) => {
      e.preventDefault();
      setSelectedFolderId(folderId);
      setSearchQuery(''); 
      if (hasChildren) toggleFolder(e, folderId);
  };

  const handleFileChangeExt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
        setSelectedFilesExt(prev => {
            const newList = [...prev, ...files];
            return newList.slice(0, 15);
        });
        setErrorExt(null);
    }
  };

  const removeFileExt = (index: number) => {
    setSelectedFilesExt(prev => prev.filter((_, i) => i !== index));
    if (selectedFilesExt.length <= 1) {
        const fileInput = document.getElementById('file-upload-input-ext') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    }
  };

  const handleAddDocumentSubmitExt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFilesExt.length === 0 || !selectedFolderIdExt) return;
    setIsUploadingExt(true);
    setUploadProgressExt({ current: 0, total: selectedFilesExt.length });
    
    let hasError = false;
    for (let i = 0; i < selectedFilesExt.length; i++) {
        setUploadProgressExt({ current: i + 1, total: selectedFilesExt.length });
        try {
            await onAddExternalDocument(selectedFilesExt[i], selectedFolderIdExt, null);
        } catch (err) {
            setErrorExt(err instanceof Error ? err.message : `Error al subir ${selectedFilesExt[i].name} a externo`);
            hasError = true;
            break;
        }
    }
    
    if (!hasError) {
        setSelectedFilesExt([]);
        const fileInput = window.document.getElementById('file-upload-input-ext') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    }
    setIsUploadingExt(false);
    setUploadProgressExt(null);
  };

  const handleAddNewFolderExt = async (e: React.FormEvent, parentId: string | null) => {
      e.preventDefault();
      const trimmedName = newFolderNameExt.trim();
      if (!trimmedName) return;
      try {
        const newFolder = await onAddExternalFolder(trimmedName, parentId);
        setNewFolderNameExt('');
        setAddingToParentIdExt(null);
        setIsAddingRootExt(false);
        setSelectedFolderIdExt(newFolder.id);
        if (newFolder.parentId) setExpandedFoldersExt(prev => new Set(prev).add(newFolder.parentId!));
      } catch (err) { setErrorExt(err instanceof Error ? err.message : 'No se pudo crear la carpeta externa.'); }
  };

  const handleActionExt = async (e: React.MouseEvent, doc: Document, action: 'preview' | 'download') => {
      e.preventDefault();
      setLoadingAction(`${doc.id}-${action}-ext`);
      try {
          if (action === 'preview') {
              const signedUrl = await getSignedUrlForExternalDocument(doc.storagePath);
              setViewerFile({ id: doc.id, url: signedUrl, name: doc.name, mimeType: doc.mimeType });
          } else {
              const signedUrl = await getSignedUrlForExternalDocument(doc.storagePath, { download: doc.name });
              const link = window.document.createElement('a');
              link.href = signedUrl;
              link.setAttribute('download', doc.name);
              window.document.body.appendChild(link);
              link.click();
              link.parentNode?.removeChild(link);
          }
      } catch (err) { setErrorExt(err instanceof Error ? err.message : `Falló la acción de ${action} en externo.`); } finally { setLoadingAction(null); }
  };

  const toggleFolderExt = (e: React.MouseEvent, folderId: string) => {
      e.preventDefault();
      setExpandedFoldersExt(prev => {
          const newSet = new Set(prev);
          if (newSet.has(folderId)) newSet.delete(folderId); else newSet.add(folderId);
          return newSet;
      });
  };

  const handleFolderSelectExt = (e: React.MouseEvent, folderId: string, hasChildren: boolean) => {
      e.preventDefault();
      setSelectedFolderIdExt(folderId);
      setSearchQueryExt('');
      if (hasChildren) toggleFolderExt(e, folderId);
  };

  const handleDeleteDocument = async () => {
    if (!docToDelete) return;
    try {
        await onDeleteDocument(docToDelete);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo eliminar el documento.');
    } finally {
        setDocToDelete(null);
    }
  };

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;
    try {
        await onDeleteFolder(folderToDelete.id);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo eliminar la carpeta.');
    } finally {
        setFolderToDelete(null);
    }
  };

  const handleDeleteDocumentExt = async () => {
    if (!docToDeleteExt) return;
    try {
        await onDeleteExternalDocument(docToDeleteExt);
    } catch (err) {
        setErrorExt(err instanceof Error ? err.message : 'No se pudo eliminar el documento externo.');
    } finally {
        setDocToDeleteExt(null);
    }
  };

  const handleDeleteFolderExt = async () => {
    if (!folderToDeleteExt) return;
    try {
        await onDeleteExternalFolder(folderToDeleteExt.id);
    } catch (err) {
        setErrorExt(err instanceof Error ? err.message : 'No se pudo eliminar la carpeta externa.');
    } finally {
        setFolderToDeleteExt(null);
    }
  };

  const handleMoveDocument = async () => {
    if (!docToMove || !movingToFolderId) return;
    try {
        if (docToMove.isExternal) {
            await onMoveExternalDocument(docToMove.doc.id, movingToFolderId);
        } else {
            await onMoveDocument(docToMove.doc.id, movingToFolderId);
        }
    } catch (err) {
        if (docToMove.isExternal) setErrorExt(err instanceof Error ? err.message : 'No se pudo mover el documento.');
        else setError(err instanceof Error ? err.message : 'No se pudo mover el documento.');
    } finally {
        setDocToMove(null);
        setMovingToFolderId('');
    }
  };

  const FolderTreeItem: React.FC<{ folder: Folder, level: number }> = ({ folder, level }) => {
    const isExpanded = expandedFolders.has(folder.id);
    const hasChildren = folder.children && folder.children.length > 0;
    return (
      <div key={folder.id}>
        <div className="group flex items-center justify-between rounded-md min-w-0" style={{ paddingLeft: `${level * 1.5}rem` }}>
           <button
             type="button"
             onClick={(e) => handleFolderSelect(e, folder.id, hasChildren)}
             className={`flex-1 min-w-0 text-left flex items-center p-2 rounded-md text-sm font-medium transition-colors ${selectedFolderId === folder.id && !searchQuery ? 'bg-brand-accent/20 text-brand-primary' : 'hover:bg-light-bg dark:hover:bg-dark-bg'}`}
           >
            {hasChildren && <ChevronRightIcon className={`h-4 w-4 mr-1 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />}
            <FolderIcon className={`h-5 w-5 mr-2 flex-shrink-0 ${hasChildren ? '' : 'ml-[20px]'}`} />
            <span className="truncate flex-1">{folder.name}</span>
           </button>
           {canManageFolders && (
            <div className="flex items-center flex-shrink-0">
              <button type="button" onClick={() => setAddingToParentId(folder.id)} className="p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-light-text-secondary hover:text-brand-primary" title="Añadir sub-carpeta"><PlusIcon className="h-4 w-4" /></button>
              {folder.name !== 'General' && (
                <button 
                  type="button" 
                  onClick={() => {
                    if (isDocumentDeleteLocked) {
                      alert("La eliminación de documentos y carpetas está bloqueada por el Administrador Maestro (PHOBOS).");
                      return;
                    }
                    setFolderToDelete(folder);
                  }} 
                  className={`p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${isDocumentDeleteLocked ? 'text-gray-400 cursor-not-allowed opacity-50' : 'text-light-text-secondary hover:text-red-500'}`}
                  title={isDocumentDeleteLocked ? "Eliminación bloqueada por Administrador PHOBOS" : `Eliminar ${folder.name}`}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
           )}
        </div>
        {canManageFolders && addingToParentId === folder.id && (
           <form onSubmit={(e) => handleAddNewFolder(e, folder.id)} className="my-1" style={{ paddingLeft: `${(level + 1) * 1.5}rem` }}>
               <input type="text" autoFocus value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onBlur={() => { if(!newFolderName) setAddingToParentId(null); }} placeholder="Nombre de sub-carpeta..." className="w-full p-1.5 text-sm border-brand-accent bg-light-bg dark:bg-dark-bg rounded-md focus:ring-1 focus:ring-brand-accent" />
           </form>
        )}
        {isExpanded && hasChildren && <div>{folder.children!.map(child => <FolderTreeItem key={child.id} folder={child} level={level + 1} />)}</div>}
      </div>
    );
  };

  const FolderTreeItemExt: React.FC<{ folder: Folder, level: number }> = ({ folder, level }) => {
    const isExpanded = expandedFoldersExt.has(folder.id);
    const hasChildren = folder.children && folder.children.length > 0;
    return (
      <div key={folder.id}>
        <div className="group flex items-center justify-between rounded-md min-w-0" style={{ paddingLeft: `${level * 1.5}rem` }}>
           <button
             type="button"
             onClick={(e) => handleFolderSelectExt(e, folder.id, hasChildren)}
             className={`flex-1 min-w-0 text-left flex items-center p-2 rounded-md text-sm font-medium transition-colors ${selectedFolderIdExt === folder.id && !searchQueryExt ? 'bg-purple-500/20 text-purple-400' : 'hover:bg-light-bg dark:hover:bg-dark-bg'}`}
           >
            {hasChildren && <ChevronRightIcon className={`h-4 w-4 mr-1 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />}
            <FolderIcon className={`h-5 w-5 mr-2 flex-shrink-0 ${hasChildren ? '' : 'ml-[20px]'}`} />
            <span className="truncate flex-1">{folder.name}</span>
           </button>
           {canManageFolders && (
            <div className="flex items-center flex-shrink-0">
              <button type="button" onClick={() => setAddingToParentIdExt(folder.id)} className="p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-light-text-secondary hover:text-purple-400" title="Añadir sub-carpeta externa"><PlusIcon className="h-4 w-4" /></button>
              {folder.name !== 'General' && (
                <button 
                  type="button" 
                  onClick={() => {
                    if (isDocumentDeleteLocked) {
                      alert("La eliminación de documentos y carpetas está bloqueada por el Administrador Maestro (PHOBOS).");
                      return;
                    }
                    setFolderToDeleteExt(folder);
                  }} 
                  className={`p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${isDocumentDeleteLocked ? 'text-gray-400 cursor-not-allowed opacity-50' : 'text-light-text-secondary hover:text-red-500'}`}
                  title={isDocumentDeleteLocked ? "Eliminación bloqueada por Administrador PHOBOS" : `Eliminar ${folder.name}`}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
           )}
        </div>
        {canManageFolders && addingToParentIdExt === folder.id && (
           <form onSubmit={(e) => handleAddNewFolderExt(e, folder.id)} className="my-1" style={{ paddingLeft: `${(level + 1) * 1.5}rem` }}>
               <input type="text" autoFocus value={newFolderNameExt} onChange={(e) => setNewFolderNameExt(e.target.value)} onBlur={() => { if(!newFolderNameExt) setAddingToParentIdExt(null); }} placeholder="Nombre sub-carpeta ext..." className="w-full p-1.5 text-sm border-purple-500 bg-light-bg dark:bg-dark-bg rounded-md focus:ring-1 focus:ring-purple-500" />
           </form>
        )}
        {isExpanded && hasChildren && <div>{folder.children!.map(child => <FolderTreeItemExt key={child.id} folder={child} level={level + 1} />)}</div>}
      </div>
    );
  };

  const currentFolderName = folders.find(f => f.id === selectedFolderId)?.name || 'Carpeta';
  const isSearching = searchQuery.trim() !== '';
  const documentsToShow = isSearching ? searchResults : filteredDocuments;
  const currentFolderNameExt = externalFolders.find(f => f.id === selectedFolderIdExt)?.name || 'Seleccione Carpeta';
  const documentsToShowExt = searchQueryExt.trim() !== '' ? searchResultsExt : filteredDocumentsExt;

  return (
    <div className="space-y-12">
      {/* ---------------- SECTION 1: REPOSITORIO LOCAL ---------------- */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 border-b border-light-border dark:border-dark-border pb-4">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2"><ServerIcon className="h-6 w-6 text-brand-primary" />REPOSITORIO LOCAL</h1>
                <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1 text-sm">Documentos sincronizados con tu base de datos principal.</p>
            </div>
            <div className="relative w-full sm:w-72">
                <input type="search" placeholder="Buscar localmente..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full p-2 pl-10 border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card rounded-lg focus:ring-2 focus:ring-brand-primary focus:outline-none" />
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
        </div>
        <div className="flex flex-col md:flex-row gap-6">
            <aside className="w-full md:w-64 flex-shrink-0">
                <div className="p-4 bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border h-full flex flex-col min-h-[400px]">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="font-semibold text-brand-primary">Estructura Interna</h2>
                        {canManageFolders && <button type="button" onClick={() => setIsAddingRoot(true)} className="p-1 rounded-full text-light-text-secondary hover:text-brand-primary" title="Añadir carpeta principal"><PlusIcon className="h-5 w-5" /></button>}
                    </div>
                    <nav className="space-y-1 flex-grow overflow-y-auto max-h-[500px]">{isLoading ? <div className="flex justify-center items-center h-full"><Spinner /></div> : folderTree.map(folder => <FolderTreeItem key={folder.id} folder={folder} level={0} />)}
                    {canManageFolders && isAddingRoot && <form onSubmit={(e) => handleAddNewFolder(e, null)} className="mt-2"><input type="text" autoFocus value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onBlur={() => { if(!newFolderName) setIsAddingRoot(false); }} placeholder="Nueva carpeta principal..." className="w-full p-2 text-sm border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md focus:ring-brand-accent" /></form>}</nav>
                </div>
            </aside>
            <main className="flex-1 min-w-0">
                <div className="p-4 bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border min-h-[500px]">
                    {canUpload && <form onSubmit={handleAddDocumentSubmit} className="p-4 bg-light-bg dark:bg-dark-bg/50 rounded-lg border border-light-border dark:border-dark-border mb-4 space-y-4">
                        <h3 className="text-lg font-semibold">Subir Nuevo Documento</h3>
                        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center text-sm" role="alert"><InformationCircleIcon className="h-5 w-5 mr-3 flex-shrink-0" /><span>{error}</span><button type="button" onClick={() => setError(null)} className="ml-auto text-lg font-bold">&times;</button></div>}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label htmlFor="project-select" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Asociar a Proyecto (Opcional)</label><select id="project-select" value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-brand-accent"><option value="">General (Sin Proyecto)</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                            <div><label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Carpeta de Destino</label><p className="w-full px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card/50 dark:bg-dark-card/50 truncate" title={currentFolderName}>{currentFolderName}</p></div>
                        </div>
                        <div>
                            <label htmlFor="file-upload-input" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Archivo(s)</label>
                            <input id="file-upload-input" type="file" multiple onChange={handleFileChange} className="w-full text-sm text-light-text-secondary dark:text-dark-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-accent/20 file:text-brand-primary hover:file:bg-brand-accent/30" />
                            
                            {selectedFiles.length > 0 && (
                                <div className="mt-3 p-3 bg-light-bg/50 dark:bg-dark-bg/50 rounded-lg border border-light-border dark:border-dark-border space-y-2 shadow-inner">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">Cola de Sincronización ({selectedFiles.length}/15)</p>
                                        {isUploading && (
                                            <span className="text-[10px] font-mono text-brand-primary animate-pulse italic">PROCESANDO...</span>
                                        )}
                                    </div>
                                    <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                                        {selectedFiles.map((file, idx) => {
                                            const isDone = isUploading && uploadProgress && idx < uploadProgress.current - 1;
                                            const isInProgress = isUploading && uploadProgress && idx === uploadProgress.current - 1;
                                            return (
                                                <div key={idx} className={`flex items-center justify-between p-2 rounded bg-light-card dark:bg-dark-card border transition-all ${isInProgress ? 'border-brand-primary animate-pulse' : 'border-light-border/50 dark:border-dark-border/50'}`}>
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <DocumentTextIcon className={`h-4 w-4 ${isDone ? 'text-green-500' : 'text-brand-primary'}`} />
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-[11px] truncate font-medium">{file.name}</span>
                                                            <span className="text-[9px] opacity-70">{formatBytes(file.size)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center">
                                                        {!isUploading ? (
                                                            <button type="button" onClick={() => removeFile(idx)} className="p-1 rounded-full text-red-500 hover:bg-red-500/10 transition-colors"><TrashIcon className="h-3.5 w-3.5" /></button>
                                                        ) : (
                                                            <>
                                                                {isDone && <CheckCircleIcon className="h-4 w-4 text-green-500" />}
                                                                {isInProgress && <Spinner className="h-3.5 w-3.5" />}
                                                                {!isDone && !isInProgress && <div className="w-4 h-4 rounded-full border border-gray-400 opacity-30"></div>}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {isUploading && uploadProgress && (
                                        <div className="mt-2 text-[9px] font-mono text-center text-brand-primary opacity-80 uppercase tracking-tight">
                                            Progreso Total: {Math.round(((uploadProgress.current - 0.5) / uploadProgress.total) * 100)}%
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end">
                            <button type="submit" disabled={isUploading || selectedFiles.length === 0 || !selectedFolderId} className="flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary disabled:bg-brand-primary/50">
                                {isUploading ? (
                                    <><Spinner /> <span className="ml-2">Subiendo {uploadProgress?.current} de {uploadProgress?.total}...</span></>
                                ) : (
                                    <><UploadIcon className="h-5 w-5 mr-2" /> Subir {selectedFiles.length > 1 ? `${selectedFiles.length} Documentos` : 'Documento'}</>
                                )}
                            </button>
                        </div>
                    </form>}
                    <h2 className="text-xl font-bold mb-3">{isSearching ? `Resultados para "${searchQuery}"` : `Archivos en "${currentFolderName}"`}</h2>
                    {documentsToShow.length > 0 ? <ul className="divide-y divide-light-border dark:divide-dark-border">{documentsToShow.map(doc => (
                        <li key={doc.id} className="py-3 flex items-center justify-between">
                            <div className="flex items-center min-w-0"><DocumentTextIcon className="h-6 w-6 text-light-text-secondary dark:text-dark-text-secondary flex-shrink-0" /><div className="ml-3 min-w-0"><p className="text-sm font-medium truncate">{doc.name}</p><p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">{formatBytes(doc.size)} - {new Date(doc.createdAt).toLocaleDateString()}{isSearching && ` - en: ${folderNameMap.get(doc.folderId) || '?'}`}</p></div></div>
                            <div className="flex items-center space-x-1 flex-shrink-0">
                                <button type="button" onClick={(e) => handleAction(e, doc, 'preview')} disabled={!!loadingAction} className="p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:text-blue-500" title="Previsualizar">{loadingAction === `${doc.id}-preview` ? <Spinner /> : <EyeIcon className="h-5 w-5" />}</button>
                                {canDownload && <button type="button" onClick={(e) => handleAction(e, doc, 'download')} disabled={!!loadingAction} className="p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-green-100 dark:hover:bg-green-900/50 hover:text-green-500" title="Descargar">{loadingAction === `${doc.id}-download` ? <Spinner /> : <DocumentDownloadIcon className="h-5 w-5" />}</button>}
                                {canUpload && <button type="button" onClick={() => setDocToMove({ doc, isExternal: false })} className="p-2 rounded-full text-light-text-secondary hover:bg-brand-accent/20 hover:text-brand-primary" title="Mover a otra carpeta"><ArrowRightIcon className="h-5 w-5" /></button>}
                                {canDelete && (
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            if (isDocumentDeleteLocked) {
                                                alert("La eliminación de documentos y carpetas está bloqueada por el Administrador Maestro (PHOBOS).");
                                                return;
                                            }
                                            setDocToDelete(doc);
                                        }} 
                                        disabled={!!loadingAction} 
                                        className={`p-2 rounded-full transition-colors ${
                                            isDocumentDeleteLocked 
                                            ? 'text-gray-400 cursor-not-allowed opacity-50' 
                                            : 'text-light-text-secondary hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-500'
                                        }`} 
                                        title={isDocumentDeleteLocked ? "Eliminación bloqueada por Administrador PHOBOS" : `Eliminar ${doc.name}`}
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}</ul> : <div className="text-center py-10 border-2 border-dashed border-light-border dark:border-dark-border rounded-lg"><CollectionIcon className="mx-auto h-12 w-12 text-gray-400" /><h3 className="mt-2 text-sm font-medium">{isSearching ? 'No se encontraron resultados' : 'Carpeta Vacía'}</h3><p className="mt-1 text-sm text-light-text-secondary dark:text-dark-text-secondary">{isSearching ? 'Intenta con otra búsqueda.' : 'Sube un archivo para verlo aquí.'}</p></div>}
                </div>
            </main>
        </div>
      </div>
      <hr className="border-light-border dark:border-dark-border" />
      {/* ---------------- SECTION 2: REPOSITORIO EXTERNO ---------------- */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 border-b border-purple-500/30 pb-4">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-700 dark:text-gray-300"><GlobeAltIcon className="h-6 w-6 text-purple-500" />REPOSITORIO EXTERNO</h1>
                <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1 text-sm">Archivos alojados en la segunda base de datos (Lectura/Escritura).</p>
            </div>
            <div className="relative w-full sm:w-72">
                <input type="search" placeholder="Buscar en externo..." value={searchQueryExt} onChange={e => setSearchQueryExt(e.target.value)} className="w-full p-2 pl-10 border border-purple-500/30 bg-light-card dark:bg-dark-card rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none" />
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
        </div>
        <div className="flex flex-col md:flex-row gap-6 opacity-90">
            <aside className="w-full md:w-64 flex-shrink-0">
                <div className="p-4 bg-light-card dark:bg-dark-card rounded-lg border border-purple-500/20 h-full flex flex-col min-h-[400px]">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="font-semibold text-purple-500">Estructura Externa</h2>
                        {canManageFolders && <button type="button" onClick={() => setIsAddingRootExt(true)} className="p-1 rounded-full text-light-text-secondary hover:text-purple-500" title="Añadir carpeta externa principal"><PlusIcon className="h-5 w-5" /></button>}
                    </div>
                    <nav className="space-y-1 flex-grow overflow-y-auto max-h-[500px]">{externalFolders.length === 0 ? <p className="text-center text-xs text-gray-500 py-4">No se encontraron carpetas o no hay conexión.</p> : folderTreeExt.map(folder => <FolderTreeItemExt key={folder.id} folder={folder} level={0} />)}
                    {canManageFolders && isAddingRootExt && <form onSubmit={(e) => handleAddNewFolderExt(e, null)} className="mt-2"><input type="text" autoFocus value={newFolderNameExt} onChange={(e) => setNewFolderNameExt(e.target.value)} onBlur={() => { if(!newFolderNameExt) setIsAddingRootExt(false); }} placeholder="Nueva carpeta externa..." className="w-full p-2 text-sm border-purple-500/50 bg-light-bg dark:bg-dark-bg rounded-md focus:ring-purple-500" /></form>}</nav>
                </div>
            </aside>
            <main className="flex-1 min-w-0">
                <div className="p-4 bg-light-card dark:bg-dark-card rounded-lg border border-purple-500/20 min-h-[500px]">
                    {canUpload && <form onSubmit={handleAddDocumentSubmitExt} className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20 mb-4 space-y-4">
                        <h3 className="text-lg font-semibold text-purple-400">Subir a Repositorio Externo</h3>
                        {errorExt && <div className="bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center text-sm" role="alert"><InformationCircleIcon className="h-5 w-5 mr-3 flex-shrink-0" /><span>{errorExt}</span><button type="button" onClick={() => setErrorExt(null)} className="ml-auto text-lg font-bold">&times;</button></div>}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Carpeta de Destino (Ext)</label><p className="w-full px-3 py-2 rounded-lg border border-purple-500/30 bg-light-card/50 dark:bg-dark-card/50 truncate text-purple-300" title={currentFolderNameExt}>{currentFolderNameExt}</p></div>
                            <div>
                                <label htmlFor="file-upload-input-ext" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Archivo(s)</label>
                                <input id="file-upload-input-ext" type="file" multiple onChange={handleFileChangeExt} className="w-full text-sm text-light-text-secondary dark:text-dark-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-500/20 file:text-purple-400 hover:file:bg-purple-500/30" />
                            </div>
                        </div>
                        {selectedFilesExt.length > 0 && (
                            <div className="mt-3 p-3 bg-purple-500/5 rounded-lg border border-purple-500/20 space-y-2 shadow-inner">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Cola Externa ({selectedFilesExt.length}/15)</p>
                                    {isUploadingExt && (
                                        <span className="text-[10px] font-mono text-purple-400 animate-pulse italic">SUBIENDO...</span>
                                    )}
                                </div>
                                <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                                    {selectedFilesExt.map((file, idx) => {
                                        const isDone = isUploadingExt && uploadProgressExt && idx < uploadProgressExt.current - 1;
                                        const isInProgress = isUploadingExt && uploadProgressExt && idx === uploadProgressExt.current - 1;
                                        return (
                                            <div key={idx} className={`flex items-center justify-between p-2 rounded bg-light-card/40 dark:bg-dark-card/40 border transition-all ${isInProgress ? 'border-purple-400 animate-pulse' : 'border-purple-500/10'}`}>
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <DocumentTextIcon className={`h-4 w-4 ${isDone ? 'text-green-500' : 'text-purple-400'}`} />
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[11px] truncate font-medium">{file.name}</span>
                                                        <span className="text-[9px] opacity-70">{formatBytes(file.size)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    {!isUploadingExt ? (
                                                        <button type="button" onClick={() => removeFileExt(idx)} className="p-1 rounded-full text-red-500 hover:bg-red-500/10 transition-colors"><TrashIcon className="h-3.5 w-3.5" /></button>
                                                    ) : (
                                                        <>
                                                            {isDone && <CheckCircleIcon className="h-4 w-4 text-green-500" />}
                                                            {isInProgress && <Spinner className="h-3.5 w-3.5" />}
                                                            {!isDone && !isInProgress && <div className="w-4 h-4 rounded-full border border-purple-500/20 opacity-30"></div>}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {isUploadingExt && uploadProgressExt && (
                                    <div className="mt-2 text-[9px] font-mono text-center text-purple-400 opacity-80 uppercase tracking-tight">
                                        Progreso Total: {Math.round(((uploadProgressExt.current - 0.5) / uploadProgressExt.total) * 100)}%
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="flex justify-end">
                            <button type="submit" disabled={isUploadingExt || selectedFilesExt.length === 0 || !selectedFolderIdExt} className="flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50">
                                {isUploadingExt ? (
                                    <><Spinner /> <span className="ml-2">Subiendo {uploadProgressExt?.current} de {uploadProgressExt?.total}...</span></>
                                ) : (
                                    <><UploadIcon className="h-5 w-5 mr-2" /> Subir a Externo {selectedFilesExt.length > 1 ? `(${selectedFilesExt.length})` : ''}</>
                                )}
                            </button>
                        </div>
                    </form>}
                    <h2 className="text-xl font-bold mb-3 text-gray-700 dark:text-gray-300">{searchQueryExt.trim() !== '' ? `Resultados (Externo): "${searchQueryExt}"` : `Archivos en "${currentFolderNameExt}"`}</h2>
                    {documentsToShowExt.length > 0 ? <ul className="divide-y divide-purple-500/20">{documentsToShowExt.map(doc => (
                        <li key={doc.id} className="py-3 flex items-center justify-between">
                            <div className="flex items-center min-w-0">
                                <DocumentTextIcon className="h-6 w-6 text-purple-400 flex-shrink-0" />
                                <div className="ml-3 min-w-0">
                                    <p className="text-sm font-medium truncate text-gray-700 dark:text-gray-300">{doc.name}</p>
                                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">{formatBytes(doc.size)} - {new Date(doc.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-1 flex-shrink-0">
                                <button type="button" onClick={(e) => handleActionExt(e, doc, 'preview')} disabled={!!loadingAction} className="p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:text-purple-500" title="Previsualizar Externo">{loadingAction === `${doc.id}-preview-ext` ? <Spinner /> : <EyeIcon className="h-5 w-5" />}</button>
                                {canDownload && <button type="button" onClick={(e) => handleActionExt(e, doc, 'download')} disabled={!!loadingAction} className="p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-green-100 dark:hover:bg-green-900/50 hover:text-green-500" title="Descargar Externo">{loadingAction === `${doc.id}-download-ext` ? <Spinner /> : <DocumentDownloadIcon className="h-5 w-5" />}</button>}
                                {canUpload && <button type="button" onClick={() => setDocToMove({ doc, isExternal: true })} className="p-2 rounded-full text-light-text-secondary hover:bg-purple-500/20 hover:text-purple-400" title="Mover a otra carpeta externa"><ArrowRightIcon className="h-5 w-5" /></button>}
                                {canDelete && (
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            if (isDocumentDeleteLocked) {
                                                alert("La eliminación de documentos y carpetas está bloqueada por el Administrador Maestro (PHOBOS).");
                                                return;
                                            }
                                            setDocToDeleteExt(doc);
                                        }} 
                                        disabled={!!loadingAction} 
                                        className={`p-2 rounded-full transition-colors ${
                                            isDocumentDeleteLocked 
                                            ? 'text-gray-400 cursor-not-allowed opacity-50' 
                                            : 'text-light-text-secondary hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-500'
                                        }`} 
                                        title={isDocumentDeleteLocked ? "Eliminación bloqueada por Administrador PHOBOS" : `Eliminar ${doc.name}`}
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}</ul> : <div className="text-center py-10 border-2 border-dashed border-purple-500/30 rounded-lg"><CollectionIcon className="mx-auto h-12 w-12 text-gray-400" /><h3 className="mt-2 text-sm font-medium">Sin documentos</h3><p className="mt-1 text-sm text-light-text-secondary dark:text-dark-text-secondary">{externalFolders.length === 0 ? "Conectando..." : "Esta carpeta está vacía."}</p></div>}
                </div>
            </main>
        </div>
      </div>
      <ConfirmationModal isOpen={!!docToDelete} onClose={() => setDocToDelete(null)} onConfirm={handleDeleteDocument} title="Eliminar Documento" message={`¿Estás seguro de que quieres eliminar "${docToDelete?.name}"? Esta acción es permanente.`} />
      <ConfirmationModal isOpen={!!folderToDelete} onClose={() => setFolderToDelete(null)} onConfirm={handleDeleteFolder} title="Eliminar Carpeta y su Contenido" message={`¿Estás seguro de que quieres eliminar la carpeta "${folderToDelete?.name}"? Todos los documentos y sub-carpetas que contiene serán eliminados de forma permanente. Esta acción no se puede deshacer.`} />
      <ConfirmationModal isOpen={!!docToDeleteExt} onClose={() => setDocToDeleteExt(null)} onConfirm={handleDeleteDocumentExt} title="Eliminar Documento Externo" message={`¿Estás seguro de que quieres eliminar "${docToDeleteExt?.name}" del repositorio externo? Esta acción es permanente.`} />
      <ConfirmationModal isOpen={!!folderToDeleteExt} onClose={() => setFolderToDeleteExt(null)} onConfirm={handleDeleteFolderExt} title="Eliminar Carpeta Externa" message={`¿Estás seguro de que quieres eliminar la carpeta externa "${folderToDeleteExt?.name}"? Se perderán todos sus documentos.`} />
      
      {/* ---------------- MODAL MOVER DOCUMENTO ---------------- */}
      <ConfirmationModal 
        isOpen={!!docToMove} 
        onClose={() => { setDocToMove(null); setMovingToFolderId(''); }} 
        onConfirm={handleMoveDocument} 
        confirmText="Confirmar Movimiento"
        variant="primary"
        title="Mover Documento" 
        message={
            <div className="space-y-4">
                <p>Selecciona la carpeta de destino para el documento <span className="font-bold">"{docToMove?.doc.name}"</span>:</p>
                <div className="max-h-60 overflow-y-auto border border-light-border dark:border-dark-border rounded-lg p-2 bg-light-bg dark:bg-dark-bg">
                    {(docToMove?.isExternal ? externalFolders : folders).map(f => (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => setMovingToFolderId(f.id)}
                            className={`w-full text-left p-2 rounded flex items-center gap-2 hover:bg-light-card dark:hover:bg-dark-card transition-colors ${movingToFolderId === f.id ? 'bg-brand-accent/20 text-brand-primary border border-brand-accent/50' : ''}`}
                        >
                            <FolderIcon className="h-4 w-4" />
                            <span className="text-sm">{f.name}</span>
                        </button>
                    ))}
                </div>
                {!movingToFolderId && <p className="text-xs text-red-500 italic">* Debes seleccionar una carpeta de destino.</p>}
            </div>
        } 
      />

      {viewerFile && <FileViewerModal document={viewerFile} user={user} onClose={() => setViewerFile(null)} />}
    </div>
  );
};

export default DocumentsView;
