import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom, TimeoutError } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { ApiConfigService } from '../services/api-config.service';

type TradingPartnersNavState = {
  rows?: Record<string, unknown>[];
  message?: string;
  syncTime?: string;
  sqlUsed?: string;
  username?: string;
  password?: string;
  serverPort?: string;
  sourceServerPort?: string;
  destinationServerPort?: string;
  destinationNamespace?: string;
  lastRunByTable?: Partial<Record<TableKey, string | null>>;
  namespace?: string;
};

type TableKey = 'TradingPartner' | 'TPIDS' | 'TRADELINKS' | 'TRANSACTIONTYPES';
type SinceFilterMode = 'both' | 'created' | 'lastmod';
type MigrateDirection = 'fromProd' | 'toProd';

type TableCacheEntry = {
  rows: Record<string, unknown>[];
  message: string;
  syncTime: string;
  sqlUsed: string;
};

@Component({
  selector: 'app-tp-trading-partners',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trading-partners-page.component.html',
  styleUrl: './trading-partners-page.component.css'
})
export class TpTradingPartnersPageComponent {
  rows: Record<string, unknown>[] = [];
  columns: string[] = [];
  message = '';
  syncTime = '';
  sqlUsed = '';
  username = '';
  password = '';
  serverPort = 'Server:Port';
  sourceServerPort = 'Server:Port';
  destinationServerPort = 'Server:Port';
  destinationNamespace = 'MISC';
  lastRunByTable: Partial<Record<TableKey, string | null>> = {};
  namespace = 'EDIPAYER';
  isLoading = false;
  loadError = '';
  syncStatus = '';
  showLoadingMessage = true;
  isSyncing = false;
  showSyncPopup = false;
  syncPopupLines: string[] = [];

  selectedTable: TableKey = 'TradingPartner';
  useHardcodedRouting = true;
  migrateDirection: MigrateDirection = 'fromProd';
  sinceFilterMode: SinceFilterMode = 'both';
  readonly tableOptions: Array<{ key: TableKey; label: string }> = [
    { key: 'TradingPartner', label: 'TradingPartner' },
    { key: 'TPIDS', label: 'TPIDS' },
    { key: 'TRADELINKS', label: 'TRADELINKS' },
    { key: 'TRANSACTIONTYPES', label: 'TRANSACTIONTYPES' }
  ];

  readonly pageSizeOptions = [10, 25, 50, 100];
  pageSize = this.pageSizeOptions[0];
  currentPage = 1;
  selectedRowIndexes = new Set<number>();
  private readonly requestTimeoutMs = 30000;
  private readonly syncRequestTimeoutMs = 300000;
  private readonly apiBaseUrl: string;

  private readonly tablePathByKey: Record<TableKey, string> = {
    TradingPartner: '/api/connect',
    TPIDS: '/api/tpids',
    TRADELINKS: '/api/tradelinks',
    TRANSACTIONTYPES: '/api/transactiontypes'
  };

  private readonly syncSelectionKeyByTable: Record<TableKey, string> = {
    TradingPartner: 'Name',
    TPIDS: 'TPID',
    TRADELINKS: 'NAME',
    TRANSACTIONTYPES: 'NAME'
  };

  private readonly tableCache: Partial<Record<TableKey, TableCacheEntry>> = {};

  get resultLabel(): string {
    const value = typeof this.sqlUsed === 'string' ? this.sqlUsed.trim() : '';
    return value;
  }

  get hasSqlUsed(): boolean {
    return this.resultLabel.length > 0;
  }

  get sqlWhereClauseDatetime(): string | null {
    if (!this.sqlUsed) return null;
    const match = this.sqlUsed.match(/WHERE\s+(?:CreatedDtTM|LastmodDtTM)\s*>=\s*'([^']+)'/i);
    return match ? match[1] : null;
  }

  get sqlWhereClauseText(): string | null {
    const since = this.sqlWhereClauseDatetime;
    if (!since) return null;
    if (this.sinceFilterMode === 'created') return `CreatedDtTM >= ${since}`;
    if (this.sinceFilterMode === 'lastmod') return `LastmodDtTM >= ${since} AND (CreatedDtTM IS NULL OR CreatedDtTM != LastmodDtTM)`;
    return `CreatedDtTM >= ${since} OR LastmodDtTM >= ${since}`;
  }

  get syncDirectionLabel(): string {
    const destination = this.destinationServerPort?.trim() || 'unknown-destination';
    const source = this.sourceServerPort?.trim() || this.serverPort?.trim() || 'unknown-source';
    const destinationNs = this.destinationNamespace?.trim() || 'unknown-destination-namespace';
    const sourceNs = this.namespace?.trim() || 'unknown-source-namespace';
    const label = `${sourceNs}@${source} -> ${destinationNs}@${destination}`;
    if (this.rows.length === 0) return `${label} - No sync needed`;
    return label;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.rows.length / this.pageSize));
  }

  get selectedRowCount(): number {
    return this.selectedRowIndexes.size;
  }

  getRowMatchClass(row: Record<string, unknown>): string {
    const match = typeof row['__syncMatch'] === 'string' ? row['__syncMatch'] : 'none';
    if (match === 'created') return 'row-match-created';
    if (match === 'lastmod') return 'row-match-lastmod';
    if (match === 'both') return 'row-match-both';
    return '';
  }

  get pagedRows(): Record<string, unknown>[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.rows.slice(startIndex, startIndex + this.pageSize);
  }

  get pageStart(): number {
    if (this.rows.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.rows.length);
  }

  constructor(
    private readonly router: Router,
    private readonly http: HttpClient,
    private readonly cdr: ChangeDetectorRef,
    private readonly apiConfig: ApiConfigService
  ) {
    this.apiBaseUrl = this.apiConfig.getApiBaseUrl();
    const state = (this.router.getCurrentNavigation()?.extras.state ?? history.state ?? {}) as TradingPartnersNavState;
    const storedRaw = sessionStorage.getItem('tpManageSync.tradingPartners');
    const stored = storedRaw ? (JSON.parse(storedRaw) as TradingPartnersNavState) : {};
    const resolved = { ...stored, ...state };

    this.rows = Array.isArray(resolved.rows) ? resolved.rows : [];
    this.columns = this.rows.length > 0 ? Object.keys(this.rows[0]) : [];
    this.message = typeof resolved.message === 'string' ? resolved.message : '';
    this.syncTime = typeof resolved.syncTime === 'string' ? resolved.syncTime : '';
    this.sqlUsed = typeof resolved.sqlUsed === 'string' ? resolved.sqlUsed : '';
    this.username = typeof resolved.username === 'string' ? resolved.username : '';
    this.password = typeof resolved.password === 'string' ? resolved.password : '';
    this.serverPort = typeof resolved.serverPort === 'string' && resolved.serverPort.trim() ? resolved.serverPort : 'Server:Port';
    this.sourceServerPort = typeof resolved.sourceServerPort === 'string' && resolved.sourceServerPort.trim()
      ? resolved.sourceServerPort : this.serverPort;
    this.destinationServerPort = typeof resolved.destinationServerPort === 'string' && resolved.destinationServerPort.trim()
      ? resolved.destinationServerPort : 'Server:Port';
    this.destinationNamespace = typeof resolved.destinationNamespace === 'string' && resolved.destinationNamespace.trim()
      ? resolved.destinationNamespace : 'MISC';
    this.lastRunByTable = typeof resolved.lastRunByTable === 'object' && resolved.lastRunByTable
      ? resolved.lastRunByTable : {};
    this.namespace = typeof resolved.namespace === 'string' && resolved.namespace.trim() ? resolved.namespace : 'EDIPAYER';

    this.tableCache.TradingPartner = {
      rows: this.rows,
      message: this.message,
      syncTime: this.syncTime,
      sqlUsed: this.sqlUsed
    };
  }

  async onTableChange(nextTable: string): Promise<void> {
    const table = this.tableOptions.find(option => option.key === nextTable)?.key;
    if (!table || table === this.selectedTable) return;
    this.selectedTable = table;
    this.currentPage = 1;
    this.loadError = '';
    this.syncStatus = '';
    const cached = this.tableCache[table];
    if (cached) { this.applyTableData(cached); return; }
    this.showLoadingMessage = true;
    await this.loadTable(table);
  }

  onPageSizeChange(nextPageSizeText: string): void {
    const nextPageSize = Number(nextPageSizeText);
    if (!Number.isInteger(nextPageSize) || nextPageSize <= 0) return;
    this.pageSize = nextPageSize;
    this.currentPage = 1;
  }

  async onSinceFilterModeChange(nextMode: string): Promise<void> {
    const mode = nextMode === 'created' || nextMode === 'lastmod' || nextMode === 'both'
      ? (nextMode as SinceFilterMode) : null;
    if (!mode || mode === this.sinceFilterMode) return;
    this.sinceFilterMode = mode;
    this.currentPage = 1;
    this.loadError = '';
    this.syncStatus = '';
    delete this.tableCache[this.selectedTable];
    this.showLoadingMessage = true;
    await this.loadTable(this.selectedTable);
  }

  nextPage(): void { if (this.currentPage < this.totalPages) this.currentPage += 1; }
  previousPage(): void { if (this.currentPage > 1) this.currentPage -= 1; }

  togglePagedRowSelection(pageIndex: number, isSelected: boolean): void {
    const absoluteIndex = this.getAbsoluteRowIndex(pageIndex);
    if (absoluteIndex < 0 || absoluteIndex >= this.rows.length) return;
    if (isSelected) { this.selectedRowIndexes.add(absoluteIndex); return; }
    this.selectedRowIndexes.delete(absoluteIndex);
  }

  isPagedRowSelected(pageIndex: number): boolean {
    return this.selectedRowIndexes.has(this.getAbsoluteRowIndex(pageIndex));
  }

  areAllPagedRowsSelected(): boolean {
    if (this.pagedRows.length === 0) return false;
    for (let index = 0; index < this.pagedRows.length; index += 1) {
      if (!this.isPagedRowSelected(index)) return false;
    }
    return true;
  }

  toggleSelectAllPagedRows(isSelected: boolean): void {
    for (let index = 0; index < this.pagedRows.length; index += 1) {
      this.togglePagedRowSelection(index, isSelected);
    }
  }

  private getAbsoluteRowIndex(pageIndex: number): number {
    const safeIndex = Number.isInteger(pageIndex) ? pageIndex : -1;
    return ((this.currentPage - 1) * this.pageSize) + safeIndex;
  }

  private getSelectedSyncKeys(): string[] {
    const keyColumn = this.syncSelectionKeyByTable[this.selectedTable];
    const keys = new Set<string>();
    for (const rowIndex of this.selectedRowIndexes) {
      const row = this.rows[rowIndex];
      if (!row) continue;
      const value = row[keyColumn];
      if (value == null) continue;
      const text = String(value).trim();
      if (text) keys.add(text);
    }
    return Array.from(keys);
  }

  async syncSelectedTable(): Promise<void> {
    if (this.isSyncing) return;
    const selectedKeys = this.getSelectedSyncKeys();
    if (selectedKeys.length === 0) { this.syncStatus = 'Select at least one row to sync.'; return; }
    if (!this.username || !this.password || !this.sourceServerPort || !this.destinationServerPort) {
      this.syncStatus = 'Missing connection details. Go back and connect again.'; return;
    }
    this.isSyncing = true;
    const clickStartedAt = performance.now();
    try {
      const payload = await firstValueFrom(
        this.http.post<any>(`${this.apiBaseUrl}/sync-last-run`, {
          username: this.username,
          password: this.password,
          serverPort: this.sourceServerPort,
          sourceServerPort: this.sourceServerPort,
          destinationServerPort: this.destinationServerPort,
          destinationNamespace: this.destinationNamespace,
          tableName: this.selectedTable,
          selectedKeys,
          migrateDirection: this.migrateDirection,
          sourceTimezoneOffsetMinutes: new Date().getTimezoneOffset(),
          sinceFilterMode: this.sinceFilterMode,
          useHardcodedRouting: this.useHardcodedRouting
        }).pipe(timeout(this.syncRequestTimeoutMs))
      );
      if (!payload?.ok) { this.syncStatus = payload?.message || 'Sync read failed.'; return; }
      this.syncStatus = typeof payload?.message === 'string' && payload.message.trim()
        ? payload.message
        : payload?.lastRunAt
          ? `Copied ${payload?.copiedEntries ?? 0}. LastRunAt (${this.selectedTable}): ${payload.lastRunAt}`
          : `Copied ${payload?.copiedEntries ?? 0}. LastRunAt (${this.selectedTable}): not found`;
      this.showSyncSummaryPopup(payload, Math.round(performance.now() - clickStartedAt));
      this.lastRunByTable[this.selectedTable] = payload?.lastRunAt ?? null;
      await this.loadTable(this.selectedTable);
    } catch (error) {
      const isTimeout = error instanceof TimeoutError
        || (error instanceof Error && /timeout has occurred/i.test(error.message));
      if (isTimeout) {
        this.syncStatus = `Sync is taking longer than ${this.syncRequestTimeoutMs / 1000} seconds. The backend may still be processing.`;
        this.syncPopupLines = [
          'Sync In Progress', '',
          `The request timed out on the UI after ${this.syncRequestTimeoutMs / 1000} seconds.`,
          'The backend may still be processing the copy.',
          'Wait a bit, then click Sync again to refresh summary status.'
        ];
        this.showSyncPopup = true;
        return;
      }
      const message = error instanceof Error ? error.message : 'Sync read failed.';
      this.syncStatus = message;
    } finally {
      this.isSyncing = false;
      queueMicrotask(() => this.cdr.markForCheck());
    }
  }

  private showSyncSummaryPopup(payload: any, clickToPopupMs?: number): void {
    const rowSummary = this.formatSummaryLine(this.selectedTable, payload);
    const tradingPartnerSummary = this.formatSummaryLine('TradingPartner', payload?.tradingPartnerSync);
    const tpidsSummary = this.formatSummaryLine('TPIDS', payload?.tpidsCascadeSync);
    const tpidsDirectSummary = this.formatSummaryLine('TPIDS direct sync', payload?.tpidsDirectSync);
    const tradelinksSummary = this.formatSummaryLine('TRADELINKS', payload?.tradelinksCascadeSync);
    const tradelinksDirectSummary = this.formatSummaryLine('TRADELINKS direct sync', payload?.tradelinksDirectSync);
    const stageDurations = payload?.stageDurationsMs && typeof payload.stageDurationsMs === 'object'
      ? payload.stageDurationsMs : {};
    const stageLines = Object.entries(stageDurations).map(([key, value]) => {
      const seconds = Math.round(Number(value) / 1000);
      return `${key}: ${seconds}s`;
    });
    const backendTotalLine = Number.isFinite(Number(payload?.totalSyncDurationMs))
      ? `Backend total: ${Math.round(Number(payload.totalSyncDurationMs) / 1000)}s` : 'Backend total: n/a';
    const clientTotalLine = Number.isFinite(Number(clickToPopupMs))
      ? `Click to popup total: ${Math.round(Number(clickToPopupMs) / 1000)}s` : 'Click to popup total: n/a';
    this.syncPopupLines = [
      'Sync Completed', '', backendTotalLine, clientTotalLine, ...stageLines, '',
      rowSummary, tradingPartnerSummary, tpidsSummary, tpidsDirectSummary,
      tradelinksSummary, tradelinksDirectSummary
    ];
    this.showSyncPopup = true;
    this.cdr.detectChanges();
  }

  closeSyncPopup(): void { this.showSyncPopup = false; }

  logout(): void {
    sessionStorage.removeItem('tpManageSync.tradingPartners');
    this.router.navigate(['/tp-manage-sync']);
  }

  private formatSummaryLine(label: string, summary: any): string {
    if (!summary || typeof summary !== 'object') return `${label}: no summary`;
    const durationText = Number.isFinite(Number(summary?.durationMs))
      ? `, time ${Math.round(Number(summary.durationMs) / 1000)}s` : '';
    const errorText = Number.isFinite(Number(summary?.errorCount)) && Number(summary.errorCount) > 0
      ? `, errors ${Number(summary.errorCount)}` : '';
    return `${label}: processed ${summary?.processed ?? 0}, inserted ${summary?.inserted ?? 0}, updated ${summary?.updated ?? 0}, skipped ${summary?.skipped ?? 0}${errorText}${durationText}`;
  }

  private async loadTable(table: TableKey): Promise<void> {
    if (!this.username || !this.password || !this.sourceServerPort || !this.destinationServerPort) {
      this.loadError = 'Missing connection details. Go back and connect again.';
      return;
    }
    this.isLoading = true;
    const loadingGuard = setTimeout(() => {
      if (this.isLoading) {
        this.isLoading = false;
        this.showLoadingMessage = false;
        this.loadError = `Loading ${table} timed out after ${this.requestTimeoutMs / 1000} seconds.`;
        this.cdr.detectChanges();
      }
    }, this.requestTimeoutMs + 2000);
    try {
      const path = this.tablePathByKey[table];
      const startedAt = performance.now();
      console.log('[TpSync][TABLE] Load start', { table, path });
      const payload = await firstValueFrom(
        this.http.post<any>(`${this.apiBaseUrl}${path}`, {
          username: this.username,
          password: this.password,
          serverPort: this.sourceServerPort,
          sourceServerPort: this.sourceServerPort,
          destinationServerPort: this.destinationServerPort,
          destinationNamespace: this.destinationNamespace,
          sourceTimezoneOffsetMinutes: new Date().getTimezoneOffset(),
          sinceLastRunAt: this.lastRunByTable[table] || undefined,
          sinceFilterMode: this.sinceFilterMode,
          limit: 100
        }).pipe(timeout(this.requestTimeoutMs))
      );
      const durationMs = Math.round(performance.now() - startedAt);
      console.log('[TpSync][TABLE] Load response', { table, ok: payload?.ok, durationMs });
      if (!payload?.ok) {
        const baseMessage = payload?.message || `Failed to load ${table}.`;
        const details = payload?.details ? ` Details: ${payload.details}` : '';
        throw new Error(`${baseMessage}${details}`);
      }
      const entry: TableCacheEntry = {
        rows: Array.isArray(payload.rows) ? payload.rows : [],
        message: typeof payload.message === 'string' ? payload.message : '',
        syncTime: typeof payload.syncTime === 'string' ? payload.syncTime : '',
        sqlUsed: typeof payload.sqlUsed === 'string' ? payload.sqlUsed : ''
      };
      this.tableCache[table] = entry;
      this.applyTableData(entry);
      console.log('[TpSync][TABLE] Load success', { table, rowCount: entry.rows.length });
      this.cdr.detectChanges();
    } catch (error) {
      this.loadError = error instanceof Error ? error.message : `Failed to load ${table}.`;
      console.error('[TpSync][TABLE] Load failed', { table, loadError: this.loadError, error });
      this.rows = [];
      this.columns = [];
      this.selectedRowIndexes.clear();
      this.message = '';
      this.syncTime = '';
      this.sqlUsed = '';
      this.cdr.detectChanges();
    } finally {
      clearTimeout(loadingGuard);
      this.isLoading = false;
      this.showLoadingMessage = false;
      this.cdr.detectChanges();
    }
  }

  private applyTableData(entry: TableCacheEntry): void {
    this.rows = entry.rows;
    this.selectedRowIndexes.clear();
    this.columns = this.rows.length > 0
      ? Object.keys(this.rows[0]).filter(key => !key.startsWith('__'))
      : [];
    this.message = entry.message;
    this.syncTime = entry.syncTime;
    this.sqlUsed = entry.sqlUsed;
    this.cdr.detectChanges();
  }
}
