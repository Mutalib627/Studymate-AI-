import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Sparkles, Loader2, FileText, FileImage, FolderOpen, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import TextToSpeechButton from "@/components/TextToSpeechButton";
import VoiceModeToggle from "@/components/VoiceModeToggle";
import { useBrowserSpeech } from "@/hooks/useBrowserSpeech";
import { useVoiceMode } from "@/contexts/VoiceModeContext";
import mammoth from "mammoth";

type Step = "reading" | "sending" | "analyzing" | "complete";

interface StudyHelperProps {
  uploadedContent: string;
  setUploadedContent: (content: string) => void;
}

const StudyHelper = ({ uploadedContent, setUploadedContent }: StudyHelperProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState("");
  const [keyTerms, setKeyTerms] = useState<Array<{ term: string; definition: string }>>([]);
  const [imageCount, setImageCount] = useState(0);
  const [activeStep, setActiveStep] = useState<Step | null>(null);
  const { toast } = useToast();
  const { speak } = useBrowserSpeech();
  const { voiceModeEnabled } = useVoiceMode();

  useEffect(() => {
    const savedSummary = localStorage.getItem('studySummary');
    const savedKeyTerms = localStorage.getItem('studyKeyTerms');
    if (savedSummary) setSummary(savedSummary);
    if (savedKeyTerms) setKeyTerms(JSON.parse(savedKeyTerms));
  }, []);

  useEffect(() => {
    if (summary) {
      localStorage.setItem('studySummary', summary);
      localStorage.setItem('studyKeyTerms', JSON.stringify(keyTerms));
    }
  }, [summary, keyTerms]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Please sign in", description: "You need to be signed in to upload files.", variant: "destructive" });
      return;
    }

    const { data: subscription } = await supabase
      .from('user_subscriptions').select('is_paid, subscription_end').eq('user_id', user.id).maybeSingle();
    const isPaid = subscription?.is_paid && (!subscription.subscription_end || new Date(subscription.subscription_end) > new Date());

    if (!isPaid) {
      const { count } = await supabase
        .from('usage_tracking').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('feature', 'upload');
      if ((count || 0) >= 1) {
        toast({ title: "Upload limit reached", description: "Free users can only upload 1 material. Upgrade for unlimited access.", variant: "destructive" });
        return;
      }
    }

    setSummary("");
    setKeyTerms([]);
    localStorage.removeItem('studySummary');
    localStorage.removeItem('studyKeyTerms');
    localStorage.removeItem('currentChatMessages');
    localStorage.removeItem('activeConversationId');

    setIsProcessing(true);
    setActiveStep("reading");
    
    try {
      let combinedText = "";
      const imageFiles: File[] = [];
      const docxFiles: File[] = [];
      const pdfFiles: File[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileType = file.type.toLowerCase();
        const fileName = file.name.toLowerCase();
        if (file.size > 10 * 1024 * 1024) {
          toast({ title: "File too large", description: `${file.name} exceeds 10MB. Skipping.`, variant: "destructive" });
          continue;
        }
        if (fileType.startsWith("image/")) {
          imageFiles.push(file);
        } else if (fileName.endsWith('.docx') || fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
          docxFiles.push(file);
        } else if (fileType === "application/pdf" || fileName.endsWith('.pdf') || fileName.endsWith('.doc') || fileType === "application/msword") {
          pdfFiles.push(file);
        }
      }

      const totalFiles = imageFiles.length + docxFiles.length + pdfFiles.length;
      if (totalFiles === 0) throw new Error("Please upload images, PDF, DOC, or DOCX files (max 10MB)");

      // 1) DOCX in-browser via mammoth (fast, reliable, no API call)
      for (const file of docxFiles) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const { value } = await mammoth.extractRawText({ arrayBuffer });
          if (value?.trim()) combinedText += `--- ${file.name} ---\n${value}\n\n`;
        } catch (err) {
          console.error(`Mammoth failed on ${file.name}:`, err);
        }
      }

      // 2) PDFs/DOC via edge function (Gemini multimodal)
      setActiveStep("sending");
      for (const file of pdfFiles) {
        try {
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          const { data, error } = await supabase.functions.invoke('extract-pdf-text', {
            body: { fileData: base64Data, fileName: file.name, fileType: file.type || 'application/octet-stream' }
          });
          if (error) throw error;
          if (data.text?.trim()) combinedText += `--- ${file.name} ---\n${data.text}\n\n`;
        } catch (err) {
          console.error(`Error processing ${file.name}:`, err);
        }
      }

      // Process images sequentially in small batches with retry for reliability
      const BATCH_SIZE = 2;
      let processedImages = 0;
      let skippedImages = 0;

      for (let i = 0; i < imageFiles.length; i += BATCH_SIZE) {
        const batch = imageFiles.slice(i, Math.min(i + BATCH_SIZE, imageFiles.length));
        
        // Convert all images in batch to base64 first
        const base64Results = await Promise.all(
          batch.map(file => new Promise<{ file: File; base64: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve({ file, base64: reader.result as string });
            reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
            reader.readAsDataURL(file);
          }))
        );

        // Process each image with retry logic
        for (const { file, base64 } of base64Results) {
          let success = false;
          for (let attempt = 0; attempt < 3 && !success; attempt++) {
            try {
              if (attempt > 0) await new Promise(r => setTimeout(r, 1500 * attempt));
              
              const result = await Promise.race([
                supabase.functions.invoke('extract-text-from-image', { body: { image: base64 } }),
                new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 90000))
              ]);

              if (!result.error && result.data?.text?.trim()) {
                combinedText += `--- ${file.name} ---\n${result.data.text}\n\n`;
                success = true;
              } else if (attempt === 2) {
                console.warn(`Skipped ${file.name}: no text extracted`);
                skippedImages++;
              }
            } catch (err) {
              if (attempt === 2) {
                console.error(`Failed ${file.name} after 3 attempts:`, err);
                skippedImages++;
              }
            }
          }
          processedImages++;
          toast({
            title: "Processing images",
            description: `${processedImages}/${imageFiles.length} images processed...`,
          });
        }

        // Small delay between batches to avoid rate limits
        if (i + BATCH_SIZE < imageFiles.length) {
          await new Promise(r => setTimeout(r, 800));
        }
      }

      if (skippedImages > 0) {
        toast({
          title: "Some images skipped",
          description: `${skippedImages} image(s) couldn't be processed. The rest were extracted successfully.`,
          variant: "destructive",
        });
      }

      if (!combinedText.trim()) throw new Error("No text could be extracted from the files");

      setActiveStep("analyzing");

      if (!isPaid) {
        await supabase.from('usage_tracking').insert({ user_id: user.id, feature: 'upload' });
      }

      setImageCount(totalFiles);
      setUploadedContent(combinedText);
      localStorage.setItem('uploadedContent', combinedText);
      setActiveStep("complete");
      toast({ title: "Ready", description: `Processed ${totalFiles} file${totalFiles > 1 ? 's' : ''}. Click 'Generate Summary'.` });
      setTimeout(() => setActiveStep(null), 1200);
    } catch (error) {
      console.error("Error processing files:", error);
      setActiveStep(null);
      toast({ title: "Processing issue", description: error instanceof Error ? error.message : "Some files couldn't be processed.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const generateSummary = async () => {
    if (!uploadedContent.trim()) {
      toast({ title: "No content", description: "Please upload a file or paste text first.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast({ title: "Please sign in", variant: "destructive" }); setIsProcessing(false); return; }

      const { data: subscription } = await supabase.from('user_subscriptions').select('is_paid, subscription_end').eq('user_id', user.id).maybeSingle();
      const isPaid = subscription?.is_paid && (!subscription.subscription_end || new Date(subscription.subscription_end) > new Date());

      if (!isPaid) {
        const today = new Date().toISOString().split('T')[0];
        const { count } = await supabase.from('usage_tracking').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('feature', 'summarize').gte('used_at', today);
        if ((count || 0) >= 1) {
          toast({ title: "Daily limit reached", description: "Free users can summarize 1 time per day. Upgrade for unlimited access.", variant: "destructive" });
          setIsProcessing(false);
          return;
        }
      }

      const { data, error } = await supabase.functions.invoke('summarize-content', { body: { content: uploadedContent } });
      if (error) throw error;

      setSummary(data.summary);
      setKeyTerms(data.keyTerms);

      if (!isPaid) {
        await supabase.from('usage_tracking').insert({ user_id: user.id, feature: 'summarize' });
      }
      
      try {
        await supabase.from('study_sessions').insert({
          user_id: user.id, session_type: 'summary',
          content_preview: uploadedContent.substring(0, 100),
          full_content: uploadedContent,
          result: { summary: data.summary, keyTerms: data.keyTerms } as any,
          image_count: imageCount,
        });
      } catch (error) { console.error('Error saving summary:', error); }
      
      toast({ title: "Summary generated", description: "Your materials have been analyzed." });
      if (voiceModeEnabled && data.summary) setTimeout(() => speak(data.summary), 500);
    } catch (error: any) {
      const isRateLimited = error?.message?.includes('Rate limit') || error?.message?.includes('rate limit');
      toast({ title: isRateLimited ? "Rate limit exceeded" : "Error", description: isRateLimited ? "Please wait and try again." : "Failed to generate summary.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-5 w-full">
      <div className="flex justify-end">
        <VoiceModeToggle />
      </div>

      {/* Upload card */}
      <Card className="border border-border bg-card rounded-3xl shadow-card overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2.5 text-lg font-bold">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-card">
              <Upload className="w-4 h-4 text-primary-foreground" />
            </div>
            Upload Study Material
          </CardTitle>
          <p className="text-sm text-muted-foreground">Upload documents or images, or paste text below.</p>
        </CardHeader>
        <CardContent className="space-y-5 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: FileImage, label: "Images", hint: "JPG, PNG", accept: "image/*", color: "from-blue-500 to-blue-600" },
              { icon: FileText, label: "PDF", hint: "Documents", accept: ".pdf,application/pdf", color: "from-rose-500 to-pink-600" },
              { icon: FolderOpen, label: "DOC / DOCX", hint: "Word files", accept: ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document", color: "from-indigo-500 to-blue-600" },
            ].map((u) => (
              <label key={u.label} className="group relative flex flex-col items-center gap-2 p-5 rounded-2xl border-2 border-dashed border-border bg-secondary/40 hover:bg-secondary/70 hover:border-primary/50 cursor-pointer transition-all hover:-translate-y-0.5">
                <input type="file" accept={u.accept} multiple className="hidden" onChange={handleFileUpload} />
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${u.color} flex items-center justify-center shadow-card group-hover:scale-110 transition-transform`}>
                  <u.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-semibold">{u.label}</span>
                <span className="text-[11px] text-muted-foreground">{u.hint}</span>
              </label>
            ))}
          </div>

          {activeStep && <ProcessingSteps step={activeStep} />}

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center"><span className="bg-card px-3 text-xs text-muted-foreground font-medium">or paste text</span></div>
          </div>

          <Textarea
            placeholder="Paste your study material here..."
            className="min-h-[140px] resize-none text-sm rounded-2xl border-border bg-secondary/30 focus-visible:ring-2 focus-visible:ring-primary"
            value={uploadedContent}
            onChange={(e) => setUploadedContent(e.target.value)}
          />

          <Button
            onClick={generateSummary}
            disabled={isProcessing || !uploadedContent.trim()}
            className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-card hover:shadow-glow transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Generate Summary</>
            )}
          </Button>
        </CardContent>
      </Card>

      {summary && (
        <Card className="border border-border bg-card rounded-3xl shadow-card animate-float-up">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> Summary
              </CardTitle>
              <TextToSpeechButton text={summary} variant="outline" className="h-9 px-3 gap-2 rounded-full" size="sm" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="leading-relaxed whitespace-pre-wrap text-sm">{summary}</p>
          </CardContent>
        </Card>
      )}

      {keyTerms.length > 0 && (
        <Card className="border border-border bg-card rounded-3xl shadow-card animate-float-up">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold">Key Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {keyTerms.map((item, index) => (
                <div key={index} className="p-4 rounded-2xl bg-secondary/40 border border-border hover:border-primary/40 transition-colors">
                  <p className="font-semibold text-sm text-primary">{item.term}</p>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{item.definition}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const ProcessingSteps = ({ step }: { step: Step }) => {
  const steps: { id: Step; label: string }[] = [
    { id: "reading", label: "Reading your file" },
    { id: "sending", label: "Sending to AI" },
    { id: "analyzing", label: "Analyzing your content" },
    { id: "complete", label: "Complete" },
  ];
  const idx = steps.findIndex((s) => s.id === step);
  return (
    <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2.5">
      {steps.map((s, i) => {
        const done = i < idx || step === "complete";
        const active = i === idx && step !== "complete";
        return (
          <div key={s.id} className="flex items-center gap-3 text-sm">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
              done ? "bg-green-500 text-white" :
              active ? "bg-primary/15 text-primary animate-pulse ring-2 ring-primary/30" :
              "bg-muted text-muted-foreground"
            }`}>
              {done ? <CheckCircle2 className="w-4 h-4" /> :
               active ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
               <span className="text-[10px]">{i + 1}</span>}
            </div>
            <span className={active ? "font-semibold text-foreground" : done ? "text-muted-foreground line-through" : "text-muted-foreground"}>
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default StudyHelper;
