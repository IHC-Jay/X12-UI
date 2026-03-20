import { DateTimeUtils } from '../utils/date-time.utils';
import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';

import { FormBuilder, FormGroup, FormArray, FormControl, Validators, NgForm } from '@angular/forms';


import {TransRestServiceComponent} from '../services/transrest-service.component';
import { MatTableDataSource } from '@angular/material/table';

import { Router, ActivatedRoute } from '@angular/router';

import {DisplayColumns} from '../transaction/DisplayColumns'

import { MatMenu, MatMenuTrigger } from '@angular/material/menu';

import { catchError } from 'rxjs';

import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../environments/environment';
import { StorageService } from '../services/storage.service';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables, ChartConfiguration, ChartType, ChartDataset, LabelItem, Plugin } from 'chart.js';


@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css'],
    standalone: false
})



export class DashBoardComponent implements OnInit, AfterViewInit, OnDestroy {
  private subscriptions: any[] = [];
  private themeObserver?: MutationObserver;
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  private readonly chartPalette = [
    '#2563eb', '#16a34a', '#ea580c', '#9333ea', '#0891b2', '#dc2626', '#4f46e5'
  ];

  private readonly forcedGridPlugin: Plugin = {
    id: 'forcedGridPlugin',
    afterDraw: (chart) => {
      const { ctx, chartArea, scales } = chart as any;
      if (!ctx || !chartArea || !scales) {
        return;
      }

      const gridColor = 'rgba(17, 24, 39, 0.28)';

      ctx.save();
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;

      const yScale = scales.y;
      if (yScale?.ticks) {
        for (let i = 0; i < yScale.ticks.length; i++) {
          const y = yScale.getPixelForTick(i);
          if (y >= chartArea.top && y <= chartArea.bottom) {
            ctx.beginPath();
            ctx.moveTo(chartArea.left, y);
            ctx.lineTo(chartArea.right, y);
            ctx.stroke();
          }
        }
      }

      const xScale = scales.x;
      if (xScale?.ticks) {
        for (let i = 0; i < xScale.ticks.length; i++) {
          const x = xScale.getPixelForTick(i);
          if (x >= chartArea.left && x <= chartArea.right) {
            ctx.beginPath();
            ctx.moveTo(x, chartArea.top);
            ctx.lineTo(x, chartArea.bottom);
            ctx.stroke();
          }
        }
      }

      ctx.restore();
    }
  };

  barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    scales: {
      x: {
        type: 'category',
        stacked: false,
        ticks: { color: '#111827' },
        grid: { color: 'rgba(17, 24, 39, 0.2)' }
      },
      y: {
        type: 'linear',
        beginAtZero: true,
        ticks: { color: '#111827' },
        grid: { color: 'rgba(17, 24, 39, 0.2)' }
      }
    },
    plugins: {
      legend: {
        labels: {
          color: '#111827'
        }
      }
    }
  };

    public mbarChartLabels:LabelItem[] = [];

    public barChartType:ChartType = 'bar';
    public barChartLegend:boolean = true;
    public barChartPlugins: Plugin[] = [this.forcedGridPlugin];


  public barChartData:ChartDataset[] = [];


  contextMenuPosition = { x: '0px', y: '0px' };
  @ViewChild(MatMenuTrigger)
  contextMenu: MatMenuTrigger;

  nowDt = new Date((new Date().getTime() - (24 * 60 * 60 * 1000)));

  startDate = "2023-01-12";
  startTm = "13:30";
  endDate= "2023-01-12";
  endTm ="13:30";

  paramsList: string[];

  searchDashBoard:boolean = false;


  form!: FormGroup;
  dataTableLabel: string[] = [];
  dataTableKey: string[] = [];
  canRenderDetails = false;


  dataSource = new MatTableDataSource<any>;


  additionalsearchString = "";
  searchTypeString = "";
  currentTransType = '270';
  currentMode = 'Batch';
  sub:any;

  constructor(
    private DashBoardService: TransRestServiceComponent,
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    public dialog: MatDialog,
    private storageService: StorageService
  ) {
    tpId: new FormControl();
    Chart.register(...registerables);
  }




  ngOnInit()
  {
    console.info("ngOnInit");

     this.form = this.formBuilder.group({
      transType: ['' ],
      mode:['RealTime']
    });


    this.currentTransType = ''

    this.sub = this.route.queryParams.subscribe(params => {

      if(params !== undefined && params.dashboard !== undefined)
        {
          // Defaults to '' if no query param provided.
          this.currentTransType =  params['transaction'] || '';
          this.additionalsearchString = params['additionalSearch'] || '';
          this.searchTypeString = params['searchTypeString'];

        }

          if (this.searchTypeString === null || this.searchTypeString.length == 0) {
            console.info('no query params')
            const dtObj = DateTimeUtils.GetStartEndDtTm(1);
            this.startDate = dtObj.startDt;
            this.startTm = dtObj.startTm;
            this.endDate = dtObj.endDt;
            this.endTm = dtObj.endTm;
            console.info("Time: " + this.startTm);
          }

    });
    this.applyChartTheme();
    this.watchThemeChanges();
    this.onSearchDashBoard();
    this.subscriptions.push(this.sub);

  }

  ngAfterViewInit(): void {
    // Ensure chart instance exists before applying theme-driven axis/grid styling.
    setTimeout(() => {
      this.applyChartTheme();
    }, 0);
  }

  private applyChartTheme(): void {
    // Chart canvas is rendered on a light background in both themes for readability.
    const axisText = '#111827';
    const gridColor = 'rgba(17, 24, 39, 0.28)';
    const axisBorder = '#111827';

    // Keep global chart defaults in sync with current app theme.
    Chart.defaults.color = axisText;
    Chart.defaults.borderColor = gridColor;

    this.barChartOptions = {
      ...this.barChartOptions,
      scales: {
        x: {
          type: 'category',
          stacked: false,
          ticks: { color: axisText },
          grid: {
            display: true,
            drawOnChartArea: true,
            drawTicks: true,
            color: gridColor,
            lineWidth: 2,
            tickColor: axisBorder
          },
          border: { display: true, color: axisBorder, width: 2 }
        } as any,
        y: {
          type: 'linear',
          beginAtZero: true,
          ticks: { color: axisText },
          grid: {
            display: true,
            drawOnChartArea: true,
            drawTicks: true,
            color: gridColor,
            lineWidth: 2,
            tickColor: axisBorder
          },
          border: { display: true, color: axisBorder, width: 2 }
        } as any
      },
      plugins: {
        ...(this.barChartOptions.plugins || {}),
        legend: {
          ...((this.barChartOptions.plugins as any)?.legend || {}),
          labels: {
            color: axisText
          }
        }
      }
    };

    // Force redraw so axis/legend/grid colors update immediately after theme toggle.
    const chartRef = this.chart?.chart as any;
    if (chartRef?.options?.scales) {
      chartRef.options.scales.x = {
        ...(chartRef.options.scales.x || {}),
        ticks: { color: axisText },
        grid: {
          display: true,
          drawOnChartArea: true,
          drawTicks: true,
          color: gridColor,
          lineWidth: 2,
          tickColor: axisBorder
        },
        border: { display: true, color: axisBorder, width: 2 }
      };
      chartRef.options.scales.y = {
        ...(chartRef.options.scales.y || {}),
        beginAtZero: true,
        ticks: { color: axisText },
        grid: {
          display: true,
          drawOnChartArea: true,
          drawTicks: true,
          color: gridColor,
          lineWidth: 2,
          tickColor: axisBorder
        },
        border: { display: true, color: axisBorder, width: 2 }
      };
      chartRef.options.plugins = {
        ...(chartRef.options.plugins || {}),
        legend: {
          ...((chartRef.options.plugins || {}).legend || {}),
          labels: {
            ...(((chartRef.options.plugins || {}).legend || {}).labels || {}),
            color: axisText
          }
        }
      };
    }
    this.chart?.update();
  }

  private watchThemeChanges(): void {
    this.themeObserver = new MutationObserver(() => {
      this.applyChartTheme();
    });

    this.themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });
  }



  onSearchDashBoard()
    {
      this.canRenderDetails = false;
      this.paramsList = [];
      this.paramsList.push("mode::Batch");
      this.paramsList.push("transaction::"+this.currentTransType);
      this.paramsList.push("status::Processed" );

      this.paramsList.push("startDtTm::" + this.startDate +" "+ this.startTm);

      this.paramsList.push("endDtTm::" + this.endDate+" " +this.endTm );
      this.paramsList.push("count::25" );

      if(this.additionalsearchString !== "")
      {
        this.paramsList.push("sql::" + this.additionalsearchString);
      }


      let staticSearchStr = "";


      if(this.additionalsearchString.length > 0)
        {
          console.info("additionalsearchString: " + this.additionalsearchString)
          staticSearchStr = staticSearchStr + " AND " + this.additionalsearchString

        }
      if(staticSearchStr.length > 3)
      {
          staticSearchStr = staticSearchStr.replace('AND','') // Remove first AND
          this.paramsList.push("sql::" + staticSearchStr);
      }
      this.paramsList.push("dashboard::1");

      this.searchTypeString = "";
      this.paramsList.forEach( val => {
        this.searchTypeString += val +";";
       });

      this.storageService.setItem("searchTypeString", this.searchTypeString)

          const dashSub = this.DashBoardService.fetchDashboardentries(this.paramsList).subscribe((res: any) => {

            console.info("Data rows array: " + res.length);
            this.dataTableLabel = [];
            this.dataTableKey = [];

            this.dataTableLabel.push("Transaction");
            this.dataTableKey.push("Transaction");
            this.dataTableLabel.push("LastProcessed");
            this.dataTableKey.push("LastProcessed");

            let lable = "", prevLab = ""
            let lastProc = [];
            let transCount = [];
            let barEntries = [];


            res.forEach( (element, index) => {

              lable = element.Transaction
              lastProc.push(element.LastProcessed)


              if (lable !== prevLab)
                {

                  if(transCount.length > 0)
                  {
                    const color = this.chartPalette[(barEntries.length) % this.chartPalette.length];
                    barEntries.push({
                      data: transCount,
                      label: prevLab,
                      backgroundColor: color + 'B3',
                      borderColor: color,
                      borderWidth: 2
                    });
                  }
                  prevLab = lable;
                  transCount = [];
                }


              if(this.mbarChartLabels.indexOf(element.Days) < 0)
              {
                this.mbarChartLabels.push(element.Days)
                this.dataTableLabel.push(element.Days);
                this.dataTableKey.push(element.Days);
              }


              transCount.push(element.Count);
              console.info("Labels: " + lable +", " + prevLab + ", count: " + element.Count + ", " + transCount.length);

              if ( (index+1) == res.length)
              {
                const color = this.chartPalette[(barEntries.length) % this.chartPalette.length];
                barEntries.push({
                  data: transCount,
                  label: lable,
                  backgroundColor: color + 'B3',
                  borderColor: color,
                  borderWidth: 2
                });
              }

            });
            this.barChartData = [...barEntries];
            this.applyChartTheme();


            this.barChartData.forEach((chartEle, index) => {
              console.info(index + ". Barchart label: " + chartEle.label +", " + chartEle.data +", " + lastProc[index] + "," + this.dataTableLabel[1] +": " + chartEle.data[0])

              if (chartEle.label === undefined || chartEle.label === null || chartEle.label.length === 0)
              {
                console.info("Skip empty label")
              }
              else
              {

                this.dataSource.data.push(
                  {
                    [this.dataTableLabel[0]]:[chartEle.label],
                    [this.dataTableLabel[1]]:lastProc[index],
                    [this.dataTableLabel[2]]:chartEle.data[0],
                    [this.dataTableLabel[3]]:chartEle.data[0],
                    [this.dataTableLabel[4]]:chartEle.data[1],
                    [this.dataTableLabel[5]]:chartEle.data[2],
                    [this.dataTableLabel[6]]:chartEle.data[3]
                  }
                  );
              }



            });



              this.canRenderDetails = true;
              setTimeout(() => this.applyChartTheme(), 0);
              setTimeout(() => this.applyChartTheme(), 120);

              console.info("barChartData length: " + this.barChartData.length);
              console.info("mbarChartLabels length: " + this.mbarChartLabels.length);
              console.info("dataTableLabel length: " + this.dataTableLabel.length);
              console.info("dataTableKey length: " + this.dataTableKey.length);


            });
      this.subscriptions.push(dashSub);
    }



  ngOnDestroy(): void {
    this.themeObserver?.disconnect();
    this.subscriptions.forEach(sub => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });
  }
// Handle right click

onContextMenu(event: MouseEvent, row:any, ind: number) {
  event.preventDefault();

  console.log( 'Row clicked: ' + row.Transaction +' Params: ' + this.paramsList.length);

  this.contextMenuPosition.x = event.clientX + 'px';
  this.contextMenuPosition.y = event.clientY + 'px';

  let item: Item ={rowId: row.Transaction, FileName: ""};


  this.currentTransType = row.Transaction.toString().toUpperCase()


  let index = 0;

  for (let index = 0; index < this.paramsList.length; index++)
    {
        let ind = this.paramsList[index].indexOf("transaction")

        if (ind >= 0)
        {
          this.paramsList = this.paramsList.splice(ind, 1, "transaction::"+this.currentTransType)
          console.log('Replace transaction in paramsList')
          break;
        }
     };
     if (index >= this.paramsList.length)
     {
      console.log('Add transaction in paramsList')
      this.paramsList.push("transaction::"+this.currentTransType)
     }

  this.contextMenu.menuData = { 'item': item };
  this.contextMenu.menu.focusFirstItem('mouse');
  this.contextMenu.openMenu();
}

onContextMenuNew(item: Item) {
  console.log("Click on Action id: " + item.rowId);
  this.storageService.removeItem("currentTab");
  this.storageService.setItem("currentTab", "Transactions");

    this.searchTypeString = "";
    this.paramsList.forEach( val => {
      this.searchTypeString += val +";";
      console.log(val);
     });


    if (this.searchTypeString.indexOf('transaction') < 0)
    {
      this.searchTypeString += "transaction::"+this.currentTransType + ";status::Processed;" +
      "tranStartDtTm::" + this.startDate +" "+ this.startTm +";" +
      "endDtTm::" + this.endDate+" " +this.endTm +";" +
      "count::25;"  ;
    }

    this.searchTypeString += ";sameWindow::false";
       const url = this.router.serializeUrl(this.router.createUrlTree([ `${environment.org}` + "/transaction/"],
      {queryParams: {  'transaction': this.currentTransType,  'searchTypeString': this.searchTypeString } }
       ));
    const newTab = window.open(url, '_blank');
    if(newTab) {
        newTab.opener = null;
    }

}

onContextMenuSame(item: Item) {

  this.searchTypeString = "";
  this.storageService.removeItem("currentTab");
  this.storageService.setItem("currentTab", "Transactions");

    this.paramsList.forEach( val => {
      this.searchTypeString += val +";";
      console.log(val);
     });


    if (this.searchTypeString.indexOf('transaction') < 0)
    {
      this.searchTypeString += "transaction::"+this.currentTransType + ";status::Processed;" +
      "tranStartDtTm::" + this.startDate +" "+ this.startTm +";" +
      "endDtTm::" + this.endDate+" " +this.endTm +";" +
      "count::25;"  ;
    }


   this.searchTypeString += ";sameWindow::true";
      this.router.navigate(["/transaction/"],
      {queryParams: { 'transaction': this.currentTransType, 'searchTypeString': this.searchTypeString } }
       );

}


public chartClicked(e:any):void {
  console.log(e);
}

public chartHovered(e:any):void {
   // console.log(e);
}

}

export interface Item {
  FileName: string;
  rowId: number;
}

