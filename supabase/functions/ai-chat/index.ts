import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, studyMaterial, userName, conversationHistory } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || "AIzaSyCQY2Zc79Qi3u3Xokq6Tkr3dGbF-HHW06U";
    if (!GEMINI_API_KEY) {
      // API key is set
    }

    console.log('Processing chat message...');

    let systemPrompt = `You are Studymate AI, a helpful study assistant. Your name is Studymate AI.

User's Name: ${userName}

Response rules:
- For normal questions, reply in plain readable text. Do NOT wrap in JSON.
- When the user asks for a timetable, schedule, comparison table, structured list, or any tabular data, you MUST return ONLY valid JSON in this exact format: { "type": "table", "columns": ["Column1", "Column2", ...], "rows": [["row1col1", "row1col2", ...], ...] }
- When returning a table, do NOT include any text before or after the JSON. Return ONLY the JSON object.
- When the user asks for an image, picture, or drawing, return ONLY: { "type": "image", "prompt": "description" }
- For all other responses, just write plain text. No JSON wrapper. No { "type": "text" } format.

Guidelines:
- Address the user by name "${userName}" naturally
- Remember context from previous messages
- Be helpful and concise
- Break down complex topics simply
- Use bullet points with "•" when listing items
- Do not use excessive emojis. Keep it professional and natural.
- Provide examples when helpful

About Your Creator (when asked):
- You were created by Abdulmutalib Salisu
- Keep it brief and natural`;

    if (studyMaterial) {
      systemPrompt += `\n\nStudent's Study Material:\n${studyMaterial}\n\nUse this material to answer relevant questions.`;
    } else {
      systemPrompt += `\n\nNo study materials uploaded yet. Help with general questions.`;
    }

    if (conversationHistory && conversationHistory.length > 0) {
      systemPrompt += `\n\nRecent context:\n`;
      const recentHistory = conversationHistory.slice(-5);
      recentHistory.forEach((msg: any) => {
        systemPrompt += `${msg.role}: ${msg.content.substring(0, 200)}\n`;
      });
    }

    // Build Gemini contents array from messages
    const contents = messages.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { maxOutputTokens: 2048 },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    console.log('AI chat response generated');

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-chat:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
