import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompareConfig, DiffLine, FilePair, PairResult, RunSummary } from './compare.models';
import { FolderCompareService } from './folder-compare.service';

interface DiffToken {
  value: string;
  isDiff: boolean;
  isIgnored: boolean;
}

@Component({
  selector: 'app-x12-compare',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './x12-compare.component.html',
  styleUrls: ['./x12-utility.component.css']
})
export class X12CompareComponent {
  compareMode: '' | 'one' | 'multiple' = '';
  leftDir: FileSystemDirectoryHandle | { name: string; files: File[] } | null = null;
  rightDir: FileSystemDirectoryHandle | { name: string; files: File[] } | null = null;
  leftFile: FileSystemFileHandle | File | null = null;
  rightFile: FileSystemFileHandle | File | null = null;
  savedLeftFolderName = '';
  savedRightFolderName = '';
  savedLeftFileName = '';
  savedRightFileName = '';

  working = signal(false);
  pairs = signal<FilePair[]>([]);
  results = signal<PairResult[]>([]);
  summary = signal<RunSummary | null>(null);
  fullDiffRow = signal<PairResult | null>(null);
  fullDiffLines = signal<DiffLine[]>([]);

  cfg: CompareConfig = {
    compareExactFilename: false,
    leftKeyStart: undefined,
    leftKeyEnd: undefined,
    rightKeyStart: undefined,
    rightKeyEnd: undefined,
    segmentSep: '~',
    elementSep: '*',
    autoDetect: true,
    ignoreFields: [],
    maxPreviewDiffs: 3
  };

  readonly previewDiffOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  filter = signal('');
  resultFilter = signal<'all' | 'identical' | 'different'>('all');
  page = signal(1);
  pageSize = signal(10);
  readonly pageSizeOptions = [5, 10, 25, 50, 100];

  constructor(private svc: FolderCompareService) {}

  get filterValue(): string {
    return this.filter();
  }

  set filterValue(v: string) {
    this.filter.set(v);
    this.page.set(1);
  }

  filteredResults = computed(() => {
    const f = this.filter().trim().toLowerCase();
    const statusFilter = this.resultFilter();
    let rows = this.results();

    if (statusFilter === 'identical') {
      rows = rows.filter(r => r.identical);
    } else if (statusFilter === 'different') {
      rows = rows.filter(r => !r.identical);
    }

    if (!f) return rows;
    return rows.filter(r => `${r.leftName} ${r.rightName} ${r.identical ? 'identical' : 'different'}`.toLowerCase().includes(f));
  });

  setResultFilter(value: 'all' | 'identical' | 'different'): void {
    this.resultFilter.set(value);
    this.page.set(1);
  }

  pagedResults = computed(() => {
    const rows = this.filteredResults();
    const size = this.pageSize();
    const currentPage = this.page();
    const start = (currentPage - 1) * size;
    return rows.slice(start, start + size);
  });

  totalPages = computed(() => {
    const total = this.filteredResults().length;
    const size = this.pageSize();
    return Math.max(1, Math.ceil(total / size));
  });

  pageRangeLabel = computed(() => {
    const total = this.filteredResults().length;
    if (total === 0) return '0-0 of 0';
    const size = this.pageSize();
    const currentPage = this.page();
    const start = (currentPage - 1) * size + 1;
    const end = Math.min(currentPage * size, total);
    return `${start}-${end} of ${total}`;
  });

  countNotEqualDifferences(): number {
    return this.fullDiffLines().filter(d => d.isDifferent).length;
  }

  clearState(): void {
    this.pairs.set([]);
    this.results.set([]);
    this.summary.set(null);
    this.fullDiffRow.set(null);
    this.fullDiffLines.set([]);
    this.working.set(false);
    this.filter.set('');
    this.page.set(1);
  }

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

  nextPage(): void {
    const currentPage = this.page();
    const total = this.totalPages();
    if (currentPage < total) this.page.set(currentPage + 1);
  }

  hasSelectionForMode(): boolean {
    return this.compareMode === 'one' ? !!(this.leftFile && this.rightFile) : !!(this.leftDir && this.rightDir);
  }

  getLeftContextName(): string {
    if (this.compareMode === 'one') {
      return this.leftFile?.name || this.savedLeftFileName || 'First';
    }
    return this.leftDir?.name || this.savedLeftFolderName || 'First';
  }

  getRightContextName(): string {
    if (this.compareMode === 'one') {
      return this.rightFile?.name || this.savedRightFileName || 'Second';
    }
    return this.rightDir?.name || this.savedRightFolderName || 'Second';
  }

  onLeftFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.leftFile = input.files[0];
      this.savedLeftFileName = this.leftFile?.name ?? this.savedLeftFileName;
    }
    input.value = '';
  }

  onRightFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.rightFile = input.files[0];
      this.savedRightFileName = this.rightFile?.name ?? this.savedRightFileName;
    }
    input.value = '';
  }

  onLeftFolderSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      const folderName = this.getSelectedFolderName(files);
      this.leftDir = {
        name: folderName,
        files
      };
      this.savedLeftFolderName = this.leftDir?.name ?? this.savedLeftFolderName;
    }
    input.value = '';
  }

  onRightFolderSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      const folderName = this.getSelectedFolderName(files);
      this.rightDir = {
        name: folderName,
        files
      };
      this.savedRightFolderName = this.rightDir?.name ?? this.savedRightFolderName;
    }
    input.value = '';
  }

  private getSelectedFolderName(files: File[]): string {
    const sample = files.find(file => !!file.webkitRelativePath) || files[0];
    const relativePath = sample?.webkitRelativePath || '';
    const firstSegment = relativePath.split(/[\\/]/).filter(Boolean)[0];
    return firstSegment || 'Selected Folder';
  }

  saveSetup(): void {
    const payload = {
      version: 1,
      selectionMode: this.compareMode,
      leftFolderName: this.leftDir?.name ?? this.savedLeftFolderName ?? '',
      rightFolderName: this.rightDir?.name ?? this.savedRightFolderName ?? '',
      leftFileName: this.leftFile?.name ?? this.savedLeftFileName ?? '',
      rightFileName: this.rightFile?.name ?? this.savedRightFileName ?? '',
      config: {
        compareExactFilename: this.cfg.compareExactFilename,
        leftKeyStart: this.cfg.leftKeyStart,
        leftKeyEnd: this.cfg.leftKeyEnd,
        rightKeyStart: this.cfg.rightKeyStart,
        rightKeyEnd: this.cfg.rightKeyEnd,
        segmentSep: this.cfg.segmentSep,
        elementSep: this.cfg.elementSep,
        autoDetect: this.cfg.autoDetect,
        ignoreFields: this.cfg.ignoreFields,
        maxPreviewDiffs: this.cfg.maxPreviewDiffs
      }
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = 'compare-setup.json';
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  loadSetup(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    void file.text().then((txt) => {
      try {
        const parsed = JSON.parse(txt);
        const mode = parsed?.selectionMode;
        if (!this.compareMode && (mode === 'one' || mode === 'multiple')) {
          this.compareMode = mode;
        }

        const cfg = parsed?.config ?? parsed;
        this.cfg = {
          ...this.cfg,
          compareExactFilename: typeof cfg.compareExactFilename === 'boolean' ? cfg.compareExactFilename : this.cfg.compareExactFilename,
          leftKeyStart: typeof cfg.leftKeyStart === 'number' ? cfg.leftKeyStart : undefined,
          leftKeyEnd: typeof cfg.leftKeyEnd === 'number' ? cfg.leftKeyEnd : undefined,
          rightKeyStart: typeof cfg.rightKeyStart === 'number' ? cfg.rightKeyStart : undefined,
          rightKeyEnd: typeof cfg.rightKeyEnd === 'number' ? cfg.rightKeyEnd : undefined,
          segmentSep: typeof cfg.segmentSep === 'string' && cfg.segmentSep ? cfg.segmentSep : this.cfg.segmentSep,
          elementSep: typeof cfg.elementSep === 'string' && cfg.elementSep ? cfg.elementSep : this.cfg.elementSep,
          autoDetect: typeof cfg.autoDetect === 'boolean' ? cfg.autoDetect : this.cfg.autoDetect,
          ignoreFields: Array.isArray(cfg.ignoreFields) ? cfg.ignoreFields : this.cfg.ignoreFields,
          maxPreviewDiffs: typeof cfg.maxPreviewDiffs === 'number'
            ? Math.max(1, Math.min(10, cfg.maxPreviewDiffs))
            : this.cfg.maxPreviewDiffs
        };

        this.savedLeftFolderName = typeof parsed.leftFolderName === 'string' ? parsed.leftFolderName : this.savedLeftFolderName;
        this.savedRightFolderName = typeof parsed.rightFolderName === 'string' ? parsed.rightFolderName : this.savedRightFolderName;
        this.savedLeftFileName = typeof parsed.leftFileName === 'string' ? parsed.leftFileName : this.savedLeftFileName;
        this.savedRightFileName = typeof parsed.rightFileName === 'string' ? parsed.rightFileName : this.savedRightFileName;
      } catch {
      }

      input.value = '';
      this.clearState();
    });
  }

  addIgnoreField(raw: string): void {
    const trimmed = raw.trim().toUpperCase();
    if (!trimmed) return;
    const ok = /^[A-Z0-9]{2,3}:\d{1,3}$/.test(trimmed);
    if (!ok) return;
    if (!this.cfg.ignoreFields.includes(trimmed as any)) {
      this.cfg.ignoreFields = [...this.cfg.ignoreFields, trimmed as any];
    }
  }

  removeIgnoreField(value: string): void {
    this.cfg.ignoreFields = this.cfg.ignoreFields.filter(v => v !== value);
  }

  async pair(): Promise<void> {
    if (this.compareMode === 'one') {
      if (!this.leftFile || !this.rightFile) return;
      this.pairs.set([
        {
          key: `${this.leftFile.name} | ${this.rightFile.name}`,
          leftName: this.leftFile.name,
          rightName: this.rightFile.name,
          leftHandle: this.leftFile,
          rightHandle: this.rightFile
        }
      ]);
      this.summary.set({ compared: 1, identical: 0, different: 0, errors: [], leftOnly: [], rightOnly: [] });
      this.results.set([]);
      return;
    }

    if (!this.leftDir || !this.rightDir) return;

    this.working.set(true);
    try {
      const { pairs, summary } = await this.svc.pairFiles(this.leftDir, this.rightDir, this.cfg);
      this.pairs.set(pairs);
      this.summary.set(summary);
      this.results.set([]);
    } finally {
      this.working.set(false);
    }
  }

  async runCompare(): Promise<void> {
    if (!this.pairs().length) {
      await this.pair();
    }

    const pairs = this.pairs();
    if (!pairs.length) return;

    this.working.set(true);
    try {
      const res: PairResult[] = [];
      for (const pair of pairs) {
        res.push(await this.svc.comparePair(pair, this.cfg));
      }
      const identical = res.filter(r => r.identical).length;
      const different = res.length - identical;
      const summary = this.summary() || { compared: 0, identical: 0, different: 0, errors: [], leftOnly: [], rightOnly: [] };
      this.summary.set({ ...summary, compared: res.length, identical, different });
      this.results.set(res);
      this.page.set(1);
    } finally {
      this.working.set(false);
    }
  }

  async openFullDiff(row: PairResult): Promise<void> {
    const pair = this.pairs().find(p => p.leftName === row.leftName && p.rightName === row.rightName);
    if (!pair) return;
    const diffs = await this.svc.loadFullDiff(pair, this.cfg);
    this.fullDiffRow.set(row);
    this.fullDiffLines.set(diffs);
  }

  closeFullDiff(): void {
    this.fullDiffRow.set(null);
    this.fullDiffLines.set([]);
  }

  private isIgnoredField(tag: string, fieldPosition: number): boolean {
    if (!tag || fieldPosition < 1) return false;
    return this.cfg.ignoreFields.some(rule => {
      const [seg, posStr] = String(rule).split(':');
      const pos = Number(posStr);
      return seg === tag && Number.isFinite(pos) && pos === fieldPosition;
    });
  }

  private missingSegmentLabel(side: 'left' | 'right', left: string | null, right: string | null): string {
    const source = side === 'left' ? right : left;
    if (!source) return 'Segment Not Found';
    const tag = source.split('*')[0]?.trim();
    return tag ? `${tag} Not Found` : 'Segment Not Found';
  }

  getFieldLabel(index: number): string {
    return index === 0 ? 'Segment tag' : `Field ${index}`;
  }

  isIgnoredEqualRow(diff: DiffLine): boolean {
    if (diff.isDifferent || diff.left == null || diff.right == null) return false;
    const leftParts = diff.left.split('*');
    const rightParts = diff.right.split('*');
    const tag = (leftParts[0] || rightParts[0] || '').trim();
    const max = Math.max(leftParts.length, rightParts.length);
    for (let index = 0; index < max; index++) {
      if ((leftParts[index] ?? '') !== (rightParts[index] ?? '') && !this.isIgnoredField(tag, index)) {
        return false;
      }
    }
    return leftParts.join('*') !== rightParts.join('*');
  }

  statusSymbol(diff: DiffLine): string {
    if (diff.isDifferent) return '≠';
    if (this.isIgnoredEqualRow(diff)) return '~=';
    return '=';
  }

  statusClass(diff: DiffLine): string {
    if (diff.isDifferent) return 'bad';
    if (this.isIgnoredEqualRow(diff)) return 'ignored';
    return 'ok';
  }

  getDiffTokens(diff: DiffLine, side: 'left' | 'right'): DiffToken[] {
    const value = side === 'left' ? diff.left : diff.right;
    const otherValue = side === 'left' ? diff.right : diff.left;

    if (value == null) {
      return [{ value: this.missingSegmentLabel(side, diff.left, diff.right), isDiff: true, isIgnored: false }];
    }

    if (otherValue == null) {
      return this.toTokens(value, true);
    }

    const parts = value.split('*');
    const otherParts = otherValue.split('*');
    const tag = (parts[0] || otherParts[0] || '').trim();
    const max = Math.max(parts.length, otherParts.length);
    const tokens: DiffToken[] = [];

    for (let index = 0; index < max; index++) {
      const own = parts[index] ?? '';
      const other = otherParts[index] ?? '';
      const fieldPosition = index;
      const ignored = this.isIgnoredField(tag, fieldPosition);
      tokens.push({ value: own, isDiff: own !== other && !ignored, isIgnored: ignored });
    }

    return tokens;
  }

  private toTokens(value: string, isDiff: boolean): DiffToken[] {
    if (!value) return [{ value: '', isDiff, isIgnored: false }];
    return value.split('*').map((token) => ({ value: token, isDiff, isIgnored: false }));
  }

  exportPairsCsv(): void {
    const rows: string[][] = [['key', 'leftName', 'rightName', 'status', 'totalDiffs']];
    for (const result of this.results()) {
      rows.push([
        result.key,
        result.leftName,
        result.rightName,
        result.identical ? 'Identical' : 'Different',
        String(result.totalDiffs)
      ]);
    }
    this.downloadCsv('pairs.csv', rows);
  }

  exportLeftOnlyCsv(): void {
    const s = this.summary();
    if (!s) return;
    const rows: string[][] = [['key', 'leftName']];
    for (const item of s.leftOnly) {
      rows.push([item.key, item.name]);
    }
    this.downloadCsv('left-only.csv', rows);
  }

  exportRightOnlyCsv(): void {
    const s = this.summary();
    if (!s) return;
    const rows: string[][] = [['key', 'rightName']];
    for (const item of s.rightOnly) {
      rows.push([item.key, item.name]);
    }
    this.downloadCsv('right-only.csv', rows);
  }

  private downloadCsv(filename: string, rows: string[][]): void {
    const csv = rows
      .map(row => row.map(value => {
        if (value == null) return '';
        const needsQuote = /[",\n]/.test(value);
        const escaped = value.replace(/"/g, '""');
        return needsQuote ? `"${escaped}"` : escaped;
      }).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }
}
