

// Angular and Material imports
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { MatTableDataSource } from '@angular/material/table';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { tpLinks } from './tp-links';
import { TpRestServiceComponent } from '../../../services/tprest-service.component';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../../confirm-dialog/confirm-dialog.component';

// Utility imports
import * as _ from 'lodash';



// Injectable not needed for component

@Component({
    selector: 'app-tp-links',
    templateUrl: './tp-links.component.html',
    styleUrls: ['./tp-links.component.css'],
    animations: [
        trigger('tpLinkExpand', [
            state('collapsed', style({ height: '0px', minHeight: '0' })),
            state('expanded', style({ height: '*' })),
            transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
        ]),
    ],
    standalone: false
})



/**
 * Component for displaying and managing Trading Partner Links
 */
export class tpLinksComponent implements OnInit, OnDestroy {
  // --- Table and Pagination ---
  public size = 5;
  public pageNumber = 0;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  displayedtpLinksColumnsList: string[] = ['Link', 'IsaSenderId', 'IsaReceiverId', 'TransType', 'Mode', 'Active', 'actions'];
  tpIdLinksList = new MatTableDataSource<tpLinks>();

  // --- State ---
  bulkInsert = false;
  tpIdToLink: string;
  tpId: string;
  tpName: string;
  isTableExpanded = false;
  loadedPosts: tpLinks[] = [];
  isFetching = false;
  mySelect = '1';
  error: string | null = null;
  private errorSub: Subscription;
  tpLinksArray: tpLinks[] = [];

  constructor(
    public dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private tpLinksService: TpRestServiceComponent
  ) {
    this.tpIdToLink = '';
  }

  /**
   * Lifecycle: OnInit
   */
  ngOnInit() {
    console.info("ngOnInit");
    this.initRouteParams();
    this.subscribeToErrors();
    this.refreshLinks();
  }

  /**
   * Lifecycle: AfterViewInit
   */
  ngAfterViewInit() {
    this.tpIdLinksList.paginator = this.paginator;
    this.tpIdLinksList.sort = this.sort;
  }

  /**
   * Lifecycle: OnDestroy
   */
  ngOnDestroy() {
    if (this.errorSub) {
      this.errorSub.unsubscribe();
    }
  }

  // --- Initialization Helpers ---

  /**
   * Initialize route parameters
   */
  private initRouteParams() {
    const routeParams = this.route.snapshot.paramMap;
    this.tpId = routeParams.get('tpId') || '';
    this.tpName = routeParams.get('tpName') || '';
    this.tpIdToLink = this.tpId;
    console.info("tpLink init:" + this.tpName + ", " + this.tpId);
  }

  /**
   * Subscribe to error messages from the service
   */
  private subscribeToErrors() {
    this.errorSub = this.tpLinksService.error.subscribe(errorMessage => {
      this.error = errorMessage;
    });
  }

  // --- Data Fetching and Refresh ---

  /**
   * Refresh the list of TP Links
   */
  refreshLinks() {
    this.isFetching = true;
    this.tpLinksService.fetchTpLinks(this.tpId).subscribe(
      tpLinksData => {
        this.isFetching = false;
        this.loadedPosts = tpLinksData;
        this.tpIdLinksList.data = this.loadedPosts;
        console.info("tpIdLinksList: " + this.tpIdLinksList.data.length);
        this.bulkInsert = !this.tpIdLinksList.data || this.tpIdLinksList.data.length <= 0;
      },
      error => {
        this.isFetching = false;
        this.error = error.message;
      }
    );
    console.debug("Got TPLink records");
  }

  // --- Table and Row Actions ---

  /**
   * Toggle expansion of all table rows
   */
  toggleTableRows() {
    this.isTableExpanded = !this.isTableExpanded;
    this.tpIdLinksList.data.forEach((row: any) => {
      row.isExpanded = this.isTableExpanded;
    });
  }

  /**
   * Toggle expansion for a single row by Link name
   */
  selectTpLinks(nm: string) {
    console.info("fetchtp-links: " + nm);
    this.tpIdLinksList.data.forEach((row: any) => {
      if (row.Link === nm) {
        row.isExpanded = !row.isExpanded;
      }
    });
  }

  /**
   * Add a new TP Link row
   */
  addRow() {
    console.info("Call add for: " + this.tpId);
    this.router.navigate([`/TradingPartners/tpIds/tp-links/add-edit/tp-add/${this.tpId}/${this.tpName}`]);
  }

  /**
   * Bulk add TP Links
   */
  bulkRow() {
    this.router.navigate([`/TradingPartners/tpIds/tp-links/add-edit/tp-bulkAdd/${this.tpId}/${this.tpName}`]);
  }

  /**
   * Edit a TP Link row
   */
  editRow(tpLink: tpLinks) {
    console.info(`Call edit for: ${typeof tpLink}, ${tpLink.IsaSenderId} -> ${tpLink.IsaReceiverId}, ${tpLink.Direction}`);
    if (tpLink.Direction.indexOf("In") >= 0) {
      this.router.navigate([`/TradingPartners/tpIds/tp-links/add-edit/tp-edit/${tpLink.IsaSenderId}/${this.tpName}/${tpLink.Link}`]);
    } else {
      this.router.navigate([`/TradingPartners/tpIds/tp-links/add-edit/tp-edit/${tpLink.IsaReceiverId}/${this.tpName}/${tpLink.Link}`]);
    }
  }

  /**
   * Delete a TP Link
   */
  delete(tpLink: string) {
    try {
      this.dialog.open(ConfirmDialogComponent)
        .afterClosed()
        .subscribe((confirm) => {
          if (confirm) {
            this.tpLinksService.deleteTpLink(tpLink).subscribe({
              next: (res) => {
                if (res["Status"] !== undefined) {
                  this.refreshLinks();
                } else if (res["Error"] !== undefined) {
                  alert(res["Error"]);
                }
                console.info('deleteTpLink: Json: ' + JSON.stringify(res));
                return;
              },
              error: (e) => {
                alert('deleteTpLink catchError: ' + e);
                return;
              }
            });
          }
        });
    } catch (e) {
      console.error('Exception: ' + e);
    }
  }

  /**
   * Clear error state
   */
  onHandleError() {
    this.error = null;
  }
}



