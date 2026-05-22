// Jest-friendly ZIP validation utility that mirrors src/utils/zipValidator.ts
// Avoids import.meta.env by using a test override on globalThis.

const DEFAULT_MAX_SIZE_MB = 10;
const MAX_SIZE_MB: number = Number((globalThis as any).__TEST_MAX_UPLOAD_MB__ ?? DEFAULT_MAX_SIZE_MB);
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const MIN_SIZE_BYTES = 22; // Minimum size for a valid (empty) ZIP file

const ZIP_SIGNATURES: number[][] = [
  [0x50, 0x4b, 0x03, 0x04],
  [0x50, 0x4b, 0x05, 0x06],
  [0x50, 0x4b, 0x07, 0x08],
];

function hasValidZipSignature(buffer: ArrayBuffer): boolean {
  if (!buffer || buffer.byteLength < 4) return false;
  const view = new Uint8Array(buffer, 0, 4);
  return ZIP_SIGNATURES.some((sig) => sig.every((b, i) => view[i] === b));
}

async function verifyZipStructure(file: File): Promise<boolean> {
  try {
    const tailSize = Math.min(file.size, 22);
    const tail = await file.slice(file.size - tailSize).arrayBuffer();
    const tailView = new Uint8Array(tail);
    const hasEOCD = tailView[0] === 0x50 && tailView[1] === 0x4b && tailView[2] === 0x05 && tailView[3] === 0x06;
    return hasEOCD;
  } catch {
    return false;
  }
}

export interface ZipValidationResult {
  valid: boolean;
  error?: string;
  details?: { fileName: string; fileSize: number; maxSize: number };
}

export async function validateZipFile(file: File | null): Promise<ZipValidationResult> {
  if (!file) {
    return { valid: false, error: 'No file selected. Please choose a ZIP file to upload.' };
  }
  const fileNameWithoutExt = file.name.toLowerCase().replace(/\.zip$/i, '');
  if (!fileNameWithoutExt || fileNameWithoutExt.trim() === '' || fileNameWithoutExt === '.') {
    return {
      valid: false,
      error: `Invalid file name: "${file.name}". File name cannot be empty or just an extension.`,
      details: { fileName: file.name, fileSize: file.size, maxSize: MAX_SIZE_BYTES },
    };
  }

  if (!file.name.toLowerCase().endsWith('.zip')) {
    return {
      valid: false,
      error: `Invalid file type: "${file.name}". Only .zip files are accepted.`,
      details: { fileName: file.name, fileSize: file.size, maxSize: MAX_SIZE_BYTES },
    };
  }

  if (file.size < MIN_SIZE_BYTES) {
    return {
      valid: false,
      error: 'File is too small to be a valid ZIP archive. The file may be corrupted.',
      details: { fileName: file.name, fileSize: file.size, maxSize: MAX_SIZE_BYTES },
    };
  }

  if (file.size > MAX_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File is too large (${sizeMB} MB). Maximum allowed size is ${MAX_SIZE_MB} MB.`,
      details: { fileName: file.name, fileSize: file.size, maxSize: MAX_SIZE_BYTES },
    };
  }

  try {
    const header = await file.slice(0, 4).arrayBuffer();
    if (!hasValidZipSignature(header)) {
      return {
        valid: false,
        error: 'File is not a valid ZIP archive. The file may be corrupted or renamed.',
        details: { fileName: file.name, fileSize: file.size, maxSize: MAX_SIZE_BYTES },
      };
    }
  } catch {
    return {
      valid: false,
      error: 'Unable to read file. Please try again or choose a different file.',
      details: { fileName: file.name, fileSize: file.size, maxSize: MAX_SIZE_BYTES },
    };
  }

  const hasValidStructure = await verifyZipStructure(file);
  if (!hasValidStructure) {
    return {
      valid: false,
      error: 'ZIP file structure is invalid or corrupted. Please verify the file integrity.',
      details: { fileName: file.name, fileSize: file.size, maxSize: MAX_SIZE_BYTES },
    };
  }

  return { valid: true, details: { fileName: file.name, fileSize: file.size, maxSize: MAX_SIZE_BYTES } };
}

export function isZipExtension(fileName: string): boolean {
  return /\.zip$/i.test(fileName);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function getMaxFileSize(): { bytes: number; mb: number } {
  return { bytes: MAX_SIZE_BYTES, mb: MAX_SIZE_MB };
}
