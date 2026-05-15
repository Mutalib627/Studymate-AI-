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
    const { content } = await req.json();

    if (!content || typeof content !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Gemini API key not configured' }), { status: 500, headers: corsHeaders });
    }

    console.log('Generating quiz questions...');

    const contentLength = content.length;
    let numQuestions = 5;
    if (contentLength > 10000) numQuestions = 30;
    else if (contentLength > 7000) numQuestions = 25;
    else if (contentLength > 5000) numQuestions = 20;
    else if (contentLength > 3000) numQuestions = 15;
    else if (contentLength > 1500) numQuestions = 10;
    else if (contentLength > 800) numQuestions = 7;

    const systemPrompt = `You are an expert quiz generator for educational content. Your job is to:
1. Create ${numQuestions} unique and varied multiple-choice questions based on the study material
2. Each question should have 4 options
3. Questions should test understanding, not just memorization
4. Include a mix of difficulty levels
5. Make each set of questions different and diverse - vary the topics and approaches
6. Provide detailed explanations for why each answer is correct or incorrect

CRITICAL: You must respond with valid JSON only. Format your response EXACTLY like this:
{
  "questions": [
    {
      "question": "What is the main concept?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanations": [
        "Explanation for why Option A is correct",
        "Explanation for why Option B is incorrect",
        "Explanation for why Option C is incorrect",
        "Explanation for why Option D is incorrect"
      ]
    }
  ]
}

The correctAnswer is the index (0-3) of the correct option in the options array. The explanations array must have 4 items, one for each option.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [
            {
              role: 'user',
              parts: [{ text: `Generate ${numQuestions} unique and varied multiple-choice quiz questions from this study material. Make them different from previous attempts:\n\n${content}` }],
            },
          ],
          generationConfig: { maxOutputTokens: 4096, temperature: 0.9 },
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

    console.log('Quiz generated successfully');

    let parsedResponse;
    try {
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) || aiResponse.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : aiResponse;
      parsedResponse = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse quiz questions from AI response');
    }

    if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions)) {
      throw new Error('Invalid quiz format from AI');
    }

    return new Response(
      JSON.stringify(parsedResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-quiz:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
