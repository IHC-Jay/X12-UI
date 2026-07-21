// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: true,
  org: 'SH',
  orgType: 'Payer',

  tpDevUrl: 'https://itf-webapache-dev.co.ihc.com:8443/EdiRest/TpManage/',
  rtDevTransUrl: 'https://itf-webapache-dev.co.ihc.com:8443/EdiRest/RtTransactions/',
  batchDevTransUrl: 'https://itf-webapache-dev.co.ihc.com:8443/EdiRest/BatchTransactions/',
  batchDevWFUrl: 'https://itf-webapache-dev.co.ihc.com:8443/EdiRest/BatchWorkFlow/',
  rtDevWFUrl: 'https://itf-webapache-dev.co.ihc.com:8443/EdiRest/RtWorkFlow/',
  batchDevKwUrl: 'https://itf-webapache-dev.co.ihc.com:8443/EdiRest/Keywords/',

  tpQaUrl: 'https://itf-webapache-qa.co.ihc.com:8443/EdiRest/TpManage/',
  rtQaTransUrl: 'https://itf-webapache-qa.co.ihc.com:8443/EdiRest/RtTransactions/',
  batchQaTransUrl: 'https://itf-webapache-qa.co.ihc.com:8443/EdiRest/BatchTransactions/',
  batchQaWFUrl: 'https://itf-webapache-qa.co.ihc.com:8443/EdiRest/BatchWorkFlow/',
  rtQaWFUrl: 'https://itf-webapache-qa.co.ihc.com:8443/EdiRest/RtWorkFlow/',
  batchQaKwUrl: '',

  tpUatUrl: 'https://itf-webapache-test.co.ihc.com:8443/EdiRest/TpManage/',
  rtUatTransUrl: 'https://itf-webapache-test.co.ihc.com:8443/EdiRest/RtTransactions/',
  batchUatTransUrl: 'https://itf-webapache-test.co.ihc.com:8443/EdiRest/BatchTransactions/',
  batchUatWFUrl: 'https://itf-webapache-test.co.ihc.com:8443/EdiRest/BatchWorkFlow/',
  rtUatWFUrl: 'https://itf-webapache-test.co.ihc.com:8443/EdiRest/RtWorkFlow/',
  batchUatKwUrl: '',

  tpProdUrl: 'https://itf-webapache-prod.co.ihc.com:8443/EdiRest/TpManage/',
  rtProdTransUrl: 'https://itf-webapache-prod.co.ihc.com:8443/EdiRest/RtTransactions/',
  batchProdTransUrl: 'https://itf-webapache-prod.co.ihc.com:8443/EdiRest/BatchTransactions/',
  batchProdWFUrl: 'https://itf-webapache-prod.co.ihc.com:8443/EdiRest/BatchWorkFlow/',
  rtProdWFUrl: 'https://itf-webapache-prod.co.ihc.com:8443/EdiRest/RtWorkFlow/',
  batchProdKwUrl: '',
  tpType: 'Provider',
  logo: 'assets/sh_logo.jpg',
  appVersion: 'SH-2026.07.21.1',
  x12ValidationBaseUrl: 'http://lp-itfdev04:8585',
  rtRoutes: ["UhinRT","IntermountainHealthcare", "BitBucket", "SDS", "NA"],
  batchRoutes: ["UhinBatch","StLukesBatch","UMRBatch","IntermountainHealthcare", "BitBucket", "SDS", "NA"],

  allowedEnvironments: ['DEV', 'QA', 'UAT', 'PROD']

};


