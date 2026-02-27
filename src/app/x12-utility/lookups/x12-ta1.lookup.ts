import { buildLookup } from './build-lookup';

export const lookupTA1 = buildLookup(
  'TA1',
  'X12 Interchange Level',
  'Interchange Acknowledgment',
  ['ISA', 'TA1', 'IEA']
);
