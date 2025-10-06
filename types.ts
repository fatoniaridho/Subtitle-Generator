export interface Word {
  word: string;
  start: number;
  end: number;
}

export interface Subtitle {
  id: number;
  start: number;
  end: number;
  text: string;
  line?: number; // Vertical position percentage from top
  width?: number; // Width percentage of the container
  fontSize?: number; // Relative font size
  words?: Word[]; // Array of words with their own timestamps
}

export interface Progress {
  processed: number;
  total: number;
  status?: string;
}