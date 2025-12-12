// Environment helpers that avoid using import.meta for Jest compatibility
export function isDev(): boolean {
  try {
    // Prefer NODE_ENV in tests and Node contexts
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
      return true;
    }
  } catch {}
  try {
    // Heuristic for browser dev server
    if (typeof window !== 'undefined' && typeof location !== 'undefined') {
      const host = location.hostname;
      if (host === 'localhost' || host === '127.0.0.1') return true;
    }
  } catch {}
  return false;
}
