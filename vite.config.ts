import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

function git(args: string): string {
  try {
    return execSync(`git ${args}`).toString().trim();
  } catch {
    return "";
  }
}

export default defineConfig(async () => {
  const pkg = JSON.parse(
    readFileSync(fileURLToPath(new URL("./package.json", import.meta.url)), "utf-8"),
  ) as { version: string };
  const commit = git("rev-parse --short HEAD") || "unknown";
  const dirty = git("status --porcelain") !== "";
  // May be "HEAD" for detached-HEAD builds; that's fine.
  const branch = git("rev-parse --abbrev-ref HEAD") || "unknown";

  return {
    plugins: [react()],
    clearScreen: false,
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __GIT_COMMIT__: JSON.stringify(commit),
      __GIT_DIRTY__: JSON.stringify(dirty),
      __GIT_BRANCH__: JSON.stringify(branch),
    },
    build: {
      chunkSizeWarningLimit: 1500,
    },
    server: {
      // VITE_PORT allows headless/TUI mode to use a different port to avoid
      // conflicting with an already-running web/desktop Vite instance.
      port: process.env.VITE_PORT ? parseInt(process.env.VITE_PORT) : 1420,
      strictPort: !process.env.VITE_PORT,
      host: host || false,
      hmr: host
        ? {
            protocol: "ws",
            host,
            port: 1421,
          }
        : undefined,
      watch: {
        ignored: ["**/src-tauri/**"],
      },
    },
  };
});
