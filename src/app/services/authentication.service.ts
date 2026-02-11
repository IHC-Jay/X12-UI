import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { User } from '../login/user';
import { TpRestServiceComponent } from './tprest-service.component';
import { TransRestServiceComponent } from './transrest-service.component';
import { WfRestServiceComponent } from './wfrest-service.component';
@Injectable({ providedIn: 'root' })
export class AuthenticationService {
 private currentUserSubject: BehaviorSubject<User>;
  public currentUser: Observable<User>;

  constructor(private tpService: TpRestServiceComponent, private tpTransService: TransRestServiceComponent,
              private usrTransService: TransRestServiceComponent,  private wfTransService: WfRestServiceComponent
    ) {

      console.info('In AuthenticationService constructor ');


        this.currentUserSubject = new BehaviorSubject<User>(
          JSON.parse(sessionStorage.getItem("currentUser"))
        );
        this.currentUser = this.currentUserSubject.asObservable();


        this.currentUser.forEach(user =>
        {
          if(user !== null)
          {

            this.tpTransService.setcurrentUser(user.username, user.environment, this);
            this.tpService.setcurrentUser(user.username, user.environment, this);
            this.wfTransService.setcurrentUser(user.username, user.environment, this);
          }
          else{
            console.info('User object not initialized');
          }
        });

  }

  public get currentUserValue(): User {

    return this.currentUserSubject.value;
  }

  getUserName(): string
  {
    let usrNm = ""
    this.currentUser.forEach(user =>
      {
        console.info('AuthenticationService getUserName ' + user.username);
        usrNm = user.username
      });
      if (usrNm == '')
      {

        usrNm = sessionStorage.getItem("currentUser")
        console.info('sessionStorage.getItem: ' + usrNm);
      }
    return usrNm
  }

  login(username: string, password: string, env: string) {

    console.info(' AuthenticationService login')

      return this.tpService.validateUser(username, password, env, this).pipe(map(res => {
        console.info(' AuthenticationService login validateUser: ' + res);
        let user = new User();
        user.authdata = window.btoa(username + ":" + password);
        user.id = 1
        user.environment = env
        user.username = username
        user.password = password
        sessionStorage.setItem("currentUser", JSON.stringify(user));

        this.currentUserSubject.next(user);
        if (this.currentUserSubject.value!== null)
        {
          console.info('login currentUserValue: ' + this.currentUser );
          this.tpTransService.setcurrentUser(username, env, this);
            this.tpService.setcurrentUser(username, env, this);
            this.wfTransService.setcurrentUser(username, env, this);

        }
        return user;
      }
      )

      );

  }

  logout() {
    // remove user from session storage to log user out
    sessionStorage.removeItem("currentUser");

    if (this.currentUserSubject.value!== null)
      {
        console.info('logout currentUserValue: ' + (this.currentUserSubject.value.username));

        this.currentUserSubject.next(null);
      }
  }

}
