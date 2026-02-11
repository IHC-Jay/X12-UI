export interface RdpX12Error {
  TransactionType: string;
  ProcessDtTm: string;
  TransactionSetId: string;
  SnipLevel: string;
  LoopId: string;
  LineNum: string;
  Segment:string;
  Element :string;
  FieldValue: string;
  SegmentData: string;
  X12DataId: string;
  ErrorType: string;
  ErrorCode: string;
  ErrorDesc:string;
}

export interface x12err {
  Num:string
  LineNum: string;
  Segment: string;
  Element :string;
  Error:string;
}
