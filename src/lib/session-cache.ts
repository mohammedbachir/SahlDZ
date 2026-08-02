const KEY = "sahl_dz_auth_cache";

type SessionCache = { uid: string; to?: string; ts?: number };

function readRaw(): SessionCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.uid) return parsed as SessionCache;
    return null;
  } catch {
    return null;
  }
}

export function cacheSession(uid: string, to?: string): void {
  if (typeof window === "undefined") return;
  try {
    const prev = readRaw();
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ uid, to: to ?? prev?.to, ts: Date.now() }),
    );
  } catch {
    // ignore storage errors
  }
}

export function readSessionCache(): SessionCache | null {
  return readRaw();
}

export function clearSessionCache(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore storage errors
  }
}
