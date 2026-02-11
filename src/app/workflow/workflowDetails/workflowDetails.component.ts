import { Component, OnInit, Input, Output, AfterViewInit, ViewChild, ElementRef } from '@angular/core';

import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';


import {WfRestServiceComponent} from '../../services/wfrest-service.component';

import { MatTable,  MatTableDataSource } from '@angular/material/table';


import { Router, ActivatedRoute } from '@angular/router';
import {SelectionModel} from '@angular/cdk/collections';
import { BrowserModule } from '@angular/platform-browser';
import { MatPaginator } from '@angular/material/paginator';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import {x12err} from './WfDetails';
import { Console } from 'node:console';

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

  x12Array: [x12err] = [{lnNum:'0', segId:'1', data:"TEST", segElem:'1/1', error:'Y'}];
  errArray:any[] = [];

  x12Data:string;
  selection = new SelectionModel<x12err>(false, []);


  constructor(private WfService: WfRestServiceComponent,
    private formBuilder: FormBuilder, private router: Router, private route: ActivatedRoute){
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

     sessionStorage.removeItem("currentTab")
      sessionStorage.setItem("currentTab", "Work Flow");

    this.form = this.formBuilder.group({
      statusType: ['', Validators.required]
    });

    this.form.controls.statusType.setValue(this.statusTypes[0]);
     this.wfStatus = this.statusTypes[0];

    this.sub = this.route
    .queryParams
    .subscribe(searchParams => {

      if (searchParams['sessionID'] !== undefined && searchParams['sessionID'] !== null)
      {
        console.log("sessionID query sessionID provided!")
        this.fileName = searchParams['searchParams'];
        this.getX12( 'ID=&SessionID=' + searchParams['sessionID']);
      }
      else
      {

            // Defaults to 0 if no query param provided.
            this.ID = ''+searchParams['ID'] || '0';
            this.searchParams = searchParams['searchParams'];

            let fInd = this.searchParams.indexOf("status::") + "status::".length;
            let val = this.searchParams.substring( fInd, this.searchParams.indexOf(";", fInd))
            console.log(fInd + ". statusType:" + val )
            this.wfStatus = val

            fInd = this.searchParams.indexOf("mode::") + "mode::".length;
            val = this.searchParams.substring( fInd, this.searchParams.indexOf(";", fInd))
            console.log(fInd + ". mode:" + val )
            this.wfMode = val

            fInd = this.searchParams.indexOf("transaction::") + "transaction::".length;
            val = this.searchParams.substring( fInd, this.searchParams.indexOf(";", fInd))
            console.log(fInd + ". transaction:" + val )
            this.transTypeStr = val;

            console.log('Query params ID: ', this.ID + ', params: ' + this.searchParams );

            this.getX12("ID=" + this.ID +'&SessionID=');
      }

    });


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
  console.log("Call service for " +searchStr);

    this.WfService.fetchWorkFlowEntry(this.wfMode, searchStr ).subscribe((res: any) => {

      console.log("# of records: " + res.length)


        // First record - WF entry
        let x12DataLns = res[0].X12.split("~")
        this.separator = res[0].X12.substr(3, 1)
        console.log("Sep: " + this.separator)
        let wfErr = (String)(res[0].Error).replaceAll(";", "\n");

        let tpInd = wfErr.indexOf("TP Not found:")
        if (tpInd >=0)
        {
          this.tpCreate = true;
          this.tpId = wfErr.substring(tpInd + "TP Not found:".length).trim();
          if (this.tpId.indexOf("TP Not found:") >=0  ) // In case two TPs are missing
          {
            this.tpId = this.tpId.substring(0, this.tpId.indexOf("TP Not found:")).trim();
          }
        }

        tpInd = wfErr.indexOf("Relation Not found:")
        if (tpInd >=0)
        {
          this.tpCreate = true;
          this.tpRelId = wfErr.substring(tpInd + "TRelation Not found:".length).trim();
        }

        if (this.fileName == undefined || this.fileName == null || this.fileName == ''  )
        {
          this.errorStr = "Workflow ID: " + res[0].ID + ", Filename:" + res[0].Filename + ", Status: " + this.wfStatus + "\n" + wfErr + "\n" ;
        }
        else
        {
            this.errorStr = "Workflow ID: " + res[0].ID + ", Filename:" + this.fileName + ", Status: " + this.wfStatus + "\n" + wfErr + "\n" ;
        }
        this.wfCurrentStat = res[0].Status;
        this.x12Array.splice(0, this.x12Array.length)
        let segNum = 0
        let segEle = ""
        this.selectedRow = -1;


        let errFound:boolean = false;
        let transCtrlNum =0

        x12DataLns.forEach((item, index) => {
          let err = '';
          segEle ='';



          if(segNum >= 1)
            {
              segNum++;
            }

            if(item.startsWith('ST' + this.separator))
            {
              segNum = 1
              const words = item.split(this.separator);
              transCtrlNum = words[2]
              // console.log("ST: " + transCtrlNum + ", " + segNum)
            }

            // Error details

            for (var ind=1; (ind < res.length && segNum > 0); ind++) {


              if(segNum == res[ind].segNum && transCtrlNum  == res[ind].stNum)
              {
                segEle = res[ind].segNum +"/" + res[ind].eleNum
                err =  res[ind].segErrStr + "(" + res[ind].segErrCode + ") / "  + res[ind].eleErrStr +"("+ res[ind].eleErrCode +")" +" Element: " +
                res[ind].eleNum;

                if (this.selectedRow === -1 && err !== '')
                {
                  this.selectedRow = index + 1;

                }

                // console.log(transCtrlNum +" == " + res[ind].stNum +": " + err)
                break;
              }
            }


            if(item !== '')
            {
              let segStr = (segNum==0)?'-':segNum.toString();

              if(err !== '')
                {
                  this.errArray.push({'Num': ind, 'Segment':(index+1), 'Error' : err})
              }
              if (this.checked) // Show errors only
              {
                if(err !== '')
                {
                  this.x12Array.push({lnNum:(index+1), segId:segStr, data: item, segElem:segEle, error:err});
                  errFound = true;

                }
              }
              else
              {
                this.x12Array.push({lnNum:(index+1), segId:segStr, data: item, segElem:segEle, error:err});
              }
            }
            if(item.startsWith('SE*') || item.startsWith('SE|'))
              {
                // console.log("SE: " + transCtrlNum + ", " + segNum)
                segNum = 0
                transCtrlNum =0
              }


        });


      console.log(this.checked + ", x12Array: " + this.x12Array.length +", errors:" + this.errArray.length)
      if (this.errArray.length > 0)
      {
        this.errorStr += "Number of errors: " +this.errArray.length;

      }

      if(!errFound)
      {
        this.selectedRow = 0
      }
      this.dataSource.data = this.x12Array;
      this.errorDataSource.data = this.errArray;
      console.log("# of lines: "  + ", " + this.errorDataSource.data.length  )
      this.totalErrRecords = this.errorDataSource.data.length;

      this.canRenderDetails = true;

      console.log("Remove " + this.wfCurrentStat +" from " + this.statusTypes.length)

      var index = this.statusTypes.indexOf(this.wfCurrentStat); // get index if value found otherwise -1

      if (index > -1) { //if found
        this.statusTypes.splice(index, 1);
      }
      if(this.errArray.length > 0)
      {
        this.dataError = true;
      }
      else
      {
        this.dataError = false;
        this.errArray.push({'Num': 1, 'Segment': '-', 'Error' : "TP Error"});
        this.errorDataSource.data = this.errArray;

      }

    });




}

 exportX12()
    {
      let exportData = "";
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
      if(this.x12Array[ind].error != '' && this.x12Array[ind].lnNum == lnNum )
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
      if(this.x12Array[ind].error != ''  && this.x12Array[ind].lnNum == lnNum )
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
     this.selection.select(evt.Segment)

     console.log( evt.Num + " === " + this.errSelectedRow)

     console.log( this.errSelectedRow+", Seg #" + evt.Segment +", "  + this.selectedRow +", page Size: " + this.dataPaginator.pageSize)

      if (evt.Segment == this.selectedRow)
      {
        this.selectedRow = 1
      }
     else if (evt.Segment > this.selectedRow)
     {
      this.SelectNextError(evt.Segment)
     }
      else{
        this.SelectPrevError(evt.Segment)
      }

      const ele = document.querySelectorAll("table");
      ele.forEach(element => {

        if (element.id === 'dataTable'){
          console.log("scrollIntoView: " + element.nodeName +": " + element.id)
          element.scrollIntoView();

        }
      });
      let rowData = this.x12Array[evt.Segment - 1]

      let segEle = rowData["segElem"]
      let colInd = segEle.indexOf(":")
      if (colInd > 0)
      {
        segEle = segEle.substring(segEle.indexOf("/") + 1, colInd)
      }
      else
      {
        segEle = segEle.substring(segEle.indexOf("/") + 1)
      }



      let rowEle = rowData["data"].toString().split(this.separator)
      rowEle[segEle] = "<mark>" + rowEle[segEle] + "</mark>"
      console.log("Segment: " +  segEle + " = " + rowEle[segEle])
      this.errorSegmentText = rowEle.join(this.separator)



      let delArr = this.x12Array.splice(evt.Segment - 1, 1, rowData)

      this.dataSource.data = this.x12Array;
      //this.errorTable.renderRows();
      // this.dataTable.renderRows();
      this.errSelectedRow = evt.Num;
      console.log("Row " + this.errSelectedRow +": " + this.x12Array[this.errSelectedRow].data +", element: " + delArr[0].segElem)

  }

  OnRowClick(evt:any)
  {
    this.selectedRow = evt.lnNum
    console.log("Selected row: "  + evt.lnNum)
  }

}
