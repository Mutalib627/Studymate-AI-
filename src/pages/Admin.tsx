import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Copy, Key, Shield, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProductKey {
  id: string;
  key_code: string;
  duration_days: number;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [productKeys, setProductKeys] = useState<ProductKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [durationDays, setDurationDays] = useState(30);
  const [keyCount, setKeyCount] = useState(1);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    setIsAdmin(true);
    fetchProductKeys();
  };

  const fetchProductKeys = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("product_keys")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch product keys");
      console.error(error);
    } else {
      setProductKeys(data || []);
    }
    setIsLoading(false);
  };

  const generateKeyCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const segments = 4;
    const segmentLength = 4;
    const parts: string[] = [];
    
    for (let i = 0; i < segments; i++) {
      let segment = "";
      for (let j = 0; j < segmentLength; j++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      parts.push(segment);
    }
    
    return parts.join("-");
  };

  const generateKeys = async () => {
    setIsGenerating(true);
    
    try {
      const keysToInsert = Array.from({ length: keyCount }, () => ({
        key_code: generateKeyCode(),
        duration_days: durationDays,
      }));

      const { error } = await supabase
        .from("product_keys")
        .insert(keysToInsert);

      if (error) throw error;

      toast.success(`Generated ${keyCount} product key(s)`);
      fetchProductKeys();
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to generate keys");
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteKey = async (id: string) => {
    const { error } = await supabase
      .from("product_keys")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete key");
      console.error(error);
    } else {
      toast.success("Key deleted");
      setProductKeys(productKeys.filter(k => k.id !== id));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto text-destructive mb-2" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-card">
              <Key className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-bold">Product Key Management</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6 max-w-5xl">
        <Card className="rounded-3xl border-border shadow-card bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Plus className="h-5 w-5 text-primary" /> Generate Product Keys
            </CardTitle>
            <CardDescription>Create new product keys for premium subscriptions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (days)</Label>
                <Input id="duration" type="number" min={1} value={durationDays} onChange={(e) => setDurationDays(parseInt(e.target.value) || 30)} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="count">Number of keys</Label>
                <Input id="count" type="number" min={1} max={50} value={keyCount} onChange={(e) => setKeyCount(Math.min(50, parseInt(e.target.value) || 1))} className="h-11 rounded-xl" />
              </div>
              <Button onClick={generateKeys} disabled={isGenerating} className="h-11 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-card hover:shadow-glow">
                {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Generate Keys
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border shadow-card bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-bold">All Product Keys ({productKeys.length})</CardTitle>
            <CardDescription>Manage existing product keys</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/50">
                      <TableHead className="min-w-[160px]">Key Code</TableHead>
                      <TableHead className="min-w-[100px]">Duration</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="min-w-[120px]">Created</TableHead>
                      <TableHead className="min-w-[120px]">Used At</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productKeys.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No product keys yet. Generate some above!</TableCell>
                      </TableRow>
                    ) : (
                      productKeys.map((key) => (
                        <TableRow key={key.id} className="hover:bg-secondary/30">
                          <TableCell><code className="font-mono text-xs bg-secondary px-2 py-1 rounded-lg">{key.key_code}</code></TableCell>
                          <TableCell className="text-sm">{key.duration_days} days</TableCell>
                          <TableCell>
                            {key.is_used
                              ? <Badge className="rounded-full bg-secondary text-muted-foreground border-0 px-3">Used</Badge>
                              : <Badge className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 px-3 shadow-card">Active</Badge>}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{new Date(key.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{key.used_at ? new Date(key.used_at).toLocaleDateString() : "-"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => copyToClipboard(key.key_code)} className="rounded-full h-8 w-8" title="Copy key"><Copy className="h-4 w-4" /></Button>
                              {!key.is_used && (
                                <Button variant="ghost" size="icon" onClick={() => deleteKey(key.id)} className="rounded-full h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" title="Delete key"><Trash2 className="h-4 w-4" /></Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;
