import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");

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
