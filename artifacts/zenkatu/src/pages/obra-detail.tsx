import { useEffect, useState, useRef, memo } from "react";
import { useParams, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CustomPlayer } from "@/components/custom-player";
import {
  useGetObraBySlug,
  getGetObraBySlugQueryKey,
  useIncrementObraView,
  useListObraEpisodios,
  useListComentarios,
  useCreateComentario,
  useDeleteComentario,
  useUpdateComentario,
  getListComentariosQueryKey,
  useGetUsuarioLista,
  useAddToLista,
  useRemoveFromLista,
  useAddToHistorico,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { VerifiedBadge } from "@/components/verified-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Play, ChevronDown, ChevronUp, Trash2, Edit2, MessageSquare, Send, Bookmark, BookmarkCheck, Reply, X, Check, Youtube, Instagram, MessageCircle, Twitter, Globe, Music, Users, Share2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CAST_PREVIEW_COUNT = 8;

function getYouTubeEmbedUrl(url: string): string | null {
  if (url.includes("youtube.com/embed/")) return url;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

const Player = memo(function Player({
  content,
  episodeNumber,
  episodeLabel,
  episodeTitle,
  synopsis,
}: {
  content: string;
  episodeNumber?: number;
  episodeLabel?: string;
  episodeTitle?: string;
  synopsis?: string;
}) {
  const embedRef = useRef<HTMLDivElement>(null);
  const [showEpisodeInfo, setShowEpisodeInfo] = useState(true);
  const trimmed = content.trim();
  const isHtml = trimmed.startsWith("<");
  const isDirectVideo =
    /\.(mp4|webm)(?:[?#]|$)/i.test(trimmed) ||
    /\.m3u8(?:[?#]|$)/i.test(trimmed) ||
    trimmed.includes("archive.org/download/") ||
    trimmed.includes("archive.org/serve/");
  const isDownloadable = !isHtml && (
    /\.(mp4|webm)(?:[?#]|$)/i.test(trimmed) ||
    trimmed.includes("archive.org/download/") ||
    trimmed.includes("archive.org/serve/")
  );

  const youtubeEmbed = !isHtml && !isDirectVideo ? getYouTubeEmbedUrl(trimmed) : null;
  const iframeSrc = youtubeEmbed ?? trimmed;
  const showBrandOverlay = !isDirectVideo;

  useEffect(() => {
    setShowEpisodeInfo(true);
    const timer = window.setTimeout(() => setShowEpisodeInfo(false), 5000);
    return () => window.clearTimeout(timer);
  }, [content]);

  const brandOverlay = showBrandOverlay ? (
    <>
      <div className="pointer-events-none absolute left-4 top-4 z-10 select-none rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-[10px] font-bold tracking-[0.2em] text-white/80 backdrop-blur-sm">
        ZENKATU <span className="font-medium tracking-[0.12em] text-white/55">PLAYER</span>
      </div>
      {showEpisodeInfo && <div className="pointer-events-none absolute bottom-12 left-4 z-10 max-w-[75%] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,.9)] sm:bottom-16 sm:left-6">
        <p className="mb-1 text-xs text-white/65 sm:text-sm">Você está assistindo</p>
        {episodeLabel && <p className="text-xs font-medium text-white/75">{episodeLabel}</p>}
        {episodeTitle && <p className="font-display text-lg font-bold leading-tight sm:text-2xl">{episodeTitle}</p>}
        {synopsis && <p className="mt-1 hidden line-clamp-2 max-w-2xl text-sm text-white/75 md:block">{synopsis}</p>}
      </div>}
    </>
  ) : null;

  useEffect(() => {
    if (isHtml && embedRef.current) {
      embedRef.current.innerHTML = trimmed;
    }
  }, [isHtml, trimmed]);

  if (isHtml) {
    return (
      <div className="relative w-full aspect-video overflow-hidden rounded-none bg-black sm:rounded-xl">
        <div
          ref={embedRef}
          className="absolute inset-0 [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0 [&>*]:w-full [&>*]:h-full"
        />
        {brandOverlay}
      </div>
    );
  }

  if (isDirectVideo) {
    return (
      <CustomPlayer
        src={trimmed}
        downloadUrl={isDownloadable ? trimmed : undefined}
        downloadName={isDownloadable ? `zenkatu-episodio-${episodeNumber ?? "video"}` : undefined}
        episodeLabel={episodeLabel}
        episodeTitle={episodeTitle}
        synopsis={synopsis}
      />
    );
  }

  return (
    <div className="relative w-full aspect-video overflow-hidden rounded-none bg-black sm:rounded-xl">
      <iframe
        src={iframeSrc}
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        className="absolute inset-0 w-full h-full border-0"
      />
      {brandOverlay}
    </div>
  );
});

type ComentarioShape = {
  id: number;
  obraId: number;
  userId: string;
  username: string;
  userPhoto?: string | null;
  texto: string;
  parentId?: number | null;
  editado?: boolean;
  isZenkatuber?: boolean;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
};

interface ComentarioItemProps {
  comentario: ComentarioShape;
  replies: ComentarioShape[];
  currentUserId?: string;
  isAdmin: boolean;
  onDelete: (id: number) => void;
  onReply: (parentId: number, text: string) => void;
  onEdit: (id: number, text: string) => void;
  canInteract: boolean;
}

function ComentarioItem({ comentario, replies, currentUserId, isAdmin, onDelete, onReply, onEdit, canInteract }: ComentarioItemProps) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comentario.texto);
  const [showReplies, setShowReplies] = useState(true);

  const handleReplySubmit = () => {
    if (!replyText.trim()) return;
    onReply(comentario.id, replyText.trim());
    setReplyText("");
    setShowReplyBox(false);
  };

  const handleEditSubmit = () => {
    if (!editText.trim()) return;
    onEdit(comentario.id, editText.trim());
    setIsEditing(false);
  };

  const isOwner = currentUserId === comentario.userId;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 group">
      <Avatar className="h-9 w-9 border border-border flex-shrink-0 mt-0.5">
        <AvatarImage src={comentario.userPhoto || ""} />
        <AvatarFallback className="bg-secondary text-xs">{comentario.username[0].toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-foreground text-sm">{comentario.username}</span>
          {comentario.isZenkatuber && <VerifiedBadge verifiedAt={comentario.verifiedAt} />}
          <span className="text-xs text-muted-foreground">
            {format(new Date(comentario.createdAt), "dd 'de' MMM, yyyy", { locale: ptBR })}
          </span>
          {comentario.editado && <span className="text-xs text-muted-foreground italic">(editado)</span>}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value.slice(0, 500))}
              className="min-h-[80px] text-sm bg-card border-border resize-none"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleEditSubmit} className="h-7 px-3 text-xs">
                <Check className="w-3 h-3 mr-1" /> Salvar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setIsEditing(false); setEditText(comentario.texto); }} className="h-7 px-3 text-xs">
                <X className="w-3 h-3 mr-1" /> Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-foreground/90 whitespace-pre-wrap text-sm leading-relaxed">{comentario.texto}</p>
        )}

        {!isEditing && (
          <div className="flex items-center gap-3 mt-2">
            {canInteract && (
              <button
                onClick={() => setShowReplyBox(!showReplyBox)}
                  aria-label={`Responder ao comentário de ${comentario.username}`}
                className="text-xs text-muted-foreground hover:text-primary flex items-center transition-colors gap-1"
              >
                <Reply className="w-3 h-3" /> Responder
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => setIsEditing(true)}
                  aria-label={`Editar comentário de ${comentario.username}`}
                className="text-xs text-muted-foreground hover:text-primary flex items-center transition-colors gap-1"
              >
                <Edit2 className="w-3 h-3" /> Editar
              </button>
            )}
            {(isAdmin || isOwner) && (
              <button
                onClick={() => onDelete(comentario.id)}
                  aria-label={`Excluir comentário de ${comentario.username}`}
                className="text-xs text-muted-foreground hover:text-destructive flex items-center transition-colors gap-1"
              >
                <Trash2 className="w-3 h-3" /> Excluir
              </button>
            )}
            {replies.length > 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                  aria-expanded={showReplies}
                  aria-label={`${showReplies ? "Ocultar" : "Mostrar"} respostas de ${comentario.username}`}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center transition-colors gap-1 ml-auto"
              >
                {showReplies ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {replies.length} {replies.length === 1 ? "resposta" : "respostas"}
              </button>
            )}
          </div>
        )}

        <AnimatePresence>
          {showReplyBox && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-2 overflow-hidden"
            >
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value.slice(0, 500))}
                placeholder={`Responder para ${comentario.username}...`}
                className="min-h-[80px] text-sm bg-card border-border resize-none"
                autoFocus
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{replyText.length}/500</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setShowReplyBox(false)} className="h-7 px-3">Cancelar</Button>
                  <Button size="sm" onClick={handleReplySubmit} disabled={!replyText.trim()} className="h-7 px-3">
                    <Send className="w-3 h-3 mr-1" /> Responder
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showReplies && replies.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-4 ml-4 pl-4 border-l-2 border-border/50 space-y-4"
            >
              {replies.map(reply => (
                <ComentarioItem
                  key={reply.id}
                  comentario={reply}
                  replies={[]}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  onDelete={onDelete}
                  onReply={onReply}
                  onEdit={onEdit}
                  canInteract={canInteract}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function ObraDetail() {
  const { slug } = useParams<{ slug: string }>();
  const search = useSearch();
  const epIdFromUrl = Number(new URLSearchParams(search).get("ep")) || null;
  const { currentUser, userProfile, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: obra, isLoading: loadingObra } = useGetObraBySlug(slug, {
    query: {
      enabled: !!slug,
      queryKey: getGetObraBySlugQueryKey(slug),
    }
  });

  const incrementView = useIncrementObraView();
  const hasIncremented = useRef(false);

  useEffect(() => {
    if (obra?.id && !hasIncremented.current) {
      hasIncremented.current = true;
      incrementView.mutate({ obraId: obra.id });
    }
  }, [obra?.id, incrementView]);

  const { data: episodiosRaw, isLoading: loadingEpisodios } = useListObraEpisodios(obra?.id || 0, {
    query: { enabled: !!obra?.id, queryKey: ["listObraEpisodios", obra?.id || 0] },
  });
  const episodios = Array.isArray(episodiosRaw) ? episodiosRaw : [];

  const { data: comentariosRaw, isLoading: loadingComentarios } = useListComentarios(obra?.id || 0, {
    query: { enabled: !!obra?.id, queryKey: getListComentariosQueryKey(obra?.id || 0) },
  });
  const comentarios = Array.isArray(comentariosRaw) ? comentariosRaw : [];

  const { data: listaObrasRaw } = useGetUsuarioLista(currentUser?.uid || "", {
    query: {
      enabled: !!currentUser?.uid,
      queryKey: ["getUsuarioLista", currentUser?.uid || ""],
    },
  });
  const listaObras = Array.isArray(listaObrasRaw) ? listaObrasRaw : [];

  const addToLista = useAddToLista();
  const removeFromLista = useRemoveFromLista();
  const addToHistorico = useAddToHistorico();

  const isInLista = obra ? listaObras.some(o => o.id === obra.id) : false;

  const handleToggleLista = async () => {
    if (!obra) return;
    if (!currentUser) {
      toast({
        title: "Entre na sua conta para favoritar",
        description: "Faça login para salvar esta obra na sua lista.",
      });
      return;
    }
    try {
      if (isInLista) {
        await removeFromLista.mutateAsync({ uid: currentUser.uid, obraId: obra.id });
        toast({ title: "Removido da lista" });
      } else {
        await addToLista.mutateAsync({ uid: currentUser.uid, data: { obraId: obra.id } });
        toast({ title: "Adicionado à lista" });
      }
      queryClient.invalidateQueries({ queryKey: ["getUsuarioLista", currentUser.uid] });
    } catch {
      toast({ title: "Erro ao atualizar lista", variant: "destructive" });
    }
  };

  const getShareUrl = () => {
    if (!obra?.slug) return window.location.href;
    const url = new URL(
      `/obra/${encodeURIComponent(obra.slug)}`,
      window.location.origin,
    );
    if (activeEpisodeId) {
      url.searchParams.set("ep", String(activeEpisodeId));
    }
    return url.toString();
  };

  const handleCopyShareLink = async () => {
    const shareUrl = getShareUrl();
    try {
      let copied = false;
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          copied = true;
        } catch {
          // Fall through to the legacy copy method when clipboard permission is denied.
        }
      }
      if (!copied) {
        const textarea = document.createElement("textarea");
        textarea.value = shareUrl;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        try {
          textarea.select();
          copied = document.execCommand("copy");
        } finally {
          textarea.remove();
        }
      }
      if (!copied) throw new Error("Clipboard unavailable");
      toast({ title: "Link copiado", description: "Compartilhe a obra com quem quiser." });
    } catch {
      toast({
        title: "Não foi possível copiar o link",
        description: "Verifique a permissão de área de transferência do navegador.",
        variant: "destructive",
      });
    }
  };

  const handleShareOnWhatsApp = () => {
    const shareUrl = getShareUrl();
    const episodeDescription = activeEpisode
      ? ` — T${activeEpisode.temporada} E${activeEpisode.numero}: ${activeEpisode.titulo}`
      : "";
    const message = `Estou assistindo ${obra?.titulo ?? "esta obra"}${episodeDescription}. Assista também: ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  const [activeEpisodeId, setActiveEpisodeId] = useState<number | null>(epIdFromUrl);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [isSinopseExpanded, setIsSinopseExpanded] = useState(false);
  const [isCastExpanded, setIsCastExpanded] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(!!epIdFromUrl);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(true);
  const [newComment, setNewComment] = useState("");
  const playerSectionRef = useRef<HTMLDivElement>(null);

  const createComentario = useCreateComentario();
  const deleteComentario = useDeleteComentario();
  const updateComentario = useUpdateComentario();

  useEffect(() => {
    if (episodios.length === 0) return;
    if (activeEpisodeId) {
      const ep = episodios.find(e => e.id === activeEpisodeId);
      if (ep) {
        setSelectedSeason(ep.temporada);
        if (currentUser?.uid && obra?.id) {
          addToHistorico.mutate({ uid: currentUser.uid, data: { episodioId: ep.id, obraId: obra.id } }, {
            onSuccess: () => queryClient.invalidateQueries({ queryKey: ["getUsuarioHistorico", currentUser.uid] }),
          });
        }
      } else {
        const first = episodios[0];
        setActiveEpisodeId(first.id);
        setSelectedSeason(first.temporada);
        if (currentUser?.uid && obra?.id) {
          addToHistorico.mutate({ uid: currentUser.uid, data: { episodioId: first.id, obraId: obra.id } }, {
            onSuccess: () => queryClient.invalidateQueries({ queryKey: ["getUsuarioHistorico", currentUser.uid] }),
          });
        }
      }
    } else {
      const first = episodios[0];
      setActiveEpisodeId(first.id);
      setSelectedSeason(first.temporada);
      if (currentUser?.uid && obra?.id) {
        addToHistorico.mutate({ uid: currentUser.uid, data: { episodioId: first.id, obraId: obra.id } }, {
          onSuccess: () => queryClient.invalidateQueries({ queryKey: ["getUsuarioHistorico", currentUser.uid] }),
        });
      }
    }
  }, [episodios, obra?.id]);

  const handleSelectEpisode = (episodioId: number) => {
    setActiveEpisodeId(episodioId);
    setIsPlayerOpen(true);
    if (currentUser?.uid && obra?.id) {
      addToHistorico.mutate({ uid: currentUser.uid, data: { episodioId, obraId: obra.id } }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["getUsuarioHistorico", currentUser.uid] }),
      });
    }
  };

  useEffect(() => {
    if (!isPlayerOpen) return;
    const frame = window.requestAnimationFrame(() => {
      playerSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isPlayerOpen, activeEpisodeId]);

  const seasons = Array.from(new Set(episodios.map(ep => ep.temporada))).sort((a, b) => a - b);
  const filteredEpisodes = episodios.filter(ep => ep.temporada === selectedSeason).sort((a, b) => a.numero - b.numero);
  const activeEpisode = episodios.find(ep => ep.id === activeEpisodeId);

  const handlePostComment = async () => {
    if (!currentUser || !userProfile || !obra?.id) return;
    if (!newComment.trim()) return;

    try {
      await createComentario.mutateAsync({
        obraId: obra.id,
        data: {
          userId: currentUser.uid,
          username: userProfile.username || currentUser.displayName || "Usuário",
          userPhoto: userProfile.photoUrl || currentUser.photoURL || null,
          texto: newComment.trim(),
          parentId: null,
        }
      });
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: getListComentariosQueryKey(obra.id) });

      fetch("https://formspree.io/f/xgobzerg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: currentUser.email,
          nome: userProfile.username || currentUser.displayName || "Usuário",
          userId: currentUser.uid,
          foto: userProfile.photoUrl || currentUser.photoURL || null,
          obra: obra.titulo,
          tipo: "comentário",
          mensagem: newComment.trim()
        })
      }).catch(() => {});

      toast({ title: "Comentário publicado" });
    } catch {
      toast({ title: "Erro ao publicar", variant: "destructive" });
    }
  };

  const handleReply = async (parentId: number, text: string) => {
    if (!currentUser || !userProfile || !obra?.id) return;
    try {
      await createComentario.mutateAsync({
        obraId: obra.id,
        data: {
          userId: currentUser.uid,
          username: userProfile.username || currentUser.displayName || "Usuário",
          userPhoto: userProfile.photoUrl || currentUser.photoURL || null,
          texto: text,
          parentId,
        }
      });
      queryClient.invalidateQueries({ queryKey: getListComentariosQueryKey(obra.id) });

      fetch("https://formspree.io/f/xgobzerg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: currentUser.email,
          nome: userProfile.username || currentUser.displayName || "Usuário",
          userId: currentUser.uid,
          foto: userProfile.photoUrl || currentUser.photoURL || null,
          obra: obra.titulo,
          tipo: "resposta",
          mensagem: text
        })
      }).catch(() => {});

      toast({ title: "Resposta publicada" });
    } catch {
      toast({ title: "Erro ao responder", variant: "destructive" });
    }
  };

  const handleEditComment = async (id: number, texto: string) => {
    if (!obra?.id) return;
    try {
      await updateComentario.mutateAsync({ comentarioId: id, data: { texto } });
      queryClient.invalidateQueries({ queryKey: getListComentariosQueryKey(obra.id) });
      toast({ title: "Comentário atualizado" });
    } catch {
      toast({ title: "Erro ao editar", variant: "destructive" });
    }
  };

  const handleDeleteComment = async (id: number) => {
    if (!obra?.id) return;
    try {
      await deleteComentario.mutateAsync({ comentarioId: id });
      queryClient.invalidateQueries({ queryKey: getListComentariosQueryKey(obra.id) });
      toast({ title: "Comentário removido" });
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  if (loadingObra) {
    return (
      <div className="animate-pulse">
        <div className="w-full aspect-[21/9] bg-secondary/50" />
        <div className="container mt-8 max-w-screen-2xl px-4 space-y-4">
          <div className="h-12 bg-secondary/50 rounded w-1/3" />
          <div className="h-6 bg-secondary/50 rounded w-1/4" />
        </div>
      </div>
    );
  }

  if (!obra) {
    return <div className="p-12 text-center text-xl">Obra não encontrada</div>;
  }

  const topLevelComments = comentarios.filter(c => !c.parentId);
  const getReplies = (parentId: number) => comentarios.filter(c => c.parentId === parentId);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-20 overflow-hidden">
      {/* Capa cinematográfica */}
      <section className="relative isolate -mt-0 aspect-[4/5] max-h-[820px] w-full overflow-hidden bg-[#070a10] sm:aspect-[16/9] md:aspect-[21/9]">
        <img
          src={obra.bannerUrl || obra.capaUrl || "https://placehold.co/1920x1080/0F1C2E/1E3A8A"}
          alt={`Capa de ${obra.titulo}`}
          className="absolute inset-0 h-full w-full object-cover object-center"
          data-testid="img-obra-banner"
        />
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#070a10] via-[#070a10]/65 to-[#070a10]/10" />
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#070a10]/70 via-transparent to-[#070a10]/10" />
        <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(115deg,rgba(7,10,18,.18),transparent_55%,rgba(59,130,246,.14))]" />

        <div className="container absolute inset-x-0 bottom-0 z-20 mx-auto max-w-screen-2xl px-5 pb-7 pt-20 sm:px-8 sm:pb-10 md:px-12 md:pb-14">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-medium text-white/80 sm:text-sm">
            <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1 backdrop-blur-sm">{obra.ano}</span>
            <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1 backdrop-blur-sm">{obra.status}</span>
            {obra.totalEps && <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1 backdrop-blur-sm">{obra.totalEps} episódios</span>}
            {obra.nota != null && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/20 px-3 py-1 text-white backdrop-blur-sm">
                <span className="font-bold text-primary">Z</span> {obra.nota}/10
              </span>
            )}
          </div>

          {obra.tipografiaUrl ? (
            <img
              src={obra.tipografiaUrl}
              alt={obra.titulo}
              className="mb-4 max-h-20 w-auto max-w-[min(90%,520px)] object-contain object-left drop-shadow-2xl sm:mb-5 sm:max-h-24"
              data-testid="img-obra-title"
            />
          ) : (
            <h1 className="mb-4 max-w-3xl font-display text-4xl font-bold leading-[.95] tracking-tight text-white drop-shadow-xl sm:text-6xl md:text-7xl" data-testid="text-obra-title">
              {obra.titulo}
            </h1>
          )}

          <div className="mb-5 flex flex-wrap items-center gap-2">
            {obra.generos?.map(g => (
              <Badge key={g} variant="secondary" className="border border-white/10 bg-white/10 text-white/85 backdrop-blur-sm">
                {g}
              </Badge>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => activeEpisode && setIsPlayerOpen(true)}
              disabled={!activeEpisode}
              aria-controls="episode-player"
              data-testid="button-play-episode"
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2.5 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#10131a] shadow-[0_8px_28px_rgba(0,0,0,.25)] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-55 sm:flex-none sm:min-w-[260px] sm:text-base"
            >
              <Play className="h-5 w-5 fill-current" />
              {activeEpisode ? `Reproduzir T${activeEpisode.temporada} E${activeEpisode.numero}` : loadingEpisodios ? "Carregando episódios..." : "Episódios em breve"}
            </button>
            <div className="flex flex-none items-center gap-3">
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={handleToggleLista}
                aria-label={
                  currentUser
                    ? isInLista ? "Remover obra da minha lista" : "Adicionar obra à minha lista"
                    : "Entrar para favoritar esta obra"
                }
                data-testid="button-toggle-watchlist"
                className={`h-12 w-12 shrink-0 rounded-full border-white/20 bg-black/35 text-white backdrop-blur-md hover:bg-white/10 ${isInLista ? "text-primary" : ""}`}
              >
                {currentUser && isInLista ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    aria-label={`Compartilhar ${obra.titulo}`}
                    data-testid="button-share-obra"
                    className="h-12 w-12 shrink-0 rounded-full border-white/20 bg-black/35 text-white backdrop-blur-md hover:bg-white/10"
                  >
                    <Share2 className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onSelect={() => void handleCopyShareLink()} className="cursor-pointer gap-2">
                    <Copy className="h-4 w-4" />
                    Copiar link
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleShareOnWhatsApp} className="cursor-pointer gap-2">
                    <MessageCircle className="h-4 w-4 text-green-500" />
                    Compartilhar no WhatsApp
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-screen-xl px-4 pb-10 pt-7 sm:px-6 md:pt-10">
        <div className="space-y-10 md:space-y-12">
          {isPlayerOpen && activeEpisode && (
            <section ref={playerSectionRef} id="episode-player" className="scroll-mt-5" aria-label="Player do episódio">
              <div className="mb-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Zenkatu Player</p>
                  <h2 className="mt-1 truncate font-display text-xl font-bold text-white sm:text-2xl">
                    T{activeEpisode.temporada} E{activeEpisode.numero} <span className="text-white/55">—</span> {activeEpisode.titulo}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPlayerOpen(false)}
                  className="rounded-full border border-white/10 p-2 text-white/65 transition hover:bg-white/10 hover:text-white"
                  aria-label="Fechar player"
                  data-testid="button-close-player"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <Player
                key={activeEpisode.id}
                content={activeEpisode.playerContent}
                episodeNumber={activeEpisode.numero}
                episodeLabel={`T${activeEpisode.temporada} E${activeEpisode.numero}`}
                episodeTitle={activeEpisode.titulo}
                synopsis={obra.sinopse}
              />
            </section>
          )}

          {/* Sinopse */}
          <section className="border-b border-white/10 pb-8">
            <h2 className="mb-3 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">Sinopse</h2>
            <p className={`max-w-4xl text-sm leading-7 text-white/70 sm:text-base ${!isSinopseExpanded && "line-clamp-3"}`} data-testid="text-obra-synopsis">
              {obra.sinopse}
            </p>
            {obra.sinopse.length > 200 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSinopseExpanded(!isSinopseExpanded)}
                data-testid="button-expand-synopsis"
                className="mt-2 h-auto p-0 font-medium text-primary hover:text-primary/80"
              >
                {isSinopseExpanded ? <><ChevronUp className="mr-1 h-4 w-4" /> Mostrar menos</> : <><ChevronDown className="mr-1 h-4 w-4" /> Mostrar mais</>}
              </Button>
            )}
          </section>

          {/* Equipe / Cast */}
          {Array.isArray((obra as any).cast) && (obra as any).cast.length > 0 && (
            <section>
              <div className="mb-5 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">Elenco</h2>
                <span className="text-sm font-normal text-muted-foreground">
                  ({(obra as any).cast.length})
                </span>
              </div>
              <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
                {((isCastExpanded ? (obra as any).cast : (obra as any).cast.slice(0, CAST_PREVIEW_COUNT)) as Array<{
                  nome: string; papel: string; fotoUrl?: string;
                  links?: { youtube?: string; instagram?: string; discord?: string; twitter?: string; tiktok?: string; site?: string };
                }>).map((member, idx) => (
                  <div key={idx} className="flex w-[106px] shrink-0 snap-start flex-col items-center gap-2 text-center sm:w-[116px]">
                    <div className="h-[76px] w-[76px] shrink-0 overflow-hidden rounded-full border border-white/15 bg-secondary shadow-[0_8px_24px_rgba(0,0,0,.3)] sm:h-[88px] sm:w-[88px]">
                      {member.fotoUrl ? (
                        <img src={member.fotoUrl} alt={member.nome} className="h-full w-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} data-testid={`img-cast-${idx}`} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xl font-bold text-muted-foreground">
                          {member.nome[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="w-full min-w-0">
                      <p className="truncate text-sm font-semibold leading-tight text-foreground" data-testid={`text-cast-name-${idx}`}>{member.nome}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{member.papel}</p>
                    </div>
                    {member.links && (
                      <div className="flex flex-wrap justify-center gap-2">
                        {member.links.youtube && (
                  <a href={member.links.youtube} target="_blank" rel="noopener noreferrer" aria-label={`YouTube de ${member.nome}`} className="text-muted-foreground hover:text-red-500 transition-colors" title="YouTube">
                            <Youtube className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {member.links.instagram && (
                          <a href={member.links.instagram} target="_blank" rel="noopener noreferrer" aria-label={`Instagram de ${member.nome}`} className="text-muted-foreground hover:text-pink-500 transition-colors" title="Instagram">
                            <Instagram className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {member.links.discord && (
                          <a href={member.links.discord} target="_blank" rel="noopener noreferrer" aria-label={`Discord de ${member.nome}`} className="text-muted-foreground hover:text-indigo-400 transition-colors" title="Discord">
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {member.links.twitter && (
                          <a href={member.links.twitter} target="_blank" rel="noopener noreferrer" aria-label={`Twitter ou X de ${member.nome}`} className="text-muted-foreground hover:text-sky-400 transition-colors" title="Twitter / X">
                            <Twitter className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {member.links.tiktok && (
                          <a href={member.links.tiktok} target="_blank" rel="noopener noreferrer" aria-label={`TikTok de ${member.nome}`} className="text-muted-foreground hover:text-foreground transition-colors" title="TikTok">
                            <Music className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {member.links.site && (
                          <a href={member.links.site} target="_blank" rel="noopener noreferrer" aria-label={`Site de ${member.nome}`} className="text-muted-foreground hover:text-primary transition-colors" title="Site">
                            <Globe className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {(obra as any).cast.length > CAST_PREVIEW_COUNT && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCastExpanded(!isCastExpanded)}
                  data-testid="button-expand-cast"
                  className="mt-3 h-auto p-0 font-medium text-primary hover:text-primary/80"
                >
                  {isCastExpanded ? (
                    <><ChevronUp className="w-4 h-4 mr-1" /> Ver menos</>
                  ) : (
                    <><ChevronDown className="w-4 h-4 mr-1" /> Ver mais ({(obra as any).cast.length - CAST_PREVIEW_COUNT})</>
                  )}
                </Button>
              )}
            </section>
          )}

          {/* Temporadas e episódios */}
          <section data-testid="section-episodes">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Continue assistindo</p>
                <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">Temporada {selectedSeason}</h2>
              </div>
              {seasons.length > 1 && (
                <Select value={selectedSeason.toString()} onValueChange={v => setSelectedSeason(Number(v))}>
                  <SelectTrigger className="h-9 w-[150px] border-white/15 bg-white/5 text-white" data-testid="select-season">
                    <SelectValue placeholder="Temporada" />
                  </SelectTrigger>
                  <SelectContent>
                    {seasons.map(s => (
                      <SelectItem key={s} value={s.toString()}>Temporada {s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {loadingEpisodios ? (
              <div className="flex gap-4 overflow-hidden">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-[280px] shrink-0 rounded-2xl" />)}
              </div>
            ) : filteredEpisodes.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-white/[0.03] py-8 text-center text-muted-foreground">Nenhum episódio encontrado.</p>
            ) : (
              <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0" data-testid="list-episodes">
                {filteredEpisodes.map(ep => {
                  const isActive = activeEpisodeId === ep.id;
                  return (
                    <button
                      key={ep.id}
                      type="button"
                      onClick={() => handleSelectEpisode(ep.id)}
                      aria-label={`Assistir episódio ${ep.numero}: ${ep.titulo}`}
                      aria-current={isActive ? "true" : undefined}
                      data-testid={`card-episode-${ep.id}`}
                      className={`group relative aspect-[1.48/1] w-[min(82vw,320px)] shrink-0 snap-start overflow-hidden rounded-2xl border bg-[#10131a] text-left shadow-[0_10px_34px_rgba(0,0,0,.22)] transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-[320px] ${
                        isActive ? "border-primary/75 ring-1 ring-primary/40" : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <img
                        src={ep.thumbnailUrl || obra.capaUrl || "https://placehold.co/640x430/0F1C2E/1E3A8A"}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-black/10" />
                      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
                        <span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-sm">
                          T{ep.temporada} E{ep.numero}
                        </span>
                        <span className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/25 text-white backdrop-blur-sm transition ${isActive ? "bg-primary text-white" : "group-hover:bg-white group-hover:text-black"}`}>
                          <Play className="ml-0.5 h-4 w-4 fill-current" />
                        </span>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <p className="mb-1 text-xs font-medium uppercase tracking-[0.15em] text-white/65">{isActive ? "Assistindo agora" : `Episódio ${ep.numero}`}</p>
                        <h3 className="line-clamp-2 font-display text-lg font-bold leading-tight text-white sm:text-xl">{ep.titulo}</h3>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Detalhes */}
          <section className="border-y border-white/10 py-5" data-testid="section-details">
            <button
              type="button"
              onClick={() => setIsDetailsExpanded(v => !v)}
              aria-expanded={isDetailsExpanded}
              aria-controls="obra-details"
              data-testid="button-toggle-details"
              className="flex w-full items-center justify-between gap-4 text-left"
            >
              <span className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">Mostrar Detalhes</span>
              {isDetailsExpanded ? <ChevronUp className="h-5 w-5 text-white/70" /> : <ChevronDown className="h-5 w-5 text-white/70" />}
            </button>
            {isDetailsExpanded && (
              <dl id="obra-details" className="mt-3 divide-y divide-white/10">
                <div className="flex items-center justify-between gap-6 py-4">
                  <dt className="text-sm text-white/65 sm:text-base">Status</dt>
                  <dd className="text-right text-sm font-medium text-white sm:text-base">{obra.status}</dd>
                </div>
                <div className="flex items-center justify-between gap-6 py-4">
                  <dt className="text-sm text-white/65 sm:text-base">Informações de lançamento</dt>
                  <dd className="text-right text-sm font-medium text-white sm:text-base">{obra.ano}</dd>
                </div>
                <div className="flex items-center justify-between gap-6 py-4">
                  <dt className="text-sm text-white/65 sm:text-base">Episódios</dt>
                  <dd className="text-right text-sm font-medium text-white sm:text-base">{obra.totalEps ?? episodios.length}</dd>
                </div>
                {obra.nota != null && (
                  <div className="flex items-center justify-between gap-6 py-4">
                    <dt className="text-sm text-white/65 sm:text-base">Nota Zenkatu</dt>
                    <dd className="text-right text-sm font-semibold text-primary sm:text-base">{obra.nota}/10</dd>
                  </div>
                )}
                {obra.generos?.length ? (
                  <div className="flex items-start justify-between gap-6 py-4">
                    <dt className="text-sm text-white/65 sm:text-base">Gêneros</dt>
                    <dd className="max-w-[65%] text-right text-sm font-medium text-white sm:text-base">{obra.generos.join(" · ")}</dd>
                  </div>
                ) : null}
              </dl>
            )}
          </section>

          {/* Comentários */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-white/10 pb-4">
              <MessageSquare className="w-6 h-6 text-primary" />
              <h3 className="font-display text-2xl font-bold">Comentários ({topLevelComments.length})</h3>
            </div>

            {currentUser ? (
              <div className="flex gap-4 rounded-sm border border-white/8 bg-[#111722]/80 p-4 md:p-5">
                <Avatar className="h-10 w-10 border border-border hidden sm:block flex-shrink-0">
                  <AvatarImage src={userProfile?.photoUrl || currentUser.photoURL || ""} />
                  <AvatarFallback>{currentUser.email?.[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Textarea
                    placeholder="Adicione um comentário..."
                    aria-label="Escreva seu comentário"
                    className="min-h-[100px] resize-y bg-[#0b1019] border-white/10 focus-visible:ring-primary/50"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value.slice(0, 500))}
                  />
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{newComment.length}/500</span>
                    <Button onClick={handlePostComment} disabled={!newComment.trim()} size="sm" aria-label="Publicar comentário" className="font-display tracking-wide bg-primary text-primary-foreground hover:bg-primary/90">
                      <Send className="w-4 h-4 mr-2" /> Publicar
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#111722]/80 border border-white/8 p-6 rounded-sm text-center">
                <p className="text-muted-foreground mb-4">Faça login para comentar nesta obra.</p>
              </div>
            )}

            <div className="space-y-6 mt-8">
              {loadingComentarios ? (
                <div className="space-y-4">
                  {[1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
                </div>
              ) : topLevelComments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum comentário ainda. Seja o primeiro!</p>
              ) : (
                topLevelComments.map(comentario => (
                  <ComentarioItem
                    key={comentario.id}
                    comentario={comentario}
                    replies={getReplies(comentario.id)}
                    currentUserId={currentUser?.uid}
                    isAdmin={isAdmin}
                    onDelete={handleDeleteComment}
                    onReply={handleReply}
                    onEdit={handleEditComment}
                    canInteract={!!currentUser}
                  />
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
