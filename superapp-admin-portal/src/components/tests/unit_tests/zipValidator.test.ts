import { describe, it, expect, beforeEach } from '@jest/globals';

// Import from real path; Jest moduleNameMapper will route to jest variant we set below via manual jest.mock.

// Rewire the module to point to our Jest-friendly implementation
jest.mock('../../../utils/zipValidator', () => require('./zipValidator.jest'));

import { validateZipFile, isZipExtension, formatFileSize, getMaxFileSize } from '../../../utils/zipValidator';

class MockFile {
  name: string;
  type: string;
  private data: Uint8Array;
  size: number;
  constructor(name: string, data: Uint8Array, type = 'application/zip') {
    this.name = name;
    this.type = type;
    this.data = data;
    this.size = data.byteLength;
  }
  slice(start?: number, end?: number) {
    const s = Math.max(0, start ?? 0);
    const e = Math.min(this.size, end ?? this.size);
    const view = this.data.subarray(s, e);
    return {
      arrayBuffer: async () =>
        view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength),
    };
  }
}

function makeFile(name: string, bytes: number[], extraBytes: number[] = []): File {
  const arr = Uint8Array.from([...bytes, ...extraBytes]);
  return new MockFile(name, arr) as unknown as File;
}

// ZIP signatures
const PK_LOCAL = [0x50, 0x4b, 0x03, 0x04];
const PK_EOCD = [0x50, 0x4b, 0x05, 0x06];

describe('zipValidator', () => {
  beforeEach(() => {
    (globalThis as any).__TEST_MAX_UPLOAD_MB__ = 10; // ensure consistent size in tests
  });

  it('isZipExtension should detect .zip (case-insensitive)', () => {
    expect(isZipExtension('file.zip')).toBe(true);
    expect(isZipExtension('FILE.ZIP')).toBe(true);
    expect(isZipExtension('file.ZiP')).toBe(true);
    expect(isZipExtension('file.txt')).toBe(false);
  });

  it('formatFileSize should format bytes', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
  });

  it('getMaxFileSize should reflect test override', () => {
    expect(getMaxFileSize()).toEqual({ bytes: 10 * 1024 * 1024, mb: 10 });
  });

  it('validateZipFile should error when file is null', async () => {
    const res = await validateZipFile(null);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/No file selected/);
  });

  it('rejects invalid file name (just extension)', async () => {
    const file = makeFile('.zip', PK_LOCAL, new Array(30).fill(0));
    const res = await validateZipFile(file);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/Invalid file name/);
  });

  it('rejects wrong extension', async () => {
    const file = makeFile('archive.txt', PK_LOCAL, new Array(30).fill(0));
    const res = await validateZipFile(file);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/Only \.zip files are accepted/);
  });

  it('rejects too small files (< 22 bytes)', async () => {
    const small = makeFile('tiny.zip', [1, 2, 3]);
    const res = await validateZipFile(small);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/too small/);
  });

  it('rejects when header does not contain ZIP signature', async () => {
    const file = makeFile('bad.zip', [0, 1, 2, 3], new Array(30).fill(0));
    const res = await validateZipFile(file);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/not a valid ZIP/);
  });

  it('rejects when structure check fails (no EOCD at end)', async () => {
    // Valid header but tail does not start with EOCD (tail starts with zeros)
    const body = new Array(40).fill(0);
    const file = makeFile('struct.zip', PK_LOCAL, body);
    const res = await validateZipFile(file);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/structure is invalid/);
  });

  it('accepts valid minimal ZIP (EOCD present at tail)', async () => {
    // Ensure last 22 bytes (minimum EOCD record) start with EOCD signature
    const padding = new Array(10).fill(0);
    const eocdPadding = new Array(18).fill(0); // EOCD minimal record size is 22 bytes
    const file = makeFile('ok.zip', PK_LOCAL, [...padding, ...PK_EOCD, ...eocdPadding]);
    const res = await validateZipFile(file);
    expect(res.valid).toBe(true);
    expect(res.details?.fileName).toBe('ok.zip');
  });

  it('rejects files larger than configured maximum', async () => {
    const limit = getMaxFileSize().bytes;
    // Create a buffer slightly larger than limit with a valid ZIP header
    const big = new Uint8Array(limit + 1000);
    big.set(PK_LOCAL, 0);
    const file = new MockFile('big.zip', big) as unknown as File;
    const res = await validateZipFile(file);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/Maximum allowed size/);
  });
});
