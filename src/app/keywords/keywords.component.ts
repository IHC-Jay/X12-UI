import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatMenuTrigger } from '@angular/material/menu';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';

import { KwRestServiceComponent } from '../services/kwrest-service.component';
import { KeywordEntry } from './KeywordEntry';
import { KeywordsDetailDialogComponent } from './keywords-detail-dialog.component';
import { environment } from '../../environments/environment';
import { StorageService } from '../services/storage.service';
import { DateTimeUtils } from '../utils/date-time.utils';
import { parseDays } from '../utils/parseDays';

@Component({
  selector: 'app-keywords',
  templateUrl: './keywords.component.html',
  styleUrls: ['./keywords.component.css'],
  standalone: false
})
export class KeywordsComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('dataPaginator') dataPaginator: MatPaginator;
  @ViewChild('contextMenuTrigger') contextMenu: MatMenuTrigger;
  @ViewChild(MatSort)
  set matSort(sort: MatSort) {
    this.sort = sort;
    this.dataSource.sort = this.sort;
  }
  sort: MatSort;
  contextMenuPosition = { x: '0px', y: '0px' };
  selectedRow: KeywordEntry | null = null;

  form!: FormGroup;

  dataSource = new MatTableDataSource<KeywordEntry>();

  canRenderDetails = false;
  loading = false;

  pageLength = 0;
  initialTotalCount = 0;
  currentRemainingCount = 0;
  pageIndex = 0;
  currentPageIndex = 0;
  pageSize = 25;
  startX12Id = 1;
  lastRowId = 1;

  startDate = '';
  startTm = '';
  endDate = '';
  endTm = '';
  env = 'DEV';

  isSHOrg = (`${environment.org}` === 'SH');

  displayedColumns: string[] = [
    'ID',
    'ReceiptDtTm',
    'ApplicationSendersCode',
    'BillingProviderName',
    'ClaimTotalcharge',
    'ClearinghouseTraceNumber',
    'PatientControlNumber',
    'SubscriberIdentifier',
    'SubscriberName'
  ];

  private sub: Subscription | undefined;
  private paramsList: string[] = [];

  constructor(
    private kwService: KwRestServiceComponent,
    private formBuilder: FormBuilder,
    private storageService: StorageService,
    public dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.storageService.setItem('currentTab', 'Keywords');
    this.initDates();
    this.initFromUserConfig();
    this.initForm();
    this.kwService.setEnvironment(this.env);
    if (this.isSHOrg) {
      this.onSearch();
    }
  }

  ngAfterViewInit(): void {
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  ngOnDestroy(): void {
    if (this.sub) { this.sub.unsubscribe(); }
  }

  private initDates(): void {
    const range = DateTimeUtils.GetStartEndDtTm(1);
    this.startDate = range.startDt;
    this.startTm = range.startTm;
    this.endDate = range.endDt;
    this.endTm = range.endTm;
  }

  private initFromUserConfig(): void {
    const userConfig = this.storageService.getItem<string>('UserConfig');
    if (!userConfig) {
      return;
    }

    try {
      const parsedObject = JSON.parse(userConfig);
      if (!parsedObject?.TranTime) {
        return;
      }

      const stDt = parseDays(parsedObject.TranTime);
      const dtObj = DateTimeUtils.GetStartEndDtTm(stDt);
      this.startDate = dtObj.startDt;
      this.startTm = dtObj.startTm;
      this.endDate = dtObj.endDt;
      this.endTm = dtObj.endTm;
      console.info('[Keywords] Init from UserConfig TranTime: ' + parsedObject.TranTime);
    } catch (error) {
      console.warn('[Keywords] Failed to parse UserConfig', error);
    }
  }

  private initForm(): void {
    this.form = this.formBuilder.group({
      startDate: [this.startDate],
      startTm: [this.startTm],
      endDate: [this.endDate],
      endTm: [this.endTm],
      senderID: [''],
      receiverID: [''],
      batchControlNumber: [''],
      subscriberName: [''],
      subscriberIdentifier: [''],
      additionalSearch: ['']
    });
  }

  onStartDateChange(event: any): void {
    this.startDate = event.target.value;
  }

  onEndDateChange(event: any): void {
    this.endDate = event.target.value;
  }

  onStartTimeChange(event: any): void {
    this.startTm = event.target.value;
  }

  onEndTimeChange(event: any): void {
    this.endTm = event.target.value;
  }

  onSearch(resetPage: boolean = true): void {
    if (!this.isSHOrg) {
      alert('Keywords search is not available for this organization.');
      return;
    }

    if (resetPage) {
      this.currentPageIndex = 0;
      this.startX12Id = 1;
      this.initialTotalCount = 0;
      this.currentRemainingCount = 0;
      if (this.dataPaginator) {
        this.dataPaginator.pageIndex = 0;
      }
    }

    this.loading = true;
    this.canRenderDetails = false;

    const f = this.form.controls;
    this.paramsList = [];

    if (this.startDate) { this.paramsList.push('startDtTm::' + this.startDate + ' ' + this.startTm); }
    if (this.endDate)   { this.paramsList.push('endDtTm::' + this.endDate + ' ' + this.endTm); }
    this.appendCombinedSearchAddSqlIfNeeded();

    this.paramsList.push('pageIndex::' + this.currentPageIndex);
    this.paramsList.push('pageSize::' + this.pageSize);
    this.paramsList.push('startX12Id::' + this.startX12Id);

    console.info('[Keywords] Calling fetchKeywords', this.paramsList);

    this.sub = this.kwService.fetchKeywords(this.paramsList).subscribe({
      next: (res) => {
        this.dataSource.data = res.Items ?? [];
        const rows = this.dataSource.data;
        if (rows && rows.length > 0) {
          const lastId = Number(rows[rows.length - 1].ID);
          this.lastRowId = Number.isFinite(lastId) ? lastId : this.lastRowId;
        }
        const responseTotal = Number(res.totalCount ?? res.Items?.length ?? 0);
        this.currentRemainingCount = Number.isFinite(responseTotal) ? responseTotal : (res.Items?.length ?? 0);
        if (this.initialTotalCount === 0) {
          this.initialTotalCount = this.currentRemainingCount;
        }
        this.pageLength = this.initialTotalCount;
        this.canRenderDetails = true;
        this.loading = false;
        console.log('[Keywords] rows:', this.dataSource.data.length, 'total:', this.pageLength);
      },
      error: (err) => {
        console.error('[Keywords] fetch error', err);
        this.dataSource.data = [];
        this.loading = false;
        this.canRenderDetails = true;
        alert('Error fetching Keywords: ' + err);
      }
    });
  }

  onPaginateChange(event: any): void {
    this.currentPageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.startX12Id = this.lastRowId;
    this.onSearch(false);
  }

  clearSearch(): void {
    this.form.reset({
      startDate: this.startDate,
      startTm: this.startTm,
      endDate: this.endDate,
      endTm: this.endTm,
      senderID: '',
      receiverID: '',
      batchControlNumber: '',
      subscriberName: '',
      subscriberIdentifier: '',
      additionalSearch: ''
    });
    this.dataSource.data = [];
    this.canRenderDetails = false;
    this.pageLength = 0;
    this.initialTotalCount = 0;
    this.currentRemainingCount = 0;
    this.startX12Id = 1;
    this.lastRowId = 1;
  }

  getResultCountSummary(): string {
    if (!this.canRenderDetails) {
      return '';
    }

    const loaded = this.dataSource.data?.length ?? 0;
    const initial = this.initialTotalCount;
    const remaining = this.currentRemainingCount;

    if (initial <= 0) {
      return loaded > 0 ? `Showing 1-${loaded}` : '';
    }

    const start = Math.max(initial - remaining + 1, 1);
    const end = loaded > 0 ? (start + loaded - 1) : (start - 1);

    return loaded > 0
      ? `Showing ${start}-${end} of ${initial} (${remaining} remaining)`
      : `Showing 0 of ${initial} (${remaining} remaining)`;
  }

  private appendCombinedSearchAddSqlIfNeeded(): void {
    const f = this.form.controls;
    const clauses: string[] = [];

    const appendEqualsClause = (fieldName: string, controlName: string): void => {
      const rawValue = (f[controlName]?.value || '').toString().trim();
      if (!rawValue) {
        return;
      }
      const escapedValue = rawValue.replaceAll("'", "''");
      clauses.push(`${fieldName}='${escapedValue}'`);
    };

    appendEqualsClause('senderID', 'senderID');
    appendEqualsClause('receiverID', 'receiverID');
    appendEqualsClause('batchControlNumber', 'batchControlNumber');
    appendEqualsClause('subscriberName', 'subscriberName');
    appendEqualsClause('subscriberIdentifier', 'subscriberIdentifier');

    const additionalSearch = (f['additionalSearch']?.value || '').toString().trim();
    if (additionalSearch) {
      clauses.push(additionalSearch);
    }

    if (clauses.length > 0) {
      this.paramsList.push('addSql::' + clauses.join(' AND '));
    }
  }

  onContextMenu(event: MouseEvent, row: KeywordEntry): void {
    event.preventDefault();
    this.selectedRow = row;
    this.contextMenuPosition.x = event.clientX + 'px';
    this.contextMenuPosition.y = event.clientY + 'px';
    this.contextMenu.menuData = { item: row };
    this.contextMenu.menu.focusFirstItem('mouse');
    this.contextMenu.openMenu();
  }

  handleContextMenu(row: KeywordEntry, menu: string): void {
    if (menu !== 'Details') {
      return;
    }
    this.dialog.open(KeywordsDetailDialogComponent, {
      width: '1300px',
      maxWidth: '95vw',
      data: row
    });
  }
}
