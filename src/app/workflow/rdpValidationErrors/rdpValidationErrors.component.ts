import { Component, OnInit, Input, Output, AfterViewInit, ViewChild, ElementRef } from '@angular/core';

import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';


import {WfRestServiceComponent} from '../../services/wfrest-service.component';

import { MatTable,  MatTableDataSource } from '@angular/material/table';


import { Router, ActivatedRoute } from '@angular/router';
import {SelectionModel} from '@angular/cdk/collections';
import { BrowserModule } from '@angular/platform-browser';
import { MatPaginator } from '@angular/material/paginator';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import {RdpX12Error, x12err} from './rdpValidationErrors';
import { Console } from 'node:console';
import { Modalx12Component } from '../../transaction/transaction-details/modal/modal-x12.component';
import { MatDialog } from '@angular/material/dialog';
import { DialogRef } from '@angular/cdk/dialog';

@Component({
    selector: 'app-workflowDetails',
    templateUrl: './rdpValidationErrors.component.html',
    styleUrls: ['./rdpValidationErrors.component.css'],
    standalone: false
})



export class RdpValidationErrorsComponent implements OnInit {
  displayLabel: string = "Display columns:";
  statusTypes = [
    "Assigned",
    "Resolved",
    "Ignored"
  ];

  form!: FormGroup;



  @ViewChild("statusType") statusType: ElementRef;

 // @ViewChild('dataTable') dataTable!: MatTable<any>;
 // @ViewChild('errorTable') errorTable!: MatTable<any>;

  statusTypeString = "";
  wfStatus: string = "";
  transTypeStr = '';
  wfMode = '';
  errorTypeStr = '';
  submitted = false;
  rowClicked:number;
  separator:string;
  dataError:boolean;

  tpId:string="";
  tpRelId:string="";

  canRenderDetails = false;
  dataSource = new MatTableDataSource<any>();
  errorDataSource = new MatTableDataSource<any>();

  @ViewChild('dataPaginator') dataPaginator: MatPaginator;
  pageLength= 25;
  pageIndex = 1;
  pageSize = 25;

  @ViewChild('errorPaginator') errorPaginator: MatPaginator;
  totalErrRecords = 0;
  errPageSize = 5;
  errPageIndex = 0;

  checked = false;
  wfInfo:string = "";
  errorStr:string = "";

  errorSegmentText:string = "";


  dataTableLabel:string[] =  ['#', 'X12 Data', 'Error'];
  dataTableKey: string[] = ['LineNum',  'Data',  'Error'];

  errDataTableLabel:string[] =  ['#', 'Line #', 'Segment','Error'];

  errDataTableKey: string[] = [
    'Num', 'LineNum', 'Segment', 'Error'
  ]

  isEdit: boolean = false;
  isSelected: boolean = true;

  sub:any;

  tpCreate:boolean = false;

  ID:string = "";
  TransactionType:string = "";
  fileName:string;
  selectedRow: number = -1;
  errSelectedRow: number = -1;

  searchParams:string;

  x12Array: any[] = [{LineNum:'0',  'Data': 'X12', Error:'1/1' }];

  errArray:x12err[] = [];

  x12Data:string;
  sessionID:string = "";
  selection = new SelectionModel<RdpX12Error>(false, []);


  constructor(private WfService: WfRestServiceComponent,
    private formBuilder: FormBuilder, private router: Router, private route: ActivatedRoute, public dialog: MatDialog){
      tpId: new FormControl();

  }


  ngAfterViewInit() {
    this.dataSource.paginator = this.dataPaginator;
    this.errorDataSource.paginator = this.errorPaginator;
    console.info("In ngAfterViewInit")
  }

  ngOnInit() {
    console.info("ngOnInit");
    this.setupSessionTab();
    this.initForm();
    this.handleQueryParams();
  }

  /**
   * Remove and set the current tab in session storage.
   */
  private setupSessionTab() {
    sessionStorage.removeItem("currentTab");
    sessionStorage.setItem("currentTab", "Work Flow");
  }

  /**
   * Initialize the reactive form and set default status type.
   */
  private initForm() {
    this.form = this.formBuilder.group({
      statusType: ['', Validators.required]
    });
    this.form.controls.statusType.setValue(this.statusTypes[0]);
    this.wfStatus = this.statusTypes[0];
  }

  /**
   * Subscribe to query params and handle workflow initialization.
   */
  private handleQueryParams() {
    this.sub = this.route.queryParams.subscribe(searchParams => {
      if (searchParams['sessionID'] !== undefined && searchParams['sessionID'] !== null) {
        this.handleSessionIdParams(searchParams);
      } else {
        this.handleDefaultParams(searchParams);
      }
    });
  }

  /**
   * Handle initialization when sessionID is present in query params.
   */
  private handleSessionIdParams(searchParams: any) {
    this.sessionID = searchParams['sessionID'];
    this.TransactionType = searchParams['TransactionType'];
    console.log("sessionID query sessionID provided!" + this.sessionID + ", FileName: " + searchParams['searchParams'] + ", TransactionType: " + this.TransactionType);
    this.fileName = searchParams['searchParams'];
    this.wfMode = searchParams['mode'];
    this.getX12('ID=&SessionID=' + this.sessionID);
  }

  /**
   * Handle initialization when sessionID is not present in query params.
   */
  private handleDefaultParams(searchParams: any) {
    // Defaults to 0 if no query param provided.
    this.ID = '' + searchParams['ID'] || '0';
    this.TransactionType = searchParams['TransactionType'];
    this.searchParams = searchParams['searchParams'];

    // Extract status, mode, and transaction type from searchParams string
    this.wfStatus = this.extractParam(this.searchParams, "status::");
    this.wfMode = this.extractParam(this.searchParams, "mode::");
    this.transTypeStr = this.extractParam(this.searchParams, "transaction::");

    console.log('Query params ID: ', this.ID + ', params: ' + this.searchParams);
    this.getX12("ID=" + this.ID + '&SessionID=');
  }

  /**
   * Helper to extract a value from a semicolon-delimited param string.
   */
  private extractParam(paramStr: string, key: string): string {
    const fInd = paramStr.indexOf(key) + key.length;
    if (fInd < key.length) return '';
    const endInd = paramStr.indexOf(";", fInd);
    if (endInd === -1) return paramStr.substring(fInd);
    return paramStr.substring(fInd, endInd);
  }
  get f() { return this.form.controls; }

  statusTypeChange(evt: any)
{
  console.info("statusTypeChange: " + this.form.controls.statusType.value)
  this.wfStatus = this.form.controls.statusType.value
}


  getX12(searchStr: string = "") {
    this.canRenderDetails = false;
    searchStr = this.buildX12SearchString();
    console.log("Call service for " + searchStr);
    this.WfService.fetchRdpCrytalEntries(this.wfMode, searchStr).subscribe((res: any) => {
      console.log("Call to get RDP Crystal Entries, count: " + Object.keys(res).length);
      this.processX12Response(res);
    });
  }

  /**
   * Build the search string for fetching X12 data.
   */
  private buildX12SearchString(): string {
    return (
      "ID=&X12DataId=&SessionID=" + this.sessionID +
      "&WFID=" + this.ID +
      "&TransactionType=" + this.TransactionType
    );
  }

  /**
   * Process the response from fetchRdpCrytalEntries and update component state.
   */
  private processX12Response(res: any) {
    if (!res || !res[0] || !res[0].X12) {
      this.canRenderDetails = true;
      return;
    }
    // Parse X12 data and error info
    const x12DataLns = res[0].X12.split(String(res[0].X12).substr(105, 1));
    this.separator = res[0].X12.substr(3, 1);
    console.log("Sep: " + this.separator);
    const wfErr = String(res[0].Error).replaceAll(";", "\n");
    this.handleTPNotFound(wfErr);
    this.x12Array.splice(0, this.x12Array.length);
    this.errArray.splice(0, this.errArray.length);
    let lenNum = 0;
    let segEle = "";
    this.selectedRow = -1;
    let errFound: boolean = false;
    x12DataLns.forEach((item, index) => {
      lenNum++;
      let err = '';
      let ind = 1;
      segEle = '';
      // Error details
      for (ind = 1; ind < res.length; ind++) {
        if (lenNum == res[ind].LineNum) {
          segEle = "Loop: " + res[ind].Loop + ", " + res[ind].Segment + "/" + res[ind].Element;
          err = segEle + ": " + res[ind].ErrorDesc + "(" + res[ind].ErrorCode + ")";
          if (this.selectedRow === -1 && err !== '') {
            this.selectedRow = index + 1;
          }
          break;
        }
      }
      if (item !== '') {
        if (err !== '') {
          this.errArray.push({
            'Num': '' + ind,
            'LineNum': '' + lenNum,
            'Segment': res[ind]?.Segment ?? '-',
            'Element': res[ind]?.Element ?? '-',
            'Error': err
          });
        }
        if (this.checked) {
          if (err !== '') {
            this.x12Array.push({ 'LineNum': '' + lenNum, 'Data': item, Error: err });
            errFound = true;
          }
        } else {
          this.x12Array.push({ 'LineNum': '' + lenNum, 'Data': item, Error: err });
        }
      }
    });
    this.updateErrorInfo(wfErr, res);
    if (!errFound) {
      this.selectedRow = 0;
    }
    this.dataSource.data = this.x12Array;
    this.errorDataSource.data = this.errArray;
    this.totalErrRecords = this.errorDataSource.data.length;
    this.canRenderDetails = true;
    this.removeCurrentStatusFromTypes();
    this.updateDataErrorState();
  }

  /**
   * Handle TP Not found and Relation Not found errors.
   */
  private handleTPNotFound(wfErr: string) {
    let tpInd = wfErr.indexOf("TP Not found:");
    if (tpInd >= 0) {
      this.tpCreate = true;
      this.tpId = wfErr.substring(tpInd + "TP Not found:".length).trim();
      if (this.tpId.indexOf("TP Not found:") >= 0) {
        this.tpId = this.tpId.substring(0, this.tpId.indexOf("TP Not found:")).trim();
      }
    }
    tpInd = wfErr.indexOf("Relation Not found:");
    if (tpInd >= 0) {
      this.tpCreate = true;
      this.tpRelId = wfErr.substring(tpInd + "TRelation Not found:".length).trim();
    }
  }

  /**
   * Update workflow and error info strings.
   */
  private updateErrorInfo(wfErr: string, res: any) {
    if (this.errArray.length > 0) {
      this.errorStr += "Number of errors: " + this.errArray.length + ", ";
    }
    if (this.fileName == undefined || this.fileName == null || this.fileName == '') {
      this.wfInfo = "Workflow ID: " + this.ID + ", Filename:" + res[0].Filename;
      this.errorStr += wfErr + ", WF Status: " + this.wfStatus;
    } else {
      this.wfInfo = "Workflow ID: " + this.ID + ", Filename:" + this.fileName;
      this.errorStr += wfErr + ", WF Status: " + this.wfStatus;
    }
  }

  /**
   * Remove the current status from the statusTypes array.
   */
  private removeCurrentStatusFromTypes() {
    const index = this.statusTypes.indexOf(this.wfStatus);
    if (index > -1) {
      this.statusTypes.splice(index, 1);
    }
  }

  /**
   * Update the dataError state and ensure errorDataSource is not empty.
   */
  private updateDataErrorState() {
    if (this.errArray.length > 0) {
      this.dataError = true;
    } else {
      this.dataError = false;
      this.errArray.push({ 'Num': '1', 'LineNum': '1', 'Segment': '-', 'Element': '-', 'Error': "-" });
      this.errorDataSource.data = this.errArray;
    }
  }


 exportX12()
    {
      let x12Data ="";
      if(this.x12Array !== null && this.x12Array.length > 0)
      {
        this.x12Array.forEach(element => {
           x12Data += element.Data + "~" ;
        });


        let param: string[] = [ x12Data, "WF" + this.ID + "-X12.txt", '' + " X12 Data, ID(" + this.ID + "), Size:" + x12Data.length  ];
        const dialogRef = this.dialog.open(Modalx12Component, {
          width: '1700px',
          data: param
        });

        dialogRef.afterClosed().subscribe(result => {
          console.log('The dialog closed');
        });

      }
    }



 updateWF()
 {

  console.info("Update WorkFlowItem ID: " +this.ID +",  status: " +  this.wfStatus)
  if (this.wfStatus !== '')
  {
    let paramsList: string[]= [];

    paramsList.push("ID::" + this.ID);
    paramsList.push("Status::" +  this.wfStatus);
    paramsList.push("AssignedUser::" + "");

    this.WfService.updateWorkFlowItem(this.wfMode, paramsList).subscribe((res: any) => {
      this.dataSource.data = res;
      this.canRenderDetails = true;

      console.info("WorkFlowItems array: " + this.dataSource.data.length +", " + this.dataTableKey[1] +", " + this.dataTableLabel[1]);
      if (this.wfStatus !== 'Assigned')
      {
         this.toWorkFlow();
      }
    });
  }

 }

 clickChkBox()
 {
  this.checked = !this.checked;
  this.getX12("ID=" + this.ID +'&SessionID=');
 }


 toTpCreate()
  {

      console.log('To TP create: ' + this.tpId +", " + this.tpRelId  );

      if (this.tpId !== "")
      {
        sessionStorage.setItem("TpOperation", "tp-add");
        sessionStorage.setItem("NewTpId", this.tpId);
      }
      if (this.tpRelId !== "")
      {
        if (sessionStorage.getItem("TpOperation") == null || sessionStorage.getItem("TpOperation") == "")
        {
            sessionStorage.setItem("TpOperation", "tpLink-add");
        }
        else{
            sessionStorage.setItem("TpOperation", "tp-add;tpLink-add");
        }
        sessionStorage.setItem("NewTpRelId", this.tpRelId);
      }


      sessionStorage.removeItem("currentTab")
      sessionStorage.setItem("currentTab", "Trading Partners");

      this.router.navigate(["/TradingPartners"]);
  }

  toWorkFlow()
  {

      console.log('To WorkFlow: ' );
      this.router.navigate(["/workflow/"],

      {
        queryParams: {'searchParams': this.searchParams }
    }

       );
  }
  SelectNextError(lnNum:string)
  {
   for(var ind=this.selectedRow+1; ind < this.x12Array.length; ind++){
      if(this.x12Array[ind].Error != '' && this.x12Array[ind].LineNum == lnNum )
      {
          this.selectedRow = ind+1;

          this.dataPaginator.pageIndex = Math.floor(this.selectedRow / this.dataPaginator.pageSize)

          if (this.selectedRow % this.dataPaginator.pageSize == 0)
          {
            this.dataPaginator.pageIndex--
          }

          console.log("Next Found row " + this.selectedRow +", pageIndex: " + this.dataPaginator.pageIndex)

          this.pageIndex =  this.dataPaginator.pageIndex;


          break;

      }
   }
  }

  SelectPrevError(lnNum:string)
  {
   for(var ind=this.selectedRow-2; ind > 0 ; ind--){
      if(this.x12Array[ind].Error != ''  && this.x12Array[ind].LineNum == lnNum )
      {
          this.selectedRow = ind+1;

          this.dataPaginator.pageIndex =  Math.floor(this.selectedRow / this.dataPaginator.pageSize)
          this.pageIndex =  this.dataPaginator.pageIndex;
          if (this.selectedRow % this.dataPaginator.pageSize == 0)
            {
              this.dataPaginator.pageIndex--
            }


          console.log("Prev Found row " + this.selectedRow +", pageIndex: " + this.dataPaginator.pageIndex)
          break;

      }
   }

  }

  onErrPaginateChange(event: any) {
    this.errPageIndex = event.pageIndex;
    this.errPageSize = event.pageSize;
    this.errorPaginator.pageIndex =  event.pageIndex

    this.errorDataSource.data = this.errArray;
    //this.errorTable.renderRows();

    console.log("onErrPaginateChange: " + event.pageSize);

}

  onPaginateChange(event: any)
  {
    console.log("onPaginateChange: " + event.pageIndex);


    this.dataPaginator.pageIndex =  event.pageIndex
    this.selectedRow  = (this.pageIndex * this.dataPaginator.pageSize) + 1
    this.pageIndex =  this.dataPaginator.pageIndex;

    this.dataSource.data = this.x12Array;
    // this.dataTable.renderRows();

  }

  OnErrorRowClick(evt:any)
  {
     this.selection.select(evt.LineNum)

     console.log( evt.LineNum + " === " + this.errSelectedRow  + ", " + evt.Num )

     console.log( this.errSelectedRow+", Line #" + evt.LineNum +", "  + this.selectedRow +", page Size: " + this.dataPaginator.pageSize)

      if (evt.LineNum == this.selectedRow)
      {
        this.selectedRow = 1
      }
     else if (evt.LineNum > this.selectedRow)
     {
      this.SelectNextError(evt.LineNum)
     }
      else{
        this.SelectPrevError(evt.LineNum)
      }

      const ele = document.querySelectorAll("table");
      ele.forEach(element => {

        if (element.id === 'dataTable'){
          console.log("scrollIntoView: " + element.nodeName +": " + element.id)
          element.scrollIntoView();

        }
      });
      let rowData = this.x12Array[evt.LineNum - 1]
      console.log(evt.LineNum + " "+ JSON.stringify( rowData) );

      let segEle = rowData["Data"]



      let x12DataLns = segEle.split(this.separator)
      console.log(segEle + ", Segment Data lines: " + x12DataLns.length +", " + evt.Element)

      if (x12DataLns.length >= Number.parseInt(evt.Element))
       {
        console.log("Element: " + evt.Element +", Data: " + x12DataLns[Number.parseInt(evt.Element) -1])
        x12DataLns[Number.parseInt(evt.Element)] = "<B><I>" + x12DataLns[Number.parseInt(evt.Element)] + "</B></I>"
       }
       this.errorSegmentText = x12DataLns.join(this.separator);

      this.dataError = true;


      this.dataSource.data = this.x12Array;
      //this.errorTable.renderRows();
      // this.dataTable.renderRows();
      this.errSelectedRow = evt.LineNum;
      console.log("Row " + this.errSelectedRow +" => " + this.errorSegmentText)

  }

  OnRowClick(evt:any)
  {
    // this.selectedRow = evt.LineNum
    // console.log("Selected row: "  + evt.LineNum)
  }

}
