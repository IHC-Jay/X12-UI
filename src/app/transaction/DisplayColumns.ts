export interface DisplayColumns {
  id: string;
  TransactionCode: string;
  key: string;
  Order: number;
  Setting: string;
  DispType: string;
  Mode: string;
}

export interface DisplayColumnsArray {
  displayColumns: DisplayColumns[];
  User: string;
}
