import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useListObras } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Settings, Smartphone, Share2, Plus, X, ArrowDown, ArrowUp, ImagePlus, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { SOCIAL_PLATFORMS, detectPlatform, parseSocialLinks, type SocialLink } from "@/lib/social-platforms";

async function fetchConfig(): Promise<Record<string, string>> {
  const res = await fetch("/api/config");
  if (!res.ok) throw new Error("Erro ao carregar configurações");
  return res.json();
}

async function patchConfig(updates: Record<string, string>): Promise<Record<string, string>> {
  let res: Response;
  try {
    res = await fetch("/api/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  } catch (networkErr) {
    console.error("[config] network error:", networkErr);
    throw networkErr;
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "(sem corpo)");
    console.error("[config] HTTP error:", res.status, body);
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  try {
    return await res.json();
  } catch (parseErr) {
    console.error("[config] JSON parse error:", parseErr);
    throw parseErr;
  }
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
  const { data: obrasRaw, isLoading: obrasLoading } = useListObras();
  const obras = Array.isArray(obrasRaw) ? obrasRaw : [];

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
    onError: (err) => {
      console.error("[config] mutation error:", err);
      toast({ title: "Erro ao salvar configurações", description: String(err), variant: "destructive" });
    },
  });

  const [appDownloadUrl, setAppDownloadUrl] = useState("");
  const [socialTitle, setSocialTitle] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [bannerMode, setBannerMode] = useState<"automatic" | "manual">("manual");
  const [manualBannerIds, setManualBannerIds] = useState<number[]>([]);
  const [bannerSearch, setBannerSearch] = useState("");
  const [bannerSettingsInitialized, setBannerSettingsInitialized] = useState(false);

  useEffect(() => {
    if (config) {
      setAppDownloadUrl(config["appDownloadUrl"] ?? "");
      setSocialTitle(config["socialLinksTitle"] ?? "");
      setSocialLinks(parseSocialLinks(config["socialLinks"]));
    }
  }, [config]);

  useEffect(() => {
    if (!config || !Array.isArray(obrasRaw) || bannerSettingsInitialized) return;

    setBannerMode(config.bannerMode === "automatic" ? "automatic" : "manual");
    if (config.bannerOrder !== undefined) {
      try {
        const savedIds: unknown = JSON.parse(config.bannerOrder);
        setManualBannerIds(
          Array.isArray(savedIds)
            ? savedIds.filter(
                (id): id is number =>
                  Number.isInteger(id) && obras.some((obra) => obra.id === id),
              )
            : [],
        );
      } catch {
        setManualBannerIds([]);
      }
    } else {
      setManualBannerIds(
        obras
          .filter((obra) => obra.showInBanner)
          .sort((a, b) => (a.bannerOrder ?? Number.MAX_SAFE_INTEGER) - (b.bannerOrder ?? Number.MAX_SAFE_INTEGER))
          .map((obra) => obra.id),
      );
    }
    setBannerSettingsInitialized(true);
  }, [config, obrasRaw, obras, bannerSettingsInitialized]);

  const handleSave = () => {
    mutation.mutate({
      appDownloadUrl,
      socialLinksTitle: socialTitle,
      socialLinks: JSON.stringify(socialLinks),
      bannerMode,
      bannerOrder: JSON.stringify(manualBannerIds),
    });
  };

  const moveBannerItem = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= manualBannerIds.length) return;
    setManualBannerIds((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const toggleManualBanner = (obraId: number, checked: boolean) => {
    setManualBannerIds((current) =>
      checked
        ? current.includes(obraId) ? current : [...current, obraId]
        : current.filter((id) => id !== obraId),
    );
  };

  const availableBannerObras = obras.filter(
    (obra) =>
      !manualBannerIds.includes(obra.id) &&
      obra.titulo.toLowerCase().includes(bannerSearch.toLowerCase()),
  );

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

        {/* Hero banner behavior */}
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-2">
            <ImagePlus className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Banner principal</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Escolha como as obras em destaque aparecem na página inicial.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              data-testid="button-banner-mode-automatic"
              aria-pressed={bannerMode === "automatic"}
              onClick={() => setBannerMode("automatic")}
              className={`rounded-xl border p-4 text-left transition-colors ${
                bannerMode === "automatic"
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background/40 hover:bg-secondary/50"
              }`}
            >
              <span className="flex items-center gap-2 font-semibold text-foreground">
                <TrendingUp className="h-4 w-4 text-primary" /> Automático
              </span>
              <span className="mt-2 block text-sm text-muted-foreground">
                Exibe até 10 obras mais populares, em ordem de visualizações.
              </span>
            </button>
            <button
              type="button"
              data-testid="button-banner-mode-manual"
              aria-pressed={bannerMode === "manual"}
              onClick={() => setBannerMode("manual")}
              className={`rounded-xl border p-4 text-left transition-colors ${
                bannerMode === "manual"
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background/40 hover:bg-secondary/50"
              }`}
            >
              <span className="flex items-center gap-2 font-semibold text-foreground">
                <ImagePlus className="h-4 w-4 text-primary" /> Manual
              </span>
              <span className="mt-2 block text-sm text-muted-foreground">
                Escolha as obras e ajuste a ordem do jeito que preferir.
              </span>
            </button>
          </div>

          {bannerMode === "manual" && (
            <div className="space-y-5 rounded-xl border border-border bg-background/30 p-4">
              <div>
                <h3 className="text-sm font-semibold">Ordem do banner</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Use as setas para definir a sequência exibida na página inicial.
                </p>
                {manualBannerIds.length === 0 ? (
                  <p className="mt-3 rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    Nenhuma obra selecionada. Adicione obras abaixo.
                  </p>
                ) : (
                  <ol className="mt-3 space-y-2">
                    {manualBannerIds.map((obraId, index) => {
                      const obra = obras.find((item) => item.id === obraId);
                      if (!obra) return null;
                      return (
                        <li
                          key={obraId}
                          data-testid={`banner-order-item-${obraId}`}
                          className="flex items-center gap-3 rounded-lg border border-border bg-card p-2"
                        >
                          <span className="w-6 text-center text-xs font-bold text-muted-foreground">{index + 1}</span>
                          <img src={obra.capaUrl} alt="" className="h-12 w-9 rounded object-cover" />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{obra.titulo}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Mover ${obra.titulo} para cima`}
                            data-testid={`button-banner-up-${obraId}`}
                            disabled={index === 0}
                            onClick={() => moveBannerItem(index, -1)}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Mover ${obra.titulo} para baixo`}
                            data-testid={`button-banner-down-${obraId}`}
                            disabled={index === manualBannerIds.length - 1}
                            onClick={() => moveBannerItem(index, 1)}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Remover ${obra.titulo} do banner`}
                            data-testid={`button-banner-remove-${obraId}`}
                            onClick={() => toggleManualBanner(obraId, false)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>

              <div className="space-y-3 border-t border-border pt-4">
                <h3 className="text-sm font-semibold">Adicionar obras</h3>
                <Input
                  value={bannerSearch}
                  onChange={(event) => setBannerSearch(event.target.value)}
                  placeholder="Buscar obras para o banner..."
                  aria-label="Buscar obras para adicionar ao banner"
                  data-testid="input-banner-search"
                  className="bg-background"
                />
                {obrasLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando catálogo...</p>
                ) : availableBannerObras.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {obras.length === 0 ? "Nenhuma obra cadastrada." : "Nenhuma outra obra encontrada."}
                  </p>
                ) : (
                  <div className="max-h-64 space-y-1 overflow-y-auto">
                    {availableBannerObras.map((obra) => (
                      <label
                        key={obra.id}
                        data-testid={`banner-option-${obra.id}`}
                        className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-secondary/50"
                      >
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={(event) => toggleManualBanner(obra.id, event.target.checked)}
                          data-testid={`checkbox-banner-${obra.id}`}
                          className="h-4 w-4 accent-primary"
                        />
                        <img src={obra.capaUrl} alt="" className="h-10 w-8 rounded object-cover" />
                        <span className="min-w-0 flex-1 truncate text-sm">{obra.titulo}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

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
