import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApiConfigService {
  /**
   * Get the base API URL.
   *
   * For NGINX single-port multi-app deployments (SH/RCO/ERP), each app is
   * served under a base href path (e.g. /sh/, /rco/, /erp/). The API must
   * be prefixed with that same base href so NGINX can proxy correctly.
   *
   * Examples:
   *   base href = /sh/   → API base = /sh/api
   *   base href = /rco/  → API base = /rco/api
   *   base href = /      → API base = /api
   *   localhost:4200      → API base = http://localhost:3100/api
   */
  getApiBaseUrl(): string {
    // Development: proxy via localhost
    if (window.location.port === '4200') {
      return 'http://localhost:3100/api';
    }

    // Read base href set at build time (e.g. <base href="/sh/">)
    const baseHref = this.getBaseHref();

    // Normalize: ensure it ends without slash for concatenation
    const base = baseHref.replace(/\/+$/, '');

    return `${base}/api`;
  }

  /**
   * Returns the current app's base href from the <base> tag in index.html.
   * Falls back to '/' if not found.
   */
  private getBaseHref(): string {
    if (typeof document !== 'undefined') {
      const baseEl = document.querySelector('base');
      if (baseEl) {
        const href = baseEl.getAttribute('href') || '/';
        return href;
      }
    }
    return '/';
  }
}
