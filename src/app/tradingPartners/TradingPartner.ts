export class TradingPartner {
  isSelected: boolean;
  id: string;
  Name: string;
  TPID:string;
  TPtype: string;
  ContactName: string;
  ContactPhone: string;
  ContactEmail: string;
  User:string;
  isEdit: boolean;
}

export const TradingPartnerColumns = [
   {
    key: 'Name',
    type: 'text',
    label: 'Trading Partner',
    required: true,
  },
  {
    key: 'TPID',
    type: 'readonly',
    label: 'TP ID',
    required: true,
  },
  {
    key: 'TPtype',
    type: 'drop',
    label: 'Trading Type',
    required: true,
  },
  {
    key: 'ContactName',
    type: 'text',
    label: 'Contact Name',
  },
  {
    key: 'ContactPhone',
    type: 'text',
    label: 'Phone',
    required: true,
  },
  {
    key: 'ContactEmail',
    type: 'email',
    label: 'Email',
    pattern: '.+@.+'
  },
  {
    key: 'isEdit',
    type: 'isEdit',
    label: '',
  },
];
