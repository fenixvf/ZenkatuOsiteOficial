import webpush from "web-push";
import { db } from "@workspace/db";
import { pushSubscriptionsTable, siteConfigTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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

  let subs = await db.select().from(pushSubscriptionsTable);

  if (type === "episodio") {
    subs = subs.filter((s) => s.notifyEpisodios);
  } else if (type === "obra") {
    subs = subs.filter((s) => s.notifyObras);
  }

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
    )
  );

  const failed = results
    .map((r, i) => ({ r, sub: subs[i] }))
    .filter(({ r }) => r.status === "rejected");

  if (failed.length > 0) {
    const expiredIds = failed
      .filter(({ r }) => {
        const err = (r as PromiseRejectedResult).reason;
        return err?.statusCode === 410 || err?.statusCode === 404;
      })
      .map(({ sub }) => sub.id);

    if (expiredIds.length > 0) {
      const { inArray } = await import("drizzle-orm");
      await db.delete(pushSubscriptionsTable).where(inArray(pushSubscriptionsTable.id, expiredIds));
    }
  }

  return { sent: subs.length - failed.length, failed: failed.length };
}
