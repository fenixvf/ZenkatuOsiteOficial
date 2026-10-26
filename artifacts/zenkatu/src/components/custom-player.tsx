import { memo, useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import logoImg from "/logo.png";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  RotateCcw, RotateCw, Settings, Download, Loader2, Cast,
} from "lucide-react";

declare global {
  interface Window {
    __onGCastApiAvailable?: (available: boolean) => void;
  }
}

let googleCastSdkPromise: Promise<boolean> | null = null;

function loadGoogleCastSdk(): Promise<boolean> {
  const existingCast = (window as any).cast;
  if (existingCast?.framework?.CastContext) return Promise.resolve(true);
  if (googleCastSdkPromise) return googleCastSdkPromise;

  googleCastSdkPromise = new Promise((resolve) => {
    let settled = false;
    const finish = (available: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(available && !!(window as any).cast?.framework?.CastContext);
    };
    const timeout = window.setTimeout(() => finish(false), 15000);
    window.__onGCastApiAvailable = (available) => finish(available);

    const script = document.createElement("script");
    script.id = "zenkatu-google-cast-sdk";
    script.src = "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";
    script.async = true;
    script.onerror = () => finish(false);
    document.head.appendChild(script);
  });

  return googleCastSdkPromise;
}

interface CustomPlayerProps {
  src: string;
  downloadUrl?: string;
  downloadName?: string;
  episodeTitle?: string;
  episodeLabel?: string;
  synopsis?: string;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Watch-progress persistence (per video source, kept in the browser)
interface SavedProgress {
  t: number; // seconds watched
  d: number; // duration known at save time
}

function progressKey(src: string) {
  return `zenkatu:progress:${src}`;
}

function readProgress(src: string): SavedProgress | null {
  try {
    const raw = localStorage.getItem(progressKey(src));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.t === "number" && parsed.t > 0) return parsed;
  } catch {}
  return null;
}

function writeProgress(src: string, t: number, d: number) {
  try {
    localStorage.setItem(progressKey(src), JSON.stringify({ t, d }));
  } catch {}
}

function clearProgress(src: string) {
  try {
    localStorage.removeItem(progressKey(src));
  } catch {}
}

// A video is considered "finished" once less than this many seconds remain
const NEAR_END_THRESHOLD = 15;
// Don't bother resuming for very short watch times
const MIN_RESUME_TIME = 10;

export const CustomPlayer = memo(function CustomPlayer({
  src,
  downloadUrl,
  downloadName,
  episodeTitle,
  episodeLabel,
  synopsis,
}: CustomPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const episodeInfoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const castMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);
  const sourceRef = useRef(src);
  const remotePlayerRef = useRef<any>(null);
  const remotePlayerControllerRef = useRef<any>(null);
  sourceRef.current = src;

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [seekFeedback, setSeekFeedback] = useState<"back" | "forward" | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [showEpisodeInfo, setShowEpisodeInfo] = useState(true);
  const [isCasting, setIsCasting] = useState(false);
  const [castMessage, setCastMessage] = useState("");

  const [resumeChoice, setResumeChoice] = useState<"pending" | "resolved">("resolved");
  const [resumeTime, setResumeTime] = useState(0);
  const pendingSeekRef = useRef<number | null>(null);
  const lastSaveRef = useRef(0);

  const showCastMessage = useCallback((message: string) => {
    setCastMessage(message);
    if (castMessageTimerRef.current) clearTimeout(castMessageTimerRef.current);
    castMessageTimerRef.current = setTimeout(() => setCastMessage(""), 3500);
  }, []);

  const syncRemotePlayer = useCallback(() => {
    const remotePlayer = remotePlayerRef.current;
    if (!remotePlayer) return;

    const connected = !!remotePlayer.isConnected;
    setIsCasting(connected);
    if (!connected) {
      const video = videoRef.current;
      if (video) setPlaying(!video.paused);
      return;
    }

    setPlaying(!remotePlayer.isPaused);
    if (!remotePlayer.isPaused) {
      if (episodeInfoTimerRef.current) clearTimeout(episodeInfoTimerRef.current);
      setShowEpisodeInfo(false);
      setShowSpeedMenu(false);
    }
    setCurrentTime(remotePlayer.currentTime || 0);
    setDuration(remotePlayer.duration || 0);
    setVolume(remotePlayer.volumeLevel ?? 1);
    setMuted(!!remotePlayer.isMuted);

    const now = Date.now();
    if (now - lastSaveRef.current > 4000 && remotePlayer.currentTime > 5) {
      lastSaveRef.current = now;
      writeProgress(sourceRef.current, remotePlayer.currentTime, remotePlayer.duration || 0);
    }
  }, []);

  // Check for saved watch progress whenever the video source changes
  useEffect(() => {
    setIsVideoLoading(true);
    setVideoError(false);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
    setShowEpisodeInfo(true);
    if (episodeInfoTimerRef.current) clearTimeout(episodeInfoTimerRef.current);
    episodeInfoTimerRef.current = setTimeout(() => setShowEpisodeInfo(false), 5000);

    const saved = readProgress(src);
    if (saved && saved.t > MIN_RESUME_TIME && (!saved.d || saved.d - saved.t > NEAR_END_THRESHOLD)) {
      setResumeTime(saved.t);
      setResumeChoice("pending");
    } else {
      setResumeChoice("resolved");
    }
    return () => {
      if (episodeInfoTimerRef.current) clearTimeout(episodeInfoTimerRef.current);
    };
  }, [src]);

  // Google Cast sender setup. Native Remote Playback / AirPlay remains available as fallback.
  useEffect(() => {
    if (!("chrome" in window)) return;

    let disposed = false;
    let castContext: any = null;
    let onSessionStateChanged: (() => void) | null = null;
    let controllerListeners: Array<[string, () => void]> = [];

    loadGoogleCastSdk().then((available) => {
      if (disposed || !available) return;

      const castApi = (window as any).cast;
      const chromeCast = (window as any).chrome?.cast;
      const framework = castApi?.framework;
      if (!framework?.CastContext || !chromeCast?.media) return;

      castContext = framework.CastContext.getInstance();
      castContext.setOptions({
        receiverApplicationId: chromeCast.media.DEFAULT_MEDIA_RECEIVER_APP_ID || "CC1AD845",
        autoJoinPolicy: chromeCast.AutoJoinPolicy?.ORIGIN_SCOPED,
      });

      const remotePlayer = new framework.RemotePlayer();
      const remoteController = new framework.RemotePlayerController(remotePlayer);
      remotePlayerRef.current = remotePlayer;
      remotePlayerControllerRef.current = remoteController;

      const eventTypes = framework.RemotePlayerEventType || {};
      const eventNames = [
        eventTypes.IS_CONNECTED_CHANGED,
        eventTypes.IS_PAUSED_CHANGED,
        eventTypes.CURRENT_TIME_CHANGED,
        eventTypes.DURATION_CHANGED,
        eventTypes.IS_MUTED_CHANGED,
        eventTypes.VOLUME_LEVEL_CHANGED,
      ].filter((eventName: unknown): eventName is string => typeof eventName === "string");

      controllerListeners = eventNames.map((eventName: string) => [eventName, syncRemotePlayer]);
      controllerListeners.forEach(([eventName, listener]) => {
        remoteController.addEventListener(eventName, listener);
      });

      const sessionStateEvent = framework.CastContextEventType?.SESSION_STATE_CHANGED;
      if (sessionStateEvent) {
        onSessionStateChanged = () => window.setTimeout(syncRemotePlayer, 0);
        castContext.addEventListener(sessionStateEvent, onSessionStateChanged);
      }
      syncRemotePlayer();
    }).catch(() => {
      // Native Remote Playback and AirPlay can still work if the Cast SDK is unavailable.
    });

    return () => {
      disposed = true;
      if (castContext && onSessionStateChanged) {
        castContext.removeEventListener?.(
          (window as any).cast?.framework?.CastContextEventType?.SESSION_STATE_CHANGED,
          onSessionStateChanged,
        );
      }
      const controller = remotePlayerControllerRef.current;
      controllerListeners.forEach(([eventName, listener]) => {
        controller?.removeEventListener?.(eventName, listener);
      });
      remotePlayerRef.current = null;
      remotePlayerControllerRef.current = null;
    };
  }, [syncRemotePlayer]);

  // Observe native Chromecast / AirPlay connections when the browser supports them.
  useEffect(() => {
    const video = videoRef.current as (HTMLVideoElement & {
      remote?: {
        state?: string;
        addEventListener?: (type: string, listener: EventListener) => void;
        removeEventListener?: (type: string, listener: EventListener) => void;
      };
      webkitCurrentPlaybackTargetIsWireless?: boolean;
    }) | null;
    if (!video) return;

    const remotePlayback = video.remote;
    const updateNativeConnection = () => {
      setIsCasting(
        remotePlayback?.state === "connected" ||
          !!video.webkitCurrentPlaybackTargetIsWireless ||
          !!remotePlayerRef.current?.isConnected,
      );
    };
    const remoteEvents = ["connecting", "connect", "disconnect"];
    remoteEvents.forEach((eventName) => {
      remotePlayback?.addEventListener?.(eventName, updateNativeConnection);
    });
    video.addEventListener("webkitcurrentplaybacktargetiswirelesschanged", updateNativeConnection);
    updateNativeConnection();

    return () => {
      remoteEvents.forEach((eventName) => {
        remotePlayback?.removeEventListener?.(eventName, updateNativeConnection);
      });
      video.removeEventListener("webkitcurrentplaybacktargetiswirelesschanged", updateNativeConnection);
    };
  }, [src]);

  const handleCast = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    const castApi = (window as any).cast;
    const chromeCast = (window as any).chrome?.cast;
    const castContext = castApi?.framework?.CastContext?.getInstance?.();

    if (castContext && chromeCast?.media) {
      try {
        const activeSession = castContext.getCurrentSession?.();
        if (activeSession && isCasting) {
          await activeSession.endSession(true);
          setIsCasting(false);
          showCastMessage("Transmissão encerrada.");
          return;
        }

        let session = activeSession;
        if (!session) {
          try {
            session = await castContext.requestSession();
          } catch (error: any) {
            const cancelled = error?.code === chromeCast.ErrorCode?.CANCEL ||
              error?.code === "cancel" ||
              error?.code === "cancelled";
            if (!cancelled) {
              console.warn("[Zenkatu Cast] Falha ao conectar ao dispositivo.", {
                code: error?.code,
                description: error?.description,
              });
              showCastMessage("Não foi possível conectar à TV. Confira se ela está na mesma rede.");
            }
            return;
          }
        }

        const isHls = /\.m3u8(?:[?#]|$)/i.test(src);
        const contentType = isHls
          ? "application/x-mpegURL"
          : /\.webm(?:[?#]|$)/i.test(src) ? "video/webm" : "video/mp4";
        const mediaInfo = new chromeCast.media.MediaInfo(src, contentType);
        mediaInfo.streamType = chromeCast.media.StreamType.BUFFERED;
        const metadata = new chromeCast.media.GenericMediaMetadata();
        metadata.title = episodeTitle || episodeLabel || "Zenkatu";
        metadata.subtitle = episodeLabel || "Zenkatu";
        mediaInfo.metadata = metadata;
        const request = new chromeCast.media.LoadRequest(mediaInfo);
        request.currentTime = video.currentTime;
        request.autoplay = true;
        try {
          await session.loadMedia(request);
        } catch (error: any) {
          const errorCode = typeof error === "string"
            ? error
            : error?.code || error?.errorCode || error?.message || error?.description || "erro desconhecido";
          console.warn("[Zenkatu Cast] TV conectada, mas o arquivo não iniciou.", {
            code: errorCode,
            description: error?.description,
            reason: error?.reason,
          });
          showCastMessage(`TV conectada, mas o vídeo não iniciou (${errorCode}).`);
          return;
        }

        video.pause();
        setIsCasting(true);
        showCastMessage("Transmitindo para a TV.");
        window.setTimeout(syncRemotePlayer, 250);
        return;
      } catch (error: any) {
        const cancelled = error?.code === chromeCast.ErrorCode?.CANCEL ||
          error?.code === "cancel" ||
          error?.code === "cancelled";
        if (!cancelled) {
          const errorCode = typeof error === "string"
            ? error
            : error?.code || error?.errorCode || error?.message || error?.description || "erro desconhecido";
          console.warn("[Zenkatu Cast] Erro inesperado na transmissão.", {
            name: error?.name,
            code: errorCode,
            description: error?.description,
            reason: error?.reason,
          });
          showCastMessage(`Erro ao preparar o vídeo para a TV (${errorCode}).`);
        }
        return;
      }
    }

    const videoWithTargets = video as HTMLVideoElement & {
      remote?: { prompt?: () => Promise<void> };
      webkitShowPlaybackTargetPicker?: () => void;
    };
    try {
      if (videoWithTargets.webkitShowPlaybackTargetPicker) {
        videoWithTargets.webkitShowPlaybackTargetPicker();
        return;
      }
      if (videoWithTargets.remote?.prompt) {
        await videoWithTargets.remote.prompt();
        return;
      }
      showCastMessage("Este navegador não oferece transmissão. Use o botão de transmissão do player do vídeo.");
    } catch {
      showCastMessage("Não foi possível abrir a lista de TVs. Tente novamente.");
    }
  }, [episodeLabel, episodeTitle, isCasting, showCastMessage, src, syncRemotePlayer, synopsis]);

  const applySeek = useCallback((time: number) => {
    const remotePlayer = remotePlayerRef.current;
    const remoteController = remotePlayerControllerRef.current;
    if (remotePlayer?.isConnected && remoteController) {
      const maxTime = remotePlayer.duration || time;
      const nextTime = Math.max(0, Math.min(maxTime, time));
      remotePlayer.currentTime = nextTime;
      remoteController.seek();
      setCurrentTime(nextTime);
      return;
    }

    const video = videoRef.current;
    if (!video) return;
    if (video.readyState >= 1) {
      video.currentTime = time;
    } else {
      pendingSeekRef.current = time;
    }
    setCurrentTime(time);
  }, []);

  const handleResume = useCallback(() => {
    applySeek(resumeTime);
    setResumeChoice("resolved");
    videoRef.current?.play();
  }, [resumeTime, applySeek]);

  const handleRestart = useCallback(() => {
    applySeek(0);
    clearProgress(src);
    setResumeChoice("resolved");
    videoRef.current?.play();
  }, [src, applySeek]);

  // Persist watch progress: throttled during playback, and on pause/unmount/unload
  const saveNow = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const t = video.currentTime;
    const d = video.duration;
    if (d && d - t < NEAR_END_THRESHOLD) {
      clearProgress(src);
    } else if (t > 5) {
      writeProgress(src, t, d || 0);
    }
  }, [src]);

  useEffect(() => {
    const save = () => saveNow();
    window.addEventListener("pagehide", save);
    window.addEventListener("beforeunload", save);
    return () => {
      save();
      window.removeEventListener("pagehide", save);
      window.removeEventListener("beforeunload", save);
    };
  }, [saveNow]);

  // HLS setup
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const isM3u8 = src.endsWith(".m3u8") || src.includes(".m3u8?");
    if (isM3u8) {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(src);
        hls.attachMedia(video);
        return () => hls.destroy();
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
      }
    } else {
      video.src = src;
    }
    return undefined;
  }, [src]);

  // Sync state from video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => {
      if (episodeInfoTimerRef.current) clearTimeout(episodeInfoTimerRef.current);
      setShowEpisodeInfo(false);
      if (!remotePlayerRef.current?.isConnected) setPlaying(true);
      setIsVideoLoading(false);
    };
    const onPause = () => {
      if (remotePlayerRef.current?.isConnected) {
        setPlaying(!remotePlayerRef.current.isPaused);
        return;
      }
      setPlaying(false);
      saveNow();
      if (episodeInfoTimerRef.current) clearTimeout(episodeInfoTimerRef.current);
      episodeInfoTimerRef.current = setTimeout(() => setShowEpisodeInfo(true), 5000);
    };
    const onEnded = () => {
      clearProgress(src);
      setPlaying(false);
      setIsVideoLoading(false);
    };
    const onLoadStart = () => {
      setVideoError(false);
      setIsVideoLoading(true);
    };
    const onCanPlay = () => {
      setVideoError(false);
      setIsVideoLoading(false);
    };
    const onWaiting = () => setIsVideoLoading(true);
    const onPlaying = () => {
      setIsVideoLoading(false);
      setVideoError(false);
    };
    const onError = () => {
      setIsVideoLoading(false);
      setVideoError(true);
    };
    const onTimeUpdate = () => {
      if (remotePlayerRef.current?.isConnected) return;
      const t = video.currentTime;
      setCurrentTime(t);
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
      const now = Date.now();
      if (now - lastSaveRef.current > 4000) {
        lastSaveRef.current = now;
        saveNow();
      }
    };
    const onDuration = () => {
      if (!remotePlayerRef.current?.isConnected) setDuration(video.duration);
    };
    const onVolumeChange = () => {
      if (remotePlayerRef.current?.isConnected) return;
      setVolume(video.volume);
      setMuted(video.muted);
    };
    const onFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    const onLoadedMetadata = () => {
      if (pendingSeekRef.current != null) {
        video.currentTime = pendingSeekRef.current;
        pendingSeekRef.current = null;
      }
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    video.addEventListener("loadstart", onLoadStart);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("error", onError);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDuration);
    video.addEventListener("volumechange", onVolumeChange);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("loadstart", onLoadStart);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("error", onError);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDuration);
      video.removeEventListener("volumechange", onVolumeChange);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [src, saveNow]);

  // Keyboard shortcuts
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKey = (e: KeyboardEvent) => {
      if (!container.contains(document.activeElement) && document.activeElement !== document.body) return;
      const video = videoRef.current;
      if (!video) return;

      switch (e.code) {
        case "Space":
        case "KeyK":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          skip(-10);
          break;
        case "ArrowRight":
          e.preventDefault();
          skip(10);
          break;
        case "KeyM":
          e.preventDefault();
          toggleMute();
          break;
        case "KeyF":
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    container.addEventListener("keydown", handleKey);
    return () => container.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      if (castMessageTimerRef.current) clearTimeout(castMessageTimerRef.current);
    };
  }, []);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (!seeking) setShowControls(false);
    }, 3000);
  }, [seeking]);

  const togglePlay = useCallback(() => {
    if (resumeChoice === "pending") return;
    const remotePlayer = remotePlayerRef.current;
    const remoteController = remotePlayerControllerRef.current;
    if (remotePlayer?.isConnected && remoteController) {
      remoteController.playOrPause();
      resetControlsTimer();
      return;
    }

    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
    resetControlsTimer();
  }, [resetControlsTimer, resumeChoice]);

  const skip = useCallback((seconds: number) => {
    const remotePlayer = remotePlayerRef.current;
    const remoteController = remotePlayerControllerRef.current;
    if (remotePlayer?.isConnected && remoteController) {
      const nextTime = Math.max(
        0,
        Math.min(remotePlayer.duration || Number.POSITIVE_INFINITY, remotePlayer.currentTime + seconds),
      );
      remotePlayer.currentTime = nextTime;
      remoteController.seek();
      setCurrentTime(nextTime);
      resetControlsTimer();
      return;
    }

    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    resetControlsTimer();
  }, [resetControlsTimer]);

  const showSkipFeedback = useCallback((direction: "back" | "forward") => {
    setSeekFeedback(direction);
    window.setTimeout(() => setSeekFeedback(null), 650);
  }, []);

  const handleSurfaceTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".player-controls, a, button, input")) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const now = Date.now();
    const x = e.clientX - rect.left;
    const lastTap = lastTapRef.current;
    const isDoubleTap = !!lastTap && now - lastTap.time < 320 && Math.abs(x - lastTap.x) < 90;

    if (isDoubleTap) {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      lastTapRef.current = null;
      const direction = x < rect.width / 2 ? "back" : "forward";
      skip(direction === "back" ? -10 : 10);
      showSkipFeedback(direction);
      return;
    }

    lastTapRef.current = { time: now, x };
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      lastTapRef.current = null;
      togglePlay();
    }, 240);
  }, [showSkipFeedback, skip, togglePlay]);

  const toggleMute = useCallback(() => {
    const remotePlayer = remotePlayerRef.current;
    const remoteController = remotePlayerControllerRef.current;
    if (remotePlayer?.isConnected && remoteController) {
      remotePlayer.isMuted = !remotePlayer.isMuted;
      remoteController.muteOrUnmute();
      return;
    }

    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      await container.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }, []);

  const handleProgressPointer = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const bar = progressRef.current;
    const video = videoRef.current;
    if (!bar || !video || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const nextTime = ratio * duration;
    const remotePlayer = remotePlayerRef.current;
    const remoteController = remotePlayerControllerRef.current;
    if (remotePlayer?.isConnected && remoteController) {
      remotePlayer.currentTime = nextTime;
      remoteController.seek();
    } else {
      video.currentTime = nextTime;
    }
    setCurrentTime(nextTime);
    resetControlsTimer();
  }, [duration, resetControlsTimer]);

  const stopSeeking = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setSeeking(false);
  }, []);

  const handleSpeedChange = useCallback((s: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = s;
    setSpeed(s);
    setShowSpeedMenu(false);
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const v = parseFloat(e.target.value);
    const remotePlayer = remotePlayerRef.current;
    const remoteController = remotePlayerControllerRef.current;
    if (remotePlayer?.isConnected && remoteController) {
      if (v > 0) {
        remotePlayer.volumeLevel = v;
        remoteController.setVolumeLevel();
      }
      const shouldMute = v === 0;
      if (remotePlayer.isMuted !== shouldMute) {
        remotePlayer.isMuted = shouldMute;
        remoteController.muteOrUnmute();
      }
      return;
    }
    video.volume = v;
    video.muted = v === 0;
  }, []);

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="group relative aspect-video w-full overflow-hidden rounded-none bg-black outline-none sm:rounded-xl"
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => {
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        if (playing) setShowControls(false);
      }}
      onMouseEnter={resetControlsTimer}
      onClick={(e) => {
        handleSurfaceTap(e);
      }}
      style={{ cursor: showControls ? "default" : "none", touchAction: "manipulation" }}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        preload="metadata"
        playsInline
        x-webkit-airplay="allow"
      />

      {isVideoLoading && !videoError && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/35 text-white backdrop-blur-[2px]">
          <Loader2 className="h-9 w-9 animate-spin text-blue-300" />
          <span className="text-sm font-medium text-white/85">Preparando vídeo...</span>
        </div>
      )}

      {videoError && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/65 px-6 text-center text-sm text-white/85">
          Não foi possível carregar este vídeo.
        </div>
      )}

      {/* Watermark */}
      {!playing && (
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex select-none items-center gap-1.5 rounded-full border border-white/15 bg-black/25 px-2.5 py-1.5 opacity-75 backdrop-blur-sm sm:left-4 sm:top-4">
          <img src={logoImg} alt="" className="h-4 w-4 rounded-full object-cover drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] sm:h-5 sm:w-5" />
          <span
            className="font-display text-[10px] font-bold tracking-[0.18em] text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] sm:text-xs"
            style={{ textShadow: "0 0 8px rgba(59,130,246,0.65)" }}
          >
            ZENKATU <span className="font-medium opacity-80">PLAYER</span>
          </span>
        </div>
      )}

      {showEpisodeInfo && (episodeTitle || episodeLabel) && (
        <div className="pointer-events-none absolute bottom-[76px] left-4 z-10 max-w-[78%] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,.9)] sm:bottom-[88px] sm:left-6 sm:max-w-[72%]">
          <p className="mb-1 text-[11px] text-white/65 sm:text-sm">Você está assistindo</p>
          {episodeLabel && <p className="text-[11px] font-medium text-white/75 sm:text-xs">{episodeLabel}</p>}
          {episodeTitle && <p className="font-display text-lg font-bold leading-tight sm:text-2xl">{episodeTitle}</p>}
          {synopsis && <p className="mt-1 hidden line-clamp-2 max-w-2xl text-sm text-white/75 md:block">{synopsis}</p>}
        </div>
      )}

      {/* Atalhos centrais no padrão do player móvel */}
      {showControls && resumeChoice !== "pending" && (
        <div className="player-controls absolute inset-0 z-10 flex items-center justify-center gap-10 sm:gap-14" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => skip(-10)}
            aria-label="Voltar 10 segundos"
            className="flex h-11 w-11 flex-col items-center justify-center rounded-full text-white drop-shadow-lg transition hover:scale-110 hover:text-primary sm:h-12 sm:w-12"
          >
            <RotateCcw className="h-6 w-6 sm:h-7 sm:w-7" />
            <span className="-mt-1 text-[9px] font-bold">10</span>
          </button>
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pausar vídeo" : "Reproduzir vídeo"}
            data-testid="button-player-toggle"
            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-black/25 text-white shadow-xl backdrop-blur-[2px] transition hover:scale-105 hover:bg-primary/85 sm:h-16 sm:w-16"
          >
            {playing ? <Pause className="h-7 w-7" fill="currentColor" /> : <Play className="ml-1 h-7 w-7" fill="currentColor" />}
          </button>
          <button
            type="button"
            onClick={() => skip(10)}
            aria-label="Avançar 10 segundos"
            className="flex h-11 w-11 flex-col items-center justify-center rounded-full text-white drop-shadow-lg transition hover:scale-110 hover:text-primary sm:h-12 sm:w-12"
          >
            <RotateCw className="h-6 w-6 sm:h-7 sm:w-7" />
            <span className="-mt-1 text-[9px] font-bold">10</span>
          </button>
        </div>
      )}

      {/* Double-tap seek feedback */}
      {seekFeedback && (
        <div
          className={`pointer-events-none absolute inset-y-0 z-20 flex w-1/2 items-center ${
            seekFeedback === "back" ? "left-0 justify-start pl-[12%]" : "right-0 justify-end pr-[12%]"
          }`}
        >
          <div className="flex flex-col items-center gap-1 rounded-full bg-black/55 px-4 py-3 text-white backdrop-blur-sm animate-in fade-in zoom-in-90 duration-150">
            {seekFeedback === "back" ? (
              <RotateCcw className="h-6 w-6" />
            ) : (
              <RotateCw className="h-6 w-6" />
            )}
            <span className="text-xs font-semibold">10s</span>
          </div>
        </div>
      )}

      {/* Resume-watching prompt */}
      {resumeChoice === "pending" && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 backdrop-blur-sm px-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-[#0f1c2e] border border-blue-500/30 rounded-xl shadow-2xl shadow-black/60 p-6 max-w-sm w-full text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center gap-2">
              <img src={logoImg} alt="" className="w-6 h-6 rounded-full object-cover" />
              <span className="font-display text-xs font-bold tracking-wider text-primary">
                ZENKATU PLAYER
              </span>
            </div>
            <div>
              <p className="text-white font-display text-lg font-semibold">Continuar de onde parou?</p>
              <p className="text-white/60 text-sm mt-1">Você parou em {formatTime(resumeTime)}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                onClick={handleRestart}
                className="flex-1 px-4 py-2.5 rounded-lg border border-white/20 text-white/80 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium"
              >
                Assistir do início
              </button>
              <button
                onClick={handleResume}
                className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors text-sm font-semibold shadow-lg shadow-blue-600/30"
              >
                Continuar assistindo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div
        className={`player-controls absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

          <div className="relative px-3 pb-3 pt-9 sm:px-5 sm:pb-4 sm:pt-10">
          {/* Progress bar */}
          <div
            ref={progressRef}
              className="group/prog relative mb-3 h-1.5 cursor-pointer touch-none rounded-full bg-white/30 transition-all hover:h-2 sm:mb-4 sm:h-1.5"
              role="slider"
              tabIndex={0}
              aria-label="Posição do vídeo"
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(currentTime)}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setSeeking(true);
                handleProgressPointer(e);
              }}
              onPointerMove={(e) => {
                if (seeking) handleProgressPointer(e);
              }}
              onPointerUp={stopSeeking}
              onPointerCancel={stopSeeking}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  skip(-5);
                } else if (e.key === "ArrowRight") {
                  e.preventDefault();
                  skip(5);
                } else if (e.key === "Home") {
                  e.preventDefault();
                  applySeek(0);
                } else if (e.key === "End") {
                  e.preventDefault();
                  applySeek(duration);
                }
              }}
          >
            {/* Buffer */}
            <div
              className="absolute top-0 left-0 h-full rounded-full bg-white/30"
              style={{ width: `${bufferedPct}%` }}
            />
            {/* Progress */}
            <div
              className="absolute top-0 left-0 h-full rounded-full bg-primary"
              style={{ width: `${progressPct}%` }}
            />
            {/* Thumb */}
            <div
              className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow-md transition-transform ${
                seeking ? "scale-100" : "scale-0 group-hover/prog:scale-100"
              }`}
              style={{ left: `calc(${progressPct}% - 7px)` }}
            />
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
               className="rounded-md p-1.5 text-white transition-colors hover:bg-white/10 hover:text-primary sm:p-1"
              title={playing ? "Pausar (Espaço)" : "Reproduzir (Espaço)"}
            >
              {playing ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5" fill="currentColor" />}
            </button>

            {/* Back 10s */}
            <button
              onClick={() => skip(-10)}
               className="flex items-center gap-0.5 rounded-md p-1.5 text-white transition-colors hover:bg-white/10 hover:text-primary sm:p-1"
              title="Voltar 10s (←)"
            >
              <RotateCcw className="w-4 h-4" />
               <span className="text-[10px] font-semibold leading-none">10</span>
            </button>

            {/* Forward 10s */}
            <button
              onClick={() => skip(10)}
               className="flex items-center gap-0.5 rounded-md p-1.5 text-white transition-colors hover:bg-white/10 hover:text-primary sm:p-1"
              title="Avançar 10s (→)"
            >
              <RotateCw className="w-4 h-4" />
               <span className="text-[10px] font-semibold leading-none">10</span>
            </button>

            {/* Volume */}
            <div className="flex items-center gap-1.5 group/vol">
              <button
                onClick={toggleMute}
                 className="rounded-md p-1.5 text-white transition-colors hover:bg-white/10 hover:text-primary sm:p-1"
                title="Mudo (M)"
              >
                {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                className="h-1 w-0 cursor-pointer overflow-hidden accent-primary transition-all duration-200 group-hover/vol:w-16"
              />
            </div>

            {/* Time */}
             <span className="ml-1 text-[10px] font-mono tabular-nums text-white/80 sm:text-xs">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Speed */}
            <div className="relative hidden sm:block">
              <button
                disabled={isCasting}
                onClick={() => setShowSpeedMenu((v) => !v)}
                  className="flex items-center gap-1 rounded border border-white/20 px-1.5 py-1 text-xs font-semibold text-white transition-colors hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                title={isCasting ? "Velocidade indisponível durante a transmissão" : "Velocidade"}
              >
                <Settings className="w-3 h-3" />
                {speed}x
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-[#0f1c2e] border border-blue-500/30 rounded-lg overflow-hidden shadow-xl shadow-black/50 z-30">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSpeedChange(s)}
                      className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                        speed === s
                        ? "bg-primary text-primary-foreground font-semibold"
                          : "text-white/80 hover:bg-primary/20 hover:text-white"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {downloadUrl && (
              <a
                href={downloadUrl}
                download={downloadName || true}
                className="rounded-md p-1.5 text-white transition-colors hover:bg-white/10 hover:text-primary sm:p-1"
                title="Baixar episódio"
                aria-label="Baixar episódio"
              >
                <Download className="h-4 w-4" />
              </a>
            )}

            {/* Cast / AirPlay */}
            <button
              type="button"
              onClick={handleCast}
              className={`rounded-md p-1.5 transition-colors hover:bg-white/10 hover:text-primary sm:p-1 ${
                isCasting ? "text-primary" : "text-white"
              }`}
              title={isCasting ? "Desconectar da TV" : "Transmitir para TV"}
              aria-label={isCasting ? "Desconectar da TV" : "Transmitir para TV"}
            >
              <Cast className="h-4 w-4" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="rounded-md p-1.5 text-white transition-colors hover:bg-white/10 hover:text-primary sm:p-1"
              title="Tela cheia (F)"
            >
              {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {castMessage && (
        <div
          role="status"
          className="pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-lg border border-white/15 bg-black/80 px-4 py-2 text-center text-xs font-medium text-white shadow-lg backdrop-blur-sm sm:text-sm"
        >
          {castMessage}
        </div>
      )}
    </div>
  );
});
