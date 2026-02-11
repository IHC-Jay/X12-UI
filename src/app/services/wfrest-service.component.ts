import { Component } from '@angular/core';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { forkJoin, Observable, pipe } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Subject, throwError } from 'rxjs';
import { formatDate } from '@angular/common';
import { LOCALE_ID, NgModule } from '@angular/core';
import { environment } from '../../environments/environment';

import { Inject } from "@angular/core";


import {TransactionData} from '../transaction/TransactionData'


import {WorkFlowEntry, IrisUsers} from '../workflow/WorkFlowEntry';
import { transition } from '@angular/animations';
import { AuthenticationService } from './authentication.service';
import {TpRestServiceComponent} from './tprest-service.component';

import {DisplayColumns, DisplayColumnsArray} from '../transaction/DisplayColumns';
import {SearchColumns, SearchColumnsArray} from '../transaction/SearchColumns';
import { Router, ActivatedRoute} from '@angular/router';
import {User} from '../login/user';

import { of } from 'rxjs';

@Injectable({ providedIn: 'root' })

@Component({
    selector: 'app-rest-service',
    templateUrl: './rest-service.component.html',
    standalone: false
})

export class WfRestServiceComponent {

   rtWfUrl = `${environment.rtDevWFUrl}`;
   rtTransUrl = `${environment.rtDevTransUrl}`;

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

fetchRdpCrytalEntries(mode: string, searchStr: string) {


  let url = this.batchWfUrl + 'RdpCrystalEntries?' +  searchStr+"&userNm="+ this.currentUser;
  if (mode === 'RealTime')
  {
     url = this.rtWfUrl +  'RdpCrystalEntries?' +  searchStr+"&userNm="+ this.currentUser;
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



