import webpush from "web-push";
import { db } from "@workspace/db";
import { pushSubscriptionsTable, siteConfigTable, onesignalSubscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendOnesignalToPlayerIds } from "./onesignal";

const vapidConfigured =
  process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY;

if (vapidConfigured) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || "mailto:admin@zenkatu.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}

export type NotificationType = "episodio" | "obra" | "custom";

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  url?: string;
}

async function isAutoEnabled(key: string): Promise<boolean> {
  const [row] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, key));
  return !row || row.value !== "false";
}

export async function sendPushToAll(payload: PushPayload, type: NotificationType) {
  if (type === "episodio" && !(await isAutoEnabled("push_auto_episodios"))) return { sent: 0, failed: 0, skipped: true };
  if (type === "obra" && !(await isAutoEnabled("push_auto_obras"))) return { sent: 0, failed: 0, skipped: true };

  let vapidSubs = await db.select().from(pushSubscriptionsTable);

  // Buscar assinaturas OneSignal com segurança — tabela pode não existir em produção ainda
  let onesignalSubs: typeof onesignalSubscriptionsTable.$inferSelect[] = [];
  try {
    onesignalSubs = await db.select().from(onesignalSubscriptionsTable);
  } catch {
    // Tabela ainda não existe neste ambiente — ignorar silenciosamente
  }

  if (type === "episodio") {
    vapidSubs = vapidSubs.filter((s) => s.notifyEpisodios);
    onesignalSubs = onesignalSubs.filter((s) => s.notifyEpisodios);
  } else if (type === "obra") {
    vapidSubs = vapidSubs.filter((s) => s.notifyObras);
    onesignalSubs = onesignalSubs.filter((s) => s.notifyObras);
  }

  const [vapidResult, onesignalResult] = await Promise.all([
    (async () => {
      if (vapidSubs.length === 0) return { sent: 0, failed: 0 };
      const results = await Promise.allSettled(
        vapidSubs.map((sub) =>
          webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload)
          )
        )
      );

      const failed = results
        .map((r, i) => ({ r, sub: vapidSubs[i] }))
        .filter(({ r }) => r.status === "rejected");

      if (failed.length > 0) {
        const expiredIds = failed
          .filter(({ r }) => {
            const err = (r as PromiseRejectedResult).reason;
            return err?.statusCode === 410 || err?.statusCode === 404;
          })
          .map(({ sub }) => sub!.id);

        if (expiredIds.length > 0) {
          const { inArray } = await import("drizzle-orm");
          await db.delete(pushSubscriptionsTable).where(inArray(pushSubscriptionsTable.id, expiredIds));
        }
      }

      return { sent: vapidSubs.length - failed.length, failed: failed.length };
    })(),
    sendOnesignalToPlayerIds(
      payload,
      onesignalSubs.map((s) => s.playerId)
    ),
  ]);

  return {
    sent: vapidResult.sent + onesignalResult.sent,
    failed: vapidResult.failed + onesignalResult.failed,
  };
}
