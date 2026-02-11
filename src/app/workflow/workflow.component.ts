import { Component, OnInit, Input, Output, AfterViewInit, ViewChild, ElementRef, Injectable } from '@angular/core';
import { SelectionModel } from "@angular/cdk/collections";
import { MatTableDataSource } from "@angular/material/table";

import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';

import {TransRestServiceComponent} from '../services/transrest-service.component';
import {WfRestServiceComponent} from '../services/wfrest-service.component';
import {WorkFlowEntry, IrisUsers} from './WorkFlowEntry';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { environment } from '../../environments/environment';
import e from 'express';

@Component({
    selector: 'app-workflow',
    templateUrl: './workflow.component.html',
    styleUrls: ['./workflow.component.css'],
    standalone: false
})

export class WorkflowComponent implements OnInit {


 @ViewChild(MatPaginator) paginator: MatPaginator;

  pageLength= 25;
  pageIndex = 1;
  pageSize = 25;
   @ViewChild('dataPaginator') dataPaginator: MatPaginator;


  @ViewChild(MatSort) sort: MatSort;

  form!: FormGroup;

  nowDt = new Date((new Date().getTime() - (24 * 60 * 60 * 1000)));

  startDate = "2023-01-12";
  endDate ="2023-01-12";
  startTm = "13:30";
  endTm= "13:30";
  noAssignee:boolean = true;

  displayedColumns: string[] = [
    'Select',
    'ID',
    'InterchangeSenderID',
    'InterchangeReceiverID',
    'TransactionType',
    'CreateDtTm',
    'ErrorType',
    'Resent',
    'WorkStatus',
    'AssignedUser',
    'LastmodDtTM',
    'LastmodID',
    'Details',
    'History'
];

    displayLabel: string = "Display columns:";

    statusTypes = [
      "New",
      "Assigned To Me",
      "Assigned To Others",
      "Resolved",
      "Ignored"
    ];

    updStatusTypes = [
      "Assigned",
      "Resolved",
      "Resend and Resolved",
      "Ignored"
    ];

    maxCount = ["10", "25", "50", "100", "200"];

    transactionTypes: string[] ;


    showMode = false;
    showUsers = false;
    errorTypes: string[] =['All','Data', 'TP','Connection','Ack','Duplicate']

  statusTypeString:string = 'New';
  // selectedObjects: string[] = ['New'];
  transTypeStr = '835';
  errorTypeStr = 'All';


  canRenderDetails = false;
  rowSelected : number = 0;
  sub:any;
  updStatus: string = this.updStatusTypes[0];

  irisUsers: IrisUsers[] = [];

  dataSource = new MatTableDataSource<WorkFlowEntry>();
  selection = new SelectionModel<WorkFlowEntry>(true, []);
  displayType = 1;
  searchID:boolean = false;
  searchTransaction = false;


  constructor(private WfService: WfRestServiceComponent,
    private formBuilder: FormBuilder, private router: Router, private route: ActivatedRoute){
      tpId: new FormControl();

  }
  get f() { return this.form.controls; }

  ngOnInit() {

   if (`${environment.org}` == 'SH')
  {
    this.transactionTypes = ["All Batch", "All RT", "270", "271","276", "277", "277CA", "835", "837"];
  }
  else{
    this.transactionTypes = ["All Batch",  "277CA", "835", "837"];
  }
    sessionStorage.removeItem("currentTab")
    sessionStorage.setItem("currentTab", "Work Flow")

    this.form = this.formBuilder.group({
      statusType: ['', Validators.required],
      transType: ['', Validators.required],
      assignedUser: [''],
      mode:['Batch', Validators.required],
      errorType: ['', Validators.required],
      rowSelected: [''],
      updStatusType: ['', Validators.required],
      notes:[''],
      assignee:[''],
      wfID:[''],
      senderID:[''],
      receiverID:['']
    });
    this.canRenderDetails = false;
    this.irisUsers = [];
    let wfItems = 0;
    let stDt = 30;
    let mode = 'RealTime';
    this.getUsers();

    if (sessionStorage.getItem('wfConfig') !== undefined && sessionStorage.getItem('wfConfig') !== null)
      {
            console.info("Init from session prev Config: " + sessionStorage.getItem('wfConfig'));

            let searchParams =  sessionStorage.getItem('wfConfig');

            let fInd = searchParams.indexOf("transaction::") + "transaction::".length;
            let val = searchParams.substring( fInd, searchParams.indexOf(";", fInd))
            this.transTypeStr =  val;
            this.form.controls.transType.setValue(this.transTypeStr);

            fInd = searchParams.indexOf("errorType::") + "errorType::".length;
            val = searchParams.substring( fInd, searchParams.indexOf(";", fInd))
            if (val != '')
            {
              this.errorTypeStr =  val;
              this.form.controls.errorType.setValue(this.errorTypeStr);
              console.log("ngOnInit - errorType: " + this.errorTypeStr);
            }

            fInd = searchParams.indexOf("status::") + "status::".length;
            val = searchParams.substring( fInd, searchParams.indexOf(";", fInd))

            if (val != '')
            {
              this.statusTypeString = val;
              this.form.controls.statusType.setValue(this.statusTypeString);

            }

            fInd = searchParams.indexOf("count::") + "count::".length;
            val = searchParams.substring( fInd, searchParams.indexOf(";", fInd))

            fInd = searchParams.indexOf("mode::") + "mode::".length;
            val = searchParams.substring( fInd, searchParams.indexOf(";", fInd))
            this.form.controls.mode.setValue(val)
            if (this.transTypeStr.startsWith('83') || (this.transTypeStr.indexOf('277CA') == 0) || (this.transTypeStr.indexOf('All') >= 0))
            {
              this.showMode = false;
            }
            else
            {
              this.showMode = true;
            }
            console.log("mode: " + val)

            fInd = searchParams.indexOf("wfStartDtTm::") + "wfStartDtTm::".length;
            let fInd2 = searchParams.indexOf(" ", fInd)
            val = searchParams.substring( fInd, fInd2)
            console.log(fInd + ". startDate:" + val )
            this.startDate = val

            let fInd3 = searchParams.indexOf(";", fInd2)
            val = searchParams.substring( fInd2+1, fInd3)
            console.log(fInd + ". startTm:" + val )
            this.startTm = val

            fInd = searchParams.indexOf("wfEndDtTm::") + "wfEndDtTm::".length;
            fInd2 = searchParams.indexOf(" ", fInd)
            val = searchParams.substring( fInd, fInd2)
            console.log(fInd + ". endDate:" + val )
            this.endDate = val

            fInd3 = searchParams.indexOf(";", fInd2)
            val = searchParams.substring( fInd2+1, fInd3)
            console.log(fInd + ". endTm:" + val )
            this.endTm = val

            wfItems = 1

      }

      if (wfItems != 1 && sessionStorage.getItem('UserConfig') !== undefined && sessionStorage.getItem('UserConfig') !== null)
      {
        let parsedObject = JSON.parse(sessionStorage.getItem('UserConfig'));

        console.info("Init from session UserConfig: " + parsedObject.WfTime +", " + parsedObject.DispCnt +", " + parsedObject.Mode);


        let stDtStr = parsedObject.WfTime;
        mode = parsedObject.Mode;

        // Format: Last 90 days

        if(stDtStr.toString().indexOf('1') > 1)
        {
          stDt = 1
        }
        else if(stDtStr.toString().indexOf('7') > 1)
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
          console.info("Search from " + stDt + " days. " + stDtStr);
            this.nowDt = new Date((new Date().getTime() - (stDt *24 * 60 * 60 * 1000)));
            let mm= (this.nowDt.getMonth() < 9)? "0"+(this.nowDt.getMonth() + 1): this.nowDt.getMonth() + 1;
            let dt= (this.nowDt.getDate() < 10)? "0"+this.nowDt.getDate(): this.nowDt.getDate();
            this.startDate = this.nowDt.getFullYear() +"-" + mm +"-" + dt; //  "2023-01-12"; // new Date();
            let tmVal = ((this.nowDt.getHours()< 10)? "0"+ this.nowDt.getHours() : "" + this.nowDt.getHours()) + ":" ;

            tmVal += (this.nowDt.getMinutes() < 10)? "0"+ this.nowDt.getMinutes(): "" + this.nowDt.getMinutes(); // "13:30";
            this.startTm = tmVal
            this.endTm= tmVal
            console.info("Time: " + tmVal +", Status: " + this.statusTypeString)
            this.nowDt = new Date(new Date().getTime());
            mm= (this.nowDt.getMonth() < 9)? "0"+(this.nowDt.getMonth() + 1): this.nowDt.getMonth() + 1;
            dt= (this.nowDt.getDate() < 10)? "0" + this.nowDt.getDate(): this.nowDt.getDate();
            this.endDate =this.nowDt.getFullYear() +"-" + mm +"-" + dt;


            this.form.controls.statusType.setValue(this.statusTypes[0]);
            if (mode  == 'Batch' )
            {
              this.form.controls.transType.setValue(this.transactionTypes[0])
            }
            else
            {
              this.form.controls.transType.setValue(this.transactionTypes[1])
            }
            this.transTypeStr = this.form.controls.transType.value;
            this.form.controls.errorType.setValue(this.errorTypes[0])
            this.form.controls.updStatusType.setValue(this.updStatusTypes[0])

            this.statusTypeString = this.statusTypes[0];
            this.errorTypeStr = this.errorTypes[0];
      }


      this.onSubmit()


  }

  ngAfterViewInit() {

    this.dataSource.sort = this.sort;

  }

onSubmit()
{
  let paramsList: string[]= [];

  console.info("onSubmit fetchWorkFlowItems, StatusTypes::" + this.form.controls.statusType.value)
  if (this.form.controls.wfID.value !== '')
  {
    paramsList.push("ID::" + this.form.controls.wfID.value)
    console.info("fetchWorkFlowItems ID: " + this.form.controls.wfID.value)
  }
  else
  {

    if (this.transTypeStr.indexOf('All') == 0 )
    {
        paramsList.push("TransactionType::" + 'All');
    }
    else
    {
       paramsList.push("TransactionType::" + this.transTypeStr);
    }

    if (this.form.controls.senderID.value !== '' )
    {
        paramsList.push("senderID::" + this.form.controls.senderID.value.replaceAll('%','%25'))
    }
    if (this.form.controls.receiverID.value !== '' )
    {
        paramsList.push("receiverID::" + this.form.controls.receiverID.value.replaceAll('%','%25'))
    }



    paramsList.push("mode::" + this.form.controls.mode.value);
    paramsList.push("DateRange::" + "BETWEEN '" + this.startDate +" "+ this.startTm +"' AND '" + this.endDate+" " +this.endTm +"'");
    paramsList.push('StatusTypes::' + this.form.controls.statusType.value)
    paramsList.push("ErrorType::" + this.errorTypeStr)

    let assignee = '';

    if( this.form.controls.statusType.value == this.statusTypes[2])
    {
      let assignUsr = this.form.controls.assignedUser.value;

       console.info("Get User: " + assignUsr);

      for (let usr of this.irisUsers){

        if (usr.FullName === assignUsr)
        {
          assignee = usr.UserName;
          break;
        }

      };
      console.info("Assignee: " + assignee);
       paramsList.push("AssignedUser::" + assignee)
    }

    console.info("fetchWorkFlowItems statusTypes: " +this.statusTypeString +",  TransType: " +  this.transTypeStr )

  }


  if (this.form.controls.transType.value === '' && this.transTypeStr !== '')
  {
    this.form.controls.transType.setValue(this.transTypeStr);
  }

  console.info("WfService.fetchWorkFlowItems, params: " + paramsList.toString())

  sessionStorage.setItem("wfConfig", "errorType::" + this.form.controls.errorType.value +";" +
          "transaction::"+this.form.controls.transType.value +";" +
          "mode::"+ this.form.controls.mode.value +";" +
          "status::"+this.form.controls.statusType.value +";" +
          "wfStartDtTm::" + this.startDate +" "+ this.startTm +";" +
          "wfEndDtTm::" + this.endDate+" " +this.endTm +";" );

  let mode = this.form.controls.mode.value;

   if  ( (`${environment.org}` == 'SH') || mode == 'Batch')
    {

      this.WfService.fetchWorkFlowItems(mode, paramsList).subscribe(
        (res: WorkFlowEntry[]) => {
            this.dataSource.data = res;
            this.canRenderDetails = true;
            console.info("WorkFlowItems array: " + this.dataSource.data.length  );

          },
                  (error) => {
                    console.error("fetchWorkFlowItems call failed");
                    this.dataSource.data = [];
                    this.canRenderDetails = true;
                  },
                  () => console.log('fetchWorkFlowItems Rest request completed.')
      );

    }

}

 inputID()
 {
  console.info('ID: ' +  this.form.controls.wfID.value)

  if (this.form.controls.wfID.value !== '')
  {
    this.searchID = true
  }
  else
  {
    this.searchID = false
  }

 }

 statusTypeChange(evt: any)
 {
   console.log("Status: " + this.statusTypeString + " => " + this.form.controls.statusType.value)
   this.statusTypeString = this.form.controls.statusType.value

    if (this.statusTypeString == this.statusTypes[2])
   {
       this.getUsers();

       this.form.controls.transType.setValue(this.transactionTypes[0])
       this.transTypeStr = this.transactionTypes[0];
       this.showMode = false;
       this.form.controls.assignedUser.setValue(this.irisUsers[0].FullName);
       console.log("Assign assignedUser: " + this.irisUsers[0].FullName);
       this.showUsers = true;
   }
   else
     {
       this.showUsers = false;
   }

 }

 updStatusTypeChange (evt: any)
 {
   this.updStatus = this.form.controls.updStatusType.value
   console.log("updStatusTypeChange: " + this.updStatus)

 }


transTypeChange(evt: any)
{
  console.info("transTypeChange: " + this.form.controls.transType.value)
  this.transTypeStr = this.form.controls.transType.value

  if (this.transTypeStr.startsWith('83') || (this.transTypeStr.indexOf('277CA') == 0) || (this.transTypeStr.indexOf('All') >= 0))
  {
    this.showMode = false;
    this.form.controls.mode.setValue('Batch');
    if (this.transTypeStr.indexOf('RT') >= 0)
    {
      this.form.controls.mode.setValue('RealTime');
    }
  }
  else
  {
     this.showMode = true;
     this.form.controls.mode.setValue('RealTime');
  }
}

errorTypeChange(evt: any)
{
  console.info("errorTypeChange: " + this.form.controls.errorType.value)
  this.errorTypeStr = this.form.controls.errorType.value
}

onDetailsClicked(row) {

  let searchParamsString = "errorType::" + this.form.controls.errorType.value +";" +
          "transaction::"+this.form.controls.transType.value +";" +
          "mode::"+ this.form.controls.mode.value +";" +
          "status::"+this.form.controls.statusType.value +";" +
          "wfStartDtTm::" + this.startDate +" "+ this.startTm +";" +
          "wfEndDtTm::" + this.endDate+" " +this.endTm +";" ;

  console.log('Row clicked, ID: ' + row.ID + ", Transaction: " + searchParamsString);

 this.router.navigate(["/workflow/workflowDetails/"],
  {queryParams: { ID:  row.ID, TransactionType: row.TransactionType, searchParams:  searchParamsString } }
   );

}

onHistoryClicked(row) {

  let searchParamsString = "errorType::" + this.form.controls.errorType.value +";" +
          "transaction::"+this.form.controls.transType.value +";" +
          "mode::"+ this.form.controls.mode.value +";" +
          "status::"+this.form.controls.statusType.value +";" +
          "wfStartDtTm::" + this.startDate +" "+ this.startTm +";" +
          "wfEndDtTm::" + this.endDate+" " +this.endTm +";"   ;

  console.log('Row clicked, ID: ' + row.ID + ", Transaction: " + searchParamsString);

 this.router.navigate(["/workflow/workflowHistory/"],
  {queryParams: { ID:  row.ID,  searchParams:  searchParamsString } }
   );

}

/** Whether the number of selected elements matches the total number of rows. */
isAllSelected() {
  this.rowSelected = this.selection.selected.length;
  const numRows = this.dataSource.data.length;
  // console.log("isAllSelected: " + this.rowSelected +"===" + numRows)
  return this.rowSelected === numRows;
  this.getUsers();
}

singleToggle(row)
{
  console.log('# of rows checked: ' + this.selection.selected.length)
  console.log('Row Find: ' + row.AssignedUser + ": " + this.WfService.currentUser + ", " + this.selection.isSelected(row));

  if (this.selection.isSelected(row))
  {
    this.selection.deselect(row)
  }
  else
  {
    this.selection.select(row);
    if (row.AssignedUser === this.WfService.currentUser){
      this.noAssignee = false;
    }
    else
    {
      this.noAssignee = true;
    }
    this.getUsers();

  }
  this.rowSelected = this.selection.selected.length;
  // this.dataSource.data.forEach(row => this.selection.select(row));
  console.log('Row count:' + this.selection.selected.length)

}

getUsers()
{
  if ( this.irisUsers.length <= 0)
  {
    this.WfService.fetchIrisUsers().subscribe((res: any) => {
      this.irisUsers = res;

      console.info("Users array: " + this.irisUsers.length  );


    });
  }
}

updUserChange(event: any)
{
   console.info("User: " + event +", " +  this.form.controls.assignee.value)
   if (this.form.controls.assignee.value !== "")
   {
    this.noAssignee = false
   }
}

/** Selects all rows if they are not all selected; otherwise clear selection. */
masterToggle() {
  if(this.isAllSelected())
  {
      this.selection.clear()
      this.rowSelected = 0
  }
  else{
      this.dataSource.data.forEach(row => this.selection.select(row));
      this.rowSelected = this.selection.selected.length;
  }
}

updateWF()
 {
  let assignUsr = this.form.controls.assignee.value
  let assignee = '';


   for (let usr of this.irisUsers){

    if (usr.FullName === assignUsr)
    {
      assignee = usr.UserName;
      break;
    }

  };
  console.info("Update WorkFlow: " + this.selection.selected.length + " to " + this.updStatus +", user: " + assignUsr + ", " + assignee);

  if(this.updStatus !== '')
   {
      console.info("Update WorkFlowItem to " + this.updStatus)


      if (this.updStatus === 'Assigned' && assignUsr === '')
        {
          alert("Assignee is required")
        }
        else
        {
          this.selection.selected.forEach(row => {
            let paramsList: string[]= [];

            paramsList.push("ID::" + row.ID);
            paramsList.push("Status::" + this.updStatus);
            paramsList.push("AssignedUser::" + assignee);
            paramsList.push("Notes::" + this.form.controls.notes.value)


              console.info("ID: " + row.ID +"-> " + this.updStatus)

              this.WfService.updateWorkFlowItem(this.form.controls.mode.value, paramsList).subscribe((res:any) => {
                console.info("updateWorkFlowItem complete")
                this.selection.clear();
                this.rowSelected  = 0;
                this.onSubmit();
                this.canRenderDetails = true;


              });

            });
            this.selection.clear()
            this.rowSelected = 0


        }
   }


  }

 assignWF()
 {
  console.info("Assign WorkFlow: " + this.selection.selected.length );

      this.selection.selected.forEach(row => {
          console.info("ID: " + row.ID +"-> 'Assigned'")

          let paramsList: string[]= [];

          paramsList.push("ID::" + row.ID);
          paramsList.push("Status::" + "Assigned");
          paramsList.push("AssignedUser::" + "");
          paramsList.push("Notes::" + this.form.controls.notes.value)



          this.WfService.updateWorkFlowItem(this.form.controls.mode.value, paramsList).subscribe((res: any) => {
            this.dataSource.data = res;

                console.info("updateWorkFlowItem complete")
                this.selection.clear();
                this.rowSelected  = 0;
                this.statusTypeString = "Assigned To Me"
                //this.selectedObjects = this.selectedObjects.slice()
                //this.selectedObjects = this.statusTypeString.toString().split(',');
                // this.selectedObjects[0] = this.statusTypeString;
                this.onSubmit();
                this.canRenderDetails = true;

          });


        });
        this.selection.clear()
        this.rowSelected = 0




  }

  onStDateChange(event: Event)
{

  // Get the new input value
  const newValue = (event.target as HTMLInputElement).value;
  // Perform actions based on the new value
  this.startDate = newValue;
  console.log('Input value changed:', newValue +", " + this.startDate);
}

onStTimeChange(event: Event)
{

  // Get the new input value
  const newValue = (event.target as HTMLInputElement).value;
  // Perform actions based on the new value
  this.startTm = newValue;
  console.log('Input value changed:', newValue +", " + this.startTm);
}
onEndDateChange(event: Event)
{

  // Get the new input value
  const newValue = (event.target as HTMLInputElement).value;
  // Perform actions based on the new value
  this.endDate = newValue;
  console.log('Input value changed:', newValue +", " + this.endDate);
}
onEndTimeChange(event: Event)
{

  // Get the new input value
  const newValue = (event.target as HTMLInputElement).value;
  // Perform actions based on the new value
  this.endTm = newValue;
  console.log('Input value changed:', newValue +", " + this.endTm);
}

onPaginateChange(event: any)
  {
    console.log("onPaginateChange: " + event.pageIndex +", pageSize: " + event.pageSize );

    this.dataPaginator.pageIndex =  event.pageIndex

    this.pageIndex =  this.dataPaginator.pageIndex;
    this.pageSize = this.dataPaginator.pageSize;

  }

}



