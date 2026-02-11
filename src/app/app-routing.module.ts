import { Component, NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { AuthGuard } from './login/auth.guard';
import { TradingPartnersComponent } from './tradingPartners/tradingPartners.component';
import { copyTPComponent } from './tradingPartners/copyTP.component';
import { TpIdComponent } from './tradingPartners/tpIds/tpIds.component';
import { tpLinksComponent } from './tradingPartners/tpIds/tp-links/tp-links.component';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';

import {AddEditTP} from './tradingPartners/add-edit.TP';
import {AddEditTpLink} from './tradingPartners/tpIds/tp-links/addEdit-links/add-edit.TpLink';
import {BulkAddLinksComponent} from './tradingPartners/tpIds/tp-links/addEdit-links/bulk-add.components';
import { SearchComponent } from './search/search.component';
import {TransactionComponent} from './transaction/transaction.component'
import {TransactionDetailComponent} from './transaction/transaction-details/transaction-details.component';
import {TransactionSettingsComponent} from "./transaction/transaction-settings/transaction-settings.component"
import { WorkflowComponent } from './workflow/workflow.component';
import {WorkflowDetailsComponent} from './workflow/workflowDetails/workflowDetails.component';
import {WorkflowHistoryComponent} from './workflow/workflowHistory/workflowHistory.component';
import {RdpValidationErrorsComponent} from './workflow/rdpValidationErrors/rdpValidationErrors.component';

import { SummaryComponent } from './summary/summary.component';
import {DashBoardComponent} from './dashboard/dashboard.component';
import { X12ViewerComponent } from './x12/x12-viewer.component';
import { PdfReaderComponent } from './pdf-reader/pdf-reader.component';
import { CodeValueLookupComponent } from './codeValue-lookup/codeValue-lookup.component';


const appRoutes: Routes = [
  {path: '/', component: HeaderComponent},
  {path: 'TradingPartners', component: TradingPartnersComponent, canActivate: [AuthGuard] , title: 'Trading Partners'},
  {path: 'TradingPartners/tp-add/:tpNm', component: AddEditTP, canActivate: [AuthGuard]},
  {path: 'TradingPartners/tp-add', component: AddEditTP, canActivate: [AuthGuard]},
  {path: 'TradingPartners/copyTP', component: copyTPComponent, canActivate: [AuthGuard] , title: 'Copy TP'},
  {path: 'TradingPartners/tpIds/:tpId', component: TpIdComponent, canActivate: [AuthGuard] , title: 'TPID'},
  {path: 'TradingPartners/tpIds/tp-links/:tpId', component: tpLinksComponent, canActivate: [AuthGuard] , title: 'TP Links'},
  {path: 'TradingPartners/tpIds/tp-links/:tpId/:tpName', component: tpLinksComponent, canActivate: [AuthGuard] , title: 'TP Links'},
  {path: 'TradingPartners/tpIds/tp-links/add-edit/tp-add/:tpId/:tpName', component: AddEditTpLink, canActivate: [AuthGuard] , title: 'TP Link Add'},
  {path: 'TradingPartners/tpIds/tp-links/add-edit/tp-bulkAdd/:tpId/:tpName', component: BulkAddLinksComponent, canActivate: [AuthGuard] , title: 'TP Link Add'},
  {path: 'TradingPartners/tpIds/tp-links/add-edit/tp-edit/:tpId/:tpName/:tpLink', component: AddEditTpLink, canActivate: [AuthGuard], title: 'TP Link'},
  {path: 'search', component: SearchComponent, canActivate: [AuthGuard], title: 'TP Search'},
  {path: 'transaction', component: TransactionComponent, canActivate: [AuthGuard], title: 'Transactions'},
  {path: 'transaction/transaction-settings', component: TransactionSettingsComponent, canActivate: [AuthGuard], title: 'Settings'},
  {path: 'transaction/transaction-details', component: TransactionDetailComponent, canActivate: [AuthGuard], title: 'Transaction Details'},
  {path: 'x12-viewer', component: X12ViewerComponent, canActivate: [AuthGuard], title: 'X12 Viewer'},
  {path: 'pdf-reader', component: PdfReaderComponent, canActivate: [AuthGuard], title: 'PDF Reader'},
  {path: 'hl3-lookup', component: CodeValueLookupComponent, canActivate: [AuthGuard], title: 'HL3 Lookup'},
  {path: 'workflow', component: WorkflowComponent, canActivate: [AuthGuard] , title: 'WorkFlow'},
  {path: 'summary', component: SummaryComponent, canActivate: [AuthGuard] , title: 'Transmissions'},
  {path: 'dashboard', component: DashBoardComponent, canActivate: [AuthGuard], title: 'Dashboard'},
  {path: 'workflow/workflowDetails', component: RdpValidationErrorsComponent, canActivate: [AuthGuard] , title: 'WF Details'},
  {path: 'workflow/workflowHistory', component: WorkflowHistoryComponent, canActivate: [AuthGuard], title: 'WF History'}
];

@NgModule({
imports: [BrowserModule,
  ReactiveFormsModule,
  RouterModule.forRoot(appRoutes)],
exports: [RouterModule]
})

export class AppRoutingModule{

}
