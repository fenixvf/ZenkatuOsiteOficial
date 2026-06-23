import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Settings, Smartphone, Share2, Plus, X } from "lucide-react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { SOCIAL_PLATFORMS, detectPlatform, parseSocialLinks, type SocialLink } from "@/lib/social-platforms";

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

function SidebarLinksEditor({
  links,
  onChange,
}: {
  links: SocialLink[];
  onChange: (links: SocialLink[]) => void;
}) {
  const [inputUrl, setInputUrl] = useState("");

  const addLink = () => {
    const url = inputUrl.trim();
    if (!url) return;
    if (links.some(l => l.url === url)) return;
    onChange([...links, { url }]);
    setInputUrl("");
  };

  const removeLink = (idx: number) => {
    onChange(links.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      {links.length > 0 && (
        <div className="space-y-2">
          {links.map((link, idx) => {
            const platform = detectPlatform(link.url);
            const Icon = platform.icon;
            return (
              <div
                key={idx}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-background/60"
              >
                <Icon className={`w-4 h-4 shrink-0 ${platform.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{platform.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeLink(idx)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={inputUrl}
          onChange={e => setInputUrl(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
          placeholder="Cole o link (Instagram, Discord, YouTube...) e pressione Enter"
          className="bg-background h-9 text-sm flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 px-3 shrink-0 gap-1"
          onClick={addLink}
        >
          <Plus className="w-3.5 h-3.5" /> Adicionar
        </Button>
      </div>

      <p className="text-xs text-muted-foreground/70">
        Cole qualquer link — o ícone da rede social é detectado automaticamente.
      </p>
    </div>
  );
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
  const [socialTitle, setSocialTitle] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  useEffect(() => {
    if (config) {
      setAppDownloadUrl(config["appDownloadUrl"] ?? "");
      setSocialTitle(config["socialLinksTitle"] ?? "");
      setSocialLinks(parseSocialLinks(config["socialLinks"]));
    }
  }, [config]);

  const handleSave = () => {
    mutation.mutate({
      appDownloadUrl,
      socialLinksTitle: socialTitle,
      socialLinks: JSON.stringify(socialLinks),
    });
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

        {/* App Download Link */}
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
              onChange={e => setAppDownloadUrl(e.target.value)}
              placeholder="https://..."
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground/60">Deixar em branco mantém o valor atual salvo.</p>
          </div>
        </div>

        {/* Sidebar Social Links */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Share2 className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Redes Sociais (Menu Lateral)</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Esses links aparecem no menu lateral do site para todos os visitantes.
          </p>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Título da seção</label>
            <Input
              value={socialTitle}
              onChange={e => setSocialTitle(e.target.value)}
              placeholder="Ex: Nossa Comunidade, Nos siga, Redes Sociais..."
              className="bg-background"
              maxLength={60}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Links</label>
            <SidebarLinksEditor links={socialLinks} onChange={setSocialLinks} />
          </div>

          <div className="mt-4 p-3 rounded-lg bg-secondary/40 border border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-2">Pré-visualização no menu:</p>
            {socialTitle && (
              <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-2">
                {socialTitle}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {socialLinks.length === 0 && (
                <p className="text-xs text-muted-foreground/50 italic">Nenhum link adicionado.</p>
              )}
              {socialLinks.map((link, idx) => {
                const platform = detectPlatform(link.url);
                const Icon = platform.icon;
                return (
                  <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/60 border border-border text-xs text-muted-foreground">
                    <Icon className={`w-3.5 h-3.5 ${platform.color}`} />
                    <span>{platform.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-6 flex justify-end">
          <Button onClick={handleSave} disabled={mutation.isPending} className="gap-2">
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar configurações
          </Button>
        </div>
      </div>
    </div>
  );
}
