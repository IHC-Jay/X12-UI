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
  // =====================
  // Form & Table Setup
  // =====================
  displayLabel: string = "Display columns:";
  form!: FormGroup;
  displayedColumnsKL = [
    { key: 'lnNum', label: 'Entry' },
    { key: 'Status', label: 'Status' },
    { key: "ModUser", label: 'User' },
    { key: "ModDateTime", label: 'Date Time' },
    { key: "Notes", label: 'Notes' },
  ];
  displayedColumns: string[] = [ 'Status', "ModUser", "ModDateTime", "Notes" ];
  @ViewChild(MatSort) sort: MatSort;
  dataSource = new MatTableDataSource<WfHistory>();
  selection = new SelectionModel<WfHistory>(false, []);

  // =====================
  // State
  // =====================
  wfStatus: string = "";
  transTypeStr = '';
  wfMode = "";
  submitted = false;
  canRenderHistory = false;
  checked = false;
  NotesStr: string = "";
  isEdit: boolean = false;
  isSelected: boolean = true;
  sub: any;
  ID: string;
  selectedRow: number = -1;
  wfCurrentStat: string;
  searchParams: string;

  constructor(
    private WfService: WfRestServiceComponent,
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    console.info("ngOnInit");
    this.form = this.formBuilder.group({ statusType: ['', Validators.required] });
    this.sub = this.route.queryParams.subscribe(params => {
      this.parseQueryParams(params);
    });
    this.getX12(`ID=${this.ID}&SessionID=`);
  }

  private parseQueryParams(params: any) {
    this.ID = '' + params['ID'] || '0';
    this.searchParams = params['searchParams'];
    if (!this.searchParams) return;
    this.wfStatus = this.extractParam(this.searchParams, 'status');
    this.wfMode = this.extractParam(this.searchParams, 'mode');
    this.transTypeStr = this.extractParam(this.searchParams, 'transaction');
    console.log('Query params ID: ', this.ID + ', params: ' + this.searchParams);
  }

  private extractParam(paramStr: string, key: string): string {
    const idx = paramStr.indexOf(`${key}::`);
    if (idx === -1) return '';
    const start = idx + key.length + 2;
    const end = paramStr.indexOf(";", start);
    const val = paramStr.substring(start, end);
    console.log(`${start}. ${key}: ${val}`);
    return val;
  }

  get f() { return this.form.controls; }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
  }

  statusTypeChange(evt: any) {
    console.info("statusTypeChange: " + this.form.controls.statusType.value);
    this.wfStatus = this.form.controls.statusType.value;
  }

  getX12(searchStr: string = "") {
    this.canRenderHistory = false;
    console.log("Call service for " + searchStr);
    this.WfService.fetchWorkFlowEntry(this.wfMode, searchStr).subscribe({
      next: (res: WfHistory[]) => {
        const validRows = res.filter(element => element.Status !== undefined && element.ModUser !== undefined);
        this.dataSource.data = validRows;
        console.log("# of records: " + this.dataSource.data.length);
        this.canRenderHistory = true;
        if (this.dataSource.data.length > 0) {
          console.log("status: " + this.dataSource.data[0].Status);
        }
      },
      error: err => {
        console.error('Error fetching workflow history:', err);
        this.dataSource.data = [];
        this.canRenderHistory = false;
      }
    });
  }

  toWorkFlow() {
    console.log('To WorkFlow: ');
    this.router.navigate(["/workflow/"], {
      queryParams: { searchParams: this.searchParams }
    });
  }
}
