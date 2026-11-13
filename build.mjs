import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const dist = path.join(root, "dist");
fs.mkdirSync(dist, { recursive: true });

// 1. React app bundle (single file, minified).
await build({
  entryPoints: [path.join(root, "src/app.jsx")],
  bundle: true,
  minify: true,
  format: "iife",
  platform: "browser",
  target: ["chrome100", "safari15", "firefox100"],
  jsx: "automatic",
  loader: { ".js": "jsx" },
  define: { "process.env.NODE_ENV": '"production"' },
  outfile: path.join(dist, "app.js"),
  logLevel: "info",
});

// 2. Tailwind CSS.
const nodeExe = process.execPath;
const tailwindCli = path.join(root, "node_modules/tailwindcss/lib/cli.js");
execFileSync(nodeExe, [tailwindCli, "-i", path.join(root, "src/styles.css"), "-o", path.join(dist, "app.css"), "--minify"], {
  stdio: "inherit",
  cwd: root,
});

// 3. Inline app JS + fonts + CSS into a single distributable HTML.
const appJs = fs.readFileSync(path.join(dist, "app.js"), "utf8").replace(/<\/script/gi, "<\\/script");
const fonts = fs.readFileSync(path.join(root, "src/fonts.css"), "utf8");
const tailwindCss = fs.readFileSync(path.join(dist, "app.css"), "utf8");
const template = fs.readFileSync(path.join(root, "index.template.html"), "utf8");

const html = template
  .replace("/*__APP_JS__*/", appJs)
  .replace("</head>", `<style>\n${fonts}\n${tailwindCss}\n</style>\n  </head>`);

const out = path.join(root, "Frigorifico-Novila-Demo.html");
fs.writeFileSync(out, html, "utf8");

const size = fs.statSync(out).size;
console.log(`\n✅ ${path.basename(out)} generado — ${(size / 1024 / 1024).toFixed(2)} MB, autónomo y sin CDN.\n`);
