import { Component, EventEmitter, Output } from '@angular/core';
import { KVP } from '../addEdit-links/add-edit.TpLink';

@Component({
    selector: 'app-create-note',
    templateUrl: './create-note.component.html',
    styleUrls: ['./create-note.component.css'],
    standalone: false
})
export class CreateNoteComponent {
  @Output() newNoteSender = new EventEmitter<KVP>();

  key: string = "";
  value: string = "";

  addNote() {
    const newNote: KVP = {
      id: 0,
      Key: this.key,
      Value: this.value
    };
    this.newNoteSender.emit(newNote);
    this.key = "";
    this.value = "";
  }
}
