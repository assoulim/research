// Lectern — Claude proxy (Supabase Edge Function)
// Keeps the Anthropic API key on the server. Only signed-in users whose email
// is listed in ALLOWED_EMAILS may call it.
//
// Secrets (Dashboard → Edge Functions → Secrets):
//   ANTHROPIC_API_KEY  your Anthropic API key (sk-ant-…)
//   ALLOWED_EMAILS     comma-separated emails allowed to use Claude
//   CLAUDE_MODEL       optional default model, e.g. claude-sonnet-5-5
// SUPABASE_URL and SUPABASE_ANON_KEY are provided automatically.

import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // 1. Who is calling?
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return json({ error: "Not signed in" }, 401);

  const allowed = (Deno.env.get("ALLOWED_EMAILS") ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!allowed.length) return json({ error: "ALLOWED_EMAILS is not set on the server" }, 500);
  if (!allowed.includes((user.email ?? "").toLowerCase())) return json({ error: "This account is not allowed to use Claude" }, 403);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "ANTHROPIC_API_KEY is not set on the server" }, 500);

  // 2. Validate and forward the request.
  let body: { model?: string; max_tokens?: number; system?: string; messages?: unknown[] };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (!Array.isArray(body.messages) || !body.messages.length) return json({ error: "messages is required" }, 400);

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: body.model || Deno.env.get("CLAUDE_MODEL") || "claude-sonnet-5-5",
      max_tokens: Math.min(Math.max(Number(body.max_tokens) || 1600, 1), 8000),
      system: typeof body.system === "string" ? body.system.slice(0, 200_000) : undefined,
      messages: body.messages,
    }),
  });
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { ...cors, "content-type": "application/json" },
  });
});
