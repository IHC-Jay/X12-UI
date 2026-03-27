import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';

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
import { catchError, Subscription } from 'rxjs';
import { environment } from '../../environments/environment';
import { Modalx12Component } from './transaction-details/modal/modal-x12.component';
import { parseDays } from '../utils/parseDays';
import { MatDialog } from '@angular/material/dialog';
import { DateTimeUtils } from '../utils/date-time.utils';

    // =====================
    // Table & Paginator Events
    // =====================

import { StorageService } from '../services/storage.service';

@Component({
    selector: 'app-transaction',
    templateUrl: './transaction.component.html',
    styleUrls: ['./transaction.component.css'],
    standalone: false
})



export class TransactionComponent implements OnInit, AfterViewInit, OnDestroy {

  contextMenuPosition = { x: '0px', y: '0px' };

    // =====================
    // Custom Fields Helpers
    // =====================
  @ViewChild(MatMenuTrigger)
  contextMenu: MatMenuTrigger;

  nowDt = new Date((new Date().getTime() - (24 * 60 * 60 * 1000)));


  paramsList: string[];

    maxCount = ["10", "25", "50", "100", "200"];
    dispositions = ["All", "Processed", "Rejected", "Validation failed"];

    rightClickMenu: string[] = ['Details in Same Window', 'Details in New Tab'] ;

  org: string = `${environment.org}`;
  transactionTypes: string[] = [];
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

    // =====================
    // Transaction Type Change
    // =====================
      transactionCode: 'XXX',
    }];


  searchColumns= this.transactionsFields.slice();

  sub: Subscription | undefined;
  private formValueChangesSub: Subscription | undefined;
  private openDetailsRedirectHandled = false;
  private requestId = '';
  private enableUserEditReset = false;

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
      endDate :"2023-01-12",
      startTm : "13:30",
      endTm: "13:30"
  }

  staticSearchStr = "";
  additionalSearchStr = "";
  transUserFlds = "";
  fileName:string="";
  restoredSearchValues: { [key: string]: string } = {};


  constructor(
    private TransactionService: TransRestServiceComponent,
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    public dialog: MatDialog,
    private storageService: StorageService
  ) {
    tpId: new FormControl();
  }

  get additionalControls() {
    return (this.form.get('additional') as FormArray).controls;
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
    console.info("ngOnInit Transactions for " + this.org );
    this.initTransactionTypes();
    this.initForm();
    this.handleQueryParamsSessionStorage();
    this.initFromUserConfig();

    this.setFormControlValues();
    await this.initTransactionFieldsAndColumnsAsync();
    this.setDataSourceSort();

    // Call handleCustomFieldsAndSearch after all fields are initialized
    // This ensures additionalSearch filename filter is applied
    this.handleCustomFieldsAndSearch();

    this.setupUserEditResetHandlers();
    this.enableUserEditReset = true;
  }

  private setupUserEditResetHandlers() {
    this.formValueChangesSub = this.form.valueChanges.subscribe(() => {
      if (!this.enableUserEditReset) {
        return;
      }
      this.resetQueryParamSearchValues('form value changed');
    });
  }

  private resetQueryParamSearchValues(reason: string) {
    const hadQuerySearchValues =
      (this.requestId && this.requestId.trim().length > 0) ||
      (this.additionalSearchStr && this.additionalSearchStr.trim().length > 0) ||
      (this.fileName && this.fileName.trim().length > 0);

    if (!hadQuerySearchValues) {
      return;
    }

    console.info('Reset query-param search values due to user change: ' + reason, {
      requestId: this.requestId,
      additionalSearchStr: this.additionalSearchStr,
      fileName: this.fileName
    });

    this.requestId = '';
    this.additionalSearchStr = '';
    this.fileName = '';
    this.staticSearchStr = '';

    this.clearQueryParamsFromUrl(reason);
  }

  private clearQueryParamsFromUrl(reason: string) {
    const hasQueryParams = this.route.snapshot.queryParamMap.keys.length > 0;
    if (!hasQueryParams) {
      return;
    }

    console.info('Clearing URL query params due to user change: ' + reason, {
      queryParams: this.route.snapshot.queryParams
    });

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true
    });
  }

  // =====================
  // ngOnInit Refactor Helpers
  // =====================
  private initTransactionTypes() {
    if (this.org == 'SH') {
      this.transactionTypes = ["270", "271","276", "277", "277CA", "835", "837I", "837P", "837D", "999", "TA1"];
    } else {
      this.transactionTypes = [ "835", "837I", "837P", "837D", "999", "277CA", "TA1"];
    }
    this.formFields.currentTransType = '';
    this.storageService.removeItem("currentTab");
    this.storageService.setItem("currentTab", "Transactions");
  }


  private initForm() {
    // Determine initial value for transType
    let initialTransType = '';
    const defaultMode = this.org === 'RCO' ? 'Batch' : 'RealTime';
    if (this.formFields && this.formFields.currentTransType) {
      initialTransType = this.formFields.currentTransType;
    } else if (this.transactionTypes && this.transactionTypes.length > 0) {
      initialTransType = this.transactionTypes[0];
    }
    this.form = this.formBuilder.group({
      rowCnt:['25', Validators.required],
      transType: [initialTransType, Validators.required],
      disposition: ['All', Validators.required],
      mode:[defaultMode, Validators.required],
      direction:['Inbound'],
      additional:this.formBuilder.array([this.createinitForm()])
    });
  }

  private handleQueryParamsSessionStorage() {

    console.info("Handle query params and session storage for Transactions");
      this.sub = this.route.queryParams.subscribe(params => {
        const openDetails = params['openDetails'] === 'true';

        // If openDetails flag is set, check for detailed nav data in localStorage
        if (openDetails && !this.openDetailsRedirectHandled) {
          this.openDetailsRedirectHandled = true;

          // Try to get additional params from localStorage if not in URL
          let navData: any = {};
          const transactionNavData = localStorage.getItem('transactionNavData');
          if (transactionNavData) {
            try {
              navData = JSON.parse(transactionNavData);
              localStorage.removeItem('transactionNavData'); // Clear after use
            } catch (e) {
              console.warn('Failed to parse transactionNavData from localStorage', e);
            }
          }

          // Build the redirect query params, using sessionStorage data as fallback
          const redirectParams: any = {
            ID: params['ID']
          };

          if (params['transConfig'] || navData.transConfig) {
            redirectParams.transConfig = params['transConfig'] || navData.transConfig;
          }
          if (params['transaction'] || navData.transaction) {
            redirectParams.transaction = params['transaction'] || navData.transaction;
          }
          if (params['mode'] || navData.mode) {
            redirectParams.mode = params['mode'] || navData.mode;
          }
          if (params['sessionID'] || params['SessionID'] || params['SessionId']) {
            redirectParams.sessionID = params['sessionID'] || params['SessionID'] || params['SessionId'];
          }
          if (params['Status'] || params['status']) {
            redirectParams.Status = params['Status'] || params['status'];
          }
          if (params['additionalSearch'] || navData.additionalSearch) {
            redirectParams.additionalSearch = params['additionalSearch'] || navData.additionalSearch;
          }
          if (params['searchTypeString']) {
            redirectParams.searchTypeString = params['searchTypeString'];
          }

          this.router.navigate(['/transaction/transaction-details'], {
            queryParams: redirectParams,
            replaceUrl: true
          });
          return;
        }

        const hasQueryValues = params !== undefined && Object.keys(params).length > 0;
        if (hasQueryValues) {
          const hasTransactionNavigationContext =
            !!params['ID'] ||
            !!params['transaction'] ||
            !!params['additionalSearch'] ||
            !!params['searchTypeString'] ||
            !!params['openDetails'] ||
            !!params['sessionID'] ||
            !!params['SessionID'] ||
            !!params['SessionId'];

          if (!hasTransactionNavigationContext) {
            console.info('Ignoring non-transaction query params; preserving session-restored transaction state.', {
              queryParams: params
            });
            return;
          }

          this.requestId = params['ID'] || '';
          let jsonString = params['transConfig'];

          // If transConfig not in URL params, try to get from localStorage
          if (!jsonString && hasTransactionNavigationContext) {
            const transactionNavData = localStorage.getItem('transactionNavData');
            if (transactionNavData) {
              try {
                const navData = JSON.parse(transactionNavData);
                jsonString = navData.transConfig;
              } catch (e) {
                console.warn('Failed to parse transactionNavData from localStorage', e);
              }
            }
          }

          if(jsonString !== undefined && jsonString !== null) {
            console.info("TransConfig from parent or sessionStorage: " + jsonString);
            this.formFields = JSON.parse(jsonString);
            this.setEndTimeToNow();
            console.info('Parsed Object:', this.formFields);
          } else {
            this.formFields.currentTransType =  params['transaction'] || '';
            this.transUserFlds = params['transUserFlds'];
            this.setEndTimeToNow();
          }
          this.additionalSearchStr = params['additionalSearch'] || '';
          console.info("Query params, additionalSearchStr: " + this.additionalSearchStr +", " + this.formFields.currentTransType +", " + this.transUserFlds)
          let fInd = this.additionalSearchStr.indexOf("FileName=") + "FileName=".length;
          let val = this.additionalSearchStr.substring( fInd)
          console.log(fInd + ". FileName:" + val )
          this.fileName = val
        } else {
          console.info('No query params found for Transactions route; preserving session-restored state.');
        }

      });

    if (this.formFields.currentTransType === '') {
        let jsonString = this.storageService.getItem<any>('transConfig') ;
        console.info('Fetched transConfig from session storage: ' + jsonString);
        if (jsonString) {
          this.formFields = JSON.parse(jsonString) ;
          console.info("Start Time: " + this.formFields.startDate + ", " + this.formFields.startTm);
      }
    }

    this.restoreSearchStateFromSessionStorage();
  }

  private restoreSearchStateFromSessionStorage() {
    const hasQueryParams = this.route.snapshot.queryParamMap.keys.length > 0;
    if (hasQueryParams) {
      return;
    }

    const savedSearchTypeString = this.storageService.getItem<any>('transUserFlds') || '';
    if (!savedSearchTypeString || savedSearchTypeString.trim().length === 0) {
      return;
    }

    this.transUserFlds = savedSearchTypeString;
    const entries = savedSearchTypeString
      .split(';')
      .map(value => (value || '').trim())
      .filter(value => value.length > 0);

    let restoredSql = '';
    let restoredFileName = '';

    for (const entry of entries) {
      if (entry.startsWith('mode::')) {
        this.formFields.mode = entry.substring('mode::'.length).trim();
      } else if (entry.startsWith('transaction::')) {
        this.formFields.currentTransType = entry.substring('transaction::'.length).trim();
      } else if (entry.startsWith('status::')) {
        this.formFields.disposition = entry.substring('status::'.length).trim();
      } else if (entry.startsWith('count::')) {
        this.formFields.rowCnt = entry.substring('count::'.length).trim();
      } else if (entry.startsWith('ID::')) {
        this.requestId = entry.substring('ID::'.length).trim();
      } else if (entry.startsWith('startDtTm::')) {
        const startDtTm = entry.substring('startDtTm::'.length).trim();
        const splitIndex = startDtTm.lastIndexOf(' ');
        if (splitIndex > 0) {
          this.formFields.startDate = startDtTm.substring(0, splitIndex).trim();
          this.formFields.startTm = startDtTm.substring(splitIndex + 1).trim();
        }
      } else if (entry.startsWith('endDtTm::')) {
        const endDtTm = entry.substring('endDtTm::'.length).trim();
        const splitIndex = endDtTm.lastIndexOf(' ');
        if (splitIndex > 0) {
          this.formFields.endDate = endDtTm.substring(0, splitIndex).trim();
          this.formFields.endTm = endDtTm.substring(splitIndex + 1).trim();
        }
      } else if (entry.startsWith('sql::')) {
        restoredSql = entry.substring('sql::'.length).trim();
        const parsedValues = this.parseSqlSearchValues(restoredSql);
        this.restoredSearchValues = { ...this.restoredSearchValues, ...parsedValues };
      } else if (entry.startsWith("addSql::FileName=")) {
        restoredFileName = this.normalizeFileNameFilterValue(
          entry.substring("addSql::FileName=".length)
        );
      }
    }

    if (restoredSql.length > 0) {
      this.additionalSearchStr = restoredSql;
      const fileNameFromSql = this.extractFileNameFromAdditionalSearch(restoredSql);
      if (fileNameFromSql.length > 0) {
        this.fileName = fileNameFromSql;
      }
    } else if (restoredFileName.length > 0) {
      this.fileName = restoredFileName;
      this.additionalSearchStr = "FileName='" + restoredFileName.replaceAll("'", "''") + "'";
    }

    console.info('Restored transaction search state from session storage', {
      transType: this.formFields.currentTransType,
      mode: this.formFields.mode,
      disposition: this.formFields.disposition,
      rowCnt: this.formFields.rowCnt,
      requestId: this.requestId,
      additionalSearchStr: this.additionalSearchStr,
      fileName: this.fileName,
      restoredSearchKeys: Object.keys(this.restoredSearchValues)
    });
  }

  private parseSqlSearchValues(searchSql: string): { [key: string]: string } {
    const result: { [key: string]: string } = {};
    if (!searchSql || searchSql.trim().length === 0) {
      return result;
    }

    const normalizedSql = searchSql.replaceAll('%25', '%');
    const matcher = /([A-Za-z0-9_]+)\s*(?:=|LIKE)\s*'([^']*)'/gi;
    let match = matcher.exec(normalizedSql);

    while (match !== null) {
      const key = (match[1] || '').trim();
      const value = (match[2] || '').trim();
      if (key.length > 0) {
        result[key] = value;
      }
      match = matcher.exec(normalizedSql);
    }

    return result;
  }

  private extractSqlValueForKey(searchSql: string, key: string): string {
    if (!searchSql || !key) {
      return '';
    }

    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedKey + "\\s*(?:=|LIKE)\\s*'([^']*)'", 'i');
    const match = searchSql.match(regex);
    if (!match || !match[1]) {
      return '';
    }

    return match[1].replaceAll('%25', '%').trim();
  }

  private syncFormFieldsFromForm() {
    this.formFields.currentTransType = this.form.controls.transType.value;
    this.formFields.mode = this.form.controls.mode.value;
    this.formFields.disposition = this.form.controls.disposition.value;
    this.formFields.rowCnt = this.form.controls.rowCnt.value;
    this.formFields.direction = this.form.controls.direction.value;
  }

  private setEndTimeToNow() {
    if(this.formFields)
    {
      const { currentDt: endDt, currentTm: currentTm } = DateTimeUtils.GetCurrentDtTm();
      this.formFields.endDate = endDt;
      this.formFields.endTm = currentTm;

      console.info("End Time: " + this.formFields.endDate + ", " + this.formFields.endTm);
    }
  }

  private initFromUserConfig() {
    console.info("Initialize from session UserConfig if available");
    const parsedObject = JSON.parse(this.storageService.getItem<any>('UserConfig') || '{}') ;
    if (parsedObject && Object.keys(parsedObject).length > 0) {
      let stDt = 1;
      const hasTransactionQueryContext =
        this.route.snapshot.queryParamMap.has('transaction') ||
        this.route.snapshot.queryParamMap.has('transConfig') ||
        this.route.snapshot.queryParamMap.has('ID');
      const hasTransactionSessionContext =
        !!(this.storageService.getItem<any>('transConfig')) ||
        !!(this.storageService.getItem<any>('transUserFlds'));
      const shouldApplyUserConfigDefaults = !hasTransactionQueryContext && !hasTransactionSessionContext;

      if (shouldApplyUserConfigDefaults && parsedObject.TranType) {
        console.info("Init from session UserConfig: " + parsedObject.TranType + ", " + parsedObject.DispCnt + ", " + parsedObject.Mode);
        this.formFields.currentTransType = parsedObject.TranType;
        this.formFields.mode = parsedObject.Mode;
        this.formFields.rowCnt = parsedObject.DispCnt;
        this.form.controls.transType.setValue(this.formFields.currentTransType);
        this.form.controls.rowCnt.setValue(this.formFields.rowCnt);
        this.form.controls.mode.setValue(this.formFields.mode);
        this.pageSize = parsedObject.DispCnt;
      } else {
        console.info('Skipping UserConfig transaction type override due to query context', {
          hasTransactionQueryContext,
          hasTransactionSessionContext,
          currentTransType: this.formFields.currentTransType
        });
      }

      if (shouldApplyUserConfigDefaults && parsedObject.TranTime) {
        const stDtStr = parsedObject.TranTime;
        stDt = parseDays(parsedObject.TranTime);
        console.info("Init date range from UserConfig TranTime: Search from " + stDt + " days. " + stDtStr);
      }

      if (shouldApplyUserConfigDefaults) {
        const dtObj = DateTimeUtils.GetStartEndDtTm(stDt);
        this.formFields.startDate = dtObj.startDt;
        this.formFields.startTm = dtObj.startTm;
        this.formFields.endDate = dtObj.endDt;
        this.formFields.endTm = dtObj.endTm;

        console.info("Start Time: " + this.formFields.startDate + ", " + this.formFields.startTm);
      } else {
        console.info('Skipping UserConfig date range override due to transaction session/query context', {
          hasTransactionQueryContext,
          hasTransactionSessionContext,
          startDate: this.formFields.startDate,
          startTm: this.formFields.startTm,
          endDate: this.formFields.endDate,
          endTm: this.formFields.endTm
        });
      }
    }
  }

  // parseDays now imported from utils

  private setFormControlValues() {
    this.form.controls.mode.setValue(this.formFields.mode);
    this.form.controls.transType.setValue(this.formFields.currentTransType);
    this.form.controls.disposition.setValue(this.formFields.disposition);
    this.form.controls.rowCnt.setValue(this.formFields.rowCnt);
  }

  private handleCustomFieldsAndSearch() {
    if (this.formFields.currentTransType !== '') {
      this.updateCustomFlds();
      this.searchTransaction = true;

      // If additionalSearch is set (e.g., from Summary filtering by filename), automatically execute search
      if (this.additionalSearchStr && this.additionalSearchStr.trim().length > 0) {
        console.info('AutoSearch triggered: additionalSearchStr = ' + this.additionalSearchStr);
        // Use setTimeout to ensure async execution after DOM is ready
        setTimeout(() => this.onSearchTransactions(), 100);
      }
    } else {
      this.clearSearch();
    }
  }

  private initTransactionFieldsAndColumnsAsync(): Promise<void> {
    return new Promise((resolve) => {
      console.info('Fetching TransactionFields and Display/Search Columns');
      this.TransactionService.fetchTransactionFields().subscribe((res: any) => {
        this.transactionsFields = [];
        for (var item of res) {
          this.transactionsFields.push({key: item.Key, type: item.Type, label: item.TransactionLabel, transactionCode: item.TransactionCode});
        }
        console.info("transactions Fields: " + this.transactionsFields.length);
        console.info("Init Usr Columns: " + this.usrDisplayColumns.length);
        this.TransactionService.fetchDisplayColumns("Default", "Transactions").subscribe((res: any) => {
          this.usrDisplayColumns.splice(0, this.usrDisplayColumns.length);
          this.usrDisplayColumns.push(...res);
          console.info("User display columns from fetchDisplayColumns: " + this.usrDisplayColumns.length);
          this.TransactionService.fetchSearchColumns("Default", "Transactions").subscribe((res: any) => {
            this.usrSearchColumns.splice(0, this.usrSearchColumns.length);
            this.usrSearchColumns.push(...res);
            console.info("User search columns from fetchSearchColumns: " + this.usrSearchColumns.length);
            if(this.formFields.currentTransType !== '') {
              this.transactionChange(this.formFields.currentTransType);
              console.info('Transaction search for: ' + this.formFields.currentTransType);
            } else {
              this.transactionChange(this.transactionTypes[0]);
            }
            console.info('Fetched TransactionFields and Display/Search Columns');
            resolve();
          });
        });
      });
    });
  }

  private setDataSourceSort() {
    if (!this.dataSource.sort) {
      console.debug("Set sort in ngInit");
      this.dataSource.sort = this.sort;
    }
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    // this.dataSource.sort = this.sort;

    // =====================
    // Context Menu Handlers
    // =====================

  }

  ngOnDestroy(): void {
    if (this.sub) {
      this.sub.unsubscribe();
    }
    if (this.formValueChangesSub) {
      this.formValueChangesSub.unsubscribe();
    }
  }

  get f() { return this.form.controls; }

  onSearchTransactions() {
    this.canRenderDetails = false;
    this.buildParamsList();
    this.logSearchParams();
    this.ensureTransTypeSet();
    this.loading = true;
    const formArr = this.form.get('additional') as FormArray;
    console.info('onSearchTransactions: additionalSearchStr = "' + this.additionalSearchStr + '"');
    if (this.additionalSearchStr === '') {
      this.staticSearchStr = '';
      this.buildStaticSearchStr(formArr);
    } else {
      this.handleAdditionalSearchStr(formArr);
    }
    console.info('onSearchTransactions: after handleAdditional, staticSearchStr = "' + this.staticSearchStr + '"');
    this.handleSqlParam();
    console.info('onSearchTransactions: after handleSqlParam, paramsList = ', this.paramsList);
    this.saveSessionState();
    this.fetchTransactionData();
    this.paginator.pageSize = this.form.controls.rowCnt.value;
  }

  // --- onSearchTransactions helpers ---
  private buildParamsList() {
    this.paramsList = [];
    this.paramsList.push("mode::" + this.form.controls.mode.value);
    this.paramsList.push("transaction::" + this.form.controls.transType.value);
    this.paramsList.push("status::" + this.form.controls.disposition.value);
    const fileNameFilter = this.getEffectiveFileNameFilter();
    const hasFileNameFilter = fileNameFilter.length > 0;
    if (!hasFileNameFilter) {
      this.paramsList.push("startDtTm::" + this.formFields.startDate + " " + this.formFields.startTm);
    }
    this.paramsList.push("endDtTm::" + this.formFields.endDate + " " + this.formFields.endTm);
    if (!hasFileNameFilter && this.requestId && String(this.requestId).trim().length > 0) {
      this.paramsList.push("ID::" + this.requestId);
    }
    this.paramsList.push("count::" + this.form.controls.rowCnt.value);
  }

  private logSearchParams() {
    console.info("onSearchTransactions count: " + this.form.controls.rowCnt.value);
    console.info("SearchTransactions Mode# " + this.form.controls.mode.value + ", " + this.form.controls.transType.value + ", " + this.form.controls.disposition.value);
    console.info("SearchTransactions Start# " + this.formFields.startDate + ", " + this.formFields.startTm);
    console.info("SearchTransactions End# " + this.formFields.endDate + ", " + this.formFields.endTm);
  }

  private ensureTransTypeSet() {
    if (this.form.controls.transType.value === '' && this.formFields.currentTransType !== '') {
      this.form.controls.transType.setValue(this.formFields.currentTransType);
    }
  }

  private buildStaticSearchStr(formArr: FormArray) {
    if (formArr.length >= 1) {
      for (let i = 0; i < formArr.length; i++) {
        let fGrp = formArr.at(i) as FormGroup;
        if (fGrp.controls.newFldValue.value === '') {
          console.info(fGrp.controls.fld.value + " is empty");
          continue;
        } else {
          console.info(fGrp.controls.fld.value + "= " + fGrp.controls.newFldValue.value);
        }
        for (let [ind, val] of this.transSearchStructArr.entries()) {
          if (
            fGrp.controls.fld.value === val.label &&
            val.transactionCode === this.form.controls.transType.value
          ) {
            let fldVal = fGrp.controls.newFldValue.value;
            console.info("transSearchStructArr " + ind + ": " + val.transactionCode + ", " + val.label + ", " + val.key + " = '" + fldVal + "'");
            if (val.key.toUpperCase().indexOf('DATE') >= 0 && fldVal.indexOf('-') >= 0) {
              fldVal = fldVal.replaceAll('-', '');
            }
            if (fldVal.indexOf('%') >= 0) {
              this.staticSearchStr += " AND " + val.key + " LIKE '" + fldVal + "'";
            } else {
              this.staticSearchStr += " AND " + val.key + "='" + fldVal + "'";
            }
          }
        }
      }
    }
  }

  private handleAdditionalSearchStr(formArr: FormArray) {
    console.info("handleAdditionalSearchStr: START with additionalSearchStr = " + this.additionalSearchStr);
    this.staticSearchStr = this.additionalSearchStr;
    console.info("handleAdditionalSearchStr: SET staticSearchStr = " + this.staticSearchStr);

    const parsedFromSql = this.parseSqlSearchValues(this.staticSearchStr);
    this.restoredSearchValues = { ...this.restoredSearchValues, ...parsedFromSql };

    for (let i = 0; i < formArr.length; i++) {
      let fGrp = formArr.at(i) as FormGroup;
      for (let [ind, val] of this.transSearchStructArr.entries()) {
        if (
          this.additionalSearchStr.indexOf(val.key) >= 0 &&
          val.label === fGrp.controls.fld.value &&
          val.transactionCode === this.form.controls.transType.value
        ) {
          const restoredValueByKey = this.restoredSearchValues[val.key] || '';
          const usrVal = restoredValueByKey || this.extractSqlValueForKey(this.staticSearchStr, val.key);
          console.info('handleAdditionalSearchStr: Set: ' + val.transactionCode + ", " + val.key + " = '" + usrVal + "', " + val.label);
          if (usrVal.length > 0) {
            fGrp.controls.newFldValue.setValue(usrVal, { emitEvent: false });
          }
          break;
        }
      }
    }
    console.info("handleAdditionalSearchStr: END with staticSearchStr = " + this.staticSearchStr);
  }

  private handleSqlParam() {
    const fileNameFilter = this.getEffectiveFileNameFilter();
    const hasFileNameFilter = fileNameFilter.length > 0;
    if (hasFileNameFilter && (!this.staticSearchStr || this.staticSearchStr.trim().length === 0)) {
      const escapedFileName = fileNameFilter.replaceAll("'", "''");
      this.staticSearchStr = "FileName='" + escapedFileName + "'";
    }

    console.info('handleSqlParam: staticSearchStr = "' + this.staticSearchStr + '", length = ' + this.staticSearchStr.length);
    const isFileNameOnlySql = this.isFileNameOnlyFilter(this.staticSearchStr);
    if (hasFileNameFilter && isFileNameOnlySql) {
      console.info('handleSqlParam: Skipping sql::FileName to avoid duplicate with addSql::FileName');
      return;
    }

    if (this.staticSearchStr.length > 3) {
      this.staticSearchStr = this.staticSearchStr.replace('AND', '');
      this.staticSearchStr = this.staticSearchStr.replaceAll('%', '%25');
      console.info('handleSqlParam: ADDING to paramsList: sql::' + this.staticSearchStr);
      this.paramsList.push("sql::" + this.staticSearchStr);
    } else {
      console.info('handleSqlParam: staticSearchStr too short, NOT adding sql parameter');
    }
  }

  private saveSessionState() {
    this.syncFormFieldsFromForm();

    this.transUserFlds = '';
    this.paramsList.forEach(val => {
      this.transUserFlds += val + ';';
    });
    this.storageService.setItem("transUserFlds", this.transUserFlds);
    const jsonString = JSON.stringify(this.formFields);
    this.storageService.setItem("transConfig", jsonString);
  }

  private fetchTransactionData() {
    const transType = this.form.controls.transType.value;
    const mode = this.form.controls.mode.value;
    this.appendFileNameAddSqlIfNeeded(transType);
    if (transType === '270') {
      this.TransactionService.fetchEligibilityRequests(mode, this.paramsList).subscribe((res: any) => {
        this.handleFetchResult(res);
      }, errorRes => {
        alert('Error in fetching EligibilityBenefit Requests: ' + errorRes);
        this.dataSource.data = [];
        this.loading = false;
      });
    } else if (transType === '271') {
      this.TransactionService.fetchEligibilityBenefitResponses(mode, this.paramsList).subscribe((res: any) => {
        this.handleFetchResult(res);
      });
    } else if (transType === '835') {
      console.info("835 search: " + this.staticSearchStr);
      this.TransactionService.fetchClaimPayment(mode, this.paramsList).subscribe((res: any) => {
        this.handleFetchResult(res);
      });
    } else if (transType === '837P') {
      console.info("837P search: " + this.staticSearchStr);
      this.paramsList.push(this.buildClaimVersionAddSql("005010X222A1"));
      this.TransactionService.fetchClaims(mode, this.paramsList).subscribe((res: any) => {
        this.handleFetchResult(res);
      });
    } else if (transType === '837I') {
      this.paramsList.push(this.buildClaimVersionAddSql("005010X223A2"));
      this.TransactionService.fetchClaims(mode, this.paramsList).subscribe((res: any) => {
        this.handleFetchResult(res);
      });
    } else if (transType === '837D') {
      this.paramsList.push(this.buildClaimVersionAddSql("005010X224A2"));
      this.TransactionService.fetchClaims(mode, this.paramsList).subscribe((res: any) => {
        this.handleFetchResult(res);
      });
    } else if (transType === '276') {
      this.TransactionService.fetchClaimStatusReq(mode, this.paramsList).subscribe((res: any) => {
        this.handleFetchResult(res);
      });
    } else if (transType === '277') {
      this.TransactionService.fetchClaimStatusResp(mode, this.paramsList).subscribe((res: any) => {
        this.handleFetchResult(res);
      });
    } else if (transType === '277CA') {
      this.TransactionService.fetchClaimAcknowledgment(mode, this.paramsList).subscribe((res: any) => {
        this.handleFetchResult(res);
        this.dataSource.sort = this.sort;
        console.debug("Set sort after populating table");
      });
    } else if (transType === '999') {
      this.TransactionService.fetchImplementationAcknowledgment(mode, this.paramsList).subscribe((res: any) => {
        this.handleFetchResult(res);
      });
    } else if (transType === 'TA1') {
      this.TransactionService.fetchTA1(mode, this.paramsList).subscribe((res: any) => {
        this.handleFetchResult(res);
      });
    } else {
      this.searchColumns = [];
      this.selDropdownList = this.nyiColumns;
      this.canRenderDetails = true;
      this.loading = false;
      console.info("NotImplementd array: " + this.dataSource.data.length);
    }
  }

  private buildClaimVersionAddSql(versionId: string): string {
    let sql = "VersionReleaseIndustryIdenti='" + versionId + "'";
    const fileNameFilter = this.getEffectiveFileNameFilter();
    if (fileNameFilter.length > 0) {
      const escapedFileName = fileNameFilter.replaceAll("'", "''");
      sql += "::FileName='" + escapedFileName + "'";
    }
    return "addSql::" + sql;
  }

  private appendFileNameAddSqlIfNeeded(transType: string): void {
    if (transType === '837P' || transType === '837I' || transType === '837D') {
      return;
    }
    const fileNameFilter = this.getEffectiveFileNameFilter();
    if (fileNameFilter.length > 0) {
      const escapedFileName = fileNameFilter.replaceAll("'", "''");
      this.paramsList.push("addSql::FileName='" + escapedFileName + "'");
    }
  }

  private getEffectiveFileNameFilter(): string {
    const fromAdditionalSearch = this.extractFileNameFromAdditionalSearch(this.additionalSearchStr || '');
    if (fromAdditionalSearch.length > 0) {
      return fromAdditionalSearch;
    }

    const fromStaticSearch = this.extractFileNameFromAdditionalSearch(this.staticSearchStr || '');
    if (fromStaticSearch.length > 0) {
      return fromStaticSearch;
    }

    return this.normalizeFileNameFilterValue(this.fileName || '');
  }

  private extractFileNameFromAdditionalSearch(search: string): string {
    if (!search) return '';

    const quotedMatch = search.match(/FileName\s*=\s*'([^']+)'/i);
    if (quotedMatch && quotedMatch[1]) {
      return this.normalizeFileNameFilterValue(quotedMatch[1]);
    }

    const unquotedMatch = search.match(/FileName\s*=\s*([^;\s]+)/i);
    if (unquotedMatch && unquotedMatch[1]) {
      return this.normalizeFileNameFilterValue(unquotedMatch[1]);
    }

    return '';
  }

  private normalizeFileNameFilterValue(raw: string): string {
    let value = (raw || '').trim();
    if (!value) return '';

    if (value.startsWith("'")) value = value.substring(1);
    if (value.endsWith("'")) value = value.substring(0, value.length - 1);
    return value.trim();
  }

  private isFileNameOnlyFilter(search: string): boolean {
    const value = (search || '').trim();
    if (!value) return false;

    if (value.indexOf(' AND ') >= 0 || value.indexOf(';') >= 0) {
      return false;
    }

    return /^FileName\s*=\s*'[^']+'$/i.test(value);
  }

  private handleFetchResult(res: any) {
    this.dataSource.data = res;
    this.dataSource.sort = this.sort;
    this.canRenderDetails = true;
    this.loading = false;
    console.info("Data rows array: " + this.dataSource.data.length);
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

resetCustomFields(): void {
  const formArr = this.form.get('additional') as FormArray;

  if (formArr.length >= 1) {
    for (let i = 0; i < formArr.length; i++) {
      const fGrp = formArr.at(i) as FormGroup;
      fGrp.controls.newFldValue.setValue('');
      fGrp.controls.newFldValue.markAsPristine();
      fGrp.controls.newFldValue.markAsUntouched();
    }
  }

  this.additionalSearchStr = '';
  this.staticSearchStr = '';
  this.fileName = '';
  this.requestId = '';
}

hasCustomFieldContent(): boolean {
  const formArr = this.form.get('additional') as FormArray;

  if (!formArr || formArr.length === 0) {
    return false;
  }

  for (let i = 0; i < formArr.length; i++) {
    const fGrp = formArr.at(i) as FormGroup;
    const fieldValue = fGrp.controls.newFldValue.value;
    if (fieldValue && String(fieldValue).trim() !== '') {
      return true;
    }
  }

  return false;
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

  // Preserve additionalSearchStr (filename filter) instead of clearing it
  const preservedAdditionalSearch = this.additionalSearchStr;

  if(this.form.controls.transType.value !== this.formFields.currentTransType &&
    this.form.controls.mode.value !== this.formFields.mode)
  {
    this.clearSearch();
  }
  this.formFields.currentTransType = this.form.controls.transType.value;
  this.formFields.mode = this.form.controls.mode.value;

  // Restore additionalSearchStr after cleanup
  this.additionalSearchStr = preservedAdditionalSearch;

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
    }
  });

  // Only call updateCustomFlds and onSearchTransactions if we're not handling additionalSearch
  // (additionalSearch will be handled by handleCustomFieldsAndSearch in ngOnInit)
  if (!this.additionalSearchStr || this.additionalSearchStr.trim().length === 0) {
    this.updateCustomFlds();
    this.onSearchTransactions();
  }


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
  this.resetQueryParamSearchValues('start date changed');
  console.log('Input value changed:', newValue +", " + this.formFields.startDate);
}

onStTimeChange(event: Event)
{

  // Get the new input value
  const newValue = (event.target as HTMLInputElement).value;
  // Perform actions based on the new value
  this.formFields.startTm = newValue;
  this.resetQueryParamSearchValues('start time changed');
  console.log('Input value changed:', newValue +", " + this.formFields.startTm);
}

onEndDateChange(event: Event)
{

  // Get the new input value
  const newValue = (event.target as HTMLInputElement).value;
  // Perform actions based on the new value
  this.formFields.endDate = newValue;
  this.resetQueryParamSearchValues('end date changed');
  console.log('Input value changed:', newValue +", " + this.formFields.endDate);
}

onEndTimeChange(event: Event)
{

  // Get the new input value
  const newValue = (event.target as HTMLInputElement).value;
  // Perform actions based on the new value
  this.formFields.endTm = newValue;
  this.resetQueryParamSearchValues('end time changed');
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
  let item: Item ={ID: row.ID, rowId: ind, sessionId: row.SessionID, status: row.Status};
  this.contextMenu.menuData = { 'item': item };
  this.contextMenu.menu.focusFirstItem('mouse');
  this.contextMenu.openMenu();
}


  handleContextMenu(item: Item, menu: string)  {
    console.log('Click on Action 2 ' + item.ID + ", " + menu);
    this.transUserFlds = "";
    this.paramsList.forEach(val => {
      this.transUserFlds += val + ";";
    });
    const jsonString = JSON.stringify(this.formFields);
    if (menu === 'WorkFlow') {
      console.log('Item: ' + item.ID + ", " + item.sessionId);
      this.storageService.removeItem("currentTab");
      this.storageService.setItem("currentTab", "Work Flow");
      const baseHref = document.querySelector('base')?.getAttribute('href') || '/';
      const normalizedBase = baseHref.endsWith('/') ? baseHref.slice(0, -1) : baseHref;
      const query = new URLSearchParams();
      query.set('TransId', String(item.ID));
      query.set('sessionID', item.sessionId || '');
      query.set('Status', item.status || '');
      query.set('mode', this.formFields.mode || '');
      query.set('TransactionType', this.formFields.currentTransType || '');
      const url = `${normalizedBase}/workflow/rdpValidationErrors?${query.toString()}`;
      console.log("Details in new tab URL: " + url);
      const newTab = window.open(url, '_blank');
      if (newTab) {
        newTab.opener = null;
      }
    } else if (menu === 'Details in Same Window') {
      this.transUserFlds += ";sameWindow::true";
      this.router.navigate(["/transaction/transaction-details/"],
        {
          queryParams: {
            ID: item.ID,
            'transConfig': jsonString,
            'transaction': this.form.controls.transType.value,
            'sessionID': item.sessionId,
            'Status': item.status,
            'additionalSearch': this.staticSearchStr,
            'searchTypeString': this.transUserFlds
          }
        }
      );
    } else {
      this.transUserFlds += ";sameWindow::false";
      const jsonString = JSON.stringify(this.formFields);
      const baseHref = document.querySelector('base')?.getAttribute('href') || '/';
      const normalizedBase = baseHref.endsWith('/') ? baseHref.slice(0, -1) : baseHref;
      const query = new URLSearchParams();
      query.set('ID', String(item.ID));
      query.set('transConfig', jsonString);
      query.set('transaction', this.form.controls.transType.value);
      query.set('mode', this.form.controls.mode.value);
      query.set('sessionID', item.sessionId || '');
      query.set('Status', item.status || '');
      query.set('additionalSearch', this.staticSearchStr || '');
      query.set('searchTypeString', this.transUserFlds || '');
      query.set('openDetails', 'true');
      const targetUrl = `${normalizedBase}/transaction/transaction-details?${query.toString()}`;
      console.log("Details in new tab URL: " + targetUrl);
      const newTab = window.open(targetUrl, '_blank');
      if (newTab) {
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
  status?: string;
}

export interface customSearchStruct {
  key: string;
  label: string;
  transactionCode: string;
}

