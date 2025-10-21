import React, { useRef, useEffect } from 'react';
import { FlowchartShape, WhiteboardItem, AnchorPosition, Point } from '../../types';
import { ResizeIcon, RotateIcon } from '../Icons';

interface FlowchartShapeComponentProps {
  shape: FlowchartShape;
  allItems: WhiteboardItem[];
  onUpdateState: (update: Partial<FlowchartShape> & { id: string }) => void;
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

const FlowchartShapeComponent: React.FC<FlowchartShapeComponentProps> = ({
  shape, allItems, onUpdateState, onPersist, onInteractionStart, isSelected, isEditing, onSetEditing,
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
    onInteractionStart(shape.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const startPosition = shape.position;

    const otherItems = allItems.filter(i => i.id !== shape.id);
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
        left: currentX, right: currentX + shape.width, top: currentY, bottom: currentY + shape.height,
        hCenter: currentX + shape.width / 2, vCenter: currentY + shape.height / 2,
      };
      
      // Orthogonal snapping (treat start position as a snap target)
      const startDistX = Math.abs(currentX - startPosition.x);
      if (startDistX < snapThreshold) {
          activeGuides.push({ type: 'v', x: startPosition.x, y1: startPosition.y, y2: currentY + shape.height });
          if (startDistX < closestSnapX.dist) {
            closestSnapX = { dist: startDistX, pos: startPosition.x };
          }
      }
      const startDistY = Math.abs(currentY - startPosition.y);
      if (startDistY < snapThreshold) {
          activeGuides.push({ type: 'h', y: startPosition.y, x1: startPosition.x, x2: currentX + shape.width });
          if (startDistY < closestSnapY.dist) {
            closestSnapY = { dist: startDistY, pos: startPosition.y };
          }
      }
      
      // Snapping to other items
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
                        const offset = dKey === 'hCenter' ? shape.width / 2 : (dKey === 'right' ? shape.width : 0);
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
                        const offset = dKey === 'vCenter' ? shape.height / 2 : (dKey === 'bottom' ? shape.height : 0);
                        closestSnapY = { dist, pos: oVal - offset };
                    }
                }
            }
        }
      }

      // Snapping to the midpoint between two other items
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
                    closestSnapX = { dist: distX, pos: midX - shape.width / 2 };
                }
            }
            
            const midY = (boundsA.vCenter + boundsB.vCenter) / 2;
            const distY = Math.abs(draggedBounds.vCenter - midY);
            if (distY < snapThreshold) {
                const x1 = Math.min(draggedBounds.left, boundsA.left, boundsB.left);
                const x2 = Math.max(draggedBounds.right, boundsA.right, boundsB.right);
                activeGuides.push({ type: 'h', y: midY, x1, x2 });
                if (distY < closestSnapY.dist) {
                    closestSnapY = { dist: distY, pos: midY - shape.height / 2 };
                }
            }
          }
        }
      }

      const finalX = closestSnapX.pos;
      const finalY = closestSnapY.pos;
      
      const uniqueGuides = activeGuides.filter((guide, index, self) =>
          index === self.findIndex(g =>
              g.type === guide.type &&
              (g.type === 'v' ? g.x === guide.x : g.y === guide.y)
          )
      );

      setGuideLines(uniqueGuides);
      onUpdateState({ id: shape.id, position: { x: finalX, y: finalY } });
    };

    const handleMouseUp = () => {
      setGuideLines([]);
      onPersist(shape.id);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (isReadOnly) return;
    e.stopPropagation();
    onInteractionStart(shape.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = shape.width;
    const startHeight = shape.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      onUpdateState({ id: shape.id, width: Math.max(50, startWidth + dx / scale), height: Math.max(50, startHeight + dy / scale) });
    };

    const handleMouseUp = () => {
      onPersist(shape.id);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };
  
  const handleRotateMouseDown = (e: React.MouseEvent) => {
    if (isReadOnly) return;
    e.stopPropagation();
    onInteractionStart(shape.id);

    const itemNode = itemRef.current;
    if (!itemNode) return;
    
    const rect = itemNode.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    const startRotation = shape.rotation || 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentAngle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
      const angleDiff = currentAngle - startAngle;
      
      const newRotationDegrees = startRotation + (angleDiff * 180 / Math.PI);
      const snappedRotation = Math.round(newRotationDegrees / 45) * 45;
      
      onUpdateState({ id: shape.id, rotation: snappedRotation });
    };

    const handleMouseUp = () => {
      onPersist(shape.id);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateState({ id: shape.id, text: e.target.value });
  };

  const handleTextareaMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  const renderTextContent = () => {
    if (!shape.text) return null;
    const { listStyle } = shape.style;
    if (listStyle && listStyle !== 'none') {
        const lines = shape.text.split('\n');
        const ListTag = listStyle === 'bullet' ? 'ul' : 'ol';
        const listClassName = listStyle === 'bullet' ? 'list-disc' : 'list-decimal';
        return (
            <ListTag className={`${listClassName} list-inside text-left w-full`}>
                {lines.map((line, i) => <li key={i}>{line || ' '}</li>)}
            </ListTag>
        );
    }
    return shape.text;
  };

  const renderShape = () => {
    const commonProps = {
      width: "100%",
      height: "100%",
      fill: shape.fillColor,
      stroke: "#111827",
      strokeWidth: 2,
    };
    const w = shape.width;
    const h = shape.height;

    switch (shape.type) {
      case 'rectangle':
        return <rect {...commonProps} rx={4} />;
      case 'oval':
        return <ellipse {...commonProps} cx={w/2} cy={h/2} rx={w/2 - 1} ry={h/2 - 1} />;
      case 'diamond':
        return <polygon {...commonProps} points={`${w/2},1 1,${h/2} ${w/2},${h-1} ${w-1},${h/2}`} />;
      case 'parallelogram':
        const skew = Math.min(20, w / 4);
        return <polygon {...commonProps} points={`${skew},1 ${w-1},1 ${w-1-skew},${h-1} 1,${h-1}`} />;
      case 'predefined-process':
        return (
          <g>
            <rect {...commonProps} rx={4} />
            <line x1={10} y1={1} x2={10} y2={h-1} stroke="#111827" strokeWidth={1} />
            <line x1={w-10} y1={1} x2={w-10} y2={h-1} stroke="#111827" strokeWidth={1} />
          </g>
        );
      case 'document':
        const waveHeight = Math.min(20, h / 4);
        const d = `M1,1 H${w-1} V${h - waveHeight} Q${w/2},${h} 1,${h-waveHeight} Z`;
        return <path {...commonProps} d={d} />;
      case 'database':
        const rx = w / 2 - 1;
        const ry = Math.min(15, h / 4);
        const topCy = ry + 1;
        const bottomCy = h - ry - 1;
        const dbPath = `
          M 1,${topCy}
          L 1,${bottomCy}
          A ${rx},${ry} 0 0 0 ${w-1},${bottomCy}
          L ${w-1},${topCy}
          A ${rx},${ry} 0 0 1 1,${topCy}
          M 1,${topCy}
          A ${rx},${ry} 0 0 0 ${w-1},${topCy}
        `;
        return <path {...commonProps} d={dbPath} />;
      case 'connector-circle':
        return <circle {...commonProps} cx={w/2} cy={h/2} r={w/2 - 1} />;
    }
  };

  return (
    <div
      ref={itemRef}
      style={{
        transform: `translate(${shape.position.x}px, ${shape.position.y}px) rotate(${shape.rotation || 0}deg)`,
        width: `${shape.width}px`,
        height: `${shape.height}px`,
        zIndex: shape.zIndex,
      }}
      className={`absolute select-none group ${!isReadOnly && !isEditing ? 'cursor-move' : ''} ${isSelected ? 'outline-2 outline-dashed outline-brand-primary' : ''}`}
      onMouseDown={handleMouseDown}
      onDoubleClick={() => !isReadOnly && onSetEditing(shape.id)}
    >
      <div className="w-full h-full relative">
        <svg className="w-full h-full absolute">{renderShape()}</svg>
        <div className="w-full h-full p-2 flex items-center justify-center absolute">
            {isEditing ? (
            <textarea
                ref={textareaRef}
                value={shape.text}
                onChange={handleTextChange}
                onBlur={() => onSetEditing(null)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSetEditing(null); } }}
                onMouseDown={handleTextareaMouseDown} // Important fix here
                style={{
                ...shape.style,
                textAlign: 'center',
                background: 'rgba(255,255,255,0.7)',
                }}
                className="w-full h-full border-none outline-none resize-none"
            />
            ) : (
            <div
                style={shape.style}
                className={`break-words pointer-events-none ${shape.style.listStyle && shape.style.listStyle !== 'none' ? '' : 'text-center'}`}
            >
                {renderTextContent()}
            </div>
            )}
        </div>
      </div>

      {isConnecting && connectionStartId !== shape.id && !isReadOnly && ANCHORS.map(anchor => (
        <div
          key={anchor}
          className="absolute w-3 h-3 bg-blue-500 rounded-full border-2 border-white cursor-pointer hover:scale-125 transition-transform"
          style={{
            top: anchor === 'top' ? '-6px' : anchor === 'bottom' ? 'calc(100% - 6px)' : 'calc(50% - 6px)',
            left: anchor === 'left' ? '-6px' : anchor === 'right' ? 'calc(100% - 6px)' : 'calc(50% - 6px)',
          }}
          onMouseDown={(e) => onAnchorMouseDown(shape.id, anchor, e)}
          onMouseUp={(e) => onAnchorMouseUp(shape.id, anchor, e)}
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

export default FlowchartShapeComponent;
