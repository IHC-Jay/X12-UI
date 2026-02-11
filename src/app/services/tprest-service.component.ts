import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Subject, throwError, Observable, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthenticationService } from './authentication.service';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { TradingPartner } from '../tradingPartners/TradingPartner';
import { TpId } from '../tradingPartners/tpIds/TpId';
import { tpLinks } from '../tradingPartners/tpIds/tp-links/tp-links';
@Injectable({ providedIn: 'root' })
export class TpRestServiceComponent {
  // ...existing code...
  // Add private helper methods for API calls and error handling as needed

  currentUser:string = '';
  tpUrl = `${environment.tpDevUrl}`;
  env:string = '';
  error = new Subject<string>();
  authenticationService: AuthenticationService;

  constructor(private http: HttpClient, private http2: HttpClient
    , private router: Router)
   {
    console.log('**** TpRestServiceComponent RestServiceComponent constructor ****')
   }


setcurrentUser(currentUser : string, env: string, authService: AuthenticationService)
{
  this.currentUser = currentUser;
  this.env = env;
  this.authenticationService = authService;
  console.debug("Set User,env,auth " + authService)
}

   getCurrentUser()
   {
     console.log('TpRestServiceComponent getCurrentUser: ' + this.currentUser);
     if( this.currentUser === '')
     {
      this.currentUser = this.authenticationService.getUserName();
      if (this.currentUser == '')
      {

        console.log('** ERROR SET MY NAME **')
      }

     }
     return this.currentUser;
   }

  validateUser(usr: string, passw: String, env:string, authService: AuthenticationService)
   {

    let searchParams = new HttpParams();
    this.authenticationService = authService;
    // searchParams = searchParams.append('Accept', '*/*');
    //searchParams = searchParams.append('custom', 'key');

    let url = '';
    this.env = env;

    if( env == 'QA')
    {
      this.tpUrl = `${environment.tpQaUrl}` ;
    }
    else if( env == 'UAT')
    {
      this.tpUrl = `${environment.tpUatUrl}` ;
    }

    url = this.tpUrl + 'ping';


    console.log('Validate User: ' + usr + " in " + env + ", URL: " + url);


    return this.http.get<{ [key: string]: string }>(
        url,
        {
          headers: new HttpHeaders({
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': "GET, PUT, POST, DELETE",
          'Access-Control-Allow-Headers' : 'Content-Type, x-requested-with',
          'Content-Type': 'application/json',
          'Access-Control-Allow-Credentials': 'true',
          Authorization: 'Basic ' + btoa(usr + ':' + passw)  } ),
          params: searchParams,
          responseType: 'json'
        }
      )
      .pipe(
        map(responseData => {
         console.info("validateUser return Response: " + responseData.ContactName)
         this.currentUser = usr;
         return responseData.ContactName;
        }),
        catchError(errorRes => {
          // Send to analytics server
          console.error('RestServiceComponent validateUser catchError: ' + errorRes);
          throw(errorRes);
        })
      );
  }


    fetchTradingPartners() {


      let url = '';

      url = this.tpUrl + 'Tps';

      console.log( this.env + ' - Fetch TradingPartners with Auth ' + url );
      return this.http
        .get<{ [key: string]: TradingPartner }>(
          url,
        )
        .pipe(
          map(responseData => {
            console.info(responseData);
            const TradingPartnersArray: TradingPartner[] = [];
            for (const key in responseData) {
              if (responseData.hasOwnProperty(key)) {
                // console.info('TP key: ' + key)
                TradingPartnersArray.push({ ...responseData[key], id: responseData[key].id });
              }
            }
            console.info('return TP array: ' + TradingPartnersArray.length );
            return TradingPartnersArray;
          }),
          catchError(errorRes => {
            // Send to analytics server
            console.error('In fetchTradingPartners catchError');
            return errorRes;
          })
        );
    }

    fetchTPIDs(tpName: String) {
      console.log('Fetch TPIDs: ' + tpName);

      let url = '';

      url = this.tpUrl + 'TpIdsForTP?name='+tpName;


      return this.http.get<{ [key: string]: TpId }>(
          url,

        )
        .pipe(
          map(responseData => {
            const TPIDArray: TpId[] = [];
            console.info("Response")
            for (const key in responseData) {
              if (responseData.hasOwnProperty(key)) {
                console.info("Got a TP record")
                TPIDArray.push({ ...responseData[key], id: key });
              }
            }
            return TPIDArray;
          }),
          catchError(errorRes => {
            // Send to analytics server
            console.error('In fetchTPIDs catchError');
            return throwError(errorRes);
          })
        );
    }

    fetchTPforTpId(tpName: String) {

      console.log('fetchTPforTpId Class: ' + tpName);
      let url = '';

      url = this.tpUrl + 'TPforTPID?tpid='+tpName;


      return this.http.get<{ [key: string]: TpId }>(
          url,

        )
        .pipe(
          map(responseData => {
           console.info("Response")
           return responseData;
          }),
          catchError(errorRes => {
            // Send to analytics server
            console.error('In fetchTPIDs catchError');
            return throwError(errorRes);
          })
        );
    }


    fetchTpIds() {


      console.log('Fetch Class');

      let url = this.tpUrl + 'GetAllTpIds';


      return this.http
        .get<{ [key: string]: TradingPartner }>(
          url,

        )
        .pipe(
          map(responseData => {
            const TradingPartnersArray: TradingPartner[] = [];
            for (const key in responseData) {
              if (responseData.hasOwnProperty(key)) {
                TradingPartnersArray.push({ ...responseData[key], id: key });
              }
            }
            return TradingPartnersArray;
          }),
          catchError(errorRes => {
            // Send to analytics server
            console.error('In fetchTpIds catchError');
            return throwError(errorRes);
          })
        );
    }

    fetchOwnerTpIds() {


      console.log('fetchOwnerTpIds');

      let url = this.tpUrl + 'GetOwnerTpIds';


      return this.http
        .get<{ [key: string]: TradingPartner }>(
          url,

        )
        .pipe(
          map(responseData => {
            const TradingPartnersArray: TradingPartner[] = [];
            for (const key in responseData) {
              if (responseData.hasOwnProperty(key)) {
                TradingPartnersArray.push({ ...responseData[key], id: key });
              }
            }
            return TradingPartnersArray;
          }),
          catchError(errorRes => {
            // Send to analytics server
            console.error('In GetOwnerTpIds catchError');
            return throwError(errorRes);
          })
        );
    }


    fetchTransactionTypes() : Observable < TradingPartner[] >{

      console.log('Fetch TransactionTypes');

      let url = '';

      url = this.tpUrl + 'GetTransactionTypes';


      return this.http
        .get<{ [key: string]: TradingPartner }>(
          url,

        )
        .pipe(
          map(responseData => {
            const TradingPartnersArray: TradingPartner[] = [];
            for (const key in responseData) {
              if (responseData.hasOwnProperty(key)) {
                TradingPartnersArray.push({ ...responseData[key], id: key });
              }
            }
            return TradingPartnersArray;
          }),
          catchError(errorRes => {
            // Send to analytics server
            console.error('In fetchTransactionTypes catchError');
            return throwError(errorRes);
          })
        );
    }

    fetchTpLinks(tpid: String)
    {
      console.log('Fetch TpLinks Class: ' + tpid);

      let url = '';

      url = this.tpUrl + 'LinksForTPID?TPID='+ tpid;


      return this.http
        .get<{ [key: string]: tpLinks }>(
          url,

        )
        .pipe(
          map(responseData => {
            const TpLinksArray: tpLinks[] = [];
            for (const key in responseData) {
              if (responseData.hasOwnProperty(key)) {
                console.info("Key: " + responseData[key].Link);
                if(responseData[key].Link !== undefined)
                {
                  TpLinksArray.push({ ...responseData[key], id: key });
                }
              }
            }
            return TpLinksArray;
          }),
          catchError(errorRes => {
            // Send to analytics server
            console.error('In fetchTradingPartners catchError');
            return throwError(errorRes);
          })
        );
    }


    fetchTpLink(tpLink: String)
    {

      console.log('Fetch TpLink Class: ' + tpLink);
      let url = '';

      url = this.tpUrl + 'TpLink?id='+ tpLink;


      return this.http
        .get<{ [key: string]: tpLinks }>(
          url,
        )
        .pipe(
          map(responseData => {
            console.trace(responseData);
            return responseData;
          }),
          catchError(errorRes => {
            // Send to analytics server
            console.error('In TpLink catchError: ' + errorRes);
            return throwError(errorRes);
          })
        );
    }


  deleteTpLink(tpLink: String) {

    console.log('deleteTpLink: ' + tpLink);

    let url = this.tpUrl + 'DeleteTpLink';

    console.info('Post to delete TPLink: ' + url);
    const body = { id: tpLink, User: this.getCurrentUser()};
    return this.http.post<string>(url, body);

  }


  addUpdateTpLink(link: tpLinks, add: boolean) {

    console.log('add tpLinks: ' + link.Link);

    let url = ''

    if(add)
    {
       url = this.tpUrl + '' + 'NewTpLink';
    }
    else{
      url = this.tpUrl + '' + 'UpdateTpLink';
    }

    console.info('Post to create/update TPLink: ' + url);
    link.User =  this.getCurrentUser()

    return this.http.post<any>(url, link)
    .pipe(
      map(responseData => {

        return responseData;

      }),
      catchError(errorRes => {
        // Send to analytics server
        console.error('In tpLinks catchError: ');
        return errorRes;
      })
    );


  }


  getTpIds(tpId: string) : Observable<TpId[]> {

    let url = '';

    url = this.tpUrl + 'TpIdsForTP?name='+ tpId;

    return this.http
      .get<{ [key: string]: TpId }>(
        url,

      )
      .pipe(
        map(responseData => {
          const TpIdsArray: TpId[] = [];
          for (const key in responseData) {
            if (responseData.hasOwnProperty(key)) {
              let id = {...responseData[key]}.id;
              console.info("Push:" + key +", nm: " + id)
              TpIdsArray.push({ ...responseData[key], id: id });
            }
          }
          return TpIdsArray;
        }),
        catchError(errorRes => {
          // Send to analytics server
          console.error('In fetchTpIds catchError');
          return throwError(errorRes);
        })
      );
  }


  addTradingPartner(tradingPartner: TradingPartner):  Observable<TradingPartner> {


    console.log('addTradingPartner: ' + tradingPartner.Name);

    let url = this.tpUrl + 'NewTp';
    tradingPartner.User =  this.getCurrentUser();

    console.info('Post to create TP: ' + url);

    return this.http.post<any>(url, tradingPartner);
  }

  deleteTradingPartner(tpName: string) : Observable<string> {


    console.log('deleteTradingPartner: ' + tpName);

    let url = this.tpUrl + 'DeleteTp';

    console.info('Post to delete TP: ' + url);
   const body = { Name: tpName };
    return this.http.post<string>(url, body);

  }

  updateTradingPartner(tradingPartner: TradingPartner): Observable<TradingPartner> {
    console.log('updateTradingPartner: ' + tradingPartner.Name + ", Id: " + tradingPartner.id);


    let url = this.tpUrl + 'UpdateTp';
    tradingPartner.User =  this.getCurrentUser();
    return this.http.post<TradingPartner>(`${url}`, tradingPartner);

  }


  deleteTradingPartners(tradingPartners: TradingPartner[]) {
    return forkJoin(
      tradingPartners.map((tradingPartner) =>
      this.deleteTradingPartner(tradingPartner.Name)
      )
    );
  }


  addTPID(newTpId: TpId) : Observable<any> {

    console.log('addTradingPartner TPID: ' + newTpId.Name);


    let url = this.tpUrl + 'NewTpId';
    newTpId.User =  this.getCurrentUser();
    console.info('Post to create TPID: ' + url);
    return this.http.post<any>(url, newTpId);

  }

  updateTPID(tpid: TpId): Observable<any> {
    console.log('updateTradingPartner TPIT: ' + tpid.Name + ", Id: " + tpid.id);


    let url = this.tpUrl + 'UpdateTpId';
    tpid.User =  this.getCurrentUser();
    console.info('Post to update TP: ' + url);
    return this.http.post<TpId>(`${url}`, tpid);
  }


  deleteTPID(tpId: string) : Observable<string> {


    let url = this.tpUrl + 'DeleteTpId';

    console.info('Post to delete TPID: ' + url);

    const body = { id: tpId };
    return this.http.post<string>(url, body);

  }

  addBulkTpLinks(link: any) {

    console.log('add bulkTpLinks: ' + link.Link);

    let url = this.tpUrl + '' + 'BulkTpLinks';

    console.info('Post to create/update TPLinks: ' + url);
    link.User =  this.getCurrentUser();

    return this.http.post<any>(url, link)
    .pipe(
      map(responseData => {

        return responseData;

      }),
      catchError(errorRes => {
        console.error('addBulkTpLinks catchError: ' + errorRes);
        return errorRes;
      })
    );


  }

  copyTpLinksfromTP(link: any) {

    console.log('add Copy TpLinks: ' + link.Name);

    let url = this.tpUrl + '' + 'CopyTpLinksFromTp';

    console.info('Post to create TPLinks: ' + url);
    link.User =  this.getCurrentUser();

    return this.http.post<any>(url, link)
    .pipe(
      map(responseData => {

        return responseData;

      }),
      catchError(errorRes => {
        console.error('CopyTpLinksFromTp catchError: ' + errorRes);
        return errorRes;
      })
    );


  }


  }



