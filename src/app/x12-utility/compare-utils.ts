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
  const hasMultipleLines = byLines.filter(line => line.trim().length > 0).length > 1;
  if (hasMultipleLines) {
    return byLines.filter(line => line.trim().length > 0);
  }

  const segments: string[] = [];
  let start = 0;

  while (start < raw.length) {
    const separatorIndex = raw.indexOf(segmentSep, start);
    if (separatorIndex === -1) {
      const tail = raw.substring(start).trim();
      if (tail) segments.push(tail);
      break;
    }

    const segment = raw.substring(start, separatorIndex + segmentSep.length).trim();
    if (segment) segments.push(segment);
    start = separatorIndex + segmentSep.length;
  }

  return segments;
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
  const rawSegments = splitSegments(raw, segmentSep);
  const segmentsForCompare = rawSegments.map((segment) => {
    const trimmed = segment.trim();
    if (trimmed.endsWith(segmentSep)) {
      return trimmed.substring(0, trimmed.length - segmentSep.length).trimEnd();
    }
    return trimmed;
  });

  const { normalized } = normalizeSegments(segmentsForCompare, elementSep, ignoreRules);
  return { segments: normalized, rawSegments };
}
