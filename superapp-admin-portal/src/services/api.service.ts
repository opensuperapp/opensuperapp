/**
 * API Service
 *
 * Centralized API client for making HTTP requests
 */

class ApiService {
  private baseUrl: string | undefined;
  private getAccessToken: (() => Promise<string>) | null = null;
  private signOut: (() => Promise<void>) | null = null;
  private tokenGetterReady: Promise<void>;
  private resolveTokenGetter: (() => void) | null = null;

  constructor() {
    // Use /api proxy in development, or configured URL in production
    const isDevelopment = import.meta.env.DEV;
    this.baseUrl = isDevelopment ? "/api" : window.configs?.API_BASE_URL;

    if (!this.baseUrl) {
      throw new Error(
        "API_BASE_URL is not configured. Please check public/config.js",
      );
    }

    // Create a promise that resolves when token getter is set
    this.tokenGetterReady = new Promise((resolve) => {
      this.resolveTokenGetter = resolve;
    });
  }

  /**
   * Set the access token getter function
   */
  setTokenGetter(getter: () => Promise<string>) {
    this.getAccessToken = getter;
    // Resolve the promise to signal token getter is ready
    if (this.resolveTokenGetter) {
      this.resolveTokenGetter();
    }
  }

  /**
   * Set the sign out function
   */
  setSignOut(signOutFn: () => Promise<void> | Promise<boolean>) {
    this.signOut = async () => {
      await signOutFn();
    };
  }

  /**
   * Reset the service (e.g., on logout)
   */
  reset() {
    this.getAccessToken = null;
    this.signOut = null;
    // Create a new promise for the next login
    this.tokenGetterReady = new Promise((resolve) => {
      this.resolveTokenGetter = resolve;
    });
  }

  /**
   * Make an authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    try {
      // Wait for token getter to be initialized
      await this.tokenGetterReady;

      // Get the access token from IDP
      const token = this.getAccessToken ? await this.getAccessToken() : null;

      if (!token) {
        console.error("No access token available");
        throw new Error("No access token available. Please try again.");
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      };

      // Add token as x-jwt-assertion header for development
      // headers["x-jwt-assertion"] = token;
      // for production
      headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
        credentials: "include",
      });

      if (response.status === 401) {
        if (this.signOut) {
          try { await this.signOut(); } catch { /* ignore */ }
        }
        const err401: any = new Error("Unauthorized");
        err401.status = 401;
        throw err401;
      }
      if (response.status === 403) {
        const err403: any = new Error("Not authorized");
        err403.status = 403;
        throw err403;
      }

      if (!response.ok) {
        const parsed = await response.json().catch(() => ({
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));
        const err: any = new Error(parsed.message || "Request failed");
        if (parsed && typeof parsed === 'object' && 'errors' in parsed) {
          err.errors = (parsed as any).errors;
        }
        throw err;
      }

      // Handle empty responses (204 No Content, 201 Created, or empty body)
      const contentType = response.headers.get("content-type");
      if (
        response.status === 204 ||
        response.status === 201 ||
        !contentType?.includes("application/json")
      ) {
        return undefined as T;
      }

      const text = await response.text();
      if (!text || text.trim() === "") {
        return undefined as T;
      }

      return JSON.parse(text) as T;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  /**
   * Upload file
   */
  async uploadFile(file: File): Promise<{ url: string }> {
    try {
      // E2E/dev bypass: if running tests and auth bypass is enabled, avoid real network
  const bypass =
        typeof window !== "undefined" &&
        (import.meta as any).env?.DEV &&
        window.localStorage?.getItem("e2e-auth") === "1" &&
        window.localStorage?.getItem("e2e-bypass-uploads") === "1";
  if (bypass) {
        return { url: `/uploads/${encodeURIComponent(file.name)}` };
      }

      console.log(
        "uploadFile called, getAccessToken exists?",
        !!this.getAccessToken,
      );

      let token: string | null = null;
      try {
        token = this.getAccessToken ? await this.getAccessToken() : null;
      } catch (error) {
        console.error("Error getting access token:", error);
        token = null;
      }

      if (!token || token.trim() === "") {
        if (this.signOut) {
          await this.signOut();
        }
        throw new Error("Session expired. Please sign in again.");
      }

      const formData = new FormData();
      formData.append("file", file);

      const headers: Record<string, string> = {
        // "x-jwt-assertion": token,
        "Authorization": `Bearer ${token}`,
        // Don't set Content-Type for FormData - browser will set it with boundary
      };

      const response = await fetch(
        `${this.baseUrl}/files?fileName=${encodeURIComponent(file.name)}`,
        {
          method: "POST",
          headers,
          body: file, // Send file directly as binary
          credentials: "include",
        },
      );

      if (response.status === 401) {
        console.warn("Authentication failed. Logging out...");
        if (this.signOut) {
          await this.signOut();
        }
        const err401: any = new Error("Unauthorized");
        err401.status = 401;
        throw err401;
      }
      if (response.status === 403) {
        const err403: any = new Error("Not authorized");
        err403.status = 403;
        throw err403;
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw new Error(error.message || "Upload failed");
      }

      const result = await response.json();
      return { url: result.downloadUrl };
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
