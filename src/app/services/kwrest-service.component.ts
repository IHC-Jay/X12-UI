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

  private mapPagedResponse(responseData: any): PagedKeywordResponse {
    const items = Array.isArray(responseData)
      ? responseData
      : (Array.isArray(responseData?.Items) ? responseData.Items : []);

    const totalCount = Array.isArray(responseData)
      ? items.length
      : Number(responseData?.totalCount ?? items.length);

    const batchCount = Array.isArray(responseData)
      ? items.length
      : Number(responseData?.batchCount ?? items.length);

    const paged: PagedKeywordResponse = {
      startIndex: Number(responseData?.startIndex ?? 0),
      Items: items,
      batchCount: Number.isFinite(batchCount) ? batchCount : items.length,
      totalCount: Number.isFinite(totalCount) ? totalCount : items.length
    };

    console.info('Paged KW response: totalCount=' + paged.totalCount + ', batchCount=' + paged.batchCount + ', items=' + (paged.Items?.length ?? 0));
    return paged;
  }

  setEnvironment(env: string) {
    const normalizedEnv = (env || '').trim().toUpperCase();

    if (normalizedEnv === 'QA') {
      this.kwUrl = `${environment.batchQaKwUrl}`;
    } else if (normalizedEnv === 'UAT' || normalizedEnv === 'TEST') {
      this.kwUrl = `${environment.batchUatKwUrl}`;
    } else if (normalizedEnv === 'PROD') {
      this.kwUrl = `${environment.batchProdKwUrl}`;
    } else {
      this.kwUrl = `${environment.batchDevKwUrl}`;
    }
    console.log('KwRestServiceComponent: env=' + normalizedEnv + ', kwUrl set to ' + this.kwUrl);
  }

  fetchKeywords(searchArr: string[]) {
    const url = this.kwUrl + 'Keywords?searchArr=' + searchArr;
    console.log('fetchKeywords URL: ' + url);

    return this.http.get<any>(url).pipe(
      map(responseData => this.mapPagedResponse(responseData)),
      catchError(err => {
        console.error('fetchKeywords error:', err);
        throw err;
      })
    );
  }
}
