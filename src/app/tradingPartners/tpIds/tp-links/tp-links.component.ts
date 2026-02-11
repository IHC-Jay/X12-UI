
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { Router, ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { tpLinks } from './tp-links';
import { TpRestServiceComponent } from '../../../services/tprest-service.component';
import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { RouterLinkWithHref } from '@angular/router';
import { TpId } from '../TpId';
import { TradingPartner } from '../../TradingPartner';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../../confirm-dialog/confirm-dialog.component';
import { MatIconModule } from '@angular/material/icon';


@Injectable({
  providedIn: 'root'
})

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


export class tpLinksComponent implements OnInit, OnDestroy {

  public size = 5;
  public pageNumber = 0;

  bulkInsert = false;
  tpIdToLink:String;
  tpId:String;
  tpName:string;

  isTableExpanded = false;

  loadedPosts: tpLinks[] = [];

  isFetching = false;
  mySelect = '1';
  error = null;

  private errorSub: Subscription;

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  tpIdLinksList = new MatTableDataSource<tpLinks>();

  displayedtpLinksColumnsList: string[] = ['Link', 'IsaSenderId', 'IsaReceiverId', 'TransType', 'Mode', 'Active', 'actions'];

  tpLinksArray: tpLinks[] = [];


  constructor(public dialog: MatDialog, private router: Router, private route: ActivatedRoute, private tpLinksService: TpRestServiceComponent
  ) {
    this.tpIdToLink = this.tpId;

  }

  ngOnInit() {

    console.info("ngOnInit");
    const routeParams = this.route.snapshot.paramMap;
    this.tpId = routeParams.get('tpId');
    this.tpName = routeParams.get('tpName');
    console.info("tpLink init:" + this.tpName + ", " + this.tpId);
    this.errorSub = this.tpLinksService.error.subscribe(errorMessage => {
      this.error = errorMessage;
    });
    this.Refresh();


    this.errorSub = this.tpLinksService.error.subscribe(errorMessage => {
      this.error = errorMessage;
    });
  }

  ngAfterViewInit() {
    this.tpIdLinksList.paginator = this.paginator;
    this.tpIdLinksList.sort = this.sort;

  }



  Refresh()
  {

    this.isFetching = true;

    this.tpLinksService.fetchTpLinks(this.tpId).subscribe(
      tpLinksData => {
        this.isFetching = false;

        this.loadedPosts = tpLinksData;
        this.tpIdLinksList.data = this.loadedPosts;
        console.info("tpIdLinksList: " + this.tpIdLinksList.data.length)
        if(this.tpIdLinksList.data == null || this.tpIdLinksList.data.length <= 0)
        {
          this.bulkInsert = true;
        }
        else {
          this.bulkInsert = false;
        }
      },
      error => {
        this.isFetching = false;
        this.error = error.message;
      }
    );


    console.debug("Got TPLink records");

  }


  // Toggel Rows
  toggleTableRows() {
    this.isTableExpanded = !this.isTableExpanded;

    this.tpIdLinksList.data.forEach((row: any) => {
      row.isExpanded = this.isTableExpanded;
      // console.info("toggleTableRows: " + row.isExpanded);
    })
  }

  onHandleError() {
    this.error = null;
  }

  ngOnDestroy() {
    this.errorSub.unsubscribe();
  }

  SelecttpLinks(nm: String) {
    console.info("fetchtp-links: " + nm);

    this.tpIdLinksList.data.forEach((row: any) => {

      if(row.Link == nm )
      {
        row.isExpanded = ! row.isExpanded;
      }
    })

  }

  addRow()
  {
    console.info("Call add for: " + this.tpId);
    this.router.navigate(["/TradingPartners/tpIds/tp-links/add-edit/tp-add/" + this.tpId +"/" + this.tpName] );
  }

  bulkRow()
  {
    this.router.navigate(["/TradingPartners/tpIds/tp-links/add-edit/tp-bulkAdd/" + this.tpId +"/" + this.tpName] );
  }

  editRow(tpLink: tpLinks)
  {
    console.info("Call edit for: " + typeof tpLink +", " + tpLink.IsaSenderId + " -> " + tpLink.IsaReceiverId +", " + tpLink.Direction);
    let newTpNm = this.tpName.replace("/", "%2F");
    if(tpLink.Direction.indexOf("In") >=0  )
    {
      this.router.navigate(["/TradingPartners/tpIds/tp-links/add-edit/tp-edit/" +  tpLink.IsaSenderId +"/" + this.tpName +"/" + tpLink.Link] );
    }
    else
    {
      this.router.navigate(["/TradingPartners/tpIds/tp-links/add-edit/tp-edit/" +  tpLink.IsaReceiverId +"/" + this.tpName +"/" + tpLink.Link] );
    }

  }

  delete(tpLink: string) {

    try
    {

      this.dialog
      .open(ConfirmDialogComponent)
      .afterClosed()
      .subscribe((confirm) => {
        if (confirm) {

          this.tpLinksService.deleteTpLink(tpLink).subscribe(
            {
              next: (res) =>
              {
                if (res["Status"] !== undefined) {
                  this.Refresh();
                }
                else if(res["Error"] !== undefined) {
                  alert(res["Error"])
                }
                console.info('deleteTpLink: Json: ' + JSON.stringify(res));
                return;
              },
              error: (e) => {
                alert('deleteTpLink catchError: ' + e);
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


}



