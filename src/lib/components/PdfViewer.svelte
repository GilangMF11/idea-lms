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
    content?: string;
  }> = [];

  /** Called when user clicks an annotation: (annotationId: string) => void */
  export let onAnnotationClick: ((annotationId: string) => void) | null = null;
  /** Called when user selects text: (selectedText: string, pageIndex: number, startPos: number, endPos: number) => void */
  export let onTextSelection: ((selectedText: string, pageIndex: number, startPos: number, endPos: number) => void) | null = null;

  let numPages = 0;
  let currentPage = 1;
  let loading = true;
  let error = '';
  let pdfDoc: any = null;
  let containerEl: HTMLDivElement;
  const pageContainers: Map<number, { canvas: HTMLCanvasElement; textLayerDiv: HTMLDivElement }> = new Map();
  let pdfjsLib: typeof import('pdfjs-dist') | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let renderId = 0;
  let lastContainerWidth = 0;
  let resizeObserverReady = false;
  let annotationsKey = '';
  let textSelectionTimeout: ReturnType<typeof setTimeout> | null = null;

  const annotationHighlightColors = [
    '#fef3c7', '#e0f2fe', '#ecfeff', '#fce7f3', '#dcfce7'
  ];

  function getAnnotationColor(index: number) {
    return annotationHighlightColors[index % annotationHighlightColors.length];
  }

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
      textLayerDiv.style.width = viewport.width + 'px';
      textLayerDiv.style.height = viewport.height + 'px';
      textLayerDiv.style.overflow = 'clip';
      textLayerDiv.style.pointerEvents = 'auto';
      textLayerDiv.style.userSelect = 'text';
      textLayerDiv.style.cursor = 'text';
      textLayerDiv.style.lineHeight = '1';
      textLayerDiv.style.textAlign = 'initial';
      textLayerDiv.style.transformOrigin = '0 0';
      textLayerDiv.style.zIndex = '1';
      textLayerDiv.style.color = 'transparent';
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
      }

      applyHighlightsOnPage(pageNum, textLayerDiv);
      applyAnnotationOverlays(pageNum, wrapper as HTMLElement);
    }
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
        color: hexToRgba(ann.color || getAnnotationColor(i), 0.45),
        id: ann.id,
        idx
      });
    }

    for (const r of rangesToApply.sort((a, b) => b.idx - a.idx)) {
      try {
        const range = document.createRange();
        range.setStart(r.startNode, r.startOffset);
        range.setEnd(r.endNode, r.endOffset);
        const span = document.createElement('span');
        span.className = 'pdf-annotation-marker';
        span.style.cssText = `background-color: ${r.color}; padding: 0 1px; border-radius: 2px; cursor: pointer;`;
        span.dataset.annotationId = r.id;
        if (onAnnotationClick) {
          span.onclick = (e) => { e.preventDefault(); e.stopPropagation(); onAnnotationClick?.(r.id); };
        }
        range.surroundContents(span);
      } catch (_) {
        console.warn('Could not wrap PDF highlight');
      }
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
    const clampedEndOffset = Math.min(endOffset, fullTextLength);
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
    let endOff = startOff + (endOffset - startOffset);
    for (let k = startNodeIdx; k < textNodes.length; k++) {
      const nodeLen = (textNodes[k].textContent || '').length;
      if (endOff <= nodeLen) {
        endNodeIdx = k;
        break;
      }
    }

    const startNode = textNodes[startNodeIdx];
    const endNode = textNodes[endNodeIdx];
    const finalStartOffset = Math.min(startOff, (startNode.textContent || '').length);
    const finalEndOffset = endNode === startNode ? finalStartOffset + (endOffset - startOffset) : endOff;
    return {
      startNode,
      startOff,
      endNode,
      endOff
    };
  }

  function applyAnnotationOverlays(pageIndex1Based: number, pageWrapper: HTMLElement) {
    const pageIndex0Based = pageIndex1Based - 1;
    const forThisPage = annotations.filter((a) => a.pageIndex === pageIndex0Based);
    if (forThisPage.length === 0) return;

    const viewport = pageContainers.get(pageIndex1Based)?.canvas;
    if (!viewport) return;

    const wrapperRect = pageWrapper.getBoundingClientRect();
    const textLayerDiv = pageWrapper.querySelector('.pdf-text-layer') as HTMLDivElement;
    if (!textLayerDiv) return;

    const existingOverlays = pageWrapper.querySelectorAll('.pdf-annotation-overlay');
    existingOverlays.forEach(overlay => overlay.remove());

    for (let i = 0; i < forThisPage.length; i++) {
      const ann = forThisPage[i];
      if (!ann.content) continue;

      // Find the highlight span for this annotation
      const highlightSpan = textLayerDiv.querySelector(`.pdf-annotation-marker[data-annotation-id="${ann.id}"]`);
      if (!highlightSpan) continue;

      const spanRect = highlightSpan.getBoundingClientRect();
      const textLayerRect = textLayerDiv.getBoundingClientRect();

      // Calculate position relative to the page wrapper
      const left = spanRect.left - textLayerRect.left;
      const top = spanRect.top - textLayerRect.top;
      const width = spanRect.width;

      const overlay = document.createElement('div');
      overlay.className = 'pdf-annotation-overlay absolute bg-yellow-200 bg-opacity-80 border-2 border-yellow-400 p-2 rounded cursor-pointer shadow-lg';
      overlay.style.cssText = `z-index: 10;top: ${top}px;left: ${left}px;max-width: ${Math.min(400, wrapperRect.width - left - 20)}px;position:absolute;`;
      overlay.dataset.annotationId = ann.id;

      const contentDiv = document.createElement('div');
      contentDiv.className = 'pdf-annotation-content';

      if (ann.content) {
        const textDiv = document.createElement('div');
        textDiv.className = 'text-gray-800 text-xs font-medium';
        textDiv.textContent = ann.content;
        contentDiv.appendChild(textDiv);
      }

      overlay.appendChild(contentDiv);

      if (onAnnotationClick) {
        overlay.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          onAnnotationClick?.(ann.id);
        };
      }

      // Position the overlay relative to the text layer
      textLayerDiv.appendChild(overlay);
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
              while (m.firstChild) {
                parent.insertBefore(m.firstChild, m);
              }
              parent.removeChild(m);
            }
          });
          applyHighlightsOnPage(pageNum, textLayerDiv as HTMLDivElement);
          applyAnnotationOverlays(pageNum, wrapper as HTMLElement);
        }
      });
    });
  }

  function handleMouseUp(event: MouseEvent) {
    if (textSelectionTimeout) clearTimeout(textSelectionTimeout);
    textSelectionTimeout = setTimeout(() => {
      processTextSelection();
    }, 100);
  }

  function handleTouchEnd(event: TouchEvent) {
    if (textSelectionTimeout) clearTimeout(textSelectionTimeout);
    textSelectionTimeout = setTimeout(() => {
      processTextSelection();
    }, 100);
  }

  function processTextSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      if (onTextSelection) {
        onTextSelection('', 0, 0, 0);
      }
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) {
      if (onTextSelection) {
        onTextSelection('', 0, 0, 0);
      }
      return;
    }

    const range = selection.getRangeAt(0);
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;

    // Find the page wrapper that contains the selection
    let startPageWrapper = startContainer.parentElement?.closest('.pdf-page-wrapper') as HTMLElement | null;
    let endPageWrapper = endContainer.parentElement?.closest('.pdf-page-wrapper') as HTMLElement | null;

    if (!startPageWrapper || !endPageWrapper) return;

    const startPageNum = parseInt(startPageWrapper.dataset?.page || '0', 10);
    const endPageNum = parseInt(endPageWrapper.dataset?.page || '0', 10);

    // Only allow single-page selections for now
    if (startPageNum !== endPageNum) {
      selection.removeAllRanges();
      return;
    }

    const textLayerDiv = startPageWrapper.querySelector('.pdf-text-layer') as HTMLDivElement;
    if (!textLayerDiv) return;

    // Calculate character offsets
    const walker = document.createTreeWalker(textLayerDiv, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    const nodeStarts: number[] = [];
    let n: Node | null;
    let fullTextLength = 0;

    while ((n = walker.nextNode())) {
      const textNode = n as Text;
      nodeStarts.push(fullTextLength);
      textNodes.push(textNode);
      fullTextLength += (textNode.textContent || '').length;
    }

    // Find start offset
    let startPos = 0;
    const startTextNode = range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer as Text : null;
    if (startTextNode) {
      const startNodeIndex = textNodes.indexOf(startTextNode);
      if (startNodeIndex >= 0) {
        startPos = nodeStarts[startNodeIndex] + range.startOffset;
      }
    }

    // Find end offset
    let endPos = fullTextLength;
    const endTextNode = range.endContainer.nodeType === Node.TEXT_NODE ? range.endContainer as Text : null;
    if (endTextNode) {
      const endNodeIndex = textNodes.indexOf(endTextNode);
      if (endNodeIndex >= 0) {
        endPos = nodeStarts[endNodeIndex] + range.endOffset;
      }
    }

    if (onTextSelection) {
      onTextSelection(selectedText, startPageNum - 1, startPos, endPos);
    }
  }
</script>

<div class="pdf-viewer relative">
  {#if loading}
    <div class="flex items-center justify-center py-16 min-h-[200px]">
      <div class="animate-spin rounded-full h-10 w-10 border-2 border-orange-600 border-t-transparent"></div>
      <span class="ml-3 text-gray-600">Loading PDF...</span>
    </div>
  {:else if error}
    <div class="text-red-600 py-4 min-h-[100px]">{error}</div>
  {/if}
  <div
    bind:this={containerEl}
    class="pdf-pages"
    class:hidden={loading || !!error}
    role="application"
    aria-label="PDF document with annotations"
    on:mouseup={handleMouseUp}
    on:touchend={handleTouchEnd}
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

  /* --- Official pdf.js textLayer styles for proper alignment --- */
  :global(.pdf-viewer .pdf-text-layer) {
    position: absolute;
    text-align: initial;
    inset: 0;
    overflow: clip;
    opacity: 1;
    line-height: 1;
    -webkit-text-size-adjust: none;
    -moz-text-size-adjust: none;
    text-size-adjust: none;
    forced-color-adjust: none;
    transform-origin: 0 0;
    z-index: 1;
    pointer-events: auto;
    user-select: text;
    cursor: text;
    color: transparent;
  }

  /* CSS variable based font sizing from pdf.js */
  :global(.pdf-viewer .pdf-text-layer) {
    --min-font-size: 1;
    --text-scale-factor: calc(var(--total-scale-factor) * var(--min-font-size));
    --min-font-size-inv: calc(1 / var(--min-font-size));
  }

  /* Each text span is absolutely positioned by pdf.js TextLayer */
  :global(.pdf-viewer .pdf-text-layer :is(span, br):not(.pdf-annotation-marker):not(.pdf-annotation-overlay *)) {
    color: transparent;
    position: absolute;
    white-space: pre;
    cursor: text;
    transform-origin: 0% 0%;
  }

  /* Font size and transform via CSS variables set by pdf.js TextLayer */
  :global(.pdf-viewer .pdf-text-layer > :not(.markedContent)),
  :global(.pdf-viewer .pdf-text-layer .markedContent span:not(.markedContent)) {
    z-index: 1;
    --font-height: 0;
    font-size: calc(var(--text-scale-factor) * var(--font-height));
    --scale-x: 1;
    --rotate: 0deg;
    transform: rotate(var(--rotate)) scaleX(var(--scale-x)) scale(var(--min-font-size-inv));
  }

  :global(.pdf-viewer .pdf-text-layer .markedContent) {
    display: contents;
  }

  :global(.pdf-viewer .pdf-text-layer ::selection) {
    background: rgba(59, 130, 246, 0.4);
  }
  :global(.pdf-viewer .pdf-text-layer ::-moz-selection) {
    background: rgba(59, 130, 246, 0.4);
  }
  :global(.pdf-viewer .pdf-text-layer br::selection) {
    background: transparent;
  }
  :global(.pdf-viewer .pdf-text-layer br::-moz-selection) {
    background: transparent;
  }

  :global(.pdf-viewer .pdf-annotation-overlay) {
    z-index: 100 !important;
    backdrop-filter: blur(2px);
    font-size: 11px;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  :global(.pdf-viewer .pdf-annotation-overlay:hover) {
    background-color: rgba(253, 224, 71, 0.95) !important;
    border-color: rgba(245, 158, 11, 1) !important;
    transform: scale(1.02);
    z-index: 101 !important;
  }
  :global(.pdf-viewer .pdf-annotation-marker) {
    color: #1f2937 !important;
    -webkit-text-fill-color: #1f2937 !important;
    cursor: pointer;
    text-shadow: none !important;
    position: relative !important;
    white-space: pre !important;
  }
</style>
