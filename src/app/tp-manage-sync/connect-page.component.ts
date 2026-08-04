import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticationService } from '../services/authentication.service';
import { ApiConfigService } from '../services/api-config.service';

@Component({
  selector: 'app-tp-connect',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './connect-page.component.html',
  styleUrl: './connect-page.component.css'
})
export class TpConnectPageComponent implements OnInit {
  private username = '';
  private password = '';
  private sessionToken = '';
  sourceServerPort = 'lp-itfdevvp2:6973';
  sourceNamespace = 'EDIPAYER';
  destinationServerPort = 'lp-itfdevvp1:6972';
  destinationNamespace = 'MISC';
  isConnecting = false;
  statusMessage = '';
  statusType: 'idle' | 'success' | 'error' = 'idle';
  private readonly requestTimeoutMs = 30000;

  private apiBaseUrl = '';

  constructor(
    private readonly router: Router,
    private readonly authService: AuthenticationService,
    private readonly apiConfig: ApiConfigService
  ) {
    this.apiBaseUrl = this.apiConfig.getApiBaseUrl();
  }

  ngOnInit(): void {
    const currentUser = this.authService.currentUserValue;
    if (currentUser) {
      this.username = currentUser.username;
      this.password = currentUser.password;
      console.log('[TpSync] Using credentials for:', this.username);
    }
  }

  private withClientTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutHandle: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`Connection timed out after ${timeoutMs / 1000} seconds and was canceled.`));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
      clearTimeout(timeoutHandle);
    }) as Promise<T>;
  }

  private async postApi(path: string, body: unknown): Promise<any> {
    return this.postApiWithHeaders(path, body);
  }

  private async postApiWithHeaders(path: string, body: unknown, headers?: Record<string, string>): Promise<any> {
    const startedAt = performance.now();
    const safeBody = { ...(body as Record<string, unknown>), password: '***' };
    console.log('[TpSync][API] Request start', { path, body: safeBody });

    return this.withClientTimeout(
      (async () => {
        let response: Response;
        try {
          response = await fetch(`${this.apiBaseUrl}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(headers ?? {}) },
            body: JSON.stringify(body)
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error('[TpSync][API] Network request failed', { path, message });
          throw new Error('API connection failed. Ensure the backend service is running and accessible.');
        }

        const payload = await response.json().catch(() => null);
        const durationMs = Math.round(performance.now() - startedAt);
        console.log('[TpSync][API] Response received', { path, ok: response.ok, status: response.status, durationMs });

        if (!response.ok || !payload?.ok) {
          const baseMessage = payload?.message || 'Connection failed.';
          const details = payload?.details ? ` Details: ${payload.details}` : '';
          console.error('[TpSync][API] Request failed', { path, baseMessage, details, payload });
          throw new Error(`${baseMessage}${details}`);
        }

        console.log('[TpSync][API] Request success', {
          path,
          message: payload?.message,
          rowCount: Array.isArray(payload?.rows) ? payload.rows.length : undefined,
          sqlUsed: typeof payload?.sqlUsed === 'string' ? payload.sqlUsed : undefined
        });

        return payload;
      })(),
      this.requestTimeoutMs
    );
  }

  async connect(): Promise<void> {
    const connectStartedAt = performance.now();
    this.sessionToken = '';
    console.log('[TpSync] Connect clicked', {
      username: this.username,
      sourceServerPort: this.sourceServerPort,
      sourceNamespace: this.sourceNamespace,
      destinationServerPort: this.destinationServerPort,
      destinationNamespace: this.destinationNamespace,
      timeoutMs: this.requestTimeoutMs
    });

    this.isConnecting = true;
    this.statusType = 'idle';
    this.statusMessage = 'Connecting to IRIS...';

    try {
      const connectStatusPayload = {
        username: this.username,
        serverPort: this.sourceServerPort,
        sourceServerPort: this.sourceServerPort,
        sourceNamespace: this.sourceNamespace,
        destinationServerPort: this.destinationServerPort,
        destinationNamespace: this.destinationNamespace,
        sourceTimezoneOffsetMinutes: new Date().getTimezoneOffset()
      };
      const authHeaders = {
        Authorization: `Basic ${btoa(`${this.username}:${this.password}`)}`
      };

      const statusData = await this.postApiWithHeaders('/connect-status', connectStatusPayload, authHeaders);
      this.sessionToken = typeof statusData?.sessionToken === 'string' ? statusData.sessionToken : '';
      if (!this.sessionToken) {
        throw new Error('Connected, but no session token was returned.');
      }
      this.statusType = 'success';
      this.statusMessage = statusData?.syncTime ? `Connected (${statusData.syncTime})` : 'Connected';
      console.log('[TpSync] Status label set', { statusMessage: this.statusMessage });

      const authenticatedPayload = { sessionToken: this.sessionToken };

      const baselineData = await this.postApi('/sync-baseline', {
        ...authenticatedPayload,
        sourceTimezoneOffsetMinutes: new Date().getTimezoneOffset()
      });
      const lastRunByTable = baselineData?.lastRunByTable ?? {};
      const tradingPartnerLastRun = typeof lastRunByTable?.TradingPartner === 'string'
        ? lastRunByTable.TradingPartner
        : undefined;
      console.log('[TpSync] Baseline lastRunByTable', { lastRunByTable });

      const data = await this.postApi('/connect', {
        ...authenticatedPayload,
        sourceTimezoneOffsetMinutes: new Date().getTimezoneOffset(),
        sinceLastRunAt: tradingPartnerLastRun
      });

      this.statusType = 'success';
      this.statusMessage = data?.syncTime ? `Connected (${data.syncTime})` : this.statusMessage;
      console.log('[TpSync] Status label refreshed', { statusMessage: this.statusMessage });

      const rows = Array.isArray(data.rows) ? data.rows : [];
      const navPayload = {
        rows,
        message: data.message,
        syncTime: data.syncTime,
        sqlUsed: data.sqlUsed,
        sessionToken: this.sessionToken,
        username: this.username,
        serverPort: this.sourceServerPort,
        sourceServerPort: this.sourceServerPort,
        sourceNamespace: this.sourceNamespace,
        destinationServerPort: this.destinationServerPort,
        destinationNamespace: this.destinationNamespace,
        lastRunByTable,
        namespace: this.sourceNamespace
      };

      sessionStorage.setItem('tpManageSync.tradingPartners', JSON.stringify(navPayload));
      console.log('[TpSync] Navigation payload persisted', {
        rowCount: rows.length,
        sourceServerPort: this.sourceServerPort,
        destinationServerPort: this.destinationServerPort,
        destinationNamespace: this.destinationNamespace
      });

      const navigated = await this.router.navigate(['/tp-manage-sync/trading-partners'], { state: navPayload });
      console.log('[TpSync] Navigation attempt complete', { navigated });

      if (!navigated) {
        throw new Error('Navigation to Trading Partners page failed.');
      }
    } catch (error) {
      console.error('[TpSync] Connect flow failed', error);
      this.statusType = 'error';
      this.statusMessage = error instanceof Error ? error.message : 'Connection failed.';
      if (this.statusMessage.includes('Another user is connected at this time')) {
        window.alert('Another user is connected at this time');
      }
    } finally {
      const totalDurationMs = Math.round(performance.now() - connectStartedAt);
      console.log('[TpSync] Connect flow finished', {
        statusType: this.statusType,
        statusMessage: this.statusMessage,
        totalDurationMs
      });
      this.isConnecting = false;
    }
  }
}
