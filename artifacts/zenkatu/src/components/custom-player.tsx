import { memo, useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import logoImg from "/logo.png";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  RotateCcw, RotateCw, Settings,
} from "lucide-react";

interface CustomPlayerProps {
  src: string;
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

export const CustomPlayer = memo(function CustomPlayer({ src }: CustomPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const [resumeChoice, setResumeChoice] = useState<"pending" | "resolved">("resolved");
  const [resumeTime, setResumeTime] = useState(0);
  const pendingSeekRef = useRef<number | null>(null);
  const lastSaveRef = useRef(0);

  // Check for saved watch progress whenever the video source changes
  useEffect(() => {
    const saved = readProgress(src);
    if (saved && saved.t > MIN_RESUME_TIME && (!saved.d || saved.d - saved.t > NEAR_END_THRESHOLD)) {
      setResumeTime(saved.t);
      setResumeChoice("pending");
    } else {
      setResumeChoice("resolved");
    }
  }, [src]);

  const applySeek = useCallback((time: number) => {
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
  }, [src]);

  // Sync state from video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => {
      setPlaying(false);
      saveNow();
    };
    const onEnded = () => {
      clearProgress(src);
    };
    const onTimeUpdate = () => {
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
    const onDuration = () => setDuration(video.duration);
    const onVolumeChange = () => {
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
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDuration);
    video.addEventListener("volumechange", onVolumeChange);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
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

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (!seeking) setShowControls(false);
    }, 3000);
  }, [seeking]);

  const togglePlay = useCallback(() => {
    if (resumeChoice === "pending") return;
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
    resetControlsTimer();
  }, [resetControlsTimer, resumeChoice]);

  const skip = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    resetControlsTimer();
  }, [resetControlsTimer]);

  const toggleMute = useCallback(() => {
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

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current;
    const video = videoRef.current;
    if (!bar || !video || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = ratio * duration;
    setCurrentTime(ratio * duration);
    resetControlsTimer();
  }, [duration, resetControlsTimer]);

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
    video.volume = v;
    video.muted = v === 0;
  }, []);

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="relative w-full aspect-video bg-black rounded-xl overflow-hidden outline-none group"
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => {
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        if (playing) setShowControls(false);
      }}
      onMouseEnter={resetControlsTimer}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest(".player-controls")) return;
        togglePlay();
      }}
      style={{ cursor: showControls ? "default" : "none" }}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        preload="metadata"
        playsInline
      />

      {/* Watermark */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none select-none flex items-center gap-1.5 opacity-40 mix-blend-screen">
        <img src={logoImg} alt="" className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]" />
        <span
          className="font-display text-xs sm:text-sm font-bold tracking-wider text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
          style={{ textShadow: "0 0 8px rgba(59,130,246,0.5)" }}
        >
          ZENKATU <span className="font-medium opacity-80">PLAYER</span>
        </span>
      </div>

      {/* Central play button overlay */}
      {!playing && resumeChoice !== "pending" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-20 h-20 rounded-full bg-blue-600/80 flex items-center justify-center shadow-2xl backdrop-blur-sm border border-blue-400/40">
            <Play className="w-9 h-9 text-white ml-1" fill="white" />
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

        <div className="relative px-4 pb-4 pt-10">
          {/* Progress bar */}
          <div
            ref={progressRef}
            className="relative h-1.5 rounded-full bg-white/20 cursor-pointer mb-4 group/prog hover:h-2.5 transition-all"
            onMouseDown={(e) => {
              setSeeking(true);
              handleProgressClick(e);
            }}
            onMouseMove={(e) => {
              if (seeking) handleProgressClick(e);
            }}
            onMouseUp={() => setSeeking(false)}
            onClick={handleProgressClick}
          >
            {/* Buffer */}
            <div
              className="absolute top-0 left-0 h-full rounded-full bg-white/30"
              style={{ width: `${bufferedPct}%` }}
            />
            {/* Progress */}
            <div
              className="absolute top-0 left-0 h-full rounded-full bg-blue-500"
              style={{ width: `${progressPct}%` }}
            />
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-blue-400 shadow-md border-2 border-white scale-0 group-hover/prog:scale-100 transition-transform"
              style={{ left: `calc(${progressPct}% - 7px)` }}
            />
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="text-white hover:text-blue-300 transition-colors p-1"
              title={playing ? "Pausar (Espaço)" : "Reproduzir (Espaço)"}
            >
              {playing ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5" fill="currentColor" />}
            </button>

            {/* Back 10s */}
            <button
              onClick={() => skip(-10)}
              className="text-white hover:text-blue-300 transition-colors p-1"
              title="Voltar 10s (←)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Forward 10s */}
            <button
              onClick={() => skip(10)}
              className="text-white hover:text-blue-300 transition-colors p-1"
              title="Avançar 10s (→)"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-1.5 group/vol">
              <button
                onClick={toggleMute}
                className="text-white hover:text-blue-300 transition-colors p-1"
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
                className="w-0 group-hover/vol:w-16 overflow-hidden transition-all duration-200 accent-blue-400 h-1 cursor-pointer"
              />
            </div>

            {/* Time */}
            <span className="text-white/80 text-xs font-mono tabular-nums ml-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Speed */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu((v) => !v)}
                className="text-white hover:text-blue-300 transition-colors flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded border border-white/20 hover:border-blue-400/50"
                title="Velocidade"
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
                          ? "bg-blue-600 text-white font-semibold"
                          : "text-white/80 hover:bg-blue-600/20 hover:text-white"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-blue-300 transition-colors p-1"
              title="Tela cheia (F)"
            >
              {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
