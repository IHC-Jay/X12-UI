import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';

import { forkJoin, Observable, of } from 'rxjs';
import { first } from 'rxjs/operators';
import {TradingPartner, TradingPartnerColumns} from './TradingPartner';
import {TpRestServiceComponent} from '../services/tprest-service.component';
import { MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-copyTP',
    templateUrl: './copyTP.component.html',
    styleUrls: ['./copyTP.component.css'],
    standalone: false
})



export class copyTPComponent implements OnInit, AfterViewInit {
  // ...existing code...
  // Refactor large methods into private helpers for clarity and maintainability
  tpNames: string[] = [];
  form!: FormGroup;
  created:boolean=false;
  statColor = 'blue';


  constructor(private router: Router,  private formBuilder: FormBuilder,
    private TradingPartnerService: TpRestServiceComponent)
  {

  }
  get f() { return this.form.controls; }


  ngOnInit()
  {
    this.form = this.formBuilder.group({
      Name: ['', Validators.required],
      tpName:['', Validators.required],
      TpId: ['', Validators.required],
      status:['']
    });

    this.TradingPartnerService.fetchTradingPartners().subscribe((res: any) => {

      res.forEach((entry) => {

        this.tpNames.push(entry.Name);

       });
       this.f.tpName.setValue(this.tpNames[0]);


    });




  }
  ngAfterViewInit() {
  }

  tpChange(evt: any)
  {
    console.log(evt)

  }

  onSubmit()
  {
    var info = "Created TP: " + this.f.Name.value + ", TPID: " + this.f.TpId.value + " from: " + this.f.tpName.value
    console.log(info);
    this.f.status.setValue("");
    console.info('Create TPLinks for name: ' + this.form.value);
      this.TradingPartnerService.copyTpLinksfromTP(this.form.value)
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
              this.f.status.setValue(res.Details);

              if(res.Status ==='OK')
              {
                  this.f.Name.setValue('');
                  this.f.TpId.setValue('');
                  this.created=true;
                  this.statColor = 'blue';
              }
              else
              {
                alert('ERROR: '+ res.Status +", " + res.Details);
                this.statColor = 'red';
              }
              retStr = res.Status;
            }
            else{
              alert('copyTpLinksfromTP service returns: ' + res.Error);
              retStr = res.Error;
            }

          })
          .add(() => this.created = true);



  }

  onCancel()
  {
    this.router.navigate(["/TradingPartners"] );
  }

}
