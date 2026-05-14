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

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || "AIzaSyCQY2Zc79Qi3u3Xokq6Tkr3dGbF-HHW06U";
    if (!GEMINI_API_KEY) {
      // API key is set
    }

    console.log('Processing content for summary...');

    const contentLength = content.length;
    let numTerms = "8-12";
    let summaryLength = "detailed, comprehensive";
    if (contentLength > 5000) {
      numTerms = "20-25";
      summaryLength = "extensive, in-depth";
    } else if (contentLength > 3000) {
      numTerms = "15-18";
      summaryLength = "thorough, well-detailed";
    }

    const systemPrompt = `You are an expert educational assistant. Your job is to:
1. Create COMPREHENSIVE, ${summaryLength} summaries that cover EVERY SINGLE CONCEPT in the study material - DO NOT SKIP ANYTHING
2. Include ALL important details, examples, formulas, processes, and context from the material
3. Identify and explain ${numTerms} key terms or concepts with detailed definitions
4. Make complex topics easy to understand for students while maintaining completeness and depth
5. Use proper formatting with multiple paragraphs and clear structure
6. ENSURE NO TOPIC OR SECTION FROM THE MATERIAL IS LEFT OUT - cover everything systematically

IMPORTANT FORMATTING RULES:
- Use plain text format only
- Do NOT use asterisks, underscores, or markdown symbols for emphasis
- Do NOT use special symbols like *, _, #, -, etc.
- Use natural language and punctuation to convey emphasis
- Write in clear, readable paragraphs

CRITICAL: Your summary MUST be exhaustive and cover ALL concepts, sections, and important points from the material. Students should be able to study from your summary alone.

Format your response as JSON with this structure:
{
  "summary": "A ${summaryLength}, EXHAUSTIVE summary covering EVERY concept with multiple substantial paragraphs.",
  "keyTerms": [
    {"term": "Term Name", "definition": "Comprehensive explanation with context and examples"},
    ...
  ]
}`;

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
              parts: [{ text: `Create a COMPLETE, ${summaryLength} summary covering EVERY SINGLE CONCEPT, section, and detail in this study material. Identify ${numTerms} key terms with thorough definitions. DO NOT skip any topics:\n\n${content}` }],
            },
          ],
          generationConfig: { maxOutputTokens: 8192 },
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

    console.log('AI Response received');

    let parsedResponse;
    try {
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) || aiResponse.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : aiResponse;
      parsedResponse = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      parsedResponse = { summary: aiResponse, keyTerms: [] };
    }

    return new Response(
      JSON.stringify(parsedResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in summarize-content:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
