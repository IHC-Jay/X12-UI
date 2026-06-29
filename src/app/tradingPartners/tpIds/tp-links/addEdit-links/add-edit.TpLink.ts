import { Component,   ViewChildren,  ElementRef,  ChangeDetectorRef,  QueryList, OnInit, inject } from '@angular/core';
import { Router, ActivatedRoute, RouteConfigLoadEnd } from '@angular/router';
import { AbstractControlOptions, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';
import { FormsModule, ReactiveFormsModule, FormGroupDirective } from '@angular/forms';
import { TpRestServiceComponent } from '../../../../services/tprest-service.component';
import { EventListenerFocusTrapInertStrategy } from '@angular/cdk/a11y';
import { tpLinks } from '../tp-links';
import { CreateNoteComponent } from '../create-note/create-note.component';
import { SingleNoteComponent } from '../single-note/single-note.component';
import { environment } from '../../../../../environments/environment';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import { WfRestServiceComponent } from '../../../../services/wfrest-service.component';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../../../confirm-dialog/confirm-dialog.component';

export class TransTypes
{
  NAME:string;
  TransactionSetId:string;
  VERSION: string;
}

export class KVP {
  id: number;
  Key: string;
  Value: string;

}

@Component(
  {
    selector: 'add-edit.TpLink',
    templateUrl: './add-edit.TpLink.html',
    styleUrls: ['./add-edit.TpLink.css'],
    standalone: false
})


export class AddEditTpLink implements OnInit {
    form!: FormGroup;
    tpLinkNm!: string;
    tpName:string;
    parentTpId!: string;
    sendertpIdHelp: string;
    receivertpIdHelp: string;
    isAddMode!: boolean;
    loading = false;
    batchMode: boolean = true;
    showTpIds: boolean = false;
    submitted = false;
    transaction835:boolean = false;
    routeVal:string ='';
    private _snackBar = inject(MatSnackBar);


    sendingTpIds = [];
    ackTypes:string[] = ["ERROR","ALWAYS","NEVER"];
    snipValues:string[] = ["0","1","2"];
    direcTypes:string[]



    modeTypes:string[] = ["Batch","RT"];
    routingTypes:string[];

    receivingTpIds = [];
    ownerTpIds = [];
    canRender = false;
    transaction: string = "";
    workflowMode: string = "";
    sub:any;
    customProp: KVP[] = [];
    workflowEntryId: string = '';
    workflowEntryStatus: string = '';

    trn: tpLinks;

    transactionTypes: TransTypes[];


    @ViewChildren("input") inputs: QueryList<ElementRef>;

    constructor(
        private formBuilder: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private tpService: TpRestServiceComponent,
      private wfService: WfRestServiceComponent,
      private dialog: MatDialog,
        private cdRef: ChangeDetectorRef
    ) {

     }

public initializeData()
{
  console.info("1. fetchTpIds");

  this.tpService.fetchOwnerTpIds().subscribe((res: any) => {

    if (this.ownerTpIds.length <= 0)
    {

        res.forEach((entry) => {

        this.ownerTpIds.push(entry.TPID);
        // console.info("Owner TPID: " + entry.TPID);

        });
    }


  console.info("2. fetchTransactionTypes");
  this.tpService.fetchTransactionTypes().subscribe((res: any) => {

    this.transactionTypes = res;
    this.canRender = true;
  } );
 });
}

    async ngOnInit() {
      console.info("AddEditTpLink ngOnInit");

      this.setDirectionTypes();
      this.initForm();
      this.handleWorkflowOrRouteParams();
      this.initializeData();
      await this.waitForCanRender();
      this.handleFormPopulation();
    }

    /**
     * Set direction types based on environment
     */
    private setDirectionTypes() {
      if (`${environment.org}` == 'SH') {
        this.direcTypes = ["In", "Out"];
      } else {
        this.direcTypes = ["Out", "In"];
      }
    }

    /**
     * Initialize the reactive form
     */
    private initForm() {
      this.form = this.formBuilder.group({
        ParentTpId: [''],
        ID: [''],
        Link: ['', Validators.required],
        TransType: ['', Validators.required],
        TransactionSetId: [''],
        Mode: ['', Validators.required],
        Direction: ['', Validators.required],
        ISAAck: ['', Validators.required],
        GSAck: ['', Validators.required],
        STAck: ['', Validators.required],
        GsReceiverId: ['', Validators.required],
        GsSenderId: ['', Validators.required],
        IsaSenderId: ['', Validators.required],
        IsaReceiverId: ['', Validators.required],
        Routing: ['', Validators.required],
        SNIP: ['', Validators.required],
        Separators: ['|*^:', Validators.maxLength(4)],
        ValidationRuleFile: [''],
        UniqueId: [''],
        MergeFlg: [''],
        customProp: [''],
        Active: ['']
      });
    }

    /**
     * Handle session workflow or route params to set up form state
     */
    private handleWorkflowOrRouteParams() {
      if (sessionStorage.getItem("NewTpRelId") !== null) {
        this.handleSessionWorkflow();
      } else {
        this.handleRouteParams();
      }
    }

    private handleSessionWorkflow() {
      let inpStr = sessionStorage.getItem("NewTpRelId") || '';
      console.info('Set TPID: ' + inpStr);
      this.workflowEntryId = sessionStorage.getItem('NewWfId') || '';
      this.workflowMode = sessionStorage.getItem('NewWfMode') || this.workflowMode;
      this.workflowEntryStatus = sessionStorage.getItem('NewWfStatus') || '';

      const stripWrapQuotes = (value: string) => {
        return (value || '').trim().replace(/^["']+|["']+$/g, '').trim();
      };

      const normalizeToken = (value: string) => {
        return stripWrapQuotes(value).replace(/[\s,.;]+$/g, '').trim();
      };

      try {
        const relationPattern = /^\s*["']?\s*(.+?)\s*->\s*(.+?)\s*,\s*Version:\s*(.+?)\s*,\s*Mode:\s*([^,\.\r\n]+)\s*(?:,|\.|$)/i;
        const match = relationPattern.exec(inpStr);

        if (!match) {
          throw new Error('Invalid NewTpRelId format');
        }

        const parentPart = match[1];
        const receiverPart = match[2];
        const transactionPart = match[3];
        const modePart = match[4];

        this.parentTpId = normalizeToken(parentPart);
        let receiverId = normalizeToken(receiverPart);
        this.tpLinkNm = "";
        this.transaction = normalizeToken(transactionPart);
        this.workflowMode = normalizeToken(modePart);

        if (this.parentTpId === '' || receiverId === '' || this.transaction === '' || this.workflowMode === '') {
          throw new Error('Workflow parameters missing after parsing');
        }

        console.info('TPIDs: ' + this.parentTpId + ", " + receiverId + ", Transaction: " + this.transaction);
        this.isAddMode = true;
        this.form.controls.IsaReceiverId.setValue(receiverId);
        this.form.controls.GsSenderId.setValue(this.parentTpId);
        this.form.controls.IsaSenderId.setValue(this.parentTpId);
        this.form.controls.GsReceiverId.setValue(receiverId);
        this.form.controls.Mode.setValue(this.workflowMode);
      } catch (error) {
        console.error('Unable to parse NewTpRelId from workflow:', error, inpStr);
        alert('Unable to parse workflow link details. Please reopen from Workflow and try again.');
        sessionStorage.removeItem("NewTpRelId");
        this.handleRouteParams();
      }
    }

    private handleRouteParams() {
      this.parentTpId = this.route.snapshot.params['tpId'];
      this.tpName = this.route.snapshot.params['tpName'];
      this.tpLinkNm = this.route.snapshot.params['tpLink'];
      this.sub = this.route.queryParams.subscribe(params => {
        this.transaction = '' + params['transaction'];
      });
      this.isAddMode = !this.tpLinkNm;
      if (this.isAddMode) {
        this.parentTpId = this.route.snapshot.params['tpId'];
        console.info("Get parent: " + this.parentTpId);
      }
    }

    /**
     * Wait for canRender to be true (max 5 seconds)
     */
    private async waitForCanRender() {
      let myPromise = () => new Promise((resolve) => {
        setTimeout(function () {
          resolve('Count');
        }, 1000);
      });
      for (let index = 0; index < 5; index++) {
        let count = await myPromise();
        console.log('waiting for service: ' + `${count}: ${index}`);
        if (this.canRender)
          break;
      }
    }

    /**
     * Populate form with data if editing, or set up for add mode
     */
    private handleFormPopulation() {
      let ttype = '';
      if (!this.isAddMode) {
        this.tpService.fetchTpLink(this.tpLinkNm)
          .pipe(first())
          .subscribe(x => {
            this.form.patchValue(x);
            for (let key in x) {
              if (key === 'TransType') {
                ttype = x[key].toString();
                this.form.controls.TransType.setValue(ttype);
                this.setTransactionSetId();
              }
              if (key === 'ID') {
                this.form.controls['ID'].setValue(x[key].toString());
              }
              else if (key === 'Mode') {
                this.form.controls['Mode'].setValue(x[key].toString());
              }
              else if (key === 'ISAAck') {
                this.form.controls['ISAAck'].setValue(x[key].toString());
                if (this.form.controls['ISAAck'].value == "") {
                  this.form.controls['ISAAck'].setValue('NEVER');
                }
              }
              else if (key === 'GSAck') {
                this.form.controls['GSAck'].setValue(x[key].toString());
                if (this.form.controls['GSAck'].value == "") {
                  this.form.controls['GSAck'].setValue('NEVER');
                }
              }
              else if (key === 'STAck') {
                this.form.controls['STAck'].setValue(x[key].toString());
                if (this.form.controls['STAck'].value == "") {
                  this.form.controls['STAck'].setValue('NEVER');
                }
              }
              else if (key === 'Routing') {
                this.routeVal = x[key].toString();
                this.form.controls['Routing'].setValue(this.routeVal);
              }
              else if (key === 'Direction') {
                this.form.controls['Direction'].setValue(x[key].toString());
              }
              else if (key === 'Separators') {
                this.form.controls['Separators'].setValue(x[key].toString());
              }
              else if (key === 'ValidationRuleFile') {
                this.form.controls['ValidationRuleFile'].setValue(x[key].toString());
              }
              else if (key === 'SNIP') {
                this.form.controls['SNIP'].setValue(x[key].toString());
              }
              else if (key === 'TransType') {
                this.form.controls['TransType'].setValue(x[key].toString());
              }
              else if (key === 'GsReceiverId') {
                this.form.controls.GsReceiverId.setValue(x[key].toString());
              }
              else if (key === 'IsaReceiverId') {
                console.log("IsaReceiverId.setValue " + x[key].toString());
                this.form.controls.IsaReceiverId.setValue(x[key].toString());
              }
              else if (key === 'GsSenderId') {
                this.form.controls.GsSenderId.setValue(x[key].toString());
              }
              else if (key === 'IsaSenderId') {
                console.log("IsaSenderId.setValue " + x[key].toString());
                this.form.controls.IsaSenderId.setValue(x[key].toString());
              }
              else if (key === 'customProp') {
                for (var index in x[key]) {
                  console.log(index + ". " + x[key][index].Key + "> " + x[key][index].Value);
                  let cs = new KVP();
                  cs.id = Number(index);
                  cs.Key = x[key][index].Key;
                  cs.Value = x[key][index].Value;
                  if (cs.Key === 'BatchingMode835') {
                    if (cs.Value === 'Batched') {
                      this.form.controls.MergeFlg.setValue(true);
                    } else {
                      this.form.controls.MergeFlg.setValue(false);
                    }
                  } else {
                    this.customProp.push(cs);
                  }
                }
              }
              else {
                console.log(key + "-- Not mapped");
              }
            }
          });
        this.form.controls.ParentTpId.setValue(this.parentTpId);
      } else {
        if (this.transaction === 'undefined') {
          console.info('setTransactionSetId search is undefined');
        } else if (this.transaction !== "") {
          if (sessionStorage.getItem("NewTpRelId") !== null) {
            this.transactionTypes.forEach(item => {
              if ((item.VERSION.indexOf(this.transaction)) >= 0) {
                console.info(this.transaction + '- found: ' + item.NAME);
                this.form.controls.TransType.setValue(item.NAME);
                console.log("Set transaction type: " + item.NAME + ' , input: ' + this.transaction);
                this.setTransactionSetId();
                if (this.workflowMode !== '') {
                  this.form.controls.Mode.setValue(this.workflowMode);
                  this.setRtBatch();
                }
              }
            });
          }
        } else {
          // Search
          console.info('setTransactionSetId search: ' + this.transaction + ', ' + this.transactionTypes.length);
          var result = this.transactionTypes.findIndex(item => (item.TransactionSetId + '(' + item.VERSION + ')') === this.transaction);
          console.info(this.transaction + '- result: ' + result);
          if (result > 0) {
            this.form.controls.TransType.setValue(this.transactionTypes[result].NAME);
            console.log("Set transaction type: " + this.transactionTypes[result].NAME + ' , input: ' + this.transaction);
            this.setTransactionSetId();
          }
        }
      }
    }

      openSnackBar(message: string, action: string) {
    this._snackBar.open(message, action, {duration:3000});
  }

    // convenience getter for easy access to form fields
    get f() { return this.form.controls; }

    onCancel()
    {
      console.info('On Cancel, got back to: ' + this.parentTpId);
      sessionStorage.removeItem("TpOperation");
      sessionStorage.removeItem("NewTpRelId");
      this.clearWorkflowSessionContext();
      for (let el in this.form.controls) {
        if (this.form.controls[el].value) {
          console.log(el +': ' + this.form.controls[el].value)
        }
      }
      this.router.navigate(["/TradingPartners/tpIds/tp-links/" + this.parentTpId + "/" + this.tpName]);
    }

    onSubmit() {

        this.submitted = true;

        for (let el in this.form.controls) {
          if (this.form.controls[el].errors) {
            alert(el +" - not initialized, is required")
          }
        }

        // stop here if form is invalid
        if (this.form.invalid) {
          console.info('Invalid: ' + this.form.invalid);
            return;
        }

        this.loading = true;

        this.createUpdateTpLink(this.isAddMode);

    }

    setRtBatch()
    {
      console.info('setRtBatch: ' + this.form.controls['Mode'].value + ", isAddMode: " + this.isAddMode);
       console.info("Routing: " + this.form.controls.Routing.value)
      if(this.form.controls['Mode'].value === 'RT')
      {
          this.batchMode = false;
          this.ackTypes = ["ERROR","NEVER"];

            this.routingTypes =  `${environment.rtRoutes}`.split(',') // ["UhinRT","IntermountainHealthcare", "BitBucket", "NA"];


      }
      else {
        this.batchMode = true;
        this.ackTypes = ["ERROR","ALWAYS","NEVER"];

        this.routingTypes = `${environment.batchRoutes}`.split(',');

      }
      if(this.isAddMode)
      {
        this.form.controls.ISAAck.setValue(this.ackTypes[0]);
        this.form.controls.GSAck.setValue(this.ackTypes[0]);
        this.form.controls.STAck.setValue(this.ackTypes[0]);
        this.form.controls.SNIP.setValue('1');
        this.form.controls.Routing.setValue(this.routingTypes[0]);
      }
    }

    setTransactionSetId() {
      const ttVal = this.form.controls['TransType'].value;
      console.info('setTransactionSetId search: ' + ttVal + ', ' + this.transactionTypes.length);
      const result = this.transactionTypes.findIndex(item => item.NAME === ttVal);
      console.info(ttVal + '- result: ' + result);
      if (result < 0) {
        console.warn('Transaction type not found for: ' + ttVal);
        return;
      }
      const typeObj = this.transactionTypes[result];
      this.setTransactionSetIdControl(typeObj);
      this.setDirectionAndMode(typeObj);
      this.setTpIdHelpersAndLists(typeObj);
      this.setTransaction835Flag(typeObj);
      this.showTpIds = true;
    }

    /**
     * Set the TransactionSetId form control
     */
    private setTransactionSetIdControl(typeObj: TransTypes) {
      this.form.controls['TransactionSetId'].setValue(typeObj.TransactionSetId + ' / ' + typeObj.VERSION);
      console.info('TransType : ' + this.form.controls['TransactionSetId'].value);
    }

    /**
     * Set direction and mode based on transaction type
     */
    private setDirectionAndMode(typeObj: TransTypes) {
      // Set direction
      if (['271', '277', '835'].includes(typeObj.TransactionSetId)) {
        this.form.controls.Direction.setValue(this.direcTypes[1]);
      } else {
        this.form.controls.Direction.setValue(this.direcTypes[0]);
      }
      // Set mode
      if (typeObj.TransactionSetId.startsWith('27')) {
        this.modeTypes = ["Batch", "RT"];
      } else {
        this.modeTypes = ["Batch"];
      }
      this.form.controls.Mode.setValue(this.modeTypes[0]);
      this.setRtBatch();
    }

    /**
     * Set TPId help text and lists based on direction
     */
    private setTpIdHelpersAndLists(typeObj: TransTypes) {
      const currentGsReceiver = this.form.controls.GsReceiverId.value;
      const currentIsaReceiver = this.form.controls.IsaReceiverId.value;
      const currentGsSender = this.form.controls.GsSenderId.value;
      const currentIsaSender = this.form.controls.IsaSenderId.value;

      const pickPreferred = (options: string[], preferred: string) => {
        const normalizedPreferred = (preferred || '').toString().trim();
        if (normalizedPreferred !== '' && options.includes(normalizedPreferred)) {
          return normalizedPreferred;
        }
        return options.length > 0 ? options[0] : '';
      };

      if (this.form.controls['Direction'].value === 'In') {
        this.sendertpIdHelp = 'Parent TPId';
        this.receivertpIdHelp = 'TPIds for owner';
        this.sendingTpIds = [this.parentTpId];
        this.receivingTpIds = [];
        if (this.form.controls.GsSenderId.value !== this.parentTpId) {
          this.sendingTpIds.push(this.form.controls.GsSenderId.value);
        }
        this.receivingTpIds = this.ownerTpIds;
        if (this.isAddMode) {
          this.form.controls.GsReceiverId.setValue(pickPreferred(this.receivingTpIds, currentGsReceiver));
          this.form.controls.IsaReceiverId.setValue(pickPreferred(this.receivingTpIds, currentIsaReceiver));
          this.form.controls.GsSenderId.setValue(pickPreferred(this.sendingTpIds, currentGsSender));
          this.form.controls.IsaSenderId.setValue(pickPreferred(this.sendingTpIds, currentIsaSender));
        }
      } else {
        this.sendertpIdHelp = 'TPIds for owner';
        this.receivertpIdHelp = 'Parent TPId';
        this.receivingTpIds = [this.parentTpId];
        this.sendingTpIds = [];
        if (this.form.controls.GsReceiverId.value !== this.parentTpId) {
          this.receivingTpIds.push(this.form.controls.GsReceiverId.value);
        }
        this.sendingTpIds = this.ownerTpIds;
        if (this.isAddMode) {
          this.form.controls.GsReceiverId.setValue(pickPreferred(this.receivingTpIds, currentGsReceiver));
          this.form.controls.IsaReceiverId.setValue(pickPreferred(this.receivingTpIds, currentIsaReceiver));
          this.form.controls.GsSenderId.setValue(pickPreferred(this.sendingTpIds, currentGsSender));
          this.form.controls.IsaSenderId.setValue(pickPreferred(this.sendingTpIds, currentIsaSender));
        }
      }
    }

    /**
     * Set transaction835 flag
     */
    private setTransaction835Flag(typeObj: TransTypes) {
      this.transaction835 = (typeObj.TransactionSetId === '835');
    }

    private createUpdateTpLink(addFlg: boolean) {
      this.form.value.customProp = this.customProp;
      console.info('Create TPLink for name: ' + this.form.value.TransactionSetId +", customProp: " + this.customProp.length);
      if ( String(this.form.value.TransactionSetId).startsWith('835'))
      {
        let kv = new KVP();
        kv.Key = "BatchingMode835"
        if(this.form.controls.MergeFlg.value == true)
        {
          console.info('Add Merge for ' + this.form.value.TransType)
          kv.Value = "Batched"
        }
        else {
          console.info('Remove Merge for ' + this.form.value.TransType)
          kv.Value = "Individual"
        }
        this.customProp.push(kv)

      }
      this.tpService.addUpdateTpLink(this.form.value, addFlg)
          .pipe(first())
          .subscribe((res) => {
            let retStr:string;
            if (res.errormessage !== undefined) {
             console.info('createUpdateTpLink error: ' + res.errormessage);
             retStr = res.errormessage;
            }
            else if( res.Status !== undefined) {
              console.error('createUpdateTpLink status: ' + res.Status);
              if(res.Status === 'OK')
              {
                this.handleSuccessfulSave();
                 retStr = 'OK'
              }
              else
              {
                   retStr = this.form.value.Link + ": " + res.Status;
              }
            }
            else{
              alert('createUpdateTpLink Status: ' + res);
              retStr = res.Error;
            }
            this.openSnackBar('Save Link ' + this.form.value.Link, retStr );
            if(retStr !== 'OK')
            {
              alert(retStr);
            }
              //
          })
          .add(() => this.loading = false);

    }

    private handleSuccessfulSave() {
      if (!this.isWorkflowCloseEligible()) {
        this.clearWorkflowSessionContext();
        this.router.navigate(["/TradingPartners/tpIds/tp-links/" + this.parentTpId + "/" + this.tpName]);
        return;
      }

      const workflowIds = [this.workflowEntryId].filter(id => (id || '').trim() !== '');
      this.dialog.open(ConfirmDialogComponent, {
        width: '680px',
        maxWidth: '90vw',
        data: {
          title: 'Close workflow entry?',
          message:
            'TP Link was created successfully.\n\n' +
            'Workflow ID(s) to be closed as Resolved: ' + workflowIds.join(', ') + '\n\n' +
            'Note: There can be other related workflow entries that are not closed automatically.',
          cancelText: 'Leave Entry Open',
          confirmText: 'Close Listed Entry',
          confirmClass: ''
        }
      }).afterClosed().pipe(first()).subscribe((closeWorkflow: boolean) => {
        if (!closeWorkflow) {
          this.clearWorkflowSessionContext();
          this.router.navigate(["/TradingPartners/tpIds/tp-links/" + this.parentTpId + "/" + this.tpName]);
          return;
        }

        const paramsList: string[] = [];
        paramsList.push("ID::" + this.workflowEntryId);
        paramsList.push("Status::Resolved");
        paramsList.push("AssignedUser::");
        this.wfService.updateWorkFlowItem(this.workflowMode, paramsList)
          .pipe(first())
          .subscribe({
            next: () => {
              this.openSnackBar('Workflow Entry', 'Closed as Resolved');
              this.clearWorkflowSessionContext();
              this.router.navigate(["/TradingPartners/tpIds/tp-links/" + this.parentTpId + "/" + this.tpName]);
            },
            error: (error) => {
              console.error('Unable to close workflow entry after TP link save', error);
              alert('TP Link was created, but closing the workflow entry failed. Please close it manually from Workflow.');
              this.clearWorkflowSessionContext();
              this.router.navigate(["/TradingPartners/tpIds/tp-links/" + this.parentTpId + "/" + this.tpName]);
            }
          });
      });
    }

    private isWorkflowCloseEligible(): boolean {
      const status = (this.workflowEntryStatus || '').trim().toLowerCase();
      const hasWorkflowContext = this.workflowEntryId.trim() !== '' && this.workflowMode.trim() !== '';
      return hasWorkflowContext && status !== 'resolved' && status !== 'ignored';
    }

    private clearWorkflowSessionContext() {
      sessionStorage.removeItem('TpOperation');
      sessionStorage.removeItem('NewTpRelId');
      sessionStorage.removeItem('NewWfId');
      sessionStorage.removeItem('NewWfMode');
      sessionStorage.removeItem('NewWfStatus');
    }

    createKV(kv: KVP) {
      if (this.customProp.length === 0) {
        const newKV = { ...kv, id: 1 };
        this.customProp = [...this.customProp, newKV];
      } else {
        const [{ id: newId }] = [...this.customProp].reverse();
        const newKV = { ...kv, id: newId + 1 };
        this.customProp = [...this.customProp, newKV];
      }
    }


}
