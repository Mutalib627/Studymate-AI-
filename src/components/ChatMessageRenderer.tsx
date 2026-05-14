import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeResponse } from "@/lib/sanitizeResponse";

interface ParsedMessage {
  type: "text" | "table" | "image";
  content?: string;
  columns?: string[];
  rows?: string[][];
  prompt?: string;
}

function tryParseStructured(content: string): ParsedMessage | null {
  try {
    const trimmed = content.trim();
    // Try to extract JSON from the content - handle markdown code blocks too
    let jsonStr = trimmed;
    
    // Strip markdown code block if present
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }
    
    // Try matching a JSON object
    const jsonMatch = jsonStr.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) return null;
    
    const parsed = JSON.parse(jsonMatch[1]);
    if (parsed.type === "text" && typeof parsed.content === "string") {
      return { type: "text", content: parsed.content };
    }
    if (parsed.type === "table" && Array.isArray(parsed.columns) && Array.isArray(parsed.rows)) {
      return { type: "table", columns: parsed.columns, rows: parsed.rows };
    }
    if (parsed.type === "image" && typeof parsed.prompt === "string") {
      return { type: "image", prompt: parsed.prompt };
    }
    return null;
  } catch {
    return null;
  }
}

const ImageRenderer = ({ prompt }: { prompt: string }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateImage = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-image", {
        body: { prompt },
      });
      if (fnError) throw fnError;
      if (data?.imageUrl) {
        setImageUrl(data.imageUrl);
      } else if (data?.error) {
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message || "Failed to generate image");
    } finally {
      setLoading(false);
    }
  };

  if (imageUrl) {
    return (
      <div className="space-y-2 w-full">
        <img src={imageUrl} alt={prompt} className="rounded-lg w-full max-h-80 object-contain" />
        <p className="text-xs text-muted-foreground">{prompt}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 w-full">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50 border border-border">
        <ImageIcon className="h-4 w-4 text-primary flex-shrink-0" />
        <p className="text-sm flex-1 break-words">{prompt}</p>
      </div>
      <Button size="sm" onClick={generateImage} disabled={loading} className="rounded-lg">
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ImageIcon className="h-4 w-4 mr-1" />}
        {loading ? "Generating..." : "Generate Image"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

const TableRenderer = ({ columns, rows }: { columns: string[]; rows: string[][] }) => {
  return (
    <div className="w-full overflow-hidden rounded-lg border border-border">
      <div className="overflow-x-auto" style={{ maxWidth: '100%' }}>
        <table className="text-sm" style={{ minWidth: `${Math.max(columns.length * 120, 300)}px`, width: '100%' }}>
          <thead>
            <tr className="bg-primary/10">
              {columns.map((col, i) => (
                <th key={i} className="px-3 py-2.5 text-left font-semibold border-b border-border text-xs whitespace-nowrap text-primary">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={`${i % 2 === 0 ? "bg-background" : "bg-muted/30"} hover:bg-muted/50 transition-colors`}>
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 border-b border-border/20 text-sm whitespace-pre-wrap break-words">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const ChatMessageRenderer = ({ content }: { content: string }) => {
  const parsed = tryParseStructured(content);

  if (!parsed) {
    return (
      <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
        {sanitizeResponse(content)}
      </p>
    );
  }

  switch (parsed.type) {
    case "table":
      return <TableRenderer columns={parsed.columns!} rows={parsed.rows!} />;
    case "image":
      return <ImageRenderer prompt={parsed.prompt!} />;
    case "text":
      return (
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
          {sanitizeResponse(parsed.content!)}
        </p>
      );
    default:
      return (
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
          {sanitizeResponse(content)}
        </p>
      );
  }
};
