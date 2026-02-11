import { Component } from '@angular/core';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    standalone: false
})
export class AppComponent {
  public clickedEvent: String;

  title = 'Trading Partner Management';
  menuFeature: string = 'tradingpartners';
  name = 'TP manage';

}
