import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApiConfigService {
  /**
   * Get the base API URL.
   * When deployed on the same server, this returns a relative path.
   * Development: http://localhost:3100
   * Production: /api (same-origin)
   */
  getApiBaseUrl(): string {
    // If running on a different port than 4200, assume same-server deployment
    if (window.location.port === '3100' || window.location.port === '80' || window.location.port === '443' || window.location.port === '') {
      // Production: use relative path (same server)
      return '/api';
    } else if (window.location.port === '4200') {
      // Development: use localhost:3100
      return 'http://localhost:3100/api';
    }
    // Fallback to relative path
    return '/api';
  }
}
