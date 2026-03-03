import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';

import { FormBuilder, FormGroup, FormArray, FormControl, Validators, NgForm } from '@angular/forms';


import {TransRestServiceComponent} from '../services/transrest-service.component';
import { StorageService } from '../services/storage.service';
import { MatTableDataSource } from '@angular/material/table';
import {MatAccordion, MatExpansionModule} from '@angular/material/expansion';
import {MatRadioModule, MatRadioGroup} from '@angular/material/radio';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { Router, ActivatedRoute } from '@angular/router';
import {MatSelectModule,} from '@angular/material/select';
import {DisplayColumns} from '../transaction/DisplayColumns'
import {SearchColumns} from '../transaction/SearchColumns'
import {Modalx12Component} from '../transaction/transaction-details/modal/modal-x12.component';

import {MatNativeDateModule} from '@angular/material/core';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatFormFieldModule} from '@angular/material/form-field';
import { MatMenu, MatMenuTrigger } from '@angular/material/menu';
import { MatSelect, MatSelectChange } from '@angular/material/select';
import { MatFormField } from '@angular/material/form-field';
import { from, catchError, concatMap, forkJoin, toArray, Subscription } from 'rxjs';

import { MatDialog } from '@angular/material/dialog';
import { DialogRef } from '@angular/cdk/dialog';
import { environment } from '../../environments/environment';
import { MatIconModule } from '@angular/material/icon';
import { parseDays } from '../utils/parseDays';
import { DateTimeUtils } from '../utils/date-time.utils';

@Component({
    selector: 'app-summary',
    templateUrl: './summary.component.html',
    styleUrls: ['./summary.component.css'],
    standalone: false
})



export class SummaryComponent implements OnInit, AfterViewInit, OnDestroy {
  // --- Code Organization & Readability Improvements ---
  // 1. Large logic in ngOnInit split into private helpers
  // 2. Constructor simplified
  // 3. Session and form logic moved to private methods
  // 4. Add comments for clarity

  contextMenuPosition = { x: '0px', y: '0px' };
  @ViewChild(MatMenuTrigger)
  contextMenu: MatMenuTrigger;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  @ViewChild(MatSort) set matSort(sort: MatSort) {
    if (!this.dataSource.sort) {
      console.debug("Set sort in ViewChild")
      this.dataSource.sort = sort;
    }
  }

  nowDt = new Date((new Date().getTime() - (24 * 60 * 60 * 1000)));


  paramsList: string[];

    maxCount = ["10", "25", "50", "100", "200"];
    dispositions = ["All", "Processed", "Rejected", "Validation failed" ];
    rightClickMenu: string[] = ['Transactions in Same Tab', 'Transactions in New Tab', 'View X12'] ;


     org = `${environment.org}`;

 transactionTypes: string[] ;

   pageLength= 25;
   pageIndex = 1;
   pageSize = 25;
   @ViewChild('dataPaginator') dataPaginator: MatPaginator;


   nyiColumns = [
    {
      item_id: 'N/A',
      item_text: 'Not Implemented'
    }];

  transSearchStructArr: customSearchStruct[] =[];

  loading:boolean = false;
  searchSummary:boolean = false;

  form!: FormGroup;
  dataTableLabel: string[] = [];
  dataTableKey: string[] = [];
  canRenderDetails = false;
  showDirection = false;
  showMode = false;

  conditionColumns: string[] = ['=', '!=', '%StartsWith', 'Contains', 'LIKE', 'NOT LIKE'];

  dataSource = new MatTableDataSource<any>;

  summarysFields= [
    {
      key: 'Invalid',
      type: 'text',
      label: 'Select Summary to view the Columns',
      summaryCode: 'XXX',
    }];


  searchColumns= this.summarysFields.slice();

  formFields = {
      rowCnt: '',
      currentTransType: '',
      disposition: 'All',
      mode: '',
      direction: '',
      additional: '',
      startDate : "2023-01-12",
      startTm : "13:30",
      endDate: "2023-01-12",
      endTm : "13:30"
  };

  sumUserFlds = "";
  sub: Subscription | undefined;
  ngOnDestroy(): void {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  selDropdownList = [];

  allDropdownList = [];

  selectedItems=[];

  usrSearchColumns: SearchColumns[] = [];
  usrDisplayColumns: DisplayColumns[] = [];

  constructor(
    private SummaryService: TransRestServiceComponent,
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    public dialog: MatDialog,
    private storage: StorageService
  ) {
    tpId: new FormControl();
  }


  createinitForm(): FormGroup
  {
    console.info('Add new FormGroup for additional fields');
    return new FormGroup({
      'fld':new FormControl('FLD', Validators.required),
      'newFldValue':new FormControl('value', Validators.required),
    })
  }

  async ngOnInit() {
    this.initSessionTab();
    this.initTransactionTypes();
    this.initFormGroup();
    this.initFormFieldsFromSessionOrQuery();
    this.setFormControlsFromFields();
    this.clearSearch();
    await this.initSummaryFieldsAndColumnsAsync();
    if (!this.dataSource.sort) {
      console.debug('Set sort in ngInit');
      this.dataSource.sort = this.sort;
    }
  }

  private initSessionTab() {
    this.storage.removeItem('currentTab');
    this.storage.setItem('currentTab', 'Transmissions');
  }

  private initTransactionTypes() {
    if (this.org === 'SH') {
      this.transactionTypes = ["270", "271", "276", "277", "277CA", "835", "837I", "837P", "837D", "999", "TA1"];
    } else {
      this.transactionTypes = ["835", "837I", "837P", "837D", "999", "277CA", "TA1"];
    }
  }

  private initFormGroup() {
    this.form = this.formBuilder.group({
      rowCnt: ['25', Validators.required],
      transType: ['', Validators.required],
      disposition: ['All', Validators.required],
      mode: ['RealTime', Validators.required],
      direction: ['Inbound'],
      additional: this.formBuilder.array([this.createinitForm()])
    });
  }

  private initFormFieldsFromSessionOrQuery() {
    let stDt = 1;
    this.formFields.currentTransType = '';
    this.sub = this.route.queryParams.subscribe(params => {
      if (params && params['sumConfig']) {
        console.info('Init from query params sumConfig: ' + params['sumConfig']);
        this.formFields = JSON.parse(params['sumConfig']);
        this.setEndTimeToNow();
      }
    });
    if (this.formFields.currentTransType === '' && this.storage.getItem('sumConfig')) {
      console.info('Init from session storage sumConfig');
      this.formFields = this.storage.getItem<any>('sumConfig');
      this.setEndTimeToNow();
    }
    if (this.formFields.currentTransType === '') {
      this.formFields.currentTransType = this.transactionTypes[0];
      this.formFields.disposition = this.dispositions[0];
      const parsedObject = JSON.parse(this.storage.getItem<any>('UserConfig') || '{}' ) ;
      if (parsedObject) {
        console.info("Init from session UserConfig: " + parsedObject.TranType + ", " + parsedObject.DispCnt + ", " + parsedObject.Mode);
        this.formFields.currentTransType = parsedObject.TranType;
        this.formFields.rowCnt = parsedObject.DispCnt;
        this.formFields.mode = parsedObject.Mode;
        this.pageSize = parsedObject.DispCnt;

        stDt = parseDays(parsedObject.BthTime);

      }
      this.setStartAndEndDateTimes(stDt);
    }
  }


  private setEndTimeToNow() {
    const { currentDt: endDt, currentTm: currentTm } = DateTimeUtils.GetCurrentDtTm();
    this.formFields.endDate = endDt;
    this.formFields.endTm = currentTm;
  }

  private setStartAndEndDateTimes(stDt: number) {
    console.log("Set Start and End DateTimes with stDt: " + stDt);

    const dtObj = DateTimeUtils.GetStartEndDtTm(stDt);
                this.formFields.startDate = dtObj.startDt;
                this.formFields.startTm = dtObj.startTm;
                this.formFields.endDate = dtObj.endDt;
                this.formFields.endTm = dtObj.endTm;

  }

  private setFormControlsFromFields() {
    this.form.controls.mode.setValue(this.formFields.mode);
    this.form.controls.transType.setValue(this.formFields.currentTransType);
    this.form.controls.disposition.setValue(this.formFields.disposition);
    this.form.controls.rowCnt.setValue(this.formFields.rowCnt);
  }

  private initSummaryFieldsAndColumnsAsync(): Promise<void> {
    return new Promise((resolve) => {

      console.info('Fetching SummaryFields and Display/Search Columns');

      this.SummaryService.fetchTransactionFields().subscribe((res: any) => {
        this.summarysFields = [];
        for (var item of res) {
          this.summarysFields.push({ key: item.Key, type: item.Type, label: item.TransmissionLabel, summaryCode: item.TransactionCode });
        }
        this.SummaryService.fetchDisplayColumns('Default', 'Summary').subscribe((res: any) => {
          this.usrDisplayColumns.splice(0, this.usrDisplayColumns.length);
          this.usrDisplayColumns.push(...res);
          this.SummaryService.fetchSearchColumns('Default', 'Summary').subscribe((res: any) => {
            this.usrSearchColumns.splice(0, this.usrSearchColumns.length);
            this.usrSearchColumns.push(...res);
            if (this.formFields.currentTransType !== '') {
              this.transactionChange(this.formFields.currentTransType);
              this.onSearchSummary();
            } else {
              this.transactionChange(this.transactionTypes[0]);
            }
            console.info('Fetched SummaryFields and Display/Search Columns');
            resolve();
          });
        });
      });
    });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    // this.dataSource.sort = this.sort;

  }
  get f() { return this.form.controls; }

  onSearchSummary()
    {
      this.canRenderDetails = false;
      this.paramsList = [];
      this.paramsList.push("mode::" + this.form.controls.mode.value);
      this.paramsList.push("transaction::"+this.form.controls.transType.value);
      this.paramsList.push("status::"+this.form.controls.disposition.value );

      this.paramsList.push("startDtTm::" + this.formFields.startDate +" "+ this.formFields.startTm);

      this.paramsList.push("endDtTm::" + this.formFields.endDate+" " +this.formFields.endTm );
      this.paramsList.push("count::" + this.form.controls.rowCnt.value);


      console.info("onSearchSummary count: " +this.form.controls.rowCnt.value)
      console.info("SearchSummarys Mode# " +  this.form.controls.mode.value + ", " + this.form.controls.transType.value + ", " + this.form.controls.disposition.value );
      console.info("SearchSummarys Start# " +  this.formFields.startDate + ", " + this.formFields.startTm );
      console.info("SearchSummarys End# " +  this.formFields.endDate  + ", " + this.formFields.endTm );

      if (this.form.controls.transType.value === '' && this.formFields.currentTransType !== '')
      {
        this.form.controls.transType.setValue(this.formFields.currentTransType);
      }


      this.loading = true;
      const formArr = this.form.get('additional') as FormArray;
      let staticSearchStr = "";


      // Get values for static search

      if (formArr.length >= 1) {
        for(let i=0;i< formArr.length;i++)
        {
          let fGrp = formArr.at(i) as FormGroup
          if (fGrp.controls.newFldValue.value === '')
          {
            console.info(fGrp.controls.fld.value +" is empty")
            continue;
          }
          else{

            console.info(fGrp.controls.fld.value +"= " + fGrp.controls.newFldValue.value)
          }

          for (let [ind, val] of this.transSearchStructArr.entries()) {

              if(fGrp.controls.fld.value === val.label
                && val.transactionCode === this.form.controls.transType.value
              )
                {
                  console.info("transSearchStructArr " + ind + ": " + val.transactionCode +", " + val.label + ", " + val.key + " = '" + fGrp.controls.newFldValue.value + "'")
                  if (fGrp.controls.newFldValue.value.indexOf('%') >= 0 )
                  {
                      staticSearchStr += " AND " + val.key + " LIKE '" + fGrp.controls.newFldValue.value + "'"
                  }
                  else
                  {
                    staticSearchStr += " AND " + val.key + "='" + fGrp.controls.newFldValue.value + "'"
                  }
                }
            };



        }
      }
      this.formFields.disposition = this.form.controls.disposition.value
      this.formFields.mode = this.form.controls.mode.value

      if(staticSearchStr.length > 3)
      {
          staticSearchStr = staticSearchStr.replace('AND','') // Remove first AND
          staticSearchStr = staticSearchStr.replaceAll('%','%25') //send a literal '%' character, it needs to be encoded as %25.%
          this.paramsList.push("sql::" + staticSearchStr);
      }
      this.paramsList.push("summary::1");

      this.sumUserFlds = "";
      this.paramsList.forEach( val => {
        this.sumUserFlds += val +";";
       });

      this.storage.setItem("sumUserFlds", this.sumUserFlds);
      this.storage.setItem("sumConfig", this.formFields);

      if(this.form.controls.transType.value === '270')
      {

            this.SummaryService.fetchEligibilityRequests(this.form.controls.mode.value, this.paramsList).subscribe((res: any) => {

            this.dataSource.data = res;
            this.dataSource.sort = this.sort;
            this.canRenderDetails = true;

            console.info("Data rows array: " + this.dataSource.data.length);


            this.loading = false;

            }),

            catchError(errorRes => {
              // Send to analytics server
              alert('Error in fetching EligibilityBenefit Requests: ' + errorRes);
              this.dataSource.data = [];
              return errorRes;
            })

      }
      else if(this.form.controls.transType.value === '271'){

        this.SummaryService.fetchEligibilityBenefitResponses(this.form.controls.mode.value, this.paramsList).subscribe((res: any) => {
         this.dataSource.data = res;
         this.dataSource.sort = this.sort;
         this.canRenderDetails = true;
         this.loading = false;
         console.info("EligibilityBenefitResponses array: " + this.dataSource.data.length);
        });

      }

      else if(this.form.controls.transType.value === '835'){


        console.info("835 search: "+ staticSearchStr );


        this.SummaryService.fetchClaimPayment(this.form.controls.mode.value, this.paramsList).subscribe((res: any) => {
         this.dataSource.data = res;
         this.dataSource.sort = this.sort;
         this.canRenderDetails = true;
         this.loading = false;
         console.info("ClaimPayment array: " + this.dataSource.data.length);
        });

      }
      else if(this.form.controls.transType.value === '837P'){

        console.info("837P search: "+ staticSearchStr );

          this.paramsList.push("addSql::" + "VersionReleaseIndustryIdenti='005010X222A1' ");

         this.SummaryService.fetchClaims(this.form.controls.mode.value, this.paramsList).subscribe((res: any) => {
          this.dataSource.data = res;
          this.dataSource.sort = this.sort;
          this.canRenderDetails = true;
          this.loading = false;
          console.info("Claims array: " + this.dataSource.data.length);

         });

       }

       else if(this.form.controls.transType.value === '837I'){

        this.paramsList.push("addSql::" + "VersionReleaseIndustryIdenti='005010X223A2' ")
        this.SummaryService.fetchClaims(this.form.controls.mode.value, this.paramsList).subscribe((res: any) => {
         this.dataSource.data = res;
         this.dataSource.sort = this.sort;
         this.canRenderDetails = true;
         this.loading = false;
         console.info("Claims array: " + this.dataSource.data.length);
        });

      }
      else if(this.form.controls.transType.value === '837D'){

        this.paramsList.push("addSql::" + "VersionReleaseIndustryIdenti='005010X224A2' ")
        this.SummaryService.fetchClaims(this.form.controls.mode.value, this.paramsList).subscribe((res: any) => {
         this.dataSource.data = res;
         this.dataSource.sort = this.sort;
         this.canRenderDetails = true;
         this.loading = false;
         console.info("Claims array: " + this.dataSource.data.length);

        });

      }
      else if(this.form.controls.transType.value === '276'){

        this.SummaryService.fetchClaimStatusReq(this.form.controls.mode.value, this.paramsList).subscribe((res: any) => {
         this.dataSource.data = res;
         this.dataSource.sort = this.sort;
         this.canRenderDetails = true;
         this.loading = false;
         console.info("Claim Status  Req array: " + this.dataSource.data.length);

        });

      }
       else if(this.form.controls.transType.value === '277'){

         this.SummaryService.fetchClaimStatusResp(this.form.controls.mode.value, this.paramsList).subscribe((res: any) => {
          this.dataSource.data = res;
          this.dataSource.sort = this.sort;
          this.canRenderDetails = true;
          this.loading = false;
          console.info("Claim Status Resp array: " + this.dataSource.data.length);

         });

       }
       else if(this.form.controls.transType.value === '277CA'){

        this.SummaryService.fetchClaimAcknowledgment(this.form.controls.mode.value, this.paramsList).subscribe((res: any) => {
         this.dataSource.data = res;
         this.dataSource.sort = this.sort;
         this.canRenderDetails = true;
         this.loading = false;
         console.info("Claim Acknowledgment array: " + this.dataSource.data.length);
         this.dataSource.sort = this.sort;
         console.debug("Set sort after populating table")
        });

      }
       else if(this.form.controls.transType.value === '999'){

        this.SummaryService.fetchImplementationAcknowledgment(this.form.controls.mode.value, this.paramsList).subscribe((res: any) => {
         this.dataSource.data = res;
         this.dataSource.sort = this.sort;
         this.canRenderDetails = true;
         this.loading = false;
         console.info("Implementation Acknowledgment array: " + this.dataSource.data.length);

        });

      }
      else if(this.form.controls.transType.value === 'TA1'){

        this.SummaryService.fetchTA1(this.form.controls.mode.value, this.paramsList).subscribe((res: any) => {
         this.dataSource.data = res;
         this.dataSource.sort = this.sort;
         this.canRenderDetails = true;
         this.loading = false;
         console.info("Interchange TA1 array: " + this.dataSource.data.length);

        });

      }
       else // Not Implemented
       {
        this.searchColumns = [];
        this.selDropdownList = this.nyiColumns;

        this.canRenderDetails = true;
        this.loading = false;
        console.info("NotImplementd array: " + this.dataSource.data.length);
       }

       this.paginator.pageSize = this.form.controls.rowCnt.value;

    }

onRowCnt()
      {
        console.info('Set paginator.pageSize: ' + this.form.controls.rowCnt.value)
        this.paginator.pageSize = this.form.controls.rowCnt.value;
        this.formFields.rowCnt =  this.form.controls.rowCnt.value;
        this.dataSource.paginator = this.paginator
}

clearSearch()
    {
      this.canRenderDetails = false;
      this.searchSummary = false;
      console.info('clearSearch fields');
    }


private createCustomFlds(fldLbl: string): FormGroup {
  return new FormGroup({
    'fld': new FormControl(fldLbl),
    'newFldValue': new FormControl('', Validators.required)
  })
}

private clearCustomFlds() {

  const formArr = this.form.get('additional') as FormArray

  if (formArr.length >= 1) {
      formArr.clear()
  }
}

private readCustomFlds() {

  const formArr = this.form.get('additional') as FormArray

  if (formArr.length >= 1) {
    for(let i=0;i< formArr.length;i++)
    {
      let fGrp = formArr.at(i) as FormGroup
      // console.info(fGrp.controls.fld.value +"= " + fGrp.controls.newFldValue.value)
    }
  }
  console.info("Added to Additional search: " + formArr.length)

}

transactionChange(evt: any)
{

  this.dataTableLabel = [];
  this.dataTableKey = [];
  this.selectedItems = [];
  this.searchColumns =[];
  this.selDropdownList= [];

  this.allDropdownList= [];
  var allTempArr= [];
  this.dataSource.data = [];
  console.info("In transactionChange: chnage from: " + this.formFields.currentTransType +" to " + this.form.controls.transType.value)
  if(this.form.controls.transType.value !== this.formFields.currentTransType &&
    this.form.controls.mode.value !== this.formFields.mode)
  {
    this.clearSearch();
  }
  this.formFields.currentTransType = this.form.controls.transType.value;

  this.readCustomFlds();

  this.clearCustomFlds();

  var tranType:string = this.form.controls.transType.value
  console.info("Search " + tranType + " in summarysFields " + this.summarysFields.length)

  if (tranType.startsWith("83") || tranType === "277CA")
    {
      console.info("Change Mode to Batch for 83x, 277CA")
      this.form.controls.mode.setValue("Batch")
      this.showMode = false;

    }
    else
    {
       this.showMode = true;
    }

    if (tranType.startsWith("999") || tranType === "TA1")
    {
        console.info("Change Mode to Batch for 83x, 277CA")
        this.form.controls.direction.enable();
        this.showDirection = true;
    }
    else
    {
        this.form.controls.direction.disable();
        this.showDirection = false;
    }

  for (var col of this.summarysFields)
  {

    if ( col.summaryCode === this.form.controls.transType.value)
    {
      allTempArr.push({item_id:col.key, item_text:col.label});
      this.searchColumns.push(col);
    }
  }
  console.info("searchColumns.count: " + this.searchColumns.length)

  this.allDropdownList = allTempArr;
  var tempArr = [];


  if(this.usrDisplayColumns.length > 0)
  {
    console.info("Check usrDisplayColumns: " + this.usrDisplayColumns.length +', allDropdownList #: ' + this.allDropdownList.length);
    console.info("Get Lables for transType: " + this.form.controls.transType.value + ', Mode: ' + this.form.controls.mode.value)

    this.usrDisplayColumns.sort((a,b) => a.Order > b.Order ? 1:-1)

    for (var disp of this.usrDisplayColumns)
    {

      for (var col of this.summarysFields)
      {

        if ( disp.TransactionCode === this.form.controls.transType.value
          && disp.key === col.key && disp.Mode === this.form.controls.mode.value)
        {
          var selInd = this.allDropdownListFind(col.label);
          // console.info("Find: " + col.label + 'in allDropdownList #: ' + this.allDropdownList.length)
          if(selInd !== -1)
          {
            console.info(disp.TransactionCode + " PUSH User selected column: " + disp.Order + " key: " + disp.key + "===" + col.key +", selInd: " + selInd )
            tempArr.push({item_id:selInd, item_text:col.label});

            break;
          }
        }
      }
    }
    this.selDropdownList =  tempArr;
  }
  if(tempArr.length === 0) // Nothing from User display columns
  {
    console.info("Nothing from User display columns for: " + this.form.controls.transType.value)
    this.searchColumns = [];
    this.allDropdownList = [];
    var tempArr2 = [];
    for (var col of this.summarysFields)
    {


      if ( col.summaryCode === this.form.controls.transType.value)
      {
          // console.info(col.summaryCode + " PUSH " + col.key)

          tempArr.push({item_id:col.key, item_text:col.label});
          tempArr2.push({item_id:col.key, item_text:col.label});
          this.searchColumns.push(col);
      }
    }
    this.selDropdownList =  tempArr;
    this.allDropdownList = tempArr2;
  }

  for (var item of this.selDropdownList)
  {
    // console.info("selDropdownList key: " + item.item_id +", val: " +item.item_text )
      this.dataTableLabel.push(item.item_text);
      this.dataTableKey.push(item.item_id);
      this.selectedItems.push({key:item.item_id, label:item.item_text})
  }


  console.info("allDropdownList #: " + this.allDropdownList.length);
  console.info("Display columns #: " + this.selDropdownList.length);
  console.info("All search Columns #: " + this.searchColumns.length);
  console.info("User search Columns #: " + this.usrSearchColumns.length);

  console.info('Add search group')
  const formArr = this.form.get('additional') as FormArray



  this.usrSearchColumns.forEach(element => {
    if(element.TransactionCode === this.form.controls.transType.value && element.Mode === this.form.controls.mode.value)
    {

        for (let tran of this.summarysFields){
        {
          if(tran.key == element.key)
          {
            console.info(tran.label + ": " + element.key +", " + element.TransactionCode +", " + element.Mode);
            formArr.push(this.createCustomFlds(tran.label));
            this.transSearchStructArr.push({label: tran.label, key: element.key, transactionCode: element.TransactionCode});
            break;
          }

        }

      }
    }
  });
  this.onSearchSummary();


}


allDropdownListFind(label:string)
{
  for(var val of this.allDropdownList)
  {
    if(val.item_text === label)
    {
      // console.info("allDropdownListFind: " + val.item_id);
      return val.item_id
    }
  }
  return -1;
}

onStDateChange(event: Event)
{

  // Get the new input value
  const newValue = (event.target as HTMLInputElement).value;
  // Perform actions based on the new value
  this.formFields.startDate = newValue;
  console.log('Input value changed:', newValue +", " + this.formFields.startDate);
}

onStTimeChange(event: Event)
{

  // Get the new input value
  const newValue = (event.target as HTMLInputElement).value;
  // Perform actions based on the new value
  this.formFields.startTm = newValue;
  console.log('Input value changed:', newValue +", " + this.formFields.startTm);
}
onEndDateChange(event: Event)
{

  // Get the new input value
  const newValue = (event.target as HTMLInputElement).value;
  // Perform actions based on the new value
  this.formFields.endDate = newValue;
  console.log('Input value changed:', newValue +", " + this.formFields.endDate);
}
onEndTimeChange(event: Event)
{

  // Get the new input value
  const newValue = (event.target as HTMLInputElement).value;
  // Perform actions based on the new value
  this.formFields.endTm = newValue;
  console.log('Input value changed:', newValue +", " + this.formFields.endTm);
}

exportData()
{
  let fileName = "DataExport-" + this.formFields.currentTransType   + "-" + this.formFields.startDate + "To" + this.formFields.endDate + ".csv"
  let data = ""

  this.dataTableLabel.forEach(element => {
    data +=element + ",";
  });
  data += "\n";

  this.dataSource.data.forEach(element => {
    this.dataTableKey.forEach(col => {

    let elementValue:string = element[col].toString();

    console.info("element: " + elementValue);

     if (elementValue !== null && elementValue !== '' && elementValue.indexOf(",") >= 0)
    {
      data +='"' + elementValue + '",';
    }
    else
    {
      data += elementValue + ",";
    }

    });

    data += "\n";

  });

  let param: string[] = [ data, fileName];
  const dialogRef = this.dialog.open(Modalx12Component, {
    width: '1700px',
    data: param
  });

}

// Handle right click

onContextMenu(event: MouseEvent, row:any, ind: number) {
  event.preventDefault();

  console.log( row.FileName +'. Row clicked: ' + row.ID );

  if (row.Status === 'Processed')
  {
     if(this.rightClickMenu.indexOf('WorkFlow') >= 0)
     {
        console.log('Remove WorkFlow from rightClickMenu: ' + this.rightClickMenu.indexOf('WorkFlow') );
        this.rightClickMenu.splice(this.rightClickMenu.indexOf('WorkFlow'),1);
     }
  }
  else
  {
    if(this.rightClickMenu.indexOf('WorkFlow') < 0)
     {
        this.rightClickMenu.push('WorkFlow');
     }
  }

  this.contextMenuPosition.x = event.clientX + 'px';
  this.contextMenuPosition.y = event.clientY + 'px';
  let item: Item ={rowId: row.ID, FileName: row.FileName, sessionId: row.SessionID, status: row.Status};
  this.contextMenu.menuData = { 'item': item };
  this.contextMenu.menu.focusFirstItem('mouse');
  this.contextMenu.openMenu();
}

handleContextMenu(item: Item, menu: string)  {

  console.log('handleContextMenu Item: ' + item.FileName +", " + item.sessionId +", Menu: " + menu + ", rowId: " + item.rowId);
  if (menu === 'WorkFlow')
   {

      this.storage.removeItem("currentTab");
      this.storage.setItem("currentTab", "Work Flow");

      const url = this.router.serializeUrl(this.router.createUrlTree(["/workflow/workflowDetails/"],
        {queryParams: { sessionID:  (item.sessionId), Status: item.status, mode:  this.formFields.mode, TransactionType: this.formFields.currentTransType} }
      ));
      console.log("Open in new tab URL: " + url);
          const newTab = window.open(url, '_blank');
          if(newTab) {
              newTab.opener = null;
          }
   }
   else if (menu.indexOf('X12') >= 0)
   {
    this.openX12Modal(item);
   }
   else if (menu === this.rightClickMenu[0])
   {
    this.onContextMenuSame(item)
   }
   else{
    this.onContextMenuNew(item)
   }
}

private openInX12Viewer(x12Text: string, fileName: string, sessionId?: string, status?: string): void {
  this.storage.removeItem('x12ViewerSeed');
  this.storage.setItem('x12ViewerSeed', {
    text: x12Text,
    fileName
  });
  localStorage.setItem('x12ViewerSeed', JSON.stringify({ text: x12Text, fileName }));
  this.storage.removeItem('currentTab');
  this.storage.setItem('currentTab', 'Utilities');
  const baseHref = document.querySelector('base')?.getAttribute('href') || '/';
  const normalizedBase = baseHref.endsWith('/') ? baseHref.slice(0, -1) : baseHref;
  const query = new URLSearchParams();
  if (sessionId) {
    query.set('sessionID', sessionId);
  }
  if (status) {
    query.set('Status', status);
  }
  if (this.formFields?.mode) {
    query.set('mode', this.formFields.mode);
  }
  if (this.formFields?.currentTransType) {
    query.set('TransactionType', this.formFields.currentTransType);
  }
  const queryString = query.toString();
  const targetUrl = `${normalizedBase}/x12-viewer${queryString ? '?' + queryString : ''}`;
  const newTab = window.open(targetUrl, '_blank');
  if (newTab) {
    newTab.opener = null;
  }
}


onContextMenuNew(item: Item) {
  console.log("Click on Action id: " + item.rowId);

  // Convert the object to a JSON string
  const jsonString = JSON.stringify(this.formFields);

    console.log(item.FileName);
    this.storage.removeItem("currentTab");
    this.storage.setItem("currentTab", "Transactions");

    this.sumUserFlds = "";
    this.paramsList.forEach( val => {
      this.sumUserFlds += val +";";
      console.log(val);
     });

    let additionalsearchString = "FileName='"+item.FileName +"'";

    this.sumUserFlds += ";sameWindow::false";

    // Store complex parameters in localStorage to keep URL clean and share across tabs
    localStorage.setItem('transactionNavData', JSON.stringify({
      transConfig: jsonString,
      transaction: this.form.controls.transType.value,
      mode: this.form.controls.mode.value,
      additionalSearch: additionalsearchString,
      sumUserFlds: this.sumUserFlds
    }));

    // Build URL with additionalSearch parameter to display filtered transaction list
    const relativeUrl = this.router.serializeUrl(this.router.createUrlTree(["/transaction/"],
      {queryParams: { ID: item.rowId, 'additionalSearch': additionalsearchString } }
    ));
    
    // Get base href to construct absolute URL for window.open
    const baseHref = document.querySelector('base')?.getAttribute('href') || '/';
    const absoluteUrl = window.location.origin + baseHref.replace(/\/$/, '') + relativeUrl;
    
    const newTab = window.open(absoluteUrl, '_blank');
    if(newTab) {
        newTab.opener = null;
    }



}

onContextMenuSame(item: Item) {

  this.sumUserFlds = "";
  this.storage.removeItem("currentTab");
  this.storage.setItem("currentTab", "Transactions");
  const jsonString = JSON.stringify(this.formFields);

  this.paramsList.forEach( val => {
    this.sumUserFlds += val +";";
   });
   let additionalsearchString = "FileName='"+item.FileName +"'";

   this.sumUserFlds += ";sameWindow::true";
   
   // Store complex parameters in localStorage for same-window navigation too
   localStorage.setItem('transactionNavData', JSON.stringify({
     transConfig: jsonString,
     transaction: this.form.controls.transType.value,
     mode: this.form.controls.mode.value,
     additionalSearch: additionalsearchString,
     sumUserFlds: this.sumUserFlds
   }));
   
   // Navigate with minimal URL params (ID and essential filters only)
   this.router.navigate(["/transaction"],
      {queryParams: { ID: item.rowId, 'additionalSearch': additionalsearchString } }
       );

}

  openX12Modal(item: Item) {

    console.info("openX12Modal: " + item.rowId + ", " + this.formFields.currentTransType +", " + this.form.controls.mode.value);

    this.SummaryService.fetchParentRecord(item.rowId.toString(), this.formFields.currentTransType, this.form.controls.mode.value).subscribe((res: any) =>
      {
      this.canRenderDetails = true;
      let val = ""

      if(res === "No data")
      {
        let param: string[] = [ "Not found", ""];
        const dialogRef = this.dialog.open(Modalx12Component, {
          width: '1700px',
          data: param
        });
      }

      else if (res.x12Data !== undefined && res.x12Data.indexOf('stored as a Stream') >= 0)
      {
            var stPos = 1;
            var moreData = 1;
            let letter = "";
            var maxSize = 3000000;
            var productIds: number[] = [0,1,2,3,4,5,6,7,8,9,10];

            from(productIds).pipe(
               concatMap(id =>  this.SummaryService.fetchX12Stream(item.rowId.toString(), this.formFields.currentTransType,
                this.form.controls.mode.value, id * maxSize + 1)), toArray()).subscribe(
                {next: (res: any) =>
              {
                console.info("Sequential calls completed. Total parts: " + res.length);
                var totSize = 0;
                for (let i = 0; i < res.length; i++) {
                  console.info("Part " + i + ": " + res[i][0].startPos + ", " + res[i][0].x12Len + " more: "  + res[i][0].moreData);
                  if (res[i][0].moreData > 0){
                    totSize += res[i][0].x12Len;
                    val = val + res[i][0].x12Data;
                  }
                  else if (res[i][0].x12Len > 0){
                    totSize += res[i][0].x12Len;
                    val = val + res[i][0].x12Data;
                  }
                  else
                  {
                    break;
                  }


                }
                console.info(" Final X12 length: " + totSize);
                val = val.replaceAll("~", "~\n")
              }, error: (error) => {
                  console.error('An error occurred:', error);
                },
                complete: () => {
                  console.log('All sequential calls completed.' );
                    if(val !== "")
                    {
                      this.openInX12Viewer(val, item.FileName, item.sessionId, item.status);

                    }

                }
              }) ;

      }
      else if (res.x12Data !== undefined && res.x12Data.length > 0 )
      {
        if (res.x12Data.length > 105)
        {
           let letter = res.x12Data.charAt(105);

           val = res.x12Data.replaceAll(letter, letter + "\n" )
            console.info("Split X12 with: " + letter);
         }
         else
         {
           val = res.x12Data
         }
      }
      else{
          val = res.x12Data.replaceAll("~", "~\n")
        }

      if(val !== "")
      {
        this.openInX12Viewer(val, item.FileName, item.sessionId, item.status);

      }
    });

  }

applyFilter(event: Event) {
  const filterValue = (event.target as HTMLInputElement).value;
  this.dataSource.filter = filterValue.trim().toLowerCase();

  if (this.dataSource.paginator) {
    this.dataSource.paginator.firstPage();
  }
}

onPaginateChange(event: any)
  {
    console.log("onPaginateChange: " + event.pageIndex +", pageSize: " + event.pageSize );

    this.dataPaginator.pageIndex =  event.pageIndex

    this.pageIndex =  this.dataPaginator.pageIndex;
    this.pageSize = this.dataPaginator.pageSize;

  }

}

export interface Item {
  FileName: string;
  rowId: number;
  sessionId: string;
  status?: string;
}

export interface customSearchStruct {
  key: string;
  label: string;
  transactionCode: string;
}
