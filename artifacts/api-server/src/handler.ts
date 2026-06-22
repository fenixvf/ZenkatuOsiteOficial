import type { IncomingMessage, ServerResponse } from "http";

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

let handler: Handler;

try {
  const { default: app } = await import("./app.js");
  handler = app as unknown as Handler;
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error("[handler] Initialization error:", err);
  handler = (_req: IncomingMessage, res: ServerResponse) => {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server initialization failed", message, stack }));
  };
}

export default handler;
