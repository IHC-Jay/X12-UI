import { Injectable, Inject, LOCALE_ID } from '@angular/core';
import { environment } from '../../environments/environment';
import { Subject, throwError, Observable, BehaviorSubject, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthenticationService } from './authentication.service';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { TpRestServiceComponent } from './tprest-service.component';
import { TradingPartner } from '../tradingPartners/TradingPartner';
import { TpId } from '../tradingPartners/tpIds/TpId';
import { tpLinks } from '../tradingPartners/tpIds/tp-links/tp-links';
import { TransactionData } from '../transaction/TransactionData';
import { DisplayColumns, DisplayColumnsArray } from '../transaction/DisplayColumns';
import { SearchColumns, SearchColumnsArray } from '../transaction/SearchColumns';
import { ConfirationArray, ConfigColumns } from '../transaction/Configuration';
import { WorkFlowEntry } from '../workflow/WorkFlowEntry';


import { formatDate } from '@angular/common';
@Injectable({ providedIn: 'root' })
export class TransRestServiceComponent {
  // ...existing code...
  // Add private helper methods for API calls and error handling as needed

   rtTransUrl = `${environment.rtDevTransUrl}`;
   batchTransUrl = `${environment.batchDevTransUrl}`;

   authenticationService: AuthenticationService;

  error = new Subject<string>();
  currentUser: string = "";
  env: string = "";

  constructor(private http: HttpClient, private http2: HttpClient
    , private router: Router, @Inject(LOCALE_ID) public locale: string, private tpService: TpRestServiceComponent)
   {
    console.log('**** TransRestServiceComponent RestServiceComponent constructor ****');
   }

 // Transactions REST

setcurrentUser(currentUser : string, env: string, authService: AuthenticationService)
{
  this.currentUser = currentUser;
  this.env = env;
  this.authenticationService = authService;
  console.debug("Set User,env,auth " + authService)

  if(env == 'QA')
  {
    this.rtTransUrl = `${environment.rtQaTransUrl}`;
    this.batchTransUrl = `${environment.batchQaTransUrl}`;
  }
  else if(env == 'UAT')
  {
    this.rtTransUrl = `${environment.rtUatTransUrl}`;
    this.batchTransUrl = `${environment.batchUatTransUrl}`;
  }
}


getCurrentUser()
{
  console.log('Fetch getCurrentUser from authenticationService ' + this.authenticationService)

     if( this.currentUser === '')
     {
      this.currentUser = this.authenticationService.getUserName()
     }
     if (this.currentUser == '')
      {
        console.log('** ERROR SET MY NAME **')
        this.authenticationService.logout();
        sessionStorage.clear();
        this.router.navigate(['/']);
      }
     console.log('Return getCurrentUser: ' + this.currentUser);

}

fetchDashboardentries(searchArr: string[]) {

  if(this.currentUser === '')
  {
    this.getCurrentUser()
  }

  let url = this.batchTransUrl + 'Dashboard?searchStr=' + searchArr;

  console.log('Fetch Dashboard from  ' + url);
  return this.http2
    .get<{ [key: string]: TransactionData }>(
      url
    )

    .pipe(
      map(responseData => {
        console.info(responseData);

        const dashArray: TransactionData[] = [];
        for (const key in responseData) {
          if (responseData.hasOwnProperty(key)) {
            dashArray.push({ ...responseData[key], value: responseData[key].value });
          }
        }
        console.info('return Dashboard array: ' + dashArray.length );
        return dashArray;


      }),

      catchError(errorRes => {

        console.error('In fetchDashboard catchError: ' + errorRes);
        return errorRes;
      })
    );

}

fetchEligibilityRequests(mode: string, searchArr: string[]) {
  if( this.currentUser === '')
    {
      this.getCurrentUser()
    }
  console.log( this.env + ' - Fetch EligibilityRequest with Auth ' + this.currentUser);

  let url = this.batchTransUrl + 'EligibilityBenefits?searchStr=' + searchArr;

  if (mode === 'RealTime')
  {
     url = this.rtTransUrl + 'EligibilityBenefits?searchStr=' + searchArr;
  }

  console.log('ElgBen: ' + url)
  return this.http2
    .get<{ [key: string]: TransactionData }>(
      url
    )

    .pipe(
      map(responseData => {
        console.info(responseData);

        const EligibilityRequestArray: TransactionData[] = [];
        for (const key in responseData) {
          if (responseData.hasOwnProperty(key)) {
             EligibilityRequestArray.push({ ...responseData[key], value: responseData[key].value });
          }
        }
        console.info('return TP array: ' + EligibilityRequestArray.length );
        return EligibilityRequestArray;


      }),

      catchError(errorRes => {
        // Send to analytics server
        console.error('In fetchEligibilityRequest catchError: ' + errorRes);
        return errorRes;
      })
    );

}

fetchEligibilityBenefitResponses(mode: string, searchArr: string[]) {


  let url = this.batchTransUrl + 'EligibilityBenefitResponses?searchStr=' + searchArr;

  if (mode === 'RealTime')
  {
     url = this.rtTransUrl + 'EligibilityBenefitResponses?searchStr=' + searchArr;
  }
  console.log('Fetch Eligibility Benefit Responses with Auth ' + url);
  return this.http2
    .get<{ [key: string]: TransactionData }>(
      url
    )

    .pipe(
      map(responseData => {
        console.info(responseData);

        const EligibilityResponseArray: TransactionData[] = [];
        for (const key in responseData) {
          if (responseData.hasOwnProperty(key)) {
            EligibilityResponseArray.push({ ...responseData[key], value: responseData[key].value });
          }
        }
        console.info('return Claim Status Resp array: ' + EligibilityResponseArray.length );
        return EligibilityResponseArray;


      }),

      catchError(errorRes => {
        // Send to analytics server
        console.error('In fetchEligibilityBenefitResponses catchError: ' + errorRes);
        return errorRes;
      })
    );

}

fetchClaims(mode: string, searchArr: string[]) {

  const ClaimArray: TransactionData[] = [];
  let url = this.batchTransUrl + 'Claims?searchStr=' + searchArr;

  if (mode === 'RealTime')
  {
     url = this.rtTransUrl + 'Claims?searchStr=' + searchArr;
  }

  console.log('Fetch Claim with Auth ' + url);

  return this.http2
    .get<{ [key: string]: TransactionData }>(
      url
    )

    .pipe(
      map(responseData => {
        console.info(responseData);


        for (const key in responseData) {
          if (responseData.hasOwnProperty(key)) {
            ClaimArray.push({ ...responseData[key], value: responseData[key].value });
          }
        }
        console.info('return Claim array: ' + ClaimArray.length );
        return ClaimArray;


      }),

      catchError(errorRes => {
        // Send to analytics server
        console.error('In fetchClaims catchError: ' + errorRes);
        return ClaimArray;
      })
    );

}
fetchClaimStatusReq(mode: string, searchArr: string[]) {
  console.log('Fetch Claim Status Req with Auth ' );
  const ClaimStatusReqArray: TransactionData[] = [];

  let url = this.batchTransUrl + 'ClaimStatusRequest?searchStr=' + searchArr;

  if (mode === 'RealTime')
  {
     url = this.rtTransUrl + 'ClaimStatusRequest?searchStr=' + searchArr;
  }

  return this.http2
    .get<{ [key: string]: TransactionData }>(
      url
    )

    .pipe(
      map(responseData => {
        console.info(responseData);


        for (const key in responseData) {
          if (responseData.hasOwnProperty(key)) {
            ClaimStatusReqArray.push({ ...responseData[key], value: responseData[key].value });
          }
        }
        console.info('return Claim Status Req array: ' + ClaimStatusReqArray.length );
        return ClaimStatusReqArray;


      }),

      catchError(errorRes => {
        // Send to analytics server
        console.error('In fetchClaimStatusReq catchError: ' + errorRes);
        return ClaimStatusReqArray;
      })
    );

}

fetchClaimStatusResp(mode: string, searchArr: string[]) {
  console.log('Fetch Claim Status Response with Auth ' );

  let url = this.batchTransUrl + 'ClaimStatusResponse?searchStr=' + searchArr;

  if (mode === 'RealTime')
  {
     url = this.rtTransUrl + 'ClaimStatusResponse?searchStr=' + searchArr;
  }
  return this.http2
    .get<{ [key: string]: TransactionData }>(
      url
    )

    .pipe(
      map(responseData => {
        console.info(responseData);

        const ClaimStatusRespArray: TransactionData[] = [];
        for (const key in responseData) {
          if (responseData.hasOwnProperty(key)) {
            ClaimStatusRespArray.push({ ...responseData[key], value: responseData[key].value });
          }
        }
        console.info('return Claim Status Resp array: ' + ClaimStatusRespArray.length );
        return ClaimStatusRespArray;


      }),

      catchError(errorRes => {
        // Send to analytics server
        console.error('In fetchClaimStatusResp catchError: ' + errorRes);
        return errorRes;
      })
    );

}




fetchClaimPayment(mode: string, searchArr: string[]) {


  let url = this.batchTransUrl + 'ClaimPayment?searchStr=' + searchArr;

  if (mode === 'RealTime')
  {
     url = this.rtTransUrl + 'ClaimPayment?searchStr=' + searchArr;
  }
  console.info('fetchClaimPayment ' + url)

  return this.http2
    .get<{ [key: string]: TransactionData }>(
      url
    ).pipe(
      map(responseData => {
        console.info(responseData);

        const ClaimPaymentArray: TransactionData[] = [];
        for (const key in responseData) {
          if (responseData.hasOwnProperty(key)) {
            ClaimPaymentArray.push({ ...responseData[key], value: responseData[key].value });
          }
        }
        console.info('return Claim Status Resp array: ' + ClaimPaymentArray.length );
        return ClaimPaymentArray;


      }),

      catchError(errorRes => {
        // Send to analytics server
        console.error('In fetchClaimPayment catchError: ' + errorRes);
        return errorRes;
      })
    );

}

fetchImplementationAcknowledgment(mode: string, searchArr: string[]) {
  console.log('Fetch Implementation Acknowledgment with Auth ' );

  let url = this.batchTransUrl + 'ImplementationAcknowledgment?searchStr=' + searchArr;

  if (mode === 'RealTime')
  {
     url = this.rtTransUrl + 'ImplementationAcknowledgment?searchStr=' + searchArr;
  }

  return this.http2
    .get<{ [key: string]: TransactionData}>(
      url
    )

    .pipe(
      map(responseData => {
        console.info(responseData);

        const ImplementationAcknowledgmentArray: TransactionData[] = [];
        for (const key in responseData) {
          if (responseData.hasOwnProperty(key)) {
            ImplementationAcknowledgmentArray.push({ ...responseData[key], value: responseData[key].value });
          }
        }
        console.info('return Claim Status Resp array: ' + ImplementationAcknowledgmentArray.length );
        return ImplementationAcknowledgmentArray;


      }),

      catchError(errorRes => {
        // Send to analytics server
        console.error('In fetchImplementationAcknowledgment catchError: ' + errorRes);
        return errorRes;
      })
    );

}

fetchTA1 (mode: string, searchArr: string[]) {
  console.log('Fetch TA1 with Auth ' );

  let url = this.batchTransUrl + 'GetTA1?searchStr=' + searchArr;

  if (mode === 'RealTime')
  {
     url = this.rtTransUrl + 'GetTA1?searchStr=' + searchArr;
  }

  return this.http2
    .get<{ [key: string]: TransactionData}>(
      url
    )

    .pipe(
      map(responseData => {
        console.info(responseData);

        const TA1Array: TransactionData[] = [];
        for (const key in responseData) {
          if (responseData.hasOwnProperty(key)) {
            TA1Array.push({ ...responseData[key], value: responseData[key].value });
          }
        }
        console.info('return Claim Status Resp array: ' + TA1Array.length );
        return TA1Array;


      }),

      catchError(errorRes => {
        // Send to analytics server
        console.error('In fetchImplementationAcknowledgment catchError: ' + errorRes);
        return errorRes;
      })
    );

}

fetchInterchangeAcknowledgment(mode: string, searchArr: string[]) {
  console.log('Fetch Interchange Ack with Auth ' );

  let url = this.batchTransUrl + 'InterchangeAcknowledgment?searchStr=' + searchArr;

  if (mode === 'RealTime')
  {
     url = this.rtTransUrl + 'InterchangeAcknowledgment?searchStr=' + searchArr;
  }

  return this.http2
    .get<{ [key: string]: TransactionData }>(
      url
    )

    .pipe(
      map(responseData => {
        console.info(responseData);

        const InterchangeAcknowledgmentArray: TransactionData[] = [];
        for (const key in responseData) {
          if (responseData.hasOwnProperty(key)) {
            InterchangeAcknowledgmentArray.push({ ...responseData[key], value: responseData[key].value });
          }
        }
        console.info('return Claim Status Resp array: ' + InterchangeAcknowledgmentArray.length );
        return InterchangeAcknowledgmentArray;


      }),

      catchError(errorRes => {
        // Send to analytics server
        console.error('In fetchInterchangeAcknowledgment catchError: ' + errorRes);
        return errorRes;
      })
    );

}
fetchClaimAcknowledgment(mode: string, searchArr: string[]) {
  console.log('Fetch Claim Ack with Auth ' );
  let url = this.batchTransUrl + 'ClaimAcknowledgment?searchStr=' + searchArr;

  if (mode === 'RealTime')
  {
     url = this.rtTransUrl + 'ClaimAcknowledgment?searchStr=' + searchArr;
  }

  return this.http2
    .get<{ [key: string]: TransactionData }>(
      url
    )

    .pipe(
      map(responseData => {
        console.info(responseData);

        const ClaimAcknowledgmentArray: TransactionData[] = [];
        for (const key in responseData) {
          if (responseData.hasOwnProperty(key)) {
            ClaimAcknowledgmentArray.push({ ...responseData[key], value: responseData[key].value });
          }
        }
        console.info('return Claim Status Resp array: ' + ClaimAcknowledgmentArray.length );
        return ClaimAcknowledgmentArray;


      }),

      catchError(errorRes => {
        // Send to analytics server
        console.error('In fetchClaimAcknowledgment catchError: ' + errorRes);
        return errorRes;
      })
    );

}

fetchTransactionFields() {
  console.log('Fetch TransactionFields with Auth ' + this.getCurrentUser() );

  let url = this. batchTransUrl + 'TransactionFields';


  return this.http2
    .get<{ [key: string]: TransactionData }>(
      url
    )

    .pipe(
      map(responseData => {
        console.info(responseData);

        return responseData;

      }),

      catchError(errorRes => {
        // Send to analytics server
        console.error('In fetchTransactionFields catchError: ' + errorRes);
        return errorRes;
      })
    );

}



fetchDisplayColumns(setting: string, dispType: string) {

  if(this.currentUser === '')
  {
    this.getCurrentUser()
  }

  let url = this.batchTransUrl + 'DisplayColumns?userNm=' +  this.currentUser +"&setting=" + setting +"&dispType=" + dispType;

  console.log('Fetch DisplayColumns from  ' + url);
  return this.http2
    .get<{ [key: string]: DisplayColumns }>(
      url
    )

    .pipe(
      map(responseData => {
        console.info(responseData);

        const dispArray: DisplayColumns[] = [];
        for (const key in responseData) {
          if (responseData.hasOwnProperty(key)) {
            dispArray.push({ ...responseData[key], id: responseData[key].id });
          }
        }
        console.info('return Display array: ' + dispArray.length );
        return dispArray;


      }),

      catchError(errorRes => {
        // Send to analytics server
        console.error('In fetchTransactionFields catchError: ' + errorRes);
        return errorRes;
      })
    );

}

saveDisplayColumns(dispCol: DisplayColumnsArray)
{
  dispCol.User =  this.currentUser;
  console.log('saveDisplayColumns ' +  this.currentUser);

  let url = this. batchTransUrl + 'SaveDisplayColumns';

  console.info('Post to SaveDisplayColumns: ' + url +" for " + dispCol.User);

  return this.http.post<any>(url, dispCol)
  .pipe(
    map(responseData => {
      console.info(responseData);

      return responseData;

    }),
    catchError(errorRes => {
      // Send to analytics server
      console.error('saveDisplayColumns catchError: ' + errorRes);
      return errorRes;
    })
  );

}

deleteDisplayColumns(setting: string, mode: string, transaction:string)
{
  let dispCol = [];

  dispCol[0] = {'User': this.currentUser, 'Setting': this.currentUser};

  console.log('deleteDisplayColumns ' +  this.currentUser);

  let url = this. batchTransUrl + 'DeleteDisplayColumns';

  console.info('Post to DeleteDisplayColumns: ' + url );

  return this.http.post<any>(url,  {'User': this.currentUser, 'Setting': setting, 'Mode':mode, 'Transaction':transaction})
  .pipe(
    map(responseData => {
      console.info(responseData);

      return responseData;

    }),
    catchError(errorRes => {
      // Send to analytics server
      console.error('deleteDisplayColumns catchError: ' + errorRes);
      return errorRes;
    })
  );

}

fetchSearchColumns(setting: string, dispType: string) {

  if(this.currentUser === '')
  {
    this.getCurrentUser()
  }

  let url = this.batchTransUrl + 'SearchColumns?userNm=' +  this.currentUser +"&setting=" + setting +"&dispType=" + dispType;

  console.log('Fetch SearchColumns from  ' + url);
  return this.http2
    .get<{ [key: string]: SearchColumns }>(
      url
    )

    .pipe(
      map(responseData => {
        console.info(responseData);

        const dispArray: SearchColumns[] = [];
        for (const key in responseData) {
          if (responseData.hasOwnProperty(key)) {
            dispArray.push({ ...responseData[key], id: responseData[key].id });
          }
        }
        console.info('return Search array: ' + dispArray.length );
        return dispArray;


      }),

      catchError(errorRes => {
        // Send to analytics server
        console.error('In fetchSearchColumns catchError: ' + errorRes);
        return errorRes;
      })
    );

}

saveSearchColumns(dispCol: SearchColumnsArray)
{
  dispCol.User =  this.currentUser;
  console.log('saveSearchColumns ' +  this.currentUser);

  let url = this. batchTransUrl + 'SaveSearchColumns';

  console.info('Post to SaveSearchColumns: ' + url +" for " + dispCol.User);

  return this.http.post<any>(url, dispCol)
  .pipe(
    map(responseData => {
      console.info(responseData);

      return responseData;

    }),
    catchError(errorRes => {
      // Send to analytics server
      console.error('saveSearchColumns catchError: ' + errorRes);
      return errorRes;
    })
  );

}

deleteSearchColumns()
{
  let dispCol = [];

  dispCol[0] = {'User': this.currentUser, 'Setting': this.currentUser};

  console.log('deleteSearchColumns ' +  this.currentUser);

  let url = this. batchTransUrl + 'DeleteSearchColumns';

  console.info('Post to DeleteSearchColumns: ' + url );

  return this.http.post<any>(url,  {'User': this.currentUser, 'Setting': 'Session'})
  .pipe(
    map(responseData => {
      console.info(responseData);

      return responseData;

    }),
    catchError(errorRes => {
      // Send to analytics server
      console.error('deleteSearchColumns catchError: ' + errorRes);
      return errorRes;
    })
  );

}

fetchParentRecord(id: string, trans: string, searchTypeString: string) {


  let url = this. rtTransUrl + "GetParentX12?id=" + id +"&transType=" + trans;

  if(searchTypeString.indexOf("Batch") >= 0)
  {
    url = this. batchTransUrl + "GetParentX12?id=" + id +"&transType=" + trans;
  }

  console.log('Fetch Parent X12 ' + url);
  return this.http2.get<{ [key: string]: TransactionData}>(
      url
    )

    .pipe(
      map(responseData => {
        console.info("responseData: " + responseData);

        if(responseData !== undefined && responseData[0] !== undefined)
        {

          console.info('return Parent X12 : ' + responseData[0].value );
          return responseData[0];
        }
        else
        {
          console.info('No data from service');
          return "No data";
        }

      }),

      catchError(errorRes => {
        // Send to analytics server
        console.error('In fetchParentRecord catchError: ' + errorRes);
        return errorRes;
      })
    );

}


fetchX12Stream(id: string, trans: string, searchTypeString: string, startPos: number) {


  let url = this. rtTransUrl + "GetX12Stream?id=" + id +"&transType=" + trans+"&startPos=" + startPos;

  if(searchTypeString.indexOf("Batch") >= 0)
  {
    url = this. batchTransUrl + "GetX12Stream?id=" + id +"&transType=" + trans+"&startPos=" + startPos ;
  }

  console.log('Fetch X12 Stream ' + url);
  return this.http2.get<{ [key: string]: TransactionData}>(   url    );

}

openRelated2701Model(trans:string, TrnRefId: string, SubscriberId : string,
  InterchangeSenderID : string,
  InterchangeReceiverID: string,
  InterchangeControlNumber: string, searchTypeString: string)
  {

    let url = this. rtTransUrl
    if(searchTypeString.indexOf("Batch") >= 0)
    {
       url = this. batchTransUrl
    }

    url = url + "GetRelatedEligBenefit?transType="+trans+"&SubscriberId="
    + SubscriberId +"&TrnRefId="+TrnRefId+"&InterchangeSenderID="+InterchangeSenderID+"&InterchangeReceiverID="
    +InterchangeReceiverID+"&InterchangeControlNumber="+InterchangeControlNumber;

    console.log('Fetch 27x X12 ' + url);
    return this.http2
      .get<{ [key: string]: any }>(
        url
      )

      .pipe(
        map(responseData => {
          console.info(responseData);

          return responseData[0];


        }),

        catchError(errorRes => {
          // Send to analytics server
          console.error('In openRelated27xModel catchError: ' + errorRes);
          return errorRes;
        })
      );
  }


openRelated2767Model(trans:string, SubscriberId: string, BhtId : string, TrnRefId: string,
  InterchangeSenderID : string,
  InterchangeReceiverID: string,
  InterchangeControlNumber: string, searchTypeString: string)
  {

    let url = this. rtTransUrl
    if(searchTypeString.indexOf("Batch") >= 0)
    {
       url = this. batchTransUrl
    }

    url = url + "GetRelatedClaimStatus?transType="+trans+"&SubscriberId="
    + SubscriberId+"&BhtId="+BhtId+"&TrnRefId="+TrnRefId+"&InterchangeSenderID="+InterchangeSenderID+"&InterchangeReceiverID="
    +InterchangeReceiverID+"&InterchangeControlNumber="+InterchangeControlNumber;

    console.log('Fetch 27x X12 ' + url);
    return this.http2
      .get<{ [key: string]: any }>(
        url
      )

      .pipe(
        map(responseData => {
          console.info(responseData);

          return responseData[0];


        }),

        catchError(errorRes => {
          // Send to analytics server
          console.error('In openRelated27xModel catchError: ' + errorRes);
          return errorRes;
        })
      );
  }

fetchGetRelatedTransaction(trans: string, grpId: string, InterchangeSenderID : string,
 InterchangeReceiverID : string,
  InterchangeControlNumber : string, searchTypeString: string) {

    let url = this. rtTransUrl
    if(searchTypeString.indexOf("Batch") >= 0)
    {
       url = this. batchTransUrl
    }

  url = url + "GetRelatedTransaction?GroupControlNumber="
  + grpId+"&transType="+trans+"&InterchangeSenderID="+InterchangeSenderID+"&InterchangeReceiverID="
  +InterchangeReceiverID+"&InterchangeControlNumber="+InterchangeControlNumber;

  console.log('Fetch 999 X12 ' + url);
  return this.http2
    .get<{ [key: string]: TransactionData }>(
      url
    )

    .pipe(
      map(responseData => {
        console.info(responseData);

        return responseData[0];


      }),

      catchError(errorRes => {
        // Send to analytics server
        console.error('In fetchGetRelatedTransaction catchError: ' + errorRes);
        return errorRes;
      })
    );

}

openRelated83xModel(trans: string,
  ClaimSubmittersIdentifier : string, MonetaryAmount :  string)
  {


     let url = this. batchTransUrl + "GetRelatedClaimInfo?transType="+trans+"&ClaimSubmittersIdentifier="+ClaimSubmittersIdentifier
 + "&MonetaryAmount="+MonetaryAmount;

 console.log('Fetch 83x X12 ' + url);
 return this.http2
   .get<{ [key: string]: TransactionData }>(
     url
   )

   .pipe(
     map(responseData => {
       console.info(responseData);

       return responseData[0];


     }),

     catchError(errorRes => {
       // Send to analytics server
       console.error('In openRelated83xModel catchError: ' + errorRes);
       return errorRes;
     })
   );


}
openRelatedClaimAckModel(trans: string,
  ClaimSubmittersIdentifier : string)
  {

    let url = this. batchTransUrl + "GetRelatedClaimAck?transType="+trans+"&ClaimSubmittersIdentifier="+ClaimSubmittersIdentifier;

 console.log('Fetch 277CA X12 ' + url);
 return this.http2
   .get<{ [key: string]: TransactionData }>(
     url
   )

   .pipe(
     map(responseData => {
       console.info(responseData);

       return responseData[0];

     }),

     catchError(errorRes => {
       // Send to analytics server
       console.error('In openRelatedClaimAckModel catchError: ' + errorRes);
       return errorRes;
     })
   );


}


saveConfiguration(configArr:ConfirationArray)
{
  configArr.User = this.currentUser;

  console.log('saveConfiguration ' +  this.currentUser);

  let url = this.batchTransUrl + 'SaveConfiguration';

  console.info('Post to saveConfiguration: ' + url +" for " + this.currentUser +", length: " + configArr.configColumns.length);


  return this.http.post<any>(url, configArr)
  .pipe(

    map(responseData => {
      console.info(responseData);

      return responseData;

    }),
    catchError(errorRes => {
      // Send to analytics server
      console.error('saveConfiguration catchError: ' + errorRes);
      return errorRes;
    })
  );

}


fetchConfiguration() {
  console.log('Fetch User COnfig with Auth for '+ this.currentUser );

  let url = this.batchTransUrl + 'GetConfiguration?userNm=' + this.currentUser;

  return this.http
    .get<{ [key: string]: ConfigColumns }>(
      url
    )

    .pipe(
      map(responseData => {
        console.info(responseData);

        const ConfigColumnsArray: ConfigColumns[] = [];
        for (const key in responseData) {
          if (responseData.hasOwnProperty(key)) {
            ConfigColumnsArray.push({ ...responseData[key] });
          }
        }
        console.info('return WF array: ' + ConfigColumnsArray.length );
        return ConfigColumnsArray;


      }),

      catchError(errorRes => {
        // Send to analytics server
        console.error('In fetchConfiguration catchError: ' + errorRes);
        return errorRes;
      })
    );

}

createRestUrl(tranType: string, searchStr: string, searchType: string, maxCnt : Number)
{
  // let dateFormat = require('dateformat');
  let dte = new Date();

  let url = this.batchTransUrl
  let dtTm = "";

  if (searchType.startsWith('RT'))
  {
     url = this.rtTransUrl;
  }

  url = url + tranType ;

  if(searchStr.indexOf("id=") >= 0)
  {
    url = url + "?searchStr=" + searchStr +"&count=1"
  }
  else{

    if (searchType.indexOf('24 hour') > 0)
    {
      dte.setDate(dte.getDate() - 1);
    }
    else if (searchType.indexOf('7 day') > 1)
    {
      dte.setDate(dte.getDate() - 7);
    }
    else if (searchType.indexOf('30') > 1){
      dte.setMonth(dte.getMonth() - 1 );

    }
    else {
      dte.setMonth(dte.getMonth() - 3 );

    }
    dtTm = formatDate(dte, 'yyyy-MM-dd hh:mm:ss',this.locale);

    console.log('Fetch ' + tranType + ' with Auth ' + searchType + ", DtTm: " + dtTm + ", return: " + maxCnt);

    if ('WorkFlowEntries' == tranType)
    {
      if(searchStr.length > 0)
      {
        url = url + "?searchStr=TransactionType='" + searchStr + "'&count=" + maxCnt;
      }
      else
      {
        url = url + "?searchStr=&count=" + maxCnt
      }
    }
    else
    {
      if(searchStr.length > 0)
      {
        url = url + "?searchStr=" + searchStr + " and ProcessDtTm > '" + dtTm +"'&count=" + maxCnt;
      }
      else
      {
        url = url + "?searchStr= ProcessDtTm > '" + dtTm +"'&count=" + maxCnt
      }
    }
  }
  console.log('URL: ' + url);
  return url;
}



fetchUsersWithSettings() {

  if(this.currentUser === '')
  {
    this.getCurrentUser()
  }

  let url = this.batchTransUrl + 'GetUsersWithSettings?userNm=' +  this.currentUser;

  console.log('Fetch fetchUsersWithSettings from  ' + url);
  return this.http2
    .get<{ [key: string]: SearchColumns }>(
      url
    )

    .pipe(
      map(responseData => {
        console.info(responseData);


        return responseData;


      }),

      catchError(errorRes => {
        // Send to analytics server
        console.error('In fetchUsersWithSettings catchError: ' + errorRes);
        return errorRes;
      })
    );

}

saveUserSettings(copyUsrNm: string, trans:string, mode:string )
{

  console.log('saveUserSettings ' +  this.currentUser +", Trans: " + trans +", Mode: " + mode);

  let url = this. batchTransUrl + 'SaveUserSettings';

  console.info('Post to saveUserSettings: ' + url );

  return this.http.post<any>(url, {'FromUser': copyUsrNm, 'CurrentUser': this.currentUser, 'Transaction':trans, 'Mode':mode} )
  .pipe(
    map(responseData => {
      console.info(responseData);

      return responseData;

    }),
    catchError(errorRes => {
      // Send to analytics server
      console.error('saveUserSettings catchError: ' + errorRes);
      return errorRes;
    })
  );

}

}



