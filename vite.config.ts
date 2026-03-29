import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const GITHUB_PAGES_BASE = "/Nikke-Overload-Planner-Ex/";

const packageJson = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8")) as {
  version: string;
};

const now = new Date();
const buildDate = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === "build" ? GITHUB_PAGES_BASE : "/",
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(`v${packageJson.version}`),
    __LAST_UPDATED_AT__: JSON.stringify(buildDate),
  },
}));
