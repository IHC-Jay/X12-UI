import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HelpContent } from './help-content';

@Component({
  selector: 'app-help-dialog',
  templateUrl: './help-dialog.component.html',
  styleUrls: ['./help-dialog.component.css'],
  standalone: false
})
export class HelpDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: HelpContent,
    private dialogRef: MatDialogRef<HelpDialogComponent>
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}
