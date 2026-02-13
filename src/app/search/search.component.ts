import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';

import { FormsModule,  FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import {TradingPartner} from '../tradingPartners/TradingPartner';
import {TpId, TpIdColumns} from '../tradingPartners/tpIds/TpId';
import {tpLinks} from '../tradingPartners/tpIds/tp-links/tp-links';
import {TpRestServiceComponent} from '../services/tprest-service.component';
import { MatTableDataSource } from '@angular/material/table';
import {
  AUTO_STYLE,
  animate,
  state,
  style,
  transition,
  trigger
} from '@angular/animations';

const DEFAULT_DURATION = 300;
@Component({
    selector: 'app-search',
    templateUrl: './search.component.html',
    styleUrls: ['./search.component.css'],
    animations: [
        trigger('collapse', [
            state('false', style({ height: AUTO_STYLE, visibility: AUTO_STYLE })),
            state('true', style({ height: '0', visibility: 'hidden' })),
            transition('false => true', animate(DEFAULT_DURATION + 'ms ease-in')),
            transition('true => false', animate(DEFAULT_DURATION + 'ms ease-out'))
        ])
    ],
    standalone: false
})

export class SearchComponent implements OnInit {
  // ...existing code...
  // Refactor large methods into private helpers for clarity and maintainability

  loading:boolean = false;
  selectedTpId ='';
  form!: FormGroup;
  lnkArrSize: number = 0;
  lmaxRows:number = 20;
  rowNum:number = 0;

  canRenderDetails = false;
  selectedTp:string = '';

  dataSource: TpId[] = [];
  rowLinks: tpLinks[][] = [];

  @ViewChild("searchTpId") focusField: ElementRef;


  constructor(private TradingPartnerService: TpRestServiceComponent,
    private formBuilder: FormBuilder
  ){

    this.form =new FormGroup({
      tpId: new FormControl()
    });

  }

  async ngOnInit() {

      sessionStorage.removeItem("currentTab")
      sessionStorage.setItem("currentTab", "Search TPID");

    this.form = this.formBuilder.group({
      searchTpId: ['', Validators.required]

  });


    }
    ngAfterViewInit() {
      this.focusField.nativeElement.focus();
    }


    onTpIdChange()
    {
      console.info('TpId changed');
     let searchTpIdVal = this.form.controls.searchTpId.value.toString().trim();

     console.info('searchTpIdVal: ' + searchTpIdVal);

    this.dataSource = [];
    this.collapse();
    this.loading = true;
    this.selectedTp = '';
    this.rowNum = 0;




    this.TradingPartnerService.fetchTPforTpId(searchTpIdVal).subscribe((lnkArr: any) => {
      this.lnkArrSize = Array.isArray(lnkArr) ? lnkArr.length : 0;
      lnkArr.forEach(res => {
        if (this.rowNum >= this.lmaxRows) {
          console.info('Max rows of ' + this.lmaxRows + ' reached. Not processing further results.');
          return;
        }
        if (res.Name !== undefined && res.Name !== '') {
          console.info(this.rowNum + '. onTpIdChange: ' + res.Name);
          this.rowNum++;
          this.selectedTp = res.Name;
          var tp: TpId = { id: '0', Name: res.Name, TPID: res.TPID, Type: 'BOTH', isEdit: false, isSelected: false, User: '' };
          this.dataSource.push(tp);
        } else {
          console.info('fetchTPforTpId returned no row ');
          this.selectedTp = 'Not Found';
          var tp: TpId = { id: '0', Name: 'Not Found', TPID: searchTpIdVal, Type: 'BOTH', isEdit: false, isSelected: false, User: '' };
          this.dataSource.push(tp);
        }
      });
      this.canRenderDetails = true;
      this.loading = false;
    });


    }
    clearDetails()
    {
      this.canRenderDetails = false;
    }

    expandedRow: number | null = null;

    expand(rowIdx: number) {
      this.expandedRow = rowIdx;
      const tpId = this.dataSource[rowIdx]?.TPID;
      if (tpId) {
        this.loading = true;
        this.TradingPartnerService.fetchTpLinks(tpId).subscribe(
          tpLinksData => {
            this.rowLinks[rowIdx] = tpLinksData;
            this.canRenderDetails = true;
            this.loading = false;
          },
          error => {
            console.error(error.message);
            this.loading = false;
          }
        );
      }
    }

    collapse() {
      this.expandedRow = null;
      window.scrollTo(0, 0);
    }

}
