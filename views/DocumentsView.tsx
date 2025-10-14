import React, { useState, useMemo, useEffect } from 'react';
import { Project, Document, Folder } from '../types';
import { FolderIcon, DocumentTextIcon, UploadIcon, TrashIcon, CollectionIcon, InformationCircleIcon, PlusIcon, EyeIcon, DocumentDownloadIcon, SearchIcon } from '../components/Icons';
import Spinner from '../components/Spinner';
import ConfirmationModal from '../components/projects/ConfirmationModal';
import { getSignedUrlForDocument } from '../services/supabaseService';
import FileViewerModal from '../components/FileViewerModal';

interface DocumentsViewProps {
  projects: Project[];
  folders: Folder[];
  documents: Document[];
  isLoading: boolean;
  onAddFolder: (name: string, parentId: string | null) => Promise<Folder>;
  onDeleteFolder: (id: string) => Promise<void>;
  onAddDocument: (file: File, folderId: string, projectId: string | null) => Promise<void>;
  onDeleteDocument: (doc: Document) => Promise<void>;
}

const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
);

// --- Helper to build folder tree ---
const buildFolderTree = (folders: Folder[]): Folder[] => {
    // Return early if there are no folders to process.
    if (!folders || folders.length === 0) {
        return [];
    }

    // A map to hold our tree nodes. We use this for efficient lookup of parents.
    // Each node is a copy of the original folder object with an added 'children' array.
    const folderMap = new Map<string, Folder & { children: Folder[] }>();

    // First pass: Create a node for each folder. This ensures that we can find any parent
    // by its ID, regardless of its position in the original `folders` array.
    folders.forEach(folder => {
        folderMap.set(folder.id, {
            ...folder,
            children: [],
        });
    });

    const rootNodes: (Folder & { children: Folder[] })[] = [];

    // Second pass: Link children to their parents. Iterate over the nodes we've created.
    folderMap.forEach(node => {
        // Check if the node has a parent and if that parent exists in our map.
        if (node.parentId && folderMap.has(node.parentId)) {
            // It's a child node. Find its parent and add this node to the parent's children.
            const parent = folderMap.get(node.parentId)!;
            parent.children.push(node);
        } else {
            // It's a root node (no parentId or an orphaned parentId). Add it to our list of roots.
            rootNodes.push(node);
        }
    });

    // Helper function to sort children recursively by name.
    const sortChildrenRecursively = (node: Folder & { children: Folder[] }) => {
        if (node.children && node.children.length > 0) {
            // Sort the children of the current node alphabetically.
            node.children.sort((a, b) => a.name.localeCompare(b.name));
            // Recursively sort the children of each child.
            node.children.forEach(sortChildrenRecursively);
        }
    };
    
    // Sort the root nodes. We want "General" to always be first, then sort alphabetically.
    rootNodes.sort((a, b) => {
        if (a.name === 'General') return -1; // 'a' comes first
        if (b.name === 'General') return 1;  // 'b' comes first
        return a.name.localeCompare(b.name); // otherwise, sort alphabetically
    });

    // Start the recursive sorting process for all nodes in the tree.
    rootNodes.forEach(sortChildrenRecursively);

    return rootNodes;
};


const DocumentsView: React.FC<DocumentsViewProps> = ({ projects, folders, documents, isLoading, onAddFolder, onDeleteFolder, onAddDocument, onDeleteDocument }) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [addingToParentId, setAddingToParentId] = useState<string | null>(null);

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [viewerFile, setViewerFile] = useState<{ url: string; name: string; mimeType: string; } | null>(null);

  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);
  
  useEffect(() => {
    if (!selectedFolderId && folders.length > 0) {
      const generalFolder = folders.find(f => f.name === 'General');
      const firstFolderId = generalFolder?.id || folders[0]?.id || '';
      setSelectedFolderId(firstFolderId);
      setExpandedFolders(prev => new Set(prev).add(firstFolderId));
    }
  }, [folders, selectedFolderId]);


  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => doc.folderId === selectedFolderId);
  }, [documents, selectedFolderId]);
  
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }
    return documents.filter(doc =>
      doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [documents, searchQuery]);
  
  const folderNameMap = useMemo(() => {
    const map = new Map<string, string>();
    folders.forEach(f => map.set(f.id, f.name));
    return map;
  }, [folders]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleAddDocumentSubmit = async (e: React.FormEvent) => {
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
        await onAddDocument(selectedFile, selectedFolderId, selectedProjectId || null);
        setSelectedFile(null);
        setSelectedProjectId('');
        const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo subir el archivo.');
    } finally {
        setIsUploading(false);
    }
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

  const handleAddNewFolder = async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedName = newFolderName.trim();
      if (!trimmedName) return;

      if (folders.some(f => f.name.toLowerCase() === trimmedName.toLowerCase() && f.parentId === addingToParentId)) {
        setError(`La carpeta "${trimmedName}" ya existe en esta ubicación.`);
        return;
      }

      setError(null);
      setIsAddingFolder(true);

      try {
        const newFolder = await onAddFolder(trimmedName, addingToParentId);
        setNewFolderName('');
        setAddingToParentId(null);
        setSelectedFolderId(newFolder.id);
        if (newFolder.parentId) {
            setExpandedFolders(prev => new Set(prev).add(newFolder.parentId!));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo crear la carpeta.');
      } finally {
        setIsAddingFolder(false);
      }
  };

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;
    try {
        setError(null);
        await onDeleteFolder(folderToDelete.id);
        if (selectedFolderId === folderToDelete.id) {
            const generalFolder = folders.find(f => f.name === 'General');
            setSelectedFolderId(generalFolder?.id || '');
        }
    } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo eliminar la carpeta.');
    } finally {
        setFolderToDelete(null);
    }
  };

  const handleAction = async (doc: Document, action: 'preview' | 'download') => {
      setLoadingAction(`${doc.id}-${action}`);
      setError(null);
      try {
          if (action === 'preview') {
              const signedUrl = await getSignedUrlForDocument(doc.storagePath);
              setViewerFile({
                  url: signedUrl,
                  name: doc.name,
                  mimeType: doc.mimeType,
              });
          } else { // download
              const signedUrl = await getSignedUrlForDocument(doc.storagePath, { download: doc.name });
              const link = document.createElement('a');
              link.href = signedUrl;
              link.setAttribute('download', doc.name);
              document.body.appendChild(link);
              link.click();
              link.parentNode?.removeChild(link);
          }
      } catch (err) {
          setError(err instanceof Error ? err.message : `Falló la acción de ${action}.`);
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

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
        const newSet = new Set(prev);
        if (newSet.has(folderId)) {
            newSet.delete(folderId);
        } else {
            newSet.add(folderId);
        }
        return newSet;
    });
  };

  const handleFolderSelect = (folderId: string, hasChildren: boolean) => {
      setSelectedFolderId(folderId);
      setSearchQuery(''); // Clear search when selecting a folder
      if (hasChildren) {
          toggleFolder(folderId);
      }
  };

  const FolderTreeItem: React.FC<{ folder: Folder, level: number }> = ({ folder, level }) => {
    const isExpanded = expandedFolders.has(folder.id);
    const hasChildren = folder.children && folder.children.length > 0;
    
    return (
      <div>
        <div className="group flex items-center justify-between rounded-md" style={{ paddingLeft: `${level * 1.5}rem` }}>
           <button
             onClick={() => handleFolderSelect(folder.id, hasChildren)}
             className={`w-full text-left flex items-center p-2 rounded-md text-sm font-medium transition-colors ${selectedFolderId === folder.id && !searchQuery ? 'bg-brand-accent/20 text-brand-primary' : 'hover:bg-light-bg dark:hover:bg-dark-bg'}`}
           >
            {hasChildren && (
              <ChevronRightIcon className={`h-4 w-4 mr-1 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            )}
             <FolderIcon className={`h-5 w-5 mr-2 flex-shrink-0 ${hasChildren ? '' : 'ml-[20px]'}`} />
             <span className="truncate flex-1">{folder.name}</span>
           </button>
           <div className="flex items-center">
             <button onClick={() => setAddingToParentId(folder.id)} className="p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-light-text-secondary hover:text-brand-primary" title="Añadir sub-carpeta">
                <PlusIcon className="h-4 w-4" />
             </button>
            {folder.name !== 'General' && (
              <button onClick={() => setFolderToDelete(folder)} className="p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-light-text-secondary hover:text-red-500" title={`Eliminar ${folder.name}`}>
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
           </div>
        </div>
        {addingToParentId === folder.id && (
           <form onSubmit={handleAddNewFolder} className="my-1" style={{ paddingLeft: `${(level + 1) * 1.5}rem` }}>
               <input
                 type="text"
                 autoFocus
                 value={newFolderName}
                 onChange={(e) => setNewFolderName(e.target.value)}
                 onBlur={() => { if(!newFolderName) setAddingToParentId(null); }}
                 placeholder="Nombre de sub-carpeta..."
                 className="w-full p-1.5 text-sm border-brand-accent dark:border-brand-accent bg-light-bg dark:bg-dark-bg rounded-md focus:ring-1 focus:ring-brand-accent"
               />
           </form>
        )}
        {isExpanded && hasChildren && (
            <div>
                {folder.children!.map(child => <FolderTreeItem key={child.id} folder={child} level={level + 1} />)}
            </div>
        )}
      </div>
    );
  };

  const currentFolderName = folders.find(f => f.id === selectedFolderId)?.name || 'Carpeta';
  const isSearching = searchQuery.trim() !== '';
  const documentsToShow = isSearching ? searchResults : filteredDocuments;

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
            <h1 className="text-3xl font-bold">Documentos</h1>
            <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">
            Organiza y gestiona todos tus archivos importantes.
            </p>
        </div>
        <div className="relative w-full sm:w-72">
            <input
                type="search"
                placeholder="Buscar documentos..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full p-2 pl-10 border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card rounded-lg focus:ring-2 focus:ring-brand-primary focus:outline-none"
            />
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Folder Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="p-4 bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border h-full flex flex-col">
            <div className="flex justify-between items-center mb-2">
                <h2 className="font-semibold">Carpetas</h2>
                <button onClick={() => setAddingToParentId(null)} className="p-1 rounded-full text-light-text-secondary hover:text-brand-primary" title="Añadir carpeta principal">
                    <PlusIcon className="h-5 w-5" />
                </button>
            </div>
            <nav className="space-y-1 flex-grow overflow-y-auto">
              {isLoading ? ( <div className="flex justify-center items-center h-full"><Spinner /></div> ) : 
                (
                    folderTree.map(folder => <FolderTreeItem key={folder.id} folder={folder} level={0} />)
                )
              }
               {addingToParentId === null && (
                <form onSubmit={handleAddNewFolder} className="mt-2">
                    <input
                        type="text"
                        autoFocus
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onBlur={() => { if(!newFolderName) setAddingToParentId('dummy'); }} // a non-null dummy value to hide it
                        placeholder="Nueva carpeta principal..."
                        className="w-full p-2 text-sm border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md focus:ring-brand-accent"
                    />
                </form>
               )}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <div className="p-4 bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border">
             <form onSubmit={handleAddDocumentSubmit} className="p-4 bg-light-bg dark:bg-dark-bg/50 rounded-lg border border-light-border dark:border-dark-border mb-4 space-y-4">
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
                        <label htmlFor="project-select" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Asociar a Proyecto (Opcional)</label>
                        <select
                            id="project-select"
                            value={selectedProjectId}
                            onChange={e => setSelectedProjectId(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-brand-accent"
                        >
                            <option value="">General (Sin Proyecto)</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Carpeta de Destino</label>
                        <p className="w-full px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card/50 dark:bg-dark-card/50 truncate" title={currentFolderName}>{currentFolderName}</p>
                    </div>
                </div>
                 <div>
                    <label htmlFor="file-upload-input" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Archivo</label>
                    <input
                        id="file-upload-input"
                        type="file"
                        onChange={handleFileChange}
                        className="w-full text-sm text-light-text-secondary dark:text-dark-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-accent/20 file:text-brand-primary hover:file:bg-brand-accent/30"
                    />
                </div>
                <div className="flex justify-end">
                    <button type="submit" disabled={isUploading || !selectedFile || !selectedFolderId} className="flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary disabled:bg-brand-primary/50">
                        {isUploading ? <><Spinner /> <span className="ml-2">Subiendo...</span></> : <><UploadIcon className="h-5 w-5 mr-2" /> Subir Documento</>}
                    </button>
                </div>
            </form>
            
            <h2 className="text-xl font-bold mb-3">
              {isSearching ? `Resultados para "${searchQuery}"` : `Archivos en "${currentFolderName}"`}
            </h2>
            {documentsToShow.length > 0 ? (
              <ul className="divide-y divide-light-border dark:divide-dark-border">
                {documentsToShow.map(doc => (
                  <li key={doc.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center min-w-0">
                      <DocumentTextIcon className="h-6 w-6 text-light-text-secondary dark:text-dark-text-secondary flex-shrink-0" />
                      <div className="ml-3 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                          {formatBytes(doc.size)} - {new Date(doc.createdAt).toLocaleDateString()}
                          {isSearching && ` - en: ${folderNameMap.get(doc.folderId) || '?'}`}
                        </p>
                      </div>
                    </div>
                     <div className="flex items-center space-x-1 flex-shrink-0">
                        <button onClick={() => handleAction(doc, 'preview')} disabled={!!loadingAction} className="p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:text-blue-500" title="Previsualizar">
                           {loadingAction === `${doc.id}-preview` ? <Spinner /> : <EyeIcon className="h-5 w-5" />}
                        </button>
                        <button onClick={() => handleAction(doc, 'download')} disabled={!!loadingAction} className="p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-green-100 dark:hover:bg-green-900/50 hover:text-green-500" title="Descargar">
                           {loadingAction === `${doc.id}-download` ? <Spinner /> : <DocumentDownloadIcon className="h-5 w-5" />}
                        </button>
                        <button onClick={() => setDocToDelete(doc)} disabled={!!loadingAction} className="p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-500" title={`Eliminar ${doc.name}`}>
                           <TrashIcon className="h-5 w-5" />
                        </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-10 border-2 border-dashed border-light-border dark:border-dark-border rounded-lg">
                <CollectionIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium">{isSearching ? 'No se encontraron resultados' : 'Carpeta Vacía'}</h3>
                <p className="mt-1 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  {isSearching ? 'Intenta con otra búsqueda.' : 'Sube un archivo para verlo aquí.'}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      <ConfirmationModal
        isOpen={!!docToDelete}
        onClose={() => setDocToDelete(null)}
        onConfirm={handleDeleteDocument}
        title="Eliminar Documento"
        message={`¿Estás seguro de que quieres eliminar "${docToDelete?.name}"? Esta acción es permanente.`}
      />
       <ConfirmationModal
        isOpen={!!folderToDelete}
        onClose={() => setFolderToDelete(null)}
        onConfirm={handleDeleteFolder}
        title="Eliminar Carpeta y su Contenido"
        message={`¿Estás seguro de que quieres eliminar la carpeta "${folderToDelete?.name}"? Todos los documentos y sub-carpetas que contiene serán eliminados de forma permanente. Esta acción no se puede deshacer.`}
      />
      {viewerFile && (
          <FileViewerModal
              file={viewerFile}
              onClose={() => setViewerFile(null)}
          />
      )}
    </>
  );
};

export default DocumentsView;