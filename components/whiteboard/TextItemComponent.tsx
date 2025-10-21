import React, { useRef, useEffect } from 'react';
import { TextItem, WhiteboardItem, AnchorPosition } from '../../types';
import { ResizeIcon, RotateIcon } from '../Icons';

interface TextItemComponentProps {
  textItem: TextItem;
  allItems: WhiteboardItem[];
  onUpdateState: (update: Partial<TextItem> & { id: string }) => void;
  onPersist: (id: string) => void;
  onDelete: (id: string) => void;
  onInteractionStart: (id: string) => void;
  isSelected: boolean;
  isEditing: boolean;
  onSetEditing: (id: string | null) => void;
  isConnecting: boolean;
  connectionStartId: string | null;
  onAnchorMouseDown: (itemId: string, anchor: AnchorPosition, e: React.MouseEvent) => void;
  onAnchorMouseUp: (itemId: string, anchor: AnchorPosition, e: React.MouseEvent) => void;
  scale: number;
  setGuideLines: React.Dispatch<React.SetStateAction<any[]>>;
  isReadOnly: boolean;
}

const ANCHORS: AnchorPosition[] = ['top', 'right', 'bottom', 'left'];

const TextItemComponent: React.FC<TextItemComponentProps> = ({
  textItem, allItems, onUpdateState, onPersist, onInteractionStart, isSelected, isEditing, onSetEditing,
  isConnecting, connectionStartId, onAnchorMouseDown, onAnchorMouseUp, scale, setGuideLines, isReadOnly
}) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isReadOnly || isEditing || e.button !== 0) return;
    e.stopPropagation();
    onInteractionStart(textItem.id);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startPosition = textItem.position;

    const otherItems = allItems.filter(i => i.id !== textItem.id);
    const snapThreshold = 6 / scale;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;
      
      const currentX = startPosition.x + dx;
      const currentY = startPosition.y + dy;

      const activeGuides: any[] = [];
      let closestSnapX = { dist: snapThreshold, pos: currentX };
      let closestSnapY = { dist: snapThreshold, pos: currentY };

      const draggedBounds = {
        left: currentX, right: currentX + textItem.width, top: currentY, bottom: currentY + textItem.height,
        hCenter: currentX + textItem.width / 2, vCenter: currentY + textItem.height / 2,
      };

      const startDistX = Math.abs(currentX - startPosition.x);
      if (startDistX < snapThreshold) {
          activeGuides.push({ type: 'v', x: startPosition.x, y1: startPosition.y, y2: currentY + textItem.height });
          if (startDistX < closestSnapX.dist) {
            closestSnapX = { dist: startDistX, pos: startPosition.x };
          }
      }
      const startDistY = Math.abs(currentY - startPosition.y);
      if (startDistY < snapThreshold) {
          activeGuides.push({ type: 'h', y: startPosition.y, x1: startPosition.x, x2: currentX + textItem.width });
          if (startDistY < closestSnapY.dist) {
            closestSnapY = { dist: startDistY, pos: startPosition.y };
          }
      }

      for (const other of otherItems) {
        const otherBounds = {
          left: other.position.x, right: other.position.x + other.width, top: other.position.y, bottom: other.position.y + other.height,
          hCenter: other.position.x + other.width / 2, vCenter: other.position.y + other.height / 2,
        };
        
        const draggedVerticals = { left: draggedBounds.left, hCenter: draggedBounds.hCenter, right: draggedBounds.right };
        const otherVerticals = { left: otherBounds.left, hCenter: otherBounds.hCenter, right: otherBounds.right };
        
        for (const [dKey, dVal] of Object.entries(draggedVerticals)) {
            for (const oVal of Object.values(otherVerticals)) {
                const dist = Math.abs(dVal - oVal);
                if (dist < snapThreshold) {
                    activeGuides.push({ type: 'v', x: oVal, y1: Math.min(draggedBounds.top, otherBounds.top), y2: Math.max(draggedBounds.bottom, otherBounds.bottom) });
                    if (dist < closestSnapX.dist) {
                        const offset = dKey === 'hCenter' ? textItem.width / 2 : (dKey === 'right' ? textItem.width : 0);
                        closestSnapX = { dist, pos: oVal - offset };
                    }
                }
            }
        }
        
        const draggedHorizontals = { top: draggedBounds.top, vCenter: draggedBounds.vCenter, bottom: draggedBounds.bottom };
        const otherHorizontals = { top: otherBounds.top, vCenter: otherBounds.vCenter, bottom: otherBounds.bottom };
        
        for (const [dKey, dVal] of Object.entries(draggedHorizontals)) {
            for (const oVal of Object.values(otherHorizontals)) {
                const dist = Math.abs(dVal - oVal);
                if (dist < snapThreshold) {
                    activeGuides.push({ type: 'h', y: oVal, x1: Math.min(draggedBounds.left, otherBounds.left), x2: Math.max(draggedBounds.right, otherBounds.right) });
                    if (dist < closestSnapY.dist) {
                        const offset = dKey === 'vCenter' ? textItem.height / 2 : (dKey === 'bottom' ? textItem.height : 0);
                        closestSnapY = { dist, pos: oVal - offset };
                    }
                }
            }
        }
      }

      if (otherItems.length >= 2) {
        for (let i = 0; i < otherItems.length; i++) {
          for (let j = i + 1; j < otherItems.length; j++) {
            const itemA = otherItems[i];
            const itemB = otherItems[j];
            
            const boundsA = { hCenter: itemA.position.x + itemA.width / 2, vCenter: itemA.position.y + itemA.height / 2, top: itemA.position.y, bottom: itemA.position.y + itemA.height, left: itemA.position.x, right: itemA.position.x + itemA.width };
            const boundsB = { hCenter: itemB.position.x + itemB.width / 2, vCenter: itemB.position.y + itemB.height / 2, top: itemB.position.y, bottom: itemB.position.y + itemB.height, left: itemB.position.x, right: itemB.position.x + itemB.width };
            
            const midX = (boundsA.hCenter + boundsB.hCenter) / 2;
            const distX = Math.abs(draggedBounds.hCenter - midX);
            if (distX < snapThreshold) {
                const y1 = Math.min(draggedBounds.top, boundsA.top, boundsB.top);
                const y2 = Math.max(draggedBounds.bottom, boundsA.bottom, boundsB.bottom);
                activeGuides.push({ type: 'v', x: midX, y1, y2 });
                if (distX < closestSnapX.dist) {
                    closestSnapX = { dist: distX, pos: midX - textItem.width / 2 };
                }
            }
            
            const midY = (boundsA.vCenter + boundsB.vCenter) / 2;
            const distY = Math.abs(draggedBounds.vCenter - midY);
            if (distY < snapThreshold) {
                const x1 = Math.min(draggedBounds.left, boundsA.left, boundsB.left);
                const x2 = Math.max(draggedBounds.right, boundsA.right, boundsB.right);
                activeGuides.push({ type: 'h', y: midY, x1, x2 });
                if (distY < closestSnapY.dist) {
                    closestSnapY = { dist: distY, pos: midY - textItem.height / 2 };
                }
            }
          }
        }
      }
      
      const finalX = closestSnapX.pos;
      const finalY = closestSnapY.pos;

      const uniqueGuides = activeGuides.filter((guide, index, self) =>
          index === self.findIndex(g => g.type === guide.type && (g.type === 'v' ? g.x === guide.x : g.y === guide.y))
      );
      
      setGuideLines(uniqueGuides);
      onUpdateState({ id: textItem.id, position: { x: finalX, y: finalY } });
    };

    const handleMouseUp = () => {
      setGuideLines([]);
      onPersist(textItem.id);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };
  
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (isReadOnly) return;
    e.stopPropagation();
    onInteractionStart(textItem.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = textItem.width;
    const startHeight = textItem.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      onUpdateState({ id: textItem.id, width: Math.max(50, startWidth + dx / scale), height: Math.max(30, startHeight + dy / scale) });
    };

    const handleMouseUp = () => {
      onPersist(textItem.id);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleRotateMouseDown = (e: React.MouseEvent) => {
    if (isReadOnly) return;
    e.stopPropagation();
    onInteractionStart(textItem.id);

    const itemNode = itemRef.current;
    if (!itemNode) return;
    
    const rect = itemNode.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    const startRotation = textItem.rotation || 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentAngle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
      const angleDiff = currentAngle - startAngle;
      
      const newRotationDegrees = startRotation + (angleDiff * 180 / Math.PI);
      const snappedRotation = Math.round(newRotationDegrees / 15) * 15;
      
      onUpdateState({ id: textItem.id, rotation: snappedRotation });
    };

    const handleMouseUp = () => {
      onPersist(textItem.id);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateState({ id: textItem.id, text: e.target.value });
  };
  
  const handleTextareaMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const renderTextContent = () => {
    if (!textItem.text) return 'Añadir texto...';
    const { listStyle } = textItem.style;
    if (listStyle && listStyle !== 'none') {
        const lines = textItem.text.split('\n');
        const ListTag = listStyle === 'bullet' ? 'ul' : 'ol';
        const listClassName = listStyle === 'bullet' ? 'list-disc' : 'list-decimal';
        return (
            <ListTag className={`${listClassName} list-inside`}>
                {lines.map((line, i) => <li key={i}>{line || ' '}</li>)}
            </ListTag>
        );
    }
    return textItem.text;
  };

  return (
    <div
      ref={itemRef}
      style={{
        transform: `translate(${textItem.position.x}px, ${textItem.position.y}px) rotate(${textItem.rotation || 0}deg)`,
        width: `${textItem.width}px`,
        height: `${textItem.height}px`,
        zIndex: textItem.zIndex,
      }}
      className={`absolute select-none group flex flex-col p-2 ${!isReadOnly && !isEditing ? 'cursor-move' : ''} ${isSelected ? 'outline-2 outline-dashed outline-brand-primary' : ''}`}
      onMouseDown={handleMouseDown}
      onDoubleClick={() => !isReadOnly && onSetEditing(textItem.id)}
    >
      {isEditing ? (
        <textarea
            ref={textareaRef}
            value={textItem.text}
            onChange={handleTextChange}
            onBlur={() => onSetEditing(null)}
            onMouseDown={handleTextareaMouseDown}
            style={{ ...textItem.style, background: 'rgba(100, 116, 139, 0.1)' }}
            className="w-full h-full border-none outline-none resize-none cursor-text"
        />
      ) : (
        <div
            style={textItem.style}
            className={`w-full h-full break-words pointer-events-none flex items-center justify-center ${textItem.style.listStyle && textItem.style.listStyle !== 'none' ? 'text-left' : 'text-center'}`}
        >
            {renderTextContent()}
        </div>
      )}

      {isConnecting && connectionStartId !== textItem.id && !isReadOnly && ANCHORS.map(anchor => (
        <div
          key={anchor}
          className="absolute w-3 h-3 bg-blue-500 rounded-full border-2 border-white cursor-pointer hover:scale-125 transition-transform"
          style={{
            top: anchor === 'top' ? '-6px' : anchor === 'bottom' ? 'calc(100% - 6px)' : 'calc(50% - 6px)',
            left: anchor === 'left' ? '-6px' : anchor === 'right' ? 'calc(100% - 6px)' : 'calc(50% - 6px)',
          }}
          onMouseDown={(e) => onAnchorMouseDown(textItem.id, anchor, e)}
          onMouseUp={(e) => onAnchorMouseUp(textItem.id, anchor, e)}
        />
      ))}

      {isSelected && !isConnecting && !isReadOnly && (
        <>
          <div
            className="absolute -bottom-2 -right-2 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseDown={handleResizeMouseDown}
          >
            <ResizeIcon className="h-5 w-5 text-brand-primary bg-white rounded-full p-0.5" />
          </div>
          <div
            className="absolute -top-6 left-1/2 -translate-x-1/2 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity active:cursor-grabbing"
            onMouseDown={handleRotateMouseDown}
          >
            <RotateIcon className="h-5 w-5 text-brand-primary bg-white rounded-full p-0.5" />
          </div>
        </>
      )}
    </div>
  );
};

export default TextItemComponent;
