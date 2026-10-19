// Session persistence (ticket 13): survives a full page reload, not just an in-tab socket
// reconnect, so a refreshed tab can still reclaim its seat using the server-issued token.

export interface StoredSession {
  code: string;
  name: string;
  token: string;
}

const STORAGE_KEY = "expkit2:session";

/** localStorage can throw (private browsing, disabled storage) or simply not exist outside a
 * browser — never let session persistence crash the app. */
function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function isStoredSession(value: unknown): value is StoredSession {
  const v = value as Partial<StoredSession> | null;
  return (
    typeof v?.code === "string" && typeof v?.name === "string" && typeof v?.token === "string"
  );
}

export function loadSession(): StoredSession | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isStoredSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSession(session: StoredSession): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore — e.g. quota exceeded
  }
}

export function clearSession(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
