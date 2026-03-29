import { readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const distDir = resolve("dist");
const clientIndexPath = resolve(distDir, "index.html");
const serverEntryPath = resolve(distDir, "server", "entry-server.js");

const [{ render }, htmlTemplate] = await Promise.all([
  import(pathToFileURL(serverEntryPath).href),
  readFile(clientIndexPath, "utf8"),
]);

const appHtml = render();
const prerenderedHtml = htmlTemplate.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

await writeFile(clientIndexPath, prerenderedHtml, "utf8");
await writeFile(resolve(distDir, "404.html"), prerenderedHtml, "utf8");
await rm(resolve(distDir, "server"), { recursive: true, force: true });
