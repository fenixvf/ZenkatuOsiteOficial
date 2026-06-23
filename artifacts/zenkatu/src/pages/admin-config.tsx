import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Settings, Smartphone } from "lucide-react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

async function fetchConfig(): Promise<Record<string, string>> {
  const res = await fetch("/api/config");
  if (!res.ok) throw new Error("Erro ao carregar configurações");
  return res.json();
}

async function patchConfig(updates: Record<string, string>): Promise<Record<string, string>> {
  const res = await fetch("/api/config", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Erro ao salvar configurações");
  return res.json();
}

export default function AdminConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["site-config"],
    queryFn: fetchConfig,
  });

  const mutation = useMutation({
    mutationFn: patchConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-config"] });
      toast({ title: "Configurações salvas com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao salvar configurações", variant: "destructive" });
    },
  });

  const [appDownloadUrl, setAppDownloadUrl] = useState("");

  useEffect(() => {
    if (config) {
      setAppDownloadUrl(config["appDownloadUrl"] ?? "");
    }
  }, [config]);

  const handleSave = () => {
    mutation.mutate({ appDownloadUrl });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-screen-md mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button asChild variant="ghost" size="icon" className="rounded-full">
          <Link href="/admin">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-2">
            <Settings className="w-7 h-7 text-primary" />
            Configurações do Site
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie as configurações gerais da plataforma.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-lg divide-y divide-border">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Link do App</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            URL de download exibida na página "Versão App". Pode ser um link de APK, Google Play, App Store, etc.
          </p>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">URL de Download</label>
            <Input
              value={appDownloadUrl}
              onChange={(e) => setAppDownloadUrl(e.target.value)}
              placeholder="https://..."
              className="bg-background"
            />
          </div>
        </div>

        <div className="p-6 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={mutation.isPending}
            className="gap-2"
          >
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar configurações
          </Button>
        </div>
      </div>
    </div>
  );
}
