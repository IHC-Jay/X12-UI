import { Component, OnInit, Optional, Inject } from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import {ModalHelperService} from './modal-helper.service';

import {MAT_DIALOG_DATA, MatDialogRef}  from '@angular/material/dialog';


@Component({
    selector: 'app-modal-x12',
    templateUrl: './modal-x12.component.html',
    styleUrls: ['./modal-x12.component.css'],
    standalone: false
})

export class Modalx12Component {


  x12Data = "";
  title = ""
  fileName = 'X12-File'+'.txt';

  selection = new SelectionModel(true, []);
  save = () => this.modalHelperService.save(this.x12Data, this.fileName);
  filter = () => this.modalHelperService.filter();
  sort = () => this.modalHelperService.sort();
  masterToggle = (selection, dataSource) => this.modalHelperService.masterToggle(selection, dataSource);
  isAllSelected = (selection, dataSource) => this.modalHelperService.isAllSelected(selection, dataSource);

  constructor(
    public dialogRef: MatDialogRef<Modalx12Component>,
    public modalHelperService: ModalHelperService,
    @Inject(MAT_DIALOG_DATA) public data: string[]
  ) {
    console.log('Modalx12Component constructor: ' + data[1]);
    this.x12Data = data[0];
    this.fileName = data[1];
    this.title =  data[2];

  }

}
