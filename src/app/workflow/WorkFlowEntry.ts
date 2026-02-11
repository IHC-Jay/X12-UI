export interface WorkFlowEntry {
  ID: string;
  InterchangeSenderID: string;
  InterchangeReceiverID: string;
  TransactionType: string;
  CreateDtTm: string;
  ResolveDtTm: string;
  WorkStatus: string;
  AssignedUser: string;
  ErrorType: string;
  Error: string;
  Resent: string;
  x12Data: string;
}

export interface IrisUsers {
ID: string;
UserName: string;
FullName: string;
GrantedRoles: string;
}






