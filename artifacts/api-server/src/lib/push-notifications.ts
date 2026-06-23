import webpush from "web-push";
import { db } from "@workspace/db";
import { pushSubscriptionsTable } from "@workspace/db";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL || "mailto:admin@zenkatu.com",
  process.env.VAPID_PUBLIC_KEY || "",
  process.env.VAPID_PRIVATE_KEY || ""
);

export type NotificationType = "episodio" | "obra" | "custom";

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  url?: string;
}

export async function sendPushToAll(payload: PushPayload, type: NotificationType) {
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
