import { Component, OnInit } from '@angular/core';
import { CodeValueLookupService } from './codeValue-lookup.service';

@Component({
  selector: 'app-code-value-lookup',
  templateUrl: './codeValue-lookup.component.html',
  styleUrls: ['./codeValue-lookup.component.css'],
  standalone: false
})
export class CodeValueLookupComponent implements OnInit {
  hl3rows: Array<{ hl3lookupvalues: [string, string] }> = [];
  prefix = 'HL3';
  error: string | null = null;

  constructor(private lookupSvc: CodeValueLookupService) {}

  ngOnInit(): void {
    // Attempt to load CSV from assets/HL3Values.csv
    this.loadFromAssets();
  }

  private async loadFromAssets() {
    try {
      const ok = await this.lookupSvc.loadLookupForPrefix(this.prefix);
      if (ok) {
        const rows = this.lookupSvc.getRows();
        this.hl3rows = rows.map(r => ({ hl3lookupvalues: [r.id, r.value] }));
        return;
      }
      // fallback: try HL3Values.csv directly
      const resp = await fetch('/assets/HL3Values.csv');
      if (!resp.ok) return;
      const txt = await resp.text();
      this.parseCsv(txt);
    } catch (e) {
      // ignore — asset may not exist in dev workspace
      return;
    }
  }

  async loadByPrefix() {
    try {
      const ok = await this.lookupSvc.loadLookupForPrefix(this.prefix);
      if (ok) {
        const rows = this.lookupSvc.getRows();
        this.hl3rows = rows.map(r => ({ hl3lookupvalues: [r.id, r.value] }));
      } else {
        this.error = `No CSV found for prefix ${this.prefix}`;
      }
    } catch (e) {
      this.error = String(e);
    }
  }

  parseCsv(text: string) {
    this.hl3rows = [];
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length>0);
    // If the first line looks like a header (contains 'ID(' or 'Name('), skip it
    let startIndex = 0;
    if (lines.length > 0) {
      const first = lines[0].toLowerCase();
      if (first.includes('id(') || first.includes('name(') || first.includes('id,string') || first.startsWith('id,')) {
        startIndex = 1;
      }
    }
    for (let idx = startIndex; idx < lines.length; idx++) {
      const line = lines[idx];
      // simple CSV parse: split on comma, remove surrounding quotes and whitespace
      const parts = line.split(',').map(p => p.replace(/^\s*"|"\s*$|^\s*'|'\s*$/g, '').trim());
      const a = parts[0] || '';
      const b = parts[1] || '';
      this.hl3rows.push({ hl3lookupvalues: [a, b] });
    }
  }

  onFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const f = input.files[0];
    const r = new FileReader();
    r.onload = () => {
      const txt = String(r.result || '');
      this.parseCsv(txt);
    };
    r.onerror = () => { this.error = 'Failed to read file'; };
    r.readAsText(f);
  }
}
