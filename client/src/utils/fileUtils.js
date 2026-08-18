/**
 * Safe file helpers for mobile & desktop browsers.
 * Handles base64 conversion to Blob, downloads, and opening in external viewers.
 */

export function base64ToBlob(base64Data, defaultMime = 'application/pdf') {
  if (!base64Data) return null;
  try {
    // If it's already a Blob or blob URL, return as-is or handle
    if (base64Data.startsWith('blob:')) {
      return null;
    }

    const parts = base64Data.split(',');
    const rawBase64 = parts[1] || parts[0];
    const byteString = atob(rawBase64);
    const mimeString = parts[0].includes(':')
      ? parts[0].split(':')[1].split(';')[0]
      : defaultMime;

    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  } catch (err) {
    console.error('Failed to convert base64 to Blob:', err);
    return null;
  }
}

export function base64ToUint8Array(base64Data) {
  if (!base64Data) return null;
  try {
    const parts = base64Data.split(',');
    const rawBase64 = parts[1] || parts[0];
    const byteString = atob(rawBase64);
    const ia = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return ia;
  } catch (err) {
    console.error('Failed to convert base64 to Uint8Array:', err);
    return null;
  }
}

export function downloadFileData(fileData, fileName = 'document.pdf', fileType = 'pdf') {
  if (!fileData) return;
  try {
    let url;
    let cleanup = false;

    if (fileData.startsWith('blob:')) {
      url = fileData;
    } else if (fileData.startsWith('data:')) {
      const mime = fileType === 'pdf' ? 'application/pdf' : undefined;
      const blob = base64ToBlob(fileData, mime);
      if (blob) {
        url = URL.createObjectURL(blob);
        cleanup = true;
      } else {
        url = fileData;
      }
    } else {
      url = fileData;
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || `document.${fileType || 'pdf'}`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (cleanup && url.startsWith('blob:')) {
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    }
  } catch (err) {
    console.error('Download error:', err);
    // Fallback: window.open
    window.open(fileData, '_blank');
  }
}

export function openFileDataInNewTab(fileData, fileType = 'pdf') {
  if (!fileData) return;
  try {
    if (fileData.startsWith('data:')) {
      const mime = fileType === 'pdf' ? 'application/pdf' : undefined;
      const blob = base64ToBlob(fileData, mime);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (!win) {
          // Popup blocked fallback
          window.location.href = url;
        }
        return;
      }
    }
    window.open(fileData, '_blank');
  } catch (err) {
    console.error('Open in new tab error:', err);
    window.open(fileData, '_blank');
  }
}
