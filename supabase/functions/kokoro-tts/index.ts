// Kokoro TTS Edge Function
// Calls the public Kokoro-TTS HuggingFace Space (gradio API) and returns base64 WAV audio.
// No browser SpeechSynthesis is used anywhere on the client.

import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const KOKORO_SPACE = "https://hexgrad-kokoro-tts.hf.space";
const GENERATE_FN_INDEX = 4;
const GENERATE_TRIGGER_ID = 2;
const MAX_INPUT_CHARS = 1200;
const PROVIDER_TIMEOUT_MS = 45_000;

const HF_TOKEN = Deno.env.get("HF_ACCESS_TOKEN") ?? "";

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = PROVIDER_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function generateKokoroAudioUrl(
  text: string,
  voice: string,
  speed: number,
): Promise<string | null> {
  const sessionHash = crypto.randomUUID().replaceAll("-", "");
  const payload = {
    data: [text, voice, speed, false],
    event_data: null,
    fn_index: GENERATE_FN_INDEX,
    trigger_id: GENERATE_TRIGGER_ID,
    session_hash: sessionHash,
  };

  const startRes = await fetchWithTimeout(`${KOKORO_SPACE}/gradio_api/queue/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!startRes.ok) {
    console.error(`[kokoro] queue join failed: ${startRes.status}`);
    return null;
  }

  const streamRes = await fetchWithTimeout(
    `${KOKORO_SPACE}/gradio_api/queue/data?session_hash=${sessionHash}`,
    {
      headers: HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {},
    },
  );
  if (!streamRes.ok || !streamRes.body) return null;

  const reader = streamRes.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let audioUrl: string | null = null;
  const deadline = Date.now() + PROVIDER_TIMEOUT_MS;

  // Read until "complete" event
  while (true) {
    if (Date.now() > deadline) {
      await reader.cancel();
      console.error("[kokoro] generation timed out");
      return null;
    }
    const readResult = await Promise.race([
      reader.read(),
      new Promise<{ timeout: true }>((resolve) =>
        setTimeout(() => resolve({ timeout: true }), 8_000),
      ),
    ]);
    if ("timeout" in readResult) {
      await reader.cancel();
      console.error("[kokoro] stream stalled");
      return null;
    }
    const { done, value } = readResult;
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    // Each event ends with double newline
    const events = buf.split("\n\n");
    buf = events.pop() ?? "";
    for (const evt of events) {
      const lines = evt.split("\n");
      let event = "";
      let dataLine = "";
      for (const l of lines) {
        if (l.startsWith("event:")) event = l.slice(6).trim();
        if (l.startsWith("data:")) dataLine = l.slice(5).trim();
      }
      if (dataLine) {
        try {
          const parsed = JSON.parse(dataLine);
          if (parsed?.msg === "process_completed" && parsed?.success === false) {
            console.error(`[kokoro] process failed: ${JSON.stringify(parsed?.output ?? {})}`);
            return null;
          }
          const result = parsed?.output?.data ?? parsed?.data ?? parsed;
          const first = Array.isArray(result) ? result[0] : result;
          const url = first?.url || first?.path || first;
          if (typeof url === "string") {
            audioUrl = url.startsWith("http") ? url : `${KOKORO_SPACE}/gradio_api/file=${url}`;
          }
        } catch (_e) {
          // ignore
        }
      }
      if (event === "error") {
        console.error(`[kokoro] gradio error: ${dataLine}`);
        return null;
      }
    }
    if (audioUrl) break;
  }

  return audioUrl;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice = "af_bella", speed = 1.0 } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Missing text" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeText = text.replace(/\s+/g, " ").trim().slice(0, MAX_INPUT_CHARS);
    const safeSpeed = typeof speed === "number" && speed >= 0.5 && speed <= 2 ? speed : 1;
    const safeVoice = typeof voice === "string" && /^[a-z]{2}_[a-z0-9_]+$/i.test(voice)
      ? voice
      : "af_bella";

    const audioUrl = await generateKokoroAudioUrl(safeText, safeVoice, safeSpeed);

    if (!audioUrl) {
      return new Response(
        JSON.stringify({
          error: "Kokoro TTS is temporarily unavailable. Please try again.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Download the generated audio and return as base64
    const audioRes = await fetchWithTimeout(audioUrl, {}, 30_000);
    if (!audioRes.ok) {
      return new Response(
        JSON.stringify({ error: `Kokoro audio download failed: ${audioRes.status}` }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const buf = new Uint8Array(await audioRes.arrayBuffer());
    const audioContent = encodeBase64(buf);
    const contentType = audioRes.headers.get("content-type") ?? "audio/wav";

    return new Response(
      JSON.stringify({ audioContent, contentType }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error(`[kokoro] fatal: ${msg}`);
    return new Response(JSON.stringify({ error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
