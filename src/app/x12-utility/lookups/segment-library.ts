import { X12SegmentDefinition } from './types';

type DefMap = Record<string, X12SegmentDefinition>;

export const SEGMENT_LIBRARY: DefMap = {
  AAA: {
    segmentId: 'AAA',
    name: 'Request Validation',
    fields: [
      { position: 1, elementId: 'Y/N', name: 'Valid Request Indicator' },
      { position: 2, elementId: '1073', name: 'Agency Qualifier Code' },
      { position: 3, elementId: '559', name: 'Reject Reason Code' },
      { position: 4, elementId: '901', name: 'Follow-up Action Code' }
    ]
  },
  AK1: {
    segmentId: 'AK1',
    name: 'Functional Group Response Header',
    fields: [
      { position: 1, elementId: '479', name: 'Functional Identifier Code' },
      { position: 2, elementId: '28', name: 'Group Control Number' },
      { position: 3, elementId: '480', name: 'Version / Release / Industry Identifier Code' }
    ]
  },
  AK2: {
    segmentId: 'AK2',
    name: 'Transaction Set Response Header',
    fields: [
      { position: 1, elementId: '143', name: 'Transaction Set Identifier Code' },
      { position: 2, elementId: '329', name: 'Transaction Set Control Number' },
      { position: 3, elementId: '1705', name: 'Implementation Convention Reference' }
    ]
  },
  AK9: {
    segmentId: 'AK9',
    name: 'Functional Group Response Trailer',
    fields: [
      { position: 1, elementId: '717', name: 'Functional Group Acknowledge Code' },
      { position: 2, elementId: '97', name: 'Number of Transaction Sets Included' },
      { position: 3, elementId: '123', name: 'Number of Received Transaction Sets' },
      { position: 4, elementId: '2', name: 'Number of Accepted Transaction Sets' },
      { position: 5, elementId: '715', name: 'Syntax Error Code 1' },
      { position: 6, elementId: '715', name: 'Syntax Error Code 2' },
      { position: 7, elementId: '715', name: 'Syntax Error Code 3' },
      { position: 8, elementId: '715', name: 'Syntax Error Code 4' },
      { position: 9, elementId: '715', name: 'Syntax Error Code 5' }
    ]
  },
  AMT: {
    segmentId: 'AMT',
    name: 'Monetary Amount',
    fields: [
      { position: 1, elementId: '522', name: 'Amount Qualifier Code' },
      { position: 2, elementId: '782', name: 'Monetary Amount' },
      { position: 3, elementId: '478', name: 'Credit / Debit Flag Code' }
    ]
  },
  BHT: {
    segmentId: 'BHT',
    name: 'Beginning of Hierarchical Transaction',
    fields: [
      { position: 1, elementId: '1005', name: 'Hierarchical Structure Code' },
      { position: 2, elementId: '353', name: 'Transaction Set Purpose Code' },
      { position: 3, elementId: '127', name: 'Originator Application Transaction Identifier' },
      { position: 4, elementId: '373', name: 'Transaction Set Creation Date' },
      { position: 5, elementId: '337', name: 'Transaction Set Creation Time' },
      { position: 6, elementId: '640', name: 'Transaction Type Code' }
    ]
  },
  BPR: {
    segmentId: 'BPR',
    name: 'Financial Information',
    fields: [
      { position: 1, elementId: '305', name: 'Transaction Handling Code' },
      { position: 2, elementId: '782', name: 'Total Payment Amount' },
      { position: 3, elementId: '478', name: 'Credit / Debit Flag Code' },
      { position: 4, elementId: '591', name: 'Payment Method Code' },
      { position: 5, elementId: '812', name: 'Payment Format Code' },
      { position: 16, elementId: '506', name: 'Date' }
    ]
  },
  CAS: {
    segmentId: 'CAS',
    name: 'Claims Adjustment',
    fields: [
      { position: 1, elementId: '1033', name: 'Claim Adjustment Group Code' },
      { position: 2, elementId: '1034', name: 'Claim Adjustment Reason Code' },
      { position: 3, elementId: '782', name: 'Monetary Amount' },
      { position: 4, elementId: '380', name: 'Quantity' }
    ]
  },
  CL1: {
    segmentId: 'CL1',
    name: 'Institutional Claim Code',
    fields: [
      { position: 1, elementId: '1315', name: 'Admission Type Code' },
      { position: 2, elementId: '1331', name: 'Admission Source Code' },
      { position: 3, elementId: '1325', name: 'Patient Status Code' }
    ]
  },
  CLM: {
    segmentId: 'CLM',
    name: 'Claim Information',
    fields: [
      { position: 1, elementId: '1028', name: 'Patient Control Number' },
      { position: 2, elementId: '782', name: 'Total Claim Charge Amount' },
      { position: 5, elementId: '1331', name: 'Facility Code Value' },
      { position: 6, elementId: '1073', name: 'Claim Frequency Type Code' },
      { position: 7, elementId: '1363', name: 'Yes/No Condition Indicator' }
    ]
  },
  CLP: {
    segmentId: 'CLP',
    name: 'Claim Payment Information',
    fields: [
      { position: 1, elementId: '1028', name: 'Claim Submitter Identifier' },
      { position: 2, elementId: '1029', name: 'Claim Status Code' },
      { position: 3, elementId: '782', name: 'Total Claim Charge Amount' },
      { position: 4, elementId: '782', name: 'Claim Payment Amount' },
      { position: 7, elementId: '127', name: 'Payer Claim Control Number' }
    ]
  },
  CN1: {
    segmentId: 'CN1',
    name: 'Contract Information',
    fields: [
      { position: 1, elementId: '1166', name: 'Contract Type Code' },
      { position: 2, elementId: '782', name: 'Contract Amount' },
      { position: 3, elementId: '332', name: 'Contract Percentage' }
    ]
  },
  CRC: {
    segmentId: 'CRC',
    name: 'Conditions Indicator',
    fields: [
      { position: 1, elementId: '1138', name: 'Code Category' },
      { position: 2, elementId: '1073', name: 'Certification Condition Indicator' },
      { position: 3, elementId: '1321', name: 'Condition Code 1' },
      { position: 4, elementId: '1321', name: 'Condition Code 2' },
      { position: 5, elementId: '1321', name: 'Condition Code 3' }
    ]
  },
  CTP: {
    segmentId: 'CTP',
    name: 'Pricing Information',
    fields: [
      { position: 1, elementId: '687', name: 'Class of Trade Code' },
      { position: 2, elementId: '236', name: 'Price Identifier Code' },
      { position: 3, elementId: '212', name: 'Unit Price' },
      { position: 4, elementId: '380', name: 'Quantity' }
    ]
  },
  CTX: {
    segmentId: 'CTX',
    name: 'Context',
    fields: [
      { position: 1, elementId: '999', name: 'Context Name' },
      { position: 2, elementId: '1270', name: 'Context Reference' },
      { position: 3, elementId: '1271', name: 'Segment Position in Transaction Set' },
      { position: 4, elementId: '1708', name: 'Loop Identifier Code' }
    ]
  },
  CUR: {
    segmentId: 'CUR',
    name: 'Currency',
    fields: [
      { position: 1, elementId: '98', name: 'Entity Identifier Code' },
      { position: 2, elementId: '100', name: 'Currency Code' }
    ]
  },
  DMG: {
    segmentId: 'DMG',
    name: 'Demographic Information',
    fields: [
      { position: 1, elementId: '1250', name: 'Date Time Period Format Qualifier' },
      { position: 2, elementId: '1251', name: 'Date Time Period' },
      { position: 3, elementId: '1068', name: 'Gender Code' }
    ]
  },
  DTM: {
    segmentId: 'DTM',
    name: 'Date / Time Reference',
    fields: [
      { position: 1, elementId: '374', name: 'Date/Time Qualifier' },
      { position: 2, elementId: '373', name: 'Date' },
      { position: 3, elementId: '337', name: 'Time' },
      { position: 4, elementId: '623', name: 'Time Code' }
    ]
  },
  DTP: {
    segmentId: 'DTP',
    name: 'Date or Time or Period',
    fields: [
      { position: 1, elementId: '374', name: 'Date Time Qualifier' },
      { position: 2, elementId: '1250', name: 'Date Time Period Format Qualifier' },
      { position: 3, elementId: '1251', name: 'Date Time Period' }
    ]
  },
  EB: {
    segmentId: 'EB',
    name: 'Eligibility or Benefit Information',
    fields: [
      { position: 1, elementId: '1390', name: 'Eligibility or Benefit Information Code' },
      { position: 2, elementId: '1271', name: 'Coverage Level Code' },
      { position: 3, elementId: '1365', name: 'Service Type Code' },
      { position: 4, elementId: '1336', name: 'Insurance Type Code' },
      { position: 5, elementId: '1365', name: 'Plan Coverage Description' },
      { position: 7, elementId: '782', name: 'Monetary Amount' }
    ]
  },
  EQ: {
    segmentId: 'EQ',
    name: 'Eligibility or Benefit Inquiry',
    fields: [
      { position: 1, elementId: '1365', name: 'Service Type Code' },
      { position: 2, elementId: '98', name: 'Medical Procedure Identifier' },
      { position: 3, elementId: '1207', name: 'Coverage Level Code' },
      { position: 4, elementId: '1336', name: 'Insurance Type Code' },
      { position: 5, elementId: '1270', name: 'Diagnosis Code Pointer' }
    ]
  },
  FRM: {
    segmentId: 'FRM',
    name: 'Supporting Documentation',
    fields: [
      { position: 1, elementId: '755', name: 'Assigned Number' },
      { position: 2, elementId: '352', name: 'Description' }
    ]
  },
  HCP: {
    segmentId: 'HCP',
    name: 'Pricing Information',
    fields: [
      { position: 1, elementId: '1473', name: 'Pricing Methodology' },
      { position: 2, elementId: '782', name: 'Monetary Amount' },
      { position: 3, elementId: '782', name: 'Monetary Amount 2' }
    ]
  },
  HI: {
    segmentId: 'HI',
    name: 'Health Care Information Codes',
    fields: [
      { position: 1, elementId: 'C022', name: 'Code Information 1' },
      { position: 2, elementId: 'C022', name: 'Code Information 2' },
      { position: 3, elementId: 'C022', name: 'Code Information 3' },
      { position: 4, elementId: 'C022', name: 'Code Information 4' }
    ]
  },
  HL: {
    segmentId: 'HL',
    name: 'Hierarchical Level',
    fields: [
      { position: 1, elementId: '628', name: 'Hierarchical ID Number' },
      { position: 2, elementId: '734', name: 'Hierarchical Parent ID Number' },
      { position: 3, elementId: '735', name: 'Hierarchical Level Code' },
      { position: 4, elementId: '736', name: 'Hierarchical Child Code' }
    ]
  },
  HSD: {
    segmentId: 'HSD',
    name: 'Health Care Services Delivery',
    fields: [
      { position: 1, elementId: '673', name: 'Quantity Qualifier' },
      { position: 2, elementId: '380', name: 'Quantity' },
      { position: 3, elementId: '355', name: 'Unit or Basis for Measurement Code' },
      { position: 4, elementId: '682', name: 'Sample Selection Modulus' }
    ]
  },
  III: {
    segmentId: 'III',
    name: 'Additional Inquiry Information',
    fields: [
      { position: 1, elementId: '1270', name: 'Code List Qualifier Code' },
      { position: 2, elementId: '1271', name: 'Industry Code' },
      { position: 3, elementId: '352', name: 'Description' }
    ]
  },
  IK3: {
    segmentId: 'IK3',
    name: 'Implementation Segment Syntax Error',
    fields: [
      { position: 1, elementId: '721', name: 'Segment ID Code' },
      { position: 2, elementId: '719', name: 'Segment Position in Transaction Set' },
      { position: 3, elementId: '447', name: 'Loop Identifier Code' },
      { position: 4, elementId: '620', name: 'Segment Syntax Error Code' }
    ]
  },
  IK4: {
    segmentId: 'IK4',
    name: 'Implementation Data Element Syntax Error',
    fields: [
      { position: 1, elementId: 'C030', name: 'Position in Segment' },
      { position: 2, elementId: '725', name: 'Data Element Reference Number' },
      { position: 3, elementId: '621', name: 'Implementation Data Element Syntax Error Code' },
      { position: 4, elementId: '724', name: 'Copy of Bad Data Element' }
    ]
  },
  IK5: {
    segmentId: 'IK5',
    name: 'Implementation Transaction Set Response Trailer',
    fields: [
      { position: 1, elementId: '717', name: 'Transaction Set Acknowledge Code' },
      { position: 2, elementId: '715', name: 'Implementation Syntax Error Code 1' },
      { position: 3, elementId: '715', name: 'Implementation Syntax Error Code 2' },
      { position: 4, elementId: '715', name: 'Implementation Syntax Error Code 3' },
      { position: 5, elementId: '715', name: 'Implementation Syntax Error Code 4' },
      { position: 6, elementId: '715', name: 'Implementation Syntax Error Code 5' }
    ]
  },
  INS: {
    segmentId: 'INS',
    name: 'Member Level Detail',
    fields: [
      { position: 1, elementId: '1073', name: 'Member Indicator' },
      { position: 2, elementId: '1218', name: 'Individual Relationship Code' },
      { position: 3, elementId: '875', name: 'Maintenance Type Code' },
      { position: 4, elementId: '1203', name: 'Maintenance Reason Code' }
    ]
  },
    ISA: {
      segmentId: 'ISA',
      name: 'Interchange Control Header',
      fields: [
        { position: 1, elementId: 'I01', name: 'Authorization Information Qualifier' },
        { position: 2, elementId: 'I02', name: 'Authorization Information' },
        { position: 3, elementId: 'I03', name: 'Security Information Qualifier' },
        { position: 4, elementId: 'I04', name: 'Security Information' },
        { position: 5, elementId: 'I05', name: 'Interchange ID Qualifier (Sender)' },
        { position: 6, elementId: 'I06', name: 'Interchange Sender ID' },
        { position: 7, elementId: 'I05', name: 'Interchange ID Qualifier (Receiver)' },
        { position: 8, elementId: 'I07', name: 'Interchange Receiver ID' },
        { position: 9, elementId: 'I08', name: 'Interchange Date' },
        { position: 10, elementId: 'I09', name: 'Interchange Time' },
        { position: 11, elementId: 'I10', name: 'Interchange Control Standards Identifier' },
        { position: 12, elementId: 'I11', name: 'Interchange Control Version Number' },
        { position: 13, elementId: 'I12', name: 'Interchange Control Number' },
        { position: 14, elementId: 'I13', name: 'Acknowledgment Requested' },
        { position: 15, elementId: 'I14', name: 'Usage Indicator' },
        { position: 16, elementId: 'I15', name: 'Component Element Separator' }
      ]
    },
    IEA: {
      segmentId: 'IEA',
      name: 'Interchange Control Trailer',
      fields: [
        { position: 1, elementId: 'I16', name: 'Number of Included Functional Groups' },
        { position: 2, elementId: 'I12', name: 'Interchange Control Number' }
      ]
    },
  K3: {
    segmentId: 'K3',
    name: 'File Information',
    fields: [
      { position: 1, elementId: '449', name: 'Fixed Format Information' },
      { position: 2, elementId: '1333', name: 'Record Format Code' }
    ]
  },
  LE: {
    segmentId: 'LE',
    name: 'Loop Trailer',
    fields: [{ position: 1, elementId: '447', name: 'Loop Identifier Code' }]
  },
  GE: {
    segmentId: 'GE',
    name: 'Functional Group Trailer',
    fields: [
      { position: 1, elementId: '97', name: 'Number of Transaction Sets Included' },
      { position: 2, elementId: '28', name: 'Group Control Number' }
    ]
  },
  GS: {
    segmentId: 'GS',
    name: 'Functional Group Header',
    fields: [
      { position: 1, elementId: '479', name: 'Functional Identifier Code' },
      { position: 2, elementId: '142', name: 'Application Sender Code' },
      { position: 3, elementId: '124', name: 'Application Receiver Code' },
      { position: 4, elementId: '373', name: 'Date' },
      { position: 5, elementId: '337', name: 'Time' },
      { position: 6, elementId: '28', name: 'Group Control Number' },
      { position: 7, elementId: '455', name: 'Responsible Agency Code' },
      { position: 8, elementId: '480', name: 'Version / Release / Industry Identifier Code' }
    ]
  },
  LIN: {
    segmentId: 'LIN',
    name: 'Drug Identification',
    fields: [
      { position: 1, elementId: '350', name: 'Assigned Identification' },
      { position: 2, elementId: '235', name: 'Product/Service ID Qualifier' },
      { position: 3, elementId: '234', name: 'National Drug Code' }
    ]
  },
  LQ: {
    segmentId: 'LQ',
    name: 'Health Care Remark Code',
    fields: [
      { position: 1, elementId: '1270', name: 'Code List Qualifier Code' },
      { position: 2, elementId: '1271', name: 'Remark Code' }
    ]
  },
  LS: {
    segmentId: 'LS',
    name: 'Loop Header',
    fields: [{ position: 1, elementId: '447', name: 'Loop Identifier Code' }]
  },
  LX: {
    segmentId: 'LX',
    name: 'Transaction Set Line Number',
    fields: [{ position: 1, elementId: '554', name: 'Assigned Number' }]
  },
  MEA: {
    segmentId: 'MEA',
    name: 'Measurements',
    fields: [
      { position: 1, elementId: '737', name: 'Measurement Reference ID Code' },
      { position: 2, elementId: '738', name: 'Measurement Qualifier' },
      { position: 3, elementId: '739', name: 'Measurement Value' }
    ]
  },
  MIA: {
    segmentId: 'MIA',
    name: 'Inpatient Adjudication Information',
    fields: [
      { position: 1, elementId: '782', name: 'Covered Days or Visits Count' },
      { position: 2, elementId: '782', name: 'PPS Operating Outlier Amount' },
      { position: 3, elementId: '782', name: 'Lifetime Psychiatric Days Count' }
    ]
  },
  MOA: {
    segmentId: 'MOA',
    name: 'Outpatient Adjudication Information',
    fields: [
      { position: 1, elementId: '782', name: 'Reimbursement Rate' },
      { position: 2, elementId: '782', name: 'HCPCS Payable Amount' },
      { position: 3, elementId: '782', name: 'Claim Payment Remark Code 1' }
    ]
  },
  MSG: {
    segmentId: 'MSG',
    name: 'Message Text',
    fields: [{ position: 1, elementId: '933', name: 'Free-Form Message Text' }]
  },
  N1: {
    segmentId: 'N1',
    name: 'Party Identification',
    fields: [
      { position: 1, elementId: '98', name: 'Entity Identifier Code' },
      { position: 2, elementId: '93', name: 'Name' },
      { position: 3, elementId: '66', name: 'Identification Code Qualifier' },
      { position: 4, elementId: '67', name: 'Identification Code' }
    ]
  },
  N3: {
    segmentId: 'N3',
    name: 'Party Location',
    fields: [
      { position: 1, elementId: '166', name: 'Address Information 1' },
      { position: 2, elementId: '166', name: 'Address Information 2' }
    ]
  },
  N4: {
    segmentId: 'N4',
    name: 'Geographic Location',
    fields: [
      { position: 1, elementId: '19', name: 'City Name' },
      { position: 2, elementId: '156', name: 'State or Province Code' },
      { position: 3, elementId: '116', name: 'Postal Code' },
      { position: 4, elementId: '26', name: 'Country Code' }
    ]
  },
  NM1: {
    segmentId: 'NM1',
    name: 'Individual or Organizational Name',
    fields: [
      { position: 1, elementId: '98', name: 'Entity Identifier Code' },
      { position: 2, elementId: '1065', name: 'Entity Type Qualifier' },
      { position: 3, elementId: '1035', name: 'Name Last or Organization Name' },
      { position: 4, elementId: '1036', name: 'First Name' },
      { position: 5, elementId: '1037', name: 'Middle Name' },
      { position: 8, elementId: '66', name: 'Identification Code Qualifier' },
      { position: 9, elementId: '67', name: 'Identification Code' }
    ]
  },
  NTE: {
    segmentId: 'NTE',
    name: 'Note/Special Instruction',
    fields: [
      { position: 1, elementId: '363', name: 'Note Reference Code' },
      { position: 2, elementId: '352', name: 'Description' }
    ]
  },
  OI: {
    segmentId: 'OI',
    name: 'Other Insurance Coverage Information',
    fields: [
      { position: 1, elementId: '127', name: 'Benefits Assignment Certification Indicator' },
      { position: 2, elementId: '127', name: 'Patient Signature Source Code' },
      { position: 3, elementId: '1218', name: 'Release of Information Code' }
    ]
  },
  PAT: {
    segmentId: 'PAT',
    name: 'Patient Information',
    fields: [
      { position: 1, elementId: '1073', name: 'Individual Relationship Code' },
      { position: 2, elementId: '18', name: 'Patient Location Code' },
      { position: 3, elementId: '1068', name: 'Employment Status Code' }
    ]
  },
  PER: {
    segmentId: 'PER',
    name: 'Administrative Communications Contact',
    fields: [
      { position: 1, elementId: '366', name: 'Contact Function Code' },
      { position: 2, elementId: '93', name: 'Name' },
      { position: 3, elementId: '365', name: 'Communication Number Qualifier 1' },
      { position: 4, elementId: '364', name: 'Communication Number 1' },
      { position: 5, elementId: '365', name: 'Communication Number Qualifier 2' },
      { position: 6, elementId: '364', name: 'Communication Number 2' }
    ]
  },
  PLB: {
    segmentId: 'PLB',
    name: 'Provider Adjustment',
    fields: [
      { position: 1, elementId: '66', name: 'Provider Identifier' },
      { position: 2, elementId: '373', name: 'Fiscal Period Date' },
      { position: 3, elementId: 'C042', name: 'Adjustment Identifier 1' },
      { position: 4, elementId: '782', name: 'Adjustment Amount 1' }
    ]
  },
  PRV: {
    segmentId: 'PRV',
    name: 'Provider Information',
    fields: [
      { position: 1, elementId: '1221', name: 'Provider Code' },
      { position: 2, elementId: '128', name: 'Reference Identification Qualifier' },
      { position: 3, elementId: '127', name: 'Reference Identification' }
    ]
  },
  PS1: {
    segmentId: 'PS1',
    name: 'Purchased Service Information',
    fields: [
      { position: 1, elementId: '235', name: 'Purchased Service Provider Identifier Qualifier' },
      { position: 2, elementId: '234', name: 'Purchased Service Provider Identifier' },
      { position: 3, elementId: '782', name: 'Purchased Service Charge Amount' }
    ]
  },
  PWK: {
    segmentId: 'PWK',
    name: 'Paperwork',
    fields: [
      { position: 1, elementId: '755', name: 'Report Type Code' },
      { position: 2, elementId: '756', name: 'Report Transmission Code' },
      { position: 5, elementId: '127', name: 'Identification Code' }
    ]
  },
  QTY: {
    segmentId: 'QTY',
    name: 'Quantity Information',
    fields: [
      { position: 1, elementId: '673', name: 'Quantity Qualifier' },
      { position: 2, elementId: '380', name: 'Quantity' },
      { position: 3, elementId: 'C001', name: 'Composite Unit of Measure' }
    ]
  },
  RDM: {
    segmentId: 'RDM',
    name: 'Remittance Delivery Method',
    fields: [
      { position: 1, elementId: '875', name: 'Report Transmission Code' },
      { position: 2, elementId: '127', name: 'Name' }
    ]
  },
  REF: {
    segmentId: 'REF',
    name: 'Reference Information',
    fields: [
      { position: 1, elementId: '128', name: 'Reference Identification Qualifier' },
      { position: 2, elementId: '127', name: 'Reference Identification' },
      { position: 3, elementId: '352', name: 'Description' }
    ]
  },
  SBR: {
    segmentId: 'SBR',
    name: 'Subscriber Information',
    fields: [
      { position: 1, elementId: '1138', name: 'Payer Responsibility Sequence Number Code' },
      { position: 2, elementId: '1069', name: 'Individual Relationship Code' },
      { position: 3, elementId: '127', name: 'Reference Identification' },
      { position: 9, elementId: '584', name: 'Claim Filing Indicator Code' }
    ]
  },
    SE: {
      segmentId: 'SE',
      name: 'Transaction Set Trailer',
      fields: [
        { position: 1, elementId: '96', name: 'Number of Included Segments' },
        { position: 2, elementId: '329', name: 'Transaction Set Control Number' }
      ]
    },
    ST: {
      segmentId: 'ST',
      name: 'Transaction Set Header',
      fields: [
        { position: 1, elementId: '143', name: 'Transaction Set Identifier Code' },
        { position: 2, elementId: '329', name: 'Transaction Set Control Number' },
        { position: 3, elementId: '1705', name: 'Implementation Convention Reference' }
      ]
    },
  STC: {
    segmentId: 'STC',
    name: 'Status Information',
    fields: [
      { position: 1, elementId: 'C043', name: 'Health Care Claim Status' },
      { position: 2, elementId: '373', name: 'Status Information Effective Date' },
      { position: 3, elementId: '373', name: 'Action Date' },
      { position: 4, elementId: '782', name: 'Total Claim Charge Amount' },
      { position: 5, elementId: '782', name: 'Claim Payment Amount' }
    ]
  },
  SVC: {
    segmentId: 'SVC',
    name: 'Service Information',
    fields: [
      { position: 1, elementId: 'C003', name: 'Composite Medical Procedure Identifier' },
      { position: 2, elementId: '782', name: 'Line Item Charge Amount' },
      { position: 3, elementId: '782', name: 'Line Item Provider Payment Amount' },
      { position: 4, elementId: '380', name: 'Unit Count' }
    ]
  },
  SV1: {
    segmentId: 'SV1',
    name: 'Professional Service',
    fields: [
      { position: 1, elementId: 'C003', name: 'Composite Medical Procedure Identifier' },
      { position: 2, elementId: '782', name: 'Line Item Charge Amount' },
      { position: 3, elementId: '355', name: 'Unit or Basis for Measurement Code' },
      { position: 4, elementId: '380', name: 'Service Unit Count' }
    ]
  },
  SV2: {
    segmentId: 'SV2',
    name: 'Institutional Service',
    fields: [
      { position: 1, elementId: '234', name: 'Service Line Revenue Code' },
      { position: 2, elementId: '782', name: 'Line Item Charge Amount' },
      { position: 3, elementId: 'C003', name: 'Composite Medical Procedure Identifier' },
      { position: 5, elementId: '380', name: 'Service Unit Count' }
    ]
  },
  SV3: {
    segmentId: 'SV3',
    name: 'Dental Service',
    fields: [
      { position: 1, elementId: 'C003', name: 'Composite Medical Procedure Identifier' },
      { position: 2, elementId: '782', name: 'Line Item Charge Amount' },
      { position: 3, elementId: '355', name: 'Unit or Basis for Measurement Code' },
      { position: 4, elementId: '380', name: 'Service Unit Count' }
    ]
  },
  SV5: {
    segmentId: 'SV5',
    name: 'Durable Medical Equipment Service',
    fields: [
      { position: 1, elementId: '235', name: 'DME Procedure Code Qualifier' },
      { position: 2, elementId: '234', name: 'DME Procedure Code' },
      { position: 3, elementId: '355', name: 'Unit of Measure' },
      { position: 4, elementId: '380', name: 'Quantity' }
    ]
  },
  SVD: {
    segmentId: 'SVD',
    name: 'Service Line Adjudication',
    fields: [
      { position: 1, elementId: '67', name: 'Other Payer Primary Identifier' },
      { position: 2, elementId: '782', name: 'Service Line Paid Amount' },
      { position: 3, elementId: 'C003', name: 'Composite Medical Procedure Identifier' },
      { position: 5, elementId: '380', name: 'Paid Service Unit Count' }
    ]
  },
  TA1: {
    segmentId: 'TA1',
    name: 'Interchange Acknowledgment',
    fields: [
      { position: 1, elementId: 'I12', name: 'Interchange Control Number' },
      { position: 2, elementId: 'I13', name: 'Interchange Date' },
      { position: 3, elementId: 'I14', name: 'Interchange Time' },
      { position: 4, elementId: 'I15', name: 'Interchange Acknowledgment Code' },
      { position: 5, elementId: 'I16', name: 'Interchange Note Code' }
    ]
  },
  TOO: {
    segmentId: 'TOO',
    name: 'Tooth Information',
    fields: [
      { position: 1, elementId: '1270', name: 'Tooth Status Code' },
      { position: 2, elementId: '1271', name: 'Tooth Number/Letter' },
      { position: 3, elementId: '380', name: 'Tooth Surface Code' }
    ]
  },
  TRN: {
    segmentId: 'TRN',
    name: 'Trace',
    fields: [
      { position: 1, elementId: '481', name: 'Trace Type Code' },
      { position: 2, elementId: '127', name: 'Reference Identification' },
      { position: 3, elementId: '509', name: 'Originating Company Identifier' },
      { position: 4, elementId: '127', name: 'Reference Identification 2' }
    ]
  },
  TS2: {
    segmentId: 'TS2',
    name: 'Provider Supplemental Summary Information',
    fields: [
      { position: 1, elementId: '782', name: 'Total DRG Amount' },
      { position: 2, elementId: '782', name: 'Total Federal Specific Amount' },
      { position: 3, elementId: '782', name: 'Total Hospital Specific Amount' }
    ]
  },
  TS3: {
    segmentId: 'TS3',
    name: 'Provider Summary Information',
    fields: [
      { position: 1, elementId: '67', name: 'Reference Identification' },
      { position: 2, elementId: '373', name: 'Fiscal Period Date' },
      { position: 3, elementId: '782', name: 'Total Claimed Amount' },
      { position: 4, elementId: '380', name: 'Total Non-Lab Charge Count' }
    ]
  }
};

export function getSegment(segmentId: string): X12SegmentDefinition {
  const seg = SEGMENT_LIBRARY[segmentId];
  if (!seg) {
    throw new Error(`Segment definition missing: ${segmentId}`);
  }
  return seg;
}
