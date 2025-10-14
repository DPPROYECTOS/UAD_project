import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { jsPDF } from 'jspdf';
import {
  WhiteboardItem, Note, FlowchartShape, Connector, TextStyle, Point,
  FlowchartShapeType, AnchorPosition, WhiteboardState, TextItem
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
import TextItemComponent from '../components/whiteboard/TextItemComponent';
import ExportModal, { ExportOptions } from '../components/whiteboard/ExportModal';
import ConfirmationModal from '../components/projects/ConfirmationModal';
import Spinner from '../components/Spinner';
import {
  DocumentTextIcon, RectangleIcon, OvalIcon, DiamondIcon, LinkIcon,
  BoldIcon, ItalicIcon, TrashIcon, ParallelogramIcon, PredefinedProcessIcon,
  FlowchartDocumentIcon, DatabaseIcon, CircleIcon, DocumentDownloadIcon, SaveIcon, FolderOpenIcon, DocumentAddIcon, XIcon, RefreshIcon, TextIcon, UndoIcon, RedoIcon, ListBulletIcon, ListNumberIcon,
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
  listStyle: 'none',
};

const defaultConnectorTextStyle: TextStyle = {
  ...defaultTextStyle,
  fontSize: '12px',
  color: '#374151',
};

const MAX_HISTORY_LENGTH = 20;

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
  
  // --- History State for Undo/Redo ---
  const [history, setHistory] = useState<WhiteboardState[]>([{ items: [], connectors: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);

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

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // --- History Management ---
  const saveState = useCallback((newItems: WhiteboardItem[], newConnectors: Connector[]) => {
      const newState: WhiteboardState = { items: newItems, connectors: newConnectors };
      
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newState);

      while (newHistory.length > MAX_HISTORY_LENGTH) {
          newHistory.shift();
      }

      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      setItems(newItems);
      setConnectors(newConnectors);
      setHasUnsavedChanges(true);
  }, [history, historyIndex]);
  
  const handleUndo = () => {
    if (canUndo) {
      const newIndex = historyIndex - 1;
      const prevState = history[newIndex];
      setItems(prevState.items);
      setConnectors(prevState.connectors);
      setHistoryIndex(newIndex);
      setHasUnsavedChanges(true);
    }
  };

  const handleRedo = () => {
    if (canRedo) {
      const newIndex = historyIndex + 1;
      const nextState = history[newIndex];
      setItems(nextState.items);
      setConnectors(nextState.connectors);
      setHistoryIndex(newIndex);
      setHasUnsavedChanges(true);
    }
  };

  const handlePersistState = useCallback(() => {
      const currentState = { items, connectors };
      const lastHistoryState = history[historyIndex];
      if (JSON.stringify(currentState) === JSON.stringify(lastHistoryState)) {
          return;
      }
      saveState(items, connectors);
  }, [items, connectors, history, historyIndex, saveState]);


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
      if (editingItemId) return;

      // Undo/Redo shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'Z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (!selectedItemId) return;
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
      
      // Persist movement on key up for arrow keys
      const persistOnKeyUp = (upEvent: KeyboardEvent) => {
          if (upEvent.key.startsWith('Arrow')) {
              handlePersistState();
              window.removeEventListener('keyup', persistOnKeyUp);
          }
      };
      window.addEventListener('keyup', persistOnKeyUp);

    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemId, editingItemId, items, handlePersistState, handleUndo, handleRedo]);
  
  const updateItemState = (itemUpdate: Partial<WhiteboardItem> & { id: string }) => {
    setItems(prev => prev.map(item => item.id === itemUpdate.id ? { ...item, ...itemUpdate } : item));
    setHasUnsavedChanges(true);
  };
  
  const updateConnectorState = (connectorUpdate: Partial<Connector> & { id: string }) => {
      setConnectors(prev => prev.map(c => c.id === connectorUpdate.id ? { ...c, ...connectorUpdate } : c));
      setHasUnsavedChanges(true);
  };

  const addItem = (type: 'note' | FlowchartShapeType | 'text') => {
    zIndexCounter.current = items.length > 0 ? Math.max(...items.map(i => i.zIndex)) + 1 : 1;
    const newItemId = uuidv4();
    const rect = canvasRef.current?.getBoundingClientRect();

    let newItem: WhiteboardItem;

    if (type === 'note') {
      const position = {
        x: rect ? (-pan.x + rect.width / 2) / scale - 75 : 100,
        y: rect ? (-pan.y + rect.height / 2) / scale - 50 : 100
      };
      newItem = {
        id: newItemId, type: 'note', text: 'New Note',
        position, width: 150, height: 100,
        zIndex: zIndexCounter.current,
        color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
        style: defaultTextStyle
      };
    } else if (type === 'text') {
      const position = {
        x: rect ? (-pan.x + rect.width / 2) / scale - 75 : 100,
        y: rect ? (-pan.y + rect.height / 2) / scale - 25 : 100
      };
      newItem = {
        id: newItemId, type: 'text', text: 'Texto',
        position, width: 150, height: 50,
        zIndex: zIndexCounter.current,
        style: defaultTextStyle,
        rotation: 0,
      };
    } else { // Flowchart shape
      const isConnector = type === 'connector-circle';
      const width = isConnector ? 40 : 160;
      const height = isConnector ? 40 : 80;
      const position = {
        x: rect ? (-pan.x + rect.width / 2) / scale - (width / 2) : 100,
        y: rect ? (-pan.y + rect.height / 2) / scale - (height / 2) : 100
      };
      newItem = {
        id: newItemId, type, text: isConnector ? '' : 'Shape',
        position, width, height,
        zIndex: zIndexCounter.current,
        fillColor: '#ffffff',
        style: defaultTextStyle,
        rotation: 0,
      };
    }
    
    saveState([...items, newItem], connectors);
    setSelectedItemId(newItemId);
    if (type !== 'connector-circle') {
      setEditingItemId(newItemId);
    }
  };
  
  const deleteSelectedItem = () => {
    if (selectedItemId) {
      const newItems = items.filter(i => i.id !== selectedItemId);
      const newConnectors = connectors.filter(c => c.from !== selectedItemId && c.to !== selectedItemId);
      saveState(newItems, newConnectors);
      setSelectedItemId(null);
    }
    if (selectedConnectorId) {
      const newConnectors = connectors.filter(c => c.id !== selectedConnectorId);
      saveState(items, newConnectors);
      setSelectedConnectorId(null);
    }
  };
  
  const handleInteractionStart = (id: string) => {
    zIndexCounter.current = items.length > 0 ? Math.max(...items.map(i => i.zIndex)) + 1 : 1;
    const newItems = items.map(item => item.id === id ? { ...item, zIndex: zIndexCounter.current } : item);
    saveState(newItems, connectors);
    setSelectedItemId(id);
    setSelectedConnectorId(null);
    setEditingItemId(null);
    setEditingConnectorId(null);
  };

  const handleSetEditing = (id: string | null) => {
    if (editingItemId && !id) {
        handlePersistState(); // Save state when finishing editing
    }
    setEditingItemId(id);
    if (id) {
      setSelectedItemId(id);
      setSelectedConnectorId(null);
    }
  };
  
  const handleSetEditingConnector = (id: string | null) => {
    if (editingConnectorId && !id) {
        handlePersistState(); // Save state when finishing editing
    }
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
    if (selectedItem) {
        const newItems = items.map(i => i.id === selectedItem.id ? { ...i, style: { ...i.style, ...styleProp } } : i);
        saveState(newItems, connectors);
    } else if (selectedConnector) {
        const newConnectors = connectors.map(c => c.id === selectedConnector.id ? { ...c, style: { ...c.style, ...styleProp } } : c);
        saveState(items, newConnectors);
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
        const newItems = items.map(i => i.id === item.id ? { ...i, style: { ...i.style, ...newStyle } } : i);
        saveState(newItems, connectors);
    } else { // It's a Connector
        const newConnectors = connectors.map(c => c.id === item.id ? { ...c, style: { ...c.style, ...newStyle } } : c);
        saveState(items, newConnectors);
    }
  };

  const toggleListStyle = (listType: 'bullet' | 'number') => {
    if (!selectedItem) return;

    const currentListStyle = selectedItem.style.listStyle;
    const newListStyle = currentListStyle === listType ? 'none' : listType;

    const newItems = items.map(i =>
        i.id === selectedItem.id
            ? { ...i, style: { ...i.style, listStyle: newListStyle } }
            : i
    );
    saveState(newItems, connectors);
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
    saveState(items, [...connectors, newConnector]);
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
  
      if (!fromItem || !toItem) return { d: '', isCShape: false };
  
      const p1 = getAnchorPointCoordinates(connector.from, connector.fromAnchor);
      const p6 = getAnchorPointCoordinates(connector.to, connector.toAnchor);
  
      const fromBuffer = connector.fromOffset ?? 20;
      const toBuffer = connector.toOffset ?? 20;
  
      let p2 = { ...p1 };
      if (connector.fromAnchor === 'left') p2.x -= fromBuffer;
      else if (connector.fromAnchor === 'right') p2.x += fromBuffer;
      else if (connector.fromAnchor === 'top') p2.y -= fromBuffer;
      else if (connector.fromAnchor === 'bottom') p2.y += fromBuffer;
  
      let p5 = { ...p6 };
      if (connector.toAnchor === 'left') p5.x -= toBuffer;
      else if (connector.toAnchor === 'right') p5.x += toBuffer;
      else if (connector.toAnchor === 'top') p5.y -= toBuffer;
      else if (connector.toAnchor === 'bottom') p5.y += toBuffer;
  
      const isFromHorizontal = connector.fromAnchor === 'left' || connector.fromAnchor === 'right';
      const isToHorizontal = connector.toAnchor === 'left' || connector.toAnchor === 'right';
      
      let p3: Point, p4: Point, d: string, midPoint: Point;
      const isCShape = isFromHorizontal === isToHorizontal;
      
      if (isCShape) {
          const midpointRatio = connector.midpointRatio ?? 0.5;
          if (isFromHorizontal) {
              const midX = p2.x + (p5.x - p2.x) * midpointRatio;
              p3 = { x: midX, y: p2.y };
              p4 = { x: midX, y: p5.y };
          } else { // both vertical
              const midY = p2.y + (p5.y - p2.y) * midpointRatio;
              p3 = { x: p2.x, y: midY };
              p4 = { x: p5.x, y: midY };
          }
          d = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${p4.x} ${p4.y} L ${p5.x} ${p5.y} L ${p6.x} ${p6.y}`;
          midPoint = { x: (p3.x + p4.x) / 2, y: (p3.y + p4.y) / 2 };
          return { d, p1, p2, p3, p4, p5, p6, midPoint, isCShape };
      } else { // S-shape
          if (isFromHorizontal) {
              p3 = { x: p2.x, y: p5.y };
          } else {
              p3 = { x: p5.x, y: p2.y };
          }
          p4 = p3; // for consistency
          d = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${p5.x} ${p5.y} L ${p6.x} ${p6.y}`;
          midPoint = { x: p3.x, y: p3.y };
          return { d, p1, p2, p3, p4, p5, p6, midPoint, isCShape };
      }
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
          handlePersistState();
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
  };
  
  const handleConnectorMidpointDragMouseDown = (e: React.MouseEvent, connector: Connector) => {
      e.stopPropagation();
      
      const pathInfo = calculateOrthogonalPath(connector, items);
      if(!pathInfo.p2 || !pathInfo.p5) return;

      const isFromHorizontal = connector.fromAnchor === 'left' || connector.fromAnchor === 'right';

      const handleMouseMove = (moveEvent: MouseEvent) => {
          let newRatio;
          if (isFromHorizontal) {
              const mouseX = (moveEvent.clientX - canvasRef.current!.getBoundingClientRect().left - pan.x) / scale;
              const totalDist = pathInfo.p5.x - pathInfo.p2.x;
              if (Math.abs(totalDist) < 1) {
                  newRatio = 0.5;
              } else {
                  newRatio = (mouseX - pathInfo.p2.x) / totalDist;
              }
          } else { // Vertical
              const mouseY = (moveEvent.clientY - canvasRef.current!.getBoundingClientRect().top - pan.y) / scale;
              const totalDist = pathInfo.p5.y - pathInfo.p2.y;
               if (Math.abs(totalDist) < 1) {
                  newRatio = 0.5;
              } else {
                  newRatio = (mouseY - pathInfo.p2.y) / totalDist;
              }
          }
          const clampedRatio = Math.max(0.05, Math.min(0.95, newRatio));
          updateConnectorState({ id: connector.id, midpointRatio: clampedRatio });
      };

      const handleMouseUp = () => {
          handlePersistState();
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
  };
  
  // --- EXPORT LOGIC ---
  const getAllItemsBounds = () => {
    if (items.length === 0) {
      return { x: 0, y: 0, width: 1920, height: 1080 }; // Default size for empty board
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    items.forEach(item => {
      minX = Math.min(minX, item.position.x);
      minY = Math.min(minY, item.position.y);
      maxX = Math.max(maxX, item.position.x + item.width);
      maxY = Math.max(maxY, item.position.y + item.height);
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  };

  const handleOpenExportModal = () => {
    const bounds = getAllItemsBounds();
    setExportModalBounds({ width: Math.round(bounds.width), height: Math.round(bounds.height), type: 'all' });
    setIsExportModalOpen(true);
  };

  const handleStartSelection = () => {
    setIsSelectingArea(true);
    setToast({ message: "Arrastra para seleccionar el área a exportar.", type: 'success' });
  };
  
  const renderTextToCanvas = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, maxHeight: number, style: TextStyle) => {
    ctx.font = `${style.fontWeight || 'normal'} ${style.fontStyle || 'normal'} ${style.fontSize} ${style.fontFamily}`;
    ctx.fillStyle = style.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const words = text.split(' ');
    let line = '';
    const lines = [];
    const lineHeight = parseFloat(style.fontSize) * 1.2;

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line);

    const totalHeight = lines.length * lineHeight;
    let startY = y - totalHeight / 2 + lineHeight / 2;
    if (startY < y - maxHeight / 2) {
      startY = y - maxHeight / 2 + lineHeight / 2;
    }

    lines.forEach(l => {
        if (startY < y + maxHeight / 2) {
             ctx.fillText(l.trim(), x, startY);
             startY += lineHeight;
        }
    });
  };

  const renderItemToCanvas = (ctx: CanvasRenderingContext2D, item: WhiteboardItem) => {
    ctx.save();
    const { position, width, height, rotation = 0 } = item;
    const cx = position.x + width / 2;
    const cy = position.y + height / 2;
    ctx.translate(cx, cy);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.translate(-cx, -cy);

    if (item.type === 'note') {
        const noteColors: { [key: string]: string } = {
            'bg-yellow-200': '#FEF9C3', 'bg-green-200': '#D1FAE5',
            'bg-blue-200': '#DBEAFE', 'bg-pink-200': '#FCE7F3',
            'bg-purple-200': '#EDE9FE',
        };
        ctx.fillStyle = noteColors[item.color] || '#FEF9C3';
        ctx.strokeStyle = '#D1D5DB';
        ctx.lineWidth = 1;
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        ctx.beginPath();
        ctx.rect(item.position.x, item.position.y, item.width, item.height);
        ctx.fill();
        ctx.stroke();
        ctx.shadowColor = 'transparent'; // Reset shadow for text
        renderTextToCanvas(ctx, item.text, item.position.x + item.width / 2, item.position.y + item.height / 2, item.width - 20, item.height - 20, item.style);
    } else if (item.type === 'text') {
        renderTextToCanvas(ctx, item.text, item.position.x + item.width / 2, item.position.y + item.height / 2, item.width, item.height, item.style);
    } else {
        ctx.fillStyle = item.fillColor;
        ctx.strokeStyle = "#111827";
        ctx.lineWidth = 2;
        ctx.beginPath();
        const x = item.position.x;
        const y = item.position.y;
        const w = item.width;
        const h = item.height;

        switch (item.type) {
            case 'rectangle': ctx.rect(x, y, w, h); break;
            case 'oval': ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 2 * Math.PI); break;
            case 'diamond':
                ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + h / 2);
                ctx.lineTo(x + w / 2, y + h); ctx.lineTo(x, y + h / 2);
                ctx.closePath(); break;
            case 'parallelogram':
                const skew = Math.min(20, w / 4);
                ctx.moveTo(x + skew, y); ctx.lineTo(x + w, y);
                ctx.lineTo(x + w - skew, y + h); ctx.lineTo(x, y + h);
                ctx.closePath(); break;
             case 'predefined-process':
                ctx.rect(x, y, w, h); ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x + 10, y); ctx.lineTo(x + 10, y + h);
                ctx.moveTo(x + w - 10, y); ctx.lineTo(x + w - 10, y + h);
                break;
             case 'document':
                const waveHeight = Math.min(20, h / 4);
                ctx.moveTo(x, y); ctx.lineTo(x + w, y);
                ctx.lineTo(x + w, y + h - waveHeight);
                ctx.quadraticCurveTo(x + w / 2, y + h + waveHeight/2, x, y + h - waveHeight);
                ctx.closePath(); break;
             case 'database':
                const rx = w / 2; const ry = Math.min(15, h / 4);
                const topCy = y + ry; const bottomCy = y + h - ry;
                ctx.beginPath();
                ctx.moveTo(x, topCy);
                ctx.lineTo(x, bottomCy);
                ctx.ellipse(x + w / 2, bottomCy, rx, ry, 0, Math.PI, 0, false);
                ctx.lineTo(x + w, topCy);
                ctx.ellipse(x + w / 2, topCy, rx, ry, 0, 0, Math.PI, true);
                break;
            case 'connector-circle': ctx.arc(x + w / 2, y + h / 2, w / 2, 0, 2 * Math.PI); break;
        }
        ctx.fill();
        ctx.stroke();
        if(item.text) {
          renderTextToCanvas(ctx, item.text, item.position.x + item.width / 2, item.position.y + item.height / 2, item.width - 10, item.height - 10, item.style);
        }
    }
    ctx.restore();
  };

  const handleExport = async (options: ExportOptions) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        const canvas = document.createElement('canvas');
        canvas.width = options.width;
        canvas.height = options.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not create canvas context");

        let exportBounds;
        if (options.exportType === 'selection' && selectionArea) {
            exportBounds = selectionArea;
        } else {
            exportBounds = getAllItemsBounds();
            if (exportBounds.width <= 0 || exportBounds.height <= 0) {
                 exportBounds.width = 1920;
                 exportBounds.height = 1080;
            }
        }
        
        const padding = 20;
        exportBounds = {
            x: exportBounds.x - padding,
            y: exportBounds.y - padding,
            width: exportBounds.width + padding * 2,
            height: exportBounds.height + padding * 2,
        };

        const scaleX = options.width / exportBounds.width;
        const scaleY = options.height / exportBounds.height;
        const exportScale = Math.min(scaleX, scaleY);
        
        ctx.save();
        ctx.scale(exportScale, exportScale);
        ctx.translate(-exportBounds.x, -exportBounds.y);
        
        if (options.includeBackground) {
            const isDark = document.documentElement.classList.contains('theme-dark');
            const patternCanvas = document.createElement('canvas');
            const patternCtx = patternCanvas.getContext('2d')!;
            const gridSize = 20;
            patternCanvas.width = gridSize;
            patternCanvas.height = gridSize;
            patternCtx.fillStyle = isDark ? '#1f2937' : '#f8fafc';
            patternCtx.fillRect(0, 0, gridSize, gridSize);
            patternCtx.strokeStyle = isDark ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.8)';
            patternCtx.lineWidth = 1;
            patternCtx.beginPath();
            patternCtx.moveTo(gridSize, 0); patternCtx.lineTo(gridSize, gridSize);
            patternCtx.moveTo(0, gridSize); patternCtx.lineTo(gridSize, gridSize);
            patternCtx.stroke();
            const pattern = ctx.createPattern(patternCanvas, 'repeat')!;
            ctx.fillStyle = pattern;
            ctx.fillRect(exportBounds.x, exportBounds.y, exportBounds.width, exportBounds.height);
        } else {
            ctx.fillStyle = document.documentElement.classList.contains('theme-dark') ? '#1f2937' : '#ffffff';
            ctx.fillRect(exportBounds.x, exportBounds.y, exportBounds.width, exportBounds.height);
        }
        
        const itemsToDraw = items.filter(item => 
            item.position.x < exportBounds.x + exportBounds.width &&
            item.position.x + item.width > exportBounds.x &&
            item.position.y < exportBounds.y + exportBounds.height &&
            item.position.y + item.height > exportBounds.y
        ).sort((a, b) => a.zIndex - b.zIndex);
            
        connectors.forEach(conn => {
            const pathInfo = calculateOrthogonalPath(conn, items);
            if (!pathInfo.d) return;

            const path = new Path2D(pathInfo.d);
            ctx.strokeStyle = '#6B7280';
            ctx.lineWidth = 2;
            ctx.stroke(path);

            if (conn.text) {
                renderTextToCanvas(ctx, conn.text, pathInfo.midPoint.x, pathInfo.midPoint.y, 200, 50, conn.style);
            }
        });
        
        itemsToDraw.forEach(item => renderItemToCanvas(ctx, item));
        
        ctx.restore();

        if (options.format === 'pdf') {
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            const pdf = new jsPDF({
                orientation: options.width > options.height ? 'landscape' : 'portrait',
                unit: 'px',
                format: [options.width, options.height]
            });
            pdf.addImage(imgData, 'JPEG', 0, 0, options.width, options.height);
            pdf.save('whiteboard.pdf');
        } else {
            const image = canvas.toDataURL(`image/${options.format}`, options.format === 'jpeg' ? 0.9 : 1.0);
            const link = document.createElement('a');
            link.download = `whiteboard.${options.format}`;
            link.href = image;
            link.click();
        }
        
    } catch (error) {
        setToast({ message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'error' });
    } finally {
        setIsLoading(false);
        setIsExportModalOpen(false);
        setSelectionArea(null);
    }
  };
    
  // --- Save/Load Handlers ---
  const handleNewWhiteboard = () => {
    if(hasUnsavedChanges && !window.confirm("Tienes cambios sin guardar. ¿Estás seguro de que quieres crear una nueva pizarra?")) return;
    setItems([]);
    setConnectors([]);
    setHistory([{ items: [], connectors: [] }]);
    setHistoryIndex(0);
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
            const loadedItems = content.items || [];
            const loadedConnectors = content.connectors || [];
            setItems(loadedItems);
            setConnectors(loadedConnectors);
            setHistory([{ items: loadedItems, connectors: loadedConnectors }]);
            setHistoryIndex(0);
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
            const loadedItems = content.items || [];
            const loadedConnectors = content.connectors || [];
            setItems(loadedItems);
            setConnectors(loadedConnectors);
            setHistory([{ items: loadedItems, connectors: loadedConnectors }]);
            setHistoryIndex(0);
            setCurrentWhiteboard({ id: savedBoard.id, name: savedBoard.name });
            setHasUnsavedChanges(false);
            setToast({ message: `Pizarra "${currentWhiteboard.name}" actualizada.`, type: 'success' });
        } else {
            setToast({ message: "La pizarra que estás viendo fue eliminada por otro usuario.", type: 'error' });
            setItems([]);
            setConnectors([]);
            setHistory([{ items: [], connectors: [] }]);
            setHistoryIndex(0);
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
            <button onClick={handleUndo} disabled={!canUndo} title="Deshacer (Ctrl+Z)" className="p-2 rounded hover:bg-light-bg dark:hover:bg-dark-bg disabled:opacity-50 disabled:cursor-not-allowed"><UndoIcon /></button>
            <button onClick={handleRedo} disabled={!canRedo} title="Rehacer (Ctrl+Y)" className="p-2 rounded hover:bg-light-bg dark:hover:bg-dark-bg disabled:opacity-50 disabled:cursor-not-allowed"><RedoIcon /></button>
            <div className="h-6 w-px bg-light-border dark:bg-dark-border"></div>
            <button onClick={() => addItem('note')} title="Añadir Nota" className="p-2 rounded hover:bg-light-bg dark:hover:bg-dark-bg"><DocumentTextIcon /></button>
            <button onClick={() => addItem('text')} title="Añadir Texto" className="p-2 rounded hover:bg-light-bg dark:hover:bg-dark-bg"><TextIcon /></button>
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
            </>
            )}
            {selectedItem && (
                <>
                    <button onClick={() => toggleListStyle('bullet')} title="Viñetas" className={`p-2 rounded ${selectedItem?.style.listStyle === 'bullet' ? 'bg-gray-300 dark:bg-gray-600' : 'hover:bg-light-bg dark:hover:bg-dark-bg'}`}><ListBulletIcon /></button>
                    <button onClick={() => toggleListStyle('number')} title="Numeración" className={`p-2 rounded ${selectedItem?.style.listStyle === 'number' ? 'bg-gray-300 dark:bg-gray-600' : 'hover:bg-light-bg dark:hover:bg-dark-bg'}`}><ListNumberIcon /></button>
                </>
            )}
            {selectedItem && selectedItem.type !== 'note' && selectedItem.type !== 'text' && <label title="Color de Relleno" className="flex items-center gap-1 p-1 rounded hover:bg-light-bg dark:hover:bg-dark-bg"> <RectangleIcon className="h-4 w-4"/> <input type="color" value={(selectedItem as FlowchartShape).fillColor} onChange={e => {
                const newItems = items.map(i => i.id === selectedItem.id ? { ...i, fillColor: e.target.value } as WhiteboardItem : i);
                saveState(newItems, connectors);
            }} className="w-6 h-6 border-none bg-transparent" /></label>}
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
                  const pathInfo = calculateOrthogonalPath(conn, items);
                  if (!pathInfo.d) return null;
                  const isSelected = conn.id === selectedConnectorId;
                  
                  return (
                    <g key={conn.id} className="pointer-events-auto" onDoubleClick={() => handleSetEditingConnector(conn.id)}>
                        <path d={pathInfo.d} stroke="transparent" strokeWidth="15" fill="none" className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedItemId(null); setSelectedConnectorId(conn.id); }} />
                        <path d={pathInfo.d} stroke={isSelected ? '#0086D4' : '#6B7280'} strokeWidth={isSelected ? 3 : 2} fill="none" markerEnd={isSelected ? "url(#arrowhead-selected)" : "url(#arrowhead)"} className="pointer-events-none" />
                        {isSelected && pathInfo.p2 && (
                            <>
                                {/* From Segment Handle */}
                                <circle cx={(pathInfo.p2.x + pathInfo.p3.x) / 2} cy={(pathInfo.p2.y + pathInfo.p3.y) / 2} r="5" fill="#0086D4" stroke="white" strokeWidth="2"
                                    className={pathInfo.p2.x === pathInfo.p3.x ? 'cursor-ew-resize' : 'cursor-ns-resize'}
                                    onMouseDown={(e) => handleConnectorDragMouseDown(e, conn, 'from')}
                                />
                                
                                {pathInfo.isCShape ? (
                                    <>
                                        {/* C-Shape Middle Segment Handle */}
                                        <circle cx={pathInfo.midPoint.x} cy={pathInfo.midPoint.y} r="5" fill="#0086D4" stroke="white" strokeWidth="2"
                                            className={pathInfo.p3.x === pathInfo.p4.x ? 'cursor-ew-resize' : 'cursor-ns-resize'}
                                            onMouseDown={(e) => handleConnectorMidpointDragMouseDown(e, conn)}
                                        />
                                        {/* C-Shape To Segment Handle */}
                                        <circle cx={(pathInfo.p4.x + pathInfo.p5.x) / 2} cy={(pathInfo.p4.y + pathInfo.p5.y) / 2} r="5" fill="#0086D4" stroke="white" strokeWidth="2"
                                            className={pathInfo.p4.x === pathInfo.p5.x ? 'cursor-ew-resize' : 'cursor-ns-resize'}
                                            onMouseDown={(e) => handleConnectorDragMouseDown(e, conn, 'to')}
                                        />
                                    </>
                                ) : (
                                    <>
                                        {/* S-Shape To Segment Handle */}
                                        <circle cx={(pathInfo.p3.x + pathInfo.p5.x) / 2} cy={(pathInfo.p3.y + pathInfo.p5.y) / 2} r="5" fill="#0086D4" stroke="white" strokeWidth="2"
                                            className={pathInfo.p3.x === pathInfo.p5.x ? 'cursor-ew-resize' : 'cursor-ns-resize'}
                                            onMouseDown={(e) => handleConnectorDragMouseDown(e, conn, 'to')}
                                        />
                                    </>
                                )}
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

          {items.map(item => {
            if (item.type === 'note') {
                return <StickyNoteComponent key={item.id} note={item} allItems={items} onUpdateState={updateItemState} onPersist={handlePersistState} onDelete={deleteSelectedItem} onInteractionStart={handleInteractionStart} isSelected={item.id === selectedItemId} isEditing={item.id === editingItemId} onSetEditing={handleSetEditing} isConnecting={isConnecting} connectionStartId={connectionPreview?.startItemId || null} onAnchorMouseDown={handleAnchorMouseDown} onAnchorMouseUp={handleAnchorMouseUp} scale={scale} setGuideLines={setGuideLines} />;
            } else if (item.type === 'text') {
                return <TextItemComponent key={item.id} textItem={item as TextItem} allItems={items} onUpdateState={updateItemState} onPersist={handlePersistState} onDelete={deleteSelectedItem} onInteractionStart={handleInteractionStart} isSelected={item.id === selectedItemId} isEditing={item.id === editingItemId} onSetEditing={handleSetEditing} isConnecting={isConnecting} connectionStartId={connectionPreview?.startItemId || null} onAnchorMouseDown={handleAnchorMouseDown} onAnchorMouseUp={handleAnchorMouseUp} scale={scale} setGuideLines={setGuideLines} />;
            } else {
                return <FlowchartShapeComponent key={item.id} shape={item as FlowchartShape} allItems={items} onUpdateState={updateItemState} onPersist={handlePersistState} onDelete={deleteSelectedItem} onInteractionStart={handleInteractionStart} isSelected={item.id === selectedItemId} isEditing={item.id === editingItemId} onSetEditing={handleSetEditing} isConnecting={isConnecting} connectionStartId={connectionPreview?.startItemId || null} onAnchorMouseDown={handleAnchorMouseDown} onAnchorMouseUp={handleAnchorMouseUp} scale={scale} setGuideLines={setGuideLines} />;
            }
          })}


          {connectors.map(conn => {
              const pathInfo = calculateOrthogonalPath(conn, items);
              if (!pathInfo.midPoint) return null;
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
                              left: pathInfo.midPoint.x,
                              top: pathInfo.midPoint.y,
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
                              left: pathInfo.midPoint.x,
                              top: pathInfo.midPoint.y,
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