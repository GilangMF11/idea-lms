<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  export let pdfUrl = '';
  export let annotations: Array<{
    pageIndex: number | null;
    selectedText: string | null;
    id: string;
    color?: string | null;
    startPos?: number;
    endPos?: number;
  }> = [];

  /** Called when user selects text: (selectedText, pageIndex, startOffsetInPage, endOffsetInPage) */
  export let onTextSelection: ((text: string, pageNum: number, startOffset: number, endOffset: number) => void) | null = null;
  /** Called when user clicks a highlight: (annotationId: string) */
  export let onAnnotationClick: ((annotationId: string) => void) | null = null;

  let numPages = 0;
  let currentPage = 1;
  let loading = true;
  let error = '';
  let pdfDoc: any = null;
  let containerEl: HTMLDivElement;
  const pageContainers: Map<number, { canvas: HTMLCanvasElement; textLayerDiv: HTMLDivElement }> = new Map();
  /** PDF.js module loaded only on client to avoid SSR (DOMMatrix etc.) */
  let pdfjsLib: typeof import('pdfjs-dist') | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let renderId = 0;
  let lastContainerWidth = 0;
  let resizeObserverReady = false;
  let annotationsKey = '';

  const annotationHighlightColors = [
    '#fef3c7', '#e0f2fe', '#ecfeff', '#fce7f3', '#dcfce7'
  ];

  const HIGHLIGHT_ALPHA = 0.45; // semi-transparent so PDF text underneath remains visible

  function getAnnotationColor(index: number) {
    return annotationHighlightColors[index % annotationHighlightColors.length];
  }

  /** Convert hex (#rgb or #rrggbb) to rgba with alpha so highlight doesn't cover PDF text */
  function hexToRgba(hex: string, alpha: number): string {
    const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (m) {
      return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${alpha})`;
    }
    const m3 = hex.match(/^#?([a-f\d])([a-f\d])([a-f\d])$/i);
    if (m3) {
      return `rgba(${parseInt(m3[1] + m3[1], 16)}, ${parseInt(m3[2] + m3[2], 16)}, ${parseInt(m3[3] + m3[3], 16)}, ${alpha})`;
    }
    return `rgba(254, 243, 199, ${alpha})`; // fallback
  }

  onMount(async () => {
    if (typeof window === 'undefined') return;
    pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    await loadPdf();
    if (containerEl && pdfDoc) {
      lastContainerWidth = containerEl.clientWidth || 0;
      setTimeout(() => {
        resizeObserverReady = true;
      }, 600);
      resizeObserver = new ResizeObserver(() => {
        if (!resizeObserverReady) return;
        if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
        resizeDebounceTimer = setTimeout(() => {
          resizeDebounceTimer = null;
          if (!pdfDoc || !containerEl) return;
          const w = containerEl.clientWidth || 0;
          if (w === lastContainerWidth) return;
          lastContainerWidth = w;
          renderAllPages();
        }, 300);
      });
      resizeObserver.observe(containerEl);
    }
  });

  onDestroy(() => {
    if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
    resizeDebounceTimer = null;
    resizeObserver?.disconnect();
    resizeObserver = null;
    if (pdfDoc) {
      pdfDoc.destroy();
      pdfDoc = null;
    }
  });

  async function loadPdf() {
    if (!pdfUrl || !pdfjsLib) return;
    loading = true;
    error = '';
    try {
      const url = pdfUrl.startsWith('http') ? pdfUrl : (typeof window !== 'undefined' ? window.location.origin + pdfUrl : pdfUrl);
      const loadingTask = pdfjsLib.getDocument({ url });
      pdfDoc = await loadingTask.promise;
      numPages = pdfDoc.numPages;
      currentPage = 1;
      await renderAllPages();
    } catch (e) {
      console.error('PDF load error:', e);
      error = 'Failed to load PDF';
    } finally {
      loading = false;
    }
  }

  async function renderAllPages() {
    const doc = pdfDoc;
    if (!doc || !containerEl) return;
    const currentRenderId = ++renderId;

    let containerWidth: number;
    let scale: number;
    let numPagesToRender: number;
    try {
      containerWidth = containerEl.clientWidth || 600;
      const firstPage = await doc.getPage(1);
      if (currentRenderId !== renderId) return;
      const baseViewport = firstPage.getViewport({ scale: 1 });
      scale = Math.min(2.5, Math.max(0.6, containerWidth / baseViewport.width));
      numPagesToRender = doc.numPages;
    } catch (e: unknown) {
      if ((e as { name?: string })?.name === 'RenderingCancelledException') return;
      throw e;
    }

    containerEl.innerHTML = '';
    pageContainers.clear();

    for (let pageNum = 1; pageNum <= numPagesToRender; pageNum++) {
      if (currentRenderId !== renderId) return;
      let page;
      try {
        page = await doc.getPage(pageNum);
      } catch (e: unknown) {
        if ((e as { name?: string })?.name === 'RenderingCancelledException') return;
        throw e;
      }
      if (!page) return;
      const viewport = page.getViewport({ scale });

      const wrapper = document.createElement('div');
      wrapper.className = 'pdf-page-wrapper relative mb-6 overflow-hidden';
      wrapper.style.width = viewport.width + 'px';
      wrapper.style.height = viewport.height + 'px';
      wrapper.style.minHeight = viewport.height + 'px';
      wrapper.dataset.page = String(pageNum);
      wrapper.style.isolation = 'isolate';

      /* Canvas di bawah (tampilan PDF), text layer di atas (seleksi terlihat). Teks di text layer transparan. */
      const pageContent = document.createElement('div');
      pageContent.className = 'pdf-page-content';
      pageContent.style.cssText = `position:relative;width:${viewport.width}px;height:${viewport.height}px;`;
      wrapper.appendChild(pageContent);

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      canvas.className = 'border border-gray-200 rounded shadow-sm';
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;';
      pageContent.appendChild(canvas);

      const textLayerDiv = document.createElement('div');
      textLayerDiv.className = 'pdf-text-layer textLayer';
      textLayerDiv.setAttribute('role', 'presentation');
      textLayerDiv.style.setProperty('--total-scale-factor', String(scale));
      textLayerDiv.style.setProperty('--scale-round-x', '1px');
      textLayerDiv.style.setProperty('--scale-round-y', '1px');
      textLayerDiv.style.position = 'absolute';
      textLayerDiv.style.left = '0';
      textLayerDiv.style.top = '0';
      textLayerDiv.style.overflow = 'clip';
      textLayerDiv.style.pointerEvents = 'auto';
      textLayerDiv.style.userSelect = 'text';
      textLayerDiv.style.cursor = 'text';
      textLayerDiv.style.lineHeight = '1';
      textLayerDiv.style.textAlign = 'initial';
      textLayerDiv.style.transformOrigin = '0 0';
      textLayerDiv.style.zIndex = '1';
      pageContent.appendChild(textLayerDiv);
      containerEl.appendChild(wrapper);

      pageContainers.set(pageNum, { canvas, textLayerDiv });

      if (context) {
        try {
          const renderContext = {
            canvasContext: context,
            viewport,
            enableWebGL: false
          };
          await page.render(renderContext).promise;
        } catch (e: unknown) {
          if ((e as { name?: string })?.name === 'RenderingCancelledException') return;
          throw e;
        }
      }
      if (currentRenderId !== renderId) return;

      const textContent = await page.getTextContent();
      if (pdfjsLib) {
        const textLayer = new pdfjsLib.TextLayer({
          textContentSource: textContent,
          container: textLayerDiv,
          viewport
        });
        await textLayer.render();
        // Force exact same dimensions as canvas so text overlays pixel-perfect (avoids calc rounding)
        textLayerDiv.style.width = viewport.width + 'px';
        textLayerDiv.style.height = viewport.height + 'px';
      }

      applyHighlightsOnPage(pageNum, textLayerDiv);
    }
  }

  function normalizeWhitespace(s: string): string {
    return s.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  function findTextInFullText(fullText: string, search: string): { start: number; end: number } | null {
    const searchTrimmed = search.trim();
    const fullLower = fullText.toLowerCase();
    const searchLower = searchTrimmed.toLowerCase();
    const idx = fullLower.indexOf(searchLower);
    if (idx !== -1) return { start: idx, end: idx + searchTrimmed.length };
    const searchNorm = normalizeWhitespace(search);
    if (!searchNorm) return null;
    const normFullChars: string[] = [];
    const normToOrigStart: number[] = [];
    let inSpace = false;
    for (let i = 0; i < fullText.length; i++) {
      const isSpace = /\s/.test(fullText[i]);
      if (isSpace) {
        if (!inSpace) {
          normFullChars.push(' ');
          normToOrigStart.push(i);
          inSpace = true;
        }
      } else {
        inSpace = false;
        normFullChars.push(fullText[i].toLowerCase());
        normToOrigStart.push(i);
      }
    }
    const normFull = normFullChars.join('');
    const normIdxFound = normFull.indexOf(searchNorm);
    if (normIdxFound === -1) return null;
    const normEnd = normIdxFound + searchNorm.length;
    const origStart = normToOrigStart[normIdxFound] ?? 0;
    const lastNormIdx = normEnd - 1;
    const origEnd = lastNormIdx >= 0 && lastNormIdx < normToOrigStart.length
      ? (normToOrigStart[lastNormIdx] ?? 0) + 1
      : fullText.length;
    return { start: origStart, end: Math.min(origEnd, fullText.length) };
  }

  function offsetToRange(
    textNodes: Text[],
    nodeStarts: number[],
    fullTextLength: number,
    startOffset: number,
    endOffset: number
  ): { startNode: Text; startOff: number; endNode: Text; endOff: number } | null {
    if (startOffset < 0 || endOffset <= startOffset || startOffset >= fullTextLength) return null;
    const endOff = Math.min(endOffset, fullTextLength);
    let startNodeIdx = -1;
    let startOff = 0;
    for (let k = 0; k < nodeStarts.length; k++) {
      const nodeLen = (textNodes[k].textContent || '').length;
      if (startOffset >= nodeStarts[k] && startOffset < nodeStarts[k] + nodeLen) {
        startNodeIdx = k;
        startOff = startOffset - nodeStarts[k];
        break;
      }
    }
    if (startNodeIdx < 0) return null;
    let endNodeIdx = startNodeIdx;
    let endOffInNode = startOff;
    for (let k = startNodeIdx; k < textNodes.length; k++) {
      const segStart = nodeStarts[k];
      const nodeLen = (textNodes[k].textContent || '').length;
      const segEnd = segStart + nodeLen;
      if (endOff <= segEnd) {
        endNodeIdx = k;
        endOffInNode = endOff - segStart;
        break;
      }
    }
    const startNode = textNodes[startNodeIdx];
    const endNode = textNodes[endNodeIdx];
    if (!startNode || !endNode) return null;
    const startMax = (startNode.textContent || '').length;
    const endMax = (endNode.textContent || '').length;
    return {
      startNode,
      startOff: Math.min(startOff, startMax),
      endNode,
      endOff: Math.min(Math.max(0, endOffInNode), endMax)
    };
  }

  function applyHighlightsOnPage(pageIndex1Based: number, textLayerDiv: HTMLDivElement) {
    const pageIndex0Based = pageIndex1Based - 1;
    const forThisPage = annotations.filter(
      (a) => a.pageIndex === pageIndex0Based && ((a.selectedText || '').trim().length > 0 || (a.startPos != null && a.endPos != null && a.startPos < a.endPos))
    );
    if (forThisPage.length === 0) return;

    const walker = document.createTreeWalker(textLayerDiv, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) {
      textNodes.push(n as Text);
    }
    let fullText = '';
    const nodeStarts: number[] = [];
    for (const node of textNodes) {
      nodeStarts.push(fullText.length);
      fullText += node.textContent || '';
    }

    type RangeInfo = { startNode: Text; startOffset: number; endNode: Text; endOffset: number; color: string; id: string; idx: number };
    const rangesToApply: RangeInfo[] = [];

    for (let i = 0; i < forThisPage.length; i++) {
      const ann = forThisPage[i];
      const useOffset = typeof ann.startPos === 'number' && typeof ann.endPos === 'number' && ann.startPos < ann.endPos;
      let startNode: Text;
      let startOffset: number;
      let endNode: Text;
      let endOffset: number;
      let idx: number;

      if (useOffset) {
        const r = offsetToRange(textNodes, nodeStarts, fullText.length, ann.startPos!, ann.endPos!);
        if (!r) continue;
        startNode = r.startNode;
        startOffset = r.startOff;
        endNode = r.endNode;
        endOffset = r.endOff;
        idx = ann.startPos!;
      } else {
        const selected = (ann.selectedText || '').trim();
        if (!selected) continue;
        const found = findTextInFullText(fullText, selected);
        if (!found) continue;
        idx = found.start;
        const selectedLen = found.end - found.start;

        let startNodeIdx = 0;
        let so = found.start;
        for (let k = 0; k < nodeStarts.length; k++) {
          const nodeLen = (textNodes[k].textContent || '').length;
          if (found.start >= nodeStarts[k] && found.start < nodeStarts[k] + nodeLen) {
            startNodeIdx = k;
            so = found.start - nodeStarts[k];
            break;
          }
        }
        let endNodeIdx = startNodeIdx;
        let endOff = so + selectedLen;
        for (let k = startNodeIdx; k < textNodes.length; k++) {
          const nodeLen = (textNodes[k].textContent || '').length;
          if (endOff <= nodeLen) {
            endNodeIdx = k;
            break;
          }
          endOff -= nodeLen;
        }
        startNode = textNodes[startNodeIdx];
        endNode = textNodes[endNodeIdx];
        startOffset = Math.min(so, (startNode.textContent || '').length);
        endOffset = endNode === startNode ? startOffset + selectedLen : Math.min(endOff, (endNode.textContent || '').length);
      }

      rangesToApply.push({
        startNode,
        startOffset,
        endNode,
        endOffset,
        color: ann.color || getAnnotationColor(i),
        id: ann.id,
        idx
      });
    }

    // Apply highlights in reverse order so earlier offsets don't shift
    for (const r of rangesToApply.sort((a, b) => b.idx - a.idx)) {
      // surroundContents() only works when the range is inside a single parent.
      // PDF.js puts each text run in its own span, so we split into one segment per text node.
      const segments: { node: Text; start: number; end: number }[] = [];
      if (r.startNode === r.endNode) {
        segments.push({ node: r.startNode, start: r.startOffset, end: r.endOffset });
      } else {
        let foundStart = false;
        for (let k = 0; k < textNodes.length; k++) {
          const node = textNodes[k];
          const len = (node.textContent || '').length;
          if (node === r.startNode) {
            foundStart = true;
            segments.push({ node, start: r.startOffset, end: len });
          } else if (node === r.endNode) {
            segments.push({ node, start: 0, end: r.endOffset });
            break;
          } else if (foundStart) {
            segments.push({ node, start: 0, end: len });
          }
        }
      }
      for (const seg of segments) {
        if (seg.start >= seg.end) continue;
        try {
          const range = document.createRange();
          range.setStart(seg.node, seg.start);
          range.setEnd(seg.node, seg.end);
          const span = document.createElement('span');
          span.className = 'pdf-annotation-marker';
          const bg = hexToRgba(r.color, HIGHLIGHT_ALPHA);
          span.style.cssText = `background-color: ${bg}; padding: 0 1px; border-radius: 2px; cursor: pointer;`;
          span.dataset.annotationId = r.id;
          if (onAnnotationClick) {
            span.onclick = (e) => { e.preventDefault(); e.stopPropagation(); onAnnotationClick?.(r.id); };
          }
          range.surroundContents(span);
        } catch (_) {
          // ignore single-segment failures (e.g. invalid offset)
        }
      }
    }
  }

  function getPageTextOffsets(textLayer: Element, range: Range): { start: number; end: number } | null {
    const walker = document.createTreeWalker(textLayer, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) textNodes.push(n as Text);
    let startOffset = -1;
    let endOffset = -1;
    let current = 0;
    for (const node of textNodes) {
      const len = (node.textContent || '').length;
      if (node === range.startContainer) startOffset = current + range.startOffset;
      if (node === range.endContainer) endOffset = current + range.endOffset;
      current += len;
    }
    if (startOffset < 0 || endOffset < 0) return null;
    return { start: startOffset, end: endOffset };
  }

  function handleMouseUp() {
    if (!onTextSelection) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    let startNode: Node = range.startContainer;
    if (startNode.nodeType !== Node.ELEMENT_NODE && startNode.parentElement) startNode = startNode.parentElement;
    const pageEl = (startNode as HTMLElement).closest?.('.pdf-page-wrapper') as HTMLElement | null;
    if (!pageEl?.dataset?.page) return;
    const pageNum = parseInt(pageEl.dataset.page, 10);
    if (pageNum < 1) return;
    const textLayer = pageEl.querySelector('.pdf-text-layer');
    if (!textLayer) return;
    const startInLayer = textLayer.contains(range.startContainer);
    const endInLayer = textLayer.contains(range.endContainer);
    if (!startInLayer && !endInLayer) return;
    let text: string;
    let rangeForOffsets: Range = range;
    try {
      const textLayerRange = document.createRange();
      textLayerRange.selectNodeContents(textLayer);
      if (startInLayer && endInLayer) {
        text = range.toString().trim();
      } else {
        const clone = range.cloneRange();
        if (range.compareBoundaryPoints(Range.START_TO_START, textLayerRange) < 0) {
          clone.setStart(textLayerRange.startContainer, textLayerRange.startOffset);
        }
        if (range.compareBoundaryPoints(Range.END_TO_END, textLayerRange) > 0) {
          clone.setEnd(textLayerRange.endContainer, textLayerRange.endOffset);
        }
        text = clone.toString().trim();
        rangeForOffsets = clone;
      }
    } catch {
      text = sel.toString().trim();
    }
    if (!text) return;
    const offsets = getPageTextOffsets(textLayer, rangeForOffsets);
    if (offsets) {
      onTextSelection(text, pageNum, offsets.start, offsets.end);
    } else {
      onTextSelection(text, pageNum, 0, 0);
    }
  }

  $: newAnnotationsKey = annotations?.length + (annotations?.map((a) => a.id + (a.selectedText || '') + (a.startPos ?? '') + (a.endPos ?? '')).join(',')) || '';
  $: if (pdfUrl && containerEl && !loading && pdfDoc && newAnnotationsKey !== annotationsKey) {
    annotationsKey = newAnnotationsKey;
    requestAnimationFrame(() => {
      if (!containerEl || !pdfDoc) return;
      const wrappers = containerEl.querySelectorAll('.pdf-page-wrapper');
      wrappers.forEach((wrapper) => {
        const el = wrapper as HTMLElement;
        const pageNum = parseInt(el.dataset?.page || '1', 10);
        const textLayerDiv = wrapper.querySelector('.pdf-text-layer');
        if (textLayerDiv) {
          const markers = textLayerDiv.querySelectorAll('.pdf-annotation-marker');
          markers.forEach((m) => {
            const parent = m.parentNode;
            if (parent) {
              while (m.firstChild) parent.insertBefore(m.firstChild, m);
              parent.removeChild(m);
            }
          });
          applyHighlightsOnPage(pageNum, textLayerDiv as HTMLDivElement);
        }
      });
    });
  }
</script>

<div class="pdf-viewer relative">
  {#if loading}
    <div class="flex items-center justify-center py-16 min-h-[200px]">
      <div class="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent"></div>
      <span class="ml-3 text-gray-600">Loading PDF...</span>
    </div>
  {:else if error}
    <div class="text-red-600 py-4 min-h-[100px]">{error}</div>
  {/if}
  <!-- Container always in DOM (can be hidden when loading/error) so containerEl is set when renderAllPages() runs -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    bind:this={containerEl}
    class="pdf-pages"
    class:hidden={loading || !!error}
    on:mouseup={handleMouseUp}
    role="application"
    aria-label="PDF document with selectable text. Select text to add an annotation."
  ></div>
</div>

<style>
  :global(.pdf-viewer .pdf-pages) {
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
  }
  :global(.pdf-viewer .pdf-page-wrapper) {
    max-width: 100%;
  }
  :global(.pdf-viewer .pdf-page-content) {
    display: block;
  }
  :global(.pdf-viewer .pdf-page-content canvas) {
    pointer-events: none !important;
    z-index: 0;
  }
  :global(.pdf-viewer .pdf-text-layer) {
    z-index: 1;
    pointer-events: auto;
    line-height: 1;
    text-rendering: geometricPrecision;
    -webkit-text-size-adjust: none;
    text-size-adjust: none;
    /* PDF.js text layer scaling so text aligns with canvas */
    --min-font-size: 1;
    --text-scale-factor: calc(var(--total-scale-factor) * var(--min-font-size));
    --min-font-size-inv: calc(1 / var(--min-font-size));
  }
  /* Span layout: font-size and transform must match PDF.js so text overlays canvas exactly */
  :global(.pdf-viewer .pdf-text-layer > :not(.markedContent)),
  :global(.pdf-viewer .pdf-text-layer .markedContent span:not(.markedContent)) {
    position: absolute;
    white-space: pre;
    transform-origin: 0 0;
    --font-height: 0;
    font-size: calc(var(--text-scale-factor) * var(--font-height));
    --scale-x: 1;
    --rotate: 0deg;
    transform: rotate(var(--rotate)) scaleX(var(--scale-x)) scale(var(--min-font-size-inv));
  }
  :global(.pdf-viewer .pdf-text-layer .markedContent) {
    display: contents;
  }
  /* Teks di text layer transparan (hanya canvas yang terlihat), tapi seleksi tetap kelihatan */
  :global(.pdf-viewer .pdf-text-layer span:not(.pdf-annotation-marker)),
  :global(.pdf-viewer .pdf-text-layer br) {
    color: transparent !important;
    -webkit-text-fill-color: transparent !important;
    text-shadow: none !important;
    cursor: text;
  }
  :global(.pdf-viewer .pdf-text-layer ::selection) {
    background: rgba(59, 130, 246, 0.4);
  }
  :global(.pdf-viewer .pdf-text-layer ::-moz-selection) {
    background: rgba(59, 130, 246, 0.4);
  }
  :global(.pdf-viewer .pdf-annotation-marker) {
    color: transparent !important;
    -webkit-text-fill-color: transparent !important;
    cursor: pointer;
  }
</style>
