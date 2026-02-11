import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AuthenticationService } from '../services/authentication.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    constructor(private authenticationService: AuthenticationService) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // add authorization header with  auth credentials if available
        if(this.authenticationService !== null)
        {
        const currentUser = this.authenticationService.currentUserValue;

        if (currentUser && currentUser.authdata) {
          console.info('AuthInterceptor: Setting header: ' + currentUser.username);
            request = request.clone({
                setHeaders: {
                    Authorization: 'Basic ' + btoa(currentUser.username + ':' + currentUser.password),
                    responseType: 'json',
                    'Content-Type':  'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

      }

        return next.handle(request);
    }
}
