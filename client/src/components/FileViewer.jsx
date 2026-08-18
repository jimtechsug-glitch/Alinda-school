import { useEffect, useState, useRef } from 'react';
import {
  X, Maximize2, Minimize2, Download, ExternalLink,
  ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight,
  Loader2, Layers, BookOpen, AlertCircle
} from 'lucide-react';
import { base64ToBlob, base64ToUint8Array, downloadFileData, openFileDataInNewTab } from '../utils/fileUtils';

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
 * Individual Page Item with correct aspect ratio and crisp canvas rendering
 */
function PdfPageItem({ pdfDoc, pageNum, zoomScale, containerWidth }) {
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function renderPageCanvas() {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        if (renderTaskRef.current) {
          try { renderTaskRef.current.cancel(); } catch { }
        }

        const page = await pdfDoc.getPage(pageNum);
        if (!isMounted) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2.5); // Cap DPR for memory safety on low-end mobile
        const unscaledViewport = page.getViewport({ scale: 1.0 });

        // Calculate available display width
        const availableWidth = containerWidth ? Math.max(containerWidth - 32, 280) : (window.innerWidth - 32);
        const fitScale = Math.min(availableWidth / unscaledViewport.width, 1.8);
        const effectiveScale = fitScale * zoomScale;

        // Viewport for high-resolution canvas bitmap
        const renderViewport = page.getViewport({ scale: effectiveScale * dpr });
        const displayWidth = Math.floor(renderViewport.width / dpr);
        const displayHeight = Math.floor(renderViewport.height / dpr);

        if (isMounted) {
          setDimensions({ width: displayWidth, height: displayHeight });
        }

        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = Math.floor(renderViewport.width);
        canvas.height = Math.floor(renderViewport.height);
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const renderContext = {
          canvasContext: ctx,
          viewport: renderViewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        if (isMounted) {
          setRendered(true);
        }
      } catch (err) {
        if (err.name !== 'RenderingCancelledException') {
          console.warn(`Render error on page ${pageNum}:`, err);
        }
      }
    }

    renderPageCanvas();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch { }
      }
    };
  }, [pdfDoc, pageNum, zoomScale, containerWidth]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: '#ffffff',
        borderRadius: '6px',
        boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
        margin: '12px auto',
        maxWidth: '100%',
        position: 'relative',
        minHeight: dimensions.height ? `${dimensions.height}px` : '380px',
        width: dimensions.width ? `${dimensions.width}px` : '100%',
        transition: 'all 0.15s ease',
        overflow: 'hidden'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: dimensions.width ? `${dimensions.width}px` : '100%',
          height: dimensions.height ? `${dimensions.height}px` : 'auto',
          maxWidth: '100%'
        }}
      />
      <div style={{
        position: 'absolute',
        bottom: '8px',
        right: '8px',
        background: 'rgba(15, 23, 42, 0.75)',
        color: '#ffffff',
        fontSize: '0.7rem',
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: '4px',
        pointerEvents: 'none'
      }}>
        Page {pageNum}
      </div>
    </div>
  );
}

/**
 * Mobile-friendly Canvas PDF Viewer
 */
function MobileFriendlyPdfViewer({ fileData, objectUrl, fileName }) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [viewMode, setViewMode] = useState('scroll'); // 'scroll' or 'single'
  const [containerWidth, setContainerWidth] = useState(0);

  const containerRef = useRef(null);

  // Measure container width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Load PDF Document
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    async function initPdf() {
      try {
        const pdfjs = await loadPdfJsScript();
        let pdfSource = null;

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
        console.error('PDF.js error:', err);
        if (isMounted) {
          setError(err.message || 'Unable to render PDF inside browser.');
          setLoading(false);
        }
      }
    }

    initPdf();

    return () => {
      isMounted = false;
    };
  }, [fileData, objectUrl]);

  const handleZoomIn = () => setZoomScale(s => Math.min(s + 0.2, 2.5));
  const handleZoomOut = () => setZoomScale(s => Math.max(s - 0.2, 0.7));
  const handleResetZoom = () => setZoomScale(1.0);

  const handlePrevPage = () => setCurrentPage(p => Math.max(p - 1, 1));
  const handleNextPage = () => setCurrentPage(p => Math.min(p + 1, numPages));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: '#0b0f19' }}>
      {/* PDF Action & Navigation Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        padding: '8px 12px',
        background: 'rgba(15, 23, 42, 0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        zIndex: 10
      }}>
        {/* Left: Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => downloadFileData(fileData || objectUrl, fileName, 'pdf')}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', padding: '5px 10px', background: 'var(--accent-emerald)', borderColor: 'var(--accent-emerald)' }}
            title="Download PDF to Device"
          >
            <Download size={14} /> <span>Download PDF</span>
          </button>

          <button
            type="button"
            onClick={() => openFileDataInNewTab(fileData || objectUrl, 'pdf')}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', padding: '5px 10px' }}
            title="Open in new browser tab / external viewer"
          >
            <ExternalLink size={14} /> <span>Open Tab</span>
          </button>
        </div>

        {/* Center: Mode & Page Navigation */}
        {numPages > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* View Mode Toggle */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '2px' }}>
              <button
                type="button"
                onClick={() => setViewMode('scroll')}
                style={{
                  background: viewMode === 'scroll' ? 'var(--primary)' : 'transparent',
                  color: '#fff', border: 'none', borderRadius: '4px',
                  padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '4px'
                }}
                title="Continuous Scroll Mode"
              >
                <Layers size={13} /> <span className="hide-on-mobile">All Pages</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('single')}
                style={{
                  background: viewMode === 'single' ? 'var(--primary)' : 'transparent',
                  color: '#fff', border: 'none', borderRadius: '4px',
                  padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '4px'
                }}
                title="Single Page Mode"
              >
                <BookOpen size={13} /> <span className="hide-on-mobile">Single Page</span>
              </button>
            </div>

            {/* Single Page Navigator */}
            {viewMode === 'single' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                  style={{
                    background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff',
                    borderRadius: '4px', padding: '4px 6px', cursor: 'pointer',
                    opacity: currentPage <= 1 ? 0.3 : 1
                  }}
                >
                  <ChevronLeft size={15} />
                </button>
                <span style={{ fontSize: '0.75rem', color: '#cbd5e1', padding: '0 4px', fontWeight: 600 }}>
                  {currentPage} / {numPages}
                </span>
                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={currentPage >= numPages}
                  style={{
                    background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff',
                    borderRadius: '4px', padding: '4px 6px', cursor: 'pointer',
                    opacity: currentPage >= numPages ? 0.3 : 1
                  }}
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Right: Zoom Controls */}
        {numPages > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '2px 4px' }}>
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomScale <= 0.7}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '3px 5px', opacity: zoomScale <= 0.7 ? 0.3 : 1 }}
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)', minWidth: '38px', textAlign: 'center', fontWeight: 600 }}>
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomScale >= 2.5}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '3px 5px', opacity: zoomScale >= 2.5 ? 0.3 : 1 }}
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
              {zoomScale !== 1.0 && (
                <button
                  type="button"
                  onClick={handleResetZoom}
                  title="Reset Zoom"
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '3px' }}
                >
                  <RotateCcw size={12} />
                </button>
              )}
            </div>

            {viewMode === 'scroll' && (
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '4px 6px', borderRadius: '4px' }}>
                {numPages} pages
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Scrollable Canvas Area */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'auto',
          padding: '16px 12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: '#090d16',
          minHeight: '280px'
        }}
      >
        {/* Loading Spinner */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: '#94a3b8', gap: '12px' }}>
            <Loader2 size={32} className="spinning" style={{ color: 'var(--primary)' }} />
            <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>Loading document pages...</div>
          </div>
        )}

        {/* Error / Mobile fallback notice */}
        {error && (
          <div style={{
            maxWidth: '480px', width: '100%', margin: '40px auto', padding: '24px',
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px', textAlign: 'center', color: '#fff'
          }}>
            <AlertCircle size={36} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
            <h4 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 600 }}>PDF Mobile Notice</h4>
            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5', margin: '0 0 16px' }}>
              Your device can download or open the PDF directly in your native reader:
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

        {/* Scroll Mode: All Pages */}
        {!loading && !error && pdfDoc && viewMode === 'scroll' && (
          Array.from({ length: numPages }, (_, idx) => idx + 1).map((pNum) => (
            <PdfPageItem
              key={pNum}
              pdfDoc={pdfDoc}
              pageNum={pNum}
              zoomScale={zoomScale}
              containerWidth={containerWidth}
            />
          ))
        )}

        {/* Single Page Mode */}
        {!loading && !error && pdfDoc && viewMode === 'single' && (
          <PdfPageItem
            key={currentPage}
            pdfDoc={pdfDoc}
            pageNum={currentPage}
            zoomScale={zoomScale}
            containerWidth={containerWidth}
          />
        )}
      </div>
    </div>
  );
}

/**
 * FileViewer Modal – renders file data inline inside a modal.
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
      console.error('Failed to create Blob URL:', e);
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
          background: 'rgba(0,0,0,0.3)',
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

          {/* Header Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {!isPdf && (
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
                <Download size={14} /> <span>Download</span>
              </button>
            )}

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

          {/* ── PDF: Mobile & Desktop Canvas Viewer ── */}
          {isPdf && (
            <MobileFriendlyPdfViewer
              fileData={fileData}
              objectUrl={objectUrl}
              fileName={fileName}
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
