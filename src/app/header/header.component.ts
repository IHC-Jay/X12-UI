import { Component, OnInit, Input, Output, AfterViewInit, ViewChild, ElementRef, Injectable } from '@angular/core';
import { FormsModule, FormControl } from '@angular/forms';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import {AuthenticationService} from '../services/authentication.service';
import {User} from '../login/user';
import {Link, tabLinks} from './Links';

import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { catchError, Observable } from 'rxjs';
import {TransRestServiceComponent} from '../services/transrest-service.component';
import {WfRestServiceComponent} from '../services/wfrest-service.component';
import { MatTabsModule, MatTabChangeEvent, MatTabGroup } from '@angular/material/tabs';
import { Title } from '@angular/platform-browser';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatBadgeModule} from '@angular/material/badge';
import { tpLinks } from '../tradingPartners/tpIds/tp-links/tp-links';
import { environment } from '../../environments/environment';
import { StorageService } from '../services/storage.service';

const CHECK_INTERVAL = 5000 // in ms
const STORE_KEY =  'lastAction';

@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.css'],
    standalone: false
})


export class HeaderComponent implements AfterViewInit, OnInit   {

  /**
   *
   * Utility to build JSON string from config array and store in session storage
   */
  buildAndStoreUserConfig(res: any[]): string {
    let jsonString = "";
    for (let ind = 0; ind < res.length; ind++) {
      if (res[ind].Key !== undefined) {
        if (jsonString.length === 0) {
          jsonString = '{"' + res[ind].Key + '":"' + res[ind].Value + '"';
        } else {
          jsonString += ',"' + res[ind].Key + '":"' + res[ind].Value + '"';
        }
        // this.storage.setItem(res[ind].Key, res[ind].Value);
        console.log('Store in sessionStorage ' + res[ind].Key + ", " + res[ind].Value);
      }
      if (res[ind].Key === 'Page') {
        for (let tabInd = 0; tabInd < this.links.length; tabInd++) {
          if (this.links[tabInd].name === res[ind].Value) {
            this.firstPage = this.links[tabInd].link;
            this.selectedLnkIndex.setValue(tabInd);
            console.log('Use Config, page: ' + this.firstPage + ' # ' + this.selectedLnkIndex.value);
          }
        }
      }
    }
    jsonString += "}";
    console.log('JSON string:' + jsonString);
    this.storage.setItem('UserConfig', jsonString);
    return jsonString;
  }

  loginForm: FormGroup;
  val: any;

  loading = false;
  submitted = false;
  displayHelp: string = "Username/Password will used for calling IRIS REST services";
  error = '';
  firstPage = '/dashboard';
  transaction = "";
  id = "";
  tpId = "";
  paramsObject:any;
  currentUser: User;
  searchStr:string = "";
  NumAssignedItems:number;
  public links:Link[] = tabLinks;

  // Track Utility submenu visibility
  utilitySubmenuVisible: boolean = false;
  private openUtilitySubmenuOnSelect: boolean = false;

  // Navigate to a link (handles both top-level and submenu)
  navigateTo(link: Link) {
    if (link.link) {
      this.storage.removeItem("currentTab");
      this.storage.setItem("currentTab", link.name);
      this.router.navigateByUrl(link.link);
      this.utilitySubmenuVisible = false;
    }
  }

  onUtilityTabClick(index: number, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.selectedLnkIndex.setValue(index);
    if (this.tabGrp) {
      this.tabGrp.selectedIndex = index;
    }
    this.openUtilitySubmenuOnSelect = true;
    this.utilitySubmenuVisible = true;
    this.prevLnkIndex = index;
  }

  private syncSelectedTabWithUrl(url: string): void {
    const path = (url || '').split('?')[0].toLowerCase();
    if (!path) return;

    let targetIndex = -1;

    for (let i = 0; i < this.links.length; i++) {
      const link = this.links[i];
      const linkPath = (link.link || '').toLowerCase();

      if (linkPath && path.startsWith(linkPath)) {
        targetIndex = i;
        break;
      }

      if (link.children && link.children.length > 0) {
        const matchedChild = link.children.find(child => {
          const childPath = (child.link || '').toLowerCase();
          return !!childPath && path.startsWith(childPath);
        });

        if (matchedChild) {
          targetIndex = i;
          break;
        }
      }
    }

    if (targetIndex < 0) return;

    this.selectedLnkIndex.setValue(targetIndex);
    if (this.tabGrp) {
      this.tabGrp.selectedIndex = targetIndex;
    }

    this.utilitySubmenuVisible = false;
    this.openUtilitySubmenuOnSelect = false;
    this.prevLnkIndex = targetIndex;
  }


  isLogin:boolean=false;
  collapsed = true;

  logo =`${environment.logo}`;
  appVersion = `${environment.appVersion || 'unknown'}`;

  @ViewChild("username") focusField: ElementRef;
  @ViewChild("tabGrp", { static: false }) tabGrp: MatTabGroup;

  selectedMenu:string = 'tradingPartner'

  allowedEnvironments: string[] = `${environment.allowedEnvironments}`.split(',');

  selectedLnkIndex = new FormControl(3);
  prevLnkIndex = 0;

  background = 'white';

  constructor(
    private router: Router,
    private authenticationService: AuthenticationService,
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private TransactionService: TransRestServiceComponent,
    private WfService: WfRestServiceComponent,
    private storage: StorageService
  )
    {
      console.log('**** HeaderComponent constructor ****');

      this.authenticationService.currentUser.subscribe(x => {
          this.currentUser = x

          if  (this.currentUser !== undefined && this.currentUser !== null)
          {
              console.log("HeaderComponent: " + this.currentUser.username);

              this.isLogin = (x != null);
          }
        }
        );

    }

    ngOnInit() {
      console.log('HeaderComponent ngOnInit')

      this.loginForm = this.formBuilder.group({
          username: ['', Validators.required],
          password: ['', Validators.required],
          env: [this.allowedEnvironments[0], Validators.required],
          logoutTime: ['60', Validators.required]
      });




      // get return url from route parameters or default to '/'

      this.route.queryParams.subscribe(params => {
        let retTab =  this.storage.getItem<string>("currentTab");
        console.log('HeaderComponent currentTab: '+ retTab);
        let tabInd = 0

        for(; (retTab!== undefined || retTab !== '') && tabInd < this.links.length; tabInd++)
          {
            if(this.links[tabInd].name === retTab)
            {
              this.firstPage = this.links[tabInd].link;
              this.selectedLnkIndex.setValue(tabInd);
              console.log('HeaderComponent ngOnInit, page: ' + this.firstPage + ' # ' +  this.selectedLnkIndex.value)
              break;
            }
          }
          if(tabInd ==0 || tabInd >= this.links.length)
          {
            console.log('queryParams returnUrl is not set ' )
            this.firstPage = '/login';
          }

        this.paramsObject = { ...params.keys, ...params };

        if (this.paramsObject.searchTypeString  !== undefined && this.paramsObject.searchTypeString  !== '')
        {
          let str:string = this.paramsObject.searchTypeString.toString()
          if(str.indexOf('sameWindow::false') >= 0)
          {

            if (this.paramsObject.transaction !== undefined)
            {
              this.searchStr = "Transaction: " + this.paramsObject.transaction
              let element = document.getElementById('tabGrp') as HTMLElement;
              element.setAttribute('hidden', 'true');
              console.log("Disable: " + element);

              element = document.getElementById('logout') as HTMLElement;
              element.setAttribute('hidden', 'true');
              console.log("Disable: " + element);


            }


            if (this.paramsObject.additionalSearch  !== undefined && this.paramsObject.additionalSearch  !== '')
            {
              console.log("ADDITIONAL: " + this.paramsObject.additionalSearch)
              this.searchStr += ", " + this.paramsObject.additionalSearch
            }
            if(this.paramsObject.ID !== undefined)
            {
              this.searchStr += ", ID: " + this.paramsObject.ID

            }
            console.log("Label: " + this.searchStr + "sameWindow: " + this.paramsObject.searchTypeString)
          }
          else
          {
            this.searchStr = ""
          }
        }
        else
        {
          this.searchStr = ""
        }


        if(params !== undefined && params.page !== undefined)
        {
          console.log(params);
          this.firstPage = params.page;
          this.transaction = params.transaction;
          if (this.firstPage.includes("transaction-details") )
          {
            this.id = params.id;
          }
          else if (this.firstPage.includes("tp-add"))
          {
            this.tpId = params.tpId;
          }

          console.log("queryParams: " + this.firstPage);
          this.onLogin();
        }
      }
    );

      this.syncSelectedTabWithUrl(this.router.url);
      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          this.syncSelectedTabWithUrl(event.urlAfterRedirects || event.url);
        }
      });

  }

  ngAfterViewInit() {
    if(this.focusField !== undefined && this.focusField.nativeElement !== undefined)
    {
      this.focusField.nativeElement.focus();
    }
  }


     // convenience getter for easy access to form fields
     get f() { return this.loginForm.controls; }


  logout() {
    this.authenticationService.logout();
    this.storage.clear();
    this.isLogin = false;
    this.f.username.setValue('');
    this.f.password.setValue('');
    this.router.navigate(['/']);
    location.reload();
   }

   onLogin()
   {

    console.log("header onLogin")
      // stop here if form is invalid
      if (this.loginForm.invalid) {
        console.error("Invalid login form");
          return;
      }

      this.loading = true;
      if (this.f.username == undefined)
      {
        console.error('username is null')
        return
      }
      return this.authenticationService.login(this.f.username.value, this.f.password.value, this.f.env.value)
      .subscribe({
        next: (res) =>
        {
          console.info('from  authenticationService.login : ' + this.firstPage);
          this.isLogin = true;

          this.TransactionService.deleteDisplayColumns('Session','','').subscribe((res: any) => {

              console.info("Delete Display: " + res);


              this.TransactionService.deleteSearchColumns().subscribe((res: any) => {

                console.info("Delete Search: " + res);

              });



              this.TransactionService.fetchConfiguration().subscribe((res: any) => {
                console.info("Configuration array : " + res.length);
                if (res.length == 1) {
                  console.log('Open Setting')
                  this.router.navigate([this.links[0].link]);
                  this.selectedLnkIndex.setValue(0);
                } else {
                  this.buildAndStoreUserConfig(res);
                  const logoffValue = this.storage.getItem<string>('Logoff');
                  if (logoffValue !== undefined && logoffValue !== null) {
                    this.loginForm.controls.logoutTime.setValue(logoffValue);
                  }



                  this.getWFitems();

                  if (this.firstPage.includes("transaction-details") )
                  {
                    console.log("navigate: /transaction/transaction-details/ -" + this.id);
                    this.router.navigate(["/transaction/transaction-details/"],
                    {queryParams: { id:  this.id, 'transaction': this.transaction, 'search': ''} }
                    );
                    this.selectedLnkIndex.setValue( 5)
                  }
                  else if (this.firstPage.includes("tp-add"))
                  {
                    console.log("navigate: /TradingPartners/tpIds/tp-links/tp-add -" + this.id);
                    this.router.navigate(["/TradingPartners/tpIds/tp-links/tp-add/"+this.tpId ],
                    {queryParams: { 'transaction': this.transaction} }
                    );
                    this.selectedLnkIndex.setValue( 1)
                  }
                  else{
                    console.log('Navigate: ' + this.firstPage + ' # ' +  this.selectedLnkIndex.value)
                    this.router.navigate([this.firstPage]);
                  }

                }


                // Auto logout

                this.check();
                this.initListener();
                this.initInterval();
                console.log('Store in sessionStorage')
                this.storage.setItem(STORE_KEY,Date.now().toString());
                return;

              });
        });


        this.submitted = true;

        },
        error: (e) => {
          console.error('onLogin catchError: ' +e);
          this.router.navigate(['/']);
          this.error = 'Login failed for ' + this.f.username.value + ". Exception in calling the REST service "
          alert(this.error)
          this.displayHelp = "Login failed";
          this.loading = false;
          return;
        }
      })


   }

   getSelectedIndex(): number {
    console.log("header getSelectedIndex. current: " + this.selectedLnkIndex.value +" prev: "+ this.prevLnkIndex)
    return this.selectedLnkIndex.value;
   }

   onTabChanged(event: MatTabChangeEvent): void {

    console.log("header onTabChanged. from: " + this.selectedLnkIndex.value +" to: "+ event.index)


      this.selectedLnkIndex.setValue(event.index);
      const selectedLink = this.links[event.index];

      if (!selectedLink.children || selectedLink.children.length === 0) {
        this.utilitySubmenuVisible = false;
      }

      console.info("onTabChanged Navigate to " + selectedLink.link)

      if (selectedLink.children && selectedLink.children.length > 0) {
        this.utilitySubmenuVisible = this.openUtilitySubmenuOnSelect;
        this.openUtilitySubmenuOnSelect = false;
        this.prevLnkIndex = this.selectedLnkIndex.value
        return;
      }

      if (selectedLink.name === 'Work Flow')
      {
          let numItems = this.NumAssignedItems
            this.NumAssignedItems = 0;
            this.storage.removeItem("currentTab")
            this.storage.setItem("currentTab", selectedLink.name);
            this.router.navigate([selectedLink.link], {queryParams: { 'WFitems':  numItems}} );
      }
      else{
          this.getWFitems()
          if (event.index != 0)
          {
            this.storage.removeItem("currentTab")
            this.storage.setItem("currentTab", selectedLink.name);
          }
          this.router.navigate([selectedLink.link]);
      }
      this.prevLnkIndex = this.selectedLnkIndex.value
   }

   getWFitems()
   {
    let paramsList: string[]= [];

    paramsList.push('TransactionType::All')
    paramsList.push('StatusTypes::Assigned To Me')
    paramsList.push('ErrorType::All')

    this.WfService.fetchWorkFlowItems( 'Batch', paramsList).subscribe((res: any) => {
      this.NumAssignedItems = res.length;
          console.log("Batch WF: " + res.length);
          if (`${environment.org}` == 'SH')
          {
            this.WfService.fetchWorkFlowItems( 'RealTime', paramsList).subscribe(
            (res:[]) => {
            console.log("RT WF: " + res.length);
                this.NumAssignedItems += res.length;

              },
              err => {
                console.error("WF call failed");
              },
              () => console.log('HTTP request completed.')
            );
          }
    });

   }

   onHome()
   {
    console.log("header onHome")
    this.selectedLnkIndex.setValue(3);

    this.getWFitems()
    this.router.navigate([this.links[this.selectedLnkIndex.value].link]);



   }

   // Auto logout

   public getLastAction() {
    return parseInt(this.storage.getItem<string>(STORE_KEY));
  }

 public setLastAction(lastAction: number) {
  this.storage.setItem(STORE_KEY, lastAction.toString());
  }

   initListener() {
    document.body.addEventListener('click', () => this.reset());
    document.body.addEventListener('mouseover',()=> this.reset());
    document.body.addEventListener('mouseout',() => this.reset());
    document.body.addEventListener('keydown',() => this.reset());
    document.body.addEventListener('keyup',() => this.reset());
    document.body.addEventListener('keypress',() => this.reset());
     window.addEventListener("storage",() => this.storageEvt());

  }

  reset() {

    this.setLastAction(Date.now());
    // console.log('store key',this.storage.getItem(STORE_KEY));

  }

  initInterval() {
    setInterval(() => {
      this.check();
    }, CHECK_INTERVAL);
  }

  onContextSettings()
  {
    this.selectedLnkIndex.setValue(0);
    this.router.navigate(["/transaction/transaction-settings/"],
     );
  }

  check() {
    const now = Date.now();
    var tm = this.f.logoutTime.value
    const timeleft = this.getLastAction() + tm * 60 * 1000;
    const diff = timeleft - now;
    // console.log('Max time:' + tm + ', difference',diff)
    const isTimeout = diff < 0;

    if (isTimeout)  {
      this.logout();
    }
  }

  storageEvt(){
	  console.log("storage");
	  this.val = this.storage.getItem<string>(STORE_KEY);
  }


}




