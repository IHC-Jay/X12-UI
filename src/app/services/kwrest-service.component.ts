import { Subject } from 'rxjs';
import { Injectable } from '@angular/core';
import { map, catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { KeywordEntry } from '../keywords/KeywordEntry';

export interface PagedKeywordResponse {
  startIndex: number;
  Items: KeywordEntry[];
  batchCount: number;
  totalCount: number;
}

@Injectable({ providedIn: 'root' })
export class KwRestServiceComponent {

  kwUrl = `${environment.batchDevKwUrl}`;

  error = new Subject<string>();

  constructor(private http: HttpClient) {
    console.log('**** KwRestServiceComponent constructor ****');
  }

  setEnvironment(env: string) {
    if (env === 'QA') {
      this.kwUrl = `${environment.batchQaKwUrl}`;
    } else if (env === 'UAT') {
      this.kwUrl = `${environment.batchUatKwUrl}`;
    } else if (env === 'PROD') {
      this.kwUrl = `${environment.batchProdKwUrl}`;
    } else {
      this.kwUrl = `${environment.batchDevKwUrl}`;
    }
    console.log('KwRestServiceComponent: kwUrl set to ' + this.kwUrl);
  }

  fetchKeywords(searchArr: string[]) {
    const url = this.kwUrl + 'Keywords?searchArr=' + searchArr;
    console.log('fetchKeywords URL: ' + url);

    return this.http.get<any>(url).pipe(
      map(responseData => {
        console.info('fetchKeywords response:', responseData);
        const items = Array.isArray(responseData)
          ? responseData
          : (Array.isArray(responseData?.Items) ? responseData.Items : []);

        const totalCount = Array.isArray(responseData)
          ? responseData.length
          : (responseData?.totalCount ?? items.length);

        const batchCount = Array.isArray(responseData)
          ? items.length
          : (responseData?.batchCount ?? items.length);

        const paged: PagedKeywordResponse = {
          startIndex: responseData?.startIndex ?? 0,
          Items: items,
          batchCount: batchCount,
          totalCount: totalCount
        };
        return paged;
      }),
      catchError(err => {
        console.error('fetchKeywords error:', err);
        throw err;
      })
    );
  }
}
