import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, inject, model, signal } from '@angular/core';

import { FormBuilder, FormGroup, FormArray, FormControl, Validators, NgForm } from '@angular/forms';
import { CdkDragDrop, moveItemInArray } from "@angular/cdk/drag-drop";

import {TransRestServiceComponent} from '../../services/transrest-service.component';
import { MatTableDataSource } from '@angular/material/table';
import {MatAccordion, MatExpansionModule} from '@angular/material/expansion';
import {MatRadioModule, MatRadioGroup} from '@angular/material/radio';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { Router, ActivatedRoute } from '@angular/router';
import {MatSelectModule,} from '@angular/material/select';
import {DisplayColumns, DisplayColumnsArray} from '../DisplayColumns'
import {SearchColumns, SearchColumnsArray} from '../SearchColumns'
import {ConfirationArray, ConfigColumns} from '../Configuration';

import {MatNativeDateModule} from '@angular/material/core';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatFormFieldModule} from '@angular/material/form-field';
import { MatMenu, MatMenuTrigger } from '@angular/material/menu';
import { MatSelect, MatSelectChange } from '@angular/material/select';
import { MatFormField } from '@angular/material/form-field';
import {Link, tabLinks} from '../../header/Links';
import { environment } from '../../../environments/environment';
import { StorageService } from '../../services/storage.service';
import { ListConfirmDialogComponent } from '../../list-confirm-dialog/list-confirm-dialog.component';
import { MatIconModule } from '@angular/material/icon';

import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';

import {
  CdkDrag,
  CdkDropList,
  CdkDropListGroup,
  transferArrayItem,
} from '@angular/cdk/drag-drop';

import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';

@Component({
    selector: 'app-transaction-settings',
    templateUrl: './transaction-settings.component.html',
    styleUrls: ['./transaction-settings.component.css'],
    standalone: false
})



export class TransactionSettingsComponent implements OnInit, AfterViewInit {
  private subscriptions: any[] = [];

  allDispFields = [];
  allSearchFields = [];

  usrSelectedDispCols = [];
  usrSelectedSearchCols = [];
  org = `${environment.org}`;

  paramsList: string[];

  maxCount = ["10", "25", "50", "100", "200"];

  logoutTime = ["15", "30", "60", "120"]

  searchTime = ["Last 1 day", "Last 7 days", "Last 30 days", "Last 90 days", "Last 365 days",];

  landingPage = ["Trading Partners", "Transmissions", "Transactions", "Work Flow"];

  transactionTypes: string[] = ["270", "271","276", "277", "277CA", "835", "837I", "837P", "837D", "999", "TA1"];

  modes: string[] = ["Batch", "RealTime"];

  form!: FormGroup;

// All transaction fields from the service

additionalSearchStr :string;
searchTypeString:string = "";

  allTransactionsFields= [
    {
      key: 'Invalid',
      type: 'text',
      label: 'Select Transaction to view the Columns',
      transactionCode: '',
      order: 1,
      checked: 'false'
    }];

    // Display columns for a user from the service
    usrDisplayColumns: DisplayColumns[] = [];

    // Search columns for a user from the service
    usrSearchColumns: SearchColumns[] = [];


  @ViewChild("cngfDispCnt") cngfDispCnt: ElementRef;

  @ViewChild("dispMode") dispMode: ElementRef;

  formFields = {
      rowCnt: '',
      modeString: "Batch"
  }

  sub:any;
  value = 'Clear me';
  showMode = 1
  showCngfMode = 1

  cngfTranType = "835"
  dispTransType = "";
  cngfMode = "Batch";
  private _snackBar = inject(MatSnackBar);

  constructor(
    private TransactionService: TransRestServiceComponent,
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private storageService: StorageService
  ) {
    tpId: new FormControl();
  }

  ngOnInit() {
    this.searchTypeString = this.storageService.getItem<string>("searchTypeString");
    this.initForm();
    this.initTransactionTypes();
    this.initFromSessionStorage();
    this.initFromSearchTypeString();
    this.loadConfigurationAndFields();
    this.handleQueryParams();
  }

  // --- ngOnInit Refactor Helpers ---
  private initForm() {
    this.form = this.formBuilder.group({
      cngfPage: ['Transmissions', Validators.required],
      cngfTranType: ['', Validators.required],
      cngfMode: ['Batch', Validators.required],
      cngfBthTime: ['Last 1 day', Validators.required],
      cngfTranTime: ['Last 1 day', Validators.required],
      cngfWfTime: ['Last 7 days', Validators.required],
      cngfLogoff: ['30', Validators.required],
      cngfDispCnt: ['25', Validators.required],
      dispTransType: ['', Validators.required],
      dispMode: ['Batch', Validators.required]
    });
  }

  private initTransactionTypes() {
    if (this.org == 'SH') {
      this.transactionTypes = ["270", "271", "276", "277", "277CA", "835", "837I", "837P", "837D", "999", "TA1"];
    } else {
      this.transactionTypes = ["835", "837I", "837P", "837D", "999", "277CA", "TA1"];
    }
    this.dispTransType = '';
  }

  private initFromSessionStorage() {
    const transConfig = this.storageService.getItem<string>('transConfig');
    if (transConfig !== undefined && transConfig !== null) {
      let formFields = JSON.parse(transConfig);
      console.info("transConfig from sessionStorage: " + formFields.currentTransType + ", Mode: " + formFields.mode);
      this.dispTransType = formFields.currentTransType;
      this.form.controls.dispTransType.setValue(this.dispTransType);
      this.form.controls.dispMode.setValue(formFields.mode);
    }
  }

  private initFromSearchTypeString() {
    if (this.dispTransType === '' && this.searchTypeString !== null && this.searchTypeString.indexOf("transaction::") >= 0) {
      let fInd = this.searchTypeString.indexOf("transaction::") + "transaction::".length;
      this.dispTransType = this.searchTypeString.substring(fInd, this.searchTypeString.indexOf(";", fInd));
      console.log(fInd + ". transType:" + this.dispTransType);
      this.form.controls.dispTransType.setValue(this.dispTransType);
      fInd = this.searchTypeString.indexOf("mode::") + 6;
      let val = this.searchTypeString.substring(fInd, this.searchTypeString.indexOf(";", fInd));
      console.log(fInd + ". MODE:" + val);
      this.form.controls.dispMode.setValue(val);
    }
  }

  private loadConfigurationAndFields() {
    const configSub = this.TransactionService.fetchConfiguration().subscribe((res: any) => {
      console.info("Configuration array : " + res.length + ", DispTransType: " + this.dispTransType);
      if (res.length !== 1) {
        for (let ind = 0; ind < res.length; ind++) {
          const key = res[ind].Key;
          const value = res[ind].Value;
          switch (key) {
            case 'Page':
              this.form.controls.cngfPage.setValue(value); break;
            case 'TranType':
              this.cngfTranType = value;
              this.form.controls.cngfTranType.setValue(this.cngfTranType);
              if (this.dispTransType === '') {
                this.dispTransType = value;
                this.form.controls.dispTransType.setValue(this.dispTransType);
              }
              break;
            case 'Mode':
              this.form.controls.cngfMode.setValue(value); break;
            case 'BthTime':
              this.form.controls.cngfBthTime.setValue(value); break;
            case 'TranTime':
              this.form.controls.cngfTranTime.setValue(value); break;
            case 'WfTime':
              this.form.controls.cngfWfTime.setValue(value); break;
            case 'Logoff':
              this.form.controls.cngfLogoff.setValue(value); break;
            case 'DispCnt':
              this.form.controls.cngfDispCnt.setValue(value); break;
          }
        }
      }
      const fieldsSub = this.TransactionService.fetchTransactionFields().subscribe((res: any) => {
        this.allTransactionsFields = [];
        for (var item of res) {
          this.allTransactionsFields.push({
            key: item.Key,
            type: item.Type,
            label: item.TransactionLabel,
            transactionCode: item.TransactionCode,
            order: item.Order,
            checked: 'false'
          });
        }
        console.info("All TransactionsFields: " + this.allTransactionsFields.length);
        console.info("Fetch Display, Search Columns. ");
        const dispSub = this.TransactionService.fetchDisplayColumns("Default", "Transactions").subscribe((res: any) => {
          this.usrDisplayColumns.splice(0, this.usrDisplayColumns.length);
          this.usrDisplayColumns.push(...res);
          console.info("User display columns from fetchDisplayColumns: " + this.usrDisplayColumns.length);
          const searchSub = this.TransactionService.fetchSearchColumns("Default", "Transactions").subscribe((res: any) => {
            this.usrSearchColumns.splice(0, this.usrSearchColumns.length);
            this.usrSearchColumns.push(...res);
            console.info("User search columns from fetchSearchColumns: " + this.usrSearchColumns.length);
            if (this.dispTransType !== '') {
              this.transactionChange(this.dispTransType);
            }
            this.subscriptions.push(searchSub);
          });
          this.subscriptions.push(dispSub);
        });
        this.subscriptions.push(fieldsSub);
      });
    });
    this.subscriptions.push(configSub);
  }

  private handleQueryParams() {
    this.sub = this.route.queryParams.subscribe(params => {
        this.subscriptions.push(this.sub);
      if (params !== undefined && params.transaction !== undefined) {
        this.dispTransType = params['transaction'] || '';
        this.formFields.modeString = params['mode'];
        this.form.controls.dispTransType.setValue(this.dispTransType);
        this.form.controls.dispMode.setValue(this.formFields.modeString);
        this.additionalSearchStr = params['additionalSearch'];
        this.searchTypeString = params['searchTypeString'];
        console.log('Query params trans: ' + this.dispTransType + ", additionalSearch: " + this.additionalSearchStr + ", searchTypeString: " + this.searchTypeString);
      }
      if (this.dispTransType == '') {
        this.dispTransType = this.transactionTypes[0];
        this.form.controls.dispTransType.setValue(this.dispTransType);
      }
    });
  }


  get f() { return this.form.controls; }

  modeChange(evt: any)
  {
    console.info("Mode: " + this.form.controls.dispMode.value)
    this.formFields.modeString = this.form.controls.dispMode.value
    // Re-filter columns when mode changes
    this.transactionChange(this.form.controls.dispTransType.value);
  }

  cngfTranTypeChange(evt: any)
  {
    this.cngfTranType = this.form.controls.cngfTranType.value
    if (this.cngfTranType === "835" || this.cngfTranType.indexOf("837") == 0 || this.cngfTranType === "277CA")
    {
        this.cngfMode = "Batch";
        this.showCngfMode = 0

        this.form.controls.cngfMode.setValue(this.cngfMode)
    }
    else
    {
      this.showCngfMode = 1
    }
  }

transactionChange(evt: any)
{

  this.usrSelectedDispCols = [];
  this.usrSelectedSearchCols=[];
  this.allDispFields=[];
  this.allSearchFields=[];

  this.dispTransType = this.form.controls.dispTransType.value;

  if (this.dispTransType === "835" || this.dispTransType.indexOf("837") == 0 || this.dispTransType === "277CA")
  {
      this.formFields.modeString = "Batch";
      this.showMode = 0

      this.form.controls.dispMode.setValue(this.formFields.modeString)
  }
  else
  {
    this.showMode = 1
  }


  for (var col of this.allTransactionsFields)
    {

      if ( (Number.parseInt(col.transactionCode) == 1 || col.transactionCode === this.form.controls.dispTransType.value)
          )

      {
          // console.info("all search disp Columns push = " + col.key + ", " + col.transactionCode);

          this.allDispFields.push(col.label)
          this.allSearchFields.push(col.label)


          // console.info("searchColumns pushed: " + col.key);
      }
    }

  if(this.usrDisplayColumns.length > 0)
  {
    console.info("Check usrDisplayColumns: " + this.usrDisplayColumns.length +', allDropdownList #: ' + this.allDispFields.length);

    for (var disp of this.usrDisplayColumns)
    {
      // console.info(disp.TransactionCode + ", # " + this.transactionsSearchColumns.length +', allDropdownList #: ' + this.allDropdownList.length)
      for (var col of this.allTransactionsFields)
      {

        if ( disp.TransactionCode === this.form.controls.dispTransType.value
          && disp.key === col.key && disp.Mode === this.form.controls.dispMode.value)
        {

            // console.info(disp.TransactionCode + " PUSH User selected column: " + disp.key + "===" + col.key +", selInd: " + selInd)
            this.usrSelectedDispCols.push(col.label)
            let ind = this.allDispFields.indexOf(col.label)
            this.allDispFields.splice(ind, 1)
            break;

        }
      }
    }

  }
  if(this.usrSearchColumns.length > 0)
    {
      console.info("Check usrDisplayColumns: " + this.usrDisplayColumns.length +', allDropdownList #: ' + this.allSearchFields.length);

      for (let srch of this.usrSearchColumns)
      {
        // console.info(disp.TransactionCode + ", # " + this.transactionsSearchColumns.length +', allDropdownList #: ' + this.allDropdownList.length)
        for (var col of this.allTransactionsFields)
        {

          if ( srch.TransactionCode === this.form.controls.dispTransType.value
            && srch.key === col.key && srch.Mode === this.form.controls.dispMode.value)
          {

              // console.info(disp.TransactionCode + " PUSH User selected column: " + disp.key + "===" + col.key +", selInd: " + selInd)
              this.usrSelectedSearchCols.push(col.label)
              let ind = this.allSearchFields.indexOf(col.label)
              this.allSearchFields.splice(ind, 1)
              break;

          }
        }
      }

    }


  console.info("Usr DisplayFields #: " + this.usrSelectedDispCols.length);


  console.info("Usr SearchFields #: " + this.usrSelectedSearchCols.length);

}


ngAfterViewInit()
{
 console.info("ngAfterViewInit");


}



resetSettings()
{

   this.TransactionService.saveUserSettings('All', this.form.controls.dispTransType.value, this.formFields.modeString).subscribe((res: any) => {

         this.openSnackBar(this.form.controls.dispTransType.value +", " + this.formFields.modeString, "Default Settings copied. Display # "+ res.DisplayCount + ", Search # " + res.SearchCount);

   });

}

saveSettings(setting: string)
{


  var dispCol = <DisplayColumnsArray>{};
  dispCol.displayColumns = [];

  var srchCol = <SearchColumnsArray>{};
  srchCol.SearchColumns = [];

  var ind = 0;

  console.info('Save: ' + this.form.controls.dispTransType.value + ", Display #: " + this.usrSelectedDispCols.length);

  for (var item of this.usrSelectedDispCols)
  {
     let key = ""
    for (var col of this.allTransactionsFields)
      {

        if ( item === col.label)
        {
            key = col.key
            break;
        }
      }


       console.log('Save: ' + item +", order: " + ind +", key: " + key);
       dispCol.displayColumns.push(
        {  id: '1',
        TransactionCode: this.form.controls.dispTransType.value,
        key:  key,
        Order: ind,
        Setting: setting,
        DispType: 'Transactions',
        Mode:this.form.controls.dispMode.value}
      );


    ind++;
  }
  console.log('Save Display: ' + dispCol.displayColumns.length);



  for (var item of this.usrSelectedSearchCols)
  {
    let key = ""
    for (var col of this.allTransactionsFields)
      {

        if ( item === col.label)
        {
            key = col.key
            break;
        }
      }
       console.log('Search Save: ' + item +", key: " + key);
       srchCol.SearchColumns.push(
        {  id: '1',
        TransactionCode: this.form.controls.dispTransType.value,
        key:  key,
        Setting: setting,
        Mode:this.form.controls.dispMode.value, DispType: 'Transactions'}
      );


  }
  console.log('Save Search: ' + srchCol.SearchColumns.length);


      this.TransactionService.saveDisplayColumns(dispCol).subscribe((res: any) => {

          console.info("Display TransactionService: " + res);

        });
        this.TransactionService.saveSearchColumns(srchCol).subscribe((res: any) => {

          console.info("Search TransactionService: " + res);

          this.openSnackBar('Search, Display', (setting === 'Default' ) ? 'Saved as ' + setting : 'Saved for ' + setting );

        });




}

saveConfig()
{
  let paramsList=<ConfirationArray>{};


  paramsList.configColumns = [];

   paramsList.configColumns.push({key:'Page', value: this.form.controls.cngfPage.value });
   paramsList.configColumns.push({key:'TranType', value: this.form.controls.cngfTranType.value})
   paramsList.configColumns.push({key:'Mode', value: this.form.controls.cngfMode.value})
   paramsList.configColumns.push({key:'BthTime', value:this.form.controls.cngfBthTime.value})
   paramsList.configColumns.push({key:'TranTime', value:this.form.controls.cngfTranTime.value})
   paramsList.configColumns.push({key:'WfTime', value: this.form.controls.cngfWfTime.value})
   paramsList.configColumns.push({key:'Logoff', value: this.form.controls.cngfLogoff.value})
   paramsList.configColumns.push({key:'DispCnt', value: this.form.controls.cngfDispCnt.value})


   this.TransactionService.saveConfiguration(paramsList).subscribe((res: any) => {

    console.info("saved Configuration, navigate: " + this.form.controls.cngfPage.value);
    let ind = 0;
    for(; ind < tabLinks.length; ind++)
      {
        console.info( tabLinks[ind].name +" === " + this.form.controls.cngfPage.value)
        if(tabLinks[ind].name === this.form.controls.cngfPage.value)
        {
          console.log("Navigate to : " + tabLinks[ind].link);
          break;
        }

      }
      let jsonString = "";
      paramsList.configColumns.forEach(element => {

        if (jsonString.length === 0) {
          jsonString = '{"' + element.key + '":"' + element.value + '"';
        } else {
          jsonString += ',"' + element.key + '":"' + element.value + '"';
        }
        console.info("Session storage set: " + element.key + ", " + element.value);
      });
      jsonString += "}";

      this.storageService.removeItem("UserConfig");
      this.storageService.setItem('UserConfig', jsonString);

      this.storageService.removeItem("currentTab");
      this.storageService.setItem("currentTab", tabLinks[ind].name);

      // Force the Tabs to use UserConfig to decide on navigation after settings save, remove other related session storage items to force refetch of config and fields
      this.storageService.removeItem("sumConfig");
      this.storageService.removeItem("transConfig");
      this.storageService.removeItem("wfConfig");

      this.openSnackBar('Configuration', 'Saved' );

  });


}

toTransactions()
  {

      console.log('To Transactions: ' + this.dispTransType + "= " + this.searchTypeString + "/" + this.additionalSearchStr);
      this.router.navigate(["/transaction/"],
      {
        queryParams: { transaction: this.dispTransType,
          'additionalSearch': this.additionalSearchStr,
          'searchTypeString': this.searchTypeString }
    }

       );
  }

  drop(event: CdkDragDrop<string[]>) {
    console.log(event.previousIndex +", " + event.currentIndex)
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }
  }



  openSnackBar(message: string, action: string) {
    this._snackBar.open(message, action, {duration:3000});
  }


  readonly dialog = inject(MatDialog);

  openDialog(): void {

        try {
          let data = [];
          data.push(this.dispTransType)
          const usersSub = this.TransactionService.fetchUsersWithSettings().subscribe((res: any) => {
            console.info("Users array : " + res.length);
            if (res.length <= 0 ) {
                console.log('No Users')
            } else {
              for(let ind = 0; ind < res.length; ind++) {
                console.log(res[ind].UserName)
                data.push(res[ind].UserName);
              }
              const dialogSub = this.dialog
                .open(ListConfirmDialogComponent , {
                  width: '600px',
                  height: '300px',
                  data:data
                })
                .afterClosed()
                .subscribe((confirm) => {
                  if (confirm) {
                    if (confirm.event === 'Save') {
                      const saveSub = this.TransactionService.saveUserSettings(confirm.data, this.dispTransType, '').subscribe((res: any) => {
                        this.openSnackBar( res.Transaction + ' Settings from ' + res.From + " To " + res.To, "Display # "+ res.DisplayCount + ", Search # " + res.SearchCount + " " + confirm.event +"d. ");
                      });
                      this.subscriptions.push(saveSub);
                    }
                    return;
                  }
                });
              this.subscriptions.push(dialogSub);
            }
            this.subscriptions.push(usersSub);
          });
        } catch(e) {
          console.error('Exception: ' + e)
        }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });
  }

  }


