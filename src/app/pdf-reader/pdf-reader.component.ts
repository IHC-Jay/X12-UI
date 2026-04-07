import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { PdfReaderService } from './pdf-reader.service';

@Component({
	selector: 'app-pdf-reader',
	templateUrl: './pdf-reader.component.html',
	styleUrls: ['./pdf-reader.component.css'],
	standalone: false
})
export class PdfReaderComponent implements OnInit, AfterViewInit {
	// ...existing code...
	// Refactor large methods into private helpers for clarity and maintainability
	assetGuideFiles: string[] = [];
	selectedAssetGuideFile: string | null = null;
	fileSrc: ArrayBuffer | null = null;
	private autoLoadAfterInit = false;
	showProgress = false;
	private progressTimer: any = null;
	extractedText = '';
	isLoading = false;
	pageTexts: string[] = [];
	searchQuery = '';
	matches: number[] = [];
	currentMatchIndex = -1;
	@ViewChild('pdfContainer', { static: false }) pdfContainer!: ElementRef<HTMLDivElement>;
	selectedFileName: string | null = null;
	selectedFileSize: string | null = null;
	selectedFilePages: number | null = null;
	startPage = 1;
	endPage = 1;
	errorMessage: string | null = null;
	currentPage = 1;
	scale = 1.5;
	readonly minScale = 0.2;
	readonly maxScale = 4.0;

	constructor(private pdfService: PdfReaderService) {}

	private clampPages() {
		if (this.selectedFilePages === null) return;
		if (this.startPage < 1) this.startPage = 1;
		if (this.startPage > this.selectedFilePages) this.startPage = this.selectedFilePages;
		if (this.endPage < this.startPage) this.endPage = this.startPage;
		if (this.endPage > this.selectedFilePages) this.endPage = this.selectedFilePages;
		if (this.currentPage < this.startPage) this.currentPage = this.startPage;
		if (this.currentPage > this.endPage) this.currentPage = this.endPage;
	}

	onStartInputChange(val: number) {
		this.startPage = Number(val) || 1;
		this.clampPages();
	}

	onEndInputChange(val: number) {
		this.endPage = Number(val) || this.startPage;
		this.clampPages();
	}

	incStart() { this.startPage = Math.min(this.startPage + 1, this.selectedFilePages || this.startPage); this.clampPages(); }
	decStart() { this.startPage = Math.max(1, this.startPage - 1); this.clampPages(); }
	incEnd() { this.endPage = Math.min((this.endPage || 1) + 1, this.selectedFilePages || this.endPage); this.clampPages(); }
	decEnd() { this.endPage = Math.max(this.startPage, (this.endPage || this.startPage) - 1); this.clampPages(); }
	setToFirst() { this.startPage = 1; this.clampPages(); }
	setToLast() { if (this.selectedFilePages) { this.endPage = this.selectedFilePages; this.clampPages(); } }

	async prevPage() {
		if (this.currentPage > 1) {
			this.currentPage--;
			this.startPage = this.currentPage;
			this.endPage = this.currentPage;
			await this.renderToCanvas();
		}
	}

	async nextPage() {
		if (this.selectedFilePages && this.currentPage < this.selectedFilePages) {
			this.currentPage++;
			this.startPage = this.currentPage;
			this.endPage = this.currentPage;
			await this.renderToCanvas();
		}
	}

	async goToPage(n: number) {
		if (!this.selectedFilePages) return;
		const p = Math.max(1, Math.min(this.selectedFilePages, Math.floor(n || 1)));
		this.currentPage = p;
		this.startPage = this.currentPage;
		this.endPage = this.currentPage;
		await this.renderToCanvas();
	}

	async ngOnInit() {
		await this.loadAssetGuideManifest();
		if (this.selectedAssetGuideFile) this.autoLoadAfterInit = true;
	}

	ngAfterViewInit(): void {
		if (this.autoLoadAfterInit && this.selectedAssetGuideFile) {
			void this.loadAssetPdf('X12-Guides/' + this.selectedAssetGuideFile);
			this.autoLoadAfterInit = false;
		}
	}

	private startProgressTimer() {
		this.clearProgressTimer();
		this.progressTimer = setTimeout(() => { this.showProgress = true; }, 2000);
	}

	private clearProgressTimer() {
		if (this.progressTimer) { clearTimeout(this.progressTimer); this.progressTimer = null; }
		this.showProgress = false;
	}

	onAssetSelected() {
		if (this.selectedAssetGuideFile) {
			void this.loadAssetPdf('X12-Guides/' + this.selectedAssetGuideFile);
		}
	}

	async loadAssetGuideManifest() {
		const candidates = [
			new URL('assets/X12-Guides/manifest.json', document.baseURI).toString(),
			new URL('assets/X12-Guides/manifest.json', document.baseURI).toString()
		];
		for (const url of candidates) {
			try {
				const resp = await fetch(url);
				if (!resp.ok) continue;
				const list = await resp.json();
				if (Array.isArray(list) && list.length) {
					this.assetGuideFiles = list.map((s: any) => s.toString());
					this.selectedAssetGuideFile = this.assetGuideFiles[0];
					console.debug('Loaded X12 guides manifest from', url);
					return;
				}
			} catch (err) {
				console.debug('Failed to load manifest at', url, err);
			}
		}
	}

	onFileSelected(event: Event) {
		const input = event.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;
		const file = input.files[0];
		this.errorMessage = null;
		this.selectedFileName = file.name;
		this.selectedFileSize = this.formatBytes(file.size);
		const reader = new FileReader();
		reader.onload = async () => {
			this.fileSrc = reader.result as ArrayBuffer;
			this.extractedText = '';
			try {
				this.selectedFilePages = await this.pdfService.getNumPages(this.fileSrc);
				this.startPage = 1;
				this.endPage = this.selectedFilePages;
				this.currentPage = 1;
			} catch (e) {
				console.warn('Could not read page count', e);
				this.selectedFilePages = null;
			}
			this.buildPageTextCache();
			try {
				await new Promise((res) => setTimeout(res, 0));
				await this.renderToCanvas();
			} catch (err) {
				console.error('Error rendering PDF to canvas', err);
				this.errorMessage = err?.message || String(err);
			}
		};
		reader.readAsArrayBuffer(file);
	}

	private updateRangeFromCurrent() {
		this.startPage = Math.max(1, Math.floor(this.currentPage || 1));
		this.endPage = this.startPage;
		this.clampPages();
	}

	async extractText() {
		if (!this.fileSrc) return;
		this.startPage = this.currentPage;
		this.endPage = Math.min(this.currentPage + 1, this.selectedFilePages || this.currentPage);
		this.isLoading = true;
		this.startProgressTimer();
		try {
			this.errorMessage = null;
			this.extractedText = await this.pdfService.extractTextRange(this.fileSrc, this.startPage, this.endPage);
			if (!this.extractedText || this.extractedText.trim() === '') {
				this.extractedText = 'No selectable text found in the PDF (it may be a scanned image).';
			}
		} catch (err) {
			console.error('Error extracting text', err);
			this.errorMessage = err?.message || String(err);
		} finally {
			this.isLoading = false;
			this.clearProgressTimer();
		}
	}

	async renderToCanvas() {
		if (!this.fileSrc || !this.pdfContainer) return;
		this.isLoading = true;
		try {
			this.errorMessage = null;
			this.startProgressTimer();
			try { this.pdfContainer.nativeElement.innerHTML = ''; } catch (e) {}
				// ensure we have a page count available
				let numPages = this.selectedFilePages ?? null;
				if (!numPages) {
					try { numPages = await this.pdfService.getNumPages(this.fileSrc as ArrayBuffer); } catch (_) { numPages = 1; }
				}
				const pages = Math.min(this.endPage || numPages, numPages);
				const from = Math.max(1, this.startPage || 1);
				const to = Math.min(pages, numPages);
				const container = this.pdfContainer.nativeElement as HTMLElement;
				container.innerHTML = '';
				const canvases: HTMLCanvasElement[] = [];
				for (let p = from; p <= to; p++) {
					const canvas = document.createElement('canvas');
					canvas.classList.add('pdf-canvas');
					container.appendChild(canvas);
					canvases.push(canvas);
				}
				// Render all pages with a single PDF load (much faster for multi-page PDFs)
				await this.pdfService.renderPagesToCanvases(this.fileSrc, canvases, from, to, this.scale);
		} finally {
			this.isLoading = false;
			this.clearProgressTimer();
		}
	}

	async buildPageTextCache() {
		if (!this.fileSrc) return;
		try {
			this.startProgressTimer();
			this.pageTexts = await this.pdfService.extractTextPerPage(this.fileSrc);
		} catch (err) {
			console.warn('Could not build page text cache', err);
			this.pageTexts = [];
		}
		finally {
			this.clearProgressTimer();
		}
	}

	runSearch() {
		this.matches = [];
		this.currentMatchIndex = -1;
		const q = (this.searchQuery || '').trim();
		if (!q || !this.pageTexts || this.pageTexts.length === 0) return;
		const lower = q.toLowerCase();
		for (let i = 0; i < this.pageTexts.length; i++) {
			const t = this.pageTexts[i] || '';
			if (t.toLowerCase().includes(lower)) this.matches.push(i + 1);
		}
		if (this.matches.length > 0) {
			this.currentMatchIndex = 0;
			this.goToPage(this.matches[0]);
		}
	}

	nextMatch() {
		if (!this.matches || this.matches.length === 0) return;
		this.currentMatchIndex = (this.currentMatchIndex + 1) % this.matches.length;
		this.goToPage(this.matches[this.currentMatchIndex]);
	}

	prevMatch() {
		if (!this.matches || this.matches.length === 0) return;
		this.currentMatchIndex = (this.currentMatchIndex - 1 + this.matches.length) % this.matches.length;
		this.goToPage(this.matches[this.currentMatchIndex]);
	}

	clearSearch() {
		this.searchQuery = '';
		this.matches = [];
		this.currentMatchIndex = -1;
	}

	async zoomIn() {
		this.scale = Math.min(this.maxScale, +(this.scale + 0.1).toFixed(2));
		await this.renderToCanvas();
	}

	async zoomOut() {
		this.scale = Math.max(this.minScale, +(this.scale - 0.1).toFixed(2));
		await this.renderToCanvas();
	}

	async setZoom(v: number) {
		if (!v || isNaN(v)) return;
		this.scale = Math.max(this.minScale, Math.min(this.maxScale, v));
		await this.renderToCanvas();
	}

	async loadAssetPdf(assetFileName: string) {
		this.isLoading = true;
		this.startProgressTimer();
		try {
			this.errorMessage = null;
			const encodedAssetPath = assetFileName
				.split('/')
				.map((segment) => encodeURIComponent(segment))
				.join('/');
			const url = new URL(`assets/${encodedAssetPath}`, document.baseURI).toString();
			const resp = await fetch(url);
			if (!resp.ok) throw new Error('Failed to fetch asset: ' + url);
			const buf = await resp.arrayBuffer();
			this.fileSrc = buf;
			this.extractedText = '';
			this.selectedFileName = assetFileName;
			const len = resp.headers.get('content-length');
			this.selectedFileSize = len ? this.formatBytes(Number(len)) : null;
			const waitForContainer = async () => {
				for (let i = 0; i < 20; i++) {
					if (this.pdfContainer) return;
					// wait 50ms and try again
					// eslint-disable-next-line no-await-in-loop
					await new Promise(r => setTimeout(r, 50));
				}
			};
			await waitForContainer();
			try {
				this.selectedFilePages = await this.pdfService.getNumPages(this.fileSrc);
				this.startPage = 1;
				this.endPage = this.selectedFilePages;
				this.currentPage = 1;
			} catch (e) {
				console.warn('Could not read page count', e);
				this.selectedFilePages = null;
			}
			this.buildPageTextCache();
			await this.renderToCanvas();
		} finally {
			this.isLoading = false;
			this.clearProgressTimer();
		}
	}

	private formatBytes(bytes: number, decimals = 2): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const dm = decimals < 0 ? 0 : decimals;
		const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
	}
}

