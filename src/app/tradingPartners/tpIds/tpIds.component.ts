import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, RouteReuseStrategy } from '@angular/router';

import {TpRestServiceComponent} from '../../services/tprest-service.component';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { TpId, TpIdColumns } from './TpId';
import { ConfirmDialogComponent } from '../../confirm-dialog/confirm-dialog.component';
import { MatIconModule } from '@angular/material/icon';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';

@Component({
    selector: 'app-tpIds',
    templateUrl: './tpIds.component.html',
    styleUrls: ['./tpIds.component.css'],
    standalone: false
})

export class TpIdComponent implements OnInit {
    private subscriptions: any[] = [];
  tpId: string;

  public size = 5;
  public pageNumber = 0;

  displayedColumns: string[] = TpIdColumns.map((col) => col.key);
  columnsSchema: any = TpIdColumns;

  dataSource = new MatTableDataSource<TpId>();
  valid: any = {};
  @ViewChild(MatPaginator, {static: true}) paginator: MatPaginator;
  private _snackBar = inject(MatSnackBar);


  constructor(public dialog: MatDialog, private route: ActivatedRoute,  private tpIdService: TpRestServiceComponent) { }

  ngOnInit() {
    // Get the TP ID from the route and load initial data
    const routeParams = this.route.snapshot.paramMap;
    this.tpId = routeParams.get('tpId');
    this.subscriptions.push(this.tpIdService.getTpIds(this.tpId).subscribe((res: TpId[]) => {
      this.dataSource.data = res;
    }));
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  /**
   * Show a snackbar message
   */
  openSnackBar(message: string, action: string) {
    this._snackBar.open(message, action, { duration: 3000 });
  }

  /**
   * Add a new row to the table for editing
   */
  addRow() {
    const newRow: TpId = {
      id: '-1',
      Name: this.tpId,
      TPID: '',
      Type: 'ISA',
      isEdit: true,
      isSelected: false,
      User: ''
    };
    this.dataSource.data = [newRow, ...this.dataSource.data];
  }

  /**
   * Handle row edit: add or update
   */
  editRow(row: TpId) {
    if (row.id === '-1') {
      this.handleAddRow(row);
    } else {
      this.handleUpdateRow(row);
    }
  }

  /**
   * Add a new TPID row via the service
   */
  private handleAddRow(row: TpId) {
    if (row.TPID !== '') {
      row.Name = this.tpId;
      this.subscriptions.push(this.tpIdService.addTPID(row).subscribe((res) => {
        row.isEdit = false;
        row.id = res.id;
        console.info('Added TP: ' + row.TPID + ', ID: ' + res.id + ', ' + res.Status);
        this.openSnackBar('TPID ' + row.TPID, 'Save ' + res.Status);
      }));
    } else {
      this.removeInvalidRow(row);
      this.openSnackBar('Required fields missing', 'Error');
    }
  }

  /**
   * Update an existing TPID row via the service
   */
  private handleUpdateRow(row: TpId) {
    row.Name = this.tpId;
    this.subscriptions.push(this.tpIdService.updateTPID(row).subscribe((res) => {
      row.isEdit = false;
      console.info('Update TP: ' + row.TPID + ', ID: ' + res.id + ', ' + res.Status);
      this.openSnackBar('Update TPID ' + row.TPID, 'Save ' + res.Status);
    }));
  }

  /**
   * Remove a row if required fields are missing
   */
  private removeInvalidRow(row: TpId) {
    const ind = this.dataSource.data.indexOf(row);
    if (ind > -1) {
      this.dataSource.data.splice(ind, 1);
      this.dataSource.data = [...this.dataSource.data];
    }
    row.isEdit = false;
  }

  /**
   * Cancel editing and refresh the table
   */
  cancelRow(row: TpId) {
    this.refreshRows();
  }

  /**
   * Remove a TPID row after confirmation
   */
  removeRow(row: TpId) {
    const tpid = row.TPID;
    console.log('removeRow: ' + tpid);
    try {
      this.subscriptions.push(
        this.dialog.open(ConfirmDialogComponent)
          .afterClosed()
          .subscribe((confirm) => {
            if (confirm) {
              this.subscriptions.push(
                this.tpIdService.deleteTPID(tpid).subscribe({
                  next: (res) => {
                    if (res["Status"] !== undefined) {
                      this.refreshRows();
                    } else if (res["Error"] !== undefined) {
                      this.openSnackBar(res["Error"], 'Error');
                    }
                    console.info('deleteTPID: Json: ' + JSON.stringify(res));
                  },
                  error: (e) => {
                    this.openSnackBar('deleteTPID catchError: ' + e, 'Error');
                  }
                })
              );
            }
          })
      );
    } catch (e) {
      console.error('Exception: ' + e);
    }
  }

  /**
   * Refresh the table data from the service
   */
  private refreshRows() {
    console.info('RefreshRows');
    this.subscriptions.push(this.tpIdService.getTpIds(this.tpId).subscribe((res: TpId[]) => {
      this.dataSource.data = res;
    }));
  }

  /**
   * Handle input validation for a cell
   */
  inputHandler(e: Event, id: string, key: string) {
    if (!this.valid[id]) {
      this.valid[id] = {};
    }
    const input = e.target as HTMLInputElement;
    this.valid[id][key] = input.validity.valid;
  }

  /**
   * Disable submit if any field in the row is invalid
   */
  disableSubmit(id: string): boolean {
    if (this.valid[id]) {
      return Object.values(this.valid[id]).some((item) => item === false);
    }
    return false;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });
  }
}
