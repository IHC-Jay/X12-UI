import { Subject, BehaviorSubject, of, throwError, Observable } from 'rxjs';
import { Injectable, Inject, LOCALE_ID } from '@angular/core';
import { map, catchError } from 'rxjs/operators';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthenticationService } from './authentication.service';
import { TpRestServiceComponent } from './tprest-service.component';
import { Router } from '@angular/router';
import { WorkFlowEntry, IrisUsers } from '../workflow/WorkFlowEntry';

@Injectable({ providedIn: 'root' })
export class WfRestServiceComponent {
  rtWfUrl = `${environment.rtDevWFUrl}`;
  rtTransUrl = `${environment.rtDevTransUrl}`;
  // ...existing code...
  // Add private helper methods for API calls and error handling as needed

   batchTransUrl = `${environment.batchDevTransUrl}`;
   batchWfUrl = `${environment.batchDevWFUrl}`;

   authenticationService: AuthenticationService;

  error = new Subject<string>();
  currentUser: string = "";
  env: string = "";
  NumAssignedItems:number= 8

  constructor(private http: HttpClient, private router: Router, @Inject(LOCALE_ID) public locale: string, private tpService: TpRestServiceComponent)
   {
    console.log('**** WfRestServiceComponent constructor ****');
   }

 // Transactions REST

setcurrentUser(currentUser : string, env: string, authService: AuthenticationService)
{
  this.currentUser = currentUser;
  this.env = env;
  this.authenticationService = authService;
  console.log("Set User,env for WF " + env)

  if(env == 'QA')
  {
    this.rtTransUrl = `${environment.rtQaTransUrl}`;
    this.batchTransUrl = `${environment.batchQaTransUrl}`;
    this.batchWfUrl =  `${environment.batchQaWFUrl}`;
    this.rtWfUrl = "";
  }
  else if(env == 'UAT')
  {
    this.rtTransUrl = `${environment.rtUatTransUrl}`;
    this.batchTransUrl = `${environment.batchUatTransUrl}`;
    this.batchWfUrl =  `${environment.batchUatWFUrl}`;
    this.rtWfUrl = "";
  }
  console.log(this.batchWfUrl);
}

updateWFitems(items:any)
{
  console.log("updateWFitems")


  this.NumAssignedItems = items;

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
     return this.currentUser

}


fetchWorkFlowItems(mode: string, searchArr: string[]) {
  console.log('Fetch WF entries ' + "array # "+searchArr.length + " for " + this.currentUser);


  searchArr.push("CurrentUser::" + this.currentUser)

  let url = this.batchWfUrl + "WorkFlowEntries?searchArr=" + searchArr;
  if (mode === 'RealTime')
  {
     url = this.rtWfUrl + 'WorkFlowEntries?searchArr=' + searchArr;
  }

  console.log('URL: ' + url)

  return this.http
    .get<{ [key: string]: WorkFlowEntry }>(
      url
    ).pipe(map(responseData => {
        console.info(responseData);

        this.updateWFitems(responseData.length)

        const WorkFlowEntriesArray: WorkFlowEntry[] = [];
        for (const key in responseData) {
          if (responseData.hasOwnProperty(key)) {
            WorkFlowEntriesArray.push({ ...responseData[key], ID: responseData[key].ID});
          }
        }
        console.info('return WF array: ' + WorkFlowEntriesArray.length );
        return WorkFlowEntriesArray;


      }),

      catchError(errorRes => {
        // Send to analytics server
        console.error('In fetchWorkFlowEntries catchError: ' + errorRes);
        throw errorRes;
      })
    );

}



fetchIrisUsers() {
  console.log('Fetch Users');

  let url = this.batchWfUrl + "GetIrisUsers";


  return this.http
    .get<{ [key: string]: IrisUsers }>(
      url
    ).pipe(map(responseData => {
        console.info(responseData);

        const UserArray: IrisUsers[] = [];
        for (const key in responseData) {
          if (responseData.hasOwnProperty(key)) {
            UserArray.push({ ...responseData[key], ID: responseData[key].ID });
          }
        }
        console.info('return User array: ' + UserArray.length );
        return UserArray;


      }),

      catchError(errorRes => {
        // Send to analytics server
        console.error('In fetchIrisUsers catchError: ' + errorRes);
        return errorRes;
      })
    );

}

fetchWorkFlowEntry(mode: string, searchStr: string) {


  let url = this.batchWfUrl + 'WorkFlowEntry?' +  searchStr+"&userNm="+ this.currentUser;
  if (mode === 'RealTime')
  {
     url = this.rtWfUrl +  'WorkFlowEntry?' +  searchStr+"&userNm="+ this.currentUser;
  }

  console.log('Fetch WF Entry ' + url + ' with Auth for '+ this.currentUser );

  return this.http
    .get<{ [key: string]: WorkFlowEntry }>(
      url
    )

    .pipe(
      map(responseData => {
        console.info(responseData);

        const WorkFlowEntriesArray: WorkFlowEntry[] = [];
        for (const key in responseData) {
          if (responseData.hasOwnProperty(key)) {
            WorkFlowEntriesArray.push({ ...responseData[key], ID: responseData[key].ID });
          }
        }
        console.info('return WF array: ' + WorkFlowEntriesArray.length );
        return WorkFlowEntriesArray;


      }),

      catchError(errorRes => {
        // Send to analytics server
        console.error('In fetchWorkFlowEntry catchError: ' + errorRes);
        return errorRes;
      })
    );

}



updateWorkFlowItem(mode: string, paramsList: string[]) {
  console.log('Update WF Entry with Auth as ' + this.currentUser);
  paramsList.push("User::" + this.currentUser);

  let url = this.batchWfUrl


    if (mode === 'RealTime')
  {
     url = this.rtWfUrl ;
  }

  url += 'UpdateWorkFlowEntry?searchArr=' + paramsList;
  console.log('Update WF Entry: ' + url)

  return this.http
    .get<{ [key: string]: WorkFlowEntry }>(
      url
    ).pipe(
      map(responseData => {
        console.info(responseData);

        const WorkFlowEntriesArray: WorkFlowEntry[] = [];
        for (const key in responseData) {
          if (responseData.hasOwnProperty(key)) {
            WorkFlowEntriesArray.push({ ...responseData[key], ID: responseData[key].ID });
          }
        }
        console.info('return updated WF array: ' + WorkFlowEntriesArray);
        return WorkFlowEntriesArray;


      }),

      catchError(errorRes => {
        // Send to analytics server
        console.error('In updateWorkFlowEntry catchError: ' + errorRes);
        return errorRes;
      })
    );

}

fetchRdpCrytalEntries(mode: string, searchStr: string, sessionId: string = '') {


  let searchString = searchStr || '';
  if (sessionId && searchString.indexOf('SessionID=') < 0) {
    searchString += (searchString.length > 0 ? '&' : '') + 'SessionID=' + sessionId;
  }

  let url = this.batchWfUrl + 'RdpCrystalEntries?' +  searchString+"&userNm="+ this.currentUser;
  if (mode === 'RealTime')
  {
     url = this.rtWfUrl +  'RdpCrystalEntries?' +  searchString+"&userNm="+ this.currentUser;
  }
  console.log('Fetch RdpCrystalEntries with Auth for '+ this.currentUser +", URL: " + url);

  return this.http
    .get<{ [key: string]: WorkFlowEntry }>(
      url
    )

    .pipe(
      map(responseData => {
        console.info(responseData);


        return responseData;


      }),

      catchError(errorRes => {
        // Send to analytics server
        console.error('In fetchRdpCrystalEntries catchError: ' + errorRes);
        return errorRes;
      })
    );

}

}



