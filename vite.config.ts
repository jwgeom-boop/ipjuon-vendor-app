import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Dev proxy: routes /api/* to the backend (ngrok / localhost / Render).
// In dev, set VITE_API_BASE_URL=/api so the browser hits the dev server
// (same-origin) and vite forwards. This avoids CORS in local development.
// In production, set VITE_API_BASE_URL to the full backend URL.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget =
    env.VITE_PROXY_TARGET ||
    "https://banking-coroner-grader.ngrok-free.dev";

  return {
    server: {
      host: "::",
      port: 8082,
      hmr: { overlay: false },
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
  };
});
