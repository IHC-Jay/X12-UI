import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TransRestServiceComponent } from '../services/transrest-service.component';
import { KeywordEntry } from './KeywordEntry';
import { SharedDetailDialogComponent } from '../shared-detail-dialog/shared-detail-dialog.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-keywords-detail-dialog',
  templateUrl: './keywords-detail-dialog.component.html',
  styleUrls: ['./keywords-detail-dialog.component.css'],
  standalone: false
})
export class KeywordsDetailDialogComponent {
  readonly kwDataEntry: { key: string; value: string };
  readonly groupedEntries: Array<Array<{ key: string; value: string } | null>>;
  readonly hasRelatedTransaction: boolean;

  constructor(
    public dialogRef: MatDialogRef<KeywordsDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: KeywordEntry,
    private TransactionService: TransRestServiceComponent,
    public dialog: MatDialog
  ) {
    const orderedKeys: Array<keyof KeywordEntry> = [
      'ApplicationReceiversCode',
      'ApplicationSendersCode',
      'BatchControlNumber',
      'BillingProviderName',
      'BillingProviderNpi',
      'BillingProvidertaxIdentifier',
      'ClaimTotalcharge',
      'ClearinghouseTraceNumber',
      'DestinationFileName',
      'FileName',
      'GroupControlNumber',
      'InterchangeControlNumber',
      'InterchangeDateTime',
      'InterchangeReceiverID',
      'InterchangeReceiverName',
      'InterchangeSenderID',
      'InterchangeSenderIdentifier',
      'InterchangeSenderName',
      'PatientControlNumber',
      'ProcessDtTm',
      'ReceiptDtTm',
      'SessionID',
      'SubscriberIdentifier',
      'SubscriberName'
    ];

    const entries = orderedKeys.map((key) => ({
      key: String(key),
      value: (this.data?.[key] ?? '') as string
    }));

    this.kwDataEntry = {
      key: 'kwData',
      value: this.formatKwData((this.data?.kwData ?? '').toString())
    };

    const remainingEntries = entries;
    this.groupedEntries = [];
    for (let i = 0; i < remainingEntries.length; i += 4) {
      const row = remainingEntries.slice(i, i + 4);
      while (row.length < 4) {
        row.push(null);
      }
      this.groupedEntries.push(row);
    }

    const hasTrace = !!(this.data?.ClearinghouseTraceNumber || '').toString().trim();
    const hasPatientControl = !!(this.data?.PatientControlNumber || '').toString().trim();
    this.hasRelatedTransaction = (this.data?.FileName || '').toString().indexOf('837') >= 0 && (hasTrace || hasPatientControl);
  }

  close(): void {
    this.dialogRef.close();
  }

  private formatKwData(value: string): string {
    return (value || '').replace(/@pRecType/g, '\n@pRecType').trim();
  }

  openRelatedTransactionModel(): void {
    const traceNumber = (this.data?.ClearinghouseTraceNumber || '').toString().trim();
    const sessionId = (this.data?.SessionID || '').toString().trim();
    const patientControlNumber = (this.data?.PatientControlNumber || '').toString().trim();

    const andConditions: string[] = [];
    if (traceNumber) {
      andConditions.push(`ClearinghouseTraceNumber='${traceNumber.replaceAll("'", "''")}'`);
    }

    if (sessionId) {
      andConditions.push(`SessionID='${sessionId.replaceAll("'", "''")}'`);
    }

    if (patientControlNumber) {
      andConditions.push(`ClaimId='${patientControlNumber.replaceAll("'", "''")}'`);
    }

    if (andConditions.length === 0) {
      alert('Neither ClearinghouseTraceNumber nor PatientControlNumber found for this keyword record.');
      return;
    }

    const paramsList: string[] = [
      `addSql::${andConditions.join(' AND ')}`,
      'pageIndex::0',
      'pageSize::1'
    ];

    console.info('[KeywordsDetail] Looking up related transaction', { traceNumber, sessionId, patientControlNumber });
    this.TransactionService.fetchClaims('Batch', paramsList).subscribe({
      next: (res: any) => {
        const row = Array.isArray(res?.Items) ? res.Items[0] : null;
        if (!row) {
          alert('Related transaction not found.');
          return;
        }

        this.dialog.open(SharedDetailDialogComponent, {
          width: '1300px',
          maxWidth: '95vw',
          data: {
            title: `Related Transaction${traceNumber ? ' - ClearinghouseTraceNumber=' + traceNumber : ''}${sessionId ? ' SessionID=' + sessionId : ''}${patientControlNumber ? ' PatientControlNumber=' + patientControlNumber : ''}`,
            record: row
          }
        });
      },
      error: (err) => {
        console.error('[KeywordsDetail] Related transaction lookup failed', err);
        alert('Error looking up related transaction.');
      }
    });
  }
}
