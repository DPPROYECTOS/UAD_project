import React, { useState, useRef, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { jsPDF } from 'jspdf';
import {
  WhiteboardItem, Note, FlowchartShape, Connector, TextStyle, Point,
  FlowchartShapeType, AnchorPosition, WhiteboardState
} from '../types';
import {
    getWhiteboardsForUser,
    getWhiteboardContent,
    addWhiteboard,
    updateWhiteboard,
    deleteWhiteboard,
} from '../services/supabaseService';
import FlowchartShapeComponent from '../components/whiteboard/FlowchartShape';
import StickyNoteComponent from '../components/whiteboard/StickyNote';
import ExportModal, { ExportOptions } from '../components/whiteboard/ExportModal';
import ConfirmationModal from '../components/projects/ConfirmationModal';
import Spinner from '../components/Spinner';
import {
  DocumentTextIcon, RectangleIcon, OvalIcon, DiamondIcon, LinkIcon,
  BoldIcon, ItalicIcon, TrashIcon, ParallelogramIcon, PredefinedProcessIcon,
  FlowchartDocumentIcon, DatabaseIcon, CircleIcon, DocumentDownloadIcon, SaveIcon, FolderOpenIcon, DocumentAddIcon, XIcon, RefreshIcon,
} from '../components/Icons';

const FONT_FAMILIES: TextStyle['fontFamily'][] = ['Arial', 'Verdana', 'Courier New'];
const FONT_SIZES = ['12px', '14px', '16px', '20px', '24px'];
const NOTE_COLORS = ['bg-yellow-200', 'bg-green-200', 'bg-blue-200', 'bg-pink-200', 'bg-purple-200'];

const defaultTextStyle: TextStyle = {
  fontFamily: 'Arial',
  fontSize: '14px',
  fontWeight: 'normal',
  fontStyle: 'normal',
  color: '#000000',
};

const defaultConnectorTextStyle: TextStyle = {
  ...defaultTextStyle,
  fontSize: '12px',
  color: '#374151',
};

const WhiteboardView: React.FC = () => {
  const [items, setItems] = useState<WhiteboardItem[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingConnectorId, setEditingConnectorId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionPreview, setConnectionPreview] = useState<{
    startItemId: string;
    startAnchor: AnchorPosition;
    endPoint: Point;
  } | null>(null);

  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [guideLines, setGuideLines] = useState<any[]>([]);
  
  // Save/Load State
  const [currentWhiteboard, setCurrentWhiteboard] = useState<{ id: string; name: string } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaveAsModalOpen, setIsSaveAsModalOpen] = useState(false);
  const [newWhiteboardName, setNewWhiteboardName] = useState('');
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [savedWhiteboards, setSavedWhiteboards] = useState<Array<{ id: string; name: string; updated_at: string }>>([]);
  const [boardToDelete, setBoardToDelete] = useState<{ id: string; name: string } | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Export states
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSelectingArea, setIsSelectingArea] = useState(false);
  const [selectionArea, setSelectionArea] = useState<{ x: number; y: number; width: number; height: number; } | null>(null);
  const [selectionStartPoint, setSelectionStartPoint] = useState<Point | null>(null);
  const [exportModalBounds, setExportModalBounds] = useState<{ width: number; height: number; type: 'all' | 'selection' } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const zIndexCounter = useRef(0);

  const selectedItem = items.find(item => item.id === selectedItemId);
  const selectedConnector = connectors.find(c => c.id === selectedConnectorId);

  const maxZIndex = useMemo(() => {
    if (items.length === 0) return 1;
    return Math.max(...items.map(item => item.zIndex)) + 1;
  }, [items]);

  // --- Unsaved changes listener ---
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);


  // --- Toast Effect ---
  useEffect(() => {
    if (toast) {
        const timer = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(timer);
    }
  }, [toast]);


  // --- Zoom and Pan Effects ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        
        const zoomIntensity = 0.1;
        const delta = e.deltaY > 0 ? -1 : 1;
        const newScale = scale * (1 + delta * zoomIntensity);
        const clampedScale = Math.max(0.2, Math.min(4, newScale));

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const worldX = (mouseX - pan.x) / scale;
        const worldY = (mouseY - pan.y) / scale;
        
        const newPanX = mouseX - worldX * clampedScale;
        const newPanY = mouseY - worldY * clampedScale;
        
        setScale(clampedScale);
        setPan({ x: newPanX, y: newPanY });
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 1) return; // Middle mouse button for panning
      e.preventDefault();
      
      canvas.style.cursor = 'grabbing';
      
      const startPan = pan;
      const startX = e.clientX;
      const startY = e.clientY;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        setPan({ x: startPan.x + dx, y: startPan.y + dy });
      };

      const handleMouseUp = () => {
        canvas.style.cursor = isSelectingArea ? 'crosshair' : 'grab';
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
    };
  }, [scale, pan, isSelectingArea]);

  // --- Keyboard Navigation ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedItemId || editingItemId) return;

      const item = items.find(i => i.id === selectedItemId);
      if (!item) return;

      const moveAmount = e.shiftKey ? 10 : 1;
      let dx = 0;
      let dy = 0;

      switch (e.key) {
        case 'ArrowUp': dy = -moveAmount; break;
        case 'ArrowDown': dy = moveAmount; break;
        case 'ArrowLeft': dx = -moveAmount; break;
        case 'ArrowRight': dx = moveAmount; break;
        case 'Delete':
        case 'Backspace':
          deleteSelectedItem();
          return;
        default: return;
      }

      e.preventDefault();
      const newPosition = { x: item.position.x + dx, y: item.position.y + dy };
      updateItemState({ id: selectedItemId, position: newPosition });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemId, editingItemId, items]);
  
  const updateItemState = (itemUpdate: Partial<WhiteboardItem> & { id: string }) => {
    setItems(prev => prev.map(item => item.id === itemUpdate.id ? { ...item, ...itemUpdate } : item));
    setHasUnsavedChanges(true);
  };
  
  const updateConnectorState = (connectorUpdate: Partial<Connector> & { id: string }) => {
      setConnectors(prev => prev.map(c => c.id === connectorUpdate.id ? { ...c, ...connectorUpdate } : c));
      setHasUnsavedChanges(true);
  };

  const addItem = (type: 'note' | FlowchartShapeType) => {
    zIndexCounter.current = items.length > 0 ? Math.max(...items.map(i => i.zIndex)) + 1 : 1;
    const newItemId = uuidv4();
    const isConnector = type === 'connector-circle';
    const rect = canvasRef.current?.getBoundingClientRect();
    const position = {
      x: rect ? (-pan.x + rect.width / 2) / scale - (isConnector ? 20 : 80) : 100,
      y: rect ? (-pan.y + rect.height / 2) / scale - (isConnector ? 20 : 40) : 100
    };


    let newItem: WhiteboardItem;
    if (type === 'note') {
      newItem = {
        id: newItemId, type: 'note', text: 'New Note',
        position, width: 150, height: 100,
        zIndex: zIndexCounter.current,
        color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
        style: defaultTextStyle
      };
    } else {
      newItem = {
        id: newItemId, type, text: isConnector ? '' : 'Shape',
        position, 
        width: isConnector ? 40 : 160, 
        height: isConnector ? 40 : 80,
        zIndex: zIndexCounter.current,
        fillColor: '#ffffff',
        style: defaultTextStyle
      };
    }
    setItems(prev => [...prev, newItem]);
    setHasUnsavedChanges(true);
    setSelectedItemId(newItemId);
    setEditingItemId(isConnector ? null : newItemId);
  };
  
  const deleteSelectedItem = () => {
    if (selectedItemId) {
      setItems(prev => prev.filter(i => i.id !== selectedItemId));
      setConnectors(prev => prev.filter(c => c.from !== selectedItemId && c.to !== selectedItemId));
      setSelectedItemId(null);
      setHasUnsavedChanges(true);
    }
    if (selectedConnectorId) {
      setConnectors(prev => prev.filter(c => c.id !== selectedConnectorId));
      setSelectedConnectorId(null);
      setHasUnsavedChanges(true);
    }
  };
  
  const handleInteractionStart = (id: string) => {
    zIndexCounter.current = items.length > 0 ? Math.max(...items.map(i => i.zIndex)) + 1 : 1;
    updateItemState({ id, zIndex: zIndexCounter.current });
    setSelectedItemId(id);
    setSelectedConnectorId(null);
    setEditingItemId(null);
    setEditingConnectorId(null);
  };

  const handleSetEditing = (id: string | null) => {
    setEditingItemId(id);
    if (id) {
      setSelectedItemId(id);
      setSelectedConnectorId(null);
    }
  };
  
  const handleSetEditingConnector = (id: string | null) => {
    setEditingConnectorId(id);
    if (id) {
        setSelectedConnectorId(id);
        setSelectedItemId(null);
    }
  };
  
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target !== canvasRef.current) return;
    setSelectedItemId(null);
    setSelectedConnectorId(null);
    setEditingItemId(null);
    setEditingConnectorId(null);
    if(isConnecting && !connectionPreview) {
      setIsConnecting(false);
    }
  };

  const updateStyle = (styleProp: Partial<TextStyle>) => {
    const item = selectedItem || selectedConnector;
    if (!item) return;

    if ('type' in item) { // WhiteboardItem
        updateItemState({ id: item.id, style: { ...item.style, ...styleProp } });
    } else { // Connector
        updateConnectorState({ id: item.id, style: { ...item.style, ...styleProp } });
    }
  };
  
  const toggleStyle = (style: 'bold' | 'italic') => {
    const item = selectedItem || selectedConnector;
    if (!item) return;

    const currentStyle = item.style;
    const prop = style === 'bold' ? 'fontWeight' : 'fontStyle';
    const normal = 'normal';
    const active = style;
    const newStyle = { [prop]: currentStyle[prop] === active ? normal : active };
    
    if ('type' in item) { // It's a WhiteboardItem
        updateItemState({ id: item.id, style: { ...item.style, ...newStyle } });
    } else { // It's a Connector
        updateConnectorState({ id: item.id, style: { ...item.style, ...newStyle } });
    }
  };
  
  const getAnchorPointCoordinates = (itemId: string, anchor: AnchorPosition): Point => {
    const item = items.find(i => i.id === itemId);
    if (!item) return { x: 0, y: 0 };

    const { position, width, height, rotation = 0 } = item;
    const cx = position.x + width / 2;
    const cy = position.y + height / 2;

    let relativeX = 0;
    let relativeY = 0;

    switch (anchor) {
      case 'top':    relativeX = 0;          relativeY = -height / 2; break;
      case 'right':  relativeX = width / 2;  relativeY = 0;           break;
      case 'bottom': relativeX = 0;          relativeY = height / 2;  break;
      case 'left':   relativeX = -width / 2; relativeY = 0;           break;
    }

    const rad = rotation * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const rotatedX = relativeX * cos - relativeY * sin;
    const rotatedY = relativeX * sin + relativeY * cos;

    return {
      x: cx + rotatedX,
      y: cy + rotatedY,
    };
  };

  const handleAnchorMouseDown = (startItemId: string, startAnchor: AnchorPosition, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = canvasRef.current!.getBoundingClientRect();
    const screenPoint = { x: e.clientX, y: e.clientY };
    const worldPoint = {
        x: (screenPoint.x - rect.left - pan.x) / scale,
        y: (screenPoint.y - rect.top - pan.y) / scale
    };
    setConnectionPreview({
      startItemId, startAnchor,
      endPoint: worldPoint
    });
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isSelectingArea && selectionStartPoint) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const currentPos = {
          x: (e.clientX - rect.left - pan.x) / scale,
          y: (e.clientY - rect.top - pan.y) / scale,
      };
      const x = Math.min(selectionStartPoint.x, currentPos.x);
      const y = Math.min(selectionStartPoint.y, currentPos.y);
      const width = Math.abs(selectionStartPoint.x - currentPos.x);
      const height = Math.abs(selectionStartPoint.y - currentPos.y);
      setSelectionArea({ x, y, width, height });
      return;
    }
    
    if (!connectionPreview) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPoint = {
      x: (screenPoint.x - pan.x) / scale,
      y: (screenPoint.y - pan.y) / scale,
    };
    setConnectionPreview(prev => prev ? { ...prev, endPoint: worldPoint } : null);
  };

  const handleAnchorMouseUp = (endItemId: string, endAnchor: AnchorPosition, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!connectionPreview || connectionPreview.startItemId === endItemId) {
      setConnectionPreview(null);
      return;
    }
    const newConnector: Connector = {
      id: uuidv4(),
      from: connectionPreview.startItemId,
      to: endItemId,
      fromAnchor: connectionPreview.startAnchor,
      toAnchor: endAnchor,
      text: '',
      style: defaultConnectorTextStyle,
    };
    setConnectors(prev => [...prev, newConnector]);
    setHasUnsavedChanges(true);
    setConnectionPreview(null);
  };

  const handleMouseUp = () => {
    if (isSelectingArea && selectionArea) {
      setIsSelectingArea(false);
      setSelectionStartPoint(null);
      setExportModalBounds({ width: Math.round(selectionArea.width), height: Math.round(selectionArea.height), type: 'selection' });
      setIsExportModalOpen(true);
    }
    setConnectionPreview(null);
  };
  
  const handleSelectionMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !isSelectingArea) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const startPos = {
        x: (e.clientX - rect.left - pan.x) / scale,
        y: (e.clientY - rect.top - pan.y) / scale,
    };
    setSelectionStartPoint(startPos);
    setSelectionArea({ ...startPos, width: 0, height: 0 });
  };
  
  const calculateOrthogonalPath = (connector: Connector, items: WhiteboardItem[]) => {
    const fromItem = items.find(i => i.id === connector.from);
    const toItem = items.find(i => i.id === connector.to);

    if (!fromItem || !toItem) return { d: '', p1: {x:0,y:0}, p2: {x:0,y:0}, p3: {x:0,y:0}, p4: {x:0,y:0}, p5: {x:0,y:0}, midPoint: {x:0, y:0} };

    const p1 = getAnchorPointCoordinates(connector.from, connector.fromAnchor);
    const p5 = getAnchorPointCoordinates(connector.to, connector.toAnchor);

    const fromBuffer = connector.fromOffset ?? 20;
    const toBuffer = connector.toOffset ?? 20;
    
    let p2 = { ...p1 };
    if (connector.fromAnchor === 'left') p2.x -= fromBuffer;
    else if (connector.fromAnchor === 'right') p2.x += fromBuffer;
    else if (connector.fromAnchor === 'top') p2.y -= fromBuffer;
    else if (connector.fromAnchor === 'bottom') p2.y += fromBuffer;

    let p4 = { ...p5 };
    if (connector.toAnchor === 'left') p4.x -= toBuffer;
    else if (connector.toAnchor === 'right') p4.x += toBuffer;
    else if (connector.toAnchor === 'top') p4.y -= toBuffer;
    else if (connector.toAnchor === 'bottom') p4.y += toBuffer;

    const isFromHorizontal = connector.fromAnchor === 'left' || connector.fromAnchor === 'right';
    
    let p3;
    if (isFromHorizontal) {
        p3 = { x: p2.x + (p4.x - p2.x) / 2, y: p2.y };
    } else { // isFromVertical
        p3 = { x: p2.x, y: p2.y + (p4.y - p2.y) / 2};
    }
    
    const midPoint1 = { x: p3.x, y: isFromHorizontal ? p3.y : p4.y };
    const midPoint2 = { x: isFromHorizontal ? p3.x : p4.x, y: p4.y };

    const pathPoints = [p1, p2, p3, midPoint1, midPoint2, p4, p5].filter((p, i, arr) => {
        if (i === 0) return true;
        const prev = arr[i - 1];
        return p.x !== prev.x || p.y !== prev.y;
    });

    const d = pathPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    
    const centralSegmentStart = isFromHorizontal ? { x: p3.x, y: p2.y } : { x: p2.x, y: p3.y };
    const centralSegmentEnd = isFromHorizontal ? { x: p3.x, y: p4.y } : { x: p4.x, y: p3.y };
    const midPoint = {
        x: (centralSegmentStart.x + centralSegmentEnd.x) / 2,
        y: (centralSegmentStart.y + centralSegmentEnd.y) / 2,
    };
    
    return { d, p1, p2, p4, p5, midPoint };
  };

  const handleConnectorDragMouseDown = (e: React.MouseEvent, connector: Connector, segment: 'from' | 'to') => {
      e.stopPropagation();
      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const anchor = segment === 'from' ? connector.fromAnchor : connector.toAnchor;
      const initialOffset = (segment === 'from' ? connector.fromOffset : connector.toOffset) ?? 20;

      const handleMouseMove = (moveEvent: MouseEvent) => {
          const dx = (moveEvent.clientX - startMouseX) / scale;
          const dy = (moveEvent.clientY - startMouseY) / scale;
          
          let delta = 0;
          if (anchor === 'left') delta = -dx;
          else if (anchor === 'right') delta = dx;
          else if (anchor === 'top') delta = -dy;
          else if (anchor === 'bottom') delta = dy;

          const newOffset = Math.max(10, initialOffset + delta);
          updateConnectorState({ id: connector.id, [segment === 'from' ? 'fromOffset' : 'toOffset']: newOffset });
      };

      const handleMouseUp = () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
  };
  
  // --- EXPORT LOGIC ---
  const handleExport = async (options: ExportOptions) => {
    // This logic remains the same
  };
  
  const handleOpenExportModal = () => {
    // This logic remains the same
  };
  
  const handleStartSelection = () => {
    // This logic remains the same
  };

  const getAllItemsBounds = () => {
    // This logic remains the same
  };

  // Canvas rendering helpers (renderItemToCanvas, etc.) remain the same
  // ...
    
  // --- Save/Load Handlers ---
  const handleNewWhiteboard = () => {
    if(hasUnsavedChanges && !window.confirm("Tienes cambios sin guardar. ¿Estás seguro de que quieres crear una nueva pizarra?")) return;
    setItems([]);
    setConnectors([]);
    setCurrentWhiteboard(null);
    setHasUnsavedChanges(false);
    setToast({message: "Nueva pizarra creada. Guárdala para conservarla.", type: 'success'});
  };

  const handleSaveClick = async () => {
    if (!currentWhiteboard) {
      setIsSaveAsModalOpen(true);
    } else {
      setIsLoading(true);
      try {
        const content: WhiteboardState = { items, connectors };
        await updateWhiteboard(currentWhiteboard.id, currentWhiteboard.name, content);
        setHasUnsavedChanges(false);
        setToast({message: `Pizarra "${currentWhiteboard.name}" guardada.`, type: 'success'});
      } catch (error) {
        setToast({message: `Error al guardar: ${error instanceof Error ? error.message : 'Error desconocido'}`, type: 'error'});
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleConfirmSaveAs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWhiteboardName.trim()) return;
    setIsLoading(true);
    try {
        const content: WhiteboardState = { items, connectors };
        const newBoard = await addWhiteboard(newWhiteboardName.trim(), content);
        setCurrentWhiteboard({ id: newBoard.id, name: newBoard.name });
        setHasUnsavedChanges(false);
        setIsSaveAsModalOpen(false);
        setNewWhiteboardName('');
        setToast({message: `Pizarra "${newBoard.name}" guardada.`, type: 'success'});
    } catch (error) {
        setToast({message: `Error al guardar: ${error instanceof Error ? error.message : 'Error desconocido'}`, type: 'error'});
    } finally {
        setIsLoading(false);
    }
  };

  const handleOpenClick = async () => {
    if(hasUnsavedChanges && !window.confirm("Tienes cambios sin guardar. ¿Estás seguro de que quieres abrir otra pizarra?")) return;
    setIsLoading(true);
    try {
        const boards = await getWhiteboardsForUser();
        setSavedWhiteboards(boards);
        setIsOpenModalOpen(true);
    } catch (error) {
        setToast({message: `Error al buscar pizarras: ${error instanceof Error ? error.message : 'Error desconocido'}`, type: 'error'});
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleLoadWhiteboard = async (board: { id: string; name: string; }) => {
    setIsOpenModalOpen(false);
    setIsLoading(true);
    try {
        const savedBoard = await getWhiteboardContent(board.id);
        if (savedBoard && savedBoard.content) {
            const content = savedBoard.content as WhiteboardState;
            setItems(content.items || []);
            setConnectors(content.connectors || []);
            setCurrentWhiteboard({ id: savedBoard.id, name: savedBoard.name });
            setHasUnsavedChanges(false);
            setToast({message: `Pizarra "${board.name}" cargada.`, type: 'success'});
        } else {
            throw new Error("No se encontró el contenido de la pizarra.");
        }
    } catch (error) {
         setToast({message: `Error al cargar: ${error instanceof Error ? error.message : 'Error desconocido'}`, type: 'error'});
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleDeleteWhiteboard = async () => {
    if (!boardToDelete) return;
    setIsLoading(true);
    try {
        await deleteWhiteboard(boardToDelete.id);
        setSavedWhiteboards(prev => prev.filter(b => b.id !== boardToDelete.id));
        if (currentWhiteboard?.id === boardToDelete.id) {
          handleNewWhiteboard();
        }
        setBoardToDelete(null);
        setToast({message: `Pizarra "${boardToDelete.name}" eliminada.`, type: 'success'});
    } catch (error) {
        setToast({message: `Error al eliminar: ${error instanceof Error ? error.message : 'Error desconocido'}`, type: 'error'});
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleRefresh = async () => {
    if (!currentWhiteboard) {
        setToast({ message: "No hay una pizarra abierta para refrescar.", type: 'error' });
        return;
    }

    if (hasUnsavedChanges) {
        if (!window.confirm("Tienes cambios sin guardar. ¿Quieres descartarlos y cargar la última versión guardada?")) {
            return;
        }
    }

    setIsLoading(true);
    try {
        const savedBoard = await getWhiteboardContent(currentWhiteboard.id);
        if (savedBoard && savedBoard.content) {
            const content = savedBoard.content as WhiteboardState;
            setItems(content.items || []);
            setConnectors(content.connectors || []);
            setCurrentWhiteboard({ id: savedBoard.id, name: savedBoard.name });
            setHasUnsavedChanges(false);
            setToast({ message: `Pizarra "${currentWhiteboard.name}" actualizada.`, type: 'success' });
        } else {
            setToast({ message: "La pizarra que estás viendo fue eliminada por otro usuario.", type: 'error' });
            setItems([]);
            setConnectors([]);
            setCurrentWhiteboard(null);
            setHasUnsavedChanges(false);
        }
    } catch (error) {
        setToast({ message: `Error al refrescar: ${error instanceof Error ? error.message : 'Error desconocido'}`, type: 'error' });
    } finally {
        setIsLoading(false);
    }
  };
    
  // --- Canvas Styling ---
  const isDarkMode = document.body.classList.contains('dark');
  const gridColor = isDarkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.8)';
  const gridSize = 20 * scale;
  const gridStyle = {
    backgroundColor: isDarkMode ? '#1f2937' : '#f8fafc',
    backgroundImage: `
      linear-gradient(to right, ${gridColor} 1px, transparent 1px),
      linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)
    `,
    backgroundSize: `${gridSize}px ${gridSize}px`,
    backgroundPosition: `${pan.x % gridSize}px ${pan.y % gridSize}px`,
  };

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 bg-light-bg dark:bg-dark-bg pt-1 pb-4">
        <h1 className="text-3xl font-bold">
          {currentWhiteboard?.name || 'Pizarra Nueva'}
          {hasUnsavedChanges && <span className="text-brand-primary text-lg ml-2">*</span>}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-2 p-2 rounded-lg bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border">
            <button onClick={handleNewWhiteboard} title="Nueva Pizarra" className="p-2 rounded hover:bg-light-bg dark:hover:bg-dark-bg"><DocumentAddIcon /></button>
            <button onClick={handleOpenClick} title="Abrir Pizarra" className="p-2 rounded hover:bg-light-bg dark:hover:bg-dark-bg"><FolderOpenIcon /></button>
            <button onClick={handleSaveClick} title="Guardar Pizarra" className={`p-2 rounded hover:bg-light-bg dark:hover:bg-dark-bg ${hasUnsavedChanges ? 'text-brand-primary' : ''}`}><SaveIcon /></button>
            <button onClick={handleRefresh} title="Refrescar Pizarra" className="p-2 rounded hover:bg-light-bg dark:hover:bg-dark-bg disabled:text-gray-400 disabled:cursor-not-allowed" disabled={!currentWhiteboard}><RefreshIcon /></button>
            <button onClick={handleOpenExportModal} title="Exportar Pizarra" className="p-2 rounded hover:bg-light-bg dark:hover:bg-dark-bg"><DocumentDownloadIcon /></button>
            <div className="h-6 w-px bg-light-border dark:bg-dark-border"></div>
            <button onClick={() => addItem('note')} title="Añadir Nota" className="p-2 rounded hover:bg-light-bg dark:hover:bg-dark-bg"><DocumentTextIcon /></button>
            <div className="h-6 w-px bg-light-border dark:bg-dark-border"></div>
            <button onClick={() => addItem('rectangle')} title="Proceso" className="p-2 rounded hover:bg-light-bg dark:hover:bg-dark-bg"><RectangleIcon /></button>
            <button onClick={() => addItem('oval')} title="Terminador (Inicio/Fin)" className="p-2 rounded hover:bg-light-bg dark:hover:bg-dark-bg"><OvalIcon /></button>
            <button onClick={() => addItem('diamond')} title="Decisión" className="p-2 rounded hover:bg-light-bg dark:hover:bg-dark-bg"><DiamondIcon /></button>
            <button onClick={() => addItem('parallelogram')} title="Datos (Entrada/Salida)" className="p-2 rounded hover:bg-light-bg dark:hover:bg-dark-bg"><ParallelogramIcon /></button>
            <button onClick={() => addItem('predefined-process')} title="Proceso Predefinido" className="p-2 rounded hover:bg-light-bg dark:hover:bg-dark-bg"><PredefinedProcessIcon /></button>
            <button onClick={() => addItem('document')} title="Documento" className="p-2 rounded hover:bg-light-bg dark:hover:bg-dark-bg"><FlowchartDocumentIcon /></button>
            <button onClick={() => addItem('database')} title="Base de Datos" className="p-2 rounded hover:bg-light-bg dark:hover:bg-dark-bg"><DatabaseIcon /></button>
            <button onClick={() => addItem('connector-circle')} title="Conector en Página" className="p-2 rounded hover:bg-light-bg dark:hover:bg-dark-bg"><CircleIcon /></button>
            
            <div className="h-6 w-px bg-light-border dark:bg-dark-border"></div>
            
            <button onClick={() => setIsConnecting(!isConnecting)} title="Unir Elementos" className={`p-2 rounded ${isConnecting ? 'bg-blue-500 text-white' : 'hover:bg-light-bg dark:hover:bg-dark-bg'}`}><LinkIcon /></button>
            
            {(selectedItem || selectedConnector) && <div className="h-6 w-px bg-light-border dark:bg-dark-border"></div>}
            
            {(selectedItem || selectedConnector) && (
            <>
                <select value={(selectedItem || selectedConnector)!.style.fontFamily} onChange={e => updateStyle({ fontFamily: e.target.value as any })} className="p-1 rounded bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-sm">
                    {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <select value={(selectedItem || selectedConnector)!.style.fontSize} onChange={e => updateStyle({ fontSize: e.target.value })} className="p-1 rounded bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-sm">
                    {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => toggleStyle('bold')} title="Negrita" className={`p-2 rounded ${(selectedItem || selectedConnector)!.style.fontWeight === 'bold' ? 'bg-gray-300 dark:bg-gray-600' : 'hover:bg-light-bg dark:hover:bg-dark-bg'}`}><BoldIcon /></button>
                <button onClick={() => toggleStyle('italic')} title="Cursiva" className={`p-2 rounded ${(selectedItem || selectedConnector)!.style.fontStyle === 'italic' ? 'bg-gray-300 dark:bg-gray-600' : 'hover:bg-light-bg dark:hover:bg-dark-bg'}`}><ItalicIcon /></button>
                <label title="Color de Texto" className="flex items-center gap-1 p-1 rounded hover:bg-light-bg dark:hover:bg-dark-bg"> T <input type="color" value={(selectedItem || selectedConnector)!.style.color} onChange={e => updateStyle({ color: e.target.value })} className="w-6 h-6 border-none bg-transparent" /></label>
                {selectedItem && selectedItem.type !== 'note' && <label title="Color de Relleno" className="flex items-center gap-1 p-1 rounded hover:bg-light-bg dark:hover:bg-dark-bg"> <RectangleIcon className="h-4 w-4"/> <input type="color" value={(selectedItem as FlowchartShape).fillColor} onChange={e => updateItemState({ id: selectedItem.id, fillColor: e.target.value })} className="w-6 h-6 border-none bg-transparent" /></label>}
            </>
            )}
            {(selectedItemId || selectedConnectorId) && (
                <button onClick={deleteSelectedItem} title="Eliminar" className="p-2 rounded hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500"><TrashIcon /></button>
            )}
        </div>
      </div>
      
      <div
        ref={canvasRef}
        className="relative w-full h-[70vh] rounded-lg shadow-inner overflow-hidden border border-light-border dark:border-dark-border"
        style={{...gridStyle, cursor: isSelectingArea ? 'crosshair' : 'grab' }}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseDown={handleSelectionMouseDown}
      >
        <div 
          className="absolute top-0 left-0"
          style={{ 
            width: '5000px',
            height: '5000px',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            pointerEvents: isSelectingArea ? 'none' : 'auto'
          }}
        >
          <svg className="absolute top-0 left-0 pointer-events-none" style={{ zIndex: maxZIndex, width: 5000, height: 5000 }}>
              <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="#6B7280" />
                  </marker>
                  <marker id="arrowhead-selected" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="#0086D4" />
                  </marker>
              </defs>
              {connectors.map(conn => {
                  const { d, p1, p2, p4, p5 } = calculateOrthogonalPath(conn, items);
                  if (!d) return null;
                  const isSelected = conn.id === selectedConnectorId;
                  
                  return (
                    <g key={conn.id} className="pointer-events-auto" onDoubleClick={() => handleSetEditingConnector(conn.id)}>
                        <path d={d} stroke="transparent" strokeWidth="15" fill="none" className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedItemId(null); setSelectedConnectorId(conn.id); }} />
                        <path d={d} stroke={isSelected ? '#0086D4' : '#6B7280'} strokeWidth={isSelected ? 3 : 2} fill="none" markerEnd={isSelected ? "url(#arrowhead-selected)" : "url(#arrowhead)"} className="pointer-events-none" />
                        {isSelected && (
                            <>
                                <circle cx={(p1.x + p2.x)/2} cy={(p1.y + p2.y)/2} r="5" fill="#0086D4" stroke="white" strokeWidth="2" className="cursor-ew-resize" onMouseDown={(e) => handleConnectorDragMouseDown(e, conn, 'from')} />
                                <circle cx={(p4.x + p5.y)/2} cy={(p4.y + p5.y)/2} r="5" fill="#0086D4" stroke="white" strokeWidth="2" className="cursor-ew-resize" onMouseDown={(e) => handleConnectorDragMouseDown(e, conn, 'to')} />
                            </>
                        )}
                    </g>
                  )
              })}
              {connectionPreview && (
                  <path d={`M ${getAnchorPointCoordinates(connectionPreview.startItemId, connectionPreview.startAnchor).x} ${getAnchorPointCoordinates(connectionPreview.startItemId, connectionPreview.startAnchor).y} L ${connectionPreview.endPoint.x} ${connectionPreview.endPoint.y}`} stroke="#3B82F6" strokeWidth="2" strokeDasharray="5,5" />
              )}
          </svg>
          
          <svg className="absolute top-0 left-0 pointer-events-none" style={{ zIndex: maxZIndex + 1, width: 5000, height: 5000 }}>
             {guideLines.map((guide, index) => {
                if (guide.type === 'v') {
                    return <line key={index} x1={guide.x} y1={guide.y1} x2={guide.x} y2={guide.y2} stroke="#f43f5e" strokeWidth="1" strokeDasharray="3,3" />;
                }
                return <line key={index} x1={guide.x1} y1={guide.y} x2={guide.x2} y2={guide.y} stroke="#f43f5e" strokeWidth="1" strokeDasharray="3,3" />;
             })}
          </svg>

          {items.map(item =>
            item.type === 'note'
              ? <StickyNoteComponent key={item.id} note={item} allItems={items} onUpdateState={updateItemState} onPersist={() => {}} onDelete={deleteSelectedItem} onInteractionStart={handleInteractionStart} isSelected={item.id === selectedItemId} isEditing={item.id === editingItemId} onSetEditing={handleSetEditing} isConnecting={isConnecting} connectionStartId={connectionPreview?.startItemId || null} onAnchorMouseDown={handleAnchorMouseDown} onAnchorMouseUp={handleAnchorMouseUp} scale={scale} setGuideLines={setGuideLines} />
              : <FlowchartShapeComponent key={item.id} shape={item} allItems={items} onUpdateState={updateItemState} onPersist={() => {}} onDelete={deleteSelectedItem} onInteractionStart={handleInteractionStart} isSelected={item.id === selectedItemId} isEditing={item.id === editingItemId} onSetEditing={handleSetEditing} isConnecting={isConnecting} connectionStartId={connectionPreview?.startItemId || null} onAnchorMouseDown={handleAnchorMouseDown} onAnchorMouseUp={handleAnchorMouseUp} scale={scale} setGuideLines={setGuideLines} />
          )}

          {connectors.map(conn => {
              const { midPoint } = calculateOrthogonalPath(conn, items);
              const isEditing = editingConnectorId === conn.id;

              if (isEditing) {
                  return (
                      <textarea
                          key={conn.id}
                          value={conn.text}
                          onChange={(e) => updateConnectorState({ id: conn.id, text: e.target.value })}
                          onBlur={() => handleSetEditingConnector(null)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSetEditingConnector(null); } }}
                          autoFocus
                          style={{
                              position: 'absolute',
                              left: midPoint.x,
                              top: midPoint.y,
                              transform: 'translate(-50%, -50%)',
                              ...conn.style,
                              zIndex: maxZIndex + 2,
                              background: 'rgba(255, 255, 255, 0.8)',
                              textAlign: 'center',
                              minWidth: '50px',
                              minHeight: '20px',
                              border: '1px dashed #0086D4',
                              outline: 'none',
                              resize: 'none',
                          }}
                      />
                  );
              }

              if (conn.text) {
                  return (
                      <div
                          key={conn.id}
                          style={{
                              position: 'absolute',
                              left: midPoint.x,
                              top: midPoint.y,
                              transform: 'translate(-50%, -50%)',
                              ...conn.style,
                              zIndex: maxZIndex,
                              pointerEvents: 'none',
                              background: isDarkMode ? '#1f2937' : '#f8fafc',
                              padding: '0 4px',
                          }}
                      >
                          {conn.text}
                      </div>
                  );
              }
              return null;
          })}

        </div>
        {selectionArea && isSelectingArea && (
            <div
                className="absolute border-2 border-dashed border-blue-500 bg-blue-500/20 pointer-events-none"
                style={{
                    left: `${selectionArea.x * scale + pan.x}px`,
                    top: `${selectionArea.y * scale + pan.y}px`,
                    width: `${selectionArea.width * scale}px`,
                    height: `${selectionArea.height * scale}px`,
                    transformOrigin: '0 0',
                    zIndex: 9999,
                }}
            />
        )}
        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs font-mono rounded px-2 py-1 select-none pointer-events-none">
            Zoom: {Math.round(scale * 100)}%
        </div>
         {toast && (
            <div className={`absolute bottom-4 right-4 text-white text-sm font-semibold rounded-lg px-4 py-2 shadow-lg animate-fade-in ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                {toast.message}
            </div>
        )}
        {isLoading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
                <Spinner />
                <span className="ml-2 text-white">Procesando...</span>
            </div>
        )}
      </div>
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExport as any}
        onStartSelection={handleStartSelection}
        initialBounds={exportModalBounds}
      />
      {isSaveAsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={() => setIsSaveAsModalOpen(false)}>
            <div className="bg-light-card dark:bg-dark-card rounded-lg shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleConfirmSaveAs}>
                    <div className="p-6">
                        <h3 className="font-bold text-lg">Guardar como...</h3>
                        <p className="text-sm mt-1 text-light-text-secondary dark:text-dark-text-secondary">Dale un nombre a tu nueva pizarra.</p>
                        <input type="text" value={newWhiteboardName} onChange={e => setNewWhiteboardName(e.target.value)} required autoFocus className="w-full mt-4 p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md"/>
                    </div>
                    <div className="p-4 bg-light-bg dark:bg-dark-bg/50 flex justify-end gap-2 rounded-b-lg">
                        <button type="button" onClick={() => setIsSaveAsModalOpen(false)} className="px-4 py-2 text-sm rounded-md border border-light-border dark:border-dark-border">Cancelar</button>
                        <button type="submit" className="px-4 py-2 text-sm rounded-md text-white bg-brand-primary hover:bg-brand-secondary">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
      )}
      {isOpenModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={() => setIsOpenModalOpen(false)}>
            <div className="bg-light-card dark:bg-dark-card rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-light-border dark:border-dark-border">
                    <h3 className="font-bold text-lg">Abrir Pizarra</h3>
                </div>
                <div className="p-6 flex-grow overflow-y-auto">
                    {savedWhiteboards.length > 0 ? (
                        <ul className="divide-y divide-light-border dark:divide-dark-border">
                            {savedWhiteboards.map(board => (
                                <li key={board.id} className="py-2 flex justify-between items-center group">
                                    <div>
                                        <p className="font-semibold">{board.name}</p>
                                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Actualizado: {new Date(board.updated_at).toLocaleString()}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setBoardToDelete(board)} className="p-2 text-red-500 opacity-0 group-hover:opacity-100"><TrashIcon className="h-4 w-4"/></button>
                                        <button onClick={() => handleLoadWhiteboard(board)} className="px-3 py-1 text-sm rounded-md text-white bg-brand-primary hover:bg-brand-secondary">Abrir</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-light-text-secondary dark:text-dark-text-secondary py-8">No hay pizarras guardadas.</p>
                    )}
                </div>
            </div>
        </div>
      )}
      <ConfirmationModal
        isOpen={!!boardToDelete}
        onClose={() => setBoardToDelete(null)}
        onConfirm={handleDeleteWhiteboard}
        title="Eliminar Pizarra"
        message={`¿Estás seguro de que quieres eliminar la pizarra "${boardToDelete?.name}"? Esta acción no se puede deshacer.`}
      />
    </div>
  );
};

export default WhiteboardView;