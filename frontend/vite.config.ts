/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig(({ mode }) => {
  // Endereço da API para o proxy de /api (ADR 0001). Lido do ambiente ou do frontend/.env.
  const apiTarget =
    loadEnv(mode, process.cwd(), "").API_PROXY_TARGET || "http://localhost:8000";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      // Exposto na rede local para testar o layout mobile-first no celular.
      host: true,
      port: 5173,
      strictPort: true,
      // Front-end e API na mesma origem (ADR 0001): o cookie de renovação é SameSite=Strict.
      proxy: {
        "/api": apiTarget,
      },
    },
    preview: {
      host: true,
      port: 4173,
      proxy: {
        "/api": apiTarget,
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      restoreMocks: true,
    },
  };
});
