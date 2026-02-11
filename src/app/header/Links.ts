
export class Link {
  name: string;
  link: string;
};

export const tabLinks: Link[] = [
    {name:'Settings', link:"/transaction/transaction-settings/"},
    {name:'Trading Partners', link:"/TradingPartners"},
    {name:'Search TPID', link:"/search"},
    {name:'Dashboard', link:"/dashboard"},
    {name:'Transmissions', link:"/summary"},
    {name:'Transactions', link:"/transaction"},
    {name:'X12 Viewer', link:"/x12-viewer"},
  //  {name:'PDF Reader', link:"/pdf-reader"},
    {name:'Work Flow', link:"/workflow"}

  ];
