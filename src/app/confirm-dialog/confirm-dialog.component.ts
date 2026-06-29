import { Component, Inject, Optional } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface ConfirmDialogData {
    title?: string;
    message?: string;
    cancelText?: string;
    confirmText?: string;
    confirmClass?: string;
    showConfirm?: boolean;
}

@Component({
    selector: 'app-confirm-dialog',
    templateUrl: './confirm-dialog.component.html',
    styleUrls: ['./confirm-dialog.component.css'],
    standalone: false
})
export class ConfirmDialogComponent {
    title = 'Are you sure you want to delete?';
    message = '';
    cancelText = 'Cancel';
    confirmText = 'Delete';
    confirmClass = '';
    showConfirm = true;

    constructor(@Optional() @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData | null) {
        if (!data) {
            return;
        }
        this.title = data.title || this.title;
        this.message = data.message || this.message;
        this.cancelText = data.cancelText || this.cancelText;
        this.confirmText = data.confirmText || this.confirmText;
        this.confirmClass = data.confirmClass !== undefined ? data.confirmClass : this.confirmClass;
        this.showConfirm = data.showConfirm !== undefined ? data.showConfirm : this.showConfirm;
    }
}
