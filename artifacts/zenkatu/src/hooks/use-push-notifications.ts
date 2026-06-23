import { useState, useEffect, useCallback } from "react";

const API_BASE = "/api";

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
}

export function usePushNotifications(uid: string | null): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<PushPreferences>({
    notifyEpisodios: true,
    notifyObras: true,
  });

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setIsSupported(supported);

    if (!supported || !uid) {
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
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
      } catch (e) {
        console.error("Push check error:", e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [uid]);

  const subscribe = useCallback(
    async (prefs: PushPreferences = { notifyEpisodios: true, notifyObras: true }) => {
      if (!uid) return;
      setIsLoading(true);
      try {
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
      } finally {
        setIsLoading(false);
      }
    },
    [uid]
  );

  const unsubscribe = useCallback(async () => {
    if (!uid) return;
    setIsLoading(true);
    try {
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
    } finally {
      setIsLoading(false);
    }
  }, [uid]);

  const updatePreferences = useCallback(
    async (prefs: PushPreferences) => {
      if (!uid || !currentEndpoint) return;
      await fetch(`${API_BASE}/push/preferences/${uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: currentEndpoint, ...prefs }),
      });
      setPreferences(prefs);
    },
    [uid, currentEndpoint]
  );

  return { isSupported, isSubscribed, isLoading, preferences, subscribe, unsubscribe, updatePreferences, currentEndpoint };
}
