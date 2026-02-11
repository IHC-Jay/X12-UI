import { Injectable } from '@angular/core';
import { Component, Input } from '@angular/core';

@Injectable()
export class ModalHelperService {

  @Input() fileContent: any;

  isAllSelected(selection, dataSource) {

    return true;
  }

  masterToggle(selection, dataSource) {
    this.isAllSelected(selection, dataSource)
    ? selection.clear()
    : dataSource.data.forEach(row => selection.select(row));
  }

  filter() {
    console.log('filtering ....');
  }

  sort() {
    console.log('sorting ....');
  }

  save(x12Data, fileName) {
    console.log('Saving....');


      //you can enter your own file name and extension
      let content = x12Data;

      let contentType =  'text/plain';

      var a = document.createElement('a');
      var file = new Blob([content], {type: contentType});
      a.href = URL.createObjectURL(file);
      a.download = fileName;
      a.click();
    }


}
