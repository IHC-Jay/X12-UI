export interface SearchColumns  {
  id: string;
  TransactionCode: string;
  key: string;
  Setting: string;
  Mode: string;
  DispType: string;
}

export interface SearchColumnsArray {
  SearchColumns: SearchColumns [];
  User: string;
}
