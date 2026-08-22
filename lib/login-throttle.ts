const WINDOW_MS = 15 * 60 * 1_000;
const BLOCK_MS = 15 * 60 * 1_000;
const MAX_FAILURES = 5;

interface AttemptRecord {
  failure_count: number;
  window_started_at: number;
  blocked_until: number | null;
}

export async function getLoginThrottle(
  db: D1Database,
  subjectId: string,
  purpose: "admin" | "access",
): Promise<{ blocked: boolean; retryAfterSeconds: number }> {
  const attempt = await db
    .prepare(
      `SELECT failure_count, window_started_at, blocked_until
       FROM auth_attempts WHERE subject_id = ? AND purpose = ?`,
    )
    .bind(subjectId, purpose)
    .first<AttemptRecord>();
  if (!attempt?.blocked_until || attempt.blocked_until <= Date.now()) {
    return { blocked: false, retryAfterSeconds: 0 };
  }
  return {
    blocked: true,
    retryAfterSeconds: Math.ceil((attempt.blocked_until - Date.now()) / 1_000),
  };
}

export async function recordLoginFailure(
  db: D1Database,
  subjectId: string,
  purpose: "admin" | "access",
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO auth_attempts (
         subject_id, purpose, failure_count, window_started_at, blocked_until
       ) VALUES (?, ?, 1, ?, NULL)
       ON CONFLICT(subject_id, purpose) DO UPDATE SET
         failure_count = CASE
           WHEN auth_attempts.window_started_at <= ? THEN 1
           ELSE auth_attempts.failure_count + 1
         END,
         window_started_at = CASE
           WHEN auth_attempts.window_started_at <= ? THEN ?
           ELSE auth_attempts.window_started_at
         END,
         blocked_until = CASE
           WHEN (
             CASE
               WHEN auth_attempts.window_started_at <= ? THEN 1
               ELSE auth_attempts.failure_count + 1
             END
           ) >= ? THEN ?
           ELSE NULL
         END`,
    )
    .bind(
      subjectId,
      purpose,
      now,
      now - WINDOW_MS,
      now - WINDOW_MS,
      now,
      now - WINDOW_MS,
      MAX_FAILURES,
      now + BLOCK_MS,
    )
    .run();
}

export async function clearLoginFailures(
  db: D1Database,
  subjectId: string,
  purpose: "admin" | "access",
): Promise<void> {
  await db
    .prepare("DELETE FROM auth_attempts WHERE subject_id = ? AND purpose = ?")
    .bind(subjectId, purpose)
    .run();
}
