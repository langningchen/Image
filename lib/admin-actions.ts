import { truncate } from "@/lib/http";
import { getSettings } from "@/lib/settings";
import { logModerationEvent, warnSubject } from "@/lib/subjects";
import type { SubjectRecord } from "@/lib/types";

export type SubjectAction =
  | "warn"
  | "ban_temporary"
  | "ban_permanent"
  | "unban"
  | "reset_warnings";

export async function applySubjectAction(
  db: D1Database,
  subjectId: string,
  input: {
    action: SubjectAction;
    reason?: string;
    durationHours?: number;
  },
): Promise<SubjectRecord | null> {
  const reason = truncate(input.reason ?? "", 500);
  if (input.action === "warn") {
    return warnSubject(db, subjectId, reason, await getSettings(db), "admin");
  }

  let statement: D1PreparedStatement;
  if (input.action === "ban_temporary") {
    const hours = Math.min(
      8_760,
      Math.max(1, Math.round(input.durationHours ?? 24)),
    );
    const bannedUntil = Date.now() + hours * 3_600_000;
    statement = db
      .prepare(
        `UPDATE subjects
         SET permanent_ban = 0,
             banned_until = ?,
             ban_reason_code = ?,
             ban_reason_detail = ?,
             notice_code = ?,
             notice_params = ?,
             notice_detail = ?
         WHERE id = ?
         RETURNING *`,
      )
      .bind(
        bannedUntil,
        "MANUAL_TEMP_BAN",
        reason || null,
        "UPLOADER_TEMPORARILY_BANNED",
        JSON.stringify({ bannedUntil }),
        reason || null,
        subjectId,
      );
  } else if (input.action === "ban_permanent") {
    statement = db
      .prepare(
        `UPDATE subjects
         SET permanent_ban = 1,
             banned_until = NULL,
             ban_reason_code = ?,
             ban_reason_detail = ?,
             notice_code = ?,
             notice_params = NULL,
             notice_detail = ?
         WHERE id = ?
         RETURNING *`,
      )
      .bind(
        "MANUAL_PERMANENT_BAN",
        reason || null,
        "UPLOADER_PERMANENTLY_BANNED",
        reason || null,
        subjectId,
      );
  } else if (input.action === "unban") {
    statement = db
      .prepare(
        `UPDATE subjects
         SET permanent_ban = 0,
             banned_until = NULL,
             ban_reason_code = NULL,
             ban_reason_detail = NULL,
             notice_code = NULL,
             notice_params = NULL,
             notice_detail = NULL
         WHERE id = ?
         RETURNING *`,
      )
      .bind(subjectId);
  } else {
    statement = db
      .prepare(
        `UPDATE subjects
         SET warning_count = 0,
             notice_code = NULL,
             notice_params = NULL,
             notice_detail = NULL
         WHERE id = ?
         RETURNING *`,
      )
      .bind(subjectId);
  }

  const subject = await statement.first<SubjectRecord>();
  if (subject) {
    await logModerationEvent(db, {
      subjectId,
      eventType: input.action,
      actor: "admin",
      reason: reason || null,
      details:
        input.action === "ban_temporary"
          ? JSON.stringify({ durationHours: input.durationHours ?? 24 })
          : null,
    });
  }
  return subject;
}
