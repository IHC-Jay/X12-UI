

export class Link {
  name: string;
  link?: string;
  children?: Link[];
}

export const tabLinks: Link[] = [
  {name:'Settings', link:"/transaction/transaction-settings"},
  {name:'Trading Partners', link:"/TradingPartners"},
  {name:'Search TPID', link:"/search"},
  {name:'Transmissions', link:"/summary"},
  {name:'Transactions', link:"/transaction"},
  {name:'Work Flow', link:"/workflow"},
  {
    name: 'Utilities',
    children: [
      {name:'Dashboard', link:"/dashboard"},
      {name:'X12 Viewer', link:"/x12-viewer"},
      {name:'X12 Compare', link:"/x12-compare"},
      {name:'PDF Reader', link:"/pdf-reader"}
    ]
  }
];
