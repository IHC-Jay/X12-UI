export const ELEMENT_LABELS_270: Record<string, string[]> = {
  ISA: ['AuthInfoQual','AuthInfo','SecurityInfoQual','SecurityInfo','InterchangeIDQualSender','InterchangeSenderID','InterchangeIDQualReceiver','InterchangeReceiverID','InterchangeDate','InterchangeTime','RepetitionSeparator','InterchangeControlVersion','InterchangeControlNumber','AcknowledgementRequested','UsageIndicator','ComponentElementSeparator'],
  GS: ['FunctionalIDCode','ApplicationSenderCode','ApplicationReceiverCode','Date','Time','GroupControlNumber','ResponsibleAgencyCode','VersionRelease'],
  ST: ['TransactionSetIdentifierCode','TransactionSetControlNumber','ImplementationConvention'],
  SE: ['IncludedSegmentsCount','TransactionSetControlNumber'],
  BHT: ['HierStructureCode','TransactionTypeCode','ReferenceID','Date','Time'],
  TRN: ['TraceTypeCode','ReferenceID','OriginatingCompanyID'],
  HL: ['HierarchicalIDNumber','HierarchicalParentID','HierarchicalLevelCode','HierarchicalChildCode'],
  NM1: ['EntityIdentifierCode','EntityTypeQualifier','NameLastOrOrganization','NameFirst','NameMiddle','NamePrefix','NameSuffix','IDCodeQualifier','IdentificationCode'],
  DMG: ['DateTimePeriodFormat','DateTimePeriod','GenderCode'],
  DTP: ['DateTimeQualifier','DateTimePeriodFormat','DateTimePeriod'],
  EQ: ['ServiceTypeCode'],
  REF: ['ReferenceIDQualifier','ReferenceID'],
  N3: ['AddressInformation1','AddressInformation2'],
  N4: ['CityName','StateOrProvince','PostalCode','CountryCode'],
  PER: ['ContactFunctionCode','Name','CommunicationNumberQualifier1','CommunicationNumber1','CommunicationNumberQualifier2','CommunicationNumber2'],
  GE: ['NumberOfTransactionSetsIncluded','GroupControlNumber'],
  IEA: ['NumberOfIncludedFunctionalGroups','InterchangeControlNumber']
};



export function elementLabel(tag: string, idx: number): string {
  const arr = ELEMENT_LABELS_270[tag];
  return arr && arr[idx] ? arr[idx] : `E${idx + 1}`;
}

// Ensure an element label array exists for `tag` with at least `count` entries.
// Fills missing entries with generic `E1..En` labels so UI always has a name.
export function ensureElementLabels(tag: string, count: number) {
  if (!ELEMENT_LABELS_270[tag]) ELEMENT_LABELS_270[tag] = [];
  const arr = ELEMENT_LABELS_270[tag];
  for (let i = 0; i < count; i++) {
    if (!arr[i]) arr[i] = `E${i + 1}`;
  }
}

export const TX_FRIENDLY_MAP: Record<string, string> = {
  '270': 'Eligibility Benefit Inquiry',
  '271': 'Eligibility Benefit Response',
  '276': 'Claim Status Inquiry',
  '277': 'Claim Status Response',
  '277CA': 'Claim Acknowledgement (277CA)',
  '835': 'Health Care Claim Payment/Advice (835)',
  '837P': 'Health Care Claim - Professional (837P)',
  '837I': 'Health Care Claim - Institutional (837I)',
  '837D': 'Health Care Claim - Dental (837D)',
  '999': 'Implementation Acknowledgment (999)',
  'TA1': 'Interchange Acknowledgment (TA1)'
};

export function txFriendlyName(code: string): string {
  return TX_FRIENDLY_MAP[code] || '';
}

// Map of transaction-specific element label sets. Where a transaction
// doesn't yet have a custom label set, the 270 baseline is used.
// Ensure per-transaction constants exist. `ELEMENT_LABELS_271` created
// explicitly so it can be customized independently from the 270 baseline.
export const ELEMENT_LABELS_271: Record<string, string[]> = {
  ISA: ['AuthInfoQual','AuthInfo','SecurityInfoQual','SecurityInfo','InterchangeIDQualSender','InterchangeSenderID','InterchangeIDQualReceiver','InterchangeReceiverID','InterchangeDate','InterchangeTime','RepetitionSeparator','InterchangeControlVersion','InterchangeControlNumber','AcknowledgementRequested','UsageIndicator','ComponentElementSeparator'],
  GS: ['FunctionalIDCode','ApplicationSenderCode','ApplicationReceiverCode','Date','Time','GroupControlNumber','ResponsibleAgencyCode','VersionRelease'],
  ST: ['TransactionSetIdentifierCode','TransactionSetControlNumber','ImplementationConvention'],
  SE: ['IncludedSegmentsCount','TransactionSetControlNumber'],
  BHT: ['HierStructureCode','TransactionTypeCode','ReferenceID','Date','Time'],
  TRN: ['TraceTypeCode','ReferenceID','OriginatingCompanyID'],
  HL: ['HierarchicalIDNumber','HierarchicalParentID','HierarchicalLevelCode','HierarchicalChildCode'],
  NM1: ['EntityIdentifierCode','EntityTypeQualifier','NameLastOrOrganization','NameFirst','NameMiddle','NamePrefix','NameSuffix','IDCodeQualifier','IdentificationCode'],
  DMG: ['DateTimePeriodFormat','DateTimePeriod','GenderCode'],
  DTP: ['DateTimeQualifier','DateTimePeriodFormat','DateTimePeriod'],
  EQ: ['ServiceTypeCode'],
  REF: ['ReferenceIDQualifier','ReferenceID'],
  N3: ['AddressInformation1','AddressInformation2'],
  N4: ['CityName','StateOrProvince','PostalCode','CountryCode'],
  PER: ['ContactFunctionCode','Name','CommunicationNumberQualifier1','CommunicationNumber1','CommunicationNumberQualifier2','CommunicationNumber2'],
  GE: ['NumberOfTransactionSetsIncluded','GroupControlNumber'],
  IEA: ['NumberOfIncludedFunctionalGroups','InterchangeControlNumber']
};
export const ELEMENT_LABELS_276: Record<string, string[]> = {
  ISA: ['AuthInfoQual','AuthInfo','SecurityInfoQual','SecurityInfo','InterchangeIDQualSender','InterchangeSenderID','InterchangeIDQualReceiver','InterchangeReceiverID','InterchangeDate','InterchangeTime','RepetitionSeparator','InterchangeControlVersion','InterchangeControlNumber','AcknowledgementRequested','UsageIndicator','ComponentElementSeparator'],
  GS: ['FunctionalIDCode','ApplicationSenderCode','ApplicationReceiverCode','Date','Time','GroupControlNumber','ResponsibleAgencyCode','VersionRelease'],
  ST: ['TransactionSetIdentifierCode','TransactionSetControlNumber','ImplementationConvention'],
  SE: ['IncludedSegmentsCount','TransactionSetControlNumber'],
  BHT: ['HierStructureCode','TransactionTypeCode','ReferenceID','Date','Time'],
  TRN: ['TraceTypeCode','ReferenceID','OriginatingCompanyID'],
  HL: ['HierarchicalIDNumber','HierarchicalParentID','HierarchicalLevelCode','HierarchicalChildCode'],
  NM1: ['EntityIdentifierCode','EntityTypeQualifier','NameLastOrOrganization','NameFirst','NameMiddle','NamePrefix','NameSuffix','IDCodeQualifier','IdentificationCode'],
  DMG: ['DateTimePeriodFormat','DateTimePeriod','GenderCode'],
  DTP: ['DateTimeQualifier','DateTimePeriodFormat','DateTimePeriod'],
  EQ: ['ServiceTypeCode'],
  REF: ['ReferenceIDQualifier','ReferenceID'],
  N3: ['AddressInformation1','AddressInformation2'],
  N4: ['CityName','StateOrProvince','PostalCode','CountryCode'],
  PER: ['ContactFunctionCode','Name','CommunicationNumberQualifier1','CommunicationNumber1','CommunicationNumberQualifier2','CommunicationNumber2'],
  GE: ['NumberOfTransactionSetsIncluded','GroupControlNumber'],
  IEA: ['NumberOfIncludedFunctionalGroups','InterchangeControlNumber']
};
export const ELEMENT_LABELS_277: Record<string, string[]> = {
  ISA: ['AuthInfoQual','AuthInfo','SecurityInfoQual','SecurityInfo','InterchangeIDQualSender','InterchangeSenderID','InterchangeIDQualReceiver','InterchangeReceiverID','InterchangeDate','InterchangeTime','RepetitionSeparator','InterchangeControlVersion','InterchangeControlNumber','AcknowledgementRequested','UsageIndicator','ComponentElementSeparator'],
  GS: ['FunctionalIDCode','ApplicationSenderCode','ApplicationReceiverCode','Date','Time','GroupControlNumber','ResponsibleAgencyCode','VersionRelease'],
  ST: ['TransactionSetIdentifierCode','TransactionSetControlNumber','ImplementationConvention'],
  SE: ['IncludedSegmentsCount','TransactionSetControlNumber'],
  BHT: ['HierStructureCode','TransactionTypeCode','ReferenceID','Date','Time'],
  TRN: ['TraceTypeCode','ReferenceID','OriginatingCompanyID'],
  HL: ['HierarchicalIDNumber','HierarchicalParentID','HierarchicalLevelCode','HierarchicalChildCode'],
  NM1: ['EntityIdentifierCode','EntityTypeQualifier','NameLastOrOrganization','NameFirst','NameMiddle','NamePrefix','NameSuffix','IDCodeQualifier','IdentificationCode'],
  DMG: ['DateTimePeriodFormat','DateTimePeriod','GenderCode'],
  DTP: ['DateTimeQualifier','DateTimePeriodFormat','DateTimePeriod'],
  EQ: ['ServiceTypeCode'],
  REF: ['ReferenceIDQualifier','ReferenceID'],
  N3: ['AddressInformation1','AddressInformation2'],
  N4: ['CityName','StateOrProvince','PostalCode','CountryCode'],
  PER: ['ContactFunctionCode','Name','CommunicationNumberQualifier1','CommunicationNumber1','CommunicationNumberQualifier2','CommunicationNumber2'],
  GE: ['NumberOfTransactionSetsIncluded','GroupControlNumber'],
  IEA: ['NumberOfIncludedFunctionalGroups','InterchangeControlNumber']
};
export const ELEMENT_LABELS_277CA: Record<string, string[]> = {
  ISA: ['AuthInfoQual','AuthInfo','SecurityInfoQual','SecurityInfo','InterchangeIDQualSender','InterchangeSenderID','InterchangeIDQualReceiver','InterchangeReceiverID','InterchangeDate','InterchangeTime','RepetitionSeparator','InterchangeControlVersion','InterchangeControlNumber','AcknowledgementRequested','UsageIndicator','ComponentElementSeparator'],
  GS: ['FunctionalIDCode','ApplicationSenderCode','ApplicationReceiverCode','Date','Time','GroupControlNumber','ResponsibleAgencyCode','VersionRelease'],
  ST: ['TransactionSetIdentifierCode','TransactionSetControlNumber','ImplementationConvention'],
  SE: ['IncludedSegmentsCount','TransactionSetControlNumber'],
  BHT: ['HierarchicalStructureCode','TransactionTypeCode','ReferenceID','Date','Time'],
  TRN: ['TraceTypeCode','ReferenceID','OriginatingCompanyID'],
  HL: ['HierarchicalIDNumber','HierarchicalParentID','HierarchicalLevelCode','HierarchicalChildCode'],
  NM1: ['EntityIdentifierCode','EntityTypeQualifier','NameLastOrOrganization','NameFirst','NameMiddle','NamePrefix','NameSuffix','IDCodeQualifier','IdentificationCode'],
  DMG: ['DateTimePeriodFormat','DateTimePeriod','GenderCode'],
  DTP: ['DateTimeQualifier','DateTimePeriodFormat','DateTimePeriod'],
  EQ: ['ServiceTypeCode'],
  REF: ['ReferenceIDQualifier','ReferenceID'],
  N3: ['AddressInformation1','AddressInformation2'],
  N4: ['CityName','StateOrProvince','PostalCode','CountryCode'],
  PER: ['ContactFunctionCode','Name','CommunicationNumberQualifier1','CommunicationNumber1','CommunicationNumberQualifier2','CommunicationNumber2'],
  GE: ['NumberOfTransactionSetsIncluded','GroupControlNumber'],
  IEA: ['NumberOfIncludedFunctionalGroups','InterchangeControlNumber']
};
export const ELEMENT_LABELS_835: Record<string, string[]> = {
  ISA: ['AuthInfoQual','AuthInfo','SecurityInfoQual','SecurityInfo','InterchangeIDQualSender','InterchangeSenderID','InterchangeIDQualReceiver','InterchangeReceiverID','InterchangeDate','InterchangeTime','RepetitionSeparator','InterchangeControlVersion','InterchangeControlNumber','AcknowledgementRequested','UsageIndicator','ComponentElementSeparator'],
  GS: ['FunctionalIDCode','ApplicationSenderCode','ApplicationReceiverCode','Date','Time','GroupControlNumber','ResponsibleAgencyCode','VersionRelease'],
  ST: ['TransactionSetIdentifierCode','TransactionSetControlNumber','ImplementationConvention'],
  SE: ['IncludedSegmentsCount','TransactionSetControlNumber'],
  BPR: [
    'TransactionHandlingCode',
    'MonetaryAmount',
    'CreditDebitFlagCode',
    'PaymentMethodCode',
    'PaymentFormatCode',
    'DFI_ID_Qualifier',
    'DFI_ID_Number',
    'AccountNumberQualifier',
    'AccountNumber',
    'OriginatingCompanyID',
    'OriginatingCompanySupplementalCode',
    'EffectiveEntryDate',
    'PaymentTraceNumber',
    'PaymentRelatedInformation'
  ],
  BHT: ['HierStructureCode','TransactionTypeCode','ReferenceID','Date','Time'],
  TRN: ['TraceTypeCode','ReferenceID','OriginatingCompanyID'],
  HL: ['HierarchicalIDNumber','HierarchicalParentID','HierarchicalLevelCode','HierarchicalChildCode'],
  NM1: ['EntityIdentifierCode','EntityTypeQualifier','NameLastOrOrganization','NameFirst','NameMiddle','NamePrefix','NameSuffix','IDCodeQualifier','IdentificationCode'],
  DMG: ['DateTimePeriodFormat','DateTimePeriod','GenderCode'],
  DTP: ['DateTimeQualifier','DateTimePeriodFormat','DateTimePeriod'],
  EQ: ['ServiceTypeCode'],
  REF: ['ReferenceIDQualifier','ReferenceID'],
  N3: ['AddressInformation1','AddressInformation2'],
  N4: ['CityName','StateOrProvince','PostalCode','CountryCode'],
  PER: ['ContactFunctionCode','Name','CommunicationNumberQualifier1','CommunicationNumber1','CommunicationNumberQualifier2','CommunicationNumber2'],
  GE: ['NumberOfTransactionSetsIncluded','GroupControlNumber'],
  IEA: ['NumberOfIncludedFunctionalGroups','InterchangeControlNumber']
};

export const ELEMENT_LABELS_837P: Record<string, string[]> = {
  ISA: ['AuthInfoQual','AuthInfo','SecurityInfoQual','SecurityInfo','InterchangeIDQualSender','InterchangeSenderID','InterchangeIDQualReceiver','InterchangeReceiverID','InterchangeDate','InterchangeTime','RepetitionSeparator','InterchangeControlVersion','InterchangeControlNumber','AcknowledgementRequested','UsageIndicator','ComponentElementSeparator'],
  GS: ['FunctionalIDCode','ApplicationSenderCode','ApplicationReceiverCode','Date','Time','GroupControlNumber','ResponsibleAgencyCode','VersionRelease'],
  ST: ['TransactionSetIdentifierCode','TransactionSetControlNumber','ImplementationConvention'],
  SE: ['IncludedSegmentsCount','TransactionSetControlNumber'],
  BHT: ['HierStructureCode','TransactionTypeCode','ReferenceID','Date','Time'],
  TRN: ['TraceTypeCode','ReferenceID','OriginatingCompanyID'],
  HL: ['HierarchicalIDNumber','HierarchicalParentID','HierarchicalLevelCode','HierarchicalChildCode'],
  NM1: ['EntityIdentifierCode','EntityTypeQualifier','NameLastOrOrganization','NameFirst','NameMiddle','NamePrefix','NameSuffix','IDCodeQualifier','IdentificationCode'],
  DMG: ['DateTimePeriodFormat','DateTimePeriod','GenderCode'],
  DTP: ['DateTimeQualifier','DateTimePeriodFormat','DateTimePeriod'],
  EQ: ['ServiceTypeCode'],
  REF: ['ReferenceIDQualifier','ReferenceID'],
  N3: ['AddressInformation1','AddressInformation2'],
  N4: ['CityName','StateOrProvince','PostalCode','CountryCode'],
  PER: ['ContactFunctionCode','Name','CommunicationNumberQualifier1','CommunicationNumber1','CommunicationNumberQualifier2','CommunicationNumber2'],
  GE: ['NumberOfTransactionSetsIncluded','GroupControlNumber'],
  IEA: ['NumberOfIncludedFunctionalGroups','InterchangeControlNumber']
};
export const ELEMENT_LABELS_837I: Record<string, string[]> = {
  ISA: ['AuthInfoQual','AuthInfo','SecurityInfoQual','SecurityInfo','InterchangeIDQualSender','InterchangeSenderID','InterchangeIDQualReceiver','InterchangeReceiverID','InterchangeDate','InterchangeTime','RepetitionSeparator','InterchangeControlVersion','InterchangeControlNumber','AcknowledgementRequested','UsageIndicator','ComponentElementSeparator'],
  GS: ['FunctionalIDCode','ApplicationSenderCode','ApplicationReceiverCode','Date','Time','GroupControlNumber','ResponsibleAgencyCode','VersionRelease'],
  ST: ['TransactionSetIdentifierCode','TransactionSetControlNumber','ImplementationConvention'],
  SE: ['IncludedSegmentsCount','TransactionSetControlNumber'],
  BHT: ['HierStructureCode','TransactionTypeCode','ReferenceID','Date','Time'],
  TRN: ['TraceTypeCode','ReferenceID','OriginatingCompanyID'],
  HL: ['HierarchicalIDNumber','HierarchicalParentID','HierarchicalLevelCode','HierarchicalChildCode'],
  NM1: ['EntityIdentifierCode','EntityTypeQualifier','NameLastOrOrganization','NameFirst','NameMiddle','NamePrefix','NameSuffix','IDCodeQualifier','IdentificationCode'],
  DMG: ['DateTimePeriodFormat','DateTimePeriod','GenderCode'],
  DTP: ['DateTimeQualifier','DateTimePeriodFormat','DateTimePeriod'],
  EQ: ['ServiceTypeCode'],
  REF: ['ReferenceIDQualifier','ReferenceID'],
  N3: ['AddressInformation1','AddressInformation2'],
  N4: ['CityName','StateOrProvince','PostalCode','CountryCode'],
  PER: ['ContactFunctionCode','Name','CommunicationNumberQualifier1','CommunicationNumber1','CommunicationNumberQualifier2','CommunicationNumber2'],
  GE: ['NumberOfTransactionSetsIncluded','GroupControlNumber'],
  IEA: ['NumberOfIncludedFunctionalGroups','InterchangeControlNumber']
};
export const ELEMENT_LABELS_837D: Record<string, string[]> = {
  ISA: ['AuthInfoQual','AuthInfo','SecurityInfoQual','SecurityInfo','InterchangeIDQualSender','InterchangeSenderID','InterchangeIDQualReceiver','InterchangeReceiverID','InterchangeDate','InterchangeTime','RepetitionSeparator','InterchangeControlVersion','InterchangeControlNumber','AcknowledgementRequested','UsageIndicator','ComponentElementSeparator'],
  GS: ['FunctionalIDCode','ApplicationSenderCode','ApplicationReceiverCode','Date','Time','GroupControlNumber','ResponsibleAgencyCode','VersionRelease'],
  ST: ['TransactionSetIdentifierCode','TransactionSetControlNumber','ImplementationConvention'],
  SE: ['IncludedSegmentsCount','TransactionSetControlNumber'],
  BHT: ['HierStructureCode','TransactionTypeCode','ReferenceID','Date','Time'],
  TRN: ['TraceTypeCode','ReferenceID','OriginatingCompanyID'],
  HL: ['HierarchicalIDNumber','HierarchicalParentID','HierarchicalLevelCode','HierarchicalChildCode'],
  NM1: ['EntityIdentifierCode','EntityTypeQualifier','NameLastOrOrganization','NameFirst','NameMiddle','NamePrefix','NameSuffix','IDCodeQualifier','IdentificationCode'],
  DMG: ['DateTimePeriodFormat','DateTimePeriod','GenderCode'],
  DTP: ['DateTimeQualifier','DateTimePeriodFormat','DateTimePeriod'],
  EQ: ['ServiceTypeCode'],
  REF: ['ReferenceIDQualifier','ReferenceID'],
  N3: ['AddressInformation1','AddressInformation2'],
  N4: ['CityName','StateOrProvince','PostalCode','CountryCode'],
  PER: ['ContactFunctionCode','Name','CommunicationNumberQualifier1','CommunicationNumber1','CommunicationNumberQualifier2','CommunicationNumber2'],
  GE: ['NumberOfTransactionSetsIncluded','GroupControlNumber'],
  IEA: ['NumberOfIncludedFunctionalGroups','InterchangeControlNumber']
};
export const ELEMENT_LABELS_999: Record<string, string[]> = {
  ISA: ['AuthInfoQual','AuthInfo','SecurityInfoQual','SecurityInfo','InterchangeIDQualSender','InterchangeSenderID','InterchangeIDQualReceiver','InterchangeReceiverID','InterchangeDate','InterchangeTime','RepetitionSeparator','InterchangeControlVersion','InterchangeControlNumber','AcknowledgementRequested','UsageIndicator','ComponentElementSeparator'],
  GS: ['FunctionalIDCode','ApplicationSenderCode','ApplicationReceiverCode','Date','Time','GroupControlNumber','ResponsibleAgencyCode','VersionRelease'],
  ST: ['TransactionSetIdentifierCode','TransactionSetControlNumber','ImplementationConvention'],
  SE: ['IncludedSegmentsCount','TransactionSetControlNumber'],
  BHT: ['HierStructureCode','TransactionTypeCode','ReferenceID','Date','Time'],
  TRN: ['TraceTypeCode','ReferenceID','OriginatingCompanyID'],
  HL: ['HierarchicalIDNumber','HierarchicalParentID','HierarchicalLevelCode','HierarchicalChildCode'],
  NM1: ['EntityIdentifierCode','EntityTypeQualifier','NameLastOrOrganization','NameFirst','NameMiddle','NamePrefix','NameSuffix','IDCodeQualifier','IdentificationCode'],
  DMG: ['DateTimePeriodFormat','DateTimePeriod','GenderCode'],
  DTP: ['DateTimeQualifier','DateTimePeriodFormat','DateTimePeriod'],
  EQ: ['ServiceTypeCode'],
  REF: ['ReferenceIDQualifier','ReferenceID'],
  N3: ['AddressInformation1','AddressInformation2'],
  N4: ['CityName','StateOrProvince','PostalCode','CountryCode'],
  PER: ['ContactFunctionCode','Name','CommunicationNumberQualifier1','CommunicationNumber1','CommunicationNumberQualifier2','CommunicationNumber2'],
  GE: ['NumberOfTransactionSetsIncluded','GroupControlNumber'],
  IEA: ['NumberOfIncludedFunctionalGroups','InterchangeControlNumber']
};
export const ELEMENT_LABELS_TA1: Record<string, string[]> = {
  ISA: ['AuthInfoQual','AuthInfo','SecurityInfoQual','SecurityInfo','InterchangeIDQualSender','InterchangeSenderID','InterchangeIDQualReceiver','InterchangeReceiverID','InterchangeDate','InterchangeTime','RepetitionSeparator','InterchangeControlVersion','InterchangeControlNumber','AcknowledgementRequested','UsageIndicator','ComponentElementSeparator'],
  GS: ['FunctionalIDCode','ApplicationSenderCode','ApplicationReceiverCode','Date','Time','GroupControlNumber','ResponsibleAgencyCode','VersionRelease'],
  ST: ['TransactionSetIdentifierCode','TransactionSetControlNumber','ImplementationConvention'],
  SE: ['IncludedSegmentsCount','TransactionSetControlNumber'],
  BHT: ['HierStructureCode','TransactionTypeCode','ReferenceID','Date','Time'],
  TRN: ['TraceTypeCode','ReferenceID','OriginatingCompanyID'],
  HL: ['HierarchicalIDNumber','HierarchicalParentID','HierarchicalLevelCode','HierarchicalChildCode'],
  NM1: ['EntityIdentifierCode','EntityTypeQualifier','NameLastOrOrganization','NameFirst','NameMiddle','NamePrefix','NameSuffix','IDCodeQualifier','IdentificationCode'],
  DMG: ['DateTimePeriodFormat','DateTimePeriod','GenderCode'],
  DTP: ['DateTimeQualifier','DateTimePeriodFormat','DateTimePeriod'],
  EQ: ['ServiceTypeCode'],
  REF: ['ReferenceIDQualifier','ReferenceID'],
  N3: ['AddressInformation1','AddressInformation2'],
  N4: ['CityName','StateOrProvince','PostalCode','CountryCode'],
  PER: ['ContactFunctionCode','Name','CommunicationNumberQualifier1','CommunicationNumber1','CommunicationNumberQualifier2','CommunicationNumber2'],
  GE: ['NumberOfTransactionSetsIncluded','GroupControlNumber'],
  IEA: ['NumberOfIncludedFunctionalGroups','InterchangeControlNumber']
};

export const TRANSACTION_ELEMENT_LABELS: Record<string, Record<string, string[]>> = {
  '270': ELEMENT_LABELS_270,
  '271': ELEMENT_LABELS_271,
  '276': ELEMENT_LABELS_276,
  '277': ELEMENT_LABELS_277,
  '277CA': ELEMENT_LABELS_277CA,
  '835': ELEMENT_LABELS_835,
  '837P': ELEMENT_LABELS_837P,
  '837I': ELEMENT_LABELS_837I,
  '837D': ELEMENT_LABELS_837D,
  '999': ELEMENT_LABELS_999,
  'TA1': ELEMENT_LABELS_TA1
};



// Human readable segment labels
export const SEGMENT_LABELS: Record<string, string> = {
  ISA: 'Interchange Control Header',
  GS: 'Functional Group Header',
  ST: 'Transaction Set Header',
  SE: 'Transaction Set Trailer',
  BHT: 'Beginning of Hierarchical Transaction',
  TRN: 'Transaction',
  HL: 'Hierarchical Level',
  NM1: 'Individual or Organizational Name',
  DMG: 'Demographic Information',
  DTP: 'Date or Time or Period',
  EQ: 'Eligibility or Benefit Inquiry',
  REF: 'Reference Information',
  N3: 'Address Information',
  N4: 'Geographic Location',
  PER: 'Administrative Communications Contact',
  GE: 'Functional Group Trailer',
  IEA: 'Interchange Control Trailer',
  BPR: 'Financial Information (Payment)',
  CLP: 'Claim Level Payment Info',
  CLM: 'Claim Information',
  SVC: 'Service Line Information',
  DTM: 'Date/Time Reference',
  CAS: 'Claims Adjustment',
  CL1: 'Institutional Claim Level Data',
  LX: 'Service Line Number',
  SV2: 'Professional Service',
  HI: 'Health Care Information Codes',
  N1: 'Party Identification',
  STC: 'Status Information'
};
