import { useEffect, useState, useRef } from "react";
import { useParams } from "wouter";
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
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, ChevronDown, ChevronUp, Trash2, Edit2, MessageSquare, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function Player({ content }: { content: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (content.endsWith(".m3u8") && videoRef.current) {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(content);
        hls.attachMedia(videoRef.current);
      } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
        videoRef.current.src = content;
      }
    }
  }, [content]);

  if (content.startsWith("<")) {
    return (
      <div 
        className="w-full aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center [&>iframe]:w-full [&>iframe]:h-full"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  if (content.endsWith(".mp4") || content.endsWith(".m3u8")) {
    return (
      <video
        ref={videoRef}
        controls
        className="w-full aspect-video bg-black rounded-lg object-contain"
        src={content.endsWith(".mp4") ? content : undefined}
      />
    );
  }

  return (
    <iframe
      src={content}
      allowFullScreen
      className="w-full aspect-video bg-black rounded-lg border-0"
    />
  );
}

export default function ObraDetail() {
  const { slug } = useParams<{ slug: string }>();
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

  const { data: episodios = [], isLoading: loadingEpisodios } = useListObraEpisodios(obra?.id || 0, {
    query: {
      enabled: !!obra?.id,
    }
  });

  const { data: comentarios = [], isLoading: loadingComentarios } = useListComentarios(obra?.id || 0, {
    query: {
      enabled: !!obra?.id,
    }
  });

  const [activeEpisodeId, setActiveEpisodeId] = useState<number | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [isSinopseExpanded, setIsSinopseExpanded] = useState(false);
  const [newComment, setNewComment] = useState("");
  
  const createComentario = useCreateComentario();
  const deleteComentario = useDeleteComentario();

  useEffect(() => {
    if (episodios.length > 0 && !activeEpisodeId) {
      setActiveEpisodeId(episodios[0].id);
      setSelectedSeason(episodios[0].temporada);
    }
  }, [episodios, activeEpisodeId]);

  const seasons = Array.from(new Set(episodios.map(ep => ep.temporada))).sort((a, b) => a - b);
  const filteredEpisodes = episodios.filter(ep => ep.temporada === selectedSeason).sort((a, b) => a.numero - b.numero);
  const activeEpisode = episodios.find(ep => ep.id === activeEpisodeId);

  const handlePostComment = async () => {
    if (!currentUser || !userProfile || !obra?.id) return;
    if (!newComment.trim()) return;

    try {
      await createComentario.mutateAsync({
        data: {
          userId: currentUser.uid,
          username: userProfile.username || currentUser.displayName || "Usuário",
          userPhoto: userProfile.photoUrl || currentUser.photoURL || null,
          texto: newComment.trim(),
          parentId: null,
          obraId: obra.id
        }
      });
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: getListComentariosQueryKey(obra.id) });
      
      // Send to Formspree silently
      fetch(`https://formspree.io/f/${import.meta.env.VITE_FORMSPREE_FORM_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: currentUser.email, 
          message: `Novo comentário em ${obra.titulo}: ${newComment.trim()}` 
        })
      }).catch(e => console.error("Formspree error", e));

      toast({ title: "Comentário publicado" });
    } catch (e) {
      toast({ title: "Erro ao publicar", variant: "destructive" });
    }
  };

  const handleDeleteComment = async (id: number) => {
    if (!obra?.id) return;
    try {
      await deleteComentario.mutateAsync({ comentarioId: id });
      queryClient.invalidateQueries({ queryKey: getListComentariosQueryKey(obra.id) });
      toast({ title: "Comentário removido" });
    } catch (e) {
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
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-4 drop-shadow-xl">
            {obra.titulo}
          </h1>
          <div className="flex flex-wrap gap-2 mb-6">
            {obra.generos?.map(g => (
              <Badge key={g} variant="secondary" className="bg-card text-muted-foreground hover:text-foreground">
                {g}
              </Badge>
            ))}
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
                {isSinopseExpanded ? <><ChevronUp className="w-4 h-4 mr-1"/> Ver menos</> : <><ChevronDown className="w-4 h-4 mr-1"/> Ler mais</>}
              </Button>
            )}
          </div>

          {/* Comentários */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-border/50 pb-4">
              <MessageSquare className="w-6 h-6 text-primary" />
              <h3 className="font-display text-2xl font-bold">Comentários ({comentarios.length})</h3>
            </div>

            {currentUser ? (
              <div className="flex gap-4">
                <Avatar className="h-10 w-10 border border-border hidden sm:block">
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
              ) : (
                comentarios.filter(c => !c.parentId).map(comentario => (
                  <motion.div 
                    key={comentario.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-4 group"
                  >
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={comentario.userPhoto || ""} />
                      <AvatarFallback className="bg-secondary">{comentario.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">{comentario.username}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comentario.createdAt), "dd 'de' MMM, yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-foreground/90 whitespace-pre-wrap text-sm leading-relaxed">{comentario.texto}</p>
                      
                      <div className="flex gap-4 mt-2">
                        {(isAdmin || currentUser?.uid === comentario.userId) && (
                          <button 
                            onClick={() => handleDeleteComment(comentario.id)}
                            className="text-xs text-muted-foreground hover:text-destructive flex items-center transition-colors"
                          >
                            <Trash2 className="w-3 h-3 mr-1" /> Excluir
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
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
                    onClick={() => setActiveEpisodeId(ep.id)}
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
