/**
 * ZIP File Validation Utility
 *
 * Comprehensive validation for ZIP files before upload.
 * Includes magic byte verification, size limits, and content checks.
 */

// Configuration
const DEFAULT_MAX_SIZE_MB = 20;
// Guard import.meta for environments where it may be undefined (e.g., Cypress unit runner)
const __env: any = (typeof import.meta !== 'undefined' && (import.meta as any) && (import.meta as any).env)
  ? (import.meta as any).env
  : {};
const MAX_SIZE_MB = Number((__env as any).VITE_MAX_UPLOAD_MB ?? DEFAULT_MAX_SIZE_MB);
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const MIN_SIZE_BYTES = 22; // Minimum size for a valid (empty) ZIP file

/**
 * Known ZIP file signatures (magic bytes)
 * - PK\x03\x04: Local file header (standard ZIP files)
 * - PK\x05\x06: End of central directory (empty ZIP files)
 * - PK\x07\x08: Spanned archive signature
 */
const ZIP_SIGNATURES: number[][] = [
  [0x50, 0x4b, 0x03, 0x04], // Local file header (most common)
  [0x50, 0x4b, 0x05, 0x06], // End of central directory (empty zips)
  [0x50, 0x4b, 0x07, 0x08], // Spanned archive
];

/**
 * Check if buffer starts with valid ZIP magic bytes
 */
function hasValidZipSignature(buffer: ArrayBuffer): boolean {
  if (!buffer || buffer.byteLength < 4) {
    return false;
  }

  const view = new Uint8Array(buffer, 0, 4);
  return ZIP_SIGNATURES.some((signature) =>
    signature.every((byte, index) => view[index] === byte),
  );
}

/**
 * Verify ZIP file structure by checking central directory
 */
async function verifyZipStructure(file: File): Promise<boolean> {
  try {
    // Read last 22 bytes (minimum size of End of Central Directory Record)
    const tailSize = Math.min(file.size, 22);
    const tail = await file.slice(file.size - tailSize).arrayBuffer();

    // Check for End of Central Directory signature at the end
    const tailView = new Uint8Array(tail);
    const hasEOCD =
      tailView[0] === 0x50 &&
      tailView[1] === 0x4b &&
      tailView[2] === 0x05 &&
      tailView[3] === 0x06;

    return hasEOCD;
  } catch (error) {
    console.error("Error verifying ZIP structure:", error);
    return false;
  }
}

/**
 * Validation result interface
 */
export interface ZipValidationResult {
  valid: boolean;
  error?: string;
  details?: {
    fileName: string;
    fileSize: number;
    maxSize: number;
  };
}

/**
 * Comprehensive ZIP file validation
 *
 * Performs multiple checks:
 * 1. File existence
 * 2. File name validity
 * 3. File extension
 * 4. File size limits
 * 5. Magic byte verification
 * 6. ZIP structure integrity
 *
 * @param file - The file to validate
 * @returns Validation result with error message if invalid
 */
export async function validateZipFile(
  file: File | null,
): Promise<ZipValidationResult> {
  // Check if file exists
  if (!file) {
    return {
      valid: false,
      error: "No file selected. Please choose a ZIP file to upload.",
    };
  }

  // Check if file has a valid name (not just an extension)
  const fileNameWithoutExt = file.name.toLowerCase().replace(/\.zip$/i, "");
  if (
    !fileNameWithoutExt ||
    fileNameWithoutExt.trim() === "" ||
    fileNameWithoutExt === "."
  ) {
    return {
      valid: false,
      error: `Invalid file name: "${file.name}". File name cannot be empty or just an extension.`,
      details: {
        fileName: file.name,
        fileSize: file.size,
        maxSize: MAX_SIZE_BYTES,
      },
    };
  }

  // Check file extension
  if (!file.name.toLowerCase().endsWith(".zip")) {
    return {
      valid: false,
      error: `Invalid file type: "${file.name}". Only .zip files are accepted.`,
      details: {
        fileName: file.name,
        fileSize: file.size,
        maxSize: MAX_SIZE_BYTES,
      },
    };
  }

  // Check minimum size
  if (file.size < MIN_SIZE_BYTES) {
    return {
      valid: false,
      error:
        "File is too small to be a valid ZIP archive. The file may be corrupted.",
      details: {
        fileName: file.name,
        fileSize: file.size,
        maxSize: MAX_SIZE_BYTES,
      },
    };
  }

  // Check maximum size
  if (file.size > MAX_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File is too large (${sizeMB} MB). Maximum allowed size is ${MAX_SIZE_MB} MB.`,
      details: {
        fileName: file.name,
        fileSize: file.size,
        maxSize: MAX_SIZE_BYTES,
      },
    };
  }

  // Check magic bytes (file signature)
  try {
    const header = await file.slice(0, 4).arrayBuffer();

    if (!hasValidZipSignature(header)) {
      return {
        valid: false,
        error:
          "File is not a valid ZIP archive. The file may be corrupted or renamed.",
        details: {
          fileName: file.name,
          fileSize: file.size,
          maxSize: MAX_SIZE_BYTES,
        },
      };
    }
  } catch (error) {
    console.error("Error reading file header:", error);
    return {
      valid: false,
      error:
        "Unable to read file. Please try again or choose a different file.",
      details: {
        fileName: file.name,
        fileSize: file.size,
        maxSize: MAX_SIZE_BYTES,
      },
    };
  }

  // Verify ZIP structure (End of Central Directory)
  const hasValidStructure = await verifyZipStructure(file);
  if (!hasValidStructure) {
    return {
      valid: false,
      error:
        "ZIP file structure is invalid or corrupted. Please verify the file integrity.",
      details: {
        fileName: file.name,
        fileSize: file.size,
        maxSize: MAX_SIZE_BYTES,
      },
    };
  }

  // All checks passed
  return {
    valid: true,
    details: {
      fileName: file.name,
      fileSize: file.size,
      maxSize: MAX_SIZE_BYTES,
    },
  };
}

/**
 * Quick validation for file extension only (for UI feedback)
 */
export function isZipExtension(fileName: string): boolean {
  return /\.zip$/i.test(fileName);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get maximum allowed file size
 */
export function getMaxFileSize(): { bytes: number; mb: number } {
  return {
    bytes: MAX_SIZE_BYTES,
    mb: MAX_SIZE_MB,
  };
}
