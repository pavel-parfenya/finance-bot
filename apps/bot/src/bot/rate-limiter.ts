const WINDOW_MS = 60_000;
const MAX_MESSAGES = 20;

const userTimestamps = new Map<number, number[]>();

/** Returns true if the message is allowed, false if the rate limit is exceeded. */
export function checkRateLimit(userId: number): boolean {
  const now = Date.now();
  const recent = (userTimestamps.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_MESSAGES) return false;
  recent.push(now);
  userTimestamps.set(userId, recent);
  return true;
}
