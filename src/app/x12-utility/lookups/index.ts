import { X12TransactionLookup } from './types';
import { lookup270 } from './x12-270.lookup';
import { lookup271 } from './x12-271.lookup';
import { lookup276 } from './x12-276.lookup';
import { lookup277 } from './x12-277.lookup';
import { lookup277CA } from './x12-277ca.lookup';
import { lookup835 } from './x12-835.lookup';
import { lookup837P } from './x12-837p.lookup';
import { lookup837I } from './x12-837i.lookup';
import { lookup837D } from './x12-837d.lookup';
import { lookup999 } from './x12-999.lookup';
import { lookupTA1 } from './x12-ta1.lookup';

export * from './types';
export * from './segment-library';
export * from './x12-270.lookup';
export * from './x12-271.lookup';
export * from './x12-276.lookup';
export * from './x12-277.lookup';
export * from './x12-277ca.lookup';
export * from './x12-835.lookup';
export * from './x12-837p.lookup';
export * from './x12-837i.lookup';
export * from './x12-837d.lookup';
export * from './x12-999.lookup';
export * from './x12-ta1.lookup';

export const TRANSACTION_LOOKUPS: Record<string, X12TransactionLookup> = {
  '270': lookup270,
  '271': lookup271,
  '276': lookup276,
  '277': lookup277,
  '277CA': lookup277CA,
  '835': lookup835,
  '837P': lookup837P,
  '837I': lookup837I,
  '837D': lookup837D,
  '999': lookup999,
  TA1: lookupTA1
};
