export type IgnoreFieldSpec = `${string}:${number}`;

export interface CompareConfig {
  compareExactFilename: boolean;
  leftKeyStart?: number;
  leftKeyEnd?: number;
  rightKeyStart?: number;
  rightKeyEnd?: number;
  segmentSep: string;
  elementSep: string;
  autoDetect: boolean;
  ignoreFields: IgnoreFieldSpec[];
  maxPreviewDiffs: number;
}

export interface FilePair {
  key: string;
  leftName: string;
  rightName: string;
  leftHandle: FileSystemFileHandle | File;
  rightHandle: FileSystemFileHandle | File;
}

export interface DiffLine {
  index: number;
  left: string | null;
  right: string | null;
  isDifferent: boolean;
}

export interface PairResult {
  key: string;
  leftName: string;
  rightName: string;
  identical: boolean;
  firstThreeDiffs: DiffLine[];
  totalDiffs: number;
}

export interface UnmatchedFile {
  key: string;
  name: string;
}

export interface RunSummary {
  compared: number;
  identical: number;
  different: number;
  errors: string[];
  leftOnly: UnmatchedFile[];
  rightOnly: UnmatchedFile[];
}
