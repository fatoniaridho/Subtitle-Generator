import React, { forwardRef } from 'react';

interface VideoPlayerProps {
  src: string;
  onLoadedMetadata: (duration: number) => void;
}

export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(({ src, onLoadedMetadata }, ref) => {
  const handleLoadedMetadataEvent = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    onLoadedMetadata(e.currentTarget.duration);
  }

  return (
    <video
      ref={ref}
      src={src}
      controls
      onLoadedMetadata={handleLoadedMetadataEvent}
      className="w-full h-full object-contain"
      crossOrigin="anonymous"
    />
  );
});

VideoPlayer.displayName = 'VideoPlayer';