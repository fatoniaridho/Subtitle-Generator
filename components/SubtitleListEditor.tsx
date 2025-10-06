import React from 'react';
import { Subtitle } from '../types';

interface SubtitleListEditorProps {
    subtitles: Subtitle[];
    onUpdate: (updatedSubtitle: Subtitle) => void;
    activeSubtitleId: number | null;
}

export const SubtitleListEditor: React.FC<SubtitleListEditorProps> = ({ subtitles, onUpdate, activeSubtitleId }) => {

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>, sub: Subtitle, field: 'start' | 'end') => {
        const value = e.target.value;
        // Basic validation for HH:MM:SS.ms format (or parts of it)
        if (/^(\d{2}:)?\d{2}:\d{2}(\.\d{1,3})?$/.test(value)) {
            const parts = value.split(':');
            const secondsAndMs = parts.pop()!.split('.');
            const seconds = parseInt(secondsAndMs[0], 10);
            const ms = parseInt(secondsAndMs[1] || '0', 10);
            const minutes = parseInt(parts.pop() || '0', 10);
            const hours = parseInt(parts.pop() || '0', 10);
            const totalSeconds = hours * 3600 + minutes * 60 + seconds + ms / 1000;
            onUpdate({ ...sub, [field]: totalSeconds });
        } else { // Or just seconds
            const numericValue = parseFloat(value);
            if (!isNaN(numericValue)) {
                onUpdate({ ...sub, [field]: numericValue });
            }
        }
    };
    
    const formatTimeForInput = (time: number) => {
        return new Date(time * 1000).toISOString().substr(11, 12);
    }

    return (
        <ul className="space-y-4">
            {subtitles.map(sub => (
                <li key={sub.id} className={`p-3 rounded-md transition-colors duration-300 ${activeSubtitleId === sub.id ? 'bg-indigo-600/40 ring-2 ring-indigo-400' : 'bg-gray-900/70'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <input
                            type="text"
                            value={formatTimeForInput(sub.start)}
                            onChange={(e) => handleTimeChange(e, sub, 'start')}
                            className="w-full bg-gray-800 text-indigo-300 font-mono text-sm p-1 rounded border border-gray-700 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            title="Start Time (HH:MM:SS.ms)"
                        />
                        <span className="text-gray-500">→</span>
                        <input
                            type="text"
                            value={formatTimeForInput(sub.end)}
                             onChange={(e) => handleTimeChange(e, sub, 'end')}
                             className="w-full bg-gray-800 text-indigo-300 font-mono text-sm p-1 rounded border border-gray-700 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                             title="End Time (HH:MM:SS.ms)"
                        />
                    </div>
                    <textarea
                        value={sub.text}
                        onChange={(e) => onUpdate({ ...sub, text: e.target.value })}
                        className="w-full bg-gray-800 text-gray-300 text-sm p-2 rounded border border-gray-700 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        rows={2}
                    />
                </li>
            ))}
        </ul>
    );
};
