import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

const LOOKUP_BASE_PATHS = ['assets/KV-lookup'];

const LOOKUP_FILES: string[] = [
  'AAA-03.csv',
  'AAA-04.csv',
  'AMT-01.csv',
  'EB-01.csv',
  'EB-02.csv',
  'EB-03.csv',
  'EB-04.csv',
  'BHT-01.csv',
  'BHT-02.csv',
  'BPR-01.csv',
  'BPR-04.csv',
  'CAS-01.csv',
  'CLP-02.csv',
  'DMG-01.csv',
  'DTM-01.csv',
  'DTP-01.csv',
  'DTP-02.csv',
  'EQ-01.csv',
  'HI-01.csv',
  'HL-03.csv',
  'INS-02.csv',
  'N1-01.csv',
  'NM1-01.csv',
  'NM1-02.csv',
  'NM108.csv',
  'NTE-01.csv',
  'PER-01.csv',
  'PRV-01.csv',
  'PWK-01.csv',
  'QTY-01.csv',
  'REF-01.csv'
];

@Injectable({ providedIn: 'root' })
export class KvLookupService {
  private fileLookup = new Map<string, Map<string, string>>();
  private loadPromise: Promise<void> | null = null;
  private loadVersionSignal = signal(0);
  private pendingFieldLoads = new Map<string, Promise<void>>();
  private missingFieldLookups = new Set<string>();

  constructor(private http: HttpClient) {}

  preload(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = this.loadAll();
    return this.loadPromise;
  }

  loadVersion(): number {
    return this.loadVersionSignal();
  }

  lookupName(segmentTag: string, elementPosition: number, value: string): string | null {
    const normalizedValue = this.normalizeLookupValue(value);
    if (!normalizedValue) return null;

    const primaryKey = this.buildLookupKey(segmentTag, elementPosition);
    const keys = [primaryKey];

    if (segmentTag.toUpperCase() === 'EB' && elementPosition === 3) {
      keys.push(this.normalizeKey('EQ01'));
    }

    for (const key of keys) {
      const map = this.fileLookup.get(key);
      if (!map) continue;
      const resolved = map.get(normalizedValue);
      if (resolved) return resolved;
    }

    return null;
  }

  async resolveName(segmentTag: string, elementPosition: number, value: string): Promise<string | null> {
    const immediate = this.lookupName(segmentTag, elementPosition, value);
    if (immediate) return immediate;

    await this.ensureFieldLoaded(segmentTag, elementPosition);
    return this.lookupName(segmentTag, elementPosition, value);
  }

  private async loadAll(): Promise<void> {
    const loads = LOOKUP_FILES.map(async (fileName) => {
      const normalizedFileKey = this.normalizeKey(fileName.replace(/\.csv$/i, ''));
      if (this.fileLookup.has(normalizedFileKey)) return;

      try {
        const csv = await this.fetchLookupCsv(fileName);
        const parsed = this.parseCsv(csv);
        if (parsed.size > 0) {
          this.fileLookup.set(normalizedFileKey, parsed);
        }
      } catch {
        return;
      }
    });

    await Promise.allSettled(loads);
    this.loadVersionSignal.update((value) => value + 1);
  }

  private async ensureFieldLoaded(segmentTag: string, elementPosition: number): Promise<void> {
    const key = this.buildLookupKey(segmentTag, elementPosition);
    if (this.fileLookup.has(key)) return;
    if (this.missingFieldLookups.has(key)) return;

    const pending = this.pendingFieldLoads.get(key);
    if (pending) {
      await pending;
      return;
    }

    const request = this.loadFieldCandidates(segmentTag, elementPosition);
    this.pendingFieldLoads.set(key, request);
    try {
      await request;
    } finally {
      this.pendingFieldLoads.delete(key);
    }
  }

  private async loadFieldCandidates(segmentTag: string, elementPosition: number): Promise<void> {
    const key = this.buildLookupKey(segmentTag, elementPosition);
    if (this.fileLookup.has(key)) return;
    if (this.missingFieldLookups.has(key)) return;

    const padded = String(elementPosition).padStart(2, '0');
    const candidates = [
      `${segmentTag.toUpperCase()}-${padded}.csv`,
      `${segmentTag.toUpperCase()}${padded}.csv`
    ];

    for (const fileName of candidates) {
      try {
        const csv = await this.fetchLookupCsv(fileName);
        const parsed = this.parseCsv(csv);
        if (parsed.size > 0) {
          this.fileLookup.set(key, parsed);
          this.loadVersionSignal.update((value) => value + 1);
          return;
        }
      } catch {
        continue;
      }
    }

    this.missingFieldLookups.add(key);
  }

  private parseCsv(csv: string): Map<string, string> {
    const map = new Map<string, string>();
    const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length <= 1) return map;

    for (let i = 1; i < lines.length; i++) {
      const parsed = this.parseLine(lines[i]);
      if (!parsed) continue;

      const key = this.normalizeLookupValue(parsed.key);
      const value = parsed.value.trim();
      if (!key || !value) continue;

      if (!map.has(key)) {
        map.set(key, value);
      }
    }

    return map;
  }

  private async fetchLookupCsv(fileName: string): Promise<string> {
    for (const basePath of LOOKUP_BASE_PATHS) {
      try {
        return await firstValueFrom(this.http.get(`${basePath}/${fileName}`, { responseType: 'text' }));
      } catch {
        continue;
      }
    }

    throw new Error(`Lookup file not found: ${fileName}`);
  }

  private parseLine(line: string): { key: string; value: string } | null {
    const match = line.match(/^\s*"?([^",]+)"?\s*,\s*(.*)$/);
    if (!match) return null;

    const key = this.cleanCsvCell(match[1]);
    const value = this.cleanCsvCell(match[2]);
    if (!key || !value) return null;

    return { key, value };
  }

  private cleanCsvCell(cell: string): string {
    let out = cell.trim();
    if (out.startsWith('"')) out = out.slice(1);
    if (out.endsWith('"')) out = out.slice(0, -1);
    return out.replace(/""/g, '"').trim();
  }

  private buildLookupKey(segmentTag: string, elementPosition: number): string {
    const padded = String(elementPosition).padStart(2, '0');
    return this.normalizeKey(`${segmentTag}${padded}`);
  }

  private normalizeLookupValue(raw: string): string {
    return this.cleanCsvCell(raw ?? '').toUpperCase();
  }

  private normalizeKey(raw: string): string {
    return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
}
