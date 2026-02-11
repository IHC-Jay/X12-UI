import { Component, Input, OnChanges, SimpleChanges, OnInit, ChangeDetectorRef, HostBinding } from '@angular/core';
import { NestedTreeControl } from '@angular/cdk/tree';
import { MatTreeNestedDataSource } from '@angular/material/tree';
import { elementLabel, ensureElementLabels, txFriendlyName, TX_FRIENDLY_MAP, SEGMENT_LABELS } from './x12-metadata';
import * as SAMPLE_DATA from './sample-x12-data';
import { CodeValueLookupService } from '../codeValue-lookup/codeValue-lookup.service';

interface X12Node {
  name: string;
  value?: string;
  children?: X12Node[];
  label?: string;
  index?: number;
  _segmentStart?: number;
  _segmentEnd?: number | null;
  _loaded?: boolean;
  _isTransaction?: boolean;
}

@Component({
  selector: 'app-x12-viewer',
  templateUrl: './x12-viewer.component.html',
  styleUrls: ['./x12-viewer.component.css'],
  standalone: false
})
export class X12ViewerComponent implements OnChanges, OnInit {
  // ...existing code...
  // Refactor large methods into private helpers for clarity and maintainability
  @HostBinding('class.fullscreen-tree')
  get fullscreenTree() { return this.viewMode === 'tree'; }
  @Input() x12Text = '';
  @Input() title = 'X12 Message';
  @Input() showControls = true;
  messageHeading = this.title;
  collapsed = false;
  viewMode: 'tree' | 'raw' | 'mixed' = 'raw';

  transactions: Array<{ code: string; label: string }> = [];
  selectedTx = '';
  selectedFileName = '';
  // quick previews for very large files (head/tail) to avoid waiting for full read
  previewFirstSegments: Array<{ idx: number; text: string }> = [];
  previewLastSegments: Array<{ idx: number; text: string }> = [];
  private readonly CHUNK_LIMIT = 200;
  allSegments: string[] = [];
  builtUpToIndex = 0; // number of segments currently rendered
  totalSegments = 0;
  // flags per-segment indicating whether the index lies inside an ST..SE transaction
  inTransaction: boolean[] = [];
  // for each segment index, store the ST start index if it's inside a transaction
  txStartIndex: number[] = [];
  // separators discovered during parsing
  private compSep = ':';
  private segSep = '~';
  private elementSep = '*';

  treeControl = new NestedTreeControl<X12Node>(node => node.children);
  dataSource = new MatTreeNestedDataSource<X12Node>();

  constructor(private valueLookup: CodeValueLookupService, private cdr: ChangeDetectorRef) {}

  getLookupDescription(segment: string, elementIndex: number | undefined, value: string | undefined): string | null {
    if (!value || !segment || elementIndex == null) return null;
    return this.valueLookup.getDescription(value.toString(), segment, elementIndex);
  }

  rowHasValue(row: X12Node[]): boolean {
    return !!row && row.some(c => (c.value || '').toString().trim().length > 0);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['x12Text']) {
      void this.buildTree();
    }
  }

  ngOnInit(): void {
    // initialize transactions list for dropdown
    this.transactions = Object.keys(TX_FRIENDLY_MAP).map(k => ({ code: k, label: TX_FRIENDLY_MAP[k] }));
    if (this.transactions.length) this.selectedTx = this.transactions[0].code;

    if (this.x12Text) void this.buildTree();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.selectedFileName = file.name;
    // First: read head and tail slices for immediate preview (non-blocking)
    try {
      const SLICE_BYTES = 64 * 1024; // 64KB head/tail
      const headBlob = file.slice(0, SLICE_BYTES);
      const tailBlob = file.slice(Math.max(0, file.size - SLICE_BYTES), file.size);
      const headReader = new FileReader();
      headReader.onload = () => {
        const headText = (headReader.result || '').toString();
        // detect separators from head snippet (fall back to defaults)
        const isaIndex = headText.indexOf('ISA');
        let localSeg = '~';
        let localElem = '*';
        if (isaIndex >= 0) {
          if (headText.length > isaIndex + 105) localSeg = headText.charAt(isaIndex + 105);
          if (headText.length > isaIndex + 3) localElem = headText.charAt(isaIndex + 3);
        }
          const parts = headText.split(localSeg).map(s => s.trim()).filter(Boolean);
          this.previewFirstSegments = parts.slice(0, 2).map((s, pidx) => ({ idx: pidx + 1, text: s + localSeg }));
        // if ISA present in head, set element/seg separators for later use
        this.segSep = localSeg;
        this.elementSep = localElem;
        try { console.log('X12 preview head ready', { headParts: this.previewFirstSegments.length }); } catch (e) {}
      };
      headReader.readAsText(headBlob);

      const tailReader = new FileReader();
      tailReader.onload = () => {
        const tailText = (tailReader.result || '').toString();
        // use existing segSep (may have been set by headReader) or fallback
        const seg = this.segSep || '~';
        const parts = tailText.split(seg).map(s => s.trim()).filter(Boolean);
        // tail slice may start mid-segment; take last two complete-looking segments
        this.previewLastSegments = parts.slice(Math.max(0, parts.length - 2)).map((s, pidx) => ({ idx: -1, text: s + seg }));
        try { console.log('X12 preview tail ready', { tailParts: this.previewLastSegments.length }); } catch (e) {}
      };
      tailReader.readAsText(tailBlob);
    } catch (e) {
      // ignore preview failures
    }

    // Finally read the full file as before to populate the complete view
    const reader = new FileReader();
    reader.onload = () => {
      this.x12Text = (reader.result || '').toString();
      try { console.log('X12 onFileSelected:', { name: file.name, size: file.size }); } catch (e) {}
      void this.buildTree();
    };
    reader.readAsText(file);
  }

  toggle() {
    this.collapsed = !this.collapsed;
  }

  get formatted(): string {
    if (!this.x12Text) return '';
    const text = this.x12Text.replace(/\r?\n/g, '');
    const segments = text.split('~').map(s => s.trim()).filter(Boolean);
    return segments.map(s => s + '~').join('\n');
  }

  // Return first two, middle (from ST), and last two raw segment lines for stacked panes
  get rawFirstLines(): Array<{ idx: number; text: string }> {
    if (this.previewFirstSegments && this.previewFirstSegments.length) return this.previewFirstSegments;
    if (!this.allSegments || this.allSegments.length === 0) return [];
    const take = Math.min(2, this.allSegments.length);
    return this.allSegments.slice(0, take).map((s, i) => ({ idx: i + 1, text: s + this.segSep }));
  }

  get rawLastLines(): Array<{ idx: number; text: string }> {
    if (this.previewLastSegments && this.previewLastSegments.length) return this.previewLastSegments;
    if (!this.allSegments || this.allSegments.length === 0) return [];
    const take = Math.min(2, this.allSegments.length);
    return this.allSegments.slice(Math.max(0, this.allSegments.length - take)).map((s, i, arr) => ({ idx: this.allSegments.length - (arr.length - i) + 1, text: s + this.segSep }));
  }

  get rawMiddleLines(): Array<{ idx: number; text: string }> {
    if (!this.allSegments || this.allSegments.length === 0) return [];
    const elementSep = this.elementSep;
    // find first ST occurrence; if none, start after the first two segments
    const stIndex = this.allSegments.findIndex(s => ((s || '').split(elementSep)[0] || '') === 'ST');
    const start = stIndex >= 0 ? stIndex : Math.min(2, this.allSegments.length);
    const end = Math.max(start, Math.max(0, this.allSegments.length - 2));
    if (end <= start) return [];
    return this.allSegments.slice(start, end).map((s, i) => ({ idx: start + i + 1, text: s + this.segSep }));
  }

  // Detect envelope tags for highlighting (ISA, GS, GE, IEA)
  isEnvelopeTag(lineOrObj: string | { idx: number; text: string }): boolean {
    if (!lineOrObj) return false;
    const line = typeof lineOrObj === 'string' ? lineOrObj : lineOrObj.text;
    const seg = this.segSep || '~';
    const tag = (line || '').split(seg)[0].trim();
    return ['ISA', 'GS', 'GE', 'IEA'].includes(tag);
  }

  // Safely get text for a raw line item (handles string or {idx,text} objects)
  getLineText(lineOrObj: string | { idx: number; text: string } | any): string {
    if (!lineOrObj) return '';
    if (typeof lineOrObj === 'string') return lineOrObj;
    if (lineOrObj && typeof lineOrObj.text === 'string') return lineOrObj.text;
    try { return JSON.stringify(lineOrObj); } catch (e) { return String(lineOrObj); }
  }

  // Safely get the displayed index for a raw line item
  getLineIdx(lineOrObj: string | { idx: number; text: string } | any): string | number {
    if (!lineOrObj) return '–';
    if (typeof lineOrObj === 'string') return '–';
    const idx = (lineOrObj && (lineOrObj.idx != null)) ? lineOrObj.idx : null;
    if (idx == null || idx <= 0) return '–';
    // only show numeric index when this segment lies inside an ST..SE transaction
    const inTx = (this.inTransaction && this.inTransaction.length >= idx) ? !!this.inTransaction[idx - 1] : false;
    if (!inTx) return '–';
    // compute relative index within transaction (ST == 1)
    const start = (this.txStartIndex && this.txStartIndex.length >= idx) ? this.txStartIndex[idx - 1] : -1;
    if (start == null || start < 0) return '–';
    const rel = idx - (start + 1) + 1; // idx and start are 1-based vs 0-based mapping
    // simpler: global idx is 1-based; start is 0-based index of ST => relative = idx - start
    const relative = idx - start;
    return relative > 0 ? relative : '–';
  }

  private async buildTree() {
    if (!this.x12Text) {
      this.dataSource.data = [];
      return;
    }

    try { console.log('X12 buildTree start', { file: this.selectedFileName || 'n/a', builtUpToIndex: this.builtUpToIndex, totalSegments: this.totalSegments }); } catch (e) {}

    const normalized = this.x12Text.replace(/\r?\n/g, '');
    // detect separators from ISA: element separator (char after 'ISA'),
    // component separator is the 104th character (1-based), and segment
    // terminator is often at position 106 in fixed ISA formatting.
    let compSep = ':';
    let segSep = '~';
    let elementSep = '*';
    const isaIndex = normalized.indexOf('ISA');
    if (isaIndex >= 0) {
      if (normalized.length > isaIndex + 103) {
        compSep = normalized.charAt(isaIndex + 103);
      }
      if (normalized.length > isaIndex + 105) {
        segSep = normalized.charAt(isaIndex + 105);
      }
      if (normalized.length > isaIndex + 3) {
        elementSep = normalized.charAt(isaIndex + 3);
      }
    }
    // persist separators for later lazy builders
    this.compSep = compSep;
    this.segSep = segSep;
    this.elementSep = elementSep;
    const rawSegments = normalized.split(segSep).map(s => s.trim()).filter(Boolean);

    // Prepare for lazy rendering: keep full segment list. Only reset the builtUpToIndex
    // when the total segment count changes (new file); preserve it across subsequent builds
    const prevTotal = this.totalSegments || 0;
    this.allSegments = rawSegments;
    this.totalSegments = rawSegments.length;
    // compute which segment indexes are within ST..SE transaction ranges
    this.inTransaction = new Array(this.totalSegments).fill(false);
    this.txStartIndex = new Array(this.totalSegments).fill(-1);
    try {
      for (let s = 0; s < this.totalSegments; s++) {
        const tag = (this.allSegments[s] || '').split(elementSep)[0] || '';
        if (tag === 'ST') {
          // find matching SE
          let seIdx: number | null = null;
          for (let j = s + 1; j < this.totalSegments; j++) {
            const ttag = (this.allSegments[j] || '').split(elementSep)[0] || '';
            if (ttag === 'SE') { seIdx = j; break; }
          }
          if (seIdx != null) {
            for (let k = s; k <= seIdx; k++) { this.inTransaction[k] = true; this.txStartIndex[k] = s; }
            s = seIdx; // skip ahead
          } else {
            // no closing SE found; mark rest as in-transaction
            for (let k = s; k < this.totalSegments; k++) { this.inTransaction[k] = true; this.txStartIndex[k] = s; }
            break;
          }
        }
      }
    } catch (e) {}
    if (prevTotal !== this.totalSegments) {
      this.builtUpToIndex = Math.min(this.CHUNK_LIMIT, this.totalSegments);
      try { console.log('X12 buildTree: initial chunk set', { CHUNK_LIMIT: this.CHUNK_LIMIT, builtUpToIndex: this.builtUpToIndex, totalSegments: this.totalSegments }); } catch (e) {}
    } else {
      // preserve existing builtUpToIndex but cap to totalSegments
      this.builtUpToIndex = Math.min(this.builtUpToIndex || this.CHUNK_LIMIT, this.totalSegments);
      try { console.log('X12 buildTree: preserved builtUpToIndex', { builtUpToIndex: this.builtUpToIndex, totalSegments: this.totalSegments }); } catch (e) {}
    }

    // Ensure we include at least ISA and GS in the initial chunk so ISA is not shown alone
    if (this.allSegments && this.allSegments.length > 1) {
      const firstTag = (this.allSegments[0] || '').split(elementSep)[0] || '';
      if (firstTag === 'ISA' && this.builtUpToIndex < 2) {
        this.builtUpToIndex = Math.min(2, this.totalSegments);
      }
    }

    // Load lookups manifest and prefixes (non-blocking)

    // Ensure important lookups are available before mapping labels
    try {
      // Load all CSV lookups (manifest-driven) so service knows available prefixes
      await this.valueLookup.loadAllCsvLookups();
    } catch (e) {}

    try {
      const prefixes = this.valueLookup.getPrefixes() || [];
      for (const pref of prefixes) {
        try {
          const m = (pref || '').toString().match(/^([A-Z]+?)(\d{2})$/i);
          if (m) {
            await this.valueLookup.loadLookupForPrefix(m[1], m[2]);
          } else {
            await this.valueLookup.loadLookupForPrefix(pref);
          }
        } catch (e) {
          // ignore per-file errors
        }
      }
    } catch (e) {}

    const segmentToNode = (seg: string): X12Node => {
      const elements = seg.split(elementSep);
      const tag = elements[0] || 'SEG';
      // ensure there are labels for all element positions in this segment
      ensureElementLabels(tag, Math.max(0, elements.length - 1));
      const children: X12Node[] = elements.slice(1).map((el, idx) => {
        const comps = (el || '').split(compSep).map(c => c.trim()).filter(Boolean);
        const label = elementLabel(tag, idx);
        if (comps.length > 1) {
          return {
            name: label,
            value: comps.join(compSep),
            index: idx + 1,
            children: comps.map((c, ci) => ({ name: `C${ci + 1}`, value: c }))
          } as X12Node;
        }
        return { name: label, value: el, index: idx + 1 } as X12Node;
      });

      // For envelope segments (ISA, GS) wrap element fields in an 'Elements' child so
      // we can keep element-table rendering and also attach nested segment children
      let node: X12Node = { name: tag, label: SEGMENT_LABELS[tag] || '', value: elements.slice(1).join(elementSep) } as X12Node;
      if (tag === 'ISA' || tag === 'GS') {
        node.children = [{ name: 'Elements', children } as X12Node];
      } else {
        node.children = children;
      }
      // If this is an NM1 segment, try to augment with a description from NM1Values.csv
      if (tag === 'NM1' && children && children.length) {
        const first = (children[0].value || '').toString();
        if (first) {
          const desc = this.valueLookup.getDescription(first, 'NM1', 1);
          if (desc) node.label = desc;
        }
      }
      // If this is a DTP segment, try to augment with a description from DTPValues.csv
      if (tag === 'DTP' && children && children.length) {
        const first = (children[0].value || '').toString();
        if (first) {
          const desc = this.valueLookup.getDescription(first, 'DTP', 1);
          if (desc) node.label = desc;
        }
      }
      return node;
    };



    const nodes: X12Node[] = [];
    const txIds: string[] = [];
    let i = 0;
    // iterate only up to builtUpToIndex; ensure transactions (ST..SE) are only included when complete
    const limit = this.builtUpToIndex;

    // Maintain hierarchical parents so ISA -> GS -> TRANSACTION nesting is preserved
    let currentISA: X12Node | null = null;
    let currentGS: X12Node | null = null;

    while (i < limit) {
      const seg = this.allSegments[i];
      const tag = seg.split(elementSep)[0] || '';

      try { console.log('X12 buildTree: loop', { i, limit, tag }); } catch (e) {}

      if (tag === 'ISA') {
        const isaNode = segmentToNode(seg);
        nodes.push(isaNode);
        try { console.log('X12 buildTree: pushed ISA', { i, nodesLength: nodes.length }); } catch (e) {}
        currentISA = isaNode;
        currentGS = null;
        i++;
        continue;
      }

      if (tag === 'GS') {
        const gsNode = segmentToNode(seg);
        if (currentISA) {
          currentISA.children = currentISA.children || [];
          currentISA.children.push(gsNode);
          try { console.log('X12 buildTree: attached GS to ISA', { i, isaChildren: currentISA.children.length }); } catch (e) {}
        } else {
          nodes.push(gsNode);
          try { console.log('X12 buildTree: pushed GS top-level', { i, nodesLength: nodes.length }); } catch (e) {}
        }
        currentGS = gsNode;
        i++;
        continue;
      }

      if (tag === 'ST') {
        const stElements = seg.split(elementSep);
        const stCode = (stElements[1] || '').toString();
        if (stCode) txIds.push(stCode);
        const friendly = txFriendlyName(stCode) || '';
        const txLabel = friendly ? `TRANSACTION ${stCode} - ${friendly}` : `TRANSACTION ${stElements.slice(1, 3).join(' ')}`.trim();

        // find SE index within available segments
        let seIndex: number | null = null;
        for (let j = i + 1; j < this.allSegments.length && j < this.totalSegments; j++) {
          const t = this.allSegments[j];
          const ttag = t.split(elementSep)[0] || '';
          if (ttag === 'SE') { seIndex = j; break; }
        }
        try { console.log('X12 buildTree: found ST at', i, { seIndex }); } catch (e) {}

        const txNode: X12Node = { name: txLabel, children: [], _segmentStart: i, _segmentEnd: seIndex != null ? seIndex : null, _loaded: false, _isTransaction: true } as X12Node;
        if (currentGS) {
          currentGS.children = currentGS.children || [];
          currentGS.children.push(txNode);
          try { console.log('X12 buildTree: attached TRANSACTION to GS', { i, seIndex, gsChildren: currentGS.children.length }); } catch (e) {}
        } else if (currentISA) {
          currentISA.children = currentISA.children || [];
          currentISA.children.push(txNode);
          try { console.log('X12 buildTree: attached TRANSACTION to ISA', { i, seIndex, isaChildren: currentISA.children.length }); } catch (e) {}
        } else {
          nodes.push(txNode);
          try { console.log('X12 buildTree: pushed TRANSACTION top-level', { i, seIndex, nodesLength: nodes.length }); } catch (e) {}
        }

        // If we found an SE index, either eagerly build the full transaction (if within
        // the current chunk) or build a partial set of children up to the current
        // built limit so the user can inspect available content without loading all
        // segments. If no SE found, stop processing for this chunk.
        if (seIndex != null) {
          if (seIndex < limit) {
            try {
              const children = await this.buildTransactionChildren(i, seIndex);
              txNode.children = children;
              txNode._loaded = true;
              try { console.log('X12 buildTree: eagerly built transaction children', { i, seIndex, childCount: children.length }); } catch (e) {}
            } catch (e) {}
            // advance i past SE
            i = seIndex + 1;
          } else {
            // SE exists but lies beyond the current chunk; build partial children up
            // to (limit - 1) so the transaction node shows whatever segments are
            // already available in this chunk.
            try {
              const endForPartial = Math.max(i, limit - 1);
              const children = await this.buildTransactionChildren(i, endForPartial);
              txNode.children = children;
              // not fully loaded; mark as not loaded so further toggles or chunk
              // increases can finalize the transaction children later
              txNode._loaded = false;
              try { console.log('X12 buildTree: partially built transaction children', { i, seIndex, endForPartial, childCount: children.length }); } catch (e) {}
            } catch (e) {}
            // stop processing further segments in this chunk
            i = limit;
          }
        } else {
          // No SE found in the source — stop processing for now
          i = limit;
        }
        continue;
      }

      // Other segments: attach under current GS if present, else under ISA, else top-level
      const otherNode = segmentToNode(seg);
      if (currentGS) {
        currentGS.children = currentGS.children || [];
        currentGS.children.push(otherNode);
        try { console.log('X12 buildTree: attached OTHER to GS', { i, tag, gsChildren: currentGS.children.length }); } catch (e) {}
      } else if (currentISA) {
        currentISA.children = currentISA.children || [];
        currentISA.children.push(otherNode);
        try { console.log('X12 buildTree: attached OTHER to ISA', { i, tag, isaChildren: currentISA.children.length }); } catch (e) {}
      } else {
        nodes.push(otherNode);
        try { console.log('X12 buildTree: pushed OTHER top-level', { i, tag, nodesLength: nodes.length }); } catch (e) {}
      }
      i++;
    }
    try { console.log('X12 buildTree: loop complete', { nodesCount: nodes.length, processedUpTo: i, limit }); } catch (e) {}

    // debug: log constructed top-level nodes for troubleshooting
    const flatten = (arr: X12Node[]): X12Node[] => {
      const out: X12Node[] = [];
      const walk = (n: X12Node) => {
        out.push(n);
        if (n.children && n.children.length) n.children.forEach(child => walk(child));
      };
      arr.forEach(a => walk(a));
      return out;
    };

    try {
      console.log('X12 buildTree: top-level nodes count=', nodes.length, 'names=', nodes.map(n => n.name));
      // log per-node child counts and GS children details for debugging
      nodes.forEach((n, idx) => {
        try {
          console.log(`X12 buildTree: node[${idx}]`, { name: n.name, childCount: n.children ? n.children.length : 0 });
          if ((n.name || '').toString() === 'ISA' && n.children) {
            n.children.forEach((c, ci) => {
              try { console.log(`X12 buildTree: ISA.child[${ci}]`, { name: c.name, grandchildren: c.children ? c.children.length : 0, grandchildNames: c.children ? c.children.map(g => g.name) : [] }); } catch (e) {}
            });
          }
        } catch (e) {}
      });
      // log first-level children for first top node (if any)
      if (nodes.length > 0) {
        const first = nodes[0];
        const ccount = first.children ? first.children.length : 0;
        console.log('X12 buildTree: first top node children count=', ccount);
        if (ccount > 0) {
          console.log('X12 buildTree: first top node child names=', first.children!.map(ch => ch.name));
        }
      }
      // log a few raw segments to confirm parsing
      try {
        console.log('X12 buildTree: sample segments[0..9]=', this.allSegments.slice(0, 10).map(s => (s || '').split(elementSep)[0]));
        try { console.log('X12 buildTree: flattened sample names=', flatten(nodes).slice(0,50).map(n => n.name)); } catch (e) {}
      } catch (e) {}
    } catch (e) {}
    this.dataSource.data = nodes;
    try {
      // flatten the nested nodes so NestedTreeControl/DataSource know about all nodes
      const flatten = (arr: X12Node[]): X12Node[] => {
        const out: X12Node[] = [];
        const walk = (n: X12Node) => {
          out.push(n);
          if (n.children && n.children.length) n.children.forEach(child => walk(child));
        };
        arr.forEach(a => walk(a));
        return out;
      };
      const flat = flatten(nodes);
      this.treeControl.dataNodes = flat as any;
      // ensure Angular picks up the new tree data and that the tree control registers nodes
      this.cdr.detectChanges();
      console.log('X12 buildTree: treeControl.dataNodes count=', this.treeControl.dataNodes ? this.treeControl.dataNodes.length : 0, 'flattenedCount=', flat.length);
    } catch (e) {}
    // append ST01 codes and friendly names to the heading (show all found transaction set IDs)
    const unique = Array.from(new Set(txIds));
    const headingParts = unique.map(c => {
      const f = txFriendlyName(c);
      return f ? `${c}:${f}` : c;
    });
    this.messageHeading = this.title + (headingParts.length ? ` [${headingParts.join(', ')}]` : '');

    // Collapse ISA/GS by default; expand transaction nodes and their ST child segments
    this.dataSource.data.forEach(n => {
      // transaction group nodes were created with names like 'TRANSACTION ...'
      if (n.name && n.name.toString().startsWith('TRANSACTION')) {
        this.treeControl.expand(n);
        if (n.children) {
          const stChild = n.children.find(c => (c.name || '').toString().startsWith('ST'));
          if (stChild) this.treeControl.expand(stChild);
        }
      } else if ((n.name || '').toString().startsWith('ST')) {
        // standalone ST at top-level
        this.treeControl.expand(n);
      }
      // leave ISA and GS collapsed
    });

    // Also expand ISA and GS nodes so their immediate children are visible by default
    const expandISAandGS = (node: X12Node) => {
      if (!node) return;
      const nm = (node.name || '').toString();
      if (nm === 'ISA' || nm === 'GS') {
        this.treeControl.expand(node);
      }
      if (node.children && node.children.length) node.children.forEach(expandISAandGS);
    };
    this.dataSource.data.forEach(expandISAandGS);
    try { console.log('X12 buildTree: expanded ISA/GS'); } catch (e) {}
    try { console.log('X12 buildTree: post-expand treeControl.dataNodes count=', this.treeControl.dataNodes ? this.treeControl.dataNodes.length : 0); } catch (e) {}

    // Expand all HL nodes so loop hierarchies are visible initially
    const expandHLNodes = (node: X12Node) => {
      if (!node) return;
      if ((node.name || '').toString() === 'HL') {
        this.treeControl.expand(node);
      }
      if (node.children && node.children.length) {
        node.children.forEach(child => expandHLNodes(child));
      }
    };
    this.dataSource.data.forEach(root => expandHLNodes(root));
  }

  // Load the next chunk of segments into the tree
  loadMoreSegments(count = this.CHUNK_LIMIT) {
    if (!this.allSegments || this.allSegments.length === 0) return;
    const next = Math.min(this.totalSegments, this.builtUpToIndex + count);
    if (next <= this.builtUpToIndex) return;
    const prev = this.builtUpToIndex;
    this.builtUpToIndex = next;
    try { console.log('X12 loadMoreSegments', { prevBuilt: prev, newBuilt: this.builtUpToIndex }); } catch (e) {}
    void this.buildTree();
  }

  // Handle node expand/toggle events from the template
  async onNodeToggle(node: X12Node, event?: any) {
    if (!node) return;
    try { console.log('X12 onNodeToggle', { nodeName: node.name, isTransaction: !!node._isTransaction, loaded: !!node._loaded }); } catch (e) {}
    // If this node represents a transaction placeholder, build its children lazily
    if (node._isTransaction && !node._loaded) {
      const start = node._segmentStart != null ? node._segmentStart : 0;
      // if end is known and within builtUpToIndex, use it; otherwise use the currently built limit
      const end = (node._segmentEnd != null && node._segmentEnd < this.builtUpToIndex) ? node._segmentEnd : (this.builtUpToIndex - 1);
      try { console.log('X12 onNodeToggle: building transaction children', { start, end, builtUpToIndex: this.builtUpToIndex }); } catch (e) {}
      const children = await this.buildTransactionChildren(start, end);
      // attach children and mark loaded; refresh data source to trigger UI update
      node.children = children;
      node._loaded = true;
      // refresh tree datasource reference and ensure NestedTreeControl knows about new nodes
      this.dataSource.data = this.dataSource.data;
      try {
        const flatten = (arr: X12Node[]): X12Node[] => {
          const out: X12Node[] = [];
          const walk = (n: X12Node) => {
            out.push(n);
            if (n.children && n.children.length) n.children.forEach(child => walk(child));
          };
          arr.forEach(a => walk(a));
          return out;
        };
        const flat = flatten(this.dataSource.data);
        this.treeControl.dataNodes = flat as any;
        this.cdr.detectChanges();
      } catch (e) {}
      // expand the node so user sees children
      this.treeControl.expand(node);
    }
  }

  // Build transaction children for a given segment range (async because lookups may be loaded)
  private async buildTransactionChildren(startIdx: number, endIdx: number): Promise<X12Node[]> {
    const elementSep = this.elementSep;
    const compSep = this.compSep;
    const txChildren: X12Node[] = [];
    const segmentToNodeLocal = (seg: string): X12Node => {
      const elements = seg.split(elementSep);
      const tag = elements[0] || 'SEG';
      ensureElementLabels(tag, Math.max(0, elements.length - 1));
      const children: X12Node[] = elements.slice(1).map((el, idx) => {
        const comps = (el || '').split(compSep).map(c => c.trim()).filter(Boolean);
        const label = elementLabel(tag, idx);
        if (comps.length > 1) {
          return {
            name: label,
            value: comps.join(compSep),
            index: idx + 1,
            children: comps.map((c, ci) => ({ name: `C${ci + 1}`, value: c }))
          } as X12Node;
        }
        return { name: label, value: el, index: idx + 1 } as X12Node;
      });
      // For ISA/GS in transaction lazy builder, wrap element fields similarly
      let node: X12Node = { name: tag, label: SEGMENT_LABELS[tag] || '', value: elements.slice(1).join(elementSep) } as X12Node;
      if (tag === 'ISA' || tag === 'GS') {
        node.children = [{ name: 'Elements', children } as X12Node];
      } else {
        node.children = children;
      }
      if (tag === 'NM1' && children && children.length) {
        const first = (children[0].value || '').toString();
        if (first) {
          const desc = this.valueLookup.getDescription(first, 'NM1', 1);
          if (desc) node.label = desc;
        }
      }
      if (tag === 'DTP' && children && children.length) {
        const first = (children[0].value || '').toString();
        if (first) {
          const desc = this.valueLookup.getDescription(first, 'DTP', 1);
          if (desc) node.label = desc;
        }
      }
      return node;
    };

    for (let k = startIdx; k <= endIdx; k++) {
      const s = this.allSegments[k];
      if (!s) continue;
      txChildren.push(segmentToNodeLocal(s));
    }

    // For HL segments: flatten components into single values for display
    txChildren.forEach(n => {
      if ((n.name || '').toString() === 'HL' && n.children) {
        n.children = n.children.map(ch => {
          if (ch.children && ch.children.length) {
            const combined = ch.children.map(cc => cc.value || '').join(compSep);
            return { name: ch.name, value: combined } as X12Node;
          }
          return ch;
        });
      }
    });

    const nestByHL = (children: X12Node[]): X12Node[] => {
      const roots: X12Node[] = [];
      const hlMap: Record<string, X12Node> = {};
      let hlStack: X12Node[] = [];
      const getHLIds = (node: X12Node) => {
        let id = '';
        let parent = '';
        if (node.children && node.children.length > 0) {
          id = (node.children[0].value || '').toString();
          parent = node.children[1] ? (node.children[1].value || '').toString() : '';
        } else if (node.value) {
          const parts = node.value.split(elementSep);
          id = parts[0] || '';
          parent = parts[1] || '';
        }
        return { id, parent };
      };

      children.forEach((child) => {
        const childTag = (child.name || '').toString();
        if (childTag === 'SE') {
          roots.push(child);
          hlStack = [];
          return;
        }
        if (childTag === 'HL') {
          const elemNodes = child.children ? child.children.slice() : [];
          (child as any)._elements = elemNodes;
          child.children = [];
          const { id, parent } = getHLIds({ name: child.name, children: elemNodes, value: child.value } as X12Node);
          if (id) hlMap[id] = child;
          if (parent && hlMap[parent]) {
            hlMap[parent].children = hlMap[parent].children || [];
            hlMap[parent].children.push(child);
          } else {
            roots.push(child);
          }
          const chain: X12Node[] = [];
          let p = parent;
          while (p) {
            const pn = hlMap[p];
            if (!pn) break;
            chain.unshift(pn);
            const gp = (pn as any)._elements && (pn as any)._elements[1] ? ((pn as any)._elements[1].value || '').toString() : '';
            p = gp;
          }
          hlStack = chain.concat([child]);
        } else {
          if (hlStack.length > 0) {
            const parentHL = hlStack[hlStack.length - 1];
            parentHL.children = parentHL.children || [];
            parentHL.children.push(child);
          } else {
            roots.push(child);
          }
        }
      });

      return roots;
    };

    let nested = nestByHL(txChildren);

    try {
      await this.valueLookup.loadLookupForPrefix('HL', 3);
    } catch (e) {}

    const mapHLLabels = (arr: X12Node[]) => {
      arr.forEach(n => {
        if ((n.name || '').toString() === 'HL') {
          const elems: X12Node[] = (n as any)._elements || [];
          const hl3 = elems[2] ? (elems[2].value || '').toString() : '';
          let label = '';
          if (hl3 === '20') label = '2000A';
          else if (hl3 === '21') label = '2000B';
          else if (hl3 === '22') label = '2000C';
          else if (hl3 === '23') label = '2000D';
          else label = 'TBD';

          if (label) {
            const thirdField = elems[2] ? (elems[2].value || '').toString() : '';
            const desc3 = thirdField ? this.valueLookup.getDescription(thirdField, 'HL', 3) : null;
            const labelText = thirdField ? `Loop ${label} (${thirdField})` : `Loop ${label}`;
            n.label = desc3 ? `${labelText}  — ${desc3}` : labelText;
          } else if (elems.length) {
            n.children = elems.concat(n.children || []);
          }
        }
        if (n.children && n.children.length) mapHLLabels(n.children);
      });
    };

    mapHLLabels(nested);
    return nested;
  }

  displaySelectedTransaction() {
    if (!this.selectedTx) return;
    const key = `SAMPLE_${this.selectedTx}_TEXT`;
    this.x12Text = (SAMPLE_DATA as any)[key] || '';
    this.buildTree();
  }

  // Expand all nodes in the tree
  expandAll() {
    const expand = (n: X12Node) => {
      this.treeControl.expand(n);
      if (n.children && n.children.length) n.children.forEach(expand);
    };
    this.dataSource.data.forEach(expand);
  }

  // Collapse all nodes in the tree
  collapseAll() {
    const collapse = (n: X12Node) => {
      this.treeControl.collapse(n);
      if (n.children && n.children.length) n.children.forEach(collapse);
    };
    this.dataSource.data.forEach(collapse);
  }

  // Expand only transaction nodes (ST ... SE) and their descendants
  expandTransactions() {
    const expand = (n: X12Node) => {
      this.treeControl.expand(n);
      if (n.children && n.children.length) n.children.forEach(expand);
    };
    this.dataSource.data.forEach(n => {
      const name = (n.name || '').toString();
      if (name.startsWith('TRANSACTION') || name.startsWith('ST')) expand(n);
    });
  }

  // Collapse only transaction nodes (ST ... SE) and their descendants
  collapseTransactions() {
    const collapse = (n: X12Node) => {
      this.treeControl.collapse(n);
      if (n.children && n.children.length) n.children.forEach(collapse);
    };
    this.dataSource.data.forEach(n => {
      const name = (n.name || '').toString();
      if (name.startsWith('TRANSACTION') || name.startsWith('ST')) collapse(n);
    });
  }

  // chunk children into rows for compact display (size default 5)
  chunkChildren(node: X12Node, size = 5): X12Node[][] {
    if (!node.children) return [];
    const rows: X12Node[][] = [];
    for (let i = 0; i < node.children.length; i += size) {
      rows.push(node.children.slice(i, i + size));
    }
    return rows;
  }

  // chunk only children that have non-empty values (skip empty fields)
  chunkNonEmptyChildren(node: X12Node, size = 5): X12Node[][] {
    if (!node.children) return [];
    const filtered = node.children.filter(c => {
      const v = (c.value || '').toString();
      return v != null && v.toString().trim().length > 0;
    });
    const rows: X12Node[][] = [];
    for (let i = 0; i < filtered.length; i += size) {
      rows.push(filtered.slice(i, i + size));
    }
    return rows;
  }

  // return true when all children of a node are leaves (no grandchildren)
  isLeafArray(node: X12Node): boolean {
    // treat as a leaf-array when immediate children represent element fields (have an `index`),
    // even if those element nodes have component children — the table will use `child.value`.
    return !!node.children && node.children.length > 0 && node.children.every(c => (c.index != null));
  }

  hasChild = (_: number, node: X12Node) => !!node.children && node.children.length > 0;
}
