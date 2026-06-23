export interface OnesignalPayload {
  title: string;
  body: string;
  image?: string;
  url?: string;
}

export async function sendOnesignalToPlayerIds(
  payload: OnesignalPayload,
  playerIds: string[]
): Promise<{ sent: number; failed: number }> {
  if (playerIds.length === 0) return { sent: 0, failed: 0 };

  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_API_KEY;

  if (!appId || !apiKey) {
    return { sent: 0, failed: 0 };
  }

  const CHUNK = 2000;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < playerIds.length; i += CHUNK) {
    const chunk = playerIds.slice(i, i + CHUNK);
    try {
      const body: Record<string, unknown> = {
        app_id: appId,
        include_player_ids: chunk,
        headings: { en: payload.title },
        contents: { en: payload.body },
      };
      if (payload.image) body.big_picture = payload.image;
      if (payload.url) body.url = payload.url;

      const res = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json() as { recipients?: number; errors?: unknown };
      if (res.ok) {
        sent += data.recipients ?? chunk.length;
      } else {
        failed += chunk.length;
      }
    } catch {
      failed += chunk.length;
    }
  }

  return { sent, failed };
}
