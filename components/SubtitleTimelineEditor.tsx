import React, { useRef, useState, useEffect } from 'react';
import { Subtitle } from '../types';

interface SubtitleTimelineEditorProps {
    subtitles: Subtitle[];
    onUpdate: (updatedSubtitle: Subtitle) => void;
    duration: number;
    currentTime: number;
    onSeek: (time: number) => void;
    selectedCueId: number | null;
    onSelectCue: (id: number) => void;
}

type DragState = {
    type: 'move' | 'resize-start' | 'resize-end';
    id: number;
    initialX: number;
    initialStart: number;
    initialEnd: number;
} | null;

export const SubtitleTimelineEditor: React.FC<SubtitleTimelineEditorProps> = ({ subtitles, onUpdate, duration, currentTime, onSeek, selectedCueId, onSelectCue }) => {
    const timelineRef = useRef<HTMLDivElement>(null);
    const [dragging, setDragging] = useState<DragState>(null);
    const [timelineWidth, setTimelineWidth] = useState(0);

    useEffect(() => {
        const updateWidth = () => {
            if (timelineRef.current) {
                setTimelineWidth(timelineRef.current.offsetWidth);
            }
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    const pxToTime = (px: number) => (px / timelineWidth) * duration;
    const timeToPx = (time: number) => (time / duration) * timelineWidth;

    const handleMouseDown = (e: React.MouseEvent, type: 'move' | 'resize-start' | 'resize-end', sub: Subtitle) => {
        e.stopPropagation();
        onSelectCue(sub.id);
        setDragging({
            type,
            id: sub.id,
            initialX: e.clientX,
            initialStart: sub.start,
            initialEnd: sub.end,
        });
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!dragging) return;

            const deltaX = e.clientX - dragging.initialX;
            const deltaTime = pxToTime(deltaX);
            let { initialStart, initialEnd } = dragging;
            let newStart = initialStart;
            let newEnd = initialEnd;

            if (dragging.type === 'move') {
                newStart = initialStart + deltaTime;
                newEnd = initialEnd + deltaTime;
            } else if (dragging.type === 'resize-start') {
                newStart = initialStart + deltaTime;
            } else if (dragging.type === 'resize-end') {
                newEnd = initialEnd + deltaTime;
            }

            // Clamp values
            if (newStart < 0) {
                if(dragging.type === 'move') newEnd -= newStart;
                newStart = 0;
            }
            if (newEnd > duration) {
                if(dragging.type === 'move') newStart -= (newEnd - duration);
                newEnd = duration;
            }
            if (newStart >= newEnd) {
                 if(dragging.type === 'resize-start') newStart = newEnd - 0.01;
                 else newEnd = newStart + 0.01;
            }

            onUpdate({ id: dragging.id, start: newStart, end: newEnd, text: subtitles.find(s=>s.id === dragging.id)!.text });
        };

        const handleMouseUp = () => {
            setDragging(null);
        };

        if (dragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragging, onUpdate, subtitles, duration, timelineWidth]);

    const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        onSeek(pxToTime(clickX));
    }

    return (
        <div className="bg-gray-900/70 p-4 rounded-lg shadow-inner space-y-2 select-none">
            <div ref={timelineRef} className="relative w-full h-24 bg-gray-800 rounded-md cursor-pointer" onClick={handleTimelineClick}>
                {/* Playhead */}
                <div
                    className="absolute top-0 left-0 w-0.5 h-full bg-indigo-400 z-20 pointer-events-none"
                    style={{ transform: `translateX(${timeToPx(currentTime)}px)` }}
                />

                {/* Cues */}
                {subtitles.map(sub => {
                    const left = timeToPx(sub.start);
                    const width = timeToPx(sub.end - sub.start);
                    const isSelected = sub.id === selectedCueId;
                    return (
                        <div
                            key={sub.id}
                            className={`absolute top-1/2 -translate-y-1/2 h-16 rounded-md flex items-center justify-center p-2 text-xs text-white transition-all duration-150 ${isSelected ? 'bg-indigo-600 ring-2 ring-indigo-300 z-10' : 'bg-indigo-800/80 hover:bg-indigo-700'}`}
                            style={{ left: `${left}px`, width: `${width}px` }}
                            onMouseDown={(e) => handleMouseDown(e, 'move', sub)}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="absolute left-0 top-0 h-full w-2 cursor-ew-resize" onMouseDown={(e) => handleMouseDown(e, 'resize-start', sub)} />
                            <p className="truncate pointer-events-none">{sub.text}</p>
                            <div className="absolute right-0 top-0 h-full w-2 cursor-ew-resize" onMouseDown={(e) => handleMouseDown(e, 'resize-end', sub)} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
