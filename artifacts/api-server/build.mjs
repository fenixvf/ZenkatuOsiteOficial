import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { readFile, rm } from "node:fs/promises";

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

  // Embute o HTML do frontend no bundle da function: na Vercel o arquivo
  // gerado pelo build não está no sistema de arquivos da function em runtime,
  // então a rota /obra/:slug o carrega daqui (com fallback para disco).
  let spaIndexHtml = "";
  try {
    spaIndexHtml = await readFile(
      path.resolve(artifactDir, "../zenkatu/dist/public/index.html"),
      "utf8",
    );
  } catch {
    console.warn(
      "[build] index.html do frontend não encontrado; a rota /obra/:slug usará o fallback em disco.",
    );
  }
  const spaDefine = { __SPA_INDEX_HTML__: JSON.stringify(spaIndexHtml) };

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
    define: spaDefine,
    plugins,
    banner,
  });

  // Vercel handler: bundle directly into api/ as index.mjs.
  // The api/ directory is pre-cleaned except for index.mjs itself so Vercel
  // never sees TypeScript source files or intermediate re-exports.
  await rm(apiDir, { recursive: true, force: true });
  await esbuild({
    entryPoints: [{ in: path.resolve(artifactDir, "src/handler.ts"), out: "index" }],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: apiDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    external,
    sourcemap: false,
    define: spaDefine,
    plugins,
    banner,
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
