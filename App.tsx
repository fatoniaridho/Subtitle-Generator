
import React, { useState, useRef, useEffect } from 'react';
import { Subtitle, Progress, Word } from './types';
import { generateSubtitlesFromVideo, generateSubtitlesFromAudio } from './services/geminiService';
import { generateVttContent, generateSrtContent, downloadFile, assembleSubtitlesFromWords } from './utils/formatters';
import { FileUpload } from './components/FileUpload';
import { VideoPlayer } from './components/VideoPlayer';
import { AudioPlayer } from './components/AudioPlayer';
import { SubtitleDisplay } from './components/SubtitleDisplay';
import { SubtitleTimelineEditor } from './components/SubtitleTimelineEditor';
import { CueTextEditor } from './components/CueTextEditor';
import { DownloadIcon, SparklesIcon, MusicIcon, LandscapeIcon, PortraitIcon, EditIcon } from './components/Icons';

type MediaType = 'video' | 'audio' | null;
type AspectRatio = 'landscape' | 'portrait';

const App: React.FC = () => {
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaSrc, setMediaSrc] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType>(null);

  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState<Subtitle | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<Progress>({ processed: 0, total: 0 });
  
  const [previewAspectRatio, setPreviewAspectRatio] = useState<AspectRatio>('landscape');

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [originalSubtitles, setOriginalSubtitles] = useState<Subtitle[]>([]);
  const [selectedCueId, setSelectedCueId] = useState<number | null>(null);
  
  const [mediaDuration, setMediaDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);

  const mediaRef = useRef<HTMLVideoElement & HTMLAudioElement>(null);
  const mediaContainerRef = useRef<HTMLDivElement>(null);
  // FIX: Initialize useRef with null to provide an initial value and fix type error.
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const mediaElement = mediaRef.current;
    if (!mediaElement) return;

    const loop = () => {
        if (mediaElement.paused || mediaElement.ended) {
            return;
        }
        
        const time = mediaElement.currentTime;
        setCurrentTime(time);

        setActiveSubtitle(prevActiveSubtitle => {
            const currentActive = subtitles.find(sub => time >= sub.start && time < sub.end) || null;
            if (prevActiveSubtitle?.id !== currentActive?.id) {
                return currentActive;
            }
            return prevActiveSubtitle;
        });
        
        animationFrameRef.current = requestAnimationFrame(loop);
    };

    const startLoop = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        animationFrameRef.current = requestAnimationFrame(loop);
    };

    const stopLoop = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
    };

    const handleSeek = () => {
        const time = mediaElement.currentTime;
        setCurrentTime(time);
        const currentActive = subtitles.find(sub => time >= sub.start && time < sub.end) || null;
        setActiveSubtitle(currentActive);
    };

    mediaElement.addEventListener('play', startLoop);
    mediaElement.addEventListener('playing', startLoop);
    mediaElement.addEventListener('pause', stopLoop);
    mediaElement.addEventListener('ended', stopLoop);
    mediaElement.addEventListener('seeked', handleSeek);

    return () => {
        mediaElement.removeEventListener('play', startLoop);
        mediaElement.removeEventListener('playing', startLoop);
        mediaElement.removeEventListener('pause', stopLoop);
        mediaElement.removeEventListener('ended', stopLoop);
        mediaElement.removeEventListener('seeked', handleSeek);
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
    };
}, [subtitles]);

  const handleFileChange = (file: File | null) => {
    if (file) {
      resetState();
      setMediaFile(file);
      const url = URL.createObjectURL(file);
      setMediaSrc(url);
      setMediaType(file.type.startsWith('video/') ? 'video' : 'audio');
      setPreviewAspectRatio('landscape');
    }
  };
  
  const handleGenerateClick = async () => {
    if (!mediaFile) return;

    setIsLoading(true);
    setProgress({ processed: 0, total: 0 });
    setSubtitles([]);
    try {
        let words: Word[] = [];
        if (mediaType === 'video') {
           words = await generateSubtitlesFromVideo(mediaFile, setProgress);
        } else if (mediaType === 'audio') {
           words = await generateSubtitlesFromAudio(mediaFile, setProgress);
        }
  
        const assemblyOptions = previewAspectRatio === 'portrait' 
            ? { maxWordsPerCue: 3, maxCueDuration: 2.5, pauseThreshold: 0.4 }
            : { maxWordsPerCue: 7, maxCueDuration: 4.0, pauseThreshold: 0.5 };

        const generatedSubtitles = assembleSubtitlesFromWords(words, assemblyOptions);
        setSubtitles(generatedSubtitles);

    } catch (error) {
      console.error("Error generating subtitles:", error);
      alert("Failed to generate subtitles. Please check the console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (subtitles.length === 0) return;
    const vttContent = generateVttContent(subtitles);
    const fileName = `${mediaFile?.name.split('.')[0] || 'subtitles'}.vtt`;
    downloadFile(vttContent, fileName, 'text/vtt');
  };

  const handleDownloadSrt = () => {
    if (subtitles.length === 0) return;
    const srtContent = generateSrtContent(subtitles);
    const fileName = `${mediaFile?.name.split('.')[0] || 'subtitles'}.srt`;
    downloadFile(srtContent, fileName, 'application/x-subrip');
  };

  const resetState = () => {
    if (mediaSrc) {
        URL.revokeObjectURL(mediaSrc);
    }
    setMediaFile(null);
    setMediaSrc(null);
    setMediaType(null);
    setSubtitles([]);
    setActiveSubtitle(null);
    setIsLoading(false);
    setIsEditing(false);
    setOriginalSubtitles([]);
    setMediaDuration(0);
    setCurrentTime(0);
    setSelectedCueId(null);
  };

  const handleStartEditing = () => {
    setOriginalSubtitles(JSON.parse(JSON.stringify(subtitles))); // Deep copy
    setIsEditing(true);
    setSelectedCueId(null);
  };
  
  const handleCancelEditing = () => {
    setSubtitles(originalSubtitles);
    setIsEditing(false);
    setSelectedCueId(null);
  };
  
  const handleSaveChanges = () => {
    setIsEditing(false);
    setSelectedCueId(null);
  };
  
  const handleUpdateSubtitle = (updatedSubtitle: Subtitle) => {
    setSubtitles(prev => prev.map(sub => sub.id === updatedSubtitle.id ? updatedSubtitle : sub).sort((a,b) => a.start - b.start));
    // Also update the active subtitle if it's the one being changed
    if (activeSubtitle && activeSubtitle.id === updatedSubtitle.id) {
        setActiveSubtitle(updatedSubtitle);
    }
  };

  const handleLoadedMetadata = (duration: number) => {
    setMediaDuration(duration);
  }

  const handleSeek = (time: number) => {
    if(mediaRef.current) {
        mediaRef.current.currentTime = time;
    }
  }

  const renderMediaPreview = () => {
    const effectiveAspectRatio = previewAspectRatio;

    const containerClasses = `relative bg-black rounded-lg overflow-hidden shadow-2xl mx-auto transition-all duration-500 ease-in-out ${
      effectiveAspectRatio === 'landscape'
        ? 'w-full aspect-video'
        : 'aspect-[9/16] h-[65vh] max-h-[700px]'
    }`;

    return (
      <div className={containerClasses} ref={mediaContainerRef}>
        {mediaType === 'video' && <VideoPlayer ref={mediaRef} src={mediaSrc!} onLoadedMetadata={handleLoadedMetadata} />}
        
        {/* For audio, we only show the container for subtitles. The actual player is separate. */}
        
        {activeSubtitle && <SubtitleDisplay 
            subtitle={activeSubtitle}
            isEditing={isEditing}
            onUpdate={handleUpdateSubtitle}
            containerRef={mediaContainerRef}
            currentTime={currentTime}
            aspectRatio={previewAspectRatio}
          />}
      </div>
    );
  };

  const renderProgress = () => {
    if (!isLoading) return null;
    return (
      <div className="bg-gray-800 p-4 rounded-lg shadow-inner">
        {mediaType === 'video' && progress.total === 0 ? (
          <p className="text-center text-indigo-300">{progress.status || 'Generating video subtitles...'}</p>
        ) : mediaType === 'video' && progress.total > 0 ? (
          <>
            <p className="text-center text-indigo-300 mb-2">Analyzing video: Frame {progress.processed} of {progress.total}</p>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <div className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${(progress.processed / progress.total) * 100}%` }}></div>
            </div>
          </>
        ) : (
          <p className="text-center text-indigo-300">{progress.status || 'Generating...'}</p>
        )}
      </div>
    );
  };
  
  const renderEditorPane = () => {
    if (isEditing) {
        const selectedSubtitle = subtitles.find(s => s.id === selectedCueId) || null;
        return <CueTextEditor subtitle={selectedSubtitle} onUpdate={handleUpdateSubtitle} />;
    }
    
    return subtitles.length > 0 ? (
        <ul className="space-y-3">
            {subtitles.map(sub => (
                <li key={sub.id} className={`p-3 rounded-md text-sm transition-colors duration-300 ${activeSubtitle?.id === sub.id ? 'bg-indigo-600/40' : 'bg-gray-900/70'}`}>
                    <span className="font-mono text-indigo-400 mr-2">{new Date(sub.start * 1000).toISOString().substr(14, 8)}</span>
                    <span className="text-gray-300">{sub.text}</span>
                </li>
            ))}
        </ul>
     ) : (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <p>Subtitles will appear here after generation.</p>
        </div>
     );
  };


  const renderContent = () => {
    if (!mediaSrc) {
      return <FileUpload onFileSelect={handleFileChange} />;
    }

    return (
      <div className="w-full max-w-7xl mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">

            {renderMediaPreview()}

            {mediaType === 'audio' && (
              <div className="bg-gray-800/50 rounded-lg p-4 flex flex-col items-center justify-center space-y-2 shadow-inner">
                <p className="text-gray-300 text-center font-medium truncate w-full px-4" title={mediaFile?.name}>{mediaFile?.name}</p>
                <AudioPlayer ref={mediaRef} src={mediaSrc!} onLoadedMetadata={handleLoadedMetadata} standalone={true}/>
              </div>
            )}
            
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-2 shadow-inner">
              <label className="block text-sm font-medium text-indigo-300 mb-2">
                Preview Aspect Ratio
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewAspectRatio('landscape')}
                  disabled={isLoading || isEditing}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    previewAspectRatio === 'landscape'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  <LandscapeIcon className="w-5 h-5" />
                  <span>Landscape (16:9)</span>
                </button>
                <button
                  onClick={() => setPreviewAspectRatio('portrait')}
                  disabled={isLoading || isEditing}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    previewAspectRatio === 'portrait'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  <PortraitIcon className="w-5 h-5" />
                  <span>Portrait (9:16)</span>
                </button>
              </div>
            </div>
            
            {isEditing && (
                <div className="bg-gray-800/50 rounded-lg p-4 flex gap-4 justify-end shadow-inner">
                    <button onClick={handleCancelEditing} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSaveChanges} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        Save Changes
                    </button>
                </div>
            )}
            
            {isEditing && mediaDuration > 0 && (
              <SubtitleTimelineEditor
                subtitles={subtitles}
                duration={mediaDuration}
                currentTime={currentTime}
                onUpdate={handleUpdateSubtitle}
                onSeek={handleSeek}
                selectedCueId={selectedCueId}
                onSelectCue={setSelectedCueId}
              />
            )}


            <div className="flex flex-col sm:flex-row gap-4">
               <button
                  onClick={handleGenerateClick}
                  disabled={isLoading || isEditing}
                  className="w-full sm:w-auto flex-grow justify-center bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900/50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  {isLoading ? (
                    'Generating...'
                  ) : (
                    <>
                      <SparklesIcon className="w-5 h-5" />
                      Generate Subtitles
                    </>
                  )}
                </button>
                {subtitles.length > 0 && !isEditing && (
                   <button
                   onClick={handleStartEditing}
                   className="w-full sm:w-auto flex-grow justify-center bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-all duration-300 transform hover:scale-105 shadow-lg"
                 >
                   <EditIcon className="w-5 h-5" />
                   Edit Subtitles
                 </button>
                )}
                {subtitles.length > 0 && (
                  <div className="flex flex-col sm:flex-row gap-4 flex-grow">
                    <button
                      onClick={handleDownload}
                      disabled={isEditing}
                      className="w-full sm:w-auto flex-grow justify-center bg-green-600 hover:bg-green-700 disabled:bg-green-900/50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      <DownloadIcon className="w-5 h-5" />
                      Download .vtt
                    </button>
                     <button
                      onClick={handleDownloadSrt}
                      disabled={isEditing}
                      className="w-full sm:w-auto flex-grow justify-center bg-teal-600 hover:bg-teal-700 disabled:bg-teal-900/50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      <DownloadIcon className="w-5 h-5" />
                      Download .srt
                    </button>
                  </div>
                )}
            </div>
            {renderProgress()}
          </div>
          <div className="lg:col-span-1 bg-gray-800/50 rounded-lg p-4 max-h-[60vh] lg:max-h-[85vh] overflow-y-auto shadow-inner">
             <h3 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2 text-indigo-300">
                {isEditing ? 'Edit Selected Cue' : 'Generated Cues'}
            </h3>
             {renderEditorPane()}
          </div>
        </div>
        <div className="text-center mt-8">
            <button onClick={resetState} className="text-indigo-400 hover:text-indigo-300">
                Upload another file
            </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-sans">
      <header className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500">
          AI Subtitle Generator
        </h1>
        <p className="text-gray-400 mt-2 max-w-2xl mx-auto">
          Upload a video or audio file, and our AI will generate descriptive subtitles or a transcription.
        </p>
      </header>
      <main className="w-full">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
