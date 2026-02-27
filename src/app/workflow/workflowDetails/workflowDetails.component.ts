import { Component, OnInit, Input, Output, AfterViewInit, ViewChild, ElementRef } from '@angular/core';

import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';


import {WfRestServiceComponent} from '../../services/wfrest-service.component';
import { StorageService } from '../../services/storage.service';

import { MatTable,  MatTableDataSource } from '@angular/material/table';


import { Router, ActivatedRoute } from '@angular/router';
import {SelectionModel} from '@angular/cdk/collections';
import { BrowserModule } from '@angular/platform-browser';
import { MatPaginator } from '@angular/material/paginator';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import {x12err} from './WfDetails';
import { Console } from 'node:console';
import { downloadTextFile } from '../../utils/file-download.util';

@Component({
    selector: 'app-workflowDetails',
    templateUrl: './workflowDetails.component.html',
    styleUrls: ['./workflowDetails.component.css'],
    standalone: false
})



export class WorkflowDetailsComponent implements OnInit {
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
  errorStr:string = "";

  errorSegmentText:string = "";


  dataTableLabel:string[] =  ['#', 'Segment', 'X12 Data', 'Segment/Element']; // , 'Error'];
  dataTableKey: string[] = ['lnNum', 'segId', 'data', 'segElem']; //, 'error'];

  errDataTableLabel:string[] =  ['#', 'Line #', 'Error'];

  errDataTableKey: string[] = [
    'Num', 'Segment', 'Error'
  ]

  isEdit: boolean = false;
  isSelected: boolean = true;

  sub:any;

  tpCreate:boolean = false;

  ID:string;
  fileName:string;
  selectedRow: number = -1;
  errSelectedRow:  number = -1;

  wfCurrentStat:string;
  searchParams:string;

  x12Array: any[] = [{lnNum:'0', segId:'1', data:"TEST", segElem:'1/1', error:'Y'}];
  errArray:any[] = [];

  x12Data:string;
  selection = new SelectionModel<x12err>(false, []);


  constructor(
    private WfService: WfRestServiceComponent,
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private storageService: StorageService
  ) {
    tpId: new FormControl();
  }


  ngAfterViewInit() {
    this.dataSource.paginator = this.dataPaginator;
    this.errorDataSource.paginator = this.errorPaginator;
    console.info("In ngAfterViewInit")
  }

  ngOnInit()
  {
    console.info("ngOnInit");
    this.storageService.removeItem("currentTab");
    this.storageService.setItem("currentTab", "Work Flow");
    this.form = this.formBuilder.group({
      statusType: ['', Validators.required]
    });
    this.form.controls.statusType.setValue(this.statusTypes[0]);
    this.wfStatus = this.statusTypes[0];
    this.sub = this.route.queryParams.subscribe(params => this.handleQueryParams(params));
  }

  private handleQueryParams(searchParams: any) {
    if (searchParams['sessionID'] !== undefined && searchParams['sessionID'] !== null) {
      console.log("sessionID query sessionID provided!");
      this.fileName = searchParams['searchParams'];
      this.getX12('ID=&SessionID=' + searchParams['sessionID']);
    } else {
      this.parseSearchParams(searchParams);
      this.getX12("ID=" + this.ID + '&SessionID=');
    }
  }

  private parseSearchParams(searchParams: any) {
    // Defaults to 0 if no query param provided.
    this.ID = '' + searchParams['ID'] || '0';
    this.searchParams = searchParams['searchParams'];
    let fInd = this.searchParams.indexOf("status::") + "status::".length;
    let val = this.searchParams.substring(fInd, this.searchParams.indexOf(";", fInd));
    console.log(fInd + ". statusType:" + val);
    this.wfStatus = val;
    fInd = this.searchParams.indexOf("mode::") + "mode::".length;
    val = this.searchParams.substring(fInd, this.searchParams.indexOf(";", fInd));
    console.log(fInd + ". mode:" + val);
    this.wfMode = val;
    fInd = this.searchParams.indexOf("transaction::") + "transaction::".length;
    val = this.searchParams.substring(fInd, this.searchParams.indexOf(";", fInd));
    console.log(fInd + ". transaction:" + val);
    this.transTypeStr = val;
    console.log('Query params ID: ', this.ID + ', params: ' + this.searchParams);
  }
  get f() { return this.form.controls; }

  statusTypeChange(evt: any)
{
  console.info("statusTypeChange: " + this.form.controls.statusType.value)
  this.wfStatus = this.form.controls.statusType.value
}


getX12(searchStr: string = "")
{
  this.canRenderDetails = false;
  console.log("Call service for " + searchStr);
  this.WfService.fetchWorkFlowEntry(this.wfMode, searchStr).subscribe((res: any) => {
    console.log("# of records: " + res.length);
    this.processX12Response(res);
  });
}

private processX12Response(res: any) {
  if (!res || !res.length) return;
  // First record - WF entry
  const entry = res[0];
  const x12DataLns = entry.X12.split("~");
  this.separator = entry.X12.substr(3, 1);
  console.log("Sep: " + this.separator);
  const wfErr = String(entry.Error).replaceAll(";", "\n");
  this.extractTPInfo(wfErr);
  this.errorStr = this.composeErrorStr(entry, wfErr);
  this.wfCurrentStat = entry.Status;
  this.x12Array = [];
  this.errArray = [];
  this.selectedRow = -1;
  let segNum = 0;
  let segEle = "";
  let errFound = false;
  let transCtrlNum = 0;
  x12DataLns.forEach((item: string, index: number) => {
    let err = '';
    segEle = '';
    if (segNum >= 1) segNum++;
    if (item.startsWith('ST' + this.separator)) {
      segNum = 1;
      const words = item.split(this.separator);
      transCtrlNum = Number(words[2]);
    }
    // Error details
    let ind: number;
    for (ind = 1; ind < res.length && segNum > 0; ind++) {
      if (segNum == res[ind].segNum && transCtrlNum == res[ind].stNum) {
        segEle = res[ind].segNum + "/" + res[ind].eleNum;
        err = res[ind].segErrStr + "(" + res[ind].segErrCode + ") / " + res[ind].eleErrStr + "(" + res[ind].eleErrCode + ") Element: " + res[ind].eleNum;
        if (this.selectedRow === -1 && err !== '') {
          this.selectedRow = index + 1;
        }
        break;
      }
    }
    if (item !== '') {
      let segStr = segNum == 0 ? '-' : segNum.toString();
      if (err !== '') {
        this.errArray.push({ Num: ind.toString(), Segment: (index + 1).toString(), Error: err });
      }
      if (this.checked) {
        if (err !== '') {
          this.x12Array.push({ lnNum: (index + 1).toString(), segId: segStr, data: item, segElem: segEle, error: err });
          errFound = true;
        }
      } else {
        this.x12Array.push({ lnNum: (index + 1).toString(), segId: segStr, data: item, segElem: segEle, error: err });
      }
    }
    if (item.startsWith('SE*') || item.startsWith('SE|')) {
      segNum = 0;
      transCtrlNum = 0;
    }
  });
  this.finalizeX12Processing(res, errFound);
}

private extractTPInfo(wfErr: string) {
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

private composeErrorStr(entry: any, wfErr: string): string {
  if (!this.fileName) {
    return `Workflow ID: ${entry.ID}, Filename:${entry.Filename}, Status: ${this.wfStatus}\n${wfErr}\n`;
  } else {
    return `Workflow ID: ${entry.ID}, Filename:${this.fileName}, Status: ${this.wfStatus}\n${wfErr}\n`;
  }
}

private finalizeX12Processing(res: any, errFound: boolean) {
  console.log(this.checked + ", x12Array: " + this.x12Array.length + ", errors:" + this.errArray.length);
  if (this.errArray.length > 0) {
    this.errorStr += "Number of errors: " + this.errArray.length;
  }
  if (!errFound) {
    this.selectedRow = 0;
  }
  this.dataSource.data = this.x12Array;
  this.errorDataSource.data = this.errArray;
  console.log("# of lines: " + ", " + this.errorDataSource.data.length);
  this.totalErrRecords = this.errorDataSource.data.length;
  this.canRenderDetails = true;
  this.removeCurrentStatusFromTypes();
  if (this.errArray.length > 0) {
    this.dataError = true;
  } else {
    this.dataError = false;
    this.errArray.push({ Num: 1, Segment: '-', Error: "TP Error" });
    this.errorDataSource.data = this.errArray;
  }
}

private removeCurrentStatusFromTypes() {
  const index = this.statusTypes.indexOf(this.wfCurrentStat);
  if (index > -1) {
    this.statusTypes.splice(index, 1);
  }
}

  exportX12() {
    let exportData = '';
    if (this.x12Array !== null && this.x12Array.length > 0) {
      this.x12Array.forEach((element: any) => {
        exportData += (element.data || '') + '~';
      });
    }

    if (exportData !== '') {
      downloadTextFile(exportData, `WF${this.ID || 'X12'}-X12.txt`);
    }
  }

  updateWF() {
    console.info("Update WorkFlowItem ID: " + this.ID + ",  status: " + this.wfStatus);
    if (this.wfStatus !== '') {
      let paramsList: string[] = [];
      paramsList.push("ID::" + this.ID);
      paramsList.push("Status::" + this.wfStatus);
      paramsList.push("AssignedUser::" + "");
      this.WfService.updateWorkFlowItem(this.wfMode, paramsList).subscribe((res: any) => {
        this.dataSource.data = res;
        this.canRenderDetails = true;
        console.info("WorkFlowItems array: " + this.dataSource.data.length + ", " + this.dataTableKey[1] + ", " + this.dataTableLabel[1]);
        if (this.wfStatus !== 'Assigned') {
          this.toWorkFlow();
        }
      });
    }
  }

  clickChkBox() {
    this.checked = !this.checked;
    this.getX12("ID=" + this.ID + '&SessionID=');
  }

  toTpCreate() {
    console.log('To TP create: ' + this.tpId + ", " + this.tpRelId);
    if (this.tpId !== "") {
      this.storageService.setItem("TpOperation", "tp-add");
      this.storageService.setItem("NewTpId", this.tpId);
    }
    if (this.tpRelId !== "") {
      const tpOperation = this.storageService.getItem<string>("TpOperation");
      if (tpOperation == null || tpOperation == "") {
        this.storageService.setItem("TpOperation", "tpLink-add");
      } else {
        this.storageService.setItem("TpOperation", "tp-add;tpLink-add");
      }
      this.storageService.setItem("NewTpRelId", this.tpRelId);
    }
    this.storageService.removeItem("currentTab");
    this.storageService.setItem("currentTab", "Trading Partners");
    this.router.navigate(["/TradingPartners"]);
  }

  toWorkFlow() {
    console.log('To WorkFlow: ');
    this.router.navigate(["/workflow/"], {
      queryParams: { 'searchParams': this.searchParams }
    });
  }

  SelectNextError(lnNum: string) {
    for (let ind = this.selectedRow + 1; ind < this.x12Array.length; ind++) {
      if (this.x12Array[ind].error != '' && this.x12Array[ind].lnNum == lnNum) {
        this.selectedRow = ind + 1;
        this.dataPaginator.pageIndex = Math.floor(this.selectedRow / this.dataPaginator.pageSize);
        if (this.selectedRow % this.dataPaginator.pageSize == 0) {
          this.dataPaginator.pageIndex--;
        }
        console.log("Next Found row " + this.selectedRow + ", pageIndex: " + this.dataPaginator.pageIndex);
        this.pageIndex = this.dataPaginator.pageIndex;
        break;
      }
    }
  }

  SelectPrevError(lnNum: string) {
    for (let ind = this.selectedRow - 2; ind > 0; ind--) {
      if (this.x12Array[ind].error != '' && this.x12Array[ind].lnNum == lnNum) {
        this.selectedRow = ind + 1;
        this.dataPaginator.pageIndex = Math.floor(this.selectedRow / this.dataPaginator.pageSize);
        this.pageIndex = this.dataPaginator.pageIndex;
        if (this.selectedRow % this.dataPaginator.pageSize == 0) {
          this.dataPaginator.pageIndex--;
        }
        console.log("Prev Found row " + this.selectedRow + ", pageIndex: " + this.dataPaginator.pageIndex);
        break;
      }
    }
  }

  onErrPaginateChange(event: any) {
    this.errPageIndex = event.pageIndex;
    this.errPageSize = event.pageSize;
    this.errorPaginator.pageIndex = event.pageIndex;
    this.errorDataSource.data = this.errArray;
    //this.errorTable.renderRows();
    console.log("onErrPaginateChange: " + event.pageSize);
  }

  onPaginateChange(event: any) {
    console.log("onPaginateChange: " + event.pageIndex);
    this.dataPaginator.pageIndex = event.pageIndex;
    this.selectedRow = (this.pageIndex * this.dataPaginator.pageSize) + 1;
    this.pageIndex = this.dataPaginator.pageIndex;
    this.dataSource.data = this.x12Array;
    // this.dataTable.renderRows();
  }

  OnErrorRowClick(evt: any) {
    this.selection.select(evt.Segment);
    console.log(evt.Num + " === " + this.errSelectedRow);
    console.log(this.errSelectedRow + ", Seg #" + evt.Segment + ", " + this.selectedRow + ", page Size: " + this.dataPaginator.pageSize);
    if (evt.Segment == this.selectedRow) {
      this.selectedRow = 1;
    } else if (evt.Segment > this.selectedRow) {
      this.SelectNextError(evt.Segment);
    } else {
      this.SelectPrevError(evt.Segment);
    }
    const ele = document.querySelectorAll("table");
    ele.forEach(element => {
      if (element.id === 'dataTable') {
        console.log("scrollIntoView: " + element.nodeName + ": " + element.id);
        element.scrollIntoView();
      }
    });
    let rowData = this.x12Array[evt.Segment - 1];
    let segEle = rowData["segElem"];
    let colInd = segEle.indexOf(":");
    if (colInd > 0) {
      segEle = segEle.substring(segEle.indexOf("/") + 1, colInd);
    } else {
      segEle = segEle.substring(segEle.indexOf("/") + 1);
    }
    let rowEle = rowData["data"].toString().split(this.separator);
    rowEle[segEle] = "<mark>" + rowEle[segEle] + "</mark>";
    console.log("Segment: " + segEle + " = " + rowEle[segEle]);
    this.errorSegmentText = rowEle.join(this.separator);
    let delArr = this.x12Array.splice(evt.Segment - 1, 1, rowData);
    this.dataSource.data = this.x12Array;
    //this.errorTable.renderRows();
    // this.dataTable.renderRows();
    this.errSelectedRow = evt.Num;
    console.log("Row " + this.errSelectedRow + ": " + this.x12Array[this.errSelectedRow].data + ", element: " + delArr[0].segElem);
  }

  OnRowClick(evt: any) {
    this.selectedRow = evt.lnNum;
    console.log("Selected row: " + evt.lnNum);
  }

}
