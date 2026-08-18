import { useEffect, useState, useRef, useCallback } from 'react';
import { X, Maximize2, Minimize2, Download, ExternalLink, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight, Loader2, FileText, AlertCircle } from 'lucide-react';
import { base64ToBlob, base64ToUint8Array, downloadFileData, openFileDataInNewTab } from '../utils/fileUtils';

// CDN URLs for PDF.js
const PDFJS_SCRIPT = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

function loadPdfJsScript() {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }
    const existingScript = document.querySelector(`script[src="${PDFJS_SCRIPT}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.pdfjsLib));
      existingScript.addEventListener('error', () => reject(new Error('PDF.js failed to load')));
      return;
    }
    const script = document.createElement('script');
    script.src = PDFJS_SCRIPT;
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        resolve(window.pdfjsLib);
      } else {
        reject(new Error('PDF.js library missing'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js script'));
    document.head.appendChild(script);
  });
}

/**
 * Mobile-friendly Canvas PDF Viewer
 */
function MobileFriendlyPdfViewer({ fileData, objectUrl, fileName, isFullScreen }) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [viewMode, setViewMode] = useState('scroll'); // 'scroll' (all pages) or 'single' (page-by-page)
  
  const canvasRefs = useRef({});
  const renderTasks = useRef({});
  const containerRef = useRef(null);

  // Load the PDF document
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    async function initPdf() {
      try {
        const pdfjs = await loadPdfJsScript();
        let pdfSource = null;

        // Prefer Uint8Array for reliability with base64 data
        if (fileData && fileData.startsWith('data:')) {
          const rawData = base64ToUint8Array(fileData);
          if (rawData) {
            pdfSource = { data: rawData };
          }
        }

        if (!pdfSource && objectUrl) {
          pdfSource = { url: objectUrl };
        } else if (!pdfSource && fileData) {
          pdfSource = { url: fileData };
        }

        if (!pdfSource) {
          throw new Error('No PDF source available.');
        }

        const loadingTask = pdfjs.getDocument(pdfSource);
        const doc = await loadingTask.promise;

        if (isMounted) {
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setCurrentPage(1);
          setLoading(false);
        }
      } catch (err) {
        console.error('PDF.js render error:', err);
        if (isMounted) {
          setError(err.message || 'Unable to render PDF inside browser.');
          setLoading(false);
        }
      }
    }

    initPdf();

    return () => {
      isMounted = false;
      // Cancel ongoing render tasks
      Object.values(renderTasks.current).forEach(task => {
        try { task?.cancel(); } catch { }
      });
      renderTasks.current = {};
    };
  }, [fileData, objectUrl]);

  // Render a specific page to a canvas
  const renderPage = useCallback(async (pageNum) => {
    if (!pdfDoc) return;
    const canvas = canvasRefs.current[pageNum];
    if (!canvas) return;

    try {
      // Cancel existing render on this canvas if any
      if (renderTasks.current[pageNum]) {
        try { renderTasks.current[pageNum].cancel(); } catch { }
      }

      const page = await pdfDoc.getPage(pageNum);
      
      // Auto adjust base scale based on container width for responsive mobile viewing
      const containerWidth = containerRef.current ? containerRef.current.clientWidth - 32 : 600;
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const fitScale = Math.min(Math.max(containerWidth / unscaledViewport.width, 0.6), 2.5);
      
      const effectiveScale = fitScale * scale;
      const viewport = page.getViewport({ scale: effectiveScale });

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const renderContext = {
        canvasContext: ctx,
        viewport,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null,
      };

      const renderTask = page.render(renderContext);
      renderTasks.current[pageNum] = renderTask;
      await renderTask.promise;
      delete renderTasks.current[pageNum];
    } catch (err) {
      if (err.name !== 'RenderingCancelledException') {
        console.warn(`Render error on page ${pageNum}:`, err);
      }
    }
  }, [pdfDoc, scale]);

  // Trigger render when doc, page, scale or viewMode changes
  useEffect(() => {
    if (!pdfDoc) return;

    if (viewMode === 'scroll') {
      for (let i = 1; i <= numPages; i++) {
        renderPage(i);
      }
    } else {
      renderPage(currentPage);
    }
  }, [pdfDoc, numPages, currentPage, scale, viewMode, renderPage]);

  const handleZoomIn = () => setScale(s => Math.min(s + 0.25, 3.0));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.25, 0.6));
  const handleResetZoom = () => setScale(1.0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: '#0f172a' }}>
      {/* PDF Controls Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px',
        padding: '8px 16px', background: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid rgba(255,255,255,0.1)',
        zIndex: 10
      }}>
        {/* Mobile Quick Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => downloadFileData(fileData || objectUrl, fileName, 'pdf')}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', padding: '5px 10px', background: 'var(--accent-emerald)', borderColor: 'var(--accent-emerald)' }}
            title="Download PDF to Device"
          >
            <Download size={14} /> 📥 Download
          </button>
          
          <button
            type="button"
            onClick={() => openFileDataInNewTab(fileData || objectUrl, 'pdf')}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', padding: '5px 10px' }}
            title="Open in PDF Viewer / New Tab"
          >
            <ExternalLink size={14} /> ↗️ Open Tab
          </button>
        </div>

        {/* Zoom and Page controls */}
        {numPages > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '2px 4px' }}>
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={scale <= 0.6}
                title="Zoom Out"
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px 6px', opacity: scale <= 0.6 ? 0.4 : 1 }}
              >
                <ZoomOut size={15} />
              </button>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', minWidth: '42px', textAlign: 'center' }}>
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={scale >= 3.0}
                title="Zoom In"
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px 6px', opacity: scale >= 3.0 ? 0.4 : 1 }}
              >
                <ZoomIn size={15} />
              </button>
              {scale !== 1.0 && (
                <button
                  type="button"
                  onClick={handleResetZoom}
                  title="Reset Zoom"
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                >
                  <RotateCcw size={13} />
                </button>
              )}
            </div>

            {/* Page navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#94a3b8' }}>
              <span style={{ background: 'rgba(255,255,255,0.06)', padding: '4px 8px', borderRadius: '4px' }}>
                {numPages} {numPages === 1 ? 'page' : 'pages'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Canvas Scroll Area */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          background: '#090d16',
          minHeight: '280px'
        }}
      >
        {/* Loading Spinner */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: '#94a3b8', gap: '12px' }}>
            <Loader2 size={32} className="spinning" style={{ color: 'var(--primary)' }} />
            <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>Rendering PDF for Mobile & Desktop...</div>
          </div>
        )}

        {/* Fallback / Error display */}
        {error && (
          <div style={{
            maxWidth: '480px', width: '100%', margin: '40px auto', padding: '24px',
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px', textAlign: 'center', color: '#fff'
          }}>
            <AlertCircle size={36} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
            <h4 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 600 }}>PDF Mobile Preview Notice</h4>
            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5', margin: '0 0 16px' }}>
              Mobile browsers restrict inline previews for certain PDF formats. You can download or open the document directly:
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => downloadFileData(fileData || objectUrl, fileName, 'pdf')}
                className="btn btn-primary btn-sm"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                <Download size={15} style={{ marginRight: '6px' }} /> Download File
              </button>
              <button
                type="button"
                onClick={() => openFileDataInNewTab(fileData || objectUrl, 'pdf')}
                className="btn btn-secondary btn-sm"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                <ExternalLink size={15} style={{ marginRight: '6px' }} /> Open in App
              </button>
            </div>
          </div>
        )}

        {/* Multi-page continuous view */}
        {!loading && !error && numPages > 0 && (
          Array.from({ length: numPages }, (_, idx) => idx + 1).map((pageNum) => (
            <div
              key={pageNum}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                borderRadius: '4px',
                overflow: 'hidden',
                background: '#fff',
                position: 'relative'
              }}
            >
              <canvas
                ref={el => { if (el) canvasRefs.current[pageNum] = el; }}
                style={{ display: 'block', maxWidth: '100%' }}
              />
              <div style={{
                position: 'absolute', bottom: '6px', right: '8px',
                background: 'rgba(0,0,0,0.65)', color: '#fff',
                fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px',
                pointerEvents: 'none'
              }}>
                Page {pageNum} / {numPages}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * FileViewer – renders file data inline inside a modal.
 * Supports HTML5 Canvas rendering for PDFs on mobile/desktop, images, videos, Word/PPT.
 */
export default function FileViewer({ file, onClose }) {
  const [objectUrl, setObjectUrl] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const containerRef = useRef(null);

  if (!file) return null;

  const { fileData, fileType, fileName, title } = file;
  const ext = (fileType || '').toLowerCase();

  const isPdf   = ext === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
  const isVideo = ['mp4', 'mkv', 'webm', 'avi', 'mov'].includes(ext);
  const isWord  = ['doc', 'docx'].includes(ext);
  const isPpt   = ['ppt', 'pptx'].includes(ext);

  useEffect(() => {
    if (!fileData) return;

    if (fileData.startsWith('blob:')) {
      setObjectUrl(fileData);
      return;
    }

    try {
      const mime = isPdf ? 'application/pdf' : undefined;
      const blob = base64ToBlob(fileData, mime);
      if (blob) {
        const url = URL.createObjectURL(blob);
        setObjectUrl(url);
        return () => {
          URL.revokeObjectURL(url);
        };
      } else {
        setObjectUrl(fileData);
      }
    } catch (e) {
      console.error('Failed to create Blob URL from base64:', e);
      setObjectUrl(fileData);
    }
  }, [fileData, isPdf]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        if (isFullScreen) {
          setIsFullScreen(false);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, isFullScreen]);

  const toggleFullScreen = () => {
    setIsFullScreen(prev => !prev);
    if (!isFullScreen && containerRef.current && containerRef.current.requestFullscreen) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: isFullScreen ? 0 : '12px',
        transition: 'padding 0.2s ease',
      }}
    >
      <div
        ref={containerRef}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: isFullScreen ? 'none' : '1px solid var(--border)',
          borderRadius: isFullScreen ? 0 : 'var(--radius-lg)',
          width: isFullScreen ? '100vw' : '100%',
          maxWidth: isFullScreen ? '100vw' : '980px',
          height: isFullScreen ? '100vh' : '90vh',
          maxHeight: isFullScreen ? '100vh' : '92vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: isFullScreen ? 'none' : '0 25px 60px rgba(0,0,0,0.7)',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', borderBottom: '1px solid var(--border)',
          background: 'rgba(0,0,0,0.25)',
          flexShrink: 0, gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>
              {isPdf ? '📄' : isImage ? '🖼️' : isVideo ? '🎬' : isWord ? '📝' : isPpt ? '📊' : '📁'}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {title || fileName}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fileName}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => downloadFileData(fileData || objectUrl, fileName, ext)}
              title="Download File"
              className="btn btn-secondary btn-sm"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '5px 10px', fontSize: '0.78rem', fontWeight: 600,
                background: 'rgba(255,255,255,0.08)',
                color: '#fff', border: '1px solid var(--border)',
                borderRadius: '6px', cursor: 'pointer'
              }}
            >
              <Download size={14} /> <span className="hide-on-mobile">Download</span>
            </button>

            <button
              type="button"
              onClick={toggleFullScreen}
              title={isFullScreen ? 'Exit Full Screen' : 'Full Screen Mode'}
              className="btn btn-secondary btn-sm"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '5px 10px', fontSize: '0.78rem', fontWeight: 600,
                background: isFullScreen ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
                color: '#fff', border: '1px solid var(--border)',
                borderRadius: '6px', cursor: 'pointer'
              }}
            >
              {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>

            <button
              type="button"
              onClick={onClose}
              title="Close viewer"
              style={{
                background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px', cursor: 'pointer', padding: '5px 8px',
                color: '#ef4444', display: 'flex', alignItems: 'center',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: isPdf ? '#090d16' : 'transparent' }}>

          {/* ── PDF: Universal Canvas Viewer ── */}
          {isPdf && (
            <MobileFriendlyPdfViewer
              fileData={fileData}
              objectUrl={objectUrl}
              fileName={fileName}
              isFullScreen={isFullScreen}
            />
          )}

          {/* ── Image ── */}
          {isImage && objectUrl && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flex: 1, width: '100%', padding: '16px', overflow: 'auto'
            }}>
              <img
                src={objectUrl}
                alt={fileName}
                style={{
                  maxWidth: '100%', maxHeight: '100%',
                  objectFit: 'contain', borderRadius: isFullScreen ? 0 : 'var(--radius-sm)'
                }}
              />
            </div>
          )}

          {/* ── Video ── */}
          {isVideo && objectUrl && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flex: 1, background: '#000'
            }}>
              <video
                src={objectUrl}
                controls
                autoPlay={false}
                style={{ width: '100%', maxHeight: '100%', display: 'block' }}
              />
            </div>
          )}

          {/* ── Word / PPT / Unsupported ── */}
          {(isWord || isPpt || (!isPdf && !isImage && !isVideo)) && (
            <div style={{
              flex: 1, overflow: 'auto',
              textAlign: 'center', padding: '48px 24px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px'
            }}>
              <div style={{ fontSize: '4rem' }}>{isWord ? '📝' : isPpt ? '📊' : '📁'}</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{fileName}</div>
              <div style={{
                color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.7',
                maxWidth: '400px', textAlign: 'center'
              }}>
                {isWord
                  ? 'Microsoft Word documents cannot be directly previewed inline.'
                  : isPpt
                    ? 'PowerPoint presentations cannot be directly previewed inline.'
                    : 'This file type cannot be previewed in-app.'}
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => downloadFileData(fileData || objectUrl, fileName, ext)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 18px' }}
                >
                  <Download size={16} /> Download File
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
