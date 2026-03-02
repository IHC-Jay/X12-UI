import { Component, OnInit,Input } from '@angular/core';
import { CommonModule } from "@angular/common";

import { transition } from '@angular/animations';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TransRestServiceComponent } from '../../services/transrest-service.component';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { Modalx12Component } from './modal/modal-x12.component';
import { DialogRef } from '@angular/cdk/dialog';
import { StorageService } from '../../services/storage.service';
import { from, concatMap, toArray } from 'rxjs';

@Component({
    selector: 'app-transaction-details',
    templateUrl: './transaction-details.component.html',
    styleUrls: ['./transaction-details.component.css'],
    standalone: false
})
export class TransactionDetailComponent {

  canRenderDetails: boolean = false;
  prevWindow: boolean = false;
  displayedColumns = [];
  mode:string = "RealTime";

  dataSource = new MatTableDataSource<any>();

  sub:any;
  ID:string;
  X12DataParentId:string;
  ak1CtrlNum:string;
  ak1ver:string;
  additionalSearchStr:string;
  transConfigJsonString:string;
  searchTypeString:string;
  transaction:string;
  sessionID:string = '';
  status:string = '';
  x12Data:string;
  fileName = "TEST";

  constructor(
    private TransactionService: TransRestServiceComponent,
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    public dialog: MatDialog,
    private storage: StorageService
  )
  {

  }

  ngOnInit() {
    this.sub = this.route.queryParams.subscribe(params => {
      this.ID = '' + params['ID'] || '0';
      this.transaction = '' + params['transaction'] || '0';
      this.additionalSearchStr = params['additionalSearch'];
      this.searchTypeString = params['searchTypeString'];
      this.mode = params['mode'];
      this.sessionID = params['sessionID'] || params['SessionID'] || params['SessionId'] || '';
      this.status = params['Status'] || params['status'] || '';
      this.transConfigJsonString = params['transConfig'];
      if (!this.status) {
        this.status = this.extractSearchParam(this.searchTypeString, 'status');
      }
      console.log('Query params ID: ', this.ID + ', trans: ' + this.transaction + ", additionalSearch: " + this.additionalSearchStr + ", searchTypeString: " + this.searchTypeString);
      if (this.mode != "" && this.searchTypeString.indexOf("Batch") > 0) {
        this.mode = "Batch";
      }
      this.prevWindow = (this.searchTypeString.indexOf("sameWindow::true") > 1);
    });
    this.TransactionService.fetchTransactionFields().subscribe((res: any) => {
      this.displayedColumns = [];
      for (var item of res) {
        if (
          ((Number.isNaN(item.TransactionCode) === false) && (item.TransactionCode === this.transaction)) ||
          ((Number.isNaN(item.TransactionCode) === true) && Number.parseInt(item.TransactionCode) === Number.parseInt(this.transaction)) ||
          Number.parseInt(item.TransactionCode) == 1
        ) {
          this.displayedColumns.push({ key: item.Key, type: item.Type, label: item.TransactionLabel, transactionCode: item.TransactionCode });
        }
      }
      console.log(this.transaction + '- Display columns: ' + this.displayedColumns.length);
      let paramsList: string[] = [];
      paramsList.push("ID::" + this.ID);
      paramsList.push("count::" + 1);
      this.fetchTransactionDetailData(this.transaction, this.mode, paramsList);
    });
  }

  private extractSearchParam(paramStr: string, key: string): string {
    if (!paramStr) return '';
    const start = paramStr.indexOf(`${key}::`);
    if (start < 0) return '';
    const valueStart = start + key.length + 2;
    const end = paramStr.indexOf(';', valueStart);
    return end >= 0 ? paramStr.substring(valueStart, end) : paramStr.substring(valueStart);
  }

  // --- Refactored fetch logic for ngOnInit ---
  private fetchTransactionDetailData(transaction: string, mode: string, paramsList: string[]) {
    const setResult = (res: any) => {
      this.canRenderDetails = true;
      this.dataSource.data = res;
      if (res && res[0]) {
        this.X12DataParentId = res[0].X12DataParentId;
        this.fileName = res[0].FileName.replace(/^.*[\\\/]/, '');
        if (transaction === '999') {
          this.ak1CtrlNum = res[0].GroupRespControlNumber;
          this.ak1ver = res[0].GroupRespVersion;
        }
      }
      if (res) {
        console.log("# of records: " + res.length + (transaction === '271' ? ", parent Id:" + res[0].X12DataParentId : ''));
      }
    };
    if (transaction === '270') {
      this.TransactionService.fetchEligibilityRequests(mode, paramsList).subscribe(setResult);
    } else if (transaction === '271') {
      this.TransactionService.fetchEligibilityBenefitResponses(mode, paramsList).subscribe(setResult);
    } else if (transaction.startsWith('837')) {
      this.TransactionService.fetchClaims(mode, paramsList).subscribe(setResult);
    } else if (transaction === '835') {
      this.TransactionService.fetchClaimPayment(mode, paramsList).subscribe(setResult);
    } else if (transaction === '276') {
      this.TransactionService.fetchClaimStatusReq(mode, paramsList).subscribe(setResult);
    } else if (transaction === '277') {
      this.TransactionService.fetchClaimStatusResp(mode, paramsList).subscribe(setResult);
    } else if (transaction.toString() === '277CA') {
      this.TransactionService.fetchClaimAcknowledgment(mode, paramsList).subscribe(setResult);
    } else if (transaction === '999') {
      this.TransactionService.fetchImplementationAcknowledgment(mode, paramsList).subscribe(setResult);
    } else if (transaction === 'TA1') {
      this.TransactionService.fetchTA1(mode, paramsList).subscribe(setResult);
    }
  }


  getSelectedValue(loopnum: number, question:string)
  {

    if (this.dataSource.data[0] !== undefined )
    {
      let jsonStr = JSON.stringify(this.dataSource.data[0]);

            const jsonData = JSON.parse(jsonStr)

            for(var i in jsonData)
            {
              if(i === question)
              {
                var val = jsonData[i];
                // console.info(loopnum + ". getSelectedValue: " + question +'= ' + val);
                if(question === "x12Data" )
                {
                  if (val.startsWith("ISA"))
                  {
                  let letter = val.charAt(105);
                  val = val.replaceAll(letter, letter + "\n")
                  console.info("Split X12 with: " + letter);
                  }
                  else{
                    val = val.replaceAll("~", "~\n")
                  }
                  this.x12Data = val;
                }
                else if (val === '')
                {
                  val = '-';
                }

                // console.info("getSelectedValue: " + question +"= " + val);
                return val;
            }
          }
        }
  }
  toTransactions()
  {

      console.log('To Transactions: ' + this.transaction + "/" + this.additionalSearchStr);
      this.router.navigate(["/transaction/"],
      // {queryParams: { trans: this.transaction, 'search':  this.searchStr } }
      {
        queryParams: { transaction: this.transaction,
          'additionalSearch': this.additionalSearchStr,
          'searchTypeString': this.searchTypeString, 'transConfig': this.transConfigJsonString}
    }

       );
  }

  openX12Modal(): void {
    console.info("openX12Modal: " + this.X12DataParentId + ", " + this.transaction);

    const openInX12Viewer = (x12Text: string, fileName: string) => {
      this.storage.removeItem('x12ViewerSeed');
      this.storage.setItem('x12ViewerSeed', {
        text: x12Text,
        fileName
      });
      localStorage.setItem('x12ViewerSeed', JSON.stringify({ text: x12Text, fileName }));
      this.storage.removeItem('currentTab');
      this.storage.setItem('currentTab', 'Utility');
      const baseHref = document.querySelector('base')?.getAttribute('href') || '/';
      const normalizedBase = baseHref.endsWith('/') ? baseHref.slice(0, -1) : baseHref;
      const query = new URLSearchParams();
      if (this.sessionID) {
        query.set('sessionID', this.sessionID);
      }
      if (this.status) {
        query.set('Status', this.status);
      }
      if (this.mode) {
        query.set('mode', this.mode);
      }
      if (this.transaction) {
        query.set('TransactionType', this.transaction);
      }
      const queryString = query.toString();
      const targetUrl = `${normalizedBase}/x12-viewer${queryString ? '?' + queryString : ''}`;
      const newTab = window.open(targetUrl, '_blank');
      if (newTab) {
        newTab.opener = null;
      }
    };

    this.TransactionService.fetchParentRecord(this.X12DataParentId, this.transaction, this.searchTypeString).subscribe((res: any) => {
      this.canRenderDetails = true;
      let val = "";

      if (res === "No data") {
        openInX12Viewer("Not found", this.fileName || "X12.txt");
        return;
      }

      if (res.x12Data !== undefined && res.x12Data.indexOf('stored as a Stream') >= 0) {
        const maxSize = 3000000;
        const productIds: number[] = [0,1,2,3,4,5,6,7,8,9,10];

        from(productIds)
          .pipe(
            concatMap(id => this.TransactionService.fetchX12Stream(this.X12DataParentId, this.transaction, this.searchTypeString, id * maxSize + 1)),
            toArray()
          )
          .subscribe({
            next: (parts: any) => {
              console.info("Sequential calls completed. Total parts: " + parts.length);
              for (let i = 0; i < parts.length; i++) {
                if (!parts[i] || !parts[i][0]) {
                  break;
                }
                const part = parts[i][0];
                console.info("Part " + i + ": " + part.startPos + ", " + part.x12Len + " more: " + part.moreData);
                if (part.moreData > 0 || part.x12Len > 0) {
                  val += part.x12Data;
                } else {
                  break;
                }
              }
              val = val.replaceAll("~", "~\n");
            },
            error: (error) => {
              console.error('An error occurred:', error);
            },
            complete: () => {
              if (val !== "") {
                openInX12Viewer(val, this.fileName || 'X12.txt');
              }
            }
          });

        return;
      }

      if (res.x12Data !== undefined && res.x12Data.length > 0) {
        if (res.x12Data.length > 105) {
          const letter = res.x12Data.charAt(105);
          val = res.x12Data.replaceAll(letter, letter + "\n");
          console.info("Split X12 with: " + letter);
        } else {
          val = res.x12Data;
        }
      } else {
        val = res.x12Data.replaceAll("~", "~\n");
      }

      if (val !== "") {
        openInX12Viewer(val, this.fileName || 'X12.txt');
      }
    });

  }

  openRelatedTransactionModel(): void {

    console.log(" fetchGetRelatedTransaction: " + this.transaction +", " + this.dataSource.data[0].GroupControlNumber)

    let tranType = this.transaction;
    let grpNum = this.dataSource.data[0].GroupControlNumber;
    if(this.transaction === '999')
    {
      console.log(" fetchGetRelatedTransaction: " + this.ak1CtrlNum +", " +  this.ak1ver);
      tranType = this.ak1ver;
      grpNum =  this.ak1CtrlNum ;
    }
    console.log(" fetchGetRelatedTransaction: " + this.dataSource.data[0].InterchangeControlNumber +"," +
    this.dataSource.data[0].InterchangeReceiverID + "," +
    this.dataSource.data[0].InterchangeSenderID)

    this.TransactionService.fetchGetRelatedTransaction(tranType, grpNum,
      this.dataSource.data[0].InterchangeSenderID,
      this.dataSource.data[0].InterchangeReceiverID,
      this.dataSource.data[0].InterchangeControlNumber, this.searchTypeString

      ).subscribe((res: any) => {
      this.canRenderDetails = true;
      let val = ""
      let fileName = "NA"
      if(this.transaction === '999')
      {
        if (res !== undefined && res && res.tranX12 !== undefined && res.tranX12.length > 0 )
        {
          let letter = res.tranX12.charAt(105);
          val = res.tranX12.replaceAll(letter, letter + "\n" )
          console.info("Split tranX12 with: " + letter);
          fileName =  res.FileName.replace(/^.*[\\\/]/, '')
          }
          else{
            val = 'Related item not found';
          }
      }
      else
      {
          if (res !== undefined && res && res.x12Data !== undefined && res.x12Data.length > 0 )
          {
            let letter = res.x12Data.charAt(105);
            val = res.x12Data.replaceAll(letter, letter + "\n" )
            console.info("Split X12 with: " + letter);
            fileName =  res.FileName.replace(/^.*[\\\/]/, '')
            }
            else{
              val = 'Related item not found';
            }
      }

        let param: string[] = [ val,  fileName, this.transaction + " X12 Data, ID: " + this.X12DataParentId];
    const dialogRef = this.dialog.open(Modalx12Component, {
      width: '1700px',
      data: param
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog closed');
    });


  });

  }

  openRelated27xModel(): void {

    console.log(" openRelated27xModel: " + this.transaction +", " + this.dataSource.data[0].GroupControlNumber)

    let tranType = this.transaction;
    let title = ""
    let grpNum = this.dataSource.data[0].GroupControlNumber;

    console.log(" openRelated27xModel: " + this.dataSource.data[0].InterchangeControlNumber +"," +
    this.dataSource.data[0].InterchangeReceiverID + "," +
    this.dataSource.data[0].InterchangeSenderID);
    if (tranType == '270' || tranType == '271')
    {
        this.TransactionService.openRelated2701Model(this.transaction,
          this.dataSource.data[0].TrnRefId, this.dataSource.data[0].SubscriberId,
          this.dataSource.data[0].InterchangeSenderID,
          this.dataSource.data[0].InterchangeReceiverID,
          this.dataSource.data[0].InterchangeControlNumber, this.searchTypeString

          ).subscribe((res: any) => {
          this.canRenderDetails = true;
          let val = ""
          let fileName = "NA"
          if(this.transaction === '271' )
          {
            if (res !== undefined && res && res.ReqX12 !== undefined && res.ReqX12.length > 0 )
            {
              let letter = "~";
              fileName = res.ReqFileName.replace(/^.*[\\\/]/, '')
              val = res.ReqX12.replaceAll(letter, letter + "\n" )

              title = "270 for TRN # " + this.dataSource.data[0].TrnRefId +", Subscriber: " + this.dataSource.data[0].SubscriberId

              console.info("Split ReqX12 with: " + letter);

              }
              else{
                val = 'Related 270 not found';
              }
          }
          else
          {
              if (res !== undefined && res && res.ResX12 !== undefined && res.ResX12.length > 0 )
              {
                let letter = "~";
                fileName = res.ResFileName.replace(/^.*[\\\/]/, '')
                val = res.ResX12.replaceAll(letter, letter + "\n" )
                console.info("Split X12 with: " + letter);
                title = "271 for TRN # " + this.dataSource.data[0].TrnRefId +", Subscriber: " + this.dataSource.data[0].SubscriberId

                }
                else{
                  val = 'Related 271 not found';
                }
          }

            let param: string[] = [ val, fileName, title ];
        const dialogRef = this.dialog.open(Modalx12Component, {
          width: '1700px',
          data: param
        });

        dialogRef.afterClosed().subscribe(result => {
          console.log('The dialog closed');
        });


      });
    }
    else
    {
      this.TransactionService.openRelated2767Model(this.transaction, this.dataSource.data[0].SubscriberId,
        this.dataSource.data[0].BhtId,  this.dataSource.data[0].TrnRefId,
        this.dataSource.data[0].InterchangeSenderID,
        this.dataSource.data[0].InterchangeReceiverID,
        this.dataSource.data[0].InterchangeControlNumber, this.searchTypeString
        ).subscribe((res: any) => {
        this.canRenderDetails = true;
        let val = ""
        let fileName = ""
        let title = ""
        if(this.transaction === '277')
        {
          if (res !== undefined && res && res.ReqX12 !== undefined && res.ReqX12.length > 0 )
          {
            let letter = "~";
            val = res.ReqX12.replaceAll(letter, letter + "\n" )
            fileName = res.ReqFileName.replace(/^.*[\\\/]/, '')
            title = "276 for Batch # " + this.dataSource.data[0].BhtId + ", TRN # " + this.dataSource.data[0].TrnRefId +", Subscriber: " + this.dataSource.data[0].SubscriberId

            console.info(res.ReqFileName + ", Split ReqX12 with: " + letter);

            }
            else{
              val = 'Related 276 not found';
            }
        }
        else
        {
            if (res !== undefined && res && res.ResX12 !== undefined && res.ResX12.length > 0 )
            {
              let letter = "~";
              fileName = res.ResFileName.replace(/^.*[\\\/]/, '')
              val = res.ResX12.replaceAll(letter, letter + "\n" )
              title = "277 for Batch # " + this.dataSource.data[0].BhtId + ", TRN # " + this.dataSource.data[0].TrnRefId +", Subscriber: " + this.dataSource.data[0].SubscriberId

              console.info(res.ResFileName + ", Split X12 with: " + letter);

              }
              else{
                val = 'Related 277 not found';

              }
        }

        let param: string[] = [ val,  fileName, title];
        const dialogRef = this.dialog.open(Modalx12Component, {
            width: '1700px',
            data: param
        });

        dialogRef.afterClosed().subscribe(result => {
          console.log('The dialog closed');
        });


      });
    }

  }
  openRelated83xModel()
  {
    console.log('openRelated83xModel');
    var amt = ""
    var clmId = ""
    if(this.transaction === '835' )
    {
      clmId = this.dataSource.data[0].ClaimSubmitterId
      amt = this.dataSource.data[0].TotalClaimCharge

    }
    else{
      clmId = this.dataSource.data[0].ClaimId
      amt = this.dataSource.data[0].ClaimAmount

    }


    this.TransactionService.openRelated83xModel(this.transaction, clmId, amt).subscribe((res: any) => {
      this.canRenderDetails = true;
      let val = ""
      let fileName = "NA"
      if(this.transaction === '835' )
      {
        if (res !== undefined && res && res.ClmX12 !== undefined && res.ClmX12.length > 0 )
        {
          let letter = "~";
          fileName = res.ClmFileName.replace(/^.*[\\\/]/, '')
          val = res.ClmX12.replaceAll(letter, letter + "\n" )
          console.info("Split X12 with: " + letter);

          }
          else{
            val = 'Related 837 not found';
          }
      }
      else
      {
        if (res !== undefined && res && res.ClmRemX12 !== undefined && res.ClmRemX12.length > 0 )
        {
          let letter = "~";
          fileName = res.ClmRemFileName.replace(/^.*[\\\/]/, '')
          val = res.ClmRemX12.replaceAll(letter, letter + "\n" )
          console.info("Split ClmRemX12 with: " + letter);

          }
          else{
            val = 'Related 835 not found';
          }


      }

        let param: string[] = [ val, fileName, this.transaction + " X12 Data, ID: " + this.X12DataParentId];
    const dialogRef = this.dialog.open(Modalx12Component, {
      width: '1700px',
      data: param
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog closed');
    });


  });

  }
  openRelated277CAModel()
  {
    console.log('openRelated277CAModel: ' + this.dataSource.data[0].ClaimId);

    var clmId = ""
    var title = ""
    if(this.transaction === '277CA' )
    {
      clmId = this.dataSource.data[0].ClaimStatusId
      title = "837 for Claim: " + clmId
    }
    else{

      clmId = this.dataSource.data[0].ClaimId
      title = "277CA for Claim: " + clmId

    }


    this.TransactionService.openRelatedClaimAckModel(this.transaction, clmId).subscribe((res: any) => {
      this.canRenderDetails = true;
      let val = ""
      let fileName = "NA"
      if(this.transaction === '277CA' )
      {
        if (res !== undefined && res && res.ClmX12 !== undefined && res.ClmX12.length > 0 )
        {
          let letter = "~";
          fileName = res.ClmFileName.replace(/^.*[\\\/]/, '')
          val = res.ClmX12.replaceAll(letter, letter + "\n" )
          console.info("Split ClmX12 with: " + letter);

          }
          else{
            val = 'Related 837 not found';
          }
      }
      else
      {
        if (res !== undefined && res && res.AckX12 !== undefined && res.AckX12.length > 0 )
        {
          let letter = "~";
          fileName = res.AckFileName.replace(/^.*[\\\/]/, '')
          val = res.AckX12.replaceAll(letter, letter + "\n" )
          console.info("Split X12 with: " + letter);

          }
          else{
            val = 'Related 277CA not found';
          }
      }

        let param: string[] = [ val, fileName, title];
    const dialogRef = this.dialog.open(Modalx12Component, {
      width: '1700px',
      data: param
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog closed');
    });


  });

  }


}
