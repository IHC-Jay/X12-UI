import { Injectable } from '@angular/core';
import { DEFAULT_HELP_CONTENT, HELP_CONTENT_BY_ROUTE, HelpContent } from './help-content';

@Injectable({
  providedIn: 'root'
})
export class HelpService {
  getHelpForUrl(url: string): HelpContent {
    const normalizedUrl = (url || '').split('?')[0];
    const match = HELP_CONTENT_BY_ROUTE.find(item => normalizedUrl.startsWith(item.routePrefix));
    return match?.content ?? DEFAULT_HELP_CONTENT;
  }
}
