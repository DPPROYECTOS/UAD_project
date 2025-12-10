
import React, { useState, useEffect, useMemo } from 'react';
import { 
    ServerIcon, 
    DatabaseIcon, 
    FolderIcon, 
    DocumentTextIcon, 
    SearchIcon, 
    ArrowLeftIcon, 
    GlobeAltIcon, 
    CheckCircleIcon, 
    XCircleIcon, 
    InformationCircleIcon, 
    RefreshIcon,
    TerminalIcon
} from '../components/Icons';
import { Document as AppDocument, PublishedProcedure, Folder } from '../types';
import { 
    getLocalPublishedProcedures, 
    getExternalPublishedProcedures, 
    publishLocalProcedure, 
    publishExternalProcedure, 
    unpublishLocalProcedure, 
    unpublishExternalProcedure,
    // Folder publishing imports
    getLocalPublishedFolders,
    getExternalPublishedFolders,
    publishLocalFolder,
    publishExternalFolder,
    unpublishLocalFolder,
    unpublishExternalFolder,
    getDepartments // Import the new function
} from '../services/supabaseService';

interface NexusViewProps {
    documents: AppDocument[];
    externalDocuments: AppDocument[];
    folders: Folder[];
    externalFolders: Folder[];
}

// REMOVED: const AREAS = [...] - Now fetching dynamically

// --- STYLES & ASSETS ---
const SCANLINE_BG = `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 20h40' stroke='%23ffffff' stroke-opacity='0.03' fill='none'/%3E%3C/svg%3E")`;

const NexusView: React.FC<NexusViewProps> = ({ documents, externalDocuments, folders, externalFolders }) => {
    // --- STATE MANAGEMENT ---
    
    // Core Data
    const [activeDb, setActiveDb] = useState<'local' | 'external'>('local');
    const [currentPath, setCurrentPath] = useState<Folder[]>([]); // Navigation Stack
    const [selectedItem, setSelectedItem] = useState<AppDocument | null>(null);
    
    // Async Data
    const [publishedList, setPublishedList] = useState<PublishedProcedure[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Dynamic Areas Data
    const [areas, setAreas] = useState<string[]>([]);
    const [isLoadingAreas, setIsLoadingAreas] = useState(true);

    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [publishForm, setPublishForm] = useState({ code: '', area: '', version: '1.0' });
    const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);

    // Computed Properties based on Active DB
    const currentThemeColor = activeDb === 'local' ? 'cyan' : 'fuchsia';
    
    const activeDocs = activeDb === 'local' ? documents : externalDocuments;
    const activeFolders = activeDb === 'local' ? folders : externalFolders;

    // --- DATA LOADING ---
    const refreshData = async () => {
        setIsLoading(true);
        try {
            // Fetch both to have ready, but we display based on activeDb
            const [localPubs, extPubs] = await Promise.all([
                getLocalPublishedProcedures(),
                getExternalPublishedProcedures()
            ]);
            // Merge or select based on active view. Ideally we keep them separate but for this view logic:
            if (activeDb === 'local') setPublishedList(localPubs);
            else setPublishedList(extPubs);
        } catch (err) {
            console.error("Nexus Sync Error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refreshData();
    }, [activeDb]);

    // Fetch Departments (Areas) on mount
    useEffect(() => {
        const loadAreas = async () => {
            setIsLoadingAreas(true);
            try {
                const depNames = await getDepartments();
                setAreas(depNames);
                // Set default if form area is empty
                if (depNames.length > 0 && !publishForm.area) {
                    setPublishForm(prev => ({...prev, area: depNames[0]}));
                }
            } catch (error) {
                console.error("Failed to load departments:", error);
            } finally {
                setIsLoadingAreas(false);
            }
        };
        loadAreas();
    }, []);

    // --- NAVIGATION LOGIC ---
    const currentFolderId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : null;

    // Initialize to 'General' folder if at root and it exists
    useEffect(() => {
        if (currentPath.length === 0 && activeFolders.length > 0) {
            const general = activeFolders.find(f => f.name === 'General');
            if (general) setCurrentPath([general]);
        }
    }, [activeFolders, activeDb]);

    const handleNavigate = (folder: Folder) => {
        setCurrentPath([...currentPath, folder]);
        setSelectedItem(null); // Deselect on nav
        setSearchTerm('');
    };

    const handleNavigateUp = () => {
        if (currentPath.length > 0) {
            setCurrentPath(currentPath.slice(0, -1));
            setSelectedItem(null);
        }
    };

    const handleBreadcrumbClick = (index: number) => {
        setCurrentPath(currentPath.slice(0, index + 1));
        setSelectedItem(null);
    };

    // --- FILTERING ---
    const displayedItems = useMemo(() => {
        let docs = activeDocs;
        let subFolders = activeFolders;

        if (searchTerm.trim()) {
            // Search Mode: Flatten structure, show matching files
            return {
                folders: [],
                files: docs.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()))
            };
        } else {
            // Navigation Mode
            if (currentFolderId) {
                docs = docs.filter(d => d.folderId === currentFolderId);
                subFolders = subFolders.filter(f => f.parentId === currentFolderId);
            } else {
                // Root view (if not auto-navigated to General)
                docs = docs.filter(d => !d.folderId);
                subFolders = subFolders.filter(f => !f.parentId);
            }
            return { folders: subFolders, files: docs };
        }
    }, [activeDocs, activeFolders, currentFolderId, searchTerm]);

    // --- SELECTION & INSPECTOR ---
    const handleSelectItem = (doc: AppDocument) => {
        setSelectedItem(doc);
        const publishedInfo = publishedList.find(p => p.uad_origin_id === doc.id);
        
        if (publishedInfo) {
            setPublishForm({
                code: publishedInfo.code,
                area: publishedInfo.area,
                version: publishedInfo.version
            });
        } else {
            // Reset for new publication
            // Use first available area if list is loaded
            setPublishForm({
                code: '',
                area: areas.length > 0 ? areas[0] : '',
                version: '1.0'
            });
        }
        setStatusMessage(null);
    };

    // --- ACTIONS ---
    const handlePublish = async () => {
        if (!selectedItem) return;
        setIsProcessing(true);
        setStatusMessage({ text: 'ESTABLECIENDO ENLACE...', type: 'info' });

        try {
            const payload = {
                title: selectedItem.name,
                code: publishForm.code,
                area: publishForm.area,
                version: publishForm.version,
                status: 'Vigente',
                origin_id: selectedItem.id,
                storage_path: selectedItem.storagePath,
                folder_id: selectedItem.folderId // Pass folder ID for flat aggregation
            };

            if (activeDb === 'local') {
                await publishLocalProcedure(payload);
            } else {
                await publishExternalProcedure(payload);
            }

            await refreshData();
            setStatusMessage({ text: 'ENLACE ESTABLECIDO EXITOSAMENTE', type: 'success' });
        } catch (err) {
            setStatusMessage({ text: 'FALLÓ LA TRANSMISIÓN', type: 'error' });
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUnpublish = async () => {
        if (!selectedItem) return;
        const pubRecord = publishedList.find(p => p.uad_origin_id === selectedItem.id);
        if (!pubRecord) return;

        setIsProcessing(true);
        setStatusMessage({ text: 'TERMINANDO CONEXIÓN...', type: 'info' });

        try {
            if (activeDb === 'local') {
                await unpublishLocalProcedure(pubRecord.id);
            } else {
                await unpublishExternalProcedure(pubRecord.id);
            }
            await refreshData();
            setStatusMessage({ text: 'OBJETIVO ELIMINADO DE NEXUS', type: 'success' });
            // Reset form
            setPublishForm({ code: '', area: areas.length > 0 ? areas[0] : '', version: '1.0' });
        } catch (err) {
            setStatusMessage({ text: 'FALLÓ LA TERMINACIÓN', type: 'error' });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] bg-[#050b14] text-slate-300 font-sans overflow-hidden rounded-xl border border-slate-800 shadow-2xl relative">
            {/* --- GLOBAL SCANLINES OVERLAY --- */}
            <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundImage: SCANLINE_BG }}></div>
            
            {/* --- HEADER: CONTROL DECK --- */}
            <header className="relative z-10 flex items-center justify-between p-4 bg-slate-900/80 backdrop-blur-md border-b border-slate-700">
                <div className="flex items-center gap-4">
                    <div className={`p-2 rounded border border-${currentThemeColor}-500/30 bg-${currentThemeColor}-500/10`}>
                        <GlobeAltIcon className={`h-6 w-6 text-${currentThemeColor}-400`} />
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold tracking-wider text-white uppercase flex items-center gap-2">
                            NEXUS <span className={`text-${currentThemeColor}-400`}>//</span> ENLACE
                        </h1>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Interfaz de Puente de Datos Seguro</p>
                    </div>
                </div>

                {/* DB SWITCHER */}
                <div className="flex items-center bg-black/50 rounded-full p-1 border border-slate-700">
                    <button
                        onClick={() => setActiveDb('local')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-widest transition-all duration-300 uppercase ${
                            activeDb === 'local' 
                            ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.5)]' 
                            : 'text-slate-500 hover:text-cyan-400'
                        }`}
                    >
                        BD_LOCAL
                    </button>
                    <button
                        onClick={() => setActiveDb('external')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-widest transition-all duration-300 uppercase ${
                            activeDb === 'external' 
                            ? 'bg-fuchsia-500 text-black shadow-[0_0_15px_rgba(217,70,239,0.5)]' 
                            : 'text-slate-500 hover:text-fuchsia-400'
                        }`}
                    >
                        BD_REMOTA
                    </button>
                </div>

                {/* SEARCH */}
                <div className="relative group">
                    <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="ESCANEAR DATOS..."
                        className={`bg-slate-900 border border-slate-700 text-${currentThemeColor}-400 text-xs font-bold uppercase py-2 pl-9 pr-4 rounded w-48 focus:w-64 transition-all focus:outline-none focus:border-${currentThemeColor}-500 focus:shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
                    />
                    <SearchIcon className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-600 group-focus-within:text-white transition-colors" />
                </div>
            </header>

            {/* --- MAIN CONTENT SPLIT --- */}
            <div className="flex flex-1 relative z-10 overflow-hidden">
                
                {/* --- LEFT PANE: DATA EXPLORER --- */}
                <section className="flex-1 flex flex-col border-r border-slate-800 bg-slate-900/30">
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-2 p-3 text-xs font-bold uppercase border-b border-slate-800/50 bg-black/20 text-slate-400 overflow-x-auto">
                        <span 
                            onClick={() => setCurrentPath([])} 
                            className="cursor-pointer hover:text-white flex items-center gap-1"
                        >
                            <ServerIcon className="h-3 w-3" /> RAÍZ
                        </span>
                        {currentPath.map((folder, idx) => (
                            <React.Fragment key={folder.id}>
                                <span className="text-slate-600">/</span>
                                <span 
                                    onClick={() => handleBreadcrumbClick(idx)}
                                    className={`cursor-pointer hover:text-white whitespace-nowrap ${idx === currentPath.length - 1 ? `text-${currentThemeColor}-400 font-extrabold` : ''}`}
                                >
                                    {folder.name.toUpperCase()}
                                </span>
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Grid */}
                    <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                        {searchTerm ? (
                            <div className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-wide"> Resultados de Búsqueda :: {displayedItems.files.length} encontrados</div>
                        ) : null}

                        {/* Back Button (if not root and not search) */}
                        {currentPath.length > 0 && !searchTerm && (
                            <div 
                                onClick={handleNavigateUp}
                                className="inline-flex items-center gap-2 px-4 py-3 mb-4 rounded border border-slate-700 bg-slate-800/50 hover:bg-slate-700/50 cursor-pointer transition-colors text-slate-300 text-xs font-bold uppercase"
                            >
                                <ArrowLeftIcon className="h-4 w-4" />
                                ../VOLVER
                            </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {/* Folders */}
                            {displayedItems.folders.map(folder => (
                                <div 
                                    key={folder.id}
                                    onClick={() => handleNavigate(folder)}
                                    className={`
                                        group relative p-4 rounded bg-slate-800/40 border border-slate-700/50 
                                        hover:border-${currentThemeColor}-500/50 hover:bg-${currentThemeColor}-500/10 hover:shadow-[0_0_15px_rgba(0,0,0,0.3)]
                                        cursor-pointer transition-all duration-200 flex flex-col items-center gap-3
                                    `}
                                >
                                    <FolderIcon className={`h-8 w-8 text-slate-500 group-hover:text-${currentThemeColor}-400 transition-colors`} />
                                    <span className="text-xs font-bold text-slate-300 uppercase truncate w-full text-center tracking-wide">{folder.name}</span>
                                    <div className={`absolute top-0 right-0 w-2 h-2 border-t border-r border-${currentThemeColor}-500 opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                                    <div className={`absolute bottom-0 left-0 w-2 h-2 border-b border-l border-${currentThemeColor}-500 opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                                </div>
                            ))}

                            {/* Files */}
                            {displayedItems.files.map(doc => {
                                const isPublished = publishedList.some(p => p.uad_origin_id === doc.id);
                                const isSelected = selectedItem?.id === doc.id;
                                
                                return (
                                    <div 
                                        key={doc.id}
                                        onClick={() => handleSelectItem(doc)}
                                        className={`
                                            group relative p-3 rounded border transition-all duration-200 cursor-pointer
                                            flex flex-col justify-between h-28
                                            ${isSelected 
                                                ? `bg-${currentThemeColor}-500/10 border-${currentThemeColor}-500 shadow-[0_0_10px_rgba(0,0,0,0.5)]` 
                                                : 'bg-slate-900/40 border-slate-800 hover:border-slate-600 hover:bg-slate-800'
                                            }
                                        `}
                                    >
                                        <div className="flex justify-between items-start">
                                            <DocumentTextIcon className={`h-6 w-6 ${isSelected ? `text-${currentThemeColor}-400` : 'text-slate-600'}`} />
                                            {isPublished && (
                                                <div className="flex h-2 w-2">
                                                    <span className={`animate-ping absolute inline-flex h-2 w-2 rounded-full bg-${currentThemeColor}-400 opacity-75`}></span>
                                                    <span className={`relative inline-flex rounded-full h-2 w-2 bg-${currentThemeColor}-500`}></span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-2">
                                            <span className={`block text-[10px] font-bold uppercase leading-tight line-clamp-2 ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                                                {doc.name}
                                            </span>
                                        </div>
                                        <div className="text-[9px] text-slate-600 font-bold uppercase mt-1 text-right">
                                            {(doc.size / 1024).toFixed(1)} KB
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {displayedItems.folders.length === 0 && displayedItems.files.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-48 text-slate-600 opacity-50">
                                <TerminalIcon className="h-8 w-8 mb-2" />
                                <span className="font-bold text-xs uppercase tracking-widest">Sector Vacío</span>
                            </div>
                        )}
                    </div>
                </section>

                {/* --- RIGHT PANE: INSPECTOR MODULE --- */}
                <aside className="w-96 bg-[#080f1e] border-l border-slate-800 flex flex-col shadow-2xl relative z-20">
                    <div className={`h-1 w-full bg-gradient-to-r from-transparent via-${currentThemeColor}-500 to-transparent opacity-50`}></div>
                    
                    {selectedItem ? (
                        <div className="flex-1 flex flex-col p-6 animate-fade-in">
                            {/* File Header */}
                            <div className="flex items-start gap-4 mb-6">
                                <div className={`p-3 rounded bg-${currentThemeColor}-900/20 border border-${currentThemeColor}-500/30`}>
                                    <DocumentTextIcon className={`h-8 w-8 text-${currentThemeColor}-400`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-sm font-extrabold text-white uppercase break-words leading-tight tracking-wide">
                                        {selectedItem.name}
                                    </h2>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">ID: {selectedItem.id.split('-')[0]}...</p>
                                </div>
                            </div>

                            {/* Status Display */}
                            {(() => {
                                const isPublished = publishedList.find(p => p.uad_origin_id === selectedItem.id);
                                return (
                                    <div className={`
                                        mb-6 p-4 rounded-lg border-2 border-dashed
                                        ${isPublished ? `border-${currentThemeColor}-500/50 bg-${currentThemeColor}-500/5` : 'border-slate-700 bg-slate-900/50'}
                                    `}>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado de Conexión</span>
                                            {isPublished ? (
                                                <span className={`text-xs font-extrabold text-${currentThemeColor}-400 uppercase flex items-center gap-1`}>
                                                    ● ACTIVO
                                                </span>
                                            ) : (
                                                <span className="text-xs font-extrabold text-slate-500 uppercase">○ INACTIVO</span>
                                            )}
                                        </div>
                                        {isPublished && (
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-[10px] font-bold uppercase border-b border-slate-700/50 pb-1">
                                                    <span className="text-slate-500">CÓDIGO:</span>
                                                    <span className="text-white">{isPublished.code || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between text-[10px] font-bold uppercase border-b border-slate-700/50 pb-1">
                                                    <span className="text-slate-500">ÁREA:</span>
                                                    <span className="text-white truncate max-w-[150px]">{isPublished.area}</span>
                                                </div>
                                                <div className="flex justify-between text-[10px] font-bold uppercase">
                                                    <span className="text-slate-500">VER:</span>
                                                    <span className="text-white">{isPublished.version}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Form Controls */}
                            <div className="space-y-4 mb-8 flex-1">
                                <label className="block">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wide">Área Designada</span>
                                        {isLoadingAreas && <span className="text-[9px] text-${currentThemeColor}-400 animate-pulse">SINC...</span>}
                                    </div>
                                    <select 
                                        className="w-full bg-[#050b14] border border-slate-700 rounded text-slate-300 text-xs p-2 font-bold uppercase focus:border-white focus:outline-none disabled:opacity-50"
                                        value={publishForm.area}
                                        onChange={e => setPublishForm({...publishForm, area: e.target.value})}
                                        disabled={isLoadingAreas || areas.length === 0}
                                    >
                                        {areas.length === 0 && !isLoadingAreas && <option value="">Sin Áreas Disponibles</option>}
                                        {areas.map(area => <option key={area} value={area}>{area}</option>)}
                                    </select>
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className="block">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase mb-1 block tracking-wide">Código Doc</span>
                                        <input 
                                            type="text" 
                                            className="w-full bg-[#050b14] border border-slate-700 rounded text-slate-300 text-xs p-2 font-bold uppercase focus:border-white focus:outline-none"
                                            placeholder="AUTO"
                                            value={publishForm.code}
                                            onChange={e => setPublishForm({...publishForm, code: e.target.value})}
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase mb-1 block tracking-wide">Versión</span>
                                        <input 
                                            type="text" 
                                            className="w-full bg-[#050b14] border border-slate-700 rounded text-slate-300 text-xs p-2 font-bold uppercase focus:border-white focus:outline-none"
                                            value={publishForm.version}
                                            onChange={e => setPublishForm({...publishForm, version: e.target.value})}
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Status Toast */}
                            {statusMessage && (
                                <div className={`mb-4 p-3 text-center text-xs font-bold uppercase rounded border ${
                                    statusMessage.type === 'success' ? 'bg-green-900/30 border-green-500 text-green-400' :
                                    statusMessage.type === 'error' ? 'bg-red-900/30 border-red-500 text-red-400' :
                                    'bg-blue-900/30 border-blue-500 text-blue-400'
                                }`}>
                                    {statusMessage.text}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="mt-auto">
                                {publishedList.some(p => p.uad_origin_id === selectedItem.id) ? (
                                    <button 
                                        onClick={handleUnpublish}
                                        disabled={isProcessing}
                                        className="w-full py-4 bg-red-900/20 border border-red-600 text-red-500 font-extrabold tracking-widest hover:bg-red-900/40 hover:text-red-400 transition-all uppercase flex items-center justify-center gap-2 group"
                                    >
                                        {isProcessing ? <RefreshIcon className="h-4 w-4 animate-spin"/> : <XCircleIcon className="h-5 w-5 group-hover:scale-110 transition-transform"/>}
                                        TERMINAR ENLACE
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handlePublish}
                                        disabled={isProcessing || !publishForm.area}
                                        className={`w-full py-4 bg-${currentThemeColor}-600 hover:bg-${currentThemeColor}-500 text-white font-extrabold tracking-widest transition-all uppercase flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(var(--${currentThemeColor}-rgb),0.4)] disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {isProcessing ? <RefreshIcon className="h-4 w-4 animate-spin"/> : <GlobeAltIcon className="h-5 w-5 animate-pulse"/>}
                                        INICIAR ENLACE
                                    </button>
                                )}
                            </div>

                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-8 text-center opacity-50">
                            <div className="mb-4 relative">
                                <div className="absolute inset-0 bg-slate-500 blur-xl opacity-20 rounded-full"></div>
                                <InformationCircleIcon className="h-16 w-16 relative z-10" />
                            </div>
                            <h3 className="font-bold text-sm uppercase mb-2 tracking-widest">ESPERANDO ENTRADA</h3>
                            <p className="text-xs font-bold uppercase max-w-[200px]">Seleccione un nodo de datos de la cuadrícula para configurar parámetros de enlace.</p>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
};

export default NexusView;
