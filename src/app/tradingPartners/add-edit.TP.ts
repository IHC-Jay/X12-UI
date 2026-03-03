import { Component,   ViewChildren,  ElementRef,  ChangeDetectorRef,  QueryList, OnInit, inject } from '@angular/core';
import { Router, ActivatedRoute, RouteConfigLoadEnd } from '@angular/router';
import { AbstractControlOptions, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';
import { FormsModule, ReactiveFormsModule, FormGroupDirective } from '@angular/forms';
import { EventListenerFocusTrapInertStrategy } from '@angular/cdk/a11y';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';

import {TradingPartner} from './TradingPartner';
import { TpId } from './tpIds/TpId';
import { TpRestServiceComponent } from '../services/tprest-service.component';import { StorageService } from '../services/storage.service';import { TradingPartnersComponent } from './tradingPartners.component';

import { environment } from '../../environments/environment';

@Component(
  {  selector: 'add-edit',
     templateUrl: './add-edit.TP.html',
     styleUrls: ['./add-edit.TP.css'],

    standalone: false
})


export class AddEditTP implements OnInit {
      ngOnDestroy(): void {
        if (this.sub) {
          this.sub.unsubscribe();
        }
      }
    form!: FormGroup;
    tpNm!: string;

    isAddMode!: boolean;
    loading = false;
    createLink: boolean = false;

    submitted = false;



    row: TradingPartner = new TradingPartner();

    tpType = `${environment.tpType}`;
    orgType = `${environment.orgType}`;
    tpId: string = '';
    tradingPartner: string = '';


    canRender = false;

    sub:any;
     private _snackBar = inject(MatSnackBar);


    @ViewChildren("input") inputs: QueryList<ElementRef>;

    constructor(
        private formBuilder: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private TradingPartnerService: TpRestServiceComponent,
        private cdRef: ChangeDetectorRef,
        private storageService: StorageService
    ) {

     }

public initializeData()
{
  console.info("1. fetchpTypes");

}

    async ngOnInit() {
      console.info("AddEditTP ngOnInit");
      this.setupSessionTab();
      this.initTradingPartner();
      this.initForm();
      this.handleSessionTpId();
      this.subscribeToQueryParams();
    }

    /**
     * Remove and set the current tab in session storage.
     */
    private setupSessionTab() {
      this.storageService.removeItem("currentTab");
      this.storageService.setItem("currentTab", "Trading Partners");
    }

    /**
     * Initialize TradingPartner row and mode.
     */
    private initTradingPartner() {
      this.row = new TradingPartner();
      const routeParams = this.route.snapshot.paramMap;
      this.tpNm = routeParams.get('tpNm');
      if (this.tpNm === undefined || this.tpNm === null) {
        this.isAddMode = true;
        this.row.id = '-1';
        console.info('Add TP');
      } else {
        this.isAddMode = false;
        console.info('Edit TP: ' + this.tpNm);
      }
    }

    /**
     * Initialize the reactive form.
     */
    private initForm() {
      this.form = this.formBuilder.group({
        Name: ['', Validators.required],
        TPtype: [this.tpType, Validators.required],
        TpId: [''],
        ContactName: [''],
        Phone: [''],
        Email: ['']
      });
    }

    /**
     * Handle session TPID and TpOperation for linking.
     */
    private handleSessionTpId() {
      if (sessionStorage.getItem("NewTpId") !== null) {
        this.tpId = sessionStorage.getItem("NewTpId") || '';
        this.form.controls['TpId'].setValue(this.tpId);
        console.info('Set TPID: ' + this.tpId);
        if (sessionStorage.getItem("TpOperation")?.indexOf("tpLink-add") >= 0) {
          this.createLink = true;
        }
      }
    }

    /**
     * Subscribe to query params and update form for edit mode.
     */
    private subscribeToQueryParams() {
      this.sub = this.route.queryParams.subscribe(params => {
        if (params !== undefined && !this.isAddMode) {
          this.tradingPartner = params['tradingPartner'];
          this.form.controls['Name'].setValue(params['tradingPartner']);
          this.row.id = params['id'];
          this.form.controls['Email'].setValue(params['contactEmail']);
          this.form.controls.Phone.setValue(params['contactPhone']);
          this.form.controls.TPtype.setValue(params['tpType']);
          this.form.controls.ContactName.setValue(params['contactName']);
          this.tpId = params['tpId'];
          this.form.controls['TpId'].setValue(this.tpId);
        }
        this.canRender = true;
      });
    }

    // convenience getter for easy access to form fields
    get f() { return this.form.controls; }

    /**
     * Cancel editing and navigate back to Trading Partners
     */
    onCancel() {
      Object.keys(this.form.controls).forEach(el => {
        console.log(el + ': ' + this.form.controls[el].value);
      });
      sessionStorage.removeItem("NewTpId");
      sessionStorage.removeItem("TpOperation");
      this.router.navigate(["/TradingPartners/"]);
    }

    /**
     * Handle form submission for add/edit
     */
    onSubmit() {
      this.submitted = true;
      Object.keys(this.form.controls).forEach(el => {
        if (this.form.controls[el].errors) {
          console.log(el + " - not initialized");
        }
      });
      // stop here if form is invalid
      if (this.form.invalid) {
        console.info('Invalid: ' + this.form.invalid);
        return;
      }
      this.loading = true;
      this.createOrUpdateTradingPartner();
      this.loading = false;
      if (this.createLink) {
        this.router.navigate(["TradingPartners/tpIds/tp-links/add-edit/tp-add/WF/TPID"]);
      }
    }

    /**
     * Create or update a TradingPartner based on mode
     */
    private createOrUpdateTradingPartner() {
      console.info('Add/Update TradingPartner for: ' + this.form.value.Name);
      this.populateRowFromForm();
      if (this.row.id === '-1') {
        this.addTradingPartner();
      } else {
        this.updateTradingPartner();
      }
    }

    /**
     * Populate TradingPartner row from form values
     */
    private populateRowFromForm() {
      this.row.Name = this.form.value.Name;
      this.row.TPID = this.form.value.TpId;
      this.row.TPtype = this.form.value.TPtype;
      this.row.ContactName = this.form.value.ContactName;
      this.row.ContactEmail = this.form.value.Email;
      this.row.ContactPhone = this.form.value.Phone;
    }

    /**
     * Add a new TradingPartner and TPID if needed
     */
    private addTradingPartner() {
      if (this.row.Name !== '') {
        this.TradingPartnerService.addTradingPartner(this.row).subscribe((res) => {
          console.info('Added TP: ' + this.row.Name + ": " + res.id);
          this.row.id = res.id;
          if (res.id !== '' && this.row.TPID !== '') {
            this.addTPIDForNewPartner();
          }
          this.openSnackBar('Add TradingPartner: ' + this.form.value.Name, ', ID: ' + res.id);
        });
      }
    }

    /**
     * Add a TPID for a new TradingPartner
     */
    private addTPIDForNewPartner() {
      const newRow: TpId = {
        id: '-1',
        Name: this.row.Name,
        TPID: this.row.TPID,
        Type: 'ISA',
        isEdit: true,
        isSelected: false,
        User: ''
      };
      this.TradingPartnerService.addTPID(newRow).subscribe((res) => {
        console.info('Added TP: ' + this.row.TPID + ", TPID: " + this.row.TPID + ", ID: " + this.row.id);
      });
    }

    /**
     * Update an existing TradingPartner
     */
    private updateTradingPartner() {
      console.info('Update a TP');
      this.TradingPartnerService.updateTradingPartner(this.row).subscribe(() => (this.row.isEdit = false));
      this.openSnackBar('Update TradingPartner: ' + this.form.value.Name, 'OK');
    }

    /**
     * Show a snackbar message
     */
    openSnackBar(message: string, action: string) {
      this._snackBar.open(message, action, { duration: 3000 });
    }

    /**
     * Submit and create links if needed
     */
    onSubmitCreateLinks() {
      this.onSubmit();
    }

}
