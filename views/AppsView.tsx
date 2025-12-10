
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CogIcon, PlusIcon, TrashIcon, RefreshIcon, PowerIcon, CustomLogoIcon, PencilAltIcon, XIcon, SaveIcon } from '../components/Icons';
import { AppModule } from '../types';
import { getAppModules, upsertAppModule, deleteAppModule } from '../services/supabaseService';
import Spinner from '../components/Spinner';

// Use the AppModule type from types.ts but alias it locally as Peripheral to minimize refactoring
type Peripheral = AppModule;

interface CircuitDragState {
    id: string;
    startMouseX: number;
    startMouseY: number;
    initialOffset: number;
    side: 'top' | 'right' | 'bottom' | 'left';
}

const AppsView: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 1200, height: 800 }); 
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    // State for drag and drop (Modules)
    const [draggingModuleId, setDraggingModuleId] = useState<string | null>(null);

    // State for drag and drop (Circuits)
    const [draggingCircuit, setDraggingCircuit] = useState<CircuitDragState | null>(null);
    const [hoveredCircuitId, setHoveredCircuitId] = useState<string | null>(null);

    // State for Module Details Modal
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [currentEditModule, setCurrentEditModule] = useState<Peripheral | null>(null);
    const [editLabel, setEditLabel] = useState('');
    const [editSubLabel, setEditSubLabel] = useState('');
    const [editUrl, setEditUrl] = useState('');

    // Initial State
    const [peripherals, setPeripherals] = useState<Peripheral[]>([]);

    useEffect(() => {
        const fetchModules = async () => {
            try {
                setIsLoading(true);
                const modules = await getAppModules();
                if (modules.length > 0) {
                    setPeripherals(modules);
                } else {
                    // Fallback seed if DB is empty
                    setPeripherals([
                        { id: 'p1', label: 'AUDITORIAS', subLabel: 'APP', x: 20, y: 20, status: 'active', connectionSide: 'bottom', laneOffset: -40 },
                        { id: 'p2', label: 'MEM_BANK', subLabel: 'STORAGE', x: 50, y: 15, status: 'active', connectionSide: 'bottom', laneOffset: 0 },
                        { id: 'p3', label: 'SEC_GATE', subLabel: 'FIREWALL', x: 80, y: 20, status: 'active', connectionSide: 'bottom', laneOffset: 40 },
                        { id: 'p4', label: 'I/O_STREAM', subLabel: 'INTERFACE', x: 85, y: 50, status: 'standby', connectionSide: 'left', laneOffset: 0 },
                        { id: 'p5', label: 'CACHE_L1', subLabel: 'FAST ACCESS', x: 80, y: 80, status: 'active', connectionSide: 'top', laneOffset: 40 },
                        { id: 'p6', label: 'BUS_CTRL', subLabel: 'TRANSPORT', x: 50, y: 85, status: 'active', connectionSide: 'top', laneOffset: 0 },
                        { id: 'p7', label: 'GPU_RENDER', subLabel: 'VISUALS', x: 20, y: 80, status: 'standby', connectionSide: 'top', laneOffset: -40 },
                        { id: 'p8', label: 'NET_LINK', subLabel: 'CONNECTIVITY', x: 15, y: 50, status: 'offline', connectionSide: 'right', laneOffset: 0 },
                    ]);
                }
            } catch (error) {
                console.error("Error fetching modules:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchModules();
    }, []);

    // Robust resize observer
    useEffect(() => {
        if (!containerRef.current) return;

        const updateDimensions = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                // Using clientWidth/Height (padding box) to ensure exact pixel matching
                setDimensions(prev => {
                    if (prev.width === clientWidth && prev.height === clientHeight) return prev;
                    return { width: clientWidth, height: clientHeight };
                });
            }
        };

        updateDimensions();
        const resizeObserver = new ResizeObserver(() => {
            updateDimensions();
        });
        resizeObserver.observe(containerRef.current);

        return () => resizeObserver.disconnect();
    }, []);

    // CONSTANTS
    const CPU_SIZE = 176; 
    const CPU_HALF = CPU_SIZE / 2;
    const MOD_W = 160; 
    const MOD_H = 80;
    const MOD_HALF_W = MOD_W / 2;
    const MOD_HALF_H = MOD_H / 2;

    // --- Logic for Circuit Routing ---
    const getCircuitPath = (p: Peripheral) => {
        const cx = dimensions.width / 2;
        const cy = dimensions.height / 2;

        const pX = Number(p.x) || 0;
        const pY = Number(p.y) || 0;
        
        // Exact visual center of the module
        const mx = (pX / 100) * dimensions.width;
        const my = (pY / 100) * dimensions.height;

        // 1. Determine Relative Position (Quadrant)
        const dx = mx - cx;
        const dy = my - cy;
        
        // Determine primary axis for connection
        let cpuSide: 'top' | 'right' | 'bottom' | 'left';
        if (Math.abs(dx) >= Math.abs(dy)) {
            cpuSide = dx > 0 ? 'right' : 'left';
        } else {
            cpuSide = dy > 0 ? 'bottom' : 'top';
        }

        // Apply lane offset to start point at CPU
        let offset = Number(p.laneOffset) || 0;
        const maxCpuOffset = CPU_HALF - 20; 
        offset = Math.max(-maxCpuOffset, Math.min(maxCpuOffset, offset));

        let sx, sy; // Start X, Start Y
        switch(cpuSide) {
            case 'top':    sx = cx + offset; sy = cy - CPU_HALF; break;
            case 'bottom': sx = cx + offset; sy = cy + CPU_HALF; break;
            case 'left':   sx = cx - CPU_HALF; sy = cy + offset; break;
            case 'right':  sx = cx + CPU_HALF; sy = cy + offset; break;
        }

        // 2. Intelligent Module Side Selection
        // We ignore p.connectionSide and choose the side facing the CPU to avoid wrapping
        let targetSide: 'top' | 'right' | 'bottom' | 'left';
        
        // If module is to the right of CPU, enter from the left side of module
        if (cpuSide === 'right') targetSide = 'left';
        // If module is to the left of CPU, enter from right side of module
        else if (cpuSide === 'left') targetSide = 'right';
        // If module is below CPU, enter from top side
        else if (cpuSide === 'bottom') targetSide = 'top';
        // If module is above CPU, enter from bottom side
        else targetSide = 'bottom';

        // 3. Determine Module Connection Candidates on the Target Side
        const candidates: {x: number, y: number}[] = [];
        const spread = 40; 

        if (targetSide === 'top') {
            const anchorY = my - MOD_HALF_H;
            candidates.push({ x: mx, y: anchorY }); // Center
            candidates.push({ x: mx - spread, y: anchorY }); // Left
            candidates.push({ x: mx + spread, y: anchorY }); // Right
        } else if (targetSide === 'bottom') {
            const anchorY = my + MOD_HALF_H;
            candidates.push({ x: mx, y: anchorY });
            candidates.push({ x: mx - spread, y: anchorY });
            candidates.push({ x: mx + spread, y: anchorY });
        } else if (targetSide === 'left') {
            const anchorX = mx - MOD_HALF_W;
            candidates.push({ x: anchorX, y: my }); // Center
            candidates.push({ x: anchorX, y: my - 20 }); // Top
            candidates.push({ x: anchorX, y: my + 20 }); // Bottom
        } else { // right
            const anchorX = mx + MOD_HALF_W;
            candidates.push({ x: anchorX, y: my });
            candidates.push({ x: anchorX, y: my - 20 });
            candidates.push({ x: anchorX, y: my + 20 });
        }

        // 4. Select Best Candidate
        // We pick the candidate that aligns best with the CPU exit point (minimizing the "jog")
        let bestT = candidates[0];
        let minDiff = Infinity;
        const isCpuVertical = (cpuSide === 'top' || cpuSide === 'bottom');

        candidates.forEach(cand => {
            let diff = 0;
            // If exiting vertically from CPU, we want to match X as much as possible
            if (isCpuVertical) {
                diff = Math.abs(cand.x - sx); 
            } else {
                // If exiting horizontally from CPU, match Y
                diff = Math.abs(cand.y - sy); 
            }

            if (diff < minDiff) {
                minDiff = diff;
                bestT = cand;
            }
        });

        const tx = bestT.x;
        const ty = bestT.y;

        // 5. Generate Orthogonal Path
        let path = `M ${sx} ${sy}`;
        
        const isModVertical = (targetSide === 'top' || targetSide === 'bottom');

        // Logic for "elbow" placement
        if (isCpuVertical && isModVertical) {
            // Both Vertical (e.g. CPU Top -> Module Bottom)
            const midY = (sy + ty) / 2;
            path += ` L ${sx} ${midY} L ${tx} ${midY} L ${tx} ${ty}`;
        } else if (!isCpuVertical && !isModVertical) {
            // Both Horizontal (e.g. CPU Right -> Module Left)
            const midX = (sx + tx) / 2;
            path += ` L ${midX} ${sy} L ${midX} ${ty} L ${tx} ${ty}`;
        } else if (isCpuVertical && !isModVertical) {
            // CPU Vertical, Module Horizontal (L-Shape usually works)
            path += ` L ${sx} ${ty} L ${tx} ${ty}`;
        } else { 
            // CPU Horizontal, Module Vertical (L-Shape)
            path += ` L ${tx} ${sy} L ${tx} ${ty}`;
        }

        return { path, cx: sx, cy: sy, tx, ty };
    };

    // --- Drag & Drop Logic (Modules) ---
    const handleModuleMouseDown = (e: React.MouseEvent, id: string) => {
        if (!isEditing) return;
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) {
            return;
        }
        e.stopPropagation();
        setDraggingModuleId(id);
    };

    const handleModuleClick = (p: Peripheral) => {
        if (!isEditing && p.status !== 'offline' && p.url) {
            window.open(p.url, '_blank');
        }
    };

    // --- Drag Logic (Circuits) ---
    const handleCircuitMouseDown = (e: React.MouseEvent, p: Peripheral) => {
        if (!isEditing) return;
        e.stopPropagation();
        e.preventDefault();
        setDraggingCircuit({
            id: p.id,
            startMouseX: e.clientX,
            startMouseY: e.clientY,
            initialOffset: Number(p.laneOffset) || 0,
            side: p.connectionSide
        });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (draggingModuleId && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            // Calculate percentage based on mouse position relative to container
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            
            // Clamp to keep inside (padding 5%)
            const clampedX = Math.max(5, Math.min(95, x));
            const clampedY = Math.max(5, Math.min(95, y));

            setPeripherals(prev => prev.map(p => 
                p.id === draggingModuleId ? { ...p, x: clampedX, y: clampedY } : p
            ));
        }

        if (draggingCircuit) {
            const { id, startMouseX, startMouseY, initialOffset } = draggingCircuit;
            
            // Calculate delta based on dominant movement axis
            let delta = 0;
            if (Math.abs(e.clientX - startMouseX) > Math.abs(e.clientY - startMouseY)) {
                delta = e.clientX - startMouseX;
            } else {
                delta = e.clientY - startMouseY;
            }

            // Offset limits (relative to CPU edge size)
            const LIMIT = 80;
            const newOffset = Math.max(-LIMIT, Math.min(LIMIT, initialOffset + delta));

            setPeripherals(prev => prev.map(p => 
                p.id === id ? { ...p, laneOffset: newOffset } : p
            ));
        }
    }, [draggingModuleId, draggingCircuit]);

    const handleMouseUp = () => {
        if (draggingModuleId) {
            const module = peripherals.find(p => p.id === draggingModuleId);
            if (module) upsertAppModule(module);
        }
        if (draggingCircuit) {
            const module = peripherals.find(p => p.id === draggingCircuit.id);
            if (module) upsertAppModule(module);
        }

        setDraggingModuleId(null);
        setDraggingCircuit(null);
    };

    useEffect(() => {
        if (draggingModuleId || draggingCircuit) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingModuleId, draggingCircuit, handleMouseMove, peripherals]);

    // --- Edit Actions ---
    const handleAddModule = async () => {
        const newId = uuidv4().split('-')[0];
        const isLeft = Math.random() > 0.5;
        const newModule: Peripheral = {
            id: newId,
            label: `MOD_${newId.toUpperCase()}`,
            subLabel: 'NEW SYSTEM',
            x: isLeft ? 15 : 85,
            y: 50, 
            status: 'active',
            connectionSide: isLeft ? 'right' : 'left',
            laneOffset: 0
        };
        setPeripherals([...peripherals, newModule]);
        await upsertAppModule(newModule);
    };

    const handleDeleteModule = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setPeripherals(prev => prev.filter(p => p.id !== id));
        await deleteAppModule(id);
    };

    const handleToggleStatus = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault();
        
        let updatedModule: Peripheral | null = null;
        setPeripherals(prev => prev.map(p => {
            if (p.id === id) {
                const nextStatus = p.status === 'active' ? 'offline' : 'active';
                updatedModule = { ...p, status: nextStatus };
                return updatedModule;
            }
            return p;
        }));

        if (updatedModule) await upsertAppModule(updatedModule);
    };

    const openEditModal = (e: React.MouseEvent, p: Peripheral) => {
        e.stopPropagation();
        setCurrentEditModule(p);
        setEditLabel(p.label);
        setEditSubLabel(p.subLabel);
        setEditUrl(p.url || '');
        setEditModalOpen(true);
    };

    const saveModuleDetails = async (e: React.FormEvent) => {
        e.preventDefault();
        if (currentEditModule) {
            const updatedModule = { ...currentEditModule, label: editLabel, subLabel: editSubLabel, url: editUrl };
            setPeripherals(prev => prev.map(p => 
                p.id === updatedModule.id ? updatedModule : p
            ));
            await upsertAppModule(updatedModule);
            setEditModalOpen(false);
            setCurrentEditModule(null);
        }
    };

    const PRIMARY_COLOR = '#37feff';

    if (isLoading) {
        return <div className="h-full w-full bg-[#050b14] flex items-center justify-center"><Spinner /></div>;
    }

    return (
        <div ref={containerRef} className="relative min-h-[85vh] w-full bg-[#050b14] overflow-hidden select-none">
            <div 
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            />

            {/* Circuit Connections SVG Layer */}
            <svg 
                className="absolute top-0 left-0 pointer-events-none z-[1]"
                width={dimensions.width}
                height={dimensions.height}
            >
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                {peripherals.map((p) => {
                    const pathData = getCircuitPath(p);
                    if (!pathData) return null;
                    const { path, cx, cy, tx, ty } = pathData;

                    const isHovered = hoveredCircuitId === p.id;
                    const isDragging = draggingCircuit?.id === p.id;
                    const isInteractable = isEditing;

                    let lineColor = '#334155';
                    if (p.status === 'active') lineColor = PRIMARY_COLOR;
                    else if (p.status === 'standby') lineColor = '#64748b';

                    if (isEditing && (isHovered || isDragging)) {
                        lineColor = '#06b6d4'; 
                    }

                    const cursorStyle = !isInteractable ? 'default' : 'move';

                    return (
                        <g key={`circuit-${p.id}`}>
                            {/* Hit Area for ease of selection */}
                            <path 
                                d={path} 
                                stroke="transparent" 
                                strokeWidth="30" 
                                fill="none" 
                                className={`pointer-events-auto`}
                                style={{ cursor: cursorStyle }}
                                onMouseEnter={() => isInteractable && setHoveredCircuitId(p.id)}
                                onMouseLeave={() => isInteractable && setHoveredCircuitId(null)}
                                onMouseDown={(e) => handleCircuitMouseDown(e, p)}
                            />
                            <path d={path} stroke="#1e293b" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                            <path 
                                d={path} 
                                stroke={lineColor} 
                                strokeWidth={isDragging || isHovered ? 3 : 2} 
                                fill="none" 
                                opacity={isDragging || isHovered ? 1 : 0.8} 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                                filter={isDragging || isHovered ? "url(#glow)" : ""}
                            />
                            {/* Dot at Start (CPU) */}
                            <circle cx={cx} cy={cy} r={isDragging || isHovered ? 4 : 3} fill="#1e293b" stroke={lineColor} strokeWidth="2" />
                            {/* Dot at End (Module) */}
                            <circle cx={tx} cy={ty} r={isDragging || isHovered ? 5 : 4} fill="#0f172a" stroke={lineColor} strokeWidth="2" />
                            {p.status === 'active' && !isDragging && (
                                <circle r="3" fill="#ffffff" filter="url(#glow)">
                                    <animateMotion dur={`${2 + Math.random() * 1.5}s`} repeatCount="indefinite" path={path} keyPoints="0;1" keyTimes="0;1" calcMode="linear"/>
                                </circle>
                            )}
                        </g>
                    );
                })}
            </svg>

            {/* Núcleo Central (CPU Box) */}
            <div 
                className="absolute z-20 rounded-lg border-2 shadow-[0_0_30px_rgba(55,254,255,0.2)] flex flex-col items-center justify-center overflow-hidden" 
                style={{ 
                    // Strict positioning
                    left: `${dimensions.width / 2}px`,
                    top: `${dimensions.height / 2}px`,
                    width: `${CPU_SIZE}px`,
                    height: `${CPU_SIZE}px`,
                    transform: 'translate(-50%, -50%)',
                    borderColor: PRIMARY_COLOR,
                }}
            >
                <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'linear-gradient(#37feff 1px, transparent 1px), linear-gradient(90deg, #37feff 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
                <div className="absolute inset-0 blur-3xl opacity-20 animate-pulse pointer-events-none" style={{ backgroundColor: PRIMARY_COLOR }}></div>
                <div className="relative z-10 flex flex-col items-center">
                    <CustomLogoIcon className="w-20 h-20 drop-shadow-[0_0_15px_rgba(55,254,255,0.6)]" style={{ color: PRIMARY_COLOR }} />
                    <div className="mt-2 font-mono text-2xl font-bold tracking-[0.2em] drop-shadow-[0_0_5px_rgba(55,254,255,0.8)]" style={{ color: PRIMARY_COLOR }}>
                        UAD
                    </div>
                </div>
                {/* Decorative corners */}
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: PRIMARY_COLOR }}></div>
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2" style={{ borderColor: PRIMARY_COLOR }}></div>
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2" style={{ borderColor: PRIMARY_COLOR }}></div>
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2" style={{ borderColor: PRIMARY_COLOR }}></div>
            </div>

            {/* Componentes Periféricos */}
            {peripherals.map((p) => {
                // Calculate exact pixel position for DIV to match SVG logic
                const px = (Number(p.x) / 100) * dimensions.width;
                const py = (Number(p.y) / 100) * dimensions.height;

                return (
                <div
                    key={p.id}
                    onMouseDown={(e) => handleModuleMouseDown(e, p.id)}
                    onClick={() => handleModuleClick(p)}
                    className={`
                        absolute z-10 transform -translate-x-1/2 -translate-y-1/2
                        transition-transform duration-100
                        ${isEditing ? 'cursor-grab active:cursor-grabbing z-30' : 
                          p.status === 'active' ? 'cursor-pointer' : 
                          p.status === 'offline' ? 'opacity-40 grayscale pointer-events-none' : 
                          'opacity-60 grayscale cursor-not-allowed'
                        }
                        ${isEditing && draggingModuleId === p.id ? 'scale-110' : ''}
                    `}
                    style={{ 
                        left: `${px}px`, // Use calculated pixels
                        top: `${py}px`,  // Use calculated pixels
                        width: `${MOD_W}px`, 
                        height: `${MOD_H}px`
                    }}
                >
                    {isEditing && (
                        <button
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => handleToggleStatus(e, p.id)}
                            className={`
                                absolute -top-3 -right-3 z-50 
                                w-8 h-8 rounded-full 
                                flex items-center justify-center
                                bg-[#0f172a] border-2 shadow-lg
                                transition-all duration-200 hover:scale-110
                                ${p.status === 'active' ? 'border-green-500 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 
                                  p.status === 'standby' ? 'border-yellow-500 text-yellow-500' : 
                                  'border-red-500 text-red-500'}
                            `}
                            title="Toggle Module Status"
                        >
                            <PowerIcon className="h-4 w-4" />
                        </button>
                    )}

                    {isEditing && (
                        <div 
                            className="absolute -top-12 left-1/2 transform -translate-x-1/2 flex gap-1 z-40 w-auto pointer-events-auto"
                            onMouseDown={(e) => e.stopPropagation()} 
                        >
                            <div className="flex justify-between gap-1 bg-slate-900/95 p-1.5 rounded border border-slate-600 backdrop-blur-sm shadow-xl">
                                    <button onClick={(e) => openEditModal(e, p)} className="bg-green-600/20 text-green-400 p-1.5 rounded border border-green-500/30 hover:bg-green-600/40 transition-colors" title="Editar Info"><PencilAltIcon className="h-3.5 w-3.5"/></button>
                                    <button onClick={(e) => handleDeleteModule(e, p.id)} className="bg-red-600/20 text-red-400 p-1.5 rounded border border-red-500/30 hover:bg-red-600/40 transition-colors" title="Eliminar"><TrashIcon className="h-3.5 w-3.5"/></button>
                            </div>
                        </div>
                    )}

                    <div className={`
                        w-full h-full
                        bg-[#0f172a] 
                        border ${isEditing ? 'border-blue-500 border-dashed' : 'border-slate-700'}
                        rounded-sm shadow-lg 
                        flex flex-col justify-between p-2 
                        group relative overflow-hidden
                        ${!isEditing && p.status === 'active' ? `hover:border-[#37feff] hover:shadow-[0_0_15px_rgba(55,254,255,0.2)]` : ''}
                    `}
                    style={!isEditing && p.status === 'active' ? { borderColor: 'transparent' } : {}}
                    >
                        {!isEditing && p.status === 'active' && (
                            <div className="absolute inset-0 border border-slate-700 group-hover:border-[#37feff] transition-colors pointer-events-none"></div>
                        )}

                        <div className="flex justify-between items-start pl-2">
                            <span className="text-slate-400 font-mono text-[10px] uppercase tracking-widest truncate max-w-[90px]">{p.id.toUpperCase()}</span>
                            <div className="flex gap-0.5">
                                <div className={`w-1 h-1 rounded-full ${p.status === 'active' ? 'bg-green-500 animate-pulse' : p.status === 'standby' ? 'bg-yellow-500' : 'bg-red-900'}`}></div>
                                <div className="w-1 h-1 rounded-full bg-slate-600"></div>
                            </div>
                        </div>

                        <div className="pl-2">
                            <h4 className="text-slate-200 font-bold font-mono text-sm truncate">{p.label}</h4>
                            <p className="text-slate-500 text-[10px] uppercase truncate">{p.subLabel}</p>
                        </div>

                        {!isEditing && p.status === 'active' && (
                            <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 group-hover:animate-shine transition-all"></div>
                        )}
                    </div>
                </div>
                );
            })}

            <div className="absolute bottom-4 left-4 flex items-end gap-2 z-40">
                <button 
                    onClick={() => { setIsEditing(!isEditing); setDraggingModuleId(null); setDraggingCircuit(null); }}
                    className={`
                        flex items-center gap-2 px-4 py-2 
                        font-mono text-xs font-bold tracking-widest uppercase
                        border-2 transition-all duration-300
                        ${isEditing 
                            ? 'bg-[#37feff] text-black border-[#37feff] shadow-[0_0_15px_rgba(55,254,255,0.5)]' 
                            : 'bg-transparent text-[#37feff] border-[#37feff]/30 hover:border-[#37feff] hover:bg-[#37feff]/10'
                        }
                    `}
                >
                    <CogIcon className={`h-4 w-4 ${isEditing ? 'animate-spin' : ''}`} />
                    {isEditing ? 'EXIT EDIT' : 'EDIT SYSTEM'}
                </button>

                {isEditing && (
                    <button 
                        onClick={handleAddModule}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/50 hover:bg-blue-600/40 font-mono text-xs font-bold tracking-widest uppercase transition-all"
                    >
                        <PlusIcon className="h-4 w-4" />
                        ADD MODULE
                    </button>
                )}
            </div>

            {editModalOpen && (
                <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-[#0f172a] border-2 border-[#37feff] p-6 rounded-lg w-80 shadow-[0_0_40px_rgba(55,254,255,0.2)] relative" onClick={e => e.stopPropagation()}>
                        <button 
                            onClick={() => setEditModalOpen(false)}
                            className="absolute top-2 right-2 text-slate-400 hover:text-[#37feff] transition-colors"
                        >
                            <XIcon className="h-5 w-5"/>
                        </button>
                        
                        <h3 className="text-[#37feff] font-mono text-lg mb-4 tracking-widest uppercase border-b border-[#37feff]/30 pb-2">
                            Config Module
                        </h3>
                        
                        <form onSubmit={saveModuleDetails} className="space-y-4">
                            <div>
                                <label className="block text-xs text-slate-400 font-mono mb-1 uppercase">Label</label>
                                <input 
                                    type="text" 
                                    value={editLabel} 
                                    onChange={e => setEditLabel(e.target.value)}
                                    className="w-full bg-black/50 border border-slate-700 text-slate-200 p-2 text-sm font-mono focus:border-[#37feff] outline-none"
                                    maxLength={12}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 font-mono mb-1 uppercase">Description</label>
                                <input 
                                    type="text" 
                                    value={editSubLabel} 
                                    onChange={e => setEditSubLabel(e.target.value)}
                                    className="w-full bg-black/50 border border-slate-700 text-slate-200 p-2 text-sm font-mono focus:border-[#37feff] outline-none"
                                    maxLength={20}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 font-mono mb-1 uppercase">Target URL</label>
                                <input 
                                    type="text" 
                                    value={editUrl} 
                                    onChange={e => setEditUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full bg-black/50 border border-slate-700 text-slate-200 p-2 text-sm font-mono focus:border-[#37feff] outline-none"
                                />
                            </div>
                            
                            <div className="pt-2 flex justify-end">
                                <button 
                                    type="submit"
                                    className="flex items-center gap-2 bg-[#37feff]/20 hover:bg-[#37feff]/40 text-[#37feff] border border-[#37feff] px-4 py-2 rounded font-mono text-xs font-bold uppercase transition-colors"
                                >
                                    <SaveIcon className="h-4 w-4"/> Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes scan {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(100%); }
                }
                @keyframes shine {
                    0% { left: -100%; }
                    100% { left: 200%; }
                }
                .animate-scan { animation: scan 3s linear infinite; }
                .animate-shine { animation: shine 1s ease-in-out; }
            `}</style>
        </div>
    );
};

export default AppsView;
