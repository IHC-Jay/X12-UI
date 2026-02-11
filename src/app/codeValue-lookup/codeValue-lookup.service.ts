import { Injectable } from '@angular/core';

type Row = { id: string; value: string };

@Injectable({ providedIn: 'root' })
export class CodeValueLookupService {
  // prefix (3 letters) -> map(id -> value)
  private lookups = new Map<string, Map<string, string>>();
  // prefix -> rows array
  private rowsMap = new Map<string, Row[]>();
  // default prefix used by legacy callers
  private defaultPrefix = 'HL3';

  constructor() {
    // start background load of all CSV lookups
    void this.loadAllCsvLookups();
  }

  // Public API
  getPrefixes(): string[] {
    return Array.from(this.lookups.keys());
  }

  // Preferred: call with `segment` and `fieldNumber` (e.g. 'AMT', '01').
  // Legacy: single `prefix` param still supported.
  getRows(segmentOrPrefix?: string, fieldNumber?: string | number): Row[] {
    const p = fieldNumber != null
      ? this.makePrefixFromSegmentField(segmentOrPrefix || '', fieldNumber)
      : this.normalizePrefix(segmentOrPrefix || this.defaultPrefix);
    return (this.rowsMap.get(p) || []).slice();
  }

  // id lookup — prefer `getName(id, segment, field)`.
  getName(id: string, segmentOrPrefix?: string, fieldNumber?: string | number): string | null {
    if (!id) return null;
    const p = fieldNumber != null
      ? this.makePrefixFromSegmentField(segmentOrPrefix || '', fieldNumber)
      : this.normalizePrefix(segmentOrPrefix || this.defaultPrefix);
    return this.lookups.get(p)?.get(id) ?? null;
  }

  getDescription(id: string, segmentOrPrefix?: string, fieldNumber?: string | number): string | null {
    return this.getName(id, segmentOrPrefix, fieldNumber);
  }

  // Load all CSV files found under /assets (tries manifest then directory index).
  async loadAllCsvLookups(): Promise<void> {
    const files = await this.findCsvFilesInAssets();
    for (const f of files) {
      try {
        const resp = await fetch(f);
        if (!resp.ok) continue;
        const txt = await resp.text();
        const filename = this.basename(f);
        // Expect filenames like Segment-01.csv — parse segment and field
        const base = filename.replace(/\.[^.]+$/, '');
        const m = base.match(/^([A-Za-z0-9]+)\s*-\s*([0-9]+)$/);
        const prefix = m ? this.makePrefixFromSegmentField(m[1], m[2]) : this.normalizePrefix(base);
        this.parseCsvInto(prefix, txt);
      } catch (e) {
        // ignore and continue
        continue;
      }
    }
  }

  // Attempt to discover CSV files. First try a manifest (/assets/lookup-manifest.json),
  // otherwise attempt to fetch /assets/ and parse the HTML for .csv links.
  private async findCsvFilesInAssets(): Promise<string[]> {
    const candidates: string[] = [];
    try {
      const m = await fetch('/assets/lookup-manifest.json');
      if (m.ok) {
        const list = await m.json();
        if (Array.isArray(list)) {
          for (const it of list) {
            if (typeof it === 'string' && it.toLowerCase().endsWith('.csv')) {
              candidates.push(`/assets/${it}`);
            }
          }
          return candidates;
        }
      }
    } catch (e) {
      // manifest not present — fallthrough
    }

    try {
      const resp = await fetch('/assets/');
      if (!resp.ok) return [];
      const ct = resp.headers.get('content-type') || '';
      if (!ct.includes('html')) return [];
      const body = await resp.text();
      const re = /href="([^"]+\.csv)"/gi;
      const found = new Set<string>();
      let m2: RegExpExecArray | null;
      while ((m2 = re.exec(body)) !== null) {
        let url = m2[1];
        // normalize relative paths
        if (!url.startsWith('/')) url = `/assets/${url.replace(/^\.\/?/, '')}`;
        if (url.toLowerCase().endsWith('.csv')) found.add(url);
      }
      return Array.from(found.values());
    } catch (e) {
      return [];
    }
  }

  private basename(path: string) {
    const p = path.split('/').pop() || path;
    return p;
  }

  private normalizePrefix(p: string) {
    return (p || '').toString().substring(0, 3).toUpperCase();
  }

  private makePrefixFromSegmentField(segment: string, field: string | number) {
    const seg = (segment || '').toString().replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    let f = (field == null) ? '' : String(field);
    f = f.replace(/[^0-9]/g, '').padStart(2, '0');
    return `${seg}${f}`;
  }

  private parseCsvInto(prefix: string, text: string) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    let startIndex = 0;
    if (lines.length > 0) {
      const first = lines[0].toLowerCase();
      if (first.includes('id(') || first.includes('name(') || first.startsWith('id,')) startIndex = 1;
    }
    const rows: Row[] = [];
    const map = new Map<string, string>();
    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.replace(/^\s*"|"\s*$|^\s*'|'\s*$/g, '').trim());
      const id = (parts[0] || '').toString();
      const val = (parts[1] || '').toString();
      if (id) {
        map.set(id, val || '');
        rows.push({ id, value: val || '' });
      }
    }
    this.lookups.set(prefix, map);
    this.rowsMap.set(prefix, rows);
  }

  // Legacy helper: try to load a single prefix by name (keeps compatibility with prior API)
  // Try loading by either a legacy `prefix` or by `segment` + `fieldNumber`.
  async loadLookupForPrefix(segmentOrPrefix: string, fieldNumber?: string | number): Promise<boolean> {
    const p = fieldNumber != null ? this.makePrefixFromSegmentField(segmentOrPrefix, fieldNumber) : this.normalizePrefix(segmentOrPrefix);
    const candidates = new Set<string>();

    // If caller provided a fieldNumber, only attempt segment-field (hyphenated) variants
    if (fieldNumber != null) {
      const m = p.match(/^([A-Z0-9]+?)([0-9]{2})$/);
      if (m) {
        const seg = m[1];
        const field = m[2];
        candidates.add(`/assets/${seg}-${field}.csv`);
        candidates.add(`/assets/${seg}-${field}_lookup.csv`);
        candidates.add(`/assets/${seg}-${field}-lookup.csv`);
        candidates.add(`/assets/${seg}-${field}Values.csv`);
        candidates.add(`/assets/${seg}${field}.csv`);
      } else {
        // fallback to non-hyphenated if parsing fails
        candidates.add(`/assets/${p}.csv`);
      }
    } else {
      // If caller passed a segment-like prefix (e.g. 'NM1' or 'HL3'), prefer common hyphenated
      // segment-field filenames before trying the plain `/assets/${p}.csv`.
      if (/^[A-Z]{2,}[0-9]$/.test(p)) {
        const seg = p;
        // try the most common element numbers first
        candidates.add(`/assets/${seg}-01.csv`);
        candidates.add(`/assets/${seg}-02.csv`);
        candidates.add(`/assets/${seg}-03.csv`);
      }
      // Non-hyphenated candidates (legacy and variants). Note: intentionally omit `/assets/${p}Values.csv` to avoid loading old pValues files.
      candidates.add(`/assets/${p}.csv`);
      candidates.add(`/assets/${p}_lookup.csv`);
      candidates.add(`/assets/${p}-lookup.csv`);
      candidates.add(`/assets/${p}Lookup.csv`);
    }

    for (const url of candidates) {
      try {
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const txt = await resp.text();
        this.parseCsvInto(p, txt);
        return true;
      } catch (e) {
        continue;
      }
    }
    return false;
  }
}
