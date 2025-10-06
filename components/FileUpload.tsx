import React, { useState, useCallback } from 'react';
import { UploadCloudIcon } from './Icons';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if(file.type.startsWith('video/') || file.type.startsWith('audio/')) {
        onFileSelect(file);
      } else {
        alert("Please upload a valid video or audio file.");
      }
    }
  }, [onFileSelect]);

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };


  return (
    <div className="w-full max-w-2xl mx-auto">
      <label
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        className={`flex justify-center w-full h-64 px-4 transition bg-gray-800 border-2 ${isDragging ? 'border-indigo-400' : 'border-gray-600'} border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-500 focus:outline-none`}
      >
        <span className="flex items-center space-x-2">
           <div className="flex flex-col items-center text-center">
            <UploadCloudIcon className={`w-12 h-12 ${isDragging ? 'text-indigo-400' : 'text-gray-500'}`} />
            <span className="font-medium text-gray-400">
                Drop a video or audio file, or <span className="text-indigo-400 underline">browse</span>
            </span>
            <span className="text-xs text-gray-500 mt-1">Video (MP4, MOV, WEBM) and Audio (MP3, WAV, OGG) supported</span>
           </div>
        </span>
        <input type="file" name="file_upload" className="hidden" accept="video/*,audio/*" onChange={handleFileChange} />
      </label>
    </div>
  );
};