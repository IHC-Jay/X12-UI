// app.module.ts

import { NgModule, Component, inject } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { Routes, RouterModule } from '@angular/router';
import { formatDate} from '@angular/common'

import { AppComponent } from './app.component';
import { MatPaginatorModule } from '@angular/material/paginator';

import { MatTableModule } from '@angular/material/table';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSort, MatSortModule } from '@angular/material/sort';

import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { MatTabsModule, MatTabChangeEvent } from '@angular/material/tabs';
import { MatCard, MatCardModule } from '@angular/material/card';
import { AppRoutingModule } from './app-routing.module';
import { HeaderComponent } from './header/header.component';

import { TpRestServiceComponent } from './services/tprest-service.component';
import { TransRestServiceComponent } from './services/transrest-service.component';
import { WfRestServiceComponent } from './services/wfrest-service.component';
import {UtilService} from './services/utilService';

import { TradingPartnersComponent } from './tradingPartners/tradingPartners.component';
import { copyTPComponent  } from './tradingPartners/copyTP.component';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';
import { ListConfirmDialogComponent } from './list-confirm-dialog/list-confirm-dialog.component';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import {MatSelectModule} from '@angular/material/select';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatRadioModule, MatRadioGroup} from '@angular/material/radio';

import {MatTreeModule} from '@angular/material/tree';


import { MatDialogModule } from '@angular/material/dialog';
import { TpIdComponent } from './tradingPartners/tpIds/tpIds.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import  {AddEditTP} from './tradingPartners/add-edit.TP';
import { AddEditTpLink } from './tradingPartners/tpIds/tp-links/addEdit-links/add-edit.TpLink';
import { tpLinksComponent } from './tradingPartners/tpIds/tp-links/tp-links.component';
import { SearchComponent } from './search/search.component';
import {TransactionComponent} from './transaction/transaction.component'
import {AuthInterceptor} from './login/auth-interceptor';
import {ErrorInterceptor} from './login/error.interceptor';
import {BulkAddLinksComponent} from './tradingPartners/tpIds/tp-links/addEdit-links/bulk-add.components';
import {SingleNoteComponent} from './tradingPartners/tpIds/tp-links/single-note/single-note.component';
import {CreateNoteComponent} from './tradingPartners/tpIds/tp-links/create-note/create-note.component';
import { TransactionDetailComponent } from './transaction/transaction-details/transaction-details.component';
import { TransactionSettingsComponent } from './transaction/transaction-settings/transaction-settings.component';
import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';
import {MatExpansionModule, MatExpansionPanel} from '@angular/material/expansion';
import { Modalx12Component } from './transaction/transaction-details/modal/modal-x12.component';
import { ModalHelperService } from './transaction/transaction-details/modal/modal-helper.service';

import {MatBadgeModule} from '@angular/material/badge';
import {MatNativeDateModule} from '@angular/material/core';
import { MatDatepickerModule, MatDatepicker, MatDateRangePicker} from '@angular/material/datepicker';

import { AngularSplitModule } from 'angular-split';
import { BaseChartDirective  } from 'ng2-charts';

import {SummaryComponent} from './summary/summary.component'
import {DashBoardComponent} from './dashboard/dashboard.component'
import { WorkflowComponent } from './workflow/workflow.component';
import {WorkflowDetailsComponent} from './workflow/workflowDetails/workflowDetails.component';
import {WorkflowHistoryComponent} from './workflow/workflowHistory/workflowHistory.component';

import { MatSnackBarModule } from '@angular/material/snack-bar';

import {
  CdkDrag,
  CdkDropList,
  CdkDropListGroup
} from '@angular/cdk/drag-drop';
import { RdpValidationErrorsComponent } from './workflow/rdpValidationErrors/rdpValidationErrors.component';
import { PdfReaderComponent } from './pdf-reader/pdf-reader.component';
import { HelpDialogComponent } from './help/help-dialog.component';

@NgModule({ declarations: [
        AppComponent,
        HeaderComponent,
        // TpRestServiceComponent, // Service, should not be declared
        // TransRestServiceComponent, // Service, should not be declared
        // WfRestServiceComponent, // Service, should not be declared
        TradingPartnersComponent,
        copyTPComponent,
        ConfirmDialogComponent,
        ListConfirmDialogComponent,
        TpIdComponent,
        AddEditTP,
        tpLinksComponent,
        AddEditTpLink,
        SearchComponent,
        TransactionComponent,
        BulkAddLinksComponent,
        SingleNoteComponent,
        CreateNoteComponent,
        Modalx12Component,
        TransactionDetailComponent,
        TransactionSettingsComponent,
        SummaryComponent,
        DashBoardComponent,
        WorkflowComponent,
        WorkflowDetailsComponent,
        WorkflowHistoryComponent,
        RdpValidationErrorsComponent,
        PdfReaderComponent,
        HelpDialogComponent
    ],
    exports: [
        MatTableModule,
        MatSortModule,
        MatPaginatorModule
    ],
    bootstrap: [AppComponent], imports: [
      BrowserModule,
        MatMenuModule,
        MatTableModule,
        MatPaginatorModule,
        MatListModule,
        MatButtonModule,
        MatTabsModule,
        MatCheckboxModule,
        MatDialogModule,
        AppRoutingModule,
        MatButtonModule,
        MatIconModule,
        MatBadgeModule,
        FormsModule,
        ReactiveFormsModule,
        MatSortModule,
        MatSelectModule,
        MatFormFieldModule,
        MatInputModule,
        MatTooltipModule,
        NgMultiSelectDropDownModule.forRoot(),
        MatExpansionModule,
        MatNativeDateModule,
        MatDatepickerModule,
        AngularSplitModule,
        MatCardModule, MatRadioModule,
        MatTreeModule,

        CdkDrag,
        CdkDropList,
        MatSnackBarModule,
        BaseChartDirective,
        CdkDropListGroup], providers: [
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
        ModalHelperService,
        provideHttpClient(withInterceptorsFromDi())
    ] })
export class AppModule {

public cors =''; // require('cors');


 }

