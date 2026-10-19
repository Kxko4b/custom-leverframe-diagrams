// selfcheck.ts — dependency-free logic for the daily-briefing self-check.
// Kept free of Deno/Supabase APIs so it can be unit-tested with plain Node (see /tests).
//
// Design rules (the "safety contract"):
//   1. Only repairs on ALLOWED_REPAIRS can ever run. Nothing else is applied automatically.
//   2. Repairs never touch stored data; they only change what this run reads, sends or shows.
//   3. Credential / config problems, critical findings and anything unclear are STOPPED and reported.
//   4. The AI reviewer can only confirm or veto a repair the code itself proposed. It never chooses one.
//   5. Nothing sensitive leaves the project: AI input is redacted metadata, never the briefing text.

export type Severity = "info" | "low" | "medium" | "high" | "critical";
export type Outcome = "ok" | "fixed" | "reported" | "stopped";
export type EventKind = "check" | "repair" | "ai" | "escalation";

export const ALLOWED_REPAIRS = [
  "retry_component",
  "retry_push",
  "sanitize_text",
  "dedupe_lines",
  "truncate_text",
] as const;
export type Repair = typeof ALLOWED_REPAIRS[number];

export interface BriefingEvent {
  kind: EventKind;
  component: string;
  severity: Severity;
  outcome: Outcome;
  found: string;
  action: string;
  details: Record<string, unknown>;
}

export interface ComponentResult {
  name: string;
  success: boolean;
  data?: unknown;
  error?: string;
  durationMs?: number;
  attempts?: number;
  recovered?: boolean;
  firstError?: string;
}

/* ------------------------------------------------------------------ */
/* Redaction                                                           */
/* ------------------------------------------------------------------ */

export function redact(input: unknown, max = 500): string {
  let s = String(input ?? "");
  s = s.replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(-----END [A-Z ]*PRIVATE KEY-----|$)/g, "[redacted-key]");
  s = s.replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, "Bearer [redacted]");
  s = s.replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]*/g, "[redacted-jwt]");
  s = s.replace(/\bAIza[A-Za-z0-9_-]{20,}/g, "[redacted-token]");
  s = s.replace(/\b(?:sk|sb|pk|ya29|ghp|gho)[-_.][A-Za-z0-9_.-]{12,}/g, "[redacted-token]");
  s = s.replace(/\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g, "[redacted-email]");
  s = s.replace(
    /([?&](?:key|token|access_token|refresh_token|apikey|api_key|secret|signature|sig|password)=)[^&\s"']+/gi,
    "$1[redacted]",
  );
  s = s.replace(
    /\b(secret|token|password|passwd|private[_ ]key|refresh_token|client_secret)(["']?\s*[:=]\s*["']?)[^\s"',}&]{4,}/gi,
    "$1$2[redacted]",
  );
  s = s.replace(/\b[0-9a-f]{32,}\b/gi, "[redacted-hex]");
  s = s.replace(/[A-Za-z0-9+\/_-]{40,}={0,2}/g, "[redacted-blob]");
  s = s.replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max) + "…" : s;
}

/* ------------------------------------------------------------------ */
/* Error classification + retry                                        */
/* ------------------------------------------------------------------ */

export type ErrorCategory = "transient" | "auth" | "config" | "parse" | "unknown";
export interface ErrorClass {
  category: ErrorCategory;
  retryable: boolean;
  mentionsSecrets: boolean;
}

export function classifyError(message: unknown): ErrorClass {
  const m = String(message ?? "").toLowerCase();
  const mentionsSecrets = /(secret|token|password|private[_ ]key|credential|api[_ ]?key)/.test(m);

  let category: ErrorCategory = "unknown";
  if (/(missing .*(secret|env|variable|url)|secrets? (is|are) missing|is missing\b|environment variables)/.test(m)) {
    category = "config";
  } else if (/(\b401\b|\b403\b|invalid_grant|invalid_client|unauthori[sz]ed|forbidden|unauthenticated|invalid[_ ]token|token has been expired|permission denied|not allowed)/.test(m)) {
    category = "auth";
  } else if (/(\b408\b|\b425\b|\b429\b|\b500\b|\b502\b|\b503\b|\b504\b|timeout|timed out|network|fetch failed|econn|socket|connection (reset|closed|refused)|temporar|unavailable|rate limit|overloaded|try again)/.test(m)) {
    category = "transient";
  } else if (/(invalid json|malformed|unexpected token|no daily data|did not return|returned no)/.test(m)) {
    category = "parse";
  }
  return { category, retryable: category === "transient" || category === "parse", mentionsSecrets };
}

export interface RetryResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
  attempts: number;
  recovered: boolean;
  firstError?: string;
  stoppedBecause?: string;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: {
    attempts?: number;
    delayMs?: number;
    sleep?: (ms: number) => Promise<void>;
    isRetryable?: (message: string) => boolean;
  } = {},
): Promise<RetryResult<T>> {
  const max = Math.max(1, opts.attempts ?? 3);
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const retryable = opts.isRetryable ?? ((msg: string) => classifyError(msg).retryable);
  let firstError: string | undefined;

  for (let i = 1; i <= max; i++) {
    try {
      const value = await fn();
      return { ok: true, value, attempts: i, recovered: i > 1, firstError };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      firstError ??= msg;
      const canRetry = retryable(msg);
      if (!canRetry) {
        return { ok: false, error: msg, attempts: i, recovered: false, firstError, stoppedBecause: `not retryable (${classifyError(msg).category})` };
      }
      if (i === max) {
        return { ok: false, error: msg, attempts: i, recovered: false, firstError, stoppedBecause: "retries exhausted" };
      }
      await sleep((opts.delayMs ?? 800) * 2 ** (i - 1));
    }
  }
  return { ok: false, error: "unreachable", attempts: max, recovered: false };
}

/** FCM can be retried only on an explicit server-side rejection, never on an ambiguous network error
 *  (the first message might have been delivered, and we must not push the briefing twice). */
export function isSafePushRetry(message: string): boolean {
  return /FCM returned HTTP (429|500|502|503|504)\b/.test(message);
}

/* ------------------------------------------------------------------ */
/* Safety gate                                                         */
/* ------------------------------------------------------------------ */

export interface GateInput {
  repair: string;
  severity: Severity;
  category: ErrorCategory | "content";
  mentionsSecrets?: boolean;
  touchesStoredData?: boolean;
  /** Present only for repairs that need the AI reviewer's agreement. */
  requireAi?: boolean;
  aiCanAutoFix?: boolean | null;
  aiConfidence?: number | null;
}
export interface GateResult {
  allowed: boolean;
  reason: string;
}

export function safetyGate(i: GateInput): GateResult {
  if (!(ALLOWED_REPAIRS as readonly string[]).includes(i.repair)) {
    return { allowed: false, reason: `"${i.repair}" is not on the allowlist of safe repairs` };
  }
  if (i.touchesStoredData) return { allowed: false, reason: "repair would modify stored data" };
  if (i.category === "auth" || i.category === "config") {
    return { allowed: false, reason: "credentials or configuration need a human" };
  }
  if (i.mentionsSecrets && i.category !== "transient") {
    return { allowed: false, reason: "the problem involves credentials, so it is reported instead of changed" };
  }
  if (i.severity === "critical") return { allowed: false, reason: "critical severity needs a human decision" };
  if (i.requireAi) {
    if (i.aiCanAutoFix !== true) return { allowed: false, reason: "the AI reviewer did not approve an automatic fix" };
    if (typeof i.aiConfidence !== "number" || i.aiConfidence < 70) {
      return { allowed: false, reason: `AI confidence ${i.aiConfidence ?? "unknown"} is below the required 70` };
    }
  }
  return { allowed: true, reason: "allowlisted repair, no data touched, no credentials involved" };
}

/** The code (not the AI) proposes a repair for an unresolved failure. Returns null when nothing safe exists. */
export function candidateRepair(component: string, error: string): Repair | null {
  if (component === "firebase-fcm" && /HTTP 400/.test(error) && /(too large|size|payload|exceed|invalid[^.]*(body|argument))/i.test(error)) {
    return "truncate_text";
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Briefing text inspection + safe repairs                             */
/* ------------------------------------------------------------------ */

export interface TextFinding {
  check: string;
  severity: Severity;
  outcome: Outcome;
  found: string;
  action: string;
  repair?: Repair;
  details?: Record<string, unknown>;
}

const encoder = new TextEncoder();
export const byteLength = (s: string) => encoder.encode(s).length;
export const DEFAULT_MAX_BYTES = 3500;

export function truncateToBytes(text: string, maxBytes: number): { text: string; droppedLines: number } {
  if (byteLength(text) <= maxBytes) return { text, droppedLines: 0 };
  const lines = text.split("\n");
  const kept: string[] = [];
  let dropped = 0;
  for (let i = 0; i < lines.length; i++) {
    const marker = `\n… (+${lines.length - i} more lines, see dashboard)`;
    const candidate = [...kept, lines[i]].join("\n");
    if (byteLength(candidate + marker) > maxBytes) {
      dropped = lines.length - i;
      break;
    }
    kept.push(lines[i]);
  }
  if (dropped === 0) return { text, droppedLines: 0 };
  while (kept.length > 0 && kept[kept.length - 1].trim() === "") kept.pop();
  return { text: kept.join("\n") + `\n… (+${dropped} more lines, see dashboard)`, droppedLines: dropped };
}

export function inspectBriefing(text: string, opts: { maxBytes?: number } = {}): { text: string; findings: TextFinding[] } {
  const findings: TextFinding[] = [];
  const original = String(text ?? "");

  if (!original.trim()) {
    findings.push({
      check: "briefing-not-empty", severity: "critical", outcome: "stopped",
      found: "The briefing text is empty.", action: "Nothing was changed; a human needs to look at the data sources.",
    });
    return { text: original, findings };
  }

  let lines = original.split("\n");

  // 1. header
  const firstLine = lines.find((l) => l.trim() !== "") ?? "";
  if (!/^[A-ZÄÖÜ]+,? \d{1,2} [A-ZÄÖÜ]+$/.test(firstLine.trim())) {
    findings.push({
      check: "date-header", severity: "medium", outcome: "reported",
      found: `First line is not a date header: "${redact(firstLine, 80)}".`,
      action: "Left as is; the date formatting may have changed.",
    });
  }

  // 2. required section
  if (!lines.some((l) => l.trim() === "WEATHER")) {
    findings.push({
      check: "weather-section", severity: "high", outcome: "reported",
      found: "The WEATHER section is missing.", action: "Left as is; the section builder may be broken.",
    });
  }

  // 3. weather placeholders -> honest wording
  const placeholder = /(\?(–\?)?°C|\?% rain|\? km\/h)/;
  if (lines.some((l) => placeholder.test(l))) {
    let replaced = 0;
    lines = lines.map((l) => {
      if (placeholder.test(l)) { replaced++; return "Forecast unavailable"; }
      if (l.trim() === "Unknown") { replaced++; return "Weather unavailable"; }
      if (l.trim() === "Rain: none expected") { replaced++; return "Rain: unknown"; }
      return l;
    });
    findings.push({
      check: "weather-placeholders", severity: "medium", outcome: "fixed", repair: "sanitize_text",
      found: "Weather values were missing and showed as '?', and the briefing claimed 'Rain: none expected'.",
      action: "Replaced the placeholders with 'Forecast unavailable' / 'Rain: unknown' so the briefing does not claim dry weather it never checked.",
      details: { linesChanged: replaced },
    });
  }

  // 4. leaked programming values
  const bad = /(\bundefined\b|\bNaN\b|\[object Object\])/g;
  const badLines = lines.filter((l) => bad.test(l) && ((bad.lastIndex = 0), true));
  if (badLines.length > 0) {
    lines = lines.map((l) => l.replace(bad, "?"));
    findings.push({
      check: "leaked-values", severity: "medium", outcome: "fixed", repair: "sanitize_text",
      found: `${badLines.length} line(s) contained raw programming values such as undefined, NaN or [object Object].`,
      action: "Replaced them with '?'.",
      details: { examples: badLines.slice(0, 3).map((l) => redact(l, 120)) },
    });
  }

  // 5. consecutive duplicate lines
  const deduped: string[] = [];
  let removed = 0;
  for (const l of lines) {
    if (l.trim() !== "" && deduped.length > 0 && deduped[deduped.length - 1] === l) { removed++; continue; }
    deduped.push(l);
  }
  if (removed > 0) {
    lines = deduped;
    findings.push({
      check: "duplicate-lines", severity: "low", outcome: "fixed", repair: "dedupe_lines",
      found: `${removed} line(s) appeared twice in a row.`, action: "Removed the repeats.", details: { removed },
    });
  }

  let out = lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();

  // 6. size (FCM rejects payloads over ~4 KB)
  const limit = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const before = byteLength(out);
  if (before > limit) {
    const cut = truncateToBytes(out, limit);
    out = cut.text;
    findings.push({
      check: "push-size", severity: "medium", outcome: "fixed", repair: "truncate_text",
      found: `The briefing was ${before} bytes, over the ${limit}-byte push limit.`,
      action: `Shortened the pushed text by ${cut.droppedLines} line(s) at the end. The full text is kept in the dashboard.`,
      details: { before, after: byteLength(out), droppedLines: cut.droppedLines },
    });
  }

  return { text: out, findings };
}

/* ------------------------------------------------------------------ */
/* Component data checks (stale / missing data)                        */
/* ------------------------------------------------------------------ */

export function checkComponentData(ctx: { dateKey: string; components: ComponentResult[] }): TextFinding[] {
  const findings: TextFinding[] = [];
  const y = Number(ctx.dateKey.slice(0, 4)), m = Number(ctx.dateKey.slice(4, 6)), d = Number(ctx.dateKey.slice(6, 8));
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const get = (name: string) => ctx.components.find((c) => c.name === name);

  const untis = get("webuntis");
  if (untis?.success && untis.data && typeof untis.data === "object") {
    const data = untis.data as Record<string, unknown>;
    if (data.date !== undefined && Number(data.date) !== Number(ctx.dateKey)) {
      findings.push({
        check: "untis-date", severity: "high", outcome: "reported",
        found: `WebUntis answered for ${data.date}, but the briefing is for ${ctx.dateKey}.`,
        action: "Not changed; the timetable shown may belong to the wrong day.",
      });
    }
    if (weekday >= 1 && weekday <= 5 && Number(data.lessonsChecked) === 0) {
      findings.push({
        check: "untis-empty", severity: "medium", outcome: "reported",
        found: "WebUntis returned 0 lessons on a weekday. The timetable shown is the built-in baseline, not live data.",
        action: "Not changed. This is normal on a school holiday but can also mean the sync is broken. Needs your judgment.",
      });
    }
  }

  const weather = get("weather");
  if (weather?.success && weather.data && typeof weather.data === "object") {
    const w = weather.data as Record<string, unknown>;
    if (w.todayLow == null || w.todayHigh == null) {
      findings.push({
        check: "weather-values", severity: "medium", outcome: "reported",
        found: "The weather API answered but without temperatures.", action: "Not changed; see the placeholder repair for the text.",
      });
    }
  }
  return findings;
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

export function componentEvents(components: ComponentResult[]): BriefingEvent[] {
  const events: BriefingEvent[] = [];
  for (const c of components) {
    if (c.success && c.recovered) {
      events.push({
        kind: "repair", component: c.name, severity: "low", outcome: "fixed",
        found: `Failed on the first attempt: ${redact(c.firstError, 200)}`,
        action: `Retried automatically and it succeeded on attempt ${c.attempts}.`,
        details: { repair: "retry_component", attempts: c.attempts },
      });
    } else if (!c.success) {
      const cls = classifyError(c.error);
      const gate = safetyGate({ repair: "retry_component", severity: "medium", category: cls.category, mentionsSecrets: cls.mentionsSecrets });
      const stopped = !gate.allowed;
      events.push({
        kind: stopped ? "escalation" : "check", component: c.name,
        severity: stopped ? "high" : "medium",
        outcome: stopped ? "stopped" : "reported",
        found: redact(c.error, 300),
        action: stopped
          ? `Not retried or changed: ${gate.reason}. This needs your attention.`
          : `Retried ${c.attempts ?? 1} time(s) without success; the briefing was sent without this section.`,
        details: { category: cls.category, attempts: c.attempts ?? 1 },
      });
    }
  }
  return events;
}

export function findingToEvent(component: string, f: TextFinding): BriefingEvent {
  return {
    kind: f.outcome === "fixed" ? "repair" : f.outcome === "stopped" ? "escalation" : "check",
    component, severity: f.severity, outcome: f.outcome,
    found: redact(f.found, 400), action: redact(f.action, 400),
    details: { check: f.check, ...(f.repair ? { repair: f.repair } : {}), ...(f.details ?? {}) },
  };
}

/* ------------------------------------------------------------------ */
/* AI review                                                           */
/* ------------------------------------------------------------------ */

export interface AiVerdict {
  ok: boolean;
  diagnosis: string;
  severity: Severity;
  canAutoFix: boolean;
  confidence: number;
  recommendedAction: string;
  model: string | null;
  error?: string;
}

/** Redacted metadata only. The briefing text itself is never included. */
export function buildAiPayload(args: {
  dateKey: string;
  components: ComponentResult[];
  findings: BriefingEvent[];
}): Record<string, unknown> {
  const summarize = (c: ComponentResult) => ({
    name: c.name, success: c.success, error: c.error ? redact(c.error, 300) : null,
    attempts: c.attempts ?? 1, durationMs: c.durationMs ?? null,
  });
  return {
    function: "daily-briefing",
    date: args.dateKey,
    problem: args.components.filter((c) => !c.success).map(summarize),
    logs: {
      components: args.components.map(summarize),
      findings: args.findings.map((e) => ({ component: e.component, outcome: e.outcome, found: redact(e.found, 200) })),
    },
  };
}

const SEVERITIES: Severity[] = ["info", "low", "medium", "high", "critical"];

export function validateAiVerdict(raw: unknown): AiVerdict {
  const fail = (error: string): AiVerdict => ({
    ok: false, diagnosis: "", severity: "medium", canAutoFix: false, confidence: 0, recommendedAction: "Review manually.", model: null, error,
  });
  if (!raw || typeof raw !== "object") return fail("AI reviewer returned nothing usable.");
  const r = raw as Record<string, any>;
  const body = r.result && typeof r.result === "object" ? r.result : r;
  if (body.success === false) return fail(redact(body.error ?? "AI reviewer reported failure.", 200));
  const d = body.diagnosis;
  if (!d || typeof d !== "object") return fail("AI reviewer response had no diagnosis object.");

  const severity: Severity = SEVERITIES.includes(d.severity) ? d.severity : "medium";
  const confidence = typeof d.confidence === "number" && isFinite(d.confidence) ? Math.max(0, Math.min(100, Math.round(d.confidence))) : 0;
  return {
    ok: true,
    diagnosis: redact(d.diagnosis ?? "", 600),
    severity,
    canAutoFix: d.canAutoFix === true,
    confidence,
    recommendedAction: redact(d.recommendedAction ?? "Review manually.", 400),
    model: typeof body.model === "string" ? body.model : null,
  };
}

/** The AI may only RAISE severity, never lower what the deterministic checks found. */
export function maxSeverity(a: Severity, b: Severity): Severity {
  return SEVERITIES.indexOf(a) >= SEVERITIES.indexOf(b) ? a : b;
}

export function aiEvent(component: string, verdict: AiVerdict, base: Severity): BriefingEvent {
  if (!verdict.ok) {
    return {
      kind: "ai", component, severity: base, outcome: "reported",
      found: "The AI reviewer could not be reached or returned an unusable answer.",
      action: "No AI triage available for this run; the raw failures are logged above.",
      details: { error: verdict.error ?? null },
    };
  }
  return {
    kind: "ai", component, severity: maxSeverity(base, verdict.severity), outcome: "reported",
    found: verdict.diagnosis || "No diagnosis provided.",
    action: `AI recommendation: ${verdict.recommendedAction} (confidence ${verdict.confidence}%, auto-fix ${verdict.canAutoFix ? "judged possible" : "not advised"}).`,
    details: { model: verdict.model, confidence: verdict.confidence, canAutoFix: verdict.canAutoFix },
  };
}

/* ------------------------------------------------------------------ */
/* Run status + persistence                                            */
/* ------------------------------------------------------------------ */

export type RunStatus = "healthy" | "repaired" | "degraded" | "failed";

export function runStatus(args: { hasBriefing: boolean; pushSent: boolean; events: BriefingEvent[] }): RunStatus {
  if (!args.hasBriefing) return "failed";
  const unresolved = args.events.some((e) => e.outcome === "stopped" || (e.outcome === "reported" && e.kind !== "ai" && e.severity !== "info" && e.severity !== "low"));
  if (!args.pushSent || unresolved) return "degraded";
  return args.events.some((e) => e.outcome === "fixed") ? "repaired" : "healthy";
}

export function runSummary(status: RunStatus, events: BriefingEvent[]): string {
  const fixed = events.filter((e) => e.outcome === "fixed").length;
  const stopped = events.filter((e) => e.outcome === "stopped").length;
  const reported = events.filter((e) => e.outcome === "reported" && e.kind !== "ai").length;
  return `${status}: ${fixed} fixed automatically, ${stopped} stopped for you, ${reported} reported.`;
}

export interface SaveConfig {
  supabaseUrl: string;
  serviceKey?: string | null;
  fetchImpl?: typeof fetch;
}

/** Never throws: a logging problem must not break the morning briefing. */
export async function saveRun(
  cfg: SaveConfig,
  run: { date_key: string; status: RunStatus; briefing: string | null; components: unknown; push_sent: boolean; summary: string },
  events: BriefingEvent[],
): Promise<{ saved: boolean; runId?: number; error?: string }> {
  if (!cfg.serviceKey) return { saved: false, error: "service key missing" };
  const f = cfg.fetchImpl ?? fetch;
  const headers = { apikey: cfg.serviceKey, Authorization: `Bearer ${cfg.serviceKey}`, "Content-Type": "application/json" };
  try {
    const safeComponents = (Array.isArray(run.components) ? run.components : []).map((c: any) => ({
      name: c?.name, success: Boolean(c?.success), error: c?.error ? redact(c.error, 300) : null,
      attempts: c?.attempts ?? 1, recovered: Boolean(c?.recovered), durationMs: c?.durationMs ?? null,
    }));
    const res = await f(`${cfg.supabaseUrl}/rest/v1/briefing_runs`, {
      method: "POST", headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({ ...run, components: safeComponents }),
    });
    if (!res.ok) return { saved: false, error: `briefing_runs insert failed: HTTP ${res.status}` };
    const rows = await res.json();
    const runId = Array.isArray(rows) ? rows[0]?.id : undefined;
    if (typeof runId !== "number") return { saved: false, error: "briefing_runs insert returned no id" };
    if (events.length > 0) {
      const evRes = await f(`${cfg.supabaseUrl}/rest/v1/briefing_events`, {
        method: "POST", headers,
        body: JSON.stringify(events.map((e) => ({ ...e, run_id: runId }))),
      });
      if (!evRes.ok) return { saved: false, runId, error: `briefing_events insert failed: HTTP ${evRes.status}` };
    }
    return { saved: true, runId };
  } catch (e) {
    return { saved: false, error: redact(e instanceof Error ? e.message : String(e), 200) };
  }
}
