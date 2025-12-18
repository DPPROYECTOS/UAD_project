
import React, { useState, useEffect, useMemo } from 'react';
import { 
    ServerIcon, 
    FolderIcon, 
    DocumentTextIcon, 
    SearchIcon, 
    ArrowLeftIcon, 
    GlobeAltIcon, 
    XCircleIcon, 
    InformationCircleIcon, 
    RefreshIcon,
    TerminalIcon,
    CogIcon // Added for folder settings
} from '../components/Icons';
import { Document as AppDocument, PublishedProcedure, Folder, PublishedFolder } from '../types';
import { 
    getLocalPublishedProcedures, 
    getExternalPublishedProcedures, 
    publishLocalProcedure, 
    publishExternalProcedure, 
    unpublishLocalProcedure, 
    unpublishExternalProcedure,
    getLocalPublishedFolders,
    getExternalPublishedFolders,
    publishLocalFolder,
    publishExternalFolder,
    unpublishLocalFolder,
    unpublishExternalFolder,
    getDepartments
} from '../services/supabaseService';

interface NexusViewProps {
    documents: AppDocument[];
    externalDocuments: AppDocument[];
    folders: Folder[];
    externalFolders: Folder[];
}

// --- STYLES & ASSETS ---
const SCANLINE_BG = `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 20h40' stroke='%23ffffff' stroke-opacity='0.03' fill='none'/%3E%3C/svg%3E")`;

const NexusView: React.FC<NexusViewProps> = ({ documents, externalDocuments, folders, externalFolders }) => {
    // --- STATE MANAGEMENT ---
    
    // Core Data
    const [activeDb, setActiveDb] = useState<'local' | 'external'>('local');
    const [currentPath, setCurrentPath] = useState<Folder[]>([]); // Navigation Stack
    const [selectedItem, setSelectedItem] = useState<AppDocument | null>(null);
    const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null); // NEW: Folder Selection
    
    // Async Data
    const [publishedList, setPublishedList] = useState<PublishedProcedure[]>([]);
    const [publishedFoldersList, setPublishedFoldersList] = useState<PublishedFolder[]>([]); // NEW: Published Folders
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Dynamic Areas Data
    const [areas, setAreas] = useState<string[]>([]);
    const [isLoadingAreas, setIsLoadingAreas] = useState(true);

    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [publishForm, setPublishForm] = useState({ code: '', area: '', version: '1.0', status: 'Vigente' });
    const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);

    // Computed Properties based on Active DB
    const currentThemeColor = activeDb === 'local' ? 'cyan' : 'fuchsia';
    
    const activeDocs = activeDb === 'local' ? documents : externalDocuments;
    const activeFolders = activeDb === 'local' ? folders : externalFolders;

    // --- DATA LOADING ---
    const refreshData = async () => {
        setIsLoading(true);
        try {
            const [localPubs, extPubs, localFolders, extFolders] = await Promise.all([
                getLocalPublishedProcedures(),
                getExternalPublishedProcedures(),
                getLocalPublishedFolders(),
                getExternalPublishedFolders()
            ]);
            
            if (activeDb === 'local') {
                setPublishedList(localPubs);
                setPublishedFoldersList(localFolders);
            } else {
                setPublishedList(extPubs);
                setPublishedFoldersList(extFolders);
            }
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
        setSelectedItem(null); 
        setSelectedFolder(null);
        setSearchTerm('');
    };

    const handleNavigateUp = () => {
        if (currentPath.length > 0) {
            setCurrentPath(currentPath.slice(0, -1));
            setSelectedItem(null);
            setSelectedFolder(null);
        }
    };

    const handleBreadcrumbClick = (index: number) => {
        setCurrentPath(currentPath.slice(0, index + 1));
        setSelectedItem(null);
        setSelectedFolder(null);
    };

    // --- FILTERING ---
    const displayedItems = useMemo(() => {
        let docs = activeDocs;
        let subFolders = activeFolders;

        if (searchTerm.trim()) {
            return {
                folders: [],
                files: docs.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()))
            };
        } else {
            if (currentFolderId) {
                docs = docs.filter(d => d.folderId === currentFolderId);
                subFolders = subFolders.filter(f => f.parentId === currentFolderId);
            } else {
                docs = docs.filter(d => !d.folderId);
                subFolders = subFolders.filter(f => !f.parentId);
            }
            return { folders: subFolders, files: docs };
        }
    }, [activeDocs, activeFolders, currentFolderId, searchTerm]);

    // --- SELECTION & INSPECTOR ---
    const handleSelectItem = (doc: AppDocument) => {
        setSelectedItem(doc);
        setSelectedFolder(null); // Deselect folder
        
        const publishedInfo = publishedList.find(p => p.uad_origin_id === doc.id);
        
        if (publishedInfo) {
            setPublishForm({
                code: publishedInfo.code,
                area: publishedInfo.area,
                version: publishedInfo.version,
                status: publishedInfo.status || 'Vigente'
            });
        } else {
            setPublishForm({
                code: '',
                area: areas.length > 0 ? areas[0] : '',
                version: '1.0',
                status: 'Vigente'
            });
        }
        setStatusMessage(null);
    };

    const handleSelectFolder = (e: React.MouseEvent, folder: Folder) => {
        e.stopPropagation();
        setSelectedFolder(folder);
        setSelectedItem(null); // Deselect file

        const publishedInfo = publishedFoldersList.find(p => p.origin_folder_id === folder.id);
        
        if (publishedInfo) {
            setPublishForm(prev => ({
                ...prev,
                area: publishedInfo.area,
                // Code, Version, Status not applicable to folders typically, but we keep state clean
            }));
        } else {
             setPublishForm(prev => ({
                ...prev,
                area: areas.length > 0 ? areas[0] : '',
            }));
        }
        setStatusMessage(null);
    };

    // --- ACTIONS ---
    const handlePublish = async () => {
        setIsProcessing(true);
        
        try {
            if (selectedItem) {
                // Publish Document
                setStatusMessage({ text: 'ENLAZANDO DOCUMENTO...', type: 'info' });
                const payload = {
                    title: selectedItem.name,
                    code: publishForm.code,
                    area: publishForm.area,
                    version: publishForm.version,
                    status: publishForm.status,
                    origin_id: selectedItem.id,
                    storage_path: selectedItem.storagePath,
                    folder_id: selectedItem.folderId
                };

                if (activeDb === 'local') await publishLocalProcedure(payload);
                else await publishExternalProcedure(payload);

            } else if (selectedFolder) {
                // Publish Folder
                setStatusMessage({ text: 'ENLAZANDO CARPETA...', type: 'info' });
                if (activeDb === 'local') await publishLocalFolder(selectedFolder.id, selectedFolder.name, publishForm.area);
                else await publishExternalFolder(selectedFolder.id, selectedFolder.name, publishForm.area);
            }

            await refreshData();
            setStatusMessage({ text: 'ENLACE ESTABLECIDO', type: 'success' });
        } catch (err) {
            setStatusMessage({ text: 'FALLÓ LA TRANSMISIÓN', type: 'error' });
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUnpublish = async () => {
        setIsProcessing(true);
        setStatusMessage({ text: 'TERMINANDO CONEXIÓN...', type: 'info' });

        try {
            if (selectedItem) {
                const pubRecord = publishedList.find(p => p.uad_origin_id === selectedItem.id);
                if (pubRecord) {
                    if (activeDb === 'local') await unpublishLocalProcedure(pubRecord.id);
                    else await unpublishExternalProcedure(pubRecord.id);
                }
            } else if (selectedFolder) {
                // Unpublish Folder logic (using origin_folder_id usually matches, service handles ID lookup or passed ID)
                // The service unpublishLocalFolder takes 'folderId' which corresponds to 'origin_folder_id' in DB query
                if (activeDb === 'local') await unpublishLocalFolder(selectedFolder.id);
                else await unpublishExternalFolder(selectedFolder.id);
            }

            await refreshData();
            setStatusMessage({ text: 'OBJETIVO DESVINCULADO', type: 'success' });
            // Reset form
            setPublishForm(prev => ({ ...prev, code: '', version: '1.0', status: 'Vigente' }));
        } catch (err) {
            setStatusMessage({ text: 'FALLÓ LA TERMINACIÓN', type: 'error' });
        } finally {
            setIsProcessing(false);
        }
    };

    const isFolderPublished = selectedFolder ? publishedFoldersList.some(p => p.origin_folder_id === selectedFolder.id) : false;
    const isFilePublished = selectedItem ? publishedList.some(p => p.uad_origin_id === selectedItem.id) : false;
    const isCurrentPublished = selectedFolder ? isFolderPublished : isFilePublished;

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

                        {/* Back Button */}
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
                            {displayedItems.folders.map(folder => {
                                const isPublished = publishedFoldersList.some(p => p.origin_folder_id === folder.id);
                                const isSelected = selectedFolder?.id === folder.id;

                                return (
                                <div 
                                    key={folder.id}
                                    onClick={() => handleNavigate(folder)}
                                    className={`
                                        group relative p-4 rounded bg-slate-800/40 border 
                                        ${isSelected ? `border-${currentThemeColor}-500 bg-${currentThemeColor}-900/20` : 'border-slate-700/50'}
                                        hover:border-${currentThemeColor}-500/50 hover:bg-${currentThemeColor}-500/10 hover:shadow-[0_0_15px_rgba(0,0,0,0.3)]
                                        cursor-pointer transition-all duration-200 flex flex-col items-center gap-3
                                    `}
                                >
                                    <div className="relative">
                                        <FolderIcon className={`h-8 w-8 ${isSelected ? `text-${currentThemeColor}-400` : 'text-slate-500'} group-hover:text-${currentThemeColor}-400 transition-colors`} />
                                        {isPublished && (
                                            <div className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-${currentThemeColor}-400 opacity-75`}></span>
                                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 bg-${currentThemeColor}-500`}></span>
                                            </div>
                                        )}
                                    </div>
                                    <span className={`text-xs font-bold uppercase truncate w-full text-center tracking-wide ${isSelected ? 'text-white' : 'text-slate-300'}`}>{folder.name}</span>
                                    
                                    <button 
                                        onClick={(e) => handleSelectFolder(e, folder)}
                                        className={`absolute top-2 right-2 p-1 rounded-full hover:bg-black/50 text-slate-500 hover:text-${currentThemeColor}-400 transition-colors z-10`}
                                        title="Configurar Carpeta"
                                    >
                                        <CogIcon className="h-4 w-4" />
                                    </button>

                                    <div className={`absolute bottom-0 left-0 w-2 h-2 border-b border-l border-${currentThemeColor}-500 opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                                </div>
                            )})}

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
                    
                    {selectedItem || selectedFolder ? (
                        <div className="flex-1 flex flex-col p-6 animate-fade-in">
                            {/* Header */}
                            <div className="flex items-start gap-4 mb-6">
                                <div className={`p-3 rounded bg-${currentThemeColor}-900/20 border border-${currentThemeColor}-500/30`}>
                                    {selectedItem ? <DocumentTextIcon className={`h-8 w-8 text-${currentThemeColor}-400`} /> : <FolderIcon className={`h-8 w-8 text-${currentThemeColor}-400`} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-sm font-extrabold text-white uppercase break-words leading-tight tracking-wide">
                                        {selectedItem ? selectedItem.name : selectedFolder?.name}
                                    </h2>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                                        {selectedItem ? `ID: ${selectedItem.id.slice(0, 8)}...` : `TIPO: CONTENEDOR`}
                                    </p>
                                </div>
                            </div>

                            {/* Status Display */}
                            <div className={`
                                mb-6 p-4 rounded-lg border-2 border-dashed
                                ${isCurrentPublished ? `border-${currentThemeColor}-500/50 bg-${currentThemeColor}-500/5` : 'border-slate-700 bg-slate-900/50'}
                            `}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado de Conexión</span>
                                    {isCurrentPublished ? (
                                        <span className={`text-xs font-extrabold text-${currentThemeColor}-400 uppercase flex items-center gap-1`}>
                                            ● ACTIVO
                                        </span>
                                    ) : (
                                        <span className="text-xs font-extrabold text-slate-500 uppercase">○ INACTIVO</span>
                                    )}
                                </div>
                                
                                {selectedItem && isCurrentPublished && (() => {
                                    const publishedInfo = publishedList.find(p => p.uad_origin_id === selectedItem.id);
                                    return publishedInfo && (
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px] font-bold uppercase border-b border-slate-700/50 pb-1"><span className="text-slate-500">CÓDIGO:</span><span className="text-white">{publishedInfo.code || 'N/A'}</span></div>
                                            <div className="flex justify-between text-[10px] font-bold uppercase border-b border-slate-700/50 pb-1"><span className="text-slate-500">ÁREA:</span><span className="text-white truncate max-w-[150px]">{publishedInfo.area}</span></div>
                                            <div className="flex justify-between text-[10px] font-bold uppercase border-b border-slate-700/50 pb-1"><span className="text-slate-500">VER:</span><span className="text-white">{publishedInfo.version}</span></div>
                                            <div className="flex justify-between text-[10px] font-bold uppercase"><span className="text-slate-500">ESTADO:</span><span className={`text-${publishedInfo.status === 'Caduco' ? 'red-500' : 'white'}`}>{publishedInfo.status}</span></div>
                                        </div>
                                    );
                                })()}

                                {selectedFolder && isCurrentPublished && (() => {
                                    const publishedInfo = publishedFoldersList.find(p => p.origin_folder_id === selectedFolder.id);
                                    return publishedInfo && (
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px] font-bold uppercase border-b border-slate-700/50 pb-1"><span className="text-slate-500">TIPO:</span><span className="text-white">CARPETA PUBLICA</span></div>
                                            <div className="flex justify-between text-[10px] font-bold uppercase"><span className="text-slate-500">ÁREA:</span><span className="text-white truncate max-w-[150px]">{publishedInfo.area}</span></div>
                                        </div>
                                    );
                                })()}
                            </div>

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

                                {selectedItem && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <label className="block">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase mb-1 block tracking-wide">Código Doc</span>
                                                <input type="text" className="w-full bg-[#050b14] border border-slate-700 rounded text-slate-300 text-xs p-2 font-bold uppercase focus:border-white focus:outline-none" placeholder="AUTO" value={publishForm.code} onChange={e => setPublishForm({...publishForm, code: e.target.value})} />
                                            </label>
                                            <label className="block">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase mb-1 block tracking-wide">Versión</span>
                                                <input type="text" className="w-full bg-[#050b14] border border-slate-700 rounded text-slate-300 text-xs p-2 font-bold uppercase focus:border-white focus:outline-none" value={publishForm.version} onChange={e => setPublishForm({...publishForm, version: e.target.value})} />
                                            </label>
                                        </div>
                                        <label className="block">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase mb-1 block tracking-wide">Estado Documento</span>
                                            <select className="w-full bg-[#050b14] border border-slate-700 rounded text-slate-300 text-xs p-2 font-bold uppercase focus:border-white focus:outline-none" value={publishForm.status} onChange={e => setPublishForm({...publishForm, status: e.target.value})} >
                                                <option value="Vigente">VIGENTE</option>
                                                <option value="Caduco">CADUCO</option>
                                            </select>
                                        </label>
                                    </>
                                )}
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
                                {isCurrentPublished ? (
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
                            <p className="text-xs font-bold uppercase max-w-[200px]">Seleccione un archivo o use el icono de engranaje en una carpeta para configurar el enlace.</p>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
};

export default NexusView;
