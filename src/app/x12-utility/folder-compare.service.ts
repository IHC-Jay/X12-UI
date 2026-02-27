import { Injectable } from '@angular/core';
import { CompareConfig, DiffLine, FilePair, PairResult, RunSummary, UnmatchedFile } from './compare.models';
import { detectDelimitersFromISA, normalizeFromRaw } from './compare-utils';

@Injectable({ providedIn: 'root' })
export class FolderCompareService {
  async pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
    try {
      const handle = await (window as any).showDirectoryPicker();
      return handle as FileSystemDirectoryHandle;
    } catch {
      return null;
    }
  }

  async pickFile(): Promise<FileSystemFileHandle | null> {
    try {
      const handles = await (window as any).showOpenFilePicker({ multiple: false });
      const handle = Array.isArray(handles) ? handles[0] : null;
      return handle as FileSystemFileHandle | null;
    } catch {
      return null;
    }
  }

  private async listFiles(dir: FileSystemDirectoryHandle): Promise<FileSystemFileHandle[]> {
    const out: FileSystemFileHandle[] = [];
    for await (const [, handle] of (dir as any).entries()) {
      if (handle.kind === 'file') out.push(handle as FileSystemFileHandle);
    }
    return out;
  }

  private buildKey(name: string, keyStart?: number, keyEnd?: number): string {
    if (!keyStart || !keyEnd) return name;
    if (keyStart < 1 || keyEnd < keyStart) return '';
    const start = keyStart - 1;
    if (start >= name.length) return '';
    const end = Math.min(name.length, keyEnd);
    return name.substring(start, end);
  }

  async pairFiles(
    leftDir: FileSystemDirectoryHandle,
    rightDir: FileSystemDirectoryHandle,
    cfg: CompareConfig
  ): Promise<{ pairs: FilePair[]; summary: RunSummary }> {
    const errors: string[] = [];
    const leftFiles = await this.listFiles(leftDir);
    const rightFiles = await this.listFiles(rightDir);

    const leftMatch = new Map<string, FileSystemFileHandle[]>();
    const rightMatch = new Map<string, FileSystemFileHandle[]>();
    const exactFilenameMode = cfg.compareExactFilename;

    for (const fileHandle of leftFiles) {
      const key = exactFilenameMode ? fileHandle.name : this.buildKey(fileHandle.name, cfg.leftKeyStart, cfg.leftKeyEnd);
      if (!key) {
        errors.push(`First: invalid key range for file "${fileHandle.name}"`);
        continue;
      }
      if (!leftMatch.has(key)) leftMatch.set(key, []);
      leftMatch.get(key)!.push(fileHandle);
    }

    for (const fileHandle of rightFiles) {
      const key = exactFilenameMode ? fileHandle.name : this.buildKey(fileHandle.name, cfg.rightKeyStart, cfg.rightKeyEnd);
      if (!key) {
        errors.push(`Second: invalid key range for file "${fileHandle.name}"`);
        continue;
      }
      if (!rightMatch.has(key)) rightMatch.set(key, []);
      rightMatch.get(key)!.push(fileHandle);
    }

    for (const [key, arr] of leftMatch.entries()) {
      if (arr.length > 1) {
        errors.push(`First: key "${key}" matched multiple files: ${arr.map(a => a.name).join(', ')}`);
      }
    }

    for (const [key, arr] of rightMatch.entries()) {
      if (arr.length > 1) {
        errors.push(`Second: key "${key}" matched multiple files: ${arr.map(a => a.name).join(', ')}`);
      }
    }

    const pairs: FilePair[] = [];
    const leftOnly: UnmatchedFile[] = [];
    const rightOnly: UnmatchedFile[] = [];

    for (const [key, arrL] of leftMatch.entries()) {
      const arrR = rightMatch.get(key);
      if (arrL.length === 1 && arrR && arrR.length === 1) {
        pairs.push({
          key,
          leftName: arrL[0].name,
          rightName: arrR[0].name,
          leftHandle: arrL[0],
          rightHandle: arrR[0]
        });
      } else if (arrL.length === 1 && (!arrR || arrR.length === 0)) {
        leftOnly.push({ key, name: arrL[0].name });
      }
    }

    for (const [key, arrR] of rightMatch.entries()) {
      const arrL = leftMatch.get(key);
      if (arrR.length === 1 && (!arrL || arrL.length === 0)) {
        rightOnly.push({ key, name: arrR[0].name });
      }
    }

    const summary: RunSummary = {
      compared: pairs.length,
      identical: 0,
      different: 0,
      errors,
      leftOnly,
      rightOnly
    };

    return { pairs, summary };
  }

  private async readText(handle: FileSystemFileHandle): Promise<string> {
    const file = await handle.getFile();
    return await file.text();
  }

  private buildDiff(
    left: string[],
    right: string[],
    leftRaw: string[],
    rightRaw: string[]
  ): DiffLine[] {
    const lines: DiffLine[] = [];

    const tagOf = (segment: string | null): string => {
      if (!segment) return '';
      const idx = segment.indexOf('*');
      return idx >= 0 ? segment.substring(0, idx) : segment;
    };

    const findAhead = (
      arr: string[],
      start: number,
      needle: string,
      maxLookahead: number,
      byTag: boolean
    ): number => {
      const end = Math.min(arr.length, start + maxLookahead + 1);
      const needleTag = byTag ? tagOf(needle) : '';
      for (let idx = start; idx < end; idx++) {
        if (!byTag && arr[idx] === needle) return idx;
        if (byTag && tagOf(arr[idx]) === needleTag) return idx;
      }
      return -1;
    };

    const lookahead = 12;
    let leftIndex = 0;
    let rightIndex = 0;

    while (leftIndex < left.length || rightIndex < right.length) {
      if (leftIndex >= left.length) {
        lines.push({ index: rightIndex, left: null, right: rightRaw[rightIndex] ?? null, isDifferent: true });
        rightIndex++;
        continue;
      }

      if (rightIndex >= right.length) {
        lines.push({ index: leftIndex, left: leftRaw[leftIndex] ?? null, right: null, isDifferent: true });
        leftIndex++;
        continue;
      }

      const leftSeg = left[leftIndex];
      const rightSeg = right[rightIndex];
      if (leftSeg === rightSeg) {
        lines.push({
          index: Math.max(leftIndex, rightIndex),
          left: leftRaw[leftIndex] ?? null,
          right: rightRaw[rightIndex] ?? null,
          isDifferent: false
        });
        leftIndex++;
        rightIndex++;
        continue;
      }

      const rightMatchExact = findAhead(right, rightIndex + 1, leftSeg, lookahead, false);
      const leftMatchExact = findAhead(left, leftIndex + 1, rightSeg, lookahead, false);

      if (rightMatchExact !== -1 || leftMatchExact !== -1) {
        const skipRight = rightMatchExact !== -1 ? rightMatchExact - rightIndex : Number.MAX_SAFE_INTEGER;
        const skipLeft = leftMatchExact !== -1 ? leftMatchExact - leftIndex : Number.MAX_SAFE_INTEGER;

        if (skipLeft <= skipRight) {
          while (leftIndex < leftMatchExact) {
            lines.push({ index: leftIndex, left: leftRaw[leftIndex] ?? null, right: null, isDifferent: true });
            leftIndex++;
          }
        } else {
          while (rightIndex < rightMatchExact) {
            lines.push({ index: rightIndex, left: null, right: rightRaw[rightIndex] ?? null, isDifferent: true });
            rightIndex++;
          }
        }
        continue;
      }

      const rightMatchTag = findAhead(right, rightIndex + 1, leftSeg, lookahead, true);
      const leftMatchTag = findAhead(left, leftIndex + 1, rightSeg, lookahead, true);

      if (rightMatchTag !== -1 || leftMatchTag !== -1) {
        const skipRight = rightMatchTag !== -1 ? rightMatchTag - rightIndex : Number.MAX_SAFE_INTEGER;
        const skipLeft = leftMatchTag !== -1 ? leftMatchTag - leftIndex : Number.MAX_SAFE_INTEGER;

        if (skipLeft <= skipRight) {
          while (leftIndex < leftMatchTag) {
            lines.push({ index: leftIndex, left: leftRaw[leftIndex] ?? null, right: null, isDifferent: true });
            leftIndex++;
          }
        } else {
          while (rightIndex < rightMatchTag) {
            lines.push({ index: rightIndex, left: null, right: rightRaw[rightIndex] ?? null, isDifferent: true });
            rightIndex++;
          }
        }
        continue;
      }

      lines.push({
        index: Math.max(leftIndex, rightIndex),
        left: leftRaw[leftIndex] ?? null,
        right: rightRaw[rightIndex] ?? null,
        isDifferent: true
      });
      leftIndex++;
      rightIndex++;
    }

    return lines;
  }

  async comparePair(pair: FilePair, cfg: CompareConfig): Promise<PairResult> {
    const [leftRaw, rightRaw] = await Promise.all([
      this.readText(pair.leftHandle),
      this.readText(pair.rightHandle)
    ]);

    let leftSeg = cfg.segmentSep;
    let leftElem = cfg.elementSep;
    let rightSeg = cfg.segmentSep;
    let rightElem = cfg.elementSep;

    if (cfg.autoDetect) {
      const ld = detectDelimitersFromISA(leftRaw);
      const rd = detectDelimitersFromISA(rightRaw);
      if (ld) {
        leftSeg = ld.segment;
        leftElem = ld.element;
      }
      if (rd) {
        rightSeg = rd.segment;
        rightElem = rd.element;
      }
    }

    const leftDoc = normalizeFromRaw(leftRaw, leftSeg, leftElem, cfg.ignoreFields);
    const rightDoc = normalizeFromRaw(rightRaw, rightSeg, rightElem, cfg.ignoreFields);

    const alignedLines = this.buildDiff(leftDoc.segments, rightDoc.segments, leftDoc.rawSegments, rightDoc.rawSegments);
    const diffs = alignedLines.filter(d => d.isDifferent);
    const previewCount = Math.max(1, Math.min(10, Number(cfg.maxPreviewDiffs || 3)));

    return {
      key: pair.key,
      leftName: pair.leftName,
      rightName: pair.rightName,
      identical: diffs.length === 0,
      totalDiffs: diffs.length,
      firstThreeDiffs: diffs.slice(0, previewCount)
    };
  }

  async loadFullDiff(pair: FilePair, cfg: CompareConfig): Promise<DiffLine[]> {
    const [leftRaw, rightRaw] = await Promise.all([
      this.readText(pair.leftHandle),
      this.readText(pair.rightHandle)
    ]);

    let leftSeg = cfg.segmentSep;
    let leftElem = cfg.elementSep;
    let rightSeg = cfg.segmentSep;
    let rightElem = cfg.elementSep;

    if (cfg.autoDetect) {
      const ld = detectDelimitersFromISA(leftRaw);
      const rd = detectDelimitersFromISA(rightRaw);
      if (ld) {
        leftSeg = ld.segment;
        leftElem = ld.element;
      }
      if (rd) {
        rightSeg = rd.segment;
        rightElem = rd.element;
      }
    }

    const leftDoc = normalizeFromRaw(leftRaw, leftSeg, leftElem, cfg.ignoreFields);
    const rightDoc = normalizeFromRaw(rightRaw, rightSeg, rightElem, cfg.ignoreFields);
    return this.buildDiff(leftDoc.segments, rightDoc.segments, leftDoc.rawSegments, rightDoc.rawSegments);
  }
}
