import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AuthenticationService } from '../services/authentication.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    constructor(private authenticationService: AuthenticationService) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const url = request.url || '';

        if (request.url.includes('/x12-api/') || request.url.includes('x12-api/')) {
            return next.handle(request);
        }

        // TP Sync API uses sessionToken or explicit headers. Do not auto-inject
        // username/password for these calls.
        if (url.includes('/api/') || url.endsWith('/api')) {
            return next.handle(request);
        }

        // Respect explicitly provided authorization headers.
        if (request.headers.has('Authorization')) {
            return next.handle(request);
        }

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
