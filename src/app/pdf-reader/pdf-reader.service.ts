import { Injectable } from '@angular/core';

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

@Injectable({ providedIn: 'root' })
export class PdfReaderService {
  constructor() {
    try {
      // Use a static, locally-served worker URL from the application's assets
      // so pdf.js loads the worker by URL instead of performing dynamic imports.
      const localWorker = './assets/pdf.worker.mjs';
      if ((pdfjsLib as any).GlobalWorkerOptions) {
        (pdfjsLib as any).GlobalWorkerOptions.workerSrc = localWorker;
      } else {
        Object.defineProperty(pdfjsLib, 'GlobalWorkerOptions', {
          value: { workerSrc: localWorker },
          configurable: true,
          enumerable: true,
        } as PropertyDescriptor);
      }
    } catch (e) {
      console.warn('Could not set pdfjs GlobalWorkerOptions.workerSrc', e);
    }
  }

  async extractText(arrayBuffer: ArrayBuffer): Promise<string> {
    return this.extractTextRange(arrayBuffer, 1, undefined);
  }

  async getNumPages(arrayBuffer: ArrayBuffer): Promise<number> {
    const dataCopy = new Uint8Array(arrayBuffer).slice();
    const loadingTask = (pdfjsLib as any).getDocument({ data: dataCopy });
    const pdf = await loadingTask.promise;
    const n = pdf.numPages;
    try { pdf.destroy?.(); } catch (_) {}
    return n;
  }

  async extractTextRange(arrayBuffer: ArrayBuffer, startPage = 1, endPage?: number): Promise<string> {
    // Create a copied Uint8Array to avoid transferring/detaching the original ArrayBuffer
    const dataCopy = new Uint8Array(arrayBuffer).slice();
    const loadingTask = (pdfjsLib as any).getDocument({ data: dataCopy });
    const pdf = await loadingTask.promise;
    const from = Math.max(1, Math.floor(startPage));
    const to = endPage && endPage >= from ? Math.min(pdf.numPages, Math.floor(endPage)) : pdf.numPages;
    let text = '';
    for (let i = from; i <= to; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((it: any) => it.str || '').join(' ');
      text += pageText + '\n\n';
    }
    try { pdf.destroy?.(); } catch (_) {}
    return text;
  }

  async extractTextPerPage(arrayBuffer: ArrayBuffer): Promise<string[]> {
    const dataCopy = new Uint8Array(arrayBuffer).slice();
    const loadingTask = (pdfjsLib as any).getDocument({ data: dataCopy });
    const pdf = await loadingTask.promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((it: any) => it.str || '').join(' ');
      pages.push(pageText);
    }
    try { pdf.destroy?.(); } catch (_) {}
    return pages;
  }

  async renderPageToCanvas(arrayBuffer: ArrayBuffer, canvas: HTMLCanvasElement, pageNumber = 1, scale = 1.5): Promise<void> {
    // Use a copy so the original buffer in the component isn't detached by the worker
    const dataCopy = new Uint8Array(arrayBuffer).slice();
    const loadingTask = (pdfjsLib as any).getDocument({ data: dataCopy });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to get canvas 2D context');

    // Handle high-DPI displays: scale the canvas backing store by devicePixelRatio
    const outputScale = Math.max(1, (window.devicePixelRatio || 1));
    const cssWidth = Math.floor(viewport.width);
    const cssHeight = Math.floor(viewport.height);

    canvas.width = Math.floor(cssWidth * outputScale);
    canvas.height = Math.floor(cssHeight * outputScale);
    // Set the visible (CSS) size — inline style wins over external CSS
    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';

    // Scale drawing operations so PDF renders crisply on high-DPI screens
    context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    } as any;

    await page.render(renderContext).promise;
    try { pdf.destroy?.(); } catch (_) {}
  }

  // Render multiple pages into provided canvas elements in a single PDF load (faster)
  async renderPagesToCanvases(arrayBuffer: ArrayBuffer, canvases: HTMLCanvasElement[], startPage = 1, endPage?: number, scale = 1.5): Promise<void> {
    const dataCopy = new Uint8Array(arrayBuffer).slice();
    const loadingTask = (pdfjsLib as any).getDocument({ data: dataCopy });
    const pdf = await loadingTask.promise;
    const from = Math.max(1, Math.floor(startPage));
    const to = endPage && endPage >= from ? Math.min(pdf.numPages, Math.floor(endPage)) : pdf.numPages;
    try {
      // canvases array may correspond to pages from `from`..`to`; ensure mapping
      for (let p = from; p <= to; p++) {
        const canvasIdx = p - from;
        const canvas = canvases[canvasIdx];
        if (!canvas) continue;
        const page = await pdf.getPage(p);
        const viewport = page.getViewport({ scale });
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Unable to get canvas 2D context');

        const outputScale = Math.max(1, (window.devicePixelRatio || 1));
        const cssWidth = Math.floor(viewport.width);
        const cssHeight = Math.floor(viewport.height);

        canvas.width = Math.floor(cssWidth * outputScale);
        canvas.height = Math.floor(cssHeight * outputScale);
        canvas.style.width = cssWidth + 'px';
        canvas.style.height = cssHeight + 'px';
        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        } as any;

        // eslint-disable-next-line no-await-in-loop
        await page.render(renderContext).promise;
      }
    } finally {
      try { pdf.destroy?.(); } catch (_) {}
    }
  }
}
