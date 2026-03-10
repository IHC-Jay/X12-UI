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

  tpQaUrl: 'https://itf-webapache-qa.co.ihc.com:8443/EdiRest/TpManage/',
  rtQaTransUrl: 'https://itf-webapache-qa.co.ihc.com:8443/EdiRest/RtTransactions/',
  batchQaTransUrl: 'https://itf-webapache-qa.co.ihc.com:8443/EdiRest/BatchTransactions/',
  batchQaWFUrl: 'https://itf-webapache-qa.co.ihc.com:8443/EdiRest/BatchWorkFlow/',
  rtQaWFUrl: 'https://itf-webapache-qa.co.ihc.com:8443/EdiRest/RtWorkFlow/',

  tpUatUrl: 'https://itf-webapache-test.co.ihc.com:8443/EdiRest/TpManage/',
  rtUatTransUrl: 'https://itf-webapache-test.co.ihc.com:8443/EdiRest/RtTransactions/',
  batchUatTransUrl: 'https://itf-webapache-test.co.ihc.com:8443/EdiRest/BatchTransactions/',
  batchUatWFUrl: 'https://itf-webapache-test.co.ihc.com:8443/EdiRest/BatchWorkFlow/',
  rtUatWFUrl: 'https://itf-webapache-test.co.ihc.com:8443/EdiRest/RtWorkFlow/',
  tpType: 'Provider',
  logo: 'assets/sh_logo.jpg',
  appVersion: 'SH-2026.03.06.1',
  x12ValidationBaseUrl: 'http://lp-itfdev04:8585',
  rtRoutes: ["UhinRT","IntermountainHealthcare", "BitBucket", "NA"],
  batchRoutes: ["UhinBatch","StLukesBatch","UMRBatch","IntermountainHealthcare", "BitBucket", "NA"],

  allowedEnvironments: ['DEV', 'QA']

};


