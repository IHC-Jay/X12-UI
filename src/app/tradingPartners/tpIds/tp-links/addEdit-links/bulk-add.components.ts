import { Component,   ViewChildren,  ElementRef,  ChangeDetectorRef,  QueryList, OnInit } from '@angular/core';
import { Router, ActivatedRoute} from '@angular/router';
import { AbstractControlOptions, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';
import { FormsModule, ReactiveFormsModule, FormGroupDirective } from '@angular/forms';
import { TpRestServiceComponent } from '../../../../services/tprest-service.component';
import { bulkTpLinks } from './bulk-tp-links';
import { environment } from '../../../../../environments/environment';

@Component(
  {
    selector: 'bulk-add',
    templateUrl: './bulk-add.components.html',
    styleUrls: ['./bulk-add.components.css'],
    standalone: false
})


export class BulkAddLinksComponent implements OnInit {
    form!: FormGroup;
    parentTpId!: string;
    tpName:string;
    loading = false;

    submitted = false;
    tpType = `${environment.tpType}`;
    orgType = `${environment.orgType}`;

    BatchackTypes:string[] = ["ERROR","ALWAYS","NEVER"];
    RTackTypes = ["ERROR","NEVER"];
    modeTypes:string[] = ["Batch","RT"];
    snipValues:string[] = ["0","1","2"];
    routingTypes:string[] =  ["UhinBatch","StLukesBatch","UMRBatch","IntermountainHealthcare", "BitBucket"];
    ownerTpIds = [];
    canRender = false;

    trn: bulkTpLinks;

    RtTransactionTypes= ["270", "271","276", "277"];
    BatchTransactionTypes= ["270", "271","276", "277", "835", "837"];

    constructor(
      private formBuilder: FormBuilder,
      private route: ActivatedRoute,
      private router: Router,
      private tpService: TpRestServiceComponent,
      private cdRef: ChangeDetectorRef
  ) {

   }

public initializeData()
{
  console.info("1. fetchTpIds");
  this.tpService.fetchOwnerTpIds().subscribe((res: any) => {

    res.forEach((entry) => {
     this.ownerTpIds.push(entry.TPID);
     this.canRender = true;
    });


 });
}

    async ngOnInit() {
      console.info("BulkAddComponents ngOnInit");
        this.parentTpId = this.route.snapshot.params['tpId'];

        this.tpName = this.route.snapshot.params['tpName'];
        console.info("tpLink init:" + this.tpName + ", " + this.parentTpId);


        this.form = this.formBuilder.group({
          ParentTpId: [''],
          PayerId: ['', Validators.required],
          Link: ['', Validators.required],
          RtTransType: [''],
          BatchTransType: [''],
          RtAck: ['', Validators.required],
          BatchAck: ['', Validators.required],
          BatchRouting: ['', Validators.required],
          RtSNIP: ['1', Validators.required],
          BatchSNIP: ['1', Validators.required],
          Separators   : ['|*^:', Validators.maxLength(4)]
      });

      this.initializeData();


      let myPromise = () => new Promise((resolve, reject) => {
        setTimeout(function(){
          resolve('Count')
        }, 1000)
      })

      for (let index = 0; index < 5; index++) {
        let count = await myPromise()

        if(this.canRender){
          console.log('Received from fetchOwnerTpIds: ' + this.ownerTpIds.length);

          break;
        }
      }

      let ttype ='' ;

       this.form.controls.ParentTpId.setValue(this.parentTpId);
       this.form.controls.PayerId.setValue(this.ownerTpIds[0]);

       this.form.controls.RtAck.setValue(this.RTackTypes[0]);
       this.form.controls.BatchAck.setValue(this.BatchackTypes[0]);
       this.form.controls.BatchRouting.setValue(this.routingTypes[0]);
       this.form.controls.RtSNIP.setValue(1);
       this.form.controls.BatchSNIP.setValue(1);
       this.form.controls.Separators.setValue("|*^:");

    }

    ngAfterViewInit()
    {
      console.info('nfAfter: ' + this.form.controls['Link'].value)
    }

    // convenience getter for easy access to form fields
    get f() { return this.form.controls; }

    onCancel()
    {
      console.info('On Cancel, got back to: ' + this.parentTpId);
      for (let el in this.form.controls) {
        if (this.form.controls[el].value) {
          console.log(el +': ' + this.form.controls[el].value)
        }
      }
      this.router.navigate(["/TradingPartners/tpIds/tp-links/" + this.parentTpId + "/" + this.tpName]);
    }

    onSubmit() {

        this.submitted = true;

        for (let el in this.form.controls) {
          console.log(el +" - " + this.form.controls[el].value);
          if (this.form.controls[el].errors) {
            console.log(el +" - not initialized");
          }
     }

        // stop here if form is invalid
        if (this.form.invalid) {
          console.info('Invalid: ' + this.form.invalid);
            return;
        }

        this.loading = true;

        this.createUpdateTpLink();

    }


    private createUpdateTpLink() {
      console.info('Create TPLinks for name: ' + this.form.value);
      this.tpService.addBulkTpLinks(this.form.value)
          .pipe(first())
          .subscribe((res) => {
            let retStr:String;
            console.info(res);
            if (res.errormessage !== undefined) {
             console.info('createUpdateTpLink error: ' + res.errormessage);
             retStr = res.errormessage;
            }
            else if( res.Status !== undefined) {
              console.error('createUpdateTpLink status: ' + res.Status);
              if(res.Status === 'OK')
              {
                 this.router.navigate(["/TradingPartners/tpIds/tp-links/" + this.parentTpId + "/" + this.tpName]);
              }
              else
              {
                alert('createUpdateTpLink status: ' + res.Status);
              }
              retStr = res.Status;
            }
            else{
              alert('createUpdateTpLink else: ' + res.Error);
              retStr = res.Error;
            }
            if(retStr !== 'OK')
            {
              alert(retStr);
            }
              //
          })
          .add(() => this.loading = false);

         }


}
