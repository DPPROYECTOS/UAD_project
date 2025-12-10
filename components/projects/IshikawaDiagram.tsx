import React, { useState, useRef, useEffect } from 'react';
import { Project } from '../../types';
import { PlusIcon, XIcon, CheckCircleIcon } from '../Icons';
import { getIshikawaDiagram, saveIshikawaDiagram } from '../../services/supabaseService';
import Spinner from '../Spinner';

interface IshikawaDiagramProps {
  project: Project;
}

type CauseMap = {
  [category: string]: string[];
};

// Standard 6M Categories configuration
const CATEGORIES = [
  // Top Ribs
  { id: 'method', label: 'Métodos', position: 'top', offset: 15 },
  { id: 'machine', label: 'Maquinaria', position: 'top', offset: 40 },
  { id: 'material', label: 'Materiales', position: 'top', offset: 65 },
  // Bottom Ribs
  { id: 'manpower', label: 'Mano de Obra', position: 'bottom', offset: 15 },
  { id: 'measurement', label: 'Medición', position: 'bottom', offset: 40 },
  { id: 'environment', label: 'Medio Ambiente', position: 'bottom', offset: 65 },
];

const IshikawaDiagram: React.FC<IshikawaDiagramProps> = ({ project }) => {
  // Local state for causes
  const [causes, setCauses] = useState<CauseMap>({
    method: [],
    machine: [],
    material: [],
    manpower: [],
    measurement: [],
    environment: [],
  });

  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await getIshikawaDiagram(project.id);
            if (data) {
                setCauses(data.causes);
            } else {
                // Initialize defaults if new
                setCauses({
                    method: ['Proceso no estandarizado'],
                    machine: ['Falta de mantenimiento'],
                    material: [],
                    manpower: ['Falta de capacitación'],
                    measurement: [],
                    environment: [],
                });
            }
        } catch (error) {
            console.error("Error loading diagram:", error);
        } finally {
            setIsLoading(false);
        }
    };
    loadData();
  }, [project.id]);

  const saveChanges = async (newCauses: CauseMap) => {
      setIsSaving(true);
      try {
          await saveIshikawaDiagram(project.id, newCauses);
          setCauses(newCauses);
      } catch (error) {
          console.error("Error saving diagram:", error);
          // Optionally revert state or show toast
      } finally {
          setIsSaving(false);
      }
  };

  const handleAddStart = (categoryId: string) => {
    setAddingTo(categoryId);
    setInputValue('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleAddConfirm = async () => {
    if (addingTo && inputValue.trim()) {
      const newCauses = {
        ...causes,
        [addingTo]: [...(causes[addingTo] || []), inputValue.trim()]
      };
      await saveChanges(newCauses);
      setInputValue('');
      setAddingTo(null); // Close input after adding
    } else {
        setAddingTo(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddConfirm();
    } else if (e.key === 'Escape') {
      setAddingTo(null);
    }
  };

  const handleDeleteCause = async (categoryId: string, index: number) => {
    const newCauses = {
      ...causes,
      [categoryId]: causes[categoryId].filter((_, i) => i !== index)
    };
    await saveChanges(newCauses);
  };

  // Canvas dimensions (Extra Compact Version)
  const WIDTH = 640;
  const HEIGHT = 320;
  const SPINE_Y = HEIGHT / 2;
  const HEAD_X = WIDTH - 20;
  const TAIL_X = 20;

  if (isLoading) {
      return <div className="h-full flex items-center justify-center"><Spinner /></div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 rounded-lg border border-light-border dark:border-dark-border overflow-hidden">
      {/* Header Toolbar */}
      <div className="flex justify-between items-center px-6 py-4 bg-white dark:bg-dark-card border-b border-light-border dark:border-dark-border shrink-0">
        <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Diagrama de Causa y Efecto</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Análisis de las 6M para el proyecto: <span className="font-medium text-brand-primary">{project.name}</span></p>
        </div>
        <div className={`text-xs px-3 py-1 rounded-full border flex items-center gap-1 ${isSaving ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300 border-green-200 dark:border-green-800'}`}>
            {isSaving ? <Spinner size="sm" /> : <CheckCircleIcon className="h-3 w-3"/>}
            {isSaving ? 'Guardando...' : 'Sincronizado'}
        </div>
      </div>

      {/* Diagram Area - Dark Background Forced */}
      <div className="flex-1 overflow-auto p-4 relative cursor-default bg-slate-900 flex items-center justify-center">
        <div className="relative" style={{ width: `${WIDTH}px`, height: `${HEIGHT}px` }}>
            
            {/* SVG Layer for Skeleton */}
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                <defs>
                    <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                        <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
                    </marker>
                </defs>
                
                {/* Main Spine */}
                <line 
                    x1={TAIL_X} y1={SPINE_Y} 
                    x2={HEAD_X} y2={SPINE_Y} 
                    className="text-slate-400"
                    stroke="currentColor" 
                    strokeWidth="3" 
                    markerEnd="url(#arrowhead)"
                />

                {/* Ribs */}
                {CATEGORIES.map((cat) => {
                    const startX = TAIL_X + ((HEAD_X - TAIL_X) * (cat.offset / 100));
                    // Compact Rib logic
                    const spineConnectX = startX;
                    const ribRun = 60; // More compact
                    const ribRise = 90; // More compact
                    
                    const ribStartX = spineConnectX - ribRun;
                    const ribStartY = cat.position === 'top' ? SPINE_Y - ribRise : SPINE_Y + ribRise;

                    return (
                        <line 
                            key={cat.id}
                            x1={ribStartX} y1={ribStartY}
                            x2={spineConnectX} y2={SPINE_Y}
                            className="text-slate-500"
                            stroke="currentColor" 
                            strokeWidth="2"
                        />
                    );
                })}
            </svg>

            {/* HTML Layer for Content */}
            <div className="absolute inset-0 z-10">
                {/* Effect Head */}
                <div 
                    className="absolute flex items-center justify-center p-2 bg-slate-800 border border-slate-600 shadow-lg rounded-lg"
                    style={{ 
                        left: `${HEAD_X + 5}px`, 
                        top: '50%', 
                        transform: 'translate(0, -50%)',
                        width: '140px', 
                        minHeight: '60px'
                    }}
                >
                    <div className="text-center">
                        <span className="block text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">EFECTO</span>
                        <h4 className="font-bold text-xs text-gray-100 leading-tight">{project.name}</h4>
                    </div>
                </div>

                {/* Categories and Causes */}
                {CATEGORIES.map((cat) => {
                    const spineConnectX = TAIL_X + ((HEAD_X - TAIL_X) * (cat.offset / 100));
                    const ribRun = 60;
                    const ribRise = 90;
                    const ribStartX = spineConnectX - ribRun;
                    const ribStartY = cat.position === 'top' ? SPINE_Y - ribRise : SPINE_Y + ribRise;

                    const isTop = cat.position === 'top';

                    return (
                        <div 
                            key={cat.id}
                            className="absolute flex flex-col items-center"
                            style={{
                                left: `${ribStartX}px`,
                                top: `${ribStartY}px`,
                                transform: `translate(-50%, ${isTop ? '-100%' : '0%'})`,
                                width: '130px',
                            }}
                        >
                            {/* Category Box */}
                            <div className={`w-full bg-slate-800 border border-slate-600 shadow-sm rounded-md p-1 mb-1 ${isTop ? 'order-last mt-1' : 'order-first mb-1'}`}>
                                <h5 className="font-bold text-center text-gray-300 uppercase text-[10px]">{cat.label}</h5>
                            </div>

                            {/* Causes List */}
                            <div className={`w-full flex flex-col gap-1 ${isTop ? 'justify-end' : 'justify-start'}`}>
                                {causes[cat.id]?.map((cause, idx) => (
                                    <div key={idx} className="group relative bg-slate-800/80 border border-slate-700 rounded px-2 py-1 text-[9px] shadow-sm hover:border-blue-500 transition-all">
                                        <span className="text-gray-300 leading-tight block">{cause}</span>
                                        <button 
                                            onClick={() => handleDeleteCause(cat.id, idx)}
                                            className="absolute -top-1.5 -right-1.5 bg-red-900 text-red-300 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                        >
                                            <XIcon className="h-2.5 w-2.5" />
                                        </button>
                                        <div className={`absolute left-1/2 w-px h-1.5 bg-slate-600 ${isTop ? '-bottom-1.5' : '-top-1.5'}`}></div>
                                    </div>
                                ))}

                                {/* Add Cause Input */}
                                {addingTo === cat.id ? (
                                    <div className="relative mt-0.5">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            onBlur={handleAddConfirm}
                                            placeholder="Causa..."
                                            className="w-full px-1.5 py-0.5 text-[9px] border border-blue-500 rounded shadow-sm outline-none bg-slate-700 text-white placeholder-slate-400"
                                        />
                                        <button 
                                            onMouseDown={(e) => e.preventDefault()} 
                                            onClick={handleAddConfirm}
                                            className="absolute right-0.5 top-0.5 text-green-400 hover:text-green-300"
                                        >
                                            <CheckCircleIcon className="h-2.5 w-2.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => handleAddStart(cat.id)}
                                        className="self-center mt-0.5 p-0.5 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded-full transition-colors"
                                        title="Añadir causa"
                                    >
                                        <PlusIcon className="h-2.5 w-2.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>
    </div>
  );
};

export default IshikawaDiagram;