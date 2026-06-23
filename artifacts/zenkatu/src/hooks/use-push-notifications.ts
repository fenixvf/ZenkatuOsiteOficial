import { useState, useEffect, useCallback } from "react";

const API_BASE = "/api";

// ── Detecção do ambiente Median.co ──────────────────────────────────────────
function isMedianApp(): boolean {
  return typeof (window as any).median !== "undefined";
}

// Wrapper com Promise para a API de callback do Median
function medianOnesignalGetStatus(): Promise<{ isSubscribed: boolean; userId: string | null }> {
  return new Promise((resolve) => {
    const cbName = `__medianOsStatus_${Date.now()}`;
    (window as any)[cbName] = (data: any) => {
      delete (window as any)[cbName];
      resolve({
        isSubscribed: !!data?.isSubscribed,
        userId: data?.userId ?? data?.playerId ?? null,
      });
    };
    (window as any).median.onesignal.getStatus({ callback: cbName });
  });
}

function medianOnesignalRegister(): Promise<{ isSubscribed: boolean; userId: string | null }> {
  return new Promise((resolve) => {
    const cbName = `__medianOsRegister_${Date.now()}`;
    (window as any)[cbName] = (data: any) => {
      delete (window as any)[cbName];
      resolve({
        isSubscribed: !!data?.isSubscribed,
        userId: data?.userId ?? data?.playerId ?? null,
      });
    };
    (window as any).median.onesignal.register({ callback: cbName });
  });
}

// ── VAPID helpers (navegador) ────────────────────────────────────────────────
async function getVapidPublicKey(): Promise<string> {
  const res = await fetch(`${API_BASE}/push/vapid-public-key`);
  const data = await res.json();
  return data.publicKey;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ── Tipos públicos ────────────────────────────────────────────────────────────
export interface PushPreferences {
  notifyEpisodios: boolean;
  notifyObras: boolean;
}

export interface UsePushNotificationsReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  preferences: PushPreferences;
  subscribe: (prefs?: PushPreferences) => Promise<void>;
  unsubscribe: () => Promise<void>;
  updatePreferences: (prefs: PushPreferences) => Promise<void>;
  currentEndpoint: string | null;
  isNativeApp: boolean;
}

// ── Hook principal ────────────────────────────────────────────────────────────
export function usePushNotifications(uid: string | null): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<PushPreferences>({
    notifyEpisodios: true,
    notifyObras: true,
  });

  const native = isMedianApp();

  useEffect(() => {
    if (native) {
      setIsSupported(true);
    } else {
      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;
      setIsSupported(supported);
    }

    if (!uid) {
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        if (native) {
          // ── App Median.co: verificar status OneSignal ──
          const status = await medianOnesignalGetStatus();
          if (status.isSubscribed && status.userId) {
            setIsSubscribed(true);
            setCurrentEndpoint(status.userId);
            const res = await fetch(`${API_BASE}/push/onesignal-preferences/${uid}`);
            if (res.ok) {
              const subs = await res.json();
              const match = subs.find((s: any) => s.playerId === status.userId);
              if (match) {
                setPreferences({
                  notifyEpisodios: match.notifyEpisodios,
                  notifyObras: match.notifyObras,
                });
              }
            }
          }
        } else {
          // ── Navegador: verificar assinatura VAPID ──
          if (!("serviceWorker" in navigator)) return;
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            setIsSubscribed(true);
            setCurrentEndpoint(sub.endpoint);
            const res = await fetch(`${API_BASE}/push/preferences/${uid}`);
            if (res.ok) {
              const subs = await res.json();
              const match = subs.find((s: any) => s.endpoint === sub.endpoint);
              if (match) {
                setPreferences({
                  notifyEpisodios: match.notifyEpisodios,
                  notifyObras: match.notifyObras,
                });
              }
            }
          }
        }
      } catch (e) {
        console.error("Push check error:", e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [uid, native]);

  const subscribe = useCallback(
    async (prefs: PushPreferences = { notifyEpisodios: true, notifyObras: true }) => {
      if (!uid) return;
      setIsLoading(true);
      try {
        if (native) {
          // ── App Median.co: registrar via OneSignal ──
          const result = await medianOnesignalRegister();
          if (!result.isSubscribed || !result.userId) {
            throw new Error("Permissão negada");
          }
          await fetch(`${API_BASE}/push/onesignal-subscribe`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uid,
              playerId: result.userId,
              notifyEpisodios: prefs.notifyEpisodios,
              notifyObras: prefs.notifyObras,
            }),
          });
          setIsSubscribed(true);
          setCurrentEndpoint(result.userId);
          setPreferences(prefs);
        } else {
          // ── Navegador: registrar via VAPID ──
          await navigator.serviceWorker.register("/sw.js");
          const reg = await navigator.serviceWorker.ready;
          const permission = await Notification.requestPermission();
          if (permission !== "granted") throw new Error("Permissão negada");

          const vapidKey = await getVapidPublicKey();
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
          });

          const subJson = sub.toJSON();
          await fetch(`${API_BASE}/push/subscribe`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uid,
              subscription: {
                endpoint: sub.endpoint,
                keys: { p256dh: subJson.keys?.p256dh, auth: subJson.keys?.auth },
              },
              notifyEpisodios: prefs.notifyEpisodios,
              notifyObras: prefs.notifyObras,
            }),
          });

          setIsSubscribed(true);
          setCurrentEndpoint(sub.endpoint);
          setPreferences(prefs);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [uid, native]
  );

  const unsubscribe = useCallback(async () => {
    if (!uid) return;
    setIsLoading(true);
    try {
      if (native) {
        if (currentEndpoint) {
          await fetch(`${API_BASE}/push/onesignal-subscribe`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid, playerId: currentEndpoint }),
          });
        }
        setIsSubscribed(false);
        setCurrentEndpoint(null);
      } else {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch(`${API_BASE}/push/subscribe`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid, endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
        setIsSubscribed(false);
        setCurrentEndpoint(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [uid, currentEndpoint, native]);

  const updatePreferences = useCallback(
    async (prefs: PushPreferences) => {
      if (!uid || !currentEndpoint) return;
      if (native) {
        await fetch(`${API_BASE}/push/onesignal-preferences/${uid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId: currentEndpoint, ...prefs }),
        });
      } else {
        await fetch(`${API_BASE}/push/preferences/${uid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: currentEndpoint, ...prefs }),
        });
      }
      setPreferences(prefs);
    },
    [uid, currentEndpoint, native]
  );

  return {
    isSupported,
    isSubscribed,
    isLoading,
    preferences,
    subscribe,
    unsubscribe,
    updatePreferences,
    currentEndpoint,
    isNativeApp: native,
  };
}
