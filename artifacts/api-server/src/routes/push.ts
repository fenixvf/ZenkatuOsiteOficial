import { Router } from "express";
import { db } from "@workspace/db";
import { pushSubscriptionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { sendPushToAll, type PushPayload } from "../lib/push-notifications";

const router = Router();

const ADMIN_EMAIL = "souzawalisonlopes52@gmail.com";

router.get("/push/vapid-public-key", (_req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || "" });
});

router.post("/push/subscribe", async (req, res) => {
  try {
    const { uid, subscription, notifyEpisodios, notifyObras } = req.body;
    if (!uid || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      res.status(400).json({ error: "uid, subscription.endpoint, subscription.keys.p256dh e subscription.keys.auth são obrigatórios" });
      return;
    }

    await db
      .insert(pushSubscriptionsTable)
      .values({
        uid,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        notifyEpisodios: notifyEpisodios !== false,
        notifyObras: notifyObras !== false,
      })
      .onConflictDoUpdate({
        target: pushSubscriptionsTable.endpoint,
        set: {
          uid,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          notifyEpisodios: notifyEpisodios !== false,
          notifyObras: notifyObras !== false,
        },
      });

    res.json({ ok: true });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/push/subscribe", async (req, res) => {
  try {
    const { uid, endpoint } = req.body;
    if (!uid || !endpoint) {
      res.status(400).json({ error: "uid e endpoint são obrigatórios" });
      return;
    }
    await db
      .delete(pushSubscriptionsTable)
      .where(and(eq(pushSubscriptionsTable.uid, uid), eq(pushSubscriptionsTable.endpoint, endpoint)));
    res.json({ ok: true });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/push/preferences/:uid", async (req, res) => {
  try {
    const subs = await db
      .select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.uid, req.params.uid));
    res.json(subs);
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/push/preferences/:uid", async (req, res) => {
  try {
    const { endpoint, notifyEpisodios, notifyObras } = req.body;
    if (!endpoint) {
      res.status(400).json({ error: "endpoint é obrigatório" });
      return;
    }
    const [updated] = await db
      .update(pushSubscriptionsTable)
      .set({
        notifyEpisodios: notifyEpisodios !== false,
        notifyObras: notifyObras !== false,
      })
      .where(
        and(
          eq(pushSubscriptionsTable.uid, req.params.uid),
          eq(pushSubscriptionsTable.endpoint, endpoint)
        )
      )
      .returning();
    res.json(updated || {});
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/push/send-custom", async (req, res) => {
  try {
    const { adminUid, adminEmail, title, body, image, url } = req.body;
    if (adminEmail !== ADMIN_EMAIL) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }
    if (!title || !body) {
      res.status(400).json({ error: "title e body são obrigatórios" });
      return;
    }
    const payload: PushPayload = { title, body, image, url: url || "/" };
    const result = await sendPushToAll(payload, "custom");
    res.json(result);
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
