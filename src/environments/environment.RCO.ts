// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: true,
  org:'RCO',
  orgType: 'Provider',
  tpDevUrl: 'https://itf-webapache-dev.co.ihc.com:8443/EdiRestProv/TpManage/',
  rtDevTransUrl: '',
  batchDevTransUrl: 'https://itf-webapache-dev.co.ihc.com:8443/EdiRestProv/BatchTransactions/',
  batchDevWFUrl:'https://itf-webapache-dev.co.ihc.com:8443/EdiRestProv/WorkFlow/',
  rtDevWFUrl: '',

  tpQaUrl: 'https://itf-webapache-qa.co.ihc.com:8443/EdiRestProv/TpManage/',
  rtQaTransUrl: '',
  batchQaTransUrl: 'https://itf-webapache-qa.co.ihc.com:8443/EdiRestProv/BatchTransactions/',
  batchQaWFUrl:'https://itf-webapache-qa.co.ihc.com:8443/EdiRestProv/WorkFlow/',
  rtQaWFUrl: '',

  tpUatUrl: 'https://itf-webapache-test.co.ihc.com:8443/EdiRestProv/TpManage/',
  rtUatTransUrl: '',
  batchUatTransUrl: 'https://itf-webapache-test.co.ihc.com:8443/EdiRestProv/BatchTransactions/',
  batchUatWFUrl:'https://itf-webapache-test.co.ihc.com:8443/EdiRestProv/WorkFlow/',
  rtUatWFUrl:'',

  tpType: 'Payer',
  logo:'assets/ih-rco.jpg',
  appVersion: 'RCO-2026.03.27.1',
  x12ValidationBaseUrl: 'http://lp-itfdev04:8585',
  allowedEnvironments: [ 'DEV', 'QA','UAT'],
  rtRoutes: ["NA"],
  batchRoutes:["R1","Assurance","UhinProvConnBatch","UhinBatch", "SelectHealth", "BitBucket", "NA"]

};


