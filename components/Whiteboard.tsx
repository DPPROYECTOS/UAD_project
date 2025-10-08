


import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
// FIX: Changed import from `WhiteboardItem` to `WhiteboardItemOld` to match the actual data structure used in this component.
import { DrawPath, StickyNote, WhiteboardTool, WhiteboardItemOld } from '../types';
import { PencilAltIcon, EraserIcon, DocumentAddIcon, TrashIcon } from './Icons';
// FIX: Import the `supabase` client to fix the 'Cannot find name' error.
// FIX: Corrected imported member names to match exports from supabaseService.
import {
    getWhiteboardItems,
    addWhiteboardItem,
    updateWhiteboardItem,
    deleteLiveWhiteboardItem,
    // FIX: Corrected imported member name from 'subscribeToLiveWhiteboard' to 'subscribeToLiveWhiteboardItems'.
    subscribeToLiveWhiteboardItems,
    supabase
} from '../services/supabaseService';

const Whiteboard: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // FIX: Changed state type from `WhiteboardItem[]` to `WhiteboardItemOld[]`.
    const [items, setItems] = useState<WhiteboardItemOld[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<WhiteboardTool>('pencil');
    const [color, setColor] = useState('#000000');
    const [strokeWidth, setStrokeWidth] = useState(5);
    
    // Fetch initial data and subscribe to changes
    useEffect(() => {
        const fetchAndSubscribe = async () => {
            const initialItems = await getWhiteboardItems();
            setItems(initialItems);

            // FIX: Use the new subscribeToLiveWhiteboardItems function and adapt callbacks for legacy component.
            const channel = subscribeToLiveWhiteboardItems(
                (newItem) => {
                    // This legacy component is not compatible with the new `WhiteboardItem` format
                    // from the real-time service. Ignoring insert/update events to prevent crashes.
                    // A refactor of this component is needed to fully support live updates.
                },
                (updatedItem) => {
                    // Ignoring update event due to type incompatibility. See comment above.
                },
                (deletedId) => {
                    // Delete event provides an ID which is compatible.
                    setItems(currentItems => currentItems.filter(item => item.id !== deletedId));
                }
            );

            return () => {
                supabase.removeChannel(channel);
            };
        };

        fetchAndSubscribe();
    }, []);

    // Redraw canvas when items change
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const resizeCanvas = () => {
            const container = canvas.parentElement;
            if (container) {
                canvas.width = container.clientWidth;
                canvas.height = 500;
                draw(ctx);
            }
        };

        const draw = (context: CanvasRenderingContext2D) => {
            context.clearRect(0, 0, context.canvas.width, context.canvas.height);
            items.forEach(item => {
                if (item.item_type === 'path') {
                    const path = item.data;
                    context.strokeStyle = path.color;
                    context.lineWidth = path.strokeWidth;
                    context.lineCap = 'round';
                    context.lineJoin = 'round';
                    context.beginPath();
                    path.points.forEach((point, index) => {
                        if (index === 0) context.moveTo(point.x, point.y);
                        else context.lineTo(point.x, point.y);
                    });
                    context.stroke();
                }
            });
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, [items]);

    const getMousePos = (e: React.MouseEvent): { x: number; y: number } => {
        const rect = canvasRef.current!.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (tool !== 'pencil' && tool !== 'eraser') return;
        setIsDrawing(true);
        const pos = getMousePos(e);
        // FIX: Removed `id` from the `DrawPath` object, as it is not a valid property.
        // The `id` is now correctly generated and assigned at the `WhiteboardItem` level.
        const newPath: DrawPath = {
            points: [pos],
            color: tool === 'eraser' ? '#FFFFFF' : color, // Assuming white background for eraser
            strokeWidth: tool === 'eraser' ? 20 : strokeWidth,
        };
        // FIX: Changed type annotation from `WhiteboardItem` to `WhiteboardItemOld` to resolve property error.
        const newItem: WhiteboardItemOld = { id: uuidv4(), item_type: 'path', data: newPath };
        setItems(prev => [...prev, newItem]);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDrawing) return;
        const pos = getMousePos(e);
        setItems(prev => {
            const newItems = [...prev];
            const currentItem = newItems[newItems.length - 1];
            if (currentItem && currentItem.item_type === 'path') {
                currentItem.data.points.push(pos);
            }
            return newItems;
        });
    };

    const handleMouseUp = async () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const lastItem = items[items.length - 1];
        if (lastItem) {
           await addWhiteboardItem({item_type: lastItem.item_type, data: lastItem.data});
        }
    };

    const addNote = async () => {
        // FIX: Removed `id` from the `StickyNote` object, as it is not a valid property.
        // The `id` for new notes is generated by the database.
        const newNote: StickyNote = {
            x: 50, y: 50,
            text: 'New Note',
            width: 150, height: 100,
        };
        await addWhiteboardItem({ item_type: 'note', data: newNote });
    };

    const handleNoteChange = (id: string, newText: string) => {
        setItems(prev => prev.map(item => {
            if (item.id === id && item.item_type === 'note') {
                return { ...item, data: { ...item.data, text: newText } };
            }
            return item;
        }));
    };

    const handleNoteBlur = async (id: string) => {
        const itemToUpdate = items.find(item => item.id === id);
        if(itemToUpdate) {
            await updateWhiteboardItem(itemToUpdate);
        }
    };
    
    const handleDeleteNote = async (id: string) => {
        // FIX: Use renamed delete function 'deleteLiveWhiteboardItem'.
        await deleteLiveWhiteboardItem(id);
    };

    return (
        <div className="bg-card-bg dark:bg-dark-card-bg p-6 rounded-xl shadow-md">
             <h2 className="text-xl font-bold mb-4">Collaborative Whiteboard</h2>
            <div className="flex items-center space-x-4 mb-4 p-2 rounded-lg bg-light-bg dark:bg-dark-bg border border-gray-200 dark:border-gray-700">
                {/* Toolbar */}
                <button title="Pencil" onClick={() => setTool('pencil')} className={`p-2 rounded-md ${tool === 'pencil' ? 'bg-primary text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}><PencilAltIcon /></button>
                <button title="Eraser" onClick={() => setTool('eraser')} className={`p-2 rounded-md ${tool === 'eraser' ? 'bg-primary text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}><EraserIcon /></button>
                <button title="Add Sticky Note" onClick={addNote} className={`p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600`}><DocumentAddIcon /></button>
                <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-8 h-8 cursor-pointer" disabled={tool === 'eraser'} />
                <input type="range" min="1" max="20" value={strokeWidth} onChange={e => setStrokeWidth(Number(e.target.value))} className="cursor-pointer" disabled={tool === 'eraser'} />
            </div>
            <div className="relative w-full h-[500px] bg-white dark:bg-gray-100 rounded-lg shadow-inner overflow-hidden cursor-crosshair">
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className="absolute top-0 left-0"
                />
                 {items.filter(item => item.item_type === 'note').map(noteItem => {
                    const note = noteItem.data as StickyNote;
                    return (
                        <div key={noteItem.id} style={{ position: 'absolute', left: note.x, top: note.y }}>
                             <textarea
                                value={note.text}
                                onChange={(e) => handleNoteChange(noteItem.id, e.target.value)}
                                onBlur={() => handleNoteBlur(noteItem.id)}
                                style={{
                                    width: `${note.width}px`,
                                    height: `${note.height}px`,
                                    backgroundColor: '#FFFACD',
                                    border: '1px solid #F0E68C',
                                    boxShadow: '2px 2px 5px rgba(0,0,0,0.2)',
                                    resize: 'both',
                                    overflow: 'hidden',
                                    fontFamily: 'sans-serif',
                                    fontSize: '14px',
                                    padding: '8px',
                                    color: '#333',
                                }}
                                className="cursor-move focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                             <button onClick={() => handleDeleteNote(noteItem.id)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 w-5 h-5 flex items-center justify-center text-xs">X</button>
                        </div>
                    )
                 })}
            </div>
        </div>
    );
};

export default Whiteboard;
