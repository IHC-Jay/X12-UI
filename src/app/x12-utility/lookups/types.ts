export interface X12FieldDefinition {
  position: number;
  elementId: string;
  name: string;
}

export interface X12SegmentDefinition {
  segmentId: string;
  name: string;
  fields: X12FieldDefinition[];
}

export interface X12TransactionLookup {
  transaction: string;
  implementation: string;
  description: string;
  segments: X12SegmentDefinition[];
}
