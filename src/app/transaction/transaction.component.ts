import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';

import { FormBuilder, FormGroup, FormArray, FormControl, Validators, NgForm } from '@angular/forms';


import {TransRestServiceComponent} from '../services/transrest-service.component';
import { MatTableDataSource } from '@angular/material/table';
import {MatAccordion, MatExpansionModule} from '@angular/material/expansion';
import {MatRadioModule, MatRadioGroup} from '@angular/material/radio';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { Router, ActivatedRoute } from '@angular/router';
import {MatSelectModule,} from '@angular/material/select';
import {DisplayColumns} from './DisplayColumns'
import {SearchColumns} from './SearchColumns'

import {MatNativeDateModule} from '@angular/material/core';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatFormFieldModule} from '@angular/material/form-field';
import { MatMenu, MatMenuTrigger } from '@angular/material/menu';
import { MatSelect, MatSelectChange } from '@angular/material/select';
import { MatFormField } from '@angular/material/form-field';
import { catchError } from 'rxjs';
import { Modalx12Component } from './transaction-details/modal/modal-x12.component';
import { MatDialog } from '@angular/material/dialog';
import { DialogRef } from '@angular/cdk/dialog';
import { environment } from '../../environments/environment';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-transaction',
    templateUrl: './transaction.component.html',
    styleUrls: ['./transaction.component.css'],
    standalone: false
})



export class TransactionComponent implements OnInit, AfterViewInit {

  contextMenuPosition = { x: '0px', y: '0px' };
  @ViewChild(MatMenuTrigger)
  contextMenu: MatMenuTrigger;

  nowDt = new Date((new Date().getTime() - (24 * 60 * 60 * 1000)));


  paramsList: string[];

    maxCount = ["10", "25", "50", "100", "200"];
    dispositions = ["All", "Processed", "Rejected", "Validation failed"];

    rightClickMenu: string[] = ['Details in New Tab', 'Details in Same Window'] ;

   org = `${environment.org}`;

  transactionTypes: string[] ;
   pageLength= 25;
   pageIndex = 1;
   pageSize = 25;
   @ViewChild('dataPaginator') dataPaginator: MatPaginator;


   nyiColumns = [
    {
      item_id: 'N/A' ,
      item_text: 'Not Implemented'
    }];

     transSearchStructArr: customSearchStruct[] =[];


  loading:boolean = false;
  searchTransaction:boolean = false;

  public size = 5;
  public pageNumber = 0;
  form!: FormGroup;
  dataTableLabel: string[] = [];
  dataTableKey: string[] = [];
  canRenderDetails = false;
  showDirection = false;
  showMode = false;
  conditionColumns: string[] = ['=', '!=', '%StartsWith', 'Contains', 'LIKE', 'NOT LIKE'];

  dataSource = new MatTableDataSource<any>;

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  @ViewChild(MatSort) set matSort(sort: MatSort) {
    if (!this.dataSource.sort) {
      console.debug("Set sort in ViewChild")
      this.dataSource.sort = sort;
    }
  }

  transactionsFields= [
    {
      key: 'Invalid',
      type: 'text',
      label: 'Select Transaction to view the Columns',
      transactionCode: 'XXX',
    }];


  searchColumns= this.transactionsFields.slice();

  sub:any;

  selDropdownList = [];

  allDropdownList = [];

  selectedItems=[];

  usrSearchColumns: SearchColumns[] = [];
  usrDisplayColumns: DisplayColumns[] = [];

  formFields = {
      rowCnt: '',
      currentTransType: '',
      disposition: 'All',
      mode:'',
      direction: '',
      additional: '',
      startDate : "2023-01-12",
      endDate :"13:30",
      startTm : "13:30",
      endTm: "2023-01-12"
  }

  staticSearchStr = "";
  additionalSearchStr = "";
  transUserFlds = "";
  fileName:string="";


  constructor(private TransactionService: TransRestServiceComponent,
    private formBuilder: FormBuilder, private router: Router, private route: ActivatedRoute, public dialog: MatDialog){
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

  ngOnInit()
  {
    console.info("ngOnInit Transactions for " + this.org );

     if (this.org == 'SH')
    {
        this.transactionTypes = ["270", "271","276", "277", "277CA", "835", "837I", "837P", "837D", "999", "TA1"];
    }
   else
    {
        this.transactionTypes = [ "835", "837I", "837P", "837D", "999", "277CA", "TA1"];
    }
    this.formFields.currentTransType = '';

    sessionStorage.removeItem("currentTab")
    sessionStorage.setItem("currentTab", "Transactions")


    this.form = this.formBuilder.group({
      rowCnt:['25', Validators.required],
      transType: ['', Validators.required],
      disposition: ['All', Validators.required],
      mode:['RealTime', Validators.required],
      direction:['Inbound'],
      additional:this.formBuilder.array([this.createinitForm()])
    });

    let stDt = 1;

    this.sub = this.route.queryParams.subscribe(params => {

      if(params !== undefined)
      {
          // From Summary Tab
          if(params['transConfig'] !== undefined )
          {
            // Defaults to '' if no query param provided.
            let jsonString = params['transConfig']
            if (jsonString !== null)
            {
              console.info("TransConfig from queryParams: " + jsonString);
              this.formFields = JSON.parse(jsonString);
              console.info('Parsed Object:', this.formFields);
            }
            else
            {
              this.formFields.currentTransType =  params['transaction'] || '';
              this.transUserFlds = params['transUserFlds'];
            }
            this.additionalSearchStr = params['additionalSearch'] || '';
            console.info("Query params, additionalSearchStr: " + this.additionalSearchStr +", " + this.formFields.currentTransType +", " + this.transUserFlds)

            let fInd = this.additionalSearchStr.indexOf("FileName=") + "FileName=".length;
              let val = this.additionalSearchStr.substring( fInd)
              console.log(fInd + ". FileName:" + val )
              this.fileName = val

          }

      }
    });

    if(this.formFields.currentTransType === '')
    {
        // Set in Search
        if(sessionStorage.getItem('transConfig') !== undefined && sessionStorage.getItem('transConfig') !== null)
        {
          // Defaults to '' if no query param provided.

          let jsonString = sessionStorage.getItem('transConfig')
          console.info("transConfig from sessionStorage: " + jsonString);
          this.formFields = JSON.parse(jsonString);
          let nowDt = new Date(new Date().getTime());
          let tmVal = ((nowDt.getHours()< 10)? "0"+ nowDt.getHours() : "" + nowDt.getHours()) + ":" ;
          tmVal += (nowDt.getMinutes() < 10)? "0"+ nowDt.getMinutes(): "" + nowDt.getMinutes(); // "13:30";
          this.formFields.endTm= tmVal
        }

    }

    if(this.formFields.currentTransType === '')
    {

      console.log('sessionStorage UserConfig: ' + sessionStorage.getItem('UserConfig'))
      if (sessionStorage.getItem('UserConfig') !== undefined && sessionStorage.getItem('UserConfig') !== null)
      {
        let parsedObject = JSON.parse(sessionStorage.getItem('UserConfig'));

        console.info("Init from session UserConfig: " + parsedObject.TranType +", " + parsedObject.DispCnt +", " + parsedObject.Mode);


        this.formFields.currentTransType = parsedObject.TranType;
        this.formFields.mode = parsedObject.Mode
        this.formFields.rowCnt = parsedObject.DispCnt;

        this.form.controls.transType.setValue(this.formFields.currentTransType);
        this.form.controls.rowCnt.setValue(this.formFields.rowCnt);
        this.form.controls.mode.setValue(this.formFields.mode);

        this.pageSize = parsedObject.DispCnt;
        let stDtStr = parsedObject.TranTime;

        // Format: Last 90 days

        if(stDtStr.toString().indexOf('7') > 1)
          {
            stDt = 7
          }
          else if(stDtStr.toString().indexOf('30') > 1)
          {
            stDt = 30
          }
          else if(stDtStr.toString().indexOf('90') > 1)
          {
            stDt = 90
          }
          else if(stDtStr.toString().indexOf('365') > 1)
          {
            stDt = 365
          }
          console.info("Init from session: " +  this.formFields.currentTransType + ", Search from " + stDt + " days. " + stDtStr)
      }


     console.info('Set valid date time')
      this.nowDt = new Date((new Date().getTime() - (stDt * 24 * 60 * 60 * 1000)));
      let mm= (this.nowDt.getMonth() < 9)? "0"+(this.nowDt.getMonth() + 1): this.nowDt.getMonth() + 1;
      let dt= (this.nowDt.getDate() < 10)? "0"+this.nowDt.getDate(): this.nowDt.getDate();
      this.formFields.startDate = this.nowDt.getFullYear() +"-" + mm +"-" + dt; //  "2023-01-12"; // new Date();
      let tmVal = ((this.nowDt.getHours()< 10)? "0"+ this.nowDt.getHours() : "" + this.nowDt.getHours()) + ":" ;

      tmVal += (this.nowDt.getMinutes() < 10)? "0"+ this.nowDt.getMinutes(): "" + this.nowDt.getMinutes(); // "13:30";
      this.formFields.startTm = tmVal
      console.info("Start Time: " + this.formFields.startDate + ", " + this.formFields.startTm);


      this.nowDt = new Date(new Date().getTime());
      mm= (this.nowDt.getMonth() < 9)? "0"+(this.nowDt.getMonth() + 1): this.nowDt.getMonth() + 1;
      dt= (this.nowDt.getDate() < 10)? "0" + this.nowDt.getDate(): this.nowDt.getDate();
      this.formFields.endDate =this.nowDt.getFullYear() +"-" + mm +"-" + dt;
      this.formFields.endTm= tmVal
      console.info("End Time: " + this.formFields.endDate + ", " + this.formFields.endTm);
    }

    this.form.controls.mode.setValue(this.formFields.mode)
    this.form.controls.transType.setValue(this.formFields.currentTransType)
    this.form.controls.disposition.setValue(this.formFields.disposition)
    this.form.controls.rowCnt.setValue(this.formFields.rowCnt);


    if (this.formFields.currentTransType !== '')
    {
        this.updateCustomFlds()

        this.searchTransaction = true;
    }
    else{
        this.clearSearch();
    }



    this.TransactionService.fetchTransactionFields().subscribe((res: any) => {
    this.transactionsFields = [];

      for (var item of res)
      {
        // console.info("Push transactionsSearchColumns: " + item.Key)
          this.transactionsFields.push({key: item.Key, type: item.Type, label: item.TransactionLabel, transactionCode: item.TransactionCode});
      }
      console.info("transactions Fields: " + this.transactionsFields.length);
      console.info("Init Usr Columns: " + this.usrDisplayColumns.length);

      this.TransactionService.fetchDisplayColumns("Default", "Transactions").subscribe((res: any) => {
        this.usrDisplayColumns.splice(0, this.usrDisplayColumns.length)
        this.usrDisplayColumns.push(...res);

        console.info("User display columns from fetchDisplayColumns: " + this.usrDisplayColumns.length);
        this.TransactionService.fetchSearchColumns("Default", "Transactions").subscribe((res: any) => {
          this.usrSearchColumns.splice(0, this.usrSearchColumns.length)
          this.usrSearchColumns.push(...res);
          console.info("User search columns from fetchSearchColumns: " + this.usrSearchColumns.length);

          if(this.formFields.currentTransType !== '')
            {

            this.transactionChange(this.formFields.currentTransType);

            console.info('Transaction search for: ' + this.formFields.currentTransType);
            // this.onSearchTransactions();
            }
            else
            {
              this.transactionChange(this.transactionTypes[0])
            }


        });


      });

    });
    if (!this.dataSource.sort) {
      console.debug("Set sort in ngInit")
      this.dataSource.sort = this.sort;
    }


  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    // this.dataSource.sort = this.sort;

  }
  get f() { return this.form.controls; }

  onSearchTransactions()
    {
      this.canRenderDetails = false;
      this.paramsList = [];
      this.paramsList.push("mode::" + this.form.controls.mode.value);
      this.paramsList.push("transaction::"+this.form.controls.transType.value);
      this.paramsList.push("status::"+this.form.controls.disposition.value );

      this.paramsList.push("startDtTm::" + this.formFields.startDate+" " +this.formFields.startTm );
      this.paramsList.push("endDtTm::" + this.formFields.endDate+" " +this.formFields.endTm );
      this.paramsList.push("count::" + this.form.controls.rowCnt.value);


      console.info("onSearchTransactions count: " +this.form.controls.rowCnt.value)
      console.info("SearchTransactions Mode# " +  this.form.controls.mode.value + ", " + this.form.controls.transType.value + ", " + this.form.controls.disposition.value );
      console.info("SearchTransactions Start# " +  this.formFields.startDate + ", " + this.formFields.startTm );
      console.info("SearchTransactions End# " +  this.formFields.endDate  + ", " + this.formFields.endTm );

      if (this.form.controls.transType.value === '' && this.formFields.currentTransType !== '')
      {
        this.form.controls.transType.setValue(this.formFields.currentTransType);
      }


      this.loading = true;
      const formArr = this.form.get('additional') as FormArray;



      if (this.additionalSearchStr === '')
      {
        this.staticSearchStr = ""

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
                  let fldVal = fGrp.controls.newFldValue.value;
                  console.info("transSearchStructArr " + ind + ": " + val.transactionCode +", " + val.label + ", " + val.key + " = '" + fldVal + "'")

                  if (val.key.toUpperCase().indexOf('DATE') >= 0 && fldVal.indexOf('-') >= 0)
                  {
                    fldVal = fldVal.replaceAll('-','');
                  }

                  if (fldVal.indexOf('%') >= 0 )
                  {
                      this.staticSearchStr += " AND " + val.key + " LIKE '" + fldVal + "'"
                  }
                  else
                  {
                    this.staticSearchStr += " AND " + val.key + "='" + fldVal + "'"
                  }
                }
            };


          }
        }
      }
      else
      {
        console.info("Set controls with values from " + this.additionalSearchStr);
        this.staticSearchStr = this.additionalSearchStr
        for(let i=0;i< formArr.length;i++)
          {
            let fGrp = formArr.at(i) as FormGroup

             for (let [ind, val] of this.transSearchStructArr.entries()) {

              if (this.additionalSearchStr.indexOf(val.key) >= 0
                 && val.label ===  fGrp.controls.fld.value
                 && val.transactionCode === this.form.controls.transType.value)
              {
                let usrVal =  this.staticSearchStr.substring(this.staticSearchStr.indexOf("=") + 1)
                console.info('transSearchStructArr Set: '+ val.transactionCode +", " + val.key + " = '" + usrVal + "', " + val.label);

                fGrp.controls.newFldValue.setValue(usrVal.replaceAll("'",""));
                break;
              }
             }



          }
      }

      if(this.staticSearchStr.length > 3)
      {
        this.staticSearchStr = this.staticSearchStr.replace('AND','') // Remove first AND
        this.staticSearchStr = this.staticSearchStr.replaceAll('%','%25') //send a literal '%' character, it needs to be encoded as %25.%
          this.paramsList.push("sql::" + this.staticSearchStr);
      }

      this.transUserFlds = "";
      this.paramsList.forEach( val => {
        this.transUserFlds += val +";";
       });

      sessionStorage.setItem("transUserFlds", this.transUserFlds)
      const jsonString = JSON.stringify(this.formFields);
      sessionStorage.setItem("transConfig", jsonString);


      if(this.form.controls.transType.value === '270')
      {

            this.TransactionService.fetchEligibilityRequests(this.form.controls.mode.value, this.paramsList).subscribe((res: any) => {

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

        this.TransactionService.fetchEligibilityBenefitResponses(this.form.controls.mode.value, this.paramsList).subscribe((res: any) => {
         this.dataSource.data = res;
         this.dataSource.sort = this.sort;
         this.canRenderDetails = true;
         this.loading = false;
         console.info("EligibilityBenefitResponses array: " + this.dataSource.data.length);
        });

      }

      else if(this.form.controls.transType.value === '835'){


        console.info("835 search: "+ this.staticSearchStr );


        this.TransactionService.fetchClaimPayment(this.form.controls.mode.value, this.paramsList).subscribe((res: any) => {
         this.dataSource.data = res;
         this.dataSource.sort = this.sort;
         this.canRenderDetails = true;
         this.loading = false;
         console.info("ClaimPayment array: " + this.dataSource.data.length);
        });

      }
      else if(this.form.controls.transType.value === '837P'){

        console.info("837P search: "+ this.staticSearchStr );

          this.paramsList.push("addSql::" + "VersionReleaseIndustryIdenti='005010X222A1' ");

         this.TransactionService.fetchClaims(this.form.controls.mode.value, this.paramsList).subscribe((res: any) => {
          this.dataSource.data = res;
          this.dataSource.sort = this.sort;
          this.canRenderDetails = true;
          this.loading = false;
          console.info("Claims array: " + this.dataSource.data.length);

         });

       }

       else if(this.form.controls.transType.value === '837I'){

        this.paramsList.push("addSql::" + "VersionReleaseIndustryIdenti='005010X223A2' ")
        this.TransactionService.fetchClaims(this.form.controls.mode.value, this.paramsList).subscribe((res: any) => {
         this.dataSource.data = res;
         this.dataSource.sort = this.sort;
         this.canRenderDetails = true;
         this.loading = false;
         console.info("Claims array: " + this.dataSource.data.length);
        });

      }
      else if(this.form.controls.transType.value === '837D'){

        this.paramsList.push("addSql::" + "VersionReleaseIndustryIdenti='005010X224A2' ")
        this.TransactionService.fetchClaims(this.form.controls.mode.value, this.paramsList).subscribe((res: any) => {
         this.dataSource.data = res;
         this.dataSource.sort = this.sort;
         this.canRenderDetails = true;
         this.loading = false;
         console.info("Claims array: " + this.dataSource.data.length);

        });

      }
      else if(this.form.controls.transType.value === '276'){

        this.TransactionService.fetchClaimStatusReq(this.form.controls.mode.value, this.paramsList).subscribe((res: any) => {
          console.info("Service array: " + res.length);
         this.dataSource.data = res;
         this.dataSource.sort = this.sort;
         this.canRenderDetails = true;
         this.loading = false;
         console.info("Claim Status  Req array: " + this.dataSource.data.length);

        }
    );

      }
       else if(this.form.controls.transType.value === '277'){

         this.TransactionService.fetchClaimStatusResp(this.form.controls.mode.value, this.paramsList).subscribe((res: any) => {
          this.dataSource.data = res;
          this.dataSource.sort = this.sort;
          this.canRenderDetails = true;
          this.loading = false;
          console.info("Claim Status Resp array: " + this.dataSource.data.length);

         });

       }
       else if(this.form.controls.transType.value === '277CA'){

        this.TransactionService.fetchClaimAcknowledgment(this.form.controls.mode.value, this.paramsList).subscribe((res: any) => {
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

        this.TransactionService.fetchImplementationAcknowledgment(this.form.controls.mode.value, this.paramsList).subscribe((res: any) => {
         this.dataSource.data = res;
         this.dataSource.sort = this.sort;
         this.canRenderDetails = true;
         this.loading = false;
         console.info("Implementation Acknowledgment array: " + this.dataSource.data.length);

        });

      }
      else if(this.form.controls.transType.value === 'TA1'){

        this.TransactionService.fetchTA1(this.form.controls.mode.value, this.paramsList).subscribe((res: any) => {
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
        this.dataSource.paginator = this.paginator
}

clearSearch()
    {
      this.canRenderDetails = false;
      this.searchTransaction = false;

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

private updateCustomFlds() {

  const formArr = this.form.get('additional') as FormArray


  if (formArr.length >= 1) {
    for(let i=0;i< formArr.length;i++)
    {
      let fGrp = formArr.at(i) as FormGroup



      for (let [ind, val] of this.transSearchStructArr.entries()) {

        console.info("Search values: " + ind + ": " + val.key + ", " + val.label + ", " + val.transactionCode +", " + this.form.controls.transType.value )

        if(fGrp.controls.fld.value === val.label && val.key === 'FileName')
          {
            fGrp.controls.newFldValue.setValue(this.fileName.replaceAll("'", ""));
            console.info("transSearchStructArr updateCustomFlds: " + ind + ": " + val.key + ", " + fGrp.controls.newFldValue.value)
          }
      };



    }
  }

  }

private readCustomFlds() {

  const formArr = this.form.get('additional') as FormArray

  if (formArr.length >= 1) {
    for(let i=0;i< formArr.length;i++)
    {
      let fGrp = formArr.at(i) as FormGroup
       console.info("readCustomFlds: " + fGrp.controls.fld.value +"= " + fGrp.controls.newFldValue.value)
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
  console.info("In transactionChange: currentTransType: " + this.formFields.currentTransType)
  this.additionalSearchStr = ''
  if(this.form.controls.transType.value !== this.formFields.currentTransType &&
    this.form.controls.mode.value !== this.formFields.mode)
  {
    this.clearSearch();
  }
  this.formFields.currentTransType = this.form.controls.transType.value;
  this.formFields.mode = this.form.controls.mode.value;

  this.readCustomFlds();

  this.clearCustomFlds();

  var tranType:string = this.form.controls.transType.value
  console.info("Search " + tranType + " in transactionsFields " + this.transactionsFields.length)
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

  for (var col of this.transactionsFields)
  {

    if ( col.transactionCode === this.form.controls.transType.value)
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

      for (var col of this.transactionsFields)
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
    for (var col of this.transactionsFields)
    {


      if ( col.transactionCode === this.form.controls.transType.value)
      {
          console.info(col.transactionCode + " PUSH " + col.key)

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

  this.transSearchStructArr =[];


  this.usrSearchColumns.forEach(element => {
    if(element.TransactionCode === this.form.controls.transType.value && element.Mode === this.form.controls.mode.value)
    {

        for (let tran of this.transactionsFields){
        {
          if(tran.key == element.key && tran.transactionCode === this.form.controls.transType.value)
          {
            console.info("Push transSearchStructArr: " + tran.label + ": " + element.key +", " + element.TransactionCode +", " + element.Mode);
            formArr.push(this.createCustomFlds(tran.label));

            this.transSearchStructArr.push({label: tran.label, key: element.key, transactionCode: element.TransactionCode});
            break;
          }

        }

      }
      this.updateCustomFlds()
    }
  });
  this.onSearchTransactions();


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

    if (element.indexOf(",") >= 0)
    {
      data +='"' + element + '",';
    }
    else
    {
      data +=element + ",";
    }
  });
  data += "\n";
  console.info("file header: " + data);

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

  console.log( ind +'. Row clicked: ' + row.ID +", " + row.FileName);

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
  let item: Item ={ID: row.ID, rowId: ind, sessionId: row.SessionID};
  this.contextMenu.menuData = { 'item': item };
  this.contextMenu.menu.focusFirstItem('mouse');
  this.contextMenu.openMenu();
}


handleContextMenu(item: Item, menu: string)  {
  console.log('Click on Action 2 ' + item.ID +", " + menu);

  this.transUserFlds = "";
  this.paramsList.forEach( val => {
    this.transUserFlds += val +";";
   });
   const jsonString = JSON.stringify(this.formFields);
   if (menu === 'WorkFlow')
   {
      console.log('Item: ' + item.ID +", " + item.sessionId );
      sessionStorage.removeItem("currentTab")
      sessionStorage.setItem("currentTab", "Work Flow");

      const url = this.router.serializeUrl(this.router.createUrlTree([ `${environment.org}` + "/workflow/workflowDetails/"],
         {queryParams: { sessionID:  (item.sessionId),  mode:  this.formFields.mode , TransactionType: this.formFields.currentTransType } }
      ));
      console.log("Details in new tab URL: " + url);
          const newTab = window.open(url, '_blank');
          if(newTab) {
              newTab.opener = null;
          }


   }
   else if (menu === 'Details in Same Window')
   {
      this.transUserFlds += ";sameWindow::true";

      this.router.navigate(["/transaction/transaction-details/"],
      {queryParams: { ID:  item.ID, 'transConfig': jsonString,
         'transaction': this.form.controls.transType.value,
         'additionalSearch': this.staticSearchStr,
         'searchTypeString': this.transUserFlds } }
       );
      }
      else
      {
        this.transUserFlds += ";sameWindow::false";

        const jsonString = JSON.stringify(this.formFields);

            const url = this.router.serializeUrl(this.router.createUrlTree([ `${environment.org}` + "/transaction/transaction-details/"],
            {queryParams: { ID:  item.ID, 'transaction': this.form.controls.transType.value,
              'additionalSearch': this.staticSearchStr, 'searchTypeString': this.transUserFlds } }
            ));
            console.log("Details in new tab URL: " + url);
          const newTab = window.open(url, '_blank');
          if(newTab) {
              newTab.opener = null;
          }
      }

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
  ID: number;
  rowId: number;
  sessionId: string;
}

export interface customSearchStruct {
  key: string;
  label: string;
  transactionCode: string;
}

