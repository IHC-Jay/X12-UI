import { getSegment } from './segment-library';
import { X12TransactionLookup } from './types';

export function buildLookup(
  transaction: string,
  implementation: string,
  description: string,
  segmentIds: string[]
): X12TransactionLookup {
  return {
    transaction,
    implementation,
    description,
    segments: segmentIds.map((id) => getSegment(id))
  };
}
