import { beforeEach, describe, expect, it } from "vitest";

/** A minimal in-memory Storage, since the vitest environment here is plain Node (no DOM). */
class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear(): void {
    this.data.clear();
  }
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

(globalThis as { localStorage?: Storage }).localStorage = new MemoryStorage();

const { loadSession, saveSession, clearSession } = await import("./session.js");

beforeEach(() => {
  globalThis.localStorage.clear();
});

describe("loadSession", () => {
  it("returns null when nothing has been stored", () => {
    expect(loadSession()).toBeNull();
  });

  it("returns a previously saved session", () => {
    saveSession({ code: "ABCD", name: "Alice", token: "secret" });
    expect(loadSession()).toEqual({ code: "ABCD", name: "Alice", token: "secret" });
  });

  it("returns null for malformed stored JSON", () => {
    globalThis.localStorage.setItem("expkit2:session", "{not json");
    expect(loadSession()).toBeNull();
  });

  it("returns null when the stored value is missing required fields", () => {
    globalThis.localStorage.setItem("expkit2:session", JSON.stringify({ code: "ABCD" }));
    expect(loadSession()).toBeNull();
  });
});

describe("clearSession", () => {
  it("removes a stored session", () => {
    saveSession({ code: "ABCD", name: "Alice", token: "secret" });
    clearSession();
    expect(loadSession()).toBeNull();
  });
});
