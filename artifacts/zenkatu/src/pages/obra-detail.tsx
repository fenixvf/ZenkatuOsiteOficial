import { useEffect, useState, useRef, memo } from "react";
import { useParams, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Hls from "hls.js";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, ChevronDown, ChevronUp, Trash2, Edit2, MessageSquare, Send, Bookmark, BookmarkCheck, Reply, X, Check, Youtube, Instagram, MessageCircle, Twitter, Globe, Music, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Player = memo(function Player({ content }: { content: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const embedRef = useRef<HTMLDivElement>(null);
  const trimmed = content.trim();
  const isHtml = trimmed.startsWith("<");

  // Para embeds HTML: setar innerHTML apenas uma vez (ou quando o conteúdo mudar)
  // Usar useRef em vez de dangerouslySetInnerHTML evita que o React destrua/recrie o iframe a cada re-render
  useEffect(() => {
    if (isHtml && embedRef.current) {
      embedRef.current.innerHTML = trimmed;
    }
  }, [isHtml, trimmed]);

  useEffect(() => {
    const isM3u8 = trimmed.endsWith(".m3u8") || trimmed.includes(".m3u8?");
    if (isM3u8 && videoRef.current) {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(trimmed);
        hls.attachMedia(videoRef.current);
        return () => hls.destroy();
      } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
        videoRef.current.src = trimmed;
      }
    }
    return undefined;
  }, [trimmed]);

  // HTML embed (iframe code, etc.)
  if (isHtml) {
    return (
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
        <div
          ref={embedRef}
          className="absolute inset-0 [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0 [&>*]:w-full [&>*]:h-full"
        />
      </div>
    );
  }

  // Direct video file
  if (
    trimmed.endsWith(".mp4") ||
    trimmed.endsWith(".m3u8") ||
    trimmed.includes(".m3u8?")
  ) {
    return (
      <video
        ref={videoRef}
        controls
        className="w-full aspect-video bg-black rounded-lg object-contain"
        src={trimmed.endsWith(".mp4") ? trimmed : undefined}
      />
    );
  }

  // Plain URL — render as iframe
  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      <iframe
        src={trimmed}
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        className="absolute inset-0 w-full h-full border-0"
      />
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
                className="text-xs text-muted-foreground hover:text-primary flex items-center transition-colors gap-1"
              >
                <Reply className="w-3 h-3" /> Responder
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-muted-foreground hover:text-primary flex items-center transition-colors gap-1"
              >
                <Edit2 className="w-3 h-3" /> Editar
              </button>
            )}
            {(isAdmin || isOwner) && (
              <button
                onClick={() => onDelete(comentario.id)}
                className="text-xs text-muted-foreground hover:text-destructive flex items-center transition-colors gap-1"
              >
                <Trash2 className="w-3 h-3" /> Excluir
              </button>
            )}
            {replies.length > 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
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
    if (!currentUser || !obra) return;
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

  const [activeEpisodeId, setActiveEpisodeId] = useState<number | null>(epIdFromUrl);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [isSinopseExpanded, setIsSinopseExpanded] = useState(false);
  const [newComment, setNewComment] = useState("");

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
    if (currentUser?.uid && obra?.id) {
      addToHistorico.mutate({ uid: currentUser.uid, data: { episodioId, obraId: obra.id } }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["getUsuarioHistorico", currentUser.uid] }),
      });
    }
  };

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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-20">
      {/* Hero */}
      <div className="relative w-full aspect-[16/9] md:aspect-[21/9] lg:aspect-[3/1]">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent z-10" />
        <img
          src={obra.bannerUrl || obra.capaUrl || `https://placehold.co/1920x1080/0F1C2E/1E3A8A`}
          alt={obra.titulo}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-0 left-0 right-0 z-20 p-6 md:p-12 lg:p-16 container max-w-screen-2xl">
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="secondary" className="bg-primary/20 text-primary-foreground">{obra.ano}</Badge>
            <Badge variant="outline" className="border-border">{obra.status}</Badge>
            {obra.nota && <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500 border-none">★ {obra.nota}/10</Badge>}
            {obra.totalEps && <Badge variant="outline">{obra.totalEps} Eps</Badge>}
          </div>
          {obra.tipografiaUrl ? (
            <img
              src={obra.tipografiaUrl}
              alt={obra.titulo}
              className="max-h-16 md:max-h-24 lg:max-h-32 w-auto object-contain mb-4 drop-shadow-2xl"
              style={{ maxWidth: "520px" }}
            />
          ) : (
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-4 drop-shadow-xl">
              {obra.titulo}
            </h1>
          )}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {obra.generos?.map(g => (
              <Badge key={g} variant="secondary" className="bg-card text-muted-foreground hover:text-foreground">
                {g}
              </Badge>
            ))}
            {currentUser && (
              <Button
                size="sm"
                variant={isInLista ? "default" : "outline"}
                onClick={handleToggleLista}
                className={`ml-2 gap-2 font-display tracking-wide ${isInLista ? "bg-primary/80 hover:bg-primary/60" : "border-border hover:border-primary/50"}`}
              >
                {isInLista ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                {isInLista ? "Na Lista" : "Minha Lista"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container max-w-screen-2xl px-4 grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Player */}
          <div className="bg-card border border-border p-4 rounded-xl shadow-lg">
            {activeEpisode ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-display text-2xl font-bold">
                    T{activeEpisode.temporada} E{activeEpisode.numero} - {activeEpisode.titulo}
                  </h3>
                </div>
                <Player content={activeEpisode.playerContent} />
              </div>
            ) : (
              <div className="aspect-video bg-black/50 rounded-lg flex items-center justify-center text-muted-foreground border border-border">
                {loadingEpisodios ? "Carregando episódios..." : "Nenhum episódio disponível."}
              </div>
            )}
          </div>

          {/* Sinopse */}
          <div className="bg-card/50 border border-border/50 p-6 rounded-xl">
            <h3 className="font-display text-xl font-bold mb-4">Sinopse</h3>
            <p className={`text-muted-foreground leading-relaxed ${!isSinopseExpanded && "line-clamp-3"}`}>
              {obra.sinopse}
            </p>
            {obra.sinopse.length > 200 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSinopseExpanded(!isSinopseExpanded)}
                className="mt-2 text-primary hover:text-primary/80 p-0 h-auto font-medium"
              >
                {isSinopseExpanded ? <><ChevronUp className="w-4 h-4 mr-1" /> Ver menos</> : <><ChevronDown className="w-4 h-4 mr-1" /> Ler mais</>}
              </Button>
            )}
          </div>

          {/* Equipe / Cast */}
          {Array.isArray((obra as any).cast) && (obra as any).cast.length > 0 && (
            <div className="bg-card/50 border border-border/50 p-6 rounded-xl">
              <div className="flex items-center gap-2 mb-5">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="font-display text-xl font-bold">Equipe</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {((obra as any).cast as Array<{
                  nome: string; papel: string; fotoUrl?: string;
                  links?: { youtube?: string; instagram?: string; discord?: string; twitter?: string; tiktok?: string; site?: string };
                }>).map((member, idx) => (
                  <div key={idx} className="flex flex-col items-center text-center gap-2 p-3 rounded-lg border border-border/50 bg-background/40 hover:border-primary/30 transition-colors">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-border bg-secondary flex-shrink-0">
                      {member.fotoUrl ? (
                        <img src={member.fotoUrl} alt={member.nome} className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl font-bold text-muted-foreground">
                          {member.nome[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 w-full">
                      <p className="font-semibold text-sm text-foreground leading-tight">{member.nome}</p>
                      <p className="text-xs text-primary mt-0.5">{member.papel}</p>
                    </div>
                    {member.links && (
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {member.links.youtube && (
                          <a href={member.links.youtube} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-red-500 transition-colors" title="YouTube">
                            <Youtube className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {member.links.instagram && (
                          <a href={member.links.instagram} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-pink-500 transition-colors" title="Instagram">
                            <Instagram className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {member.links.discord && (
                          <a href={member.links.discord} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-indigo-400 transition-colors" title="Discord">
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {member.links.twitter && (
                          <a href={member.links.twitter} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-sky-400 transition-colors" title="Twitter / X">
                            <Twitter className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {member.links.tiktok && (
                          <a href={member.links.tiktok} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" title="TikTok">
                            <Music className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {member.links.site && (
                          <a href={member.links.site} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="Site">
                            <Globe className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comentários */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-border/50 pb-4">
              <MessageSquare className="w-6 h-6 text-primary" />
              <h3 className="font-display text-2xl font-bold">Comentários ({topLevelComments.length})</h3>
            </div>

            {currentUser ? (
              <div className="flex gap-4">
                <Avatar className="h-10 w-10 border border-border hidden sm:block flex-shrink-0">
                  <AvatarImage src={userProfile?.photoUrl || currentUser.photoURL || ""} />
                  <AvatarFallback>{currentUser.email?.[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Textarea
                    placeholder="Adicione um comentário..."
                    className="min-h-[100px] resize-y bg-card border-border focus-visible:ring-primary/50"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value.slice(0, 500))}
                  />
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{newComment.length}/500</span>
                    <Button onClick={handlePostComment} disabled={!newComment.trim()} size="sm" className="font-display tracking-wide">
                      <Send className="w-4 h-4 mr-2" /> Publicar
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-card/50 border border-border p-6 rounded-lg text-center">
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

        {/* Sidebar Episodios */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl shadow-lg flex flex-col h-[600px] lg:h-[800px] sticky top-24">
            <div className="p-4 border-b border-border/50 flex justify-between items-center bg-card/80 backdrop-blur rounded-t-xl z-10">
              <h3 className="font-display text-xl font-bold">Episódios</h3>
              {seasons.length > 1 && (
                <Select value={selectedSeason.toString()} onValueChange={v => setSelectedSeason(Number(v))}>
                  <SelectTrigger className="w-[140px] bg-secondary border-border h-8">
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

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {loadingEpisodios ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-md" />)
              ) : filteredEpisodes.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum episódio encontrado.</p>
              ) : (
                filteredEpisodes.map(ep => (
                  <button
                    key={ep.id}
                    onClick={() => handleSelectEpisode(ep.id)}
                    className={`w-full flex gap-3 p-2 rounded-lg transition-all border text-left group
                      ${activeEpisodeId === ep.id
                        ? "bg-primary/10 border-primary shadow-[0_0_10px_rgba(59,130,246,0.15)]"
                        : "bg-secondary/30 border-transparent hover:bg-secondary hover:border-border"
                      }`}
                  >
                    <div className="relative w-24 h-16 rounded overflow-hidden flex-shrink-0 bg-black">
                      <img
                        src={ep.thumbnailUrl || obra.capaUrl || `https://placehold.co/160x90/0F1C2E/1E3A8A`}
                        alt={ep.titulo}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      />
                      {activeEpisodeId === ep.id && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <Play className="w-6 h-6 text-white fill-white drop-shadow-md" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                      <div className="font-mono text-xs text-primary mb-1 font-medium">EP {ep.numero}</div>
                      <div className={`text-sm font-medium line-clamp-2 ${activeEpisodeId === ep.id ? "text-primary-foreground" : "text-foreground group-hover:text-primary transition-colors"}`}>
                        {ep.titulo}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
