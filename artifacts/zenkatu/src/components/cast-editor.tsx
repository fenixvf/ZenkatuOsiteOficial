import { useState } from "react";
import { Loader2, Plus, Save, Search, Trash2, UserCheck, X, BadgeCheck } from "lucide-react";
import { useListUsuarios } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ImageUploadField } from "@/components/image-upload";
import { SOCIAL_PLATFORMS, detectPlatform, type SocialPlatformKey } from "@/lib/social-platforms";

export type CastMember = {
  /** uid do perfil na Zenkatu quando a pessoa tem conta */
  uid?: string;
  nome: string;
  papel: string;
  fotoUrl?: string;
  links?: {
    youtube?: string;
    instagram?: string;
    discord?: string;
    twitter?: string;
    tiktok?: string;
    site?: string;
  };
};

export type SocialLinks = NonNullable<CastMember["links"]>;

function SocialLinksEditor({
  links,
  onChange,
}: {
  links: SocialLinks;
  onChange: (links: SocialLinks) => void;
}) {
  const [inputUrl, setInputUrl] = useState("");

  const addLink = () => {
    const url = inputUrl.trim();
    if (!url) return;
    const platform = detectPlatform(url);
    onChange({ ...links, [platform.key]: url });
    setInputUrl("");
  };

  const removeLink = (key: SocialPlatformKey) => {
    const updated = { ...links };
    delete updated[key];
    onChange(updated);
  };

  const activeLinks = SOCIAL_PLATFORMS.filter((p) => links[p.key as SocialPlatformKey]);

  return (
    <div className="space-y-3">
      {activeLinks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeLinks.map(({ key, label, icon: Icon, color }) => (
            <div
              key={key}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-border bg-secondary/50 text-xs font-medium"
            >
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <span className="text-foreground max-w-[120px] truncate">{label}</span>
              <button
                type="button"
                onClick={() => removeLink(key as SocialPlatformKey)}
                className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
                aria-label={`Remover ${label}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addLink();
            }
          }}
          placeholder="Cole o link (Instagram, Discord, YouTube...) e pressione Enter"
          className="bg-background h-8 text-xs flex-1 min-w-[140px]"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-3 text-xs shrink-0"
          onClick={addLink}
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground/70">
        Cole qualquer link — o ícone da rede social é detectado automaticamente.
      </p>
    </div>
  );
}

const emptyCastMember = (): CastMember => ({
  uid: undefined,
  nome: "",
  papel: "",
  fotoUrl: "",
  links: { youtube: "", instagram: "", discord: "", twitter: "", tiktok: "", site: "" },
});

/** Busca um perfil na Zenkatu; se a pessoa não tem conta, o nome é digitado manualmente. */
function ProfilePicker({ draft, setDraft }: { draft: CastMember; setDraft: (d: CastMember) => void }) {
  const { data: usuariosRaw, isLoading } = useListUsuarios();
  const [search, setSearch] = useState("");

  const usuarios = Array.isArray(usuariosRaw) ? usuariosRaw : [];
  const term = search.trim().toLowerCase();
  const results = term
    ? usuarios
        .filter(
          (u) =>
            (u.username || "").toLowerCase().includes(term) && u.uid !== draft.uid,
        )
        .slice(0, 5)
    : [];

  const linked = draft.uid ? usuarios.find((u) => u.uid === draft.uid) : undefined;

  return (
    <div className="space-y-2 rounded-lg border border-border bg-background/50 p-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Perfil na Zenkatu
      </p>

      {linked ? (
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border bg-secondary">
            {linked.photoUrl ? (
              <img src={linked.photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">
                {linked.username?.[0]?.toUpperCase() || "Z"}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
              <span className="min-w-0 truncate">{linked.username}</span>
              {linked.isZenkatuber && (
                <BadgeCheck className="w-3.5 h-3.5 shrink-0 text-blue-400" />
              )}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              Conta vinculada a este membro
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 gap-1.5 text-muted-foreground hover:text-destructive"
            onClick={() => setDraft({ ...draft, uid: undefined })}
          >
            <X className="h-3.5 w-3.5" /> Desvincular
          </Button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar pessoa pelo nome de usuário..."
              className="h-9 bg-background pl-8 text-sm"
            />
          </div>

          {isLoading && search.trim() && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando...
            </p>
          )}

          {results.length > 0 && (
            <div className="space-y-1">
              {results.map((u) => (
                <button
                  key={u.uid}
                  type="button"
                  onClick={() => {
                    setDraft({
                      ...draft,
                      uid: u.uid,
                      nome: u.username || draft.nome,
                      // Carrega automaticamente a foto de quem já tem conta na Zenkatu.
                      fotoUrl: u.photoUrl || draft.fotoUrl || "",
                    });
                    setSearch("");
                  }}
                  className="flex w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-secondary">
                    {u.photoUrl ? (
                      <img src={u.photoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-muted-foreground">
                        {u.username?.[0]?.toUpperCase() || "Z"}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {u.username}
                  </div>
                  <UserCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                </button>
              ))}
            </div>
          )}

          {term && !isLoading && results.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nenhuma conta encontrada. Preencha o nome manualmente abaixo.
            </p>
          )}

          <p className="text-xs text-muted-foreground/70">
            Sem conta na Zenkatu? Deixe este campo vazio e escreva o nome manualmente.
          </p>
        </>
      )}
    </div>
  );
}

export function CastEditor({
  cast,
  onChange,
}: {
  cast: CastMember[];
  onChange: (c: CastMember[]) => void;
}) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState<CastMember>(emptyCastMember());

  const openAdd = () => {
    setDraft(emptyCastMember());
    setEditingIdx(-1);
  };

  const openEdit = (idx: number) => {
    setDraft(JSON.parse(JSON.stringify(cast[idx])));
    setEditingIdx(idx);
  };

  const handleSave = () => {
    if (!draft.nome.trim() || !draft.papel.trim()) return;
    const cleaned: CastMember = {
      uid: draft.uid || undefined,
      nome: draft.nome.trim(),
      papel: draft.papel.trim(),
      fotoUrl: draft.fotoUrl?.trim() || undefined,
      links: {
        youtube: draft.links?.youtube?.trim() || undefined,
        instagram: draft.links?.instagram?.trim() || undefined,
        discord: draft.links?.discord?.trim() || undefined,
        twitter: draft.links?.twitter?.trim() || undefined,
        tiktok: draft.links?.tiktok?.trim() || undefined,
        site: draft.links?.site?.trim() || undefined,
      },
    };
    if (editingIdx === -1) {
      onChange([...cast, cleaned]);
    } else if (editingIdx !== null) {
      const updated = [...cast];
      updated[editingIdx] = cleaned;
      onChange(updated);
    }
    setEditingIdx(null);
  };

  const handleRemove = (idx: number) => {
    onChange(cast.filter((_, i) => i !== idx));
  };

  const isOpen = editingIdx !== null;

  return (
    <div className="space-y-4">
      {cast.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          Nenhum membro adicionado ainda.
        </p>
      )}

      <div className="space-y-3">
        {cast.map((member, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/50"
          >
            {member.fotoUrl ? (
              <img
                src={member.fotoUrl}
                alt={member.nome}
                className="w-10 h-10 rounded-full object-cover border border-border flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-sm font-bold text-muted-foreground">
                {member.nome[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="flex min-w-0 items-center gap-1.5 font-medium text-sm text-foreground">
                <span className="min-w-0 truncate">{member.nome}</span>
                {member.uid && (
                  <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary font-normal">
                    Perfil na Zenkatu
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground truncate">{member.papel}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs"
                onClick={() => openEdit(idx)}
              >
                Editar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-destructive hover:text-destructive"
                onClick={() => handleRemove(idx)}
                aria-label="Remover membro"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={openAdd} className="gap-2">
        <Plus className="w-4 h-4" /> Adicionar membro
      </Button>

      <Dialog open={isOpen} onOpenChange={(o) => !o && setEditingIdx(null)}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md bg-card border-border max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>
              {editingIdx === -1 ? "Adicionar membro" : "Editar membro"}
            </DialogTitle>
          </DialogHeader>

          <div className="min-w-0 flex-1 space-y-4">
            <ProfilePicker draft={draft} setDraft={setDraft} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Nome *</label>
                <Input
                  value={draft.nome}
                  onChange={(e) => setDraft({ ...draft, nome: e.target.value })}
                  placeholder="Ex: João Silva"
                  className="bg-background h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Papel *</label>
                <Input
                  value={draft.papel}
                  onChange={(e) => setDraft({ ...draft, papel: e.target.value })}
                  placeholder="Ex: Dublador, Editor"
                  className="bg-background h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Foto de perfil
              </label>
              <ImageUploadField
                value={draft.fotoUrl || null}
                onChange={(url) => setDraft({ ...draft, fotoUrl: url || "" })}
                previewClassName="h-12 w-12 rounded-full"
                hint="Convertida para WebP e salva no banco de dados."
                buttonLabel="Enviar foto"
              />
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Redes Sociais
              </p>
              <SocialLinksEditor
                links={draft.links ?? {}}
                onChange={(links) => setDraft({ ...draft, links })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setEditingIdx(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!draft.nome.trim() || !draft.papel.trim()}
              onClick={handleSave}
            >
              <Save className="w-4 h-4 mr-1" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
