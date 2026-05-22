# ZIP File Validation

## Overview

Comprehensive ZIP file validation has been implemented to ensure file integrity and security before uploading to the backend.

## Features

### 1. **Multi-Layer Validation**

- File existence check
- File extension validation (.zip only)
- File size limits (configurable, default 100MB)
- Magic byte verification (ZIP file signatures)
- ZIP structure integrity check

### 2. **Validation Checks**

#### File Extension

- Only accepts files with `.zip` extension (case-insensitive)
- Prevents users from uploading renamed files

#### Size Limits

- **Minimum**: 22 bytes (minimum valid ZIP file size)
- **Maximum**: Configurable via `VITE_MAX_UPLOAD_MB` env variable (default: 100MB)
- Protects against corrupted or oversized files

#### Magic Bytes (File Signature)

Validates the first 4 bytes of the file against known ZIP signatures:

- `50 4B 03 04` - Standard ZIP local file header
- `50 4B 05 06` - Empty ZIP end of central directory
- `50 4B 07 08` - Spanned archive signature

#### Structure Integrity

- Checks for End of Central Directory (EOCD) signature
- Ensures the ZIP file structure is complete and not corrupted

### 3. **User-Friendly Error Messages**

The validation provides clear, actionable error messages:

- "No file selected. Please choose a ZIP file to upload."
- "Invalid file type: 'filename'. Only .zip files are accepted."
- "File is too small to be a valid ZIP archive. The file may be corrupted."
- "File is too large (X MB). Maximum allowed size is Y MB."
- "File is not a valid ZIP archive. The file may be corrupted or renamed."
- "ZIP file structure is invalid or corrupted. Please verify the file integrity."

## Implementation

### Files Created/Modified

#### New Files:

1. `/src/utils/zipValidator.ts` - Core validation logic
2. `/src/utils/index.ts` - Barrel export
3. `/src/utils/__tests__/zipValidator.test.ts` - Unit tests

#### Modified Files:

1. `/src/services/api.service.ts` - Added validation to `uploadFile()` method
2. `/src/components/AddVersionDialog.tsx` - Client-side validation on file select
3. `/src/components/AddMicroAppDialog.tsx` - Client-side validation on file select

### Usage

#### In Components:

```typescript
import { validateZipFile } from "../utils";

const handleFileSelect = async (file: File | null) => {
  if (file) {
    const validation = await validateZipFile(file);

    if (!validation.valid) {
      showNotification(validation.error || "Invalid file", "error");
      return;
    }

    // File is valid, proceed...
  }
};
```

#### In API Service:

```typescript
async uploadFile(file: File): Promise<{ url: string }> {
  // Automatic validation before upload
  const validation = await validateZipFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid ZIP file');
  }

  // Proceed with upload...
}
```

### Helper Functions

#### `isZipExtension(fileName: string): boolean`

Quick check for .zip extension (useful for UI feedback)

#### `formatFileSize(bytes: number): string`

Format file size for display (e.g., "1.5 MB")

#### `getMaxFileSize(): { bytes: number; mb: number }`

Get current size limits

## Configuration

Set maximum upload size via environment variable:

```bash
# .env
VITE_MAX_UPLOAD_MB=100
```

## Improvements Over Previous Implementation

1. **Better Error Messages**: More descriptive and actionable errors
2. **Structure Validation**: Added EOCD check for file integrity
3. **TypeScript Types**: Full type safety with detailed return types
4. **Helper Functions**: Additional utilities for file size formatting
5. **Configurable Limits**: Environment-based configuration
6. **Dual Validation**: Both client-side (UX) and API-side (security)
7. **Detailed Validation Results**: Returns file details along with validation status

## Security Benefits

- Prevents upload of non-ZIP files disguised with .zip extension
- Protects against corrupted or malicious files
- Enforces file size limits to prevent resource abuse
- Validates file structure to ensure completeness

## Testing

Run tests:

```bash
npm test src/utils/__tests__/zipValidator.test.ts
```

Test cases cover:

- Extension validation
- Size limit enforcement
- Magic byte verification
- File structure validation
- Error message clarity
