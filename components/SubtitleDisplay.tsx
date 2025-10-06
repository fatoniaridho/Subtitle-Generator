import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Subtitle } from '../types';

interface SubtitleDisplayProps {
  subtitle: Subtitle;
  isEditing?: boolean;
  onUpdate: (subtitle: Subtitle) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  currentTime: number;
  aspectRatio: 'landscape' | 'portrait';
}

export const SubtitleDisplay: React.FC<SubtitleDisplayProps> = ({ subtitle, isEditing = false, onUpdate, containerRef, currentTime, aspectRatio }) => {
  if (!subtitle) return null;

  const [isTextEditing, setIsTextEditing] = useState(false);
  const [editedText, setEditedText] = useState(subtitle.text);
  
  // Refined drag types to differentiate between side and corner resizing
  type DragType = 
    | 'position' 
    | 'resize-side-start' 
    | 'resize-side-end' 
    | 'resize-corner-start' 
    | 'resize-corner-end';

  const [dragState, setDragState] = useState<{
    type: DragType,
    initialY: number,
    initialLine: number,
    initialX: number,
    initialWidth: number 
  } | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    setEditedText(subtitle.text);
    if(isTextEditing){
        setIsTextEditing(false);
    }
  }, [subtitle]);

  useEffect(() => {
    if (isTextEditing) {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }
  }, [isTextEditing]);

  const handleTextDoubleClick = () => {
    if (!isEditing) return;
    setIsTextEditing(true);
  };
  
  const handleTextBlur = () => {
    setIsTextEditing(false);
    if (editedText.trim() !== subtitle.text && editedText.trim() !== "") {
      onUpdate({ ...subtitle, text: editedText.trim() });
    } else {
      setEditedText(subtitle.text);
    }
  };

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        textareaRef.current?.blur();
    }
    if (e.key === 'Escape') {
        e.preventDefault();
        setEditedText(subtitle.text);
        setIsTextEditing(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, type: DragType) => {
    if (!isEditing || isTextEditing) return;
    e.preventDefault();
    e.stopPropagation();
    
    const defaultWidth = aspectRatio === 'landscape' ? 80 : 90;

    setDragState({
        type,
        initialY: e.clientY,
        initialLine: subtitle.line ?? 90,
        initialX: e.clientX,
        initialWidth: subtitle.width ?? defaultWidth,
    });
  };
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState || !containerRef.current) return;

    const newSubtitle = { ...subtitle };

    if (dragState.type === 'position') {
        const deltaY = e.clientY - dragState.initialY;
        const containerHeight = containerRef.current.offsetHeight;
        const lineDelta = (deltaY / containerHeight) * 100;
        let newLine = dragState.initialLine + lineDelta;
        newSubtitle.line = Math.max(0, Math.min(95, newLine));
    } else { // This is a resize operation
        const containerWidth = containerRef.current.offsetWidth;
        const deltaX = e.clientX - dragState.initialX;
        const deltaWidth = (deltaX / containerWidth) * 100;
        
        let newWidth = dragState.initialWidth;
        
        if (dragState.type.endsWith('-end')) {
            newWidth += deltaWidth;
        } else { // ends with '-start'
            newWidth -= deltaWidth;
        }
        newSubtitle.width = Math.max(10, Math.min(100, newWidth));

        // Conditionally adjust font size ONLY for corner drags
        if (dragState.type.startsWith('resize-corner')) {
            const baseWidth = aspectRatio === 'landscape' ? 80 : 90; // Default width
            const baseFontSize = 2.5; // Base font size in vh
            let newFontSize = baseFontSize * (newSubtitle.width / baseWidth);
            newSubtitle.fontSize = Math.max(1, Math.min(6, newFontSize)); // Clamp font size
        }
        // For 'resize-side', font size is not changed, allowing text to wrap naturally.
    }
    onUpdate(newSubtitle);
  }, [dragState, onUpdate, subtitle, containerRef, aspectRatio]);


  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  useEffect(() => {
    if (dragState) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp, { once: true });
    }
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, handleMouseMove, handleMouseUp]);
  
  const renderSubtitleText = () => {
    // Karaoke effect is disabled during text editing for a better UX.
    if (!subtitle.words || subtitle.words.length === 0 || isTextEditing) {
        return subtitle.text;
    }
    
    // Simpler, more performant karaoke effect.
    // Active word is yellow, past words are gray, future words are white.
    return subtitle.words.map((word, index) => {
        const isCurrent = currentTime >= word.start && currentTime < word.end;
        const isPast = currentTime >= word.end;

        let className = 'text-white transition-colors duration-100';
        if (isCurrent) {
            className = 'text-yellow-300 font-bold';
        } else if (isPast) {
            className = 'text-gray-400';
        }

        return <span key={index} className={className}>{word.word}{' '}</span>;
    });
  };
  
  const defaultWidth = aspectRatio === 'landscape' ? 80 : 90;
  const line = subtitle.line ?? 90;
  const width = subtitle.width ?? defaultWidth;
  const fontSize = subtitle.fontSize ?? 2.5;
  
  return (
    <div 
        className={`absolute left-1/2 text-center group z-30 ${isEditing && !isTextEditing ? 'cursor-move' : ''}`}
        style={{ 
            top: `${line}%`,
            transform: 'translate(-50%, -50%)',
            width: `${width}%`,
            pointerEvents: isEditing ? 'auto' : 'none',
        }}
        onMouseDown={(e) => handleMouseDown(e, 'position')}
    >
        {isEditing && !isTextEditing && (
            <>
              {/* Side handles */}
              <div 
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full w-2 h-8 bg-indigo-500 rounded-sm cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
                onMouseDown={(e) => handleMouseDown(e, 'resize-side-start')}
              />
              <div 
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full w-2 h-8 bg-indigo-500 rounded-sm cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
                onMouseDown={(e) => handleMouseDown(e, 'resize-side-end')}
              />
              {/* Corner handles */}
               <div
                  className="absolute top-0 left-0 w-3 h-3 -translate-x-1/2 -translate-y-1/2 bg-indigo-500 rounded-full cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity"
                  onMouseDown={(e) => handleMouseDown(e, 'resize-corner-start')}
              />
              <div
                  className="absolute top-0 right-0 w-3 h-3 translate-x-1/2 -translate-y-1/2 bg-indigo-500 rounded-full cursor-nesw-resize opacity-0 group-hover:opacity-100 transition-opacity"
                  onMouseDown={(e) => handleMouseDown(e, 'resize-corner-end')}
              />
              <div
                  className="absolute bottom-0 left-0 w-3 h-3 -translate-x-1/2 translate-y-1/2 bg-indigo-500 rounded-full cursor-nesw-resize opacity-0 group-hover:opacity-100 transition-opacity"
                  onMouseDown={(e) => handleMouseDown(e, 'resize-corner-start')}
              />
              <div
                  className="absolute bottom-0 right-0 w-3 h-3 translate-x-1/2 translate-y-1/2 bg-indigo-500 rounded-full cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity"
                  onMouseDown={(e) => handleMouseDown(e, 'resize-corner-end')}
              />
            </>
        )}

      {isTextEditing ? (
            <textarea
                ref={textareaRef}
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                onBlur={handleTextBlur}
                onKeyDown={handleTextKeyDown}
                className="w-full font-semibold text-white bg-black/80 rounded-lg px-4 py-2 shadow-lg outline-none ring-2 ring-indigo-500 resize-none pointer-events-auto"
                style={{ 
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                  fontSize: `${fontSize}vh`
                }}
             />
      ) : (
            <p 
                className="font-semibold text-white bg-black/60 rounded-lg px-4 py-2 inline-block shadow-lg"
                style={{ 
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                  fontSize: `${fontSize}vh`
                }}
                onDoubleClick={handleTextDoubleClick}
            >
                {renderSubtitleText()}
            </p>
      )}
    </div>
  );
};