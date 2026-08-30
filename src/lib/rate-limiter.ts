const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 5 * 60 * 1000;

type RateLimitEntry = {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number;
};

function read(key: string): RateLimitEntry {
  try {
    const raw = window.localStorage.getItem(`sahldz-rate:${key}`);
    if (!raw) return { attempts: 0, firstAttemptAt: 0, lockedUntil: 0 };
    return JSON.parse(raw) as RateLimitEntry;
  } catch {
    return { attempts: 0, firstAttemptAt: 0, lockedUntil: 0 };
  }
}

function write(key: string, entry: RateLimitEntry) {
  try {
    window.localStorage.setItem(`sahldz-rate:${key}`, JSON.stringify(entry));
  } catch {
    // ignore storage errors
  }
}

export function checkRateLimit(key: string): {
  allowed: boolean;
  waitSeconds: number;
} {
  const entry = read(key);
  const now = Date.now();

  if (entry.lockedUntil > now) {
    return {
      allowed: false,
      waitSeconds: Math.ceil((entry.lockedUntil - now) / 1000),
    };
  }

  if (entry.firstAttemptAt > 0 && now - entry.firstAttemptAt > WINDOW_MS) {
    write(key, { attempts: 0, firstAttemptAt: 0, lockedUntil: 0 });
    return { allowed: true, waitSeconds: 0 };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    const lockedUntil = now + LOCK_MS;
    write(key, { ...entry, lockedUntil });
    return { allowed: false, waitSeconds: Math.ceil(LOCK_MS / 1000) };
  }

  return { allowed: true, waitSeconds: 0 };
}

export function recordFailedAttempt(key: string): void {
  const entry = read(key);
  const now = Date.now();
  const firstAttemptAt =
    entry.firstAttemptAt === 0 ? now : entry.firstAttemptAt;

  if (now - firstAttemptAt > WINDOW_MS) {
    write(key, { attempts: 1, firstAttemptAt: now, lockedUntil: 0 });
    return;
  }

  write(key, { ...entry, attempts: entry.attempts + 1, firstAttemptAt });
}

export function clearRateLimit(key: string): void {
  try {
    window.localStorage.removeItem(`sahldz-rate:${key}`);
  } catch {
    // ignore storage errors
  }
}
