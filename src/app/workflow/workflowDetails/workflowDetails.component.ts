import { Component, OnInit, Input, Output, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';

import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';


import {WfRestServiceComponent} from '../../services/wfrest-service.component';
import { StorageService } from '../../services/storage.service';

import { MatTable,  MatTableDataSource } from '@angular/material/table';


import { Router, ActivatedRoute } from '@angular/router';
import {SelectionModel} from '@angular/cdk/collections';
import { BrowserModule } from '@angular/platform-browser';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { first } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {x12err} from './WfDetails';
import { Console } from 'node:console';
import { downloadTextFile } from '../../utils/file-download.util';
import { TpRestServiceComponent } from '../../services/tprest-service.component';
import { ConfirmDialogComponent } from '../../confirm-dialog/confirm-dialog.component';
import { WorkFlowEntry } from '../WorkFlowEntry';
import { tpLinks } from '../../tradingPartners/tpIds/tp-links/tp-links';

@Component({
    selector: 'app-workflowDetails',
    templateUrl: './workflowDetails.component.html',
    styleUrls: ['./workflowDetails.component.css'],
    standalone: false
})



export class WorkflowDetailsComponent implements OnInit, OnDestroy {
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


  wfStatus: string = "";
  transTypeStr = '';
  currentEntryTransactionType = '';
  wfMode = '';
  errorTypeStr = '';
  submitted = false;
  rowClicked:number;
  separator:string;
  dataError:boolean;

  tpId:string="";
  tpRelId:string="";
  tpExistsForError = false;
  tpExistsName = '';
  tpExistenceCheckedForId = '';
  tpExistencePopupShownForId = '';
  missingTpIds: string[] = [];
  existingTpIdsForError: string[] = [];
  existingTpNamesForError: string[] = [];
  tpLinkExistsForError = false;
  tpLinkExistenceCheckedSignature = '';
  tpLinkExistencePopupShownSignature = '';
  relationSenderTpId = '';
  relationReceiverTpId = '';
  relationVersion = '';
  relationMode = '';

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
    private tpService: TpRestServiceComponent,
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private storageService: StorageService,
    private dialog: MatDialog
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
      statusType: ['Resolved', Validators.required]
    });
    this.form.controls.statusType.setValue(this.statusTypes[0]);
    this.wfStatus = this.statusTypes[0];
    this.sub = this.route.queryParams.subscribe(params => this.handleQueryParams(params));
  }

  ngOnDestroy(): void {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  private handleQueryParams(searchParams: any) {
    this.currentEntryTransactionType = (searchParams['TransactionType'] || '').toString().trim();
    const sessionId = searchParams['sessionID'] || searchParams['SessionID'] || searchParams['SessionId'];
    if (sessionId !== undefined && sessionId !== null && sessionId !== '') {
      console.log("sessionID query sessionID provided!");
      this.wfStatus = searchParams['Status'] || searchParams['status'] || this.wfStatus;
      if (this.form?.controls?.statusType && this.wfStatus) {
        this.form.controls.statusType.setValue(this.wfStatus);
      }
      this.fileName = searchParams['searchParams'];
      this.getX12('ID=&SessionID=' + sessionId);
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
  this.currentEntryTransactionType = String(entry.TransactionType || this.currentEntryTransactionType || '').trim();
  const x12DataLns = entry.X12.split("~");
  this.separator = entry.X12.substr(3, 1);
  console.log("Sep: " + this.separator);
  const wfErr = String(entry.Error).replaceAll(";", "\n");
  console.warn('[WorkflowDetails] processX12Response error text', {
    workflowId: entry.ID,
    status: entry.Status,
    wfErr
  });
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
  const tpNotFoundLabel = "TP Not found:";
  const relationNotFoundLabel = "Relation Not found:";
  console.warn('[WorkflowDetails] extractTPInfo start', {
    workflowId: this.ID,
    wfErr
  });
  this.tpId = '';
  this.tpRelId = '';
  this.tpExistsForError = false;
  this.tpExistsName = '';
  this.missingTpIds = [];
  this.existingTpIdsForError = [];
  this.existingTpNamesForError = [];
  this.tpLinkExistsForError = false;
  this.tpLinkExistenceCheckedSignature = '';
  this.relationSenderTpId = '';
  this.relationReceiverTpId = '';
  this.relationVersion = '';
  this.relationMode = '';
  this.tpCreate = false;

  const tpMatches = Array.from(wfErr.matchAll(/TP Not found:\s*([^\r\n]+)/g));
  this.missingTpIds = tpMatches
    .map(match => (match[1] || '').trim())
    .filter((value, index, array) => value !== '' && array.indexOf(value) === index);

  console.warn('[WorkflowDetails] extractTPInfo parsed TPIDs', {
    workflowId: this.ID,
    missingTpIds: this.missingTpIds
  });

  if (this.missingTpIds.length > 0) {
    this.tpCreate = true;
    this.tpId = this.missingTpIds[0];
  }

  const tpInd = wfErr.indexOf(relationNotFoundLabel);
  if (tpInd >= 0) {
    this.tpCreate = true;
    this.tpRelId = wfErr.substring(tpInd + relationNotFoundLabel.length).trim();
  }

  const relationMatch = /Relation Not found:\s*([^\s,]+)\s*->\s*([^\s,]+)\s*,\s*Version:\s*([^,\r\n]+)\s*,\s*Mode:\s*([^,\r\n]+)/i.exec(wfErr);
  if (relationMatch) {
    this.relationSenderTpId = (relationMatch[1] || '').trim();
    this.relationReceiverTpId = (relationMatch[2] || '').trim();
    this.relationVersion = (relationMatch[3] || '').trim();
    this.relationMode = (relationMatch[4] || '').trim();
  }

  console.warn('[WorkflowDetails] extractTPInfo parsed relation/setup state', {
    workflowId: this.ID,
    tpId: this.tpId,
    tpRelId: this.tpRelId,
    tpCreate: this.tpCreate,
    relationSenderTpId: this.relationSenderTpId,
    relationReceiverTpId: this.relationReceiverTpId,
    relationVersion: this.relationVersion,
    relationMode: this.relationMode
  });

  this.updateTpCreateAvailability();
  this.checkExistingTpId();
}

private checkExistingTpId() {
  const currentTpIds = this.missingTpIds.map(id => id.trim()).filter(id => id !== '');
  const currentSignature = currentTpIds.join('|');
  console.warn('[WorkflowDetails] checkExistingTpId start', {
    workflowId: this.ID,
    currentTpIds,
    currentSignature,
    relation: this.tpRelId,
    cachedSignature: this.tpExistenceCheckedForId
  });
  if (currentTpIds.length <= 0) {
    console.warn('[WorkflowDetails] checkExistingTpId skipped', {
      reason: 'no-tpids',
      currentTpIds,
      currentSignature
    });
    this.checkExistingTpLink([]);
    return;
  }

  if (this.tpExistenceCheckedForId === currentSignature) {
    console.warn('[WorkflowDetails] checkExistingTpId skipped', {
      reason: 'already-checked',
      currentTpIds,
      currentSignature
    });
    return;
  }

  this.tpExistenceCheckedForId = currentSignature;
  forkJoin(
    currentTpIds.map(id =>
      (console.info('[WorkflowDetails] calling fetchTPforTpId', { workflowId: this.ID, tpId: id, urlHint: 'TPforTPID?tpid=' + id }),
      this.tpService.fetchTPforTpId(id).pipe(
        first(),
        catchError((error) => {
          console.error('[WorkflowDetails] fetchTPforTpId error', { workflowId: this.ID, tpId: id, error });
          return of(null);
        })
      ))
    )
  )
    .subscribe({
      next: (results: any[]) => {
        console.info('[WorkflowDetails] fetchTPforTpId responses received', {
          workflowId: this.ID,
          currentTpIds,
          results
        });
        const existingTpIds: string[] = [];
        const existingTpNames: string[] = [];
        const missingTpIds: string[] = [];

        currentTpIds.forEach((id, index) => {
          const matches = this.normalizeTpLookupResult(results[index]);
          console.info('[WorkflowDetails] normalized TP lookup result', {
            workflowId: this.ID,
            tpId: id,
            rawResult: results[index],
            normalizedMatches: matches
          });
          if (matches.length > 0) {
            existingTpIds.push(id);
            const tpName = matches[0].Name || '';
            if (tpName !== '') {
              existingTpNames.push(`${id} → ${tpName}`);
            } else {
              existingTpNames.push(id);
            }
          } else {
            missingTpIds.push(id);
          }
        });

        this.missingTpIds = missingTpIds;
        this.existingTpIdsForError = existingTpIds;
        this.existingTpNamesForError = existingTpNames;
        this.tpExistsForError = existingTpIds.length > 0;
        this.tpExistsName = existingTpNames.length > 0 ? existingTpNames[0] : '';
        this.tpId = missingTpIds.length > 0 ? missingTpIds[0] : '';
        this.updateTpCreateAvailability();
        console.info('[WorkflowDetails] TP existence decision', {
          workflowId: this.ID,
          existingTpIds,
          existingTpNames,
          missingTpIds,
          nextTpIdForSetup: this.tpId,
          tpCreate: this.tpCreate,
          tpRelId: this.tpRelId
        });

        this.checkExistingTpLink(missingTpIds);

  // Only show TPID popup if some are MISSING but others exist (partial match)
  // Don't show if all are found or if none are found
  if (existingTpIds.length > 0 && missingTpIds.length > 0 && this.tpExistencePopupShownForId !== currentSignature) {
          this.tpExistencePopupShownForId = currentSignature;
          this.dialog.open(ConfirmDialogComponent, {
            width: '680px',
            maxWidth: '90vw',
            data: {
              title: 'Some TPIDs found, some missing',
              message:
                'Found TPID(s): ' + existingTpNames.join(', ') +
                '\n\nStill missing: ' + missingTpIds.join(', ') +
                '\n\nThe workflow error may be partially resolved. Continue with relation setup if needed.',
              cancelText: 'OK',
              showConfirm: false
            }
          });
        }
      }
    });
}

private checkExistingTpLink(unresolvedTpIds: string[]) {
  const sender = (this.relationSenderTpId || '').trim();
  const receiver = (this.relationReceiverTpId || '').trim();
  const version = (this.relationVersion || '').trim();
  const mode = (this.relationMode || '').trim();
  const unresolved = (unresolvedTpIds || []).map(id => (id || '').trim()).filter(id => id !== '');

  const signature = `${sender}|${receiver}|${version}|${mode}`;
  console.warn('[WorkflowDetails] checkExistingTpLink start', {
    workflowId: this.ID,
    sender,
    receiver,
    version,
    mode,
    unresolved,
    signature,
    cachedSignature: this.tpLinkExistenceCheckedSignature
  });

  if (sender === '' || receiver === '' || mode === '' || version === '') {
    console.warn('[WorkflowDetails] checkExistingTpLink skipped', { reason: 'relation-fields-missing', sender, receiver, version, mode });
    return;
  }

  if (unresolved.includes(sender) || unresolved.includes(receiver)) {
    console.warn('[WorkflowDetails] checkExistingTpLink skipped', { reason: 'tpid-still-missing', unresolved, sender, receiver });
    return;
  }

  if (this.tpLinkExistenceCheckedSignature === signature) {
    console.warn('[WorkflowDetails] checkExistingTpLink skipped', { reason: 'already-checked', signature });
    return;
  }

  this.tpLinkExistenceCheckedSignature = signature;
  const preferredTpId = (this.tpId || '').trim();
  const lookupTpId = (preferredTpId !== '' ? preferredTpId : '') || sender;
  console.info('[WorkflowDetails] checkExistingTpLink lookup TPID', {
    workflowId: this.ID,
    lookupTpId,
    preferredTpId,
    sender,
    receiver,
    unresolved,
    missingTpIds: this.missingTpIds
  });
  this.tpService.fetchTpLinks(lookupTpId).pipe(
    first(),
    catchError((error) => {
      console.error('[WorkflowDetails] fetchTpLinks error', { workflowId: this.ID, tpId: lookupTpId, error });
      return of([] as tpLinks[]);
    })
  ).subscribe((links: tpLinks[]) => {
    const uniqueLinks = (links || []).filter((link, index, array) => {
      const key = `${link?.ID || ''}|${link?.Link || ''}|${link?.IsaSenderId || ''}|${link?.IsaReceiverId || ''}|${link?.Mode || ''}|${link?.TransType || ''}|${link?.TransactionSetId || ''}`;
      return array.findIndex(item => `${item?.ID || ''}|${item?.Link || ''}|${item?.IsaSenderId || ''}|${item?.IsaReceiverId || ''}|${item?.Mode || ''}|${item?.TransType || ''}|${item?.TransactionSetId || ''}` === key) === index;
    });

    const normalize = (value: any) => String(value || '').trim().toLowerCase();
    const senderNorm = normalize(sender);
    const receiverNorm = normalize(receiver);
    const modeNorm = normalize(mode);
    const versionNorm = normalize(version);

    const matches = uniqueLinks.filter(link => {
      const isaSender = normalize(link?.IsaSenderId);
      const isaReceiver = normalize(link?.IsaReceiverId);
      const gsSender = normalize(link?.GsSenderId);
      const gsReceiver = normalize(link?.GsReceiverId);
      const modeMatches = normalize(link?.Mode) === modeNorm;
      const tpidMatches =
        (isaSender === senderNorm && isaReceiver === receiverNorm) ||
        (isaSender === receiverNorm && isaReceiver === senderNorm) ||
        (gsSender === senderNorm && gsReceiver === receiverNorm) ||
        (gsSender === receiverNorm && gsReceiver === senderNorm);
      const transType = normalize(link?.TransType);
      const transactionSetId = normalize(link?.TransactionSetId);
      const transactionMatches = transType.includes(versionNorm) || transactionSetId.includes(versionNorm);
      return modeMatches && tpidMatches && transactionMatches;
    });

    this.tpLinkExistsForError = matches.length > 0;
    this.updateTpCreateAvailability();

    console.info('[WorkflowDetails] TP link existence decision', {
      workflowId: this.ID,
      sender,
      receiver,
      version,
      mode,
      lookupTpId,
      totalLinksFetched: uniqueLinks.length,
      matchedLinks: matches.map(link => ({
        ID: link?.ID,
        Link: link?.Link,
        IsaSenderId: link?.IsaSenderId,
        IsaReceiverId: link?.IsaReceiverId,
        Mode: link?.Mode,
        TransType: link?.TransType,
        TransactionSetId: link?.TransactionSetId
      })),
      tpLinkExistsForError: this.tpLinkExistsForError,
      tpCreate: this.tpCreate
    });

    if (this.tpLinkExistsForError && this.tpLinkExistencePopupShownSignature !== signature) {
      this.tpLinkExistencePopupShownSignature = signature;
      const transactionType = this.currentEntryTransactionType || this.transTypeStr || '';
      this.dialog.open(ConfirmDialogComponent, {
        width: '680px',
        maxWidth: '90vw',
        data: {
          title: 'TP Link already exists',
          message:
            'A TP Link already exists for:\n' +
            `${sender} -> ${receiver}\n` +
            `Version: ${version}\n` +
            `Mode: ${mode}\n\n` +
            'The original relation-not-found workflow error may be outdated.\n\n' +
            'Click "Close WF Entries" to close all matching open workflow entries.',
          cancelText: 'Cancel',
          confirmText: 'Close WF Entries',
          confirmClass: '',
          showConfirm: true
        }
      }).afterClosed().pipe(first()).subscribe((confirmed: boolean) => {
        if (confirmed) {
          this.closeMatchingWfEntries(sender, receiver, mode, transactionType);
        }
      });
    }
  });
}

private closeMatchingWfEntries(sender: string, receiver: string, mode: string, transactionType: string) {
  const statusCriteria = '!= Resolved, != Ignored';
  const searchParams: string[] = [
    'senderID::' + sender,
    'receiverID::' + receiver,
    'mode::' + mode,
    'ErrorType::TP',
    'StatusTypes::All'
  ];
  if (transactionType && transactionType !== '' && transactionType.toLowerCase() !== 'all') {
    searchParams.push('TransactionType::' + transactionType);
  }
  const displayParams = [
    'Sender: ' + sender,
    'Receiver: ' + receiver,
    'Mode: ' + mode,
    'Transaction: ' + (transactionType || 'All'),
    'StatusTypes: ' + statusCriteria,
    'ErrorType: TP'
  ].join('\n');

  console.info('[WorkflowDetails] closeMatchingWfEntries fetching', { sender, receiver, mode, transactionType, searchParams });
  this.WfService.fetchWorkFlowItems(mode, [...searchParams]).subscribe({
    next: (rawEntries: WorkFlowEntry[]) => {
      // Always include the current entry — it's the one the user clicked
      const searchResults = (rawEntries || []).filter(e =>
        e.WorkStatus !== 'Resolved' && e.WorkStatus !== 'Ignored'
      );
      let closeable = searchResults;
      
      // Guarantee current entry is always closeable, even if not in search results or already resolved
      if (this.ID && !closeable.some(e => String(e.ID) === String(this.ID))) {
        console.error('[WorkflowDetails] closeMatchingWfEntries CURRENT ENTRY NOT IN CLOSEABLE RESULTS — FORCING IT IN', {
          currentEntry: {
            ID: this.ID,
            WorkStatus: this.wfCurrentStat,
            senderTpId: this.relationSenderTpId,
            receiverTpId: this.relationReceiverTpId,
            TransactionType: this.transTypeStr,
            ErrorType: this.errorTypeStr
          },
          searchCondition: {
            senderID: sender,
            receiverID: receiver,
            mode: mode,
            transactionType: transactionType,
            ErrorType: 'TP',
            StatusTypes: 'All'
          },
          searchParams,
          searchResultCount: (rawEntries || []).length,
          closeableCount: closeable.length
        });
        closeable = [...closeable, { ID: this.ID, WorkStatus: this.wfCurrentStat } as WorkFlowEntry];
      }
      console.info('[WorkflowDetails] closeMatchingWfEntries found', { searchResults: searchResults.length, closeable: closeable.length });

      if (closeable.length === 0) {
        this.dialog.open(ConfirmDialogComponent, {
          width: '560px', maxWidth: '90vw',
          data: {
            title: 'No entries to close',
            message: 'No open workflow entries found matching:\n\n' + displayParams,
            cancelText: 'OK', showConfirm: false
          }
        });
        return;
      }

      forkJoin(
        closeable.map(entry =>
          this.WfService.updateWorkFlowItem(mode, [
            'ID::' + entry.ID,
            'Status::Resolved',
            'AssignedUser::'
          ]).pipe(
            first(),
            catchError(err => {
              console.error('[WorkflowDetails] closeMatchingWfEntries update error', { id: entry.ID, err });
              return of(null);
            })
          )
        )
      ).subscribe(() => {
        this.dialog.open(ConfirmDialogComponent, {
          width: '560px', maxWidth: '90vw',
          data: {
            title: 'Workflow entries closed',
            message:
              closeable.length + ' workflow entr' + (closeable.length === 1 ? 'y' : 'ies') +
              ' closed as Resolved.\n\n' +
              'Parameters used:\n' + displayParams +
              '\n\nEntry IDs: ' + closeable.map(e => e.ID).join(', '),
            cancelText: 'OK', showConfirm: false
          }
        });
      });
    },
    error: (err) => {
      console.error('[WorkflowDetails] closeMatchingWfEntries fetch error', err);
      this.dialog.open(ConfirmDialogComponent, {
        width: '560px', maxWidth: '90vw',
        data: { title: 'Error', message: 'Failed to fetch workflow entries. Please try again.', cancelText: 'OK', showConfirm: false }
      });
    }
  });
}

private normalizeTpLookupResult(res: any): any[] {
  console.info('[WorkflowDetails] normalizeTpLookupResult input', {
    workflowId: this.ID,
    resultType: Array.isArray(res) ? 'array' : typeof res,
    result: res
  });
  if (!res) {
    return [];
  }

  if (Array.isArray(res)) {
    return res.filter(item => item && item.Name !== undefined && item.Name !== '');
  }

  if (typeof res === 'object') {
    const values = Object.values(res);
    console.info('[WorkflowDetails] normalizeTpLookupResult object values', {
      workflowId: this.ID,
      values
    });
    return values.filter((item: any) => item && typeof item === 'object' && item.Name !== undefined && item.Name !== '');
  }

  return [];
}

private updateTpCreateAvailability() {
  this.tpCreate = (this.tpRelId !== '' && !this.tpLinkExistsForError) || (this.tpId !== '' && !this.tpExistsForError);
  console.warn('[WorkflowDetails] updateTpCreateAvailability', {
    workflowId: this.ID,
    tpId: this.tpId,
    tpRelId: this.tpRelId,
    tpExistsForError: this.tpExistsForError,
    tpLinkExistsForError: this.tpLinkExistsForError,
    tpCreate: this.tpCreate
  });
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
    this.storageService.setItem("FromWorkflowTp", "true");
    this.storageService.removeItem("TpOperation");
    this.storageService.removeItem("NewTpId");
    this.storageService.removeItem("NewTpRelId");
    this.storageService.setItem("NewWfId", this.ID || "");
    this.storageService.setItem("NewWfMode", this.wfMode || "");
    this.storageService.setItem("NewWfStatus", this.wfCurrentStat || this.wfStatus || "");
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
    const tpOperation = this.storageService.getItem<string>("TpOperation") || "";
    if (tpOperation.indexOf("tp-add") >= 0) {
      this.router.navigate(["/TradingPartners/tp-add"], {
        queryParams: { fromWorkflowTp: 'true' }
      });
    } else if (tpOperation.indexOf("tpLink-add") >= 0) {
      this.router.navigate(["/TradingPartners/tpIds/tp-links/add-edit/tp-add/WF/TPID"], {
        queryParams: { fromWorkflowTp: 'true' }
      });
    } else {
      this.router.navigate(["/TradingPartners"], {
        queryParams: { fromWorkflowTp: 'true' }
      });
    }
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
