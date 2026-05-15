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
    const { fileData, fileName, fileType } = await req.json();

    if (!fileData) {
      return new Response(
        JSON.stringify({ error: 'File data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Gemini API key not configured' }), { status: 500, headers: corsHeaders });
    }

    console.log(`Processing file: ${fileName}, type: ${fileType}`);

    const base64Data = fileData.replace(/^data:[^;]+;base64,/, '');

    let mimeType = fileType;
    const lowerFileName = fileName.toLowerCase();
    if (lowerFileName.endsWith('.pdf')) {
      mimeType = 'application/pdf';
    } else if (lowerFileName.endsWith('.docx')) {
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (lowerFileName.endsWith('.doc')) {
      mimeType = 'application/msword';
    }

    const fileLabel = lowerFileName.endsWith('.doc') ? 'Microsoft Word DOC'
      : lowerFileName.endsWith('.docx') ? 'Microsoft Word DOCX'
      : 'PDF';

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Extract ALL text content from this document file. This is a ${fileLabel} file.

Instructions:
1. Extract every piece of text content from the document
2. Maintain the original structure, headings, paragraphs, and formatting
3. Include text from tables, lists, headers, and footers
4. If there are images with text, perform OCR to extract that text
5. Do not add any commentary, explanations, or summaries
6. Return ONLY the raw extracted text content

Begin extraction:`
                },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data,
                  }
                }
              ],
            },
          ],
          generationConfig: { maxOutputTokens: 8192 },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Failed to process document: ${response.status}`);
    }

    const data = await response.json();
    const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    console.log('Document text extracted, length:', extractedText.length);

    return new Response(
      JSON.stringify({ text: extractedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-pdf-text:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}); 
