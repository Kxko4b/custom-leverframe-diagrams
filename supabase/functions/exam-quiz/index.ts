// exam-quiz: turns the topic notes of one exam into quiz questions with the AI and stores them.
// Called from the admin page with the owner's login. Row-level security decides who may read/write the exam rows,
// so anyone who is not the owner simply sees "exam not found".
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildPrompt, extractJson, validateQuestions } from "./logic.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (req.method !== "POST") return json({ success: false, error: "Only POST is supported." }, 405);
    const auth = req.headers.get("authorization") ?? "";
    if (!/^Bearer\s+\S+/i.test(auth)) return json({ success: false, error: "Sign in first." }, 401);

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY secret.");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });

    const body = await req.json().catch(() => ({}));
    const examId = String(body?.exam_id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(examId)) return json({ success: false, error: "exam_id is missing." }, 400);

    const { data: exam, error: examError } = await supabase.from("exams").select("id, subject, topics").eq("id", examId).maybeSingle();
    if (examError) throw new Error("Could not load the exam: " + examError.message);
    if (!exam) return json({ success: false, error: "Exam not found." }, 404);
    if (!String(exam.topics ?? "").trim()) return json({ success: false, error: "Add topic notes to this exam first. The AI only quizzes what is written there." }, 400);

    const prompt = buildPrompt(exam.subject, exam.topics);
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Title": "Kxko Exam Quiz" },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [{ role: "system", content: prompt.system }, { role: "user", content: prompt.user }],
        temperature: 0.4, max_tokens: 4000, stream: false,
      }),
      signal: AbortSignal.timeout(90000),
    });
    const raw = await response.text();
    if (!response.ok) throw new Error(`The AI service answered HTTP ${response.status}. Try again in a minute.`);
    const data = JSON.parse(raw);
    let content = data?.choices?.[0]?.message?.content;
    if (Array.isArray(content)) content = content.map((p: any) => (typeof p === "string" ? p : p?.text ?? "")).join("");
    if (!content) throw new Error("The AI returned nothing. Try again.");

    const questions = validateQuestions(extractJson(String(content)));
    if (questions.length === 0) throw new Error("The AI answer had no usable questions. Try again, or add more detail to the topic notes.");

    if (body?.replace === true) {
      const del = await supabase.from("exam_questions").delete().eq("exam_id", examId);
      if (del.error) throw new Error("Could not clear old questions: " + del.error.message);
    }
    const insert = await supabase.from("exam_questions").insert(questions.map((q) => ({ exam_id: examId, kind: q.kind, payload: q.payload })));
    if (insert.error) throw new Error("Could not save the questions: " + insert.error.message);

    return json({ success: true, added: questions.length, model: data?.model ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("EXAM QUIZ ERROR:", message);
    return json({ success: false, error: message }, 500);
  }
});
