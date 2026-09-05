export type OpticalScoreSourceKind = 'image' | 'pdf';

export interface OpticalScorePage {
  id: string;
  pageNumber: number;
  width: number;
  height: number;
  dataUrl: string;
}

export interface OpticalScoreDocument {
  id: string;
  sourceKind: OpticalScoreSourceKind;
  sourceFileName: string;
  mimeType: string;
  pages: OpticalScorePage[];
}

export interface OpticalScoreSelection {
  document: OpticalScoreDocument;
  page: OpticalScorePage;
}

export interface OpticalBinaryImage {
  width: number;
  height: number;
  pixels: Uint8Array;
}

export interface OpticalStaff {
  id: string;
  pageNumber: number;
  lines: [number, number, number, number, number];
  spacing: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface OpticalDetectedNote {
  id: string;
  pageNumber: number;
  staffId: string;
  x: number;
  y: number;
  noteIndex: number;
  octave: number;
  midi: number;
  durationBeats: number;
  confidence: number;
}

export interface OpticalPageAnalysis {
  pageNumber: number;
  staffCount: number;
  noteCount: number;
  staves: OpticalStaff[];
  notes: OpticalDetectedNote[];
}

export interface OpticalScoreAnalysis {
  pages: OpticalPageAnalysis[];
  notes: OpticalDetectedNote[];
  staffCount: number;
  noteCount: number;
  averageConfidence: number;
}
