import { Injectable } from '@angular/core';
import * as _ from 'lodash';

@Injectable({ providedIn: 'root' })
export class UtilService {
  public selectButton(selection: string) {
    console.info('UtilService: ' + selection);
  }
}
