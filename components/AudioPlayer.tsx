import React, { forwardRef } from 'react';

interface AudioPlayerProps {
  src: string;
  onLoadedMetadata: (duration: number) => void;
  // FIX: Add optional standalone prop to fix type error in App.tsx.
  standalone?: boolean;
}

export const AudioPlayer = forwardRef<HTMLAudioElement, AudioPlayerProps>(({ src, onLoadedMetadata }, ref) => {
  const handleLoadedMetadataEvent = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    onLoadedMetadata(e.currentTarget.duration);
  }

  return (
    <audio
      ref={ref}
      src={src}
      controls
      onLoadedMetadata={handleLoadedMetadataEvent}
      className="w-full"
    />
  );
});

AudioPlayer.displayName = 'AudioPlayer';