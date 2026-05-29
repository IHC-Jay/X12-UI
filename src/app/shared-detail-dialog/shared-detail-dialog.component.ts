import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface SharedDetailDialogData {
  title: string;
  record: any;
}

@Component({
  selector: 'app-shared-detail-dialog',
  templateUrl: './shared-detail-dialog.component.html',
  styleUrls: ['./shared-detail-dialog.component.css'],
  standalone: false
})
export class SharedDetailDialogComponent {
  readonly specialEntries: Array<{ key: string; value: string }>;
  readonly groupedEntries: Array<Array<{ key: string; value: string } | null>>;

  constructor(
    public dialogRef: MatDialogRef<SharedDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SharedDetailDialogData
  ) {
    const record = data?.record || {};
    const orderedKeys = Object.keys(record)
      .filter((key) => key !== 'x12Data' && key !== 'kwData')
      .sort((a, b) => a.localeCompare(b));

    const entries = orderedKeys.map((key) => ({
      key,
      value: (record[key] ?? '').toString()
    }));

    this.specialEntries = [];
    if (record?.kwData !== undefined) {
      this.specialEntries.push({ key: 'kwData', value: this.formatKwData((record.kwData ?? '').toString()) });
    }
    if (record?.x12Data !== undefined) {
      this.specialEntries.push({ key: 'x12Data', value: this.formatX12Data((record.x12Data ?? '').toString()) });
    }

    this.groupedEntries = [];
    for (let i = 0; i < entries.length; i += 4) {
      const row = entries.slice(i, i + 4);
      while (row.length < 4) {
        row.push(null);
      }
      this.groupedEntries.push(row);
    }
  }

  close(): void {
    this.dialogRef.close();
  }

  private formatKwData(value: string): string {
    return (value || '').replace(/@pRecType/g, '\n@pRecType').trim();
  }

  private formatX12Data(value: string): string {
    return (value || '').replace(/~/g, '~\n').trim();
  }
}
