import React, { useEffect, useState } from 'react';
import { Subtitle } from '../types';

interface CueTextEditorProps {
    subtitle: Subtitle | null;
    onUpdate: (updatedSubtitle: Subtitle) => void;
}

export const CueTextEditor: React.FC<CueTextEditorProps> = ({ subtitle, onUpdate }) => {
    const [localSubtitle, setLocalSubtitle] = useState<Subtitle | null>(subtitle);

    useEffect(() => {
        setLocalSubtitle(subtitle);
    }, [subtitle]);

    if (!localSubtitle) {
        return (
            <div className="flex items-center justify-center h-full text-center text-gray-500">
                <p>Select a cue on the timeline below to edit its text and timing.</p>
            </div>
        );
    }

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'start' | 'end') => {
        const value = e.target.value;
        const parts = value.split(':');
        const secondsAndMs = parts[parts.length - 1].split('.');
        
        try {
            const hours = parts.length > 2 ? parseInt(parts[0], 10) : 0;
            const minutes = parts.length > 1 ? parseInt(parts[parts.length - 2], 10) : 0;
            const seconds = parseInt(secondsAndMs[0], 10);
            const ms = parseInt(secondsAndMs[1] || '0', 10);
            
            if (isNaN(hours) || isNaN(minutes) || isNaN(seconds) || isNaN(ms)) return;

            const totalSeconds = hours * 3600 + minutes * 60 + seconds + ms / 1000;
            const updatedSubtitle = { ...localSubtitle, [field]: totalSeconds };
            setLocalSubtitle(updatedSubtitle);
            onUpdate(updatedSubtitle);
        } catch(error) {
            console.error("Invalid time format", error);
        }
    };
    
    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const updatedSubtitle = { ...localSubtitle, text: e.target.value };
        setLocalSubtitle(updatedSubtitle);
        onUpdate(updatedSubtitle);
    };

    const formatTimeForInput = (time: number) => {
        return new Date(time * 1000).toISOString().substr(11, 12);
    }

    return (
        <div className="space-y-4">
            <div className="p-3 rounded-md bg-gray-900/70">
                <div className="flex items-center gap-2 mb-2">
                    <input
                        type="text"
                        value={formatTimeForInput(localSubtitle.start)}
                        onChange={(e) => handleTimeChange(e, 'start')}
                        className="w-full bg-gray-800 text-indigo-300 font-mono text-sm p-2 rounded border border-gray-700 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        title="Start Time (HH:MM:SS.ms)"
                    />
                    <span className="text-gray-500">→</span>
                    <input
                        type="text"
                        value={formatTimeForInput(localSubtitle.end)}
                         onChange={(e) => handleTimeChange(e, 'end')}
                         className="w-full bg-gray-800 text-indigo-300 font-mono text-sm p-2 rounded border border-gray-700 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                         title="End Time (HH:MM:SS.ms)"
                    />
                </div>
                <textarea
                    value={localSubtitle.text}
                    onChange={handleTextChange}
                    className="w-full bg-gray-800 text-gray-300 text-sm p-2 rounded border border-gray-700 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    rows={5}
                />
            </div>
        </div>
    );
};
