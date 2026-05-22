// Converted from Vitest to Jest
import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";

// Helper to (re)load the module with a clean state and configured env
async function loadService() {
  jest.resetModules();

  // Ensure jsdom window exists
  if (!globalThis.window) globalThis.window = {} as any;
  // Provide API base URL when DEV=false under Vitest
  (window as any).configs = { API_BASE_URL: "http://api.local" };

  // Dynamic import to re-evaluate top-level code each time
  const mod = await import("../../../services/api.service");
  const service = mod.apiService as {
    setTokenGetter: (fn: () => Promise<string>) => void;
    setSignOut: (fn: () => Promise<void> | Promise<boolean>) => void;
    reset: () => void;
    get: <T>(endpoint: string) => Promise<T>;
    post: <T>(endpoint: string, data?: unknown) => Promise<T>;
    put: <T>(endpoint: string, data?: unknown) => Promise<T>;
    delete: <T>(endpoint: string) => Promise<T>;
    uploadFile: (file: File) => Promise<{ url: string }>;
  };
  return service;
}

// Lightweight Response mock to avoid relying on global Web Response
type MockInit = { status?: number; statusText?: string; headers?: Record<string, string> };
function makeResponse(body: unknown = undefined, init: MockInit = {}) {
  const status = init.status ?? 200;
  const ok = status >= 200 && status < 300;
  const headersLower: Record<string, string> = {};
  if (init.headers) {
    for (const [k, v] of Object.entries(init.headers)) headersLower[k.toLowerCase()] = v;
  }
  return {
    ok,
    status,
    statusText: init.statusText ?? "",
    headers: {
      get(name: string) {
        return headersLower[name.toLowerCase()] ?? null;
      },
    },
    async json() {
      return body;
    },
    async text() {
      return typeof body === "string" ? body : JSON.stringify(body);
    },
  } as unknown as Response;
}

function jsonResponse(body: unknown, init: MockInit = {}) {
  return makeResponse(body, { status: 200, headers: { "Content-Type": "application/json" }, ...init });
}

describe("ApiService", () => {
  let fetchSpy: jest.MockedFunction<(...args: any[]) => Promise<Response>>;

  beforeEach(() => {
    // Ensure a mock fetch exists on global
  fetchSpy = jest.fn() as jest.MockedFunction<(...args: any[]) => Promise<Response>>;
  (globalThis as any).fetch = fetchSpy;
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete (globalThis as any).fetch;
  });

  it("adds Authorization and JSON headers and returns parsed data on GET", async () => {
    const service = await loadService();
    service.setTokenGetter(async () => "token-123");

    const payload = { ok: true };
    fetchSpy.mockResolvedValueOnce(jsonResponse(payload));

    const res = await service.get<typeof payload>("/users");

    expect(res).toEqual(payload);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://api.local/users");
    expect(options.credentials).toBe("include");
    const headers = options.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["Authorization"]).toBe("Bearer token-123");
  });

  it("POST sends body and parses JSON", async () => {
    const service = await loadService();
    service.setTokenGetter(async () => "tkn");

    fetchSpy.mockResolvedValueOnce(jsonResponse({ id: 1 }));

    const res = await service.post<{ id: number }>("/items", { name: "A" });
    expect(res).toEqual({ id: 1 });

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe("POST");
    expect(options.body).toBe(JSON.stringify({ name: "A" }));
  });

  it("returns undefined for 204 No Content", async () => {
    const service = await loadService();
    service.setTokenGetter(async () => "tkn");

  fetchSpy.mockResolvedValueOnce(makeResponse(undefined, { status: 204, statusText: "No Content" }));

    const res = await service.delete<unknown>("/items/1");
    expect(res).toBeUndefined();
  });

  it("returns undefined for non-JSON content-type", async () => {
    const service = await loadService();
    service.setTokenGetter(async () => "tkn");

  fetchSpy.mockResolvedValueOnce(makeResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" } }));

    const res = await service.get<unknown>("/health");
    expect(res).toBeUndefined();
  });

  it("throws with server-provided error message on non-OK response", async () => {
    const service = await loadService();
    service.setTokenGetter(async () => "tkn");

    fetchSpy.mockResolvedValueOnce(
      jsonResponse({ message: "Bad things" }, { status: 400, statusText: "Bad Request" }),
    );

    await expect(service.get("/oops"))
      .rejects.toThrow("Bad things");
  });

  it("throws when no access token available for JSON requests", async () => {
    const service = await loadService();
    // Setter returns empty string -> treated as missing
    service.setTokenGetter(async () => "");

    await expect(service.get("/users"))
      .rejects.toThrow("No access token available. Please try again.");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uploadFile posts binary with auth and returns URL", async () => {
    const service = await loadService();
    service.setTokenGetter(async () => "up-token");

    const file = new File(["hello"], "greet.txt", { type: "text/plain" });
    fetchSpy.mockResolvedValueOnce(jsonResponse({ downloadUrl: "http://cdn/test" }));

    const out = await service.uploadFile(file);
    expect(out).toEqual({ url: "http://cdn/test" });

    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://api.local/files?fileName=greet.txt");
    expect(options.method).toBe("POST");
    const headers = options.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer up-token");
    // Body should be sent as the File itself (binary)
    expect(options.body).toBe(file);
  });

  it("uploadFile triggers signOut and throws on 401/403", async () => {
    const service = await loadService();
    service.setTokenGetter(async () => "up-token");
  const signOut = jest.fn(async (): Promise<void> => {});
    service.setSignOut(signOut);

    const file = new File(["x"], "a.txt", { type: "text/plain" });
  fetchSpy.mockResolvedValueOnce(makeResponse(undefined, { status: 401 }));

    await expect(service.uploadFile(file))
      .rejects.toThrow("Session expired. Please sign in again.");
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("uploadFile triggers signOut when token getter fails", async () => {
    const service = await loadService();
  const signOut = jest.fn(async (): Promise<void> => {});
    service.setSignOut(signOut);
    service.setTokenGetter(async () => {
      throw new Error("token error");
    });

    const file = new File(["x"], "b.txt", { type: "text/plain" });
    await expect(service.uploadFile(file))
      .rejects.toThrow("Session expired. Please sign in again.");
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
