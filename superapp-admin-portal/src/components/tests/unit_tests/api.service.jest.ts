// Jest-friendly version of api.service avoiding import.meta.env

class ApiService {
  private baseUrl: string | undefined;
  private getAccessToken: (() => Promise<string>) | null = null;
  private signOut: (() => Promise<void>) | null = null;
  private tokenGetterReady: Promise<void>;
  private resolveTokenGetter: (() => void) | null = null;

  constructor() {
    // Use window.configs for tests; default to http://api.local when not provided
    this.baseUrl = (globalThis as any).window?.configs?.API_BASE_URL ?? 'http://api.local';

    if (!this.baseUrl) {
      throw new Error('API_BASE_URL is not configured. Please check public/config.js');
    }

    this.tokenGetterReady = new Promise((resolve) => {
      this.resolveTokenGetter = resolve;
    });
  }

  setTokenGetter(getter: () => Promise<string>) {
    this.getAccessToken = getter;
    if (this.resolveTokenGetter) this.resolveTokenGetter();
  }

  setSignOut(signOutFn: () => Promise<void> | Promise<boolean>) {
    this.signOut = async () => { await signOutFn(); };
  }

  reset() {
    this.getAccessToken = null;
    this.signOut = null;
    this.tokenGetterReady = new Promise((resolve) => { this.resolveTokenGetter = resolve; });
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    await this.tokenGetterReady;
    const token = this.getAccessToken ? await this.getAccessToken() : null;
    if (!token) {
      throw new Error('No access token available. Please try again.');
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
      Authorization: `Bearer ${token}`,
    };

    const response = await (globalThis as any).fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `HTTP ${response.status}: ${response.statusText}` }));
      throw new Error(error.message || 'Request failed');
    }

    const contentType = response.headers.get('content-type');
    if (response.status === 204 || response.status === 201 || !contentType?.includes('application/json')) {
      return undefined as T;
    }

    const text = await response.text();
    if (!text || text.trim() === '') return undefined as T;
    return JSON.parse(text) as T;
  }

  async get<T>(endpoint: string): Promise<T> { return this.request<T>(endpoint, { method: 'GET' }); }
  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body: data ? JSON.stringify(data) : undefined });
  }
  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body: data ? JSON.stringify(data) : undefined });
  }
  async delete<T>(endpoint: string): Promise<T> { return this.request<T>(endpoint, { method: 'DELETE' }); }

  async uploadFile(file: File): Promise<{ url: string }> {
    let token: string | null = null;
    try { token = this.getAccessToken ? await this.getAccessToken() : null; } catch { token = null; }
    if (!token || token.trim() === '') {
      if (this.signOut) await this.signOut();
      throw new Error('Session expired. Please sign in again.');
    }
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    const response = await (globalThis as any).fetch(`${this.baseUrl}/files?fileName=${encodeURIComponent(file.name)}`, {
      method: 'POST', headers, body: file, credentials: 'include',
    });
    if (response.status === 401 || response.status === 403) {
      if (this.signOut) await this.signOut();
      throw new Error('Session expired. Please sign in again.');
    }
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `HTTP ${response.status}: ${response.statusText}` }));
      throw new Error(error.message || 'Upload failed');
    }
    const result = await response.json();
    return { url: result.downloadUrl };
  }
}

export const apiService = new ApiService();
