import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm, writeFile } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

const external = [
  "*.node", "sharp", "better-sqlite3", "sqlite3", "canvas", "bcrypt",
  "argon2", "fsevents", "re2", "farmhash", "xxhash-addon", "bufferutil",
  "utf-8-validate", "ssh2", "cpu-features", "dtrace-provider", "isolated-vm",
  "lightningcss", "pg-native", "oracledb", "mongodb-client-encryption",
  "nodemailer", "handlebars", "knex", "typeorm", "protobufjs",
  "onnxruntime-node", "@tensorflow/*", "@prisma/client", "@mikro-orm/*",
  "@grpc/*", "@swc/*", "@aws-sdk/*", "@azure/*", "@opentelemetry/*",
  "@google-cloud/*", "@google/*", "googleapis", "firebase-admin",
  "@parcel/watcher", "@sentry/profiling-node", "@tree-sitter/*", "aws-sdk",
  "classic-level", "dd-trace", "ffi-napi", "grpc", "hiredis", "kerberos",
  "leveldown", "miniflare", "mysql2", "newrelic", "odbc", "piscina", "realm",
  "ref-napi", "rocksdb", "sass-embedded", "sequelize", "serialport", "snappy",
  "tinypool", "usb", "workerd", "wrangler", "zeromq", "zeromq-prebuilt",
  "playwright", "puppeteer", "puppeteer-core", "electron",
];

const banner = {
  js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
`,
};

const plugins = [esbuildPluginPino({ transports: ["pino-pretty"] })];

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  const apiDir = path.resolve(artifactDir, "../../api");
  await rm(distDir, { recursive: true, force: true });

  // Main server entry (with app.listen — for Replit / Render / Railway)
  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    external,
    sourcemap: "linked",
    plugins,
    banner,
  });

  // Vercel handler: bundle into api/_handler/ (underscore prefix = not a Vercel route).
  // A thin api/index.mjs re-exports it so Vercel gets pre-compiled JS with no TypeScript.
  const handlerDir = path.resolve(apiDir, "_handler");
  await rm(handlerDir, { recursive: true, force: true });
  await esbuild({
    entryPoints: [{ in: path.resolve(artifactDir, "src/handler.ts"), out: "index" }],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: handlerDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    external,
    sourcemap: false,
    plugins,
    banner,
  });
  await writeFile(
    path.resolve(apiDir, "index.mjs"),
    'export { default } from "./_handler/index.mjs";\n',
  );
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
