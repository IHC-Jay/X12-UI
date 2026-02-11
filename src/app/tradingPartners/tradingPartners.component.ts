import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin, Observable, of } from 'rxjs';
import { first } from 'rxjs/operators';
import {TradingPartner, TradingPartnerColumns} from './TradingPartner';
import {TpRestServiceComponent} from '../services/tprest-service.component';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { MatSelect, MatSelectChange } from '@angular/material/select';
import { MatFormField } from '@angular/material/form-field';

import {UtilService} from '../services/utilService';
import { environment } from '../../environments/environment';
import { MatIconModule } from '@angular/material/icon';

export interface TpFilter {
  name:string;
  options:string[];
  defaultValue:string;
}

export interface filterOption{
  name:string;
  value:string;
  isdefault:boolean;
}

@Component({
    selector: 'app-tradingPartners',
    templateUrl: './tradingPartners.component.html',
    styleUrls: ['./tradingPartners.component.css'],
    standalone: false
})



export class TradingPartnersComponent implements OnInit, AfterViewInit {
  // ...existing code...
  // Refactor large methods into private helpers for clarity and maintainability

  public size = 5;
  public pageNumber = 0;
  searchText:string;
  ifSelect:boolean = false;
  ifAdd:boolean = false;

    tpType = `${environment.tpType}`;
    orgType = `${environment.orgType}`;


    displayedColumns: string[] = TradingPartnerColumns.map((col) => col.key);
    columnsSchema: any = TradingPartnerColumns;
    dataSource = new MatTableDataSource<TradingPartner>();
    dataSourceFilters = new MatTableDataSource<TradingPartner>();
    tpFilters: TpFilter[]=[];
    valid: any = {};

    defaultValue = "All";
    filterDictionary= new Map<string,string>();


    @ViewChild(MatSort) sort: MatSort;
    @ViewChild(MatPaginator) paginator: MatPaginator;

    constructor(public dialog: MatDialog, private router: Router,
      private TradingPartnerService: TpRestServiceComponent)
    {

    }

    ngOnInit()
    {

      sessionStorage.removeItem("currentTab")
      sessionStorage.setItem("currentTab", "Trading Partners");
      let continueOn = true;
      if (sessionStorage.getItem("TpOperation") != null)
      {
         console.info("TradingPartnersComponent ngOnInit" + sessionStorage.getItem("NewTpId") + ", " + sessionStorage.getItem("TpOperation") );
         if (sessionStorage.getItem("TpOperation").indexOf("tp-add") >= 0)
         {
            this.router.navigate(["/TradingPartners/tp-add/"]);
            continueOn = false ;
         }
         else if (sessionStorage.getItem("TpOperation").indexOf("tpLink-add") >= 0)
         {
            this.router.navigate(["TradingPartners/tpIds/tp-links/add-edit/tp-add/WF/TPID" ]);
            continueOn = false ;
         }
      }
      if(continueOn)
      {

        this.TradingPartnerService.fetchTradingPartners().subscribe((res: any) => {
          this.dataSource.data = res;

          this.tpFilters.push({name:'name',options:this.displayedColumns,defaultValue:this.defaultValue});

          this.dataSourceFilters.filterPredicate = function (record,filter) {
            debugger;
            var map = new Map(JSON.parse(filter));
            let isMatch = false;
            for(let [key,value] of map){
              isMatch = (value=="All") || (record[key as keyof TradingPartner] == value);
              if(!isMatch) return false;
            }
            return isMatch;
          }



        });
      }


    }

    ngAfterViewInit() {
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;

    }

    RefreshRows()
    {
      console.info('RefreshRows')
      this.TradingPartnerService.fetchTradingPartners().subscribe((res: any) => {
        this.dataSource.data = res;
      });
    }

    addRow() {
      console.info("Call add for: " );
      this.router.navigate(["/TradingPartners/tp-add/"]);
    }

    editTp(row: TradingPartner) {
      console.info('edit  TP: ' + row.id +", " + row.Name);
      this.router.navigate(["/TradingPartners/tp-add/" + row.Name],

      {
        queryParams: {
          'id': row.id,
          'tradingPartner': row.Name,
          'tpId'  : row.TPID,
          'tpType': row.TPtype,
          'contactName': row.ContactName, 'contactEmail': row.ContactEmail, 'contactPhone': row.ContactPhone
        }
    }

       );

    }

    editRow(row: TradingPartner) {
      console.info('editRow: ' + row.id +", " + row.Name);
      if (row.id === '-1') {

        if (row.Name !== '')
        {
          let res = this.TradingPartnerService.addTradingPartner(row).subscribe((res) => {
            console.info('Added TP: ' + row.Name + ": " + res.id);
            row.id = res.id;
            row.isEdit = false;
          });


        }
        else
        {
          let ind = this.dataSource.data.indexOf(row)
          this.dataSource.data.splice(ind, 1);
          this.dataSource.data = [...this.dataSource.data];
          alert('Name is required');
        }
        row.isEdit = false;
        this.ifSelect = false;
      } else {
        console.info('Edit a TP ');
        this.TradingPartnerService.updateTradingPartner(row).subscribe(() => (row.isEdit = false));
        this.ifSelect = false;
      }
      this.ifAdd = false;
    }

    cancelRow(row: TradingPartner)
    {
      row.isEdit = false;
      if (row.id === '-1') {
        this.dataSource.data.splice(0, 1);
        this.dataSource.data = [...this.dataSource.data];
      }
      this.ifSelect = false;
      this.ifAdd = false;
    }

    removeRow(row: TradingPartner)  {
      let name = row.Name;
      console.log('removeRow: ' + name);
      try
      {
        this.dialog
        .open(ConfirmDialogComponent)
        .afterClosed()
        .subscribe((confirm) => {
          if (confirm) {

        this.TradingPartnerService.deleteTradingPartner(name).subscribe({
          next: (res) =>
          {
            if (res["Status"] !== undefined) {
              this.RefreshRows();
            }
            else if(res["Error"] !== undefined) {
              alert(res["Error"])
            }
            console.info('deleteTradingPartner: Json: ' + JSON.stringify(res));
            return;
          },
          error: (e) => {
            alert('deleteTradingPartner catchError: ' + e);
            return;
          }
        })

      }
      });

    }
    catch(e)
    {
      console.error('Exception: ' + e)
    }

    }

    copyTP()
    {
      this.router.navigate(["/TradingPartners/copyTP"] );
    }

    inputHandler(e: any, id: string, key: string) {

      if (!this.valid[id]) {
        this.valid[id] = {};
      }
      this.valid[id][key] = e.target.validity.valid;
    }

    disableSubmit(button:string, id: string) {

      if (this.valid[id]) {

        return Object.values(this.valid[id]).some((item) => item === false);
      }

      return false;
    }

    applyFilter(event: Event) {


      const filterValue = (event.target as HTMLInputElement).value;
      if(filterValue === '')
      {
        this.ifSelect = false;
      }
      else{
        this.ifSelect = true;

        this.dataSource.filter = filterValue.trim().toLowerCase();
      }
    }


  }
