import { useEffect, useState, useRef } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';

/**
 * FileViewer – renders file data inline inside a modal.
 * Supports full screen mode toggle for students reading notes.
 * Converts base64 to Blob URLs to bypass browser restrictions on rendering raw data: URIs in iframes.
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

    try {
      const parts = fileData.split(',');
      const byteString = atob(parts[1] || parts[0]);
      const mimeString = parts[0].split(':')[1]?.split(';')[0] || 'application/octet-stream';

      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }

      const blob = new Blob([ab], { type: mimeString });
      const url = URL.createObjectURL(blob);
      setObjectUrl(url);

      // Clean up the URL when component unmounts
      return () => {
        URL.revokeObjectURL(url);
      };
    } catch (e) {
      console.error('Failed to create Blob URL from base64:', e);
      setObjectUrl(fileData);
    }
  }, [fileData]);

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
        padding: isFullScreen ? 0 : '20px',
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
          maxWidth: isFullScreen ? '100vw' : '960px',
          height: isFullScreen ? '100vh' : 'auto',
          maxHeight: isFullScreen ? '100vh' : '92vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: isFullScreen ? 'none' : '0 25px 60px rgba(0,0,0,0.7)',
          transition: 'all 0.2s ease',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid var(--border)',
          background: 'rgba(0,0,0,0.2)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <span style={{ fontSize: '1.2rem' }}>
              {isPdf ? '📄' : isImage ? '🖼️' : isVideo ? '🎬' : isWord ? '📝' : isPpt ? '📊' : '📁'}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {title}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{fileName}</div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={toggleFullScreen}
              title={isFullScreen ? 'Exit Full Screen' : 'Full Screen Mode'}
              className="btn btn-secondary btn-sm"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600,
                background: isFullScreen ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
                color: '#fff', border: '1px solid var(--border)',
                borderRadius: '6px', cursor: 'pointer'
              }}
            >
              {isFullScreen ? (
                <>
                  <Minimize2 size={15} /> Exit Full Screen
                </>
              ) : (
                <>
                  <Maximize2 size={15} /> 🖥️ Full Screen
                </>
              )}
            </button>

            <button
              onClick={onClose}
              title="Close viewer"
              style={{
                background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px', cursor: 'pointer', padding: '6px 8px',
                color: '#ef4444', display: 'flex', alignItems: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflow: 'auto', padding: isPdf || isVideo ? 0 : '24px', background: isPdf ? '#1a1a2e' : 'transparent' }}>

          {/* ── PDF ── */}
          {isPdf && objectUrl && (
            <iframe
              src={objectUrl}
              title={fileName}
              style={{
                width: '100%',
                height: isFullScreen ? 'calc(100vh - 58px)' : '75vh',
                border: 'none', display: 'block'
              }}
            />
          )}

          {/* ── Image ── */}
          {isImage && objectUrl && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: isFullScreen ? 'calc(100vh - 58px)' : '75vh', width: '100%'
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
              height: isFullScreen ? 'calc(100vh - 58px)' : '75vh', background: '#000'
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
              textAlign: 'center', padding: '48px 24px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px'
            }}>
              <div style={{ fontSize: '4rem' }}>{isWord ? '📝' : isPpt ? '📊' : '📁'}</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{fileName}</div>
              <div style={{
                color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.7',
                maxWidth: '400px', textAlign: 'center'
              }}>
                {isWord
                  ? 'Microsoft Word documents cannot be previewed directly in the browser.'
                  : isPpt
                    ? 'PowerPoint files cannot be previewed directly in the browser.'
                    : 'This file type cannot be previewed in-app.'}
              </div>
              <div style={{
                padding: '14px 18px', background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.3)', borderRadius: 'var(--radius-sm)',
                color: 'var(--primary)', fontSize: '0.85rem', maxWidth: '380px'
              }}>
                💡 Ask your teacher for a printed copy, or contact the school to get access through a compatible application.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
