import { Subtitle, Word } from '../types';

const formatTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  const milliseconds = (Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000)).toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
};

const formatTimeSrt = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  const milliseconds = (Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000)).toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds},${milliseconds}`;
};

export const generateVttContent = (subtitles: Subtitle[]): string => {
  let content = "WEBVTT\n\n";
  subtitles.forEach((sub, index) => {
    content += `${index + 1}\n`;
    let cueSettings = '';
    if (sub.line !== undefined) {
      cueSettings += ` line:${Math.round(sub.line)}%`;
    }
    if (sub.width !== undefined) {
      cueSettings += ` size:${Math.round(sub.width)}% position:50% align:middle`;
    }
    content += `${formatTime(sub.start)} --> ${formatTime(sub.end)}${cueSettings}\n`;
    content += `${sub.text}\n\n`;
  });
  return content;
};

export const generateSrtContent = (subtitles: Subtitle[]): string => {
  let content = "";
  subtitles.forEach((sub, index) => {
    content += `${index + 1}\n`;
    content += `${formatTimeSrt(sub.start)} --> ${formatTimeSrt(sub.end)}\n`;
    content += `${sub.text}\n\n`;
  });
  return content;
};

export const downloadFile = (content: string, fileName: string, contentType: string) => {
  const blob = new Blob([content], { type: contentType });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
};

interface AssembleOptions {
    maxWordsPerCue: number;
    maxCueDuration: number;
    pauseThreshold: number;
}

export const assembleSubtitlesFromWords = (words: Word[], options: AssembleOptions): Subtitle[] => {
    if (words.length === 0) return [];

    const { maxWordsPerCue, maxCueDuration, pauseThreshold } = options;
    const subtitles: Subtitle[] = [];
    let currentCueWords: Word[] = [];
    let cueId = 0;

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        currentCueWords.push(word);

        const cueDuration = word.end - currentCueWords[0].start;
        const nextWord = words[i + 1];
        const pauseAfter = nextWord ? nextWord.start - word.end : Infinity;

        const isLastWordOfAll = i === words.length - 1;

        if (
            isLastWordOfAll ||
            currentCueWords.length >= maxWordsPerCue ||
            cueDuration >= maxCueDuration ||
            pauseAfter >= pauseThreshold
        ) {
            if(currentCueWords.length > 0) {
              subtitles.push({
                  id: cueId++,
                  start: currentCueWords[0].start,
                  end: currentCueWords[currentCueWords.length - 1].end,
                  text: currentCueWords.map(w => w.word).join(' '),
                  words: [...currentCueWords],
              });
              currentCueWords = [];
            }
        }
    }

    return subtitles;
};