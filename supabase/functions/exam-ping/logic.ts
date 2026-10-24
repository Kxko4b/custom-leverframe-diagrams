// logic.ts — pure helpers for exam-ping (testable with plain Node).
export const PING_WINDOW_DAYS = 7;

export type PingExam = { subject: string; exam_date: string; topics?: string | null; questionCount?: number };

/** Whole days from todayIso to dateIso (both YYYY-MM-DD). */
export function daysUntil(todayIso: string, dateIso: string): number {
  const a = Date.parse(todayIso + "T00:00:00Z"), b = Date.parse(dateIso + "T00:00:00Z");
  return Math.round((b - a) / 86400000);
}

/** Exams that need a reminder: today or within the window, soonest first. Past exams never ping. */
export function examsToPing(exams: PingExam[], todayIso: string): Array<PingExam & { days: number }> {
  return exams
    .map((e) => ({ ...e, days: daysUntil(todayIso, String(e.exam_date).slice(0, 10)) }))
    .filter((e) => Number.isFinite(e.days) && e.days >= 0 && e.days <= PING_WINDOW_DAYS)
    .sort((a, b) => a.days - b.days);
}

function when(days: number): string {
  return days === 0 ? "TODAY" : days === 1 ? "tomorrow" : `in ${days} days`;
}

/** The push text. Returns "" when there is nothing to remind about. */
export function buildPingText(exams: Array<PingExam & { days: number }>, slot: "afternoon" | "evening"): string {
  if (exams.length === 0) return "";
  const lines = exams.slice(0, 4).map((e) => {
    const ready = (e.questionCount ?? 0) > 0;
    const hint = ready ? "quiz is ready" : String(e.topics ?? "").trim() ? "tap to make your quiz" : "add your topics";
    return `${e.subject} test ${when(e.days)} · ${hint}`;
  });
  const head = slot === "evening" ? "Evening quiz (3 min)" : "Study time (3 min)";
  const more = exams.length > 4 ? `\n+${exams.length - 4} more` : "";
  return `${head}\n${lines.join("\n")}${more}`;
}
