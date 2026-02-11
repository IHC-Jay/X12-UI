import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';

import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';


import {WfRestServiceComponent} from '../../services/wfrest-service.component';

import { MatTableDataSource } from '@angular/material/table';


import { Router, ActivatedRoute } from '@angular/router';
import {SelectionModel} from '@angular/cdk/collections';
import { MatSort, MatSortHeader } from '@angular/material/sort';



import {WfHistory} from './WfHistory';

@Component({
    selector: 'app-workflowHistory',
    templateUrl: './workflowHistory.component.html',
    styleUrls: ['./workflowHistory.component.css'],
    standalone: false
})



export class WorkflowHistoryComponent implements OnInit {
  displayLabel: string = "Display columns:";

  form!: FormGroup;

  displayedColumnsKL = [
    {key: 'lnNum', 'label': 'Entry'},
    {key: 'Status', 'label': 'Status'},
     {key:"ModUser", 'label': 'User'},
     {key:"ModDateTime", 'label': 'Date Time'},
     {key:"Notes", 'label': 'Notes'},
  ];

  displayedColumns: string[] = [
     'Status', "ModUser", "ModDateTime", "Notes"
  ];

  @ViewChild(MatSort) sort: MatSort;

  wfStatus: string = "";
  transTypeStr = '';
  wfMode = "";

  submitted = false;
  canRenderHistory = false;
  dataSource = new MatTableDataSource<any>();
  checked = false;
  NotesStr:string = "";

  isEdit: boolean = false;
  isSelected: boolean = true;

  sub:any;
  ID:string;
  selectedRow: number = -1;


  wfCurrentStat:string;
  searchParams:string;

  histArray: [WfHistory] = [{lnNum:'1', Status:'0', ModUser:'1', ModDateTime:"TEST", Notes:'1/1'}];

  selection = new SelectionModel<WfHistory>(false, []);


  constructor(private WfService: WfRestServiceComponent,
    private formBuilder: FormBuilder, private router: Router, private route: ActivatedRoute){
      tpId: new FormControl();

  }

  ngOnInit()
  {
    console.info("ngOnInit");

    this.form = this.formBuilder.group({
      statusType: ['', Validators.required]
    });


    this.sub = this.route
    .queryParams
    .subscribe(searchParams => {
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
    });
    this.getX12("ID=" + this.ID +'&SessionID=');

  }
  get f() { return this.form.controls; }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
  }

  statusTypeChange(evt: any)
{
  console.info("statusTypeChange: " + this.form.controls.statusType.value)
  this.wfStatus = this.form.controls.statusType.value
}


getX12(searchStr: string = "")
{
  this.canRenderHistory = false;
  console.log("Call service for " +searchStr);

    this.WfService.fetchWorkFlowEntry(this.wfMode, searchStr ).subscribe((res: any) => {



      res.forEach(element => {

        if (element.Status !== undefined && element.ModUser !== undefined )
        {

          console.log("WF entry: " + element.Status)
          this.dataSource.data.push(element);
        }
      });
      console.log("# of records: " + this.dataSource.data.length)


      this.canRenderHistory = true;
      console.log("status: " + this.dataSource.data[0].Status);


    });


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



}
