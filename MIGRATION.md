# Migrating from Lovable AI Gateway → Google Gemini API

## What Changed

All 5 Supabase Edge Functions no longer call `ai.gateway.lovable.dev`.
They now call the **Google Gemini API directly** using the same Gemini 2.0 Flash model.

**Changed functions:**
- `supabase/functions/ai-chat/index.ts`
- `supabase/functions/generate-quiz/index.ts`
- `supabase/functions/summarize-content/index.ts`
- `supabase/functions/extract-pdf-text/index.ts`
- `supabase/functions/extract-text-from-image/index.ts`
- `supabase/functions/generate-image/index.ts` (now uses Imagen 3)

**Nothing else changed** — all frontend components, auth, database, and logic are identical.

---

## Setup Steps

### 1. Get a Free Gemini API Key
1. Go to: https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click **"Create API key"**
4. Copy the key

### 2. Add the Key to Supabase
1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** → **Secrets** (or Settings → Secrets)
3. Add a new secret:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** your key from step 1
4. Save

### 3. Redeploy the Edge Functions
Run these commands from your project root (requires Supabase CLI):

```bash
supabase functions deploy ai-chat
supabase functions deploy generate-quiz
supabase functions deploy summarize-content
supabase functions deploy extract-pdf-text
supabase functions deploy extract-text-from-image
supabase functions deploy generate-image
```

Or redeploy all at once:
```bash
supabase functions deploy
```

### 4. Remove the Old Secret (Optional)
You can delete `LOVABLE_API_KEY` from Supabase secrets — it's no longer used.

---

## Gemini Free Tier Limits
- **15 requests/minute** (RPM)
- **1 million tokens/day**
- **No credit card required**

This is more than enough for a student study app.

---

## Notes
- ElevenLabs TTS and Kokoro TTS functions are **unchanged** — they use their own API keys.
- Supabase auth, database, and all frontend code are **unchanged**.
- The app will work identically to before.
