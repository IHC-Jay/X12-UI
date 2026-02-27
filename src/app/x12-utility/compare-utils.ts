export interface NormalizedDoc {
  segments: string[];
  rawSegments: string[];
}

export interface X12Delimiters {
  element: string;
  component?: string;
  repetition?: string;
  segment: string;
}

export function detectDelimitersFromISA(text: string): X12Delimiters | null {
  if (!text) return null;
  const maxScan = Math.min(text.length, 4000);
  const start = text.indexOf('ISA');
  if (start < 0 || start > maxScan || start + 4 >= text.length) return null;

  const element = text[start + 3];
  let pos = start + 3;
  let count = 1;
  for (; count < 16; count++) {
    pos = text.indexOf(element, pos + 1);
    if (pos === -1) return null;
  }

  const startISA16 = pos + 1;
  const component = text[startISA16];
  const segment = text[startISA16 + 1];

  pos = start + 3;
  count = 1;
  for (; count < 11; count++) {
    pos = text.indexOf(element, pos + 1);
    if (pos === -1) break;
  }
  const startISA11 = pos + 1;
  const repetition = text[startISA11];

  return { element, component, repetition, segment };
}

export function splitSegments(raw: string, segmentSep: string): string[] {
  const byLines = raw.includes('\n') ? raw.split(/\r?\n/) : [raw];
  const base = byLines.length === 1 ? raw.split(segmentSep) : byLines.flatMap(line => line.split(segmentSep));
  return base.map(s => s.trim()).filter((s, idx, arr) => !(s === '' && idx === arr.length - 1));
}

export function normalizeSegments(
  segments: string[],
  elementSep: string,
  ignoreRules: string[]
): { normalized: string[]; raw: string[] } {
  const parsedRules = new Map<string, Set<number>>();
  for (const rule of ignoreRules) {
    const [seg, posStr] = rule.split(':');
    const pos = Number(posStr);
    if (!seg || !Number.isFinite(pos) || pos < 1) continue;
    if (!parsedRules.has(seg)) parsedRules.set(seg, new Set());
    parsedRules.get(seg)!.add(pos);
  }

  const normalized = segments.map(seg => {
    if (!seg) return seg;
    const firstSepIdx = seg.indexOf(elementSep);
    const tag = firstSepIdx > 0 ? seg.substring(0, firstSepIdx) : seg;
    const toIgnore = parsedRules.get(tag);
    if (!toIgnore || toIgnore.size === 0) return seg;

    const parts = seg.split(elementSep);
    for (const pos of toIgnore) {
      const idx = pos;
      if (idx >= 1 && idx < parts.length) {
        parts[idx] = '<IGNORED>';
      }
    }
    return parts.join(elementSep);
  });

  return { normalized, raw: [...segments] };
}

export function normalizeFromRaw(
  raw: string,
  segmentSep: string,
  elementSep: string,
  ignoreRules: string[]
): NormalizedDoc {
  const segs = splitSegments(raw, segmentSep);
  const { normalized, raw: rawSegments } = normalizeSegments(segs, elementSep, ignoreRules);
  return { segments: normalized, rawSegments };
}
