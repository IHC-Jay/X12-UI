
import { Component, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { from } from 'rxjs';
import { concatMap, toArray } from 'rxjs/operators';
import { parseX12, X12File } from './x12.service';
import { ValidatorService, ValidationError, ValidationResult } from './validator.service';
import { SEGMENT_LIBRARY } from './lookups';
import { KvLookupService } from './kv-lookup.service';
import { StorageService } from '../services/storage.service';
import { WfRestServiceComponent } from '../services/wfrest-service.component';
import { TransRestServiceComponent } from '../services/transrest-service.component';
import { downloadTextFile } from '../utils/file-download.util';
@Component({ selector:'app-x12-viewer', standalone:true, imports:[CommonModule, FormsModule], templateUrl:'./x12-viewer.component.html', styleUrls:['./x12-utility.component.css'] })
export class X12ViewerComponent {
              hideActions = signal<boolean>(false);
              viewTab = signal<'raw' | 'segments'>('raw');
              setViewTab(tab: 'raw' | 'segments') {
                this.viewTab.set(tab);
              }
              get segmentLines(): string[] {
                const text = this.originalText();
                if (!text) return [];
                // Use detected segment separator if available
                const segSep = this.x12()?.segTerm || '~';
                return text.split(segSep).map(s => s.trim()).filter(Boolean);
              }
            originalText = signal<string>('');
          rawTab = signal<'current' | 'raw'>('current');
          setRawTab(tab: 'current' | 'raw') {
            this.rawTab.set(tab);
          }
        validating = signal<boolean>(false);
        result = signal<ValidationResult | null>(null);
        error = signal<string>('');
        validationErrorsExpanded = signal<boolean>(false);
        x12LoadInProgress = signal<boolean>(false);
        x12LoadStatus = signal<string>('');

        validate() {
          const data = this.x12();
          if (!data) return;
          this.validating.set(true);
          this.error.set('');
          this.result.set(null);
          this.validationErrorsExpanded.set(false);
          console.log('Validating transaction:', data.transactionType );
          this.api.validate(data.text, data.transactionType).subscribe({
            next: r => {
              console.log('Validation result:', r);
              this.result.set(r);
              this.validating.set(false);
            },
            error: err => {
              this.error.set('Rest Validation:' + (err?.message || 'Validation failed'));
              this.validating.set(false);
            }
          });
        }
      // showRaw/toggleRaw removed, always show Raw tab
    formatMessage(msg: string): string {
      return msg ? msg.replace(/\n/g, '<br>') : '';
    }
  fileName = signal<string>('');
  fileSizeBytes = signal<number>(0);
  x12 = signal<X12File | null>(null);
  filter = signal<string>('');
  page = signal<number>(1);
  pageSize = signal<number>(25);
  readonly pageSizeOptions = [10, 25, 50, 100];
  selectedSegmentTag = signal<string>('');
  selectedElementPosition = signal<number>(0);
  selectedElementValue = signal<string>('');
  selectedElementName = signal<string>('');
  selectedLoop = signal<string>('');
  highlightedLine = signal<number | null>(null);
  claimJumpTarget = signal<string>('');
  claimIdJumpTarget = signal<string>('');
  claimJumpMessage = signal<string>('');

  private readonly commonLoopDescriptions: Record<string, string> = {
    '1000A': 'Submitter Name',
    '1000B': 'Receiver Name',
    '2000A': 'Information Source / Billing Provider Level',
    '2000B': 'Information Receiver / Subscriber Level',
    '2000C': 'Subscriber/Patient or Claim Status Level',
    '2000D': 'Dependent Level',
    '2000E': 'Service Line Status Level',
    '2100A': 'Name Information for 2000A',
    '2100B': 'Name Information for 2000B',
    '2100C': 'Name Information for 2000C',
    '2100D': 'Name Information for 2000D',
    '2100E': 'Name Information for 2000E',
    '2200A': 'Information Source Detail',
    '2200B': 'Information Receiver Detail',
    '2200C': 'Subscriber/Patient Detail',
    '2200D': 'Dependent Detail',
    '2200E': 'Service Line Detail',
    '2300': 'Claim Information',
    '2400': 'Service Line Information',
    '2430': 'Line Adjudication Information',
    '2440': 'Form Identification',
    'PLB': 'Provider Adjustment'
  };

  private readonly transactionLoopDescriptions: Record<string, Record<string, string>> = {
    '837P': {
      '2010AA': 'Billing Provider Name',
      '2010AB': 'Pay-to Provider Name',
      '2010BA': 'Subscriber Name',
      '2010BB': 'Payer Name',
      '2010CA': 'Patient Name',
      '2310A': 'Referring Provider Name',
      '2310B': 'Rendering Provider Name',
      '2310C': 'Service Facility Name',
      '2420A': 'Rendering Provider Line Level',
      '2420B': 'Purchased Service Provider',
      '2420C': 'Service Facility Line Level',
      '2420D': 'Supervising Provider Line Level'
    },
    '837I': {
      '2010AA': 'Billing Provider Name',
      '2010AB': 'Pay-to Provider Name',
      '2010BA': 'Subscriber Name',
      '2010BB': 'Payer Name',
      '2010CA': 'Patient Name',
      '2310A': 'Attending Provider Name',
      '2310B': 'Operating Physician Name',
      '2310C': 'Other Provider Name',
      '2420A': 'Attending Provider Line Level',
      '2420B': 'Operating Physician Line Level',
      '2420C': 'Other Provider Line Level'
    },
    '837D': {
      '2010AA': 'Billing Provider Name',
      '2010AB': 'Pay-to Provider Name',
      '2010BA': 'Subscriber Name',
      '2010BB': 'Payer Name',
      '2010CA': 'Patient Name',
      '2310A': 'Referring Provider Name',
      '2310B': 'Rendering Provider Name',
      '2420A': 'Rendering Provider Line Level'
    },
    '270': {
      '2110C': 'Subscriber Eligibility/Benefit Inquiry',
      '2110D': 'Dependent Eligibility/Benefit Inquiry'
    },
    '271': {
      '2110C': 'Subscriber Eligibility/Benefit Information',
      '2110D': 'Dependent Eligibility/Benefit Information'
    },
    '835': {
      '2000': 'Header Number',
      '2100': 'Claim Payment Information',
      '2110': 'Service Payment Information'
    },
    '999': {
      '2000': 'Functional Group Response',
      '2100': 'Transaction Set Response',
      '2110': 'Segment/Element Context'
    },
    'TA1': {
      'TA1': 'Interchange Acknowledgment'
    }
  };

  private readonly snipDefinitions: Array<{ level: number; label: string }> = [
    { level: 1, label: 'EDI Syntax / Integrity' },
    { level: 2, label: 'HIPAA Syntax / Requirement' },
    { level: 3, label: 'Balancing' },
    { level: 4, label: 'Situational' }
  ];
  // validating = signal<boolean>(false);
  // result = signal<ValidationResult | null>(null);
  // error = signal<string>('');

  get filterValue(): string {
    return this.filter();
  }
  set filterValue(val: string) {
    this.filter.set(val);
    this.page.set(1);
  }

  get fileSizeLabel(): string {
    const size = this.fileSizeBytes();
    if (!size || size < 1) return '';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }

  get validationPreviewCount(): number {
    return 3;
  }

  get isClaimJumpSupported(): boolean {
    const tx = this.detectedTransactionType.toUpperCase();
    return tx === '835' || tx.startsWith('837');
  }

  get claimSegmentTag(): string {
    const tx = this.detectedTransactionType.toUpperCase();
    if (tx === '835') return 'CLP';
    if (tx.startsWith('837')) return 'CLM';
    return '';
  }

  constructor(
    private api: ValidatorService,
    private kvLookup: KvLookupService,
    private storage: StorageService,
    private route: ActivatedRoute,
    private wfService: WfRestServiceComponent,
    private transService: TransRestServiceComponent
  ) {
    void this.kvLookup.preload();
    const loadedFromSeed = this.loadSeedData();
    if (loadedFromSeed) {
      this.loadWorkflowErrorsFromQueryParams();
    } else {
      this.loadX12FromQueryParams();
    }
  }

  private loadX12FromQueryParams(): void {
    const queryMap = this.route.snapshot.queryParamMap;
    const x12DataId = queryMap.get('x12DataId') || queryMap.get('X12DataId') || queryMap.get('id') || '';
    const transactionType = queryMap.get('TransactionType') || '';
    const searchTypeString = queryMap.get('searchTypeString') || queryMap.get('mode') || '';
    const fileName = queryMap.get('FileName') || queryMap.get('fileName') || 'Transmission-X12.txt';

    if (!x12DataId || !transactionType || !searchTypeString) {
      this.hideActions.set(false);
      return;
    }

    this.hideActions.set(true);
    this.validating.set(true);
    this.error.set('');
    this.x12LoadInProgress.set(true);
    this.x12LoadStatus.set('Loading X12 header...');

    this.transService.fetchParentRecord(x12DataId, transactionType, searchTypeString).subscribe({
      next: (res: any) => {
        if (res === 'No data' || !res) {
          this.error.set('No X12 data found.');
          this.validating.set(false);
          this.x12LoadInProgress.set(false);
          this.x12LoadStatus.set('');
          this.hideActions.set(false);
          return;
        }

        const x12Data = String(res?.x12Data || '');
        if (x12Data.indexOf('stored as a Stream') >= 0) {
          this.x12LoadStatus.set('Loading streamed X12 chunks...');
          this.fetchStreamedX12(x12DataId, transactionType, searchTypeString, fileName);
          return;
        }

        this.applyLoadedX12Text(this.normalizeX12ForDisplay(x12Data), fileName);
      },
      error: (err) => {
        this.error.set('Failed to load X12: ' + (err?.message || 'Unknown error'));
        this.validating.set(false);
        this.x12LoadInProgress.set(false);
        this.x12LoadStatus.set('');
        this.hideActions.set(false);
      }
    });
  }

  private fetchStreamedX12(x12DataId: string, transactionType: string, searchTypeString: string, fileName: string): void {
    const maxSize = 3000000;
    const chunkIndexes: number[] = [0,1,2,3,4,5,6,7,8,9,10];

    from(chunkIndexes)
      .pipe(
        concatMap((id, index) => {
          this.x12LoadStatus.set('Loading X12 chunk ' + (index + 1) + ' of ' + chunkIndexes.length + '...');
          return this.transService.fetchX12Stream(x12DataId, transactionType, searchTypeString, id * maxSize + 1);
        }),
        toArray()
      )
      .subscribe({
        next: (parts: any[]) => {
          let combined = '';
          for (let i = 0; i < parts.length; i++) {
            if (!parts[i] || !parts[i][0]) break;
            const part = parts[i][0];
            if (part.moreData > 0 || part.x12Len > 0) {
              combined += String(part.x12Data || '');
            } else {
              break;
            }
          }

          if (!combined) {
            this.error.set('No streamed X12 data found.');
            this.validating.set(false);
            this.x12LoadInProgress.set(false);
            this.x12LoadStatus.set('');
            this.hideActions.set(false);
            return;
          }

          this.applyLoadedX12Text(this.normalizeX12ForDisplay(combined), fileName);
        },
        error: (err) => {
          this.error.set('Failed to stream X12: ' + (err?.message || 'Unknown error'));
          this.validating.set(false);
          this.x12LoadInProgress.set(false);
          this.x12LoadStatus.set('');
          this.hideActions.set(false);
        }
      });
  }

  private normalizeX12ForDisplay(text: string): string {
    return String(text || '').replaceAll('~', '~\n');
  }

  private applyLoadedX12Text(text: string, fileName: string): void {
    this.validating.set(false);
    this.x12LoadInProgress.set(false);
    this.x12LoadStatus.set('');
    this.error.set('');
    this.validationErrorsExpanded.set(false);
    this.highlightedLine.set(null);
    this.filter.set('');
    this.selectedSegmentTag.set('');
    this.selectedElementPosition.set(0);
    this.selectedElementValue.set('');
    this.selectedElementName.set('');
    this.selectedLoop.set('');
    this.page.set(1);
    this.claimJumpTarget.set('');
    this.claimIdJumpTarget.set('');
    this.claimJumpMessage.set('');

    this.fileName.set(fileName || 'Transmission-X12.txt');
    this.fileSizeBytes.set(text.length || 0);
    this.originalText.set(text);
    this.x12.set(parseX12(text));

    this.loadWorkflowErrorsFromQueryParams();
  }

  private loadWorkflowErrorsFromQueryParams(): void {
    const data = this.x12();
    if (!data) return;

    const queryMap = this.route.snapshot.queryParamMap;
    const sessionId = queryMap.get('sessionID') || queryMap.get('SessionID') || queryMap.get('SessionId') || '';
    const mode = queryMap.get('mode') || '';
    const transactionType = queryMap.get('TransactionType') || data.transactionType || '';
    const status = queryMap.get('Status') || queryMap.get('status') || '';
    const isValidationFailed = status.trim().toLowerCase() === 'validation failed';

    if (!sessionId || !mode) return;

    if (!isValidationFailed) {
      this.validating.set(false);
      this.error.set('');
      this.validationErrorsExpanded.set(false);
      this.result.set({
        isValid: true,
        errors: [],
        totalErrors: 0,
        suppressErrorTable: true,
        rawMessage: 'Valid X12, not errors'
      });
      return;
    }

    const searchStr =
      'ID=&X12DataId=&SessionID=' + sessionId +
      '&WFID=&TransactionType=' + transactionType +
      '&Status=' + status;

    console.log('[X12 Viewer] Workflow error fetch path active. Calling fetchRdpCrytalEntries with mode=' + mode + ', sessionID=' + sessionId + ', transactionType=' + transactionType + ', status=' + status);

    this.validating.set(true);
    this.error.set('');
    this.validationErrorsExpanded.set(false);

    this.wfService.fetchRdpCrytalEntries(mode, searchStr, sessionId).subscribe({
      next: (res: any) => {
        const errors = this.mapWorkflowErrors(res, data.text);
        this.result.set({
          isValid: errors.length === 0,
          errors,
          totalErrors: errors.length,
          rawMessage: errors.length === 0 ? 'No workflow errors found.' : undefined
        });
        this.validating.set(false);
      },
      error: (err) => {
        this.error.set('Workflow Validation: ' + (err?.message || 'Failed to fetch workflow errors'));
        this.validating.set(false);
      }
    });
  }

  private mapWorkflowErrors(res: any, x12Text: string): ValidationError[] {
    if (!Array.isArray(res) || res.length < 2) return [];

    const segmentSeparator = this.x12()?.segTerm || '~';
    const x12Lines = (x12Text || '').split(segmentSeparator).map((line) => line.trim());
    const detailsRows = res.slice(1);

    return detailsRows
      .map((row: any, idx: number): ValidationError | null => {
        const line = this.resolveWorkflowErrorLine(row, x12Lines);
        const segment = String(row?.Segment || row?.segment || row?.tag || '').trim();
        const ordinalValue = Number(row?.Element || row?.element || row?.eleNum || row?.ordinal);
        const ordinal = Number.isFinite(ordinalValue) ? ordinalValue : undefined;
        const code = String(row?.ErrorCode || row?.errorCode || '').trim();
        const desc = String(row?.ErrorDesc || row?.errorDesc || row?.Error || row?.error || '').trim();
        const details = desc || this.buildDynamicWorkflowErrorDetails(row);
        const message = code ? `${details} (${code})` : details;
        const validatingSegment = String(row?.SegmentData || row?.segmentData || '').trim();

        if (!message) return null;

        return {
          severity: 'ERROR',
          message,
          tag: segment || 'RDP',
          index: idx + 1,
          line: line > 0 ? line : undefined,
          ordinal,
          segment: segment || undefined,
          details,
          validatingSegment: validatingSegment || undefined,
          loop: String(row?.Loop || row?.loop || '').trim() || undefined,
          snip: String(row?.SnipLevel || row?.snip || '').trim() || undefined
        };
      })
      .filter((item): item is ValidationError => !!item);
  }

  private resolveWorkflowErrorLine(row: any, x12Lines: string[]): number {
    const lineNum = Number(row?.LineNum || row?.lineNum);
    if (Number.isFinite(lineNum) && lineNum > 0) return lineNum;

    const segmentData = String(row?.SegmentData || row?.segmentData || '').trim();
    if (segmentData) {
      const segmentIndex = x12Lines.findIndex((line) => line === segmentData);
      if (segmentIndex >= 0) return segmentIndex + 1;
    }

    for (const [key, value] of Object.entries(row || {})) {
      const keyLine = Number(key);
      if (Number.isFinite(keyLine) && keyLine > 0) return keyLine;

      const text = String(value ?? '').trim();
      if (!text) continue;
      const lineIndex = x12Lines.findIndex((line) => line === text || line.includes(text));
      if (lineIndex >= 0) return lineIndex + 1;
    }

    return -1;
  }

  private buildDynamicWorkflowErrorDetails(row: any): string {
    const ignoredKeys = new Set([
      'LineNum', 'lineNum',
      'Segment', 'segment',
      'Element', 'element', 'eleNum', 'ordinal',
      'Loop', 'loop',
      'SnipLevel', 'snip',
      'ErrorDesc', 'errorDesc',
      'ErrorCode', 'errorCode',
      'Error', 'error',
      'SegmentData', 'segmentData',
      'X12', 'x12'
    ]);

    const parts: string[] = [];
    Object.entries(row || {}).forEach(([key, value]) => {
      if (ignoredKeys.has(key)) return;
      const text = String(value ?? '').trim();
      if (!text) return;
      parts.push(`${key}: ${text}`);
    });

    return parts.join(', ');
  }

  private loadSeedData(): boolean {
    let seed = this.storage.getItem<{ text?: string; fileName?: string }>('x12ViewerSeed');
    if (!seed?.text) {
      const fallback = localStorage.getItem('x12ViewerSeed');
      if (fallback) {
        try {
          seed = JSON.parse(fallback) as { text?: string; fileName?: string };
        } catch {
          seed = null;
        }
      }
    }

    if (!seed?.text) {
      this.hideActions.set(false);
      return false;
    }

    this.hideActions.set(true);

    this.validating.set(false);
    this.result.set(null);
    this.error.set('');
    this.validationErrorsExpanded.set(false);
    this.highlightedLine.set(null);
    this.filter.set('');
    this.selectedSegmentTag.set('');
    this.selectedElementPosition.set(0);
    this.selectedElementValue.set('');
    this.selectedElementName.set('');
    this.selectedLoop.set('');
    this.page.set(1);

    const text = seed.text;
    this.fileName.set(seed.fileName || 'Transmission-X12.txt');
    this.fileSizeBytes.set(text.length || 0);
    this.originalText.set(text);
    this.x12.set(parseX12(text));

    this.storage.removeItem('x12ViewerSeed');
    localStorage.removeItem('x12ViewerSeed');
    return true;
  }

  filtered = computed(() => {
    const f = this.filter().trim().toUpperCase();
    const data = this.x12();
    if (!data) return [];
    if (!f) return data.segments;
    return data.segments.filter(s => s.tag.includes(f) || s.raw.toUpperCase().includes(f));
  });

  claimLineNumbers = computed(() => {
    const data = this.x12();
    const claimTag = this.claimSegmentTag;
    if (!data || !claimTag) return [] as number[];
    return data.segments
      .filter((segment) => segment.tag === claimTag)
      .map((segment) => segment.index + 1);
  });

  claimNumberByLine = computed(() => {
    const data = this.x12();
    if (!data) return new Map<number, number>();

    const claimTags = new Set(['CLM', 'CLP']);
    const map = new Map<number, number>();
    let claimNumber = 0;

    data.segments.forEach((segment) => {
      if (!claimTags.has(segment.tag)) return;
      claimNumber += 1;
      map.set(segment.index + 1, claimNumber);
    });

    return map;
  });

  claimIdEntries = computed(() => {
    const data = this.x12();
    const claimTag = this.claimSegmentTag;
    if (!data || !claimTag) return [] as Array<{ claimNumber: number; line: number; claimId: string }>;

    let claimNumber = 0;
    return data.segments
      .filter((segment) => segment.tag === claimTag)
      .map((segment) => {
        claimNumber += 1;
        return {
          claimNumber,
          line: segment.index + 1,
          claimId: String(segment.elements?.[0] || '').trim()
        };
      })
      .filter((entry) => !!entry.claimId);
  });

  pagedFiltered = computed(() => {
    const rows = this.filtered();
    const size = this.pageSize();
    const currentPage = this.page();
    const start = (currentPage - 1) * size;
    return rows.slice(start, start + size);
  });

  totalPages = computed(() => {
    const total = this.filtered().length;
    const size = this.pageSize();
    return Math.max(1, Math.ceil(total / size));
  });

  pageRangeLabel = computed(() => {
    const total = this.filtered().length;
    if (total === 0) return '0-0 of 0';
    const size = this.pageSize();
    const currentPage = this.page();
    const start = (currentPage - 1) * size + 1;
    const end = Math.min(currentPage * size, total);
    return `${start}-${end} of ${total}`;
  });

  onPageSizeChange(value: string): void {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) return;
    this.pageSize.set(parsed);
    this.page.set(1);
  }

  previousPage(): void {
    const currentPage = this.page();
    if (currentPage > 1) this.page.set(currentPage - 1);
  }

  firstPage(): void {
    this.page.set(1);
  }

  nextPage(): void {
    const currentPage = this.page();
    const total = this.totalPages();
    if (currentPage < total) this.page.set(currentPage + 1);
  }

  lastPage(): void {
    this.page.set(this.totalPages());
  }

  getFieldHoverText(segmentTag: string, elementPosition: number, fieldValue: string): string {
    this.kvLookup.loadVersion();
    const segmentDef = SEGMENT_LIBRARY[segmentTag];
    const segmentName = segmentDef?.name ?? 'Unknown Segment';
    const fieldName = segmentDef?.fields.find((field) => field.position === elementPosition)?.name ?? `Element ${elementPosition}`;
    const valueName = this.getFieldResolvedName(segmentTag, elementPosition, fieldValue);
    if (valueName) {
      return `${segmentTag} (${segmentName}) • ${fieldName}: ${fieldValue} = ${valueName}`;
    }
    return `${segmentTag} (${segmentName}) • ${fieldName}`;
  }

  getFieldResolvedName(segmentTag: string, elementPosition: number, fieldValue: string): string | null {
    this.kvLookup.loadVersion();
    return this.kvLookup.lookupName(segmentTag, elementPosition, fieldValue);
  }

  getCompositeDisplay(elementValue: string): string {
    const separator = this.x12()?.compSep;
    if (!separator || !elementValue || !elementValue.includes(separator)) return '';

    return elementValue
      .split(separator)
      .map((part, index) => `${index + 1}:${part}`)
      .join(' | ');
  }

  get detectedTransactionType(): string {
    const data = this.x12();
    if (!data) return '—';
    return data.transactionType;
  }

  get detectedCountTag(): string {
    const data = this.x12();
    if (!data) return '';

    const tx = data.transactionType.toUpperCase();
    if (tx === '835') return 'CLP';
    if (tx.startsWith('837')) return 'CLM';
    if (tx === '270' || tx === '271' || tx === '276' || tx === '277' || tx === '277CA') return 'TRN';
    return '';
  }

  get detectedCount(): number {
    const data = this.x12();
    const tag = this.detectedCountTag;
    if (!data || !tag) return 0;
    return data.segments.filter((segment) => segment.tag === tag).length;
  }

  isDetectedCountSegment(tag: string): boolean {
    const detectedTag = this.detectedCountTag;
    return !!detectedTag && tag === detectedTag;
  }

  getSegmentTagHoverText(tag: string, lineNumber: number): string {
    const claimNumber = this.claimNumberByLine().get(lineNumber);
    if ((tag === 'CLM' || tag === 'CLP') && claimNumber) {
      return `Claim #${claimNumber}`;
    }
    return tag;
  }

  getLoopDescription(loop?: string): string {
    const normalizedLoop = (loop || '').trim().toUpperCase();
    if (!normalizedLoop) return '';

    const tx = this.detectedTransactionType.toUpperCase();
    const txDescription = this.transactionLoopDescriptions[tx]?.[normalizedLoop];
    if (txDescription) return `${normalizedLoop}: ${txDescription}`;

    const commonDescription = this.commonLoopDescriptions[normalizedLoop];
    if (commonDescription) return `${normalizedLoop}: ${commonDescription}`;

    return `${normalizedLoop}: Loop context`;
  }

  getSnipDisplay(snip?: string): string {
    const raw = (snip || '').trim();
    if (!raw) return '—';

    const normalized = raw.toLowerCase();
    const numeric = Number(raw);

    const matched = this.snipDefinitions.find((definition) => {
      if (Number.isFinite(numeric) && numeric === definition.level) return true;
      const full = `${definition.level} ${definition.label}`.toLowerCase();
      return full.includes(normalized) || normalized.includes(definition.label.toLowerCase());
    });

    if (matched) return `${matched.level}`;
    if (Number.isFinite(numeric)) return `${numeric}`;
    return raw;
  }

  getSelectedLoopDisplay(loop?: string): string {
    const normalizedLoop = (loop || '').trim().toUpperCase();
    if (!normalizedLoop) return '';

    const tx = this.detectedTransactionType.toUpperCase();
    const txDescription = this.transactionLoopDescriptions[tx]?.[normalizedLoop];
    if (txDescription) return `${normalizedLoop} (${txDescription})`;

    const commonDescription = this.commonLoopDescriptions[normalizedLoop];
    if (commonDescription) return `${normalizedLoop} (${commonDescription})`;

    return normalizedLoop;
  }

  get gsCount(): number {
    const data = this.x12();
    if (!data) return 0;
    return data.segments.filter((segment) => segment.tag === 'GS').length;
  }

  get stCount(): number {
    const data = this.x12();
    if (!data) return 0;
    return data.segments.filter((segment) => segment.tag === 'ST').length;
  }

  jumpToClaimNumber(): void {
    this.claimJumpMessage.set('');

    if (!this.isClaimJumpSupported) return;

    const claimNumber = Number(this.claimJumpTarget().trim());
    if (!Number.isFinite(claimNumber) || claimNumber < 1 || !Number.isInteger(claimNumber)) {
      this.claimJumpMessage.set('Enter a valid claim number.');
      return;
    }

    const lines = this.claimLineNumbers();
    if (claimNumber > lines.length) {
      this.claimJumpMessage.set(`Claim # out of range (1-${lines.length}).`);
      return;
    }

    const targetLine = lines[claimNumber - 1];
    this.focusLine(targetLine);
  }

  onClaimNumberInputChange(value: unknown): void {
    this.claimJumpMessage.set('');

    const text = String(value ?? '').trim();
    if (!text) {
      this.claimJumpTarget.set('');
      return;
    }

    const digitsOnly = text.replace(/\D/g, '');
    if (!digitsOnly) {
      this.claimJumpTarget.set('');
      return;
    }

    const maxClaims = this.claimLineNumbers().length;
    const parsed = Number(digitsOnly);
    if (!Number.isFinite(parsed)) {
      this.claimJumpTarget.set('');
      return;
    }

    const clamped = Math.max(1, maxClaims > 0 ? Math.min(parsed, maxClaims) : parsed);
    if (maxClaims > 0 && parsed > maxClaims) {
      this.claimJumpMessage.set('Max claim number is ' + maxClaims + '.');
    }

    this.claimJumpTarget.set(String(clamped));
  }

  jumpToClaimId(): void {
    this.claimJumpMessage.set('');

    if (!this.isClaimJumpSupported) return;

    const targetClaimId = this.claimIdJumpTarget().trim();
    if (!targetClaimId) {
      this.claimJumpMessage.set('Enter a claim ID value.');
      return;
    }

    const normalizedTarget = targetClaimId.toUpperCase();
    const entries = this.claimIdEntries();
    const exactMatches = entries.filter((entry) => entry.claimId.toUpperCase() === normalizedTarget);
    const matches = exactMatches.length > 0
      ? exactMatches
      : entries.filter((entry) => entry.claimId.toUpperCase().includes(normalizedTarget));

    if (matches.length === 0) {
      this.claimJumpMessage.set(`Claim ID not found: ${targetClaimId}`);
      return;
    }

    this.focusLine(matches[0].line);

    if (matches.length > 1) {
      this.claimJumpMessage.set(`Multiple matches for ${targetClaimId}; jumped to first (claim #${matches[0].claimNumber}).`);
    }
  }

  get selectedFieldLabel(): string {
    const segmentTag = this.selectedSegmentTag();
    const elementPosition = this.selectedElementPosition();
    const elementValue = this.selectedElementValue().trim();
    if (!segmentTag || elementPosition < 1) return '';

    const segmentDef = SEGMENT_LIBRARY[segmentTag];
    const fieldName = segmentDef?.fields.find((field) => field.position === elementPosition)?.name ?? `Element ${elementPosition}`;
    const fieldNumber = String(elementPosition).padStart(2, '0');
    const resolvedName = this.selectedElementName() || this.getFieldResolvedName(segmentTag, elementPosition, elementValue);

    if (resolvedName) {
      return `${segmentTag}:${fieldNumber} (${fieldName}) = ${elementValue} (${resolvedName})`;
    }

    return `${segmentTag}:${fieldNumber} (${fieldName}) = ${elementValue}`;
  }

  get selectedFieldValueToLabel(): string {
    const elementValue = this.selectedElementValue().trim();
    if (!elementValue) return '';

    return elementValue;
  }

  get selectedResolvedName(): string {
    const segmentTag = this.selectedSegmentTag();
    const elementPosition = this.selectedElementPosition();
    const elementValue = this.selectedElementValue().trim();
    if (!segmentTag || elementPosition < 1 || !elementValue) return '';

    return this.selectedElementName() || this.getFieldResolvedName(segmentTag, elementPosition, elementValue) || '';
  }

  get selectedFieldSummary(): string {
    const label = this.selectedFieldLabel;
    if (!label) return '';

    const loopDisplay = this.getSelectedLoopDisplay(this.selectedLoop());
    return loopDisplay ? `${loopDisplay}, ${label}` : label;
  }

  get selectedFieldSummaryTitle(): string {
    const summary = this.selectedFieldSummary;
    const separatorIndex = summary.indexOf('=');
    if (separatorIndex < 0) return summary;
    return summary.slice(0, separatorIndex).trim();
  }

  get selectedFieldSummaryValue(): string {
    const summary = this.selectedFieldSummary;
    const separatorIndex = summary.indexOf('=');
    if (separatorIndex < 0) return '';
    return summary.slice(separatorIndex + 1).trim();
  }

  getValidationTopMessages(errors: ValidationError[]): string[] {
    const uniqueMessages = Array.from(new Set(
      (errors || [])
        .map((error) => (error.details || error.message || '').trim())
        .filter(Boolean)
    ));
    return uniqueMessages.slice(0, 2);
  }

  getVisibleValidationErrors(errors: ValidationError[]): ValidationError[] {
    if (this.validationErrorsExpanded()) return errors || [];
    return (errors || []).slice(0, this.validationPreviewCount);
  }

  hasHiddenValidationErrors(errors: ValidationError[]): boolean {
    return (errors || []).length > this.validationPreviewCount;
  }

  toggleValidationErrors(): void {
    this.validationErrorsExpanded.set(!this.validationErrorsExpanded());
  }

  getValidatingSegmentParts(validatingSegment: string): string[] {
    const separator = this.x12()?.elementSep || '*';
    return validatingSegment ? validatingSegment.split(separator) : [];
  }

  getSegmentOrdinalData(validatingSegment: string, ordinal?: number, segment?: string): string {
    const parts = this.getValidatingSegmentParts(validatingSegment);
    const ordinalNumber = Number(ordinal);
    if (!parts.length || !Number.isFinite(ordinalNumber) || ordinalNumber < 1) return '';

    const separator = this.x12()?.elementSep || '*';
    const normalizedSegment = (segment || '').trim().toUpperCase();
    const firstToken = (parts[0] || '').trim().toUpperCase();
    const hasLeadingSegmentTag = !!normalizedSegment && firstToken === normalizedSegment;

    if (hasLeadingSegmentTag) {
      const start = Math.max(1, ordinalNumber - 1);
      const end = Math.min(parts.length - 1, ordinalNumber);
      return parts.slice(start, end + 1).join(separator);
    }

    const start = Math.max(0, ordinalNumber - 1);
    const end = Math.min(parts.length - 1, ordinalNumber);
    return parts.slice(start, end + 1).join(separator);
  }

  isOrdinalToken(partIndex: number, ordinal?: number, parts?: string[], segment?: string): boolean {
    const ordinalNumber = Number(ordinal);
    if (!Number.isFinite(ordinalNumber) || ordinalNumber < 1) return false;

    const normalizedSegment = (segment || '').trim().toUpperCase();
    const firstToken = (parts?.[0] || '').trim().toUpperCase();
    const hasLeadingSegmentTag = !!normalizedSegment && firstToken === normalizedSegment;
    const targetIndex = hasLeadingSegmentTag ? ordinalNumber : ordinalNumber - 1;

    return partIndex === targetIndex;
  }

  async onFieldClick(segmentTag: string, elementPosition: number, fieldValue: string, loop?: string): Promise<void> {
    this.selectedSegmentTag.set(segmentTag);
    this.selectedElementPosition.set(elementPosition);
    this.selectedElementValue.set(fieldValue);
    this.selectedElementName.set('');
    this.selectedLoop.set(loop || '');

    const resolvedName = await this.kvLookup.resolveName(segmentTag, elementPosition, fieldValue);
    if (this.selectedSegmentTag() === segmentTag && this.selectedElementPosition() === elementPosition && this.selectedElementValue() === fieldValue) {
      this.selectedElementName.set(resolvedName ?? '');
    }
  }

  isSelectedField(segmentTag: string, elementPosition: number): boolean {
    return this.selectedSegmentTag() === segmentTag && this.selectedElementPosition() === elementPosition;
  }

  closeSelectedFieldDetails(): void {
    this.selectedSegmentTag.set('');
    this.selectedElementPosition.set(0);
    this.selectedElementValue.set('');
    this.selectedElementName.set('');
    this.selectedLoop.set('');
  }

  @ViewChild('dataTableContainer') dataTableContainer?: ElementRef<HTMLDivElement>;

  onValidationLineClick(line?: number): void {
    const lineNumber = Number(line);
    if (!Number.isFinite(lineNumber) || lineNumber < 1) return;

    this.focusLine(lineNumber);
  }

  private focusLine(lineNumber: number): void {
    this.claimJumpMessage.set('');

    const data = this.x12();
    if (!data) return;

    let rows = this.filtered();
    let rowIndex = rows.findIndex((segment) => segment.index + 1 === lineNumber);

    if (rowIndex < 0) {
      rowIndex = data.segments.findIndex((segment) => segment.index + 1 === lineNumber);
      if (rowIndex < 0) return;
      this.filter.set('');
      rows = data.segments;
    }

    const pageSize = this.pageSize();
    const page = Math.floor(rowIndex / pageSize) + 1;
    this.page.set(page);
    this.highlightedLine.set(lineNumber);

    // Scroll to the highlighted row after the page renders
    setTimeout(() => this.scrollToHighlightedRow(), 0);
  }

  private scrollToHighlightedRow(): void {
    const container = this.dataTableContainer?.nativeElement;
    if (!container) return;
    const highlightedRow = container.querySelector('tr[class*="validation-line-highlight"]') as HTMLElement;
    if (highlightedRow) {
      highlightedRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  isHighlightedSegmentLine(lineNumber: number): boolean {
    return this.highlightedLine() === lineNumber;
  }

  onChooseFileClick(): void {
    this.validating.set(false);
    this.result.set(null);
    this.error.set('');
    this.validationErrorsExpanded.set(false);
    this.highlightedLine.set(null);
    this.claimJumpTarget.set('');
    this.claimIdJumpTarget.set('');
    this.claimJumpMessage.set('');
    this.filter.set('');
    this.fileSizeBytes.set(0);
  }

  downloadX12(): void {
    const text = this.originalText();
    if (!text) return;
    downloadTextFile(text, this.fileName() || 'X12.txt');
  }

  onPick(ev: Event) {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    this.validating.set(false);
    this.result.set(null);
    this.error.set('');
    this.validationErrorsExpanded.set(false);
    this.highlightedLine.set(null);
    this.claimJumpTarget.set('');
    this.claimIdJumpTarget.set('');
    this.claimJumpMessage.set('');
    const file = input.files[0];
    this.fileName.set(file.name);
    this.fileSizeBytes.set(file.size || 0);
    const reader = new FileReader();
    reader.onload = async () => {
      const text = typeof reader.result === 'string' ? reader.result : new TextDecoder().decode(reader.result as ArrayBuffer);
      await this.kvLookup.preload();
      this.hideActions.set(false);
      this.originalText.set(text);
      this.x12.set(parseX12(text));
      this.page.set(1);
      this.selectedSegmentTag.set('');
      this.selectedElementPosition.set(0);
      this.selectedElementValue.set('');
      this.selectedElementName.set('');
      this.selectedLoop.set('');
      this.claimIdJumpTarget.set('');
    };
    reader.readAsText(file);
  }

  // validate() removed, validation is server-side only
}
