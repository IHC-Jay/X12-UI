import {Component, Inject, Optional, ViewChild} from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
    selector: 'app-list-confirm-dialog',
    templateUrl: './list-confirm-dialog.component.html',
    styleUrls: ['./list-confirm-dialog.component.css'],
    standalone: false
})


export class ListConfirmDialogComponent {

  userNames: string[];


    UserName:string;
    transType:string;


    constructor(
      public dialogRef: MatDialogRef<ListConfirmDialogComponent>,

      //@Optional() is used to prevent error if no data is passed
      @Optional() @Inject(MAT_DIALOG_DATA) public  data: string[]
    )
    {
      console.log('Input: ' + data );
      this.transType = data[0];
      data.splice(0,1)
      this.userNames = data;


      this.UserName = this.userNames[0];
    }

    ngOnInit() {
      this.UserName = this.userNames[0];
  }



    doSave(){
      this.dialogRef.close({event:'Save', data:this.UserName});
    }

    closeCancel(){
      this.dialogRef.close({event:'Cancel', data:this.UserName});
    }

    transactionChange(evt: any)
{
    console.log(evt);
    this.UserName = evt;
}



}

