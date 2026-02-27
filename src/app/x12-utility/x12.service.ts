
export interface X12Segment { tag: string; elements: string[]; raw: string; index: number; loop?: string; }
export interface X12File { text: string; segments: X12Segment[]; elementSep: string; compSep?: string; segTerm: string; transactionType: string; }

function detectTransactionType(segments: X12Segment[]): string {
  const ta1 = segments.find((segment) => segment.tag === 'TA1');
  if (ta1) return 'TA1';

  const st = segments.find((segment) => segment.tag === 'ST');
  const gs = segments.find((segment) => segment.tag === 'GS');

  const stType = (st?.elements[0] || '').trim().toUpperCase();
  const implementation = ((st?.elements[2] || gs?.elements[7]) || '').trim().toUpperCase();

  if (!stType) return 'Unknown';

  if (stType === '837') {
    if (implementation.includes('X222')) return '837P';
    if (implementation.includes('X223')) return '837I';
    if (implementation.includes('X224')) return '837D';
  }

  if (stType === '277' && implementation.includes('X214')) {
    return '277CA';
  }

  return stType;
}

function inferLoops(segments: X12Segment[], transactionType: string): X12Segment[] {
  const tx = transactionType.toUpperCase();
  let currentLoop = '';
  let currentHlLoop = '';

  const hlMapEligibility: Record<string, string> = {
    '20': '2000A',
    '21': '2000B',
    '22': '2000C',
    '23': '2000D'
  };

  const loopByHl2100: Record<string, string> = {
    '2000A': '2100A',
    '2000B': '2100B',
    '2000C': '2100C',
    '2000D': '2100D'
  };

  const hlMap837: Record<string, string> = {
    '20': '2000A',
    '22': '2000B',
    '23': '2000C'
  };

  const assignLoop = (segment: X12Segment): string | undefined => {
    const segmentTag = segment.tag;
    const elements = segment.elements;

    if (segmentTag === 'SE') {
      currentLoop = '';
      currentHlLoop = '';
      return undefined;
    }

    if (segmentTag === 'GE' || segmentTag === 'IEA') {
      currentLoop = '';
      currentHlLoop = '';
      return undefined;
    }

    switch (tx) {
      case '837P': {
        if (segmentTag === 'HL') {
          const hlCode = (elements[2] || '').trim().toUpperCase();
          currentHlLoop = hlMap837[hlCode] || currentHlLoop;
          currentLoop = currentHlLoop;
          break;
        }

        if (segmentTag === 'NM1') {
          const entity = (elements[0] || '').trim().toUpperCase();
          if (entity === '41') currentLoop = '1000A';
          else if (entity === '40') currentLoop = '1000B';
          else if (currentHlLoop === '2000A' && entity === '85') currentLoop = '2010AA';
          else if (currentHlLoop === '2000A' && entity === '87') currentLoop = '2010AB';
          else if (currentHlLoop === '2000B' && entity === 'IL') currentLoop = '2010BA';
          else if (currentHlLoop === '2000B' && entity === 'PR') currentLoop = '2010BB';
          else if (currentHlLoop === '2000C' && entity === 'QC') currentLoop = '2010CA';
          else if (currentLoop === '2300' && entity === '82') currentLoop = '2310B';
          else if (currentLoop === '2300' && entity === '77') currentLoop = '2310C';
          else if (currentLoop === '2300' && entity === 'DN') currentLoop = '2310A';
          else if (currentLoop === '2400' && entity === '82') currentLoop = '2420A';
          else if (currentLoop === '2400' && entity === 'QB') currentLoop = '2420B';
          else if (currentLoop === '2400' && entity === '77') currentLoop = '2420C';
          else if (currentLoop === '2400' && entity === 'DK') currentLoop = '2420D';
        }

        if (segmentTag === 'CLM') currentLoop = '2300';
        if (segmentTag === 'LX') currentLoop = '2400';
        if (segmentTag === 'SVD' || segmentTag === 'CAS') {
          if (currentLoop === '2400' || currentLoop === '2430') currentLoop = '2430';
        }
        if (segmentTag === 'LQ' || segmentTag === 'FRM') {
          if (currentLoop === '2400' || currentLoop === '2430' || currentLoop === '2440') currentLoop = '2440';
        }
        break;
      }

      case '837I': {
        if (segmentTag === 'HL') {
          const hlCode = (elements[2] || '').trim().toUpperCase();
          currentHlLoop = hlMap837[hlCode] || currentHlLoop;
          currentLoop = currentHlLoop;
          break;
        }

        if (segmentTag === 'NM1') {
          const entity = (elements[0] || '').trim().toUpperCase();
          if (entity === '41') currentLoop = '1000A';
          else if (entity === '40') currentLoop = '1000B';
          else if (currentHlLoop === '2000A' && entity === '85') currentLoop = '2010AA';
          else if (currentHlLoop === '2000A' && entity === '87') currentLoop = '2010AB';
          else if (currentHlLoop === '2000B' && entity === 'IL') currentLoop = '2010BA';
          else if (currentHlLoop === '2000B' && entity === 'PR') currentLoop = '2010BB';
          else if (currentHlLoop === '2000C' && entity === 'QC') currentLoop = '2010CA';
          else if (currentLoop === '2300' && entity === '71') currentLoop = '2310A';
          else if (currentLoop === '2300' && entity === '72') currentLoop = '2310B';
          else if (currentLoop === '2300' && entity === 'ZZ') currentLoop = '2310C';
          else if (currentLoop === '2400' && entity === '71') currentLoop = '2420A';
          else if (currentLoop === '2400' && entity === '72') currentLoop = '2420B';
          else if (currentLoop === '2400' && entity === 'ZZ') currentLoop = '2420C';
        }

        if (segmentTag === 'CLM') currentLoop = '2300';
        if (segmentTag === 'LX') currentLoop = '2400';
        if (segmentTag === 'SVD' || segmentTag === 'CAS') {
          if (currentLoop === '2400' || currentLoop === '2430') currentLoop = '2430';
        }
        break;
      }

      case '837D': {
        if (segmentTag === 'HL') {
          const hlCode = (elements[2] || '').trim().toUpperCase();
          currentHlLoop = hlMap837[hlCode] || currentHlLoop;
          currentLoop = currentHlLoop;
          break;
        }

        if (segmentTag === 'NM1') {
          const entity = (elements[0] || '').trim().toUpperCase();
          if (entity === '41') currentLoop = '1000A';
          else if (entity === '40') currentLoop = '1000B';
          else if (currentHlLoop === '2000A' && entity === '85') currentLoop = '2010AA';
          else if (currentHlLoop === '2000A' && entity === '87') currentLoop = '2010AB';
          else if (currentHlLoop === '2000B' && entity === 'IL') currentLoop = '2010BA';
          else if (currentHlLoop === '2000B' && entity === 'PR') currentLoop = '2010BB';
          else if (currentHlLoop === '2000C' && entity === 'QC') currentLoop = '2010CA';
          else if (currentLoop === '2300' && entity === '82') currentLoop = '2310B';
          else if (currentLoop === '2300' && entity === 'DN') currentLoop = '2310A';
          else if (currentLoop === '2400' && entity === '82') currentLoop = '2420A';
        }

        if (segmentTag === 'CLM') currentLoop = '2300';
        if (segmentTag === 'LX') currentLoop = '2400';
        if (segmentTag === 'SVD' || segmentTag === 'CAS') {
          if (currentLoop === '2400' || currentLoop === '2430') currentLoop = '2430';
        }
        break;
      }

      case '270':
      case '271': {
        if (segmentTag === 'HL') {
          const hlCode = (elements[2] || '').trim().toUpperCase();
          currentHlLoop = hlMapEligibility[hlCode] || currentHlLoop;
          currentLoop = currentHlLoop;
          break;
        }

        if (segmentTag === 'NM1' && currentHlLoop) {
          currentLoop = loopByHl2100[currentHlLoop] || currentLoop;
        }

        if (segmentTag === 'EQ' || segmentTag === 'III' || segmentTag === 'AMT') {
          if (currentLoop === '2100C') currentLoop = '2110C';
          if (currentLoop === '2100D') currentLoop = '2110D';
        }
        break;
      }

      case '276':
      case '277':
      case '277CA': {
        if (segmentTag === 'HL') {
          const hlCode = (elements[2] || '').trim().toUpperCase();
          const loopByHlCode: Record<string, string> = {
            '20': '2000A',
            '21': '2000B',
            '19': '2000C',
            '22': '2000D',
            '23': '2000E'
          };
          currentHlLoop = loopByHlCode[hlCode] || currentHlLoop;
          currentLoop = currentHlLoop;
          break;
        }

        if (segmentTag === 'NM1' && currentHlLoop) {
          const loopByHl: Record<string, string> = {
            '2000A': '2100A',
            '2000B': '2100B',
            '2000C': '2100C',
            '2000D': '2100D',
            '2000E': '2100E'
          };
          currentLoop = loopByHl[currentHlLoop] || currentLoop;
        }

        if (segmentTag === 'TRN' || segmentTag === 'STC' || segmentTag === 'REF' || segmentTag === 'DTP' || segmentTag === 'SVC') {
          const detailBy2100: Record<string, string> = {
            '2100A': '2200A',
            '2100B': '2200B',
            '2100C': '2200C',
            '2100D': '2200D',
            '2100E': '2200E'
          };
          currentLoop = detailBy2100[currentLoop] || currentLoop;
        }
        break;
      }

      case '835': {
        if (segmentTag === 'N1') {
          const entity = (elements[0] || '').trim().toUpperCase();
          if (entity === 'PR') currentLoop = '1000A';
          else if (entity === 'PE') currentLoop = '1000B';
        }
        if (segmentTag === 'LX') currentLoop = '2000';
        if (segmentTag === 'CLP') currentLoop = '2100';
        if (segmentTag === 'SVC') currentLoop = '2110';
        if (segmentTag === 'PLB') currentLoop = 'PLB';
        break;
      }

      case '999': {
        if (segmentTag === 'AK1') currentLoop = '2000';
        if (segmentTag === 'AK2') currentLoop = '2100';
        if (segmentTag === 'IK3' || segmentTag === 'CTX') currentLoop = '2110';
        if (segmentTag === 'IK4') currentLoop = '2110';
        if (segmentTag === 'IK5') currentLoop = '2100';
        if (segmentTag === 'AK9') currentLoop = '2000';
        break;
      }

      case 'TA1': {
        currentLoop = 'TA1';
        break;
      }

      default: {
        if (segmentTag === 'HL') {
          const hlCode = (elements[2] || '').trim().toUpperCase();
          currentHlLoop = hlMapEligibility[hlCode] || currentHlLoop;
          currentLoop = currentHlLoop;
        }
        break;
      }
    }

    return currentLoop || undefined;
  };

  return segments.map((segment) => ({ ...segment, loop: assignLoop(segment) }));
}

function detectSeparators(text: string): { elementSep: string; segTerm: string; compSep?: string } {
  let elementSep = '*';
  let segTerm = '~';
  let compSep: string | undefined;
  if (text.indexOf('ISA') === 0 && text.length > 4) {
    elementSep = text.charAt(3);
    const sample = text.slice(0, 2000);
    const candidates = ['~', '\n', '\r'];

    segTerm = candidates.sort((a,b) => (sample.split(b).length-1) - (sample.split(a).length-1))[0];
    const end = text.indexOf(segTerm);
    if (end > -1) {
      const parts = text.slice(0, end).split(elementSep);
      if (parts.length >= 17) compSep = parts[16].slice(-1);
    }
  }
  return { elementSep, segTerm, compSep };
}

export function parseX12(text: string): X12File {
  const { elementSep, segTerm, compSep } = detectSeparators(text);
  const raw = text.split(segTerm).map(s => s.trim()).filter(Boolean);
  const baseSegments: X12Segment[] = raw.map((r, i) => {
    const [rawTag, ...elements] = r.split(elementSep);
    const tag = (rawTag || '').trim().toUpperCase();
    const els = elements;
    return { tag, elements: els, raw: r, index: i };
  });
  const transactionType = detectTransactionType(baseSegments);
  const segments = inferLoops(baseSegments, transactionType);
  return { text, segments, elementSep, compSep, segTerm, transactionType };
}
